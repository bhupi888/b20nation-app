'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useAccount, useBalance, useConnect, useConnectors, useGasPrice } from 'wagmi'
import { formatEther } from 'viem'

// Gas the B20 factory `createB20` call consumed in the real NAT20 deployment.
// B20 creation has no protocol fee — the real launch cost is just this gas
// times the current gas price (native precompile, not a deployed contract).
const B20_CREATE_GAS = 231565n

export default function Launchpad() {
  const [tokenName, setTokenName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('')
  const [supplyCap, setSupplyCap] = useState('')

  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const connectors = useConnectors()
  const { data: ethBalance } = useBalance({ address, query: { enabled: !!address } })

  const { data: gasPrice } = useGasPrice({ query: { refetchInterval: 15000 } })
  const launchFee = gasPrice ? Number(formatEther(B20_CREATE_GAS * gasPrice)).toFixed(8) : null

  const inputClass =
    'w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm font-mono text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500'

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col items-center gap-8 py-16 px-8">
        <h1 className="text-3xl font-bold text-black dark:text-white text-center">B20 Launchpad</h1>

        <div className="w-full flex flex-col md:flex-row gap-6 items-start">
          {/* LEFT: launch info + connected wallet */}
          <div className="w-full md:flex-1 flex flex-col gap-6">
            <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Network</span>
                <span className="font-mono">Base Sepolia</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Launch Fee</span>
                <span className="font-mono">{launchFee ? `≈ ${launchFee} ETH` : '…'}</span>
              </div>
              <p className="text-xs text-zinc-500">
                Live estimate — {B20_CREATE_GAS.toLocaleString()} gas × current gas price. Updates with the network.
              </p>
            </div>

            {isConnected ? (
              <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Connected</span>
                  <span className="font-mono text-xs">{address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Your Sepolia ETH</span>
                  <span className="font-mono">{ethBalance ? formatEther(ethBalance.value) : '0'} ETH</span>
                </div>

                {ethBalance && gasPrice && (
                  ethBalance.value >= B20_CREATE_GAS * gasPrice ? (
                    <p className="text-xs text-green-600 dark:text-green-500">
                      ✓ Enough ETH to cover the launch fee
                    </p>
                  ) : (
                    <p className="text-xs text-amber-500">
                      Not enough ETH for the launch — get test ETH from the{' '}
                      <a href="https://portal.cdp.coinbase.com/products/faucet" target="_blank" rel="noopener noreferrer" className="underline">
                        Base Sepolia Faucet
                      </a>
                    </p>
                  )
                )}
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="self-center rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-sm font-medium"
              >
                Connect Base Account
              </button>
            )}
          </div>

          {/* RIGHT: launch setup dialog */}
          <div className="w-full md:flex-1">
            <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
              <span className="text-sm font-medium text-black dark:text-white">Launch a B20 Token</span>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Token Name</span>
                  <input className={inputClass} placeholder="My Token" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Symbol</span>
                  <input className={inputClass} placeholder="MYT" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Decimals</span>
                  <input className={inputClass} placeholder="18" value={decimals} onChange={(e) => setDecimals(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Supply Cap</span>
                  <input className={inputClass} placeholder="1,000,000" value={supplyCap} onChange={(e) => setSupplyCap(e.target.value)} />
                </label>
              </div>

              <button
                disabled
                className="rounded-full bg-zinc-300 dark:bg-zinc-700 text-zinc-500 px-5 py-2 text-sm font-medium cursor-not-allowed"
              >
                Launch B20
              </button>
              <p className="text-xs text-zinc-500 text-center">On-chain launch coming soon.</p>
            </div>
          </div>
        </div>

        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to mint
        </Link>
      </main>
    </div>
  )
}
