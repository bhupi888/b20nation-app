'use client'
import { usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { Address } from 'viem'
import { CLAIM_ADDRESS, CLAIM_ABI, CLAIM_DEPLOY_BLOCK } from '@/lib/claim'
import { resolveBasename } from '@/lib/basename'

const COLLAPSED = 5 // rows shown by default
const MAX_ROWS = 10 // rows shown once expanded
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
  const [expanded, setExpanded] = useState(false)

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

      const mapped: MintRow[] = logs.map((l) => ({
        claimer: (l.args as { claimer: Address }).claimer,
        txHash: l.transactionHash!,
        blockNumber: l.blockNumber!,
        logIndex: l.logIndex!,
      }))

      // Newest first (latest at the top, oldest at the bottom).
      mapped.sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? b.logIndex - a.logIndex
          : Number(b.blockNumber - a.blockNumber),
      )
      return mapped
    },
  })

  const all = rows ?? []
  const visible = all.slice(0, expanded ? MAX_ROWS : COLLAPSED)
  const canExpand = all.length > COLLAPSED

  return (
    <div className="panel w-full rounded-2xl p-6 flex flex-col gap-4">
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
          <div
            className={`flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 ${
              expanded ? 'max-h-72 overflow-y-auto' : ''
            }`}
          >
            {visible.map((row) => (
              <div
                key={`${row.txHash}-${row.logIndex}`}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <MinterName address={row.claimer} />
                <div className="flex items-center gap-3">
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

          {canExpand && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="self-center rounded-full px-4 py-1.5 text-xs text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              {expanded ? 'Show less' : `Show more (${Math.min(MAX_ROWS, all.length)})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
