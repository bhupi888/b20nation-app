'use client'
import { useAccount, useConnect, useConnectors, useDisconnect, useReadContract } from 'wagmi'
import { NAT20_ADDRESS, NAT20_ABI } from '@/lib/token'
import { CLAIM_ADDRESS, CLAIM_ABI, CREATOR_ADDRESS } from '@/lib/claim'
import { formatUnits } from 'viem'

export default function CreatorPage() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const connectors = useConnectors()
  const { disconnect } = useDisconnect()

  const isCreator = !!address && address.toLowerCase() === CREATOR_ADDRESS.toLowerCase()

  const { data: totalClaims } = useReadContract({
    address: CLAIM_ADDRESS,
    abi: CLAIM_ABI,
    functionName: 'totalClaims',
    query: { enabled: isCreator, refetchInterval: 5000 },
  })
  const { data: claimAmount } = useReadContract({
    address: CLAIM_ADDRESS,
    abi: CLAIM_ABI,
    functionName: 'CLAIM_AMOUNT',
    query: { enabled: isCreator },
  })
  const { data: totalSupply } = useReadContract({
    address: NAT20_ADDRESS,
    abi: NAT20_ABI,
    functionName: 'totalSupply',
    query: { enabled: isCreator },
  })
  const { data: treasuryBalance } = useReadContract({
    address: NAT20_ADDRESS,
    abi: NAT20_ABI,
    functionName: 'balanceOf',
    args: [CREATOR_ADDRESS],
    query: { enabled: isCreator, refetchInterval: 5000 },
  })

  const maxMints = 1_000_000
  const minted = totalClaims ? Number(totalClaims) : 0
  const remainingMints = claimAmount && treasuryBalance ? treasuryBalance / claimAmount : undefined
  const pct = ((minted / maxMints) * 100).toFixed(4)

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-xl flex-col items-center gap-8 py-32 px-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">Creator Dashboard</h1>

        {!isConnected ? (
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-sm font-medium"
          >
            Connect Creator Wallet
          </button>
        ) : !isCreator ? (
          <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 text-center">
            <p className="text-zinc-500 text-sm">
              This page is only visible to the creator wallet.
            </p>
            <p className="font-mono text-xs text-zinc-400 break-all">{address}</p>
            <button onClick={() => disconnect()} className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-5 py-2 text-sm font-medium self-center">
              Disconnect
            </button>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total Mints</span>
              <span className="font-mono">{minted.toLocaleString()} / {maxMints.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${Math.min(Number(pct), 100)}%` }} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Percent Minted</span>
              <span className="font-mono">{pct}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Mints Remaining</span>
              <span className="font-mono">{remainingMints !== undefined ? remainingMints.toString() : '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total NAT20 Supply</span>
              <span className="font-mono">{totalSupply ? formatUnits(totalSupply, 18) : '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Treasury Balance</span>
              <span className="font-mono">{treasuryBalance ? formatUnits(treasuryBalance, 18) : '-'} NAT20</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Claim Contract</span>
              <span className="font-mono text-xs">{CLAIM_ADDRESS}</span>
            </div>

            <button onClick={() => disconnect()} className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-5 py-2 text-sm font-medium mt-2">
              Disconnect
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
