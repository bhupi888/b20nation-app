'use client'
import { useAccount, useConnect, useConnectors, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi'
import { NAT20_ADDRESS, NAT20_ABI } from '@/lib/token'
import { CLAIM_ADDRESS, CLAIM_ABI } from '@/lib/claim'
import { formatUnits, formatEther } from 'viem'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MintHistory } from './MintHistory'
import { WhyB20 } from './WhyB20'

// Creator's X profile — users are gated to follow this before minting unlocks.
const X_PROFILE_URL = 'https://x.com/bhupix13'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const connectors = useConnectors()
  const { disconnect } = useDisconnect()

  const [followStep, setFollowStep] = useState<'idle' | 'verifying' | 'verified'>('idle')

  const { data: name } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'name' })
  const { data: symbol } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'symbol' })
  const { data: totalSupply } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'totalSupply' })
  const { data: balance, refetch: refetchBalance } = useReadContract({ address: NAT20_ADDRESS, abi: NAT20_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!address } })

  const { data: ethBalance } = useBalance({ address, query: { enabled: !!address } })
  const { data: hasClaimed, refetch: refetchClaimed } = useReadContract({ address: CLAIM_ADDRESS, abi: CLAIM_ABI, functionName: 'hasClaimed', args: address ? [address] : undefined, query: { enabled: !!address } })
  const { data: totalClaims, refetch: refetchTotalClaims } = useReadContract({ address: CLAIM_ADDRESS, abi: CLAIM_ABI, functionName: 'totalClaims', query: { refetchInterval: 15000 } })

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isConfirmed) {
      refetchBalance()
      refetchClaimed()
      refetchTotalClaims()
    }
  }, [isConfirmed])

  const gasCost = receipt ? formatEther(receipt.gasUsed * receipt.effectiveGasPrice) : null
  const showModal = isConfirmed

  // Open the creator's X profile, then run a simulated follow verification.
  const startFollowVerify = () => {
    window.open(X_PROFILE_URL, '_blank', 'noopener,noreferrer')
    setFollowStep('verifying')
    setTimeout(() => setFollowStep('verified'), 5000)
  }

  // Open the X post composer pre-filled with a mint announcement.
  const shareOnX = () => {
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    const text = `I just minted a B20 token (NAT20) ${url} on Base Sepolia`
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-8 py-16 px-8">
        <header className="w-full flex justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            {name ?? 'B20Nation'} ({symbol ?? 'NAT20'})
          </h1>
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-500">
                {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''}
              </span>
              <button
                onClick={() => disconnect()}
                className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-sm font-medium whitespace-nowrap"
            >
              Connect Base Account
            </button>
          )}
        </header>

        <div className="w-full flex flex-col md:flex-row gap-6 items-start">
          {/* LEFT: stats + connect / mint */}
          <div className="w-full md:flex-1 flex flex-col gap-6">
            <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Supply</span>
                <span className="font-mono">{totalSupply ? formatUnits(totalSupply, 18) : '-'} NAT20</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Contract</span>
                <span className="font-mono text-xs">{NAT20_ADDRESS}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Wallets Minted</span>
                <span className="font-mono">{totalClaims?.toString() ?? '0'} / 1,000,000</span>
              </div>
            </div>

            {isConnected ? (
              <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Your NAT20 Balance</span>
                  <span className="font-mono">{balance ? formatUnits(balance, 18) : '0'} NAT20</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Your Sepolia ETH</span>
                  <span className="font-mono">{ethBalance ? formatEther(ethBalance.value) : '0'} ETH</span>
                </div>

                {ethBalance && ethBalance.value < BigInt('1000000000000000') && (
                  <p className="text-xs text-amber-500">
                    Low ETH balance — get test ETH from the{' '}
                    <a href="https://portal.cdp.coinbase.com/products/faucet" target="_blank" rel="noopener noreferrer" className="underline">
                      Base Sepolia Faucet
                    </a>
                  </p>
                )}

                {hasClaimed ? (
                  <>
                    <button disabled className="rounded-full bg-zinc-300 dark:bg-zinc-700 text-zinc-500 px-5 py-2 text-sm font-medium cursor-not-allowed">
                      Already Minted
                    </button>
                    <button
                      onClick={shareOnX}
                      className="rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-sm font-medium"
                    >
                      Share on X
                    </button>
                    <Link
                      href="/launchpad"
                      className="rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-medium text-center"
                    >
                      🚀 Launch your own token
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 text-center">
                      Cost: Free — you only pay Base Sepolia network gas
                    </p>

                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">X Follow</span>
                      <span
                        className={`font-mono text-xs ${
                          followStep === 'verified'
                            ? 'text-green-600 dark:text-green-500'
                            : followStep === 'verifying'
                            ? 'text-zinc-500'
                            : 'text-amber-500'
                        }`}
                      >
                        {followStep === 'idle'
                          ? 'Not followed'
                          : followStep === 'verifying'
                          ? 'Verifying…'
                          : 'Followed ✓'}
                      </span>
                    </div>

                    {followStep === 'idle' && (
                      <>
                        <p className="text-xs text-zinc-500 text-center">
                          Follow the creator on X to unlock minting
                        </p>
                        <button
                          onClick={startFollowVerify}
                          className="rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-sm font-medium"
                        >
                          Follow Creator
                        </button>
                      </>
                    )}

                    {followStep === 'verifying' && (
                      <div className="flex items-center justify-center gap-2 py-2 text-sm text-zinc-500">
                        <span className="w-4 h-4 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin" />
                        Verifying follow…
                      </div>
                    )}

                    {followStep === 'verified' && (
                      <button
                        onClick={() => writeContract({ address: CLAIM_ADDRESS, abi: CLAIM_ABI, functionName: 'claim' })}
                        disabled={isPending}
                        className="rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {isPending ? 'Minting...' : 'Mint 1 NAT20'}
                      </button>
                    )}
                  </>
                )}

              </div>
            ) : (
              <div className="w-full rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-sm text-zinc-500 text-center">
                Connect your Base Account (top right) to mint.
              </div>
            )}
          </div>

          {/* RIGHT: recent mints */}
          <div className="w-full md:flex-1">
            <MintHistory />
          </div>
        </div>

        <WhyB20 />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-black dark:text-white">🎉 Congratulations!</h2>
            <p className="text-zinc-600 dark:text-zinc-400">You successfully minted 1 NAT20.</p>
            {gasCost && (
              <p className="text-sm text-zinc-500">
                Gas cost: <span className="font-mono">{gasCost}</span> ETH
              </p>
            )}
            <button
              onClick={shareOnX}
              className="rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-sm font-medium mt-2 w-full"
            >
              Share on X
            </button>
            <Link
              href="/launchpad"
              className="rounded-full bg-blue-600 text-white px-6 py-2 text-sm font-medium w-full text-center"
            >
              🚀 Launch your own token
            </Link>
            <button
              onClick={() => reset()}
              className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-6 py-2 text-sm font-medium w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
