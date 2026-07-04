'use client'
import { usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { Address } from 'viem'
import { CLAIM_ADDRESS, CLAIM_ABI, CLAIM_DEPLOY_BLOCK } from '@/lib/claim'
import { resolveBasename } from '@/lib/basename'

const PER_PAGE = 15
const LOG_WINDOW = 2000n // public Base Sepolia RPC caps getLogs at a 2000-block range
const CONCURRENCY = 4 // cap parallel RPC calls so the public endpoint doesn't rate-limit us

// Run `fn` over `items` with a bounded number of concurrent calls, tolerating
// individual failures. A rate-limited chunk is skipped (and picked up on the
// next refetch) instead of rejecting the whole batch and blanking the list.
async function mapSettled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let next = 0
  async function worker() {
    while (next < items.length) {
      const item = items[next++]
      try {
        results.push(await fn(item))
      } catch {
        // swallow — a dropped chunk just means fewer rows this pass
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  )
  return results
}

type MintRow = {
  claimer: Address
  txHash: `0x${string}`
  blockNumber: bigint
  logIndex: number
  timestamp: number
}

function relativeTime(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts * 1000).toLocaleDateString()
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Resolves the minter's base.eth name, falling back to a truncated address.
function MinterName({ address }: { address: Address }) {
  const { data: name } = useQuery({
    queryKey: ['basename', address.toLowerCase()],
    queryFn: () => resolveBasename(address),
    staleTime: 5 * 60 * 1000,
  })
  return (
    <span className="font-mono text-xs text-black dark:text-white" title={address}>
      {name ?? short(address)}
    </span>
  )
}

export function MintHistory() {
  const client = usePublicClient()
  const [page, setPage] = useState(0)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['mint-history'],
    enabled: !!client,
    refetchInterval: 15000,
    queryFn: async (): Promise<MintRow[]> => {
      const c = client!
      const latest = await c.getBlockNumber()

      const ranges: [bigint, bigint][] = []
      for (let from = CLAIM_DEPLOY_BLOCK; from <= latest; from += LOG_WINDOW) {
        const to = from + LOG_WINDOW - 1n > latest ? latest : from + LOG_WINDOW - 1n
        ranges.push([from, to])
      }

      const logArrays = await mapSettled(ranges, CONCURRENCY, ([from, to]) =>
        c.getContractEvents({
          address: CLAIM_ADDRESS,
          abi: CLAIM_ABI,
          eventName: 'Claimed',
          fromBlock: from,
          toBlock: to,
        }),
      )
      const logs = logArrays.flat()

      // Fetch timestamps once per unique block (mints are sparse).
      const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber!))]
      const blockTimes = new Map<bigint, number>()
      const times = await mapSettled(uniqueBlocks, CONCURRENCY, async (bn) => {
        const b = await c.getBlock({ blockNumber: bn })
        return [bn, Number(b.timestamp)] as const
      })
      for (const [bn, ts] of times) blockTimes.set(bn, ts)

      const mapped: MintRow[] = logs.map((l) => ({
        claimer: (l.args as { claimer: Address }).claimer,
        txHash: l.transactionHash!,
        blockNumber: l.blockNumber!,
        logIndex: l.logIndex!,
        timestamp: blockTimes.get(l.blockNumber!) ?? 0,
      }))

      // Newest first.
      mapped.sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? b.logIndex - a.logIndex
          : Number(b.blockNumber - a.blockNumber),
      )
      return mapped
    },
  })

  const all = rows ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE))
  const current = Math.min(page, totalPages - 1)
  const visible = all.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE)

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-black dark:text-white">Recent Mints</h2>
        <span className="text-xs text-zinc-500">{all.length} total</span>
      </div>

      {isLoading && all.length === 0 ? (
        <p className="text-xs text-zinc-500">Loading mint history…</p>
      ) : all.length === 0 ? (
        <p className="text-xs text-zinc-500">No mints yet — be the first!</p>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((row) => (
              <div
                key={`${row.txHash}-${row.logIndex}`}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <MinterName address={row.claimer} />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">{relativeTime(row.timestamp)}</span>
                  <span className="text-xs text-green-600 dark:text-green-500">✓ Success</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${row.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 underline"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1 pt-2">
              <button
                onClick={() => setPage(Math.max(0, current - 1))}
                disabled={current === 0}
                className="rounded-md px-2 py-1 text-xs disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded-md px-2 py-1 text-xs ${
                    i === current
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, current + 1))}
                disabled={current === totalPages - 1}
                className="rounded-md px-2 py-1 text-xs disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
