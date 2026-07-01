'use client'
import { useAccount, useConnect, useConnectors, useDisconnect, useReadContract } from 'wagmi'
import { NAT20_ADDRESS, NAT20_ABI } from '@/lib/token'
import { formatUnits } from 'viem'
export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const connectors = useConnectors()
  const { disconnect } = useDisconnect()
  const { data: name } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'name' })
  const { data: symbol } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'symbol' })
  const { data: totalSupply } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'totalSupply' })
  const { data: balance } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!address } })
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-xl flex-col items-center gap-8 py-32 px-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">{name ?? 'B20Nation'} ({symbol ?? 'NAT20'})</h1>
        <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total Supply</span>
            <span className="font-mono">{totalSupply ? formatUnits(totalSupply, 18) : '-'} NAT20</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Contract</span>
            <span className="font-mono text-xs">{NAT20_ADDRESS}</span>
          </div>
        </div>
        {isConnected ? (
          <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Connected</span>
              <span className="font-mono text-xs">{address}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Your Balance</span>
              <span className="font-mono">{balance ? formatUnits(balance, 18) : '0'} NAT20</span>
            </div>
            <button onClick={() => disconnect()} className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-5 py-2 text-sm font-medium">Disconnect</button>
          </div>
        ) : (
          <button onClick={() => connect({ connector: connectors[0] })} className="rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-sm font-medium">Connect Base Account</button>
        )}
      </main>
    </div>
  )
}
