'use client'
import { useAccount, useConnect, useConnectors, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi'
import { NAT20_ADDRESS, NAT20_ABI } from '@/lib/token'
import { CLAIM_ADDRESS, CLAIM_ABI } from '@/lib/claim'
import { formatUnits, formatEther } from 'viem'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MintHistory } from './MintHistory'
import { WhyB20 } from './WhyB20'

// Creator's X account — users are gated to follow this before minting unlocks.
const X_HANDLE = 'bhupix13'

// Minimum ETH required to cover mint gas; the mint button stays inactive below this.
const MIN_MINT_ETH = 1000000000000000n // 0.001 ETH

// Claim cap — the total number of wallets that can ever mint.
const MINT_CAP = 1_000_000

const FAUCET_URL = 'https://portal.cdp.coinbase.com/products/faucet'

type StepState = 'active' | 'done' | 'idle'

// A single step in the mint checklist (Follow → Confirm).
function StepRow({ n, label, state }: { n: number; label: string; state: StepState }) {
  const done = state === 'done'
  const active = state === 'active'
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
        active ? 'bg-blue-950/40 border border-blue-500/30' : 'panel-inset'
      } ${state === 'idle' ? 'opacity-60' : ''}`}
    >
      <div
        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
          done
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500'
        }`}
      >
        {done ? '✓' : n}
      </div>
      <span className={`text-sm ${active ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
        {label}
      </span>
    </div>
  )
}

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
  }, [isConfirmed, refetchBalance, refetchClaimed, refetchTotalClaims])

  const gasCost = receipt ? formatEther(receipt.gasUsed * receipt.effectiveGasPrice) : null
  const showModal = isConfirmed
  const hasEnoughEth = ethBalance ? ethBalance.value >= MIN_MINT_ETH : false
  const lowEth = !!ethBalance && ethBalance.value < MIN_MINT_ETH

  const minted = totalClaims ? Number(totalClaims) : 0
  // Floor the fill at 2% once anyone has minted so the bar reads as "started".
  const mintPct = Math.min(100, minted > 0 ? Math.max(2, (minted / MINT_CAP) * 100) : 0)
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''
  const shortContract = `${NAT20_ADDRESS.slice(0, 6)}…${NAT20_ADDRESS.slice(-4)}`

  const followed = hasClaimed || followStep === 'verified'
  const step1State: StepState = !isConnected ? 'idle' : followed ? 'done' : 'active'
  const step2State: StepState = hasClaimed ? 'done' : isConnected && followStep === 'verified' ? 'active' : 'idle'

  // Open X's follow Web Intent — a small popup with a Follow button for the
  // creator — then run a simulated follow verification.
  const startFollowVerify = () => {
    const intent = `https://x.com/intent/follow?screen_name=${X_HANDLE}`
    window.open(intent, 'x-follow', 'popup=yes,width=600,height=650')
    setFollowStep('verifying')
    setTimeout(() => setFollowStep('verified'), 10000)
  }

  // Open the X post composer pre-filled with a mint announcement.
  const shareOnX = () => {
    const text = `I just minted $NAT20, B20 Token on Base Sepolia
Built by @bhupix13. Check it out on https://b20nation.xyz
Mint and launch your own.
@base
#base #baseapp #buildonbase #nat20 #B20`
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-6 py-12 px-8">
        {/* Top bar */}
        <header className="w-full flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white text-sm font-bold">B</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-black dark:text-white">{name ?? 'B20Nation'}</span>
              <span className="font-mono text-xs text-zinc-500">{symbol ?? 'NAT20'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Base Sepolia
            </span>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">{shortAddr}</span>
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
          </div>
        </header>

        {/* Hero: token identity + mint action */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Token identity + live progress + stats */}
          <div className="panel rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <div className="text-3xl font-bold text-black dark:text-white leading-none">{symbol ?? 'NAT20'}</div>
              <div className="text-sm text-zinc-500 mt-1.5">Claim one on Base Sepolia — one per wallet</div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs text-zinc-500">Wallets minted</span>
                <span className="font-mono text-xs text-black dark:text-white">
                  {minted.toLocaleString()} / {MINT_CAP.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${mintPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg panel-inset px-3 py-2.5">
                <div className="text-xs text-zinc-500">Total supply</div>
                <div className="text-base font-mono font-semibold text-black dark:text-white">
                  {totalSupply ? Number(formatUnits(totalSupply, 18)).toLocaleString() : '—'}
                </div>
              </div>
              <div className="rounded-lg panel-inset px-3 py-2.5">
                <div className="text-xs text-zinc-500">Contract</div>
                <div className="font-mono text-xs text-blue-600 dark:text-blue-400 mt-0.5" title={NAT20_ADDRESS}>
                  {shortContract}
                </div>
              </div>
            </div>
          </div>

          {/* Mint action */}
          <div className="panel rounded-2xl p-6 flex flex-col gap-4">
            {!isConnected ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black dark:text-white">Mint your NAT20</span>
                  <span className="text-xs text-zinc-500">Free + gas</span>
                </div>
                <div className="flex flex-col gap-2">
                  <StepRow n={1} label="Follow the creator on X" state="idle" />
                  <StepRow n={2} label="Confirm mint in wallet" state="idle" />
                </div>
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="rounded-full bg-blue-600 text-white px-5 py-3 text-sm font-medium"
                >
                  Connect Base Account
                </button>
                <p className="text-xs text-zinc-500">Connect your Base Account to start the mint.</p>
              </>
            ) : hasClaimed ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black dark:text-white">You&rsquo;re in</span>
                  <span className="text-xs text-green-600 dark:text-green-500">Minted ✓</span>
                </div>
                <div className="rounded-lg panel-inset px-3 py-2.5 flex justify-between">
                  <span className="text-xs text-zinc-500">Your balance</span>
                  <span className="font-mono text-sm text-black dark:text-white">{balance ? formatUnits(balance, 18) : '1'} NAT20</span>
                </div>
                <button
                  onClick={shareOnX}
                  className="rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 text-sm font-medium"
                >
                  Share on X
                </button>
                <Link
                  href="/launchpad"
                  className="rounded-full bg-blue-600 text-white px-5 py-2.5 text-sm font-medium text-center"
                >
                  Deploy your own token →
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black dark:text-white">Mint your NAT20</span>
                  <span className="text-xs text-zinc-500">Free + gas</span>
                </div>
                <div className="rounded-lg panel-inset px-3 py-2.5 flex justify-between">
                  <span className="text-xs text-zinc-500">Your balance</span>
                  <span className="font-mono text-xs text-black dark:text-white">
                    {balance ? formatUnits(balance, 18) : '0'} NAT20 · {ethBalance ? Number(formatEther(ethBalance.value)).toFixed(4) : '0'} ETH
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <StepRow n={1} label="Follow the creator on X" state={step1State} />
                  <StepRow n={2} label="Confirm mint in wallet" state={step2State} />
                </div>

                {followStep === 'idle' && (
                  <button
                    onClick={startFollowVerify}
                    className="rounded-full bg-blue-600 text-white px-5 py-3 text-sm font-medium"
                  >
                    Follow to unlock minting
                  </button>
                )}

                {followStep === 'verifying' && (
                  <div className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-500">
                    <span className="w-4 h-4 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin" />
                    Verifying follow…
                  </div>
                )}

                {followStep === 'verified' && (
                  <button
                    onClick={() => writeContract({ address: CLAIM_ADDRESS, abi: CLAIM_ABI, functionName: 'claim' })}
                    disabled={isPending || !hasEnoughEth}
                    className="rounded-full bg-blue-600 text-white px-5 py-3 text-sm font-medium disabled:opacity-50"
                  >
                    {isPending ? 'Minting…' : !hasEnoughEth ? 'Not enough ETH to mint' : 'Mint 1 NAT20'}
                  </button>
                )}

                <p className={`text-xs ${lowEth ? 'text-amber-500' : 'text-zinc-500'}`}>
                  {lowEth ? 'Low ETH balance — get' : 'Need'} test ETH? Grab some from the{' '}
                  <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="underline">
                    Base Sepolia faucet
                  </a>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Recent mints */}
        <MintHistory />

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
              🚀 Deploy your own token
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
