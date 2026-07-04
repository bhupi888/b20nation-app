'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useBalance,
  useConnect,
  useConnectors,
  useGasPrice,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { encodeFunctionData, formatEther, formatUnits, parseEventLogs, parseUnits, type Address } from 'viem'
import {
  B20_FACTORY_ABI,
  B20_FACTORY_ADDRESS,
  B20_TOKEN_ABI,
  B20_VARIANT_ASSET,
  MAX_DECIMALS,
  MIN_DECIMALS,
  MINT_ROLE,
  encodeAssetCreateParams,
  randomSalt,
} from '@/lib/b20'

// Gas the B20 factory `createB20` call consumed in the real NAT20 deployment.
// B20 creation has no protocol fee — the real cost is just this gas times the
// current gas price (native precompile, not a deployed contract).
const B20_CREATE_GAS = 231565n

const EXPLORER = 'https://sepolia.basescan.org'

// Plain-English facts about what deploying a B20 token actually does.
const DEPLOY_FACTS: string[] = [
  'You are creating a real B20 token as a native Base precompile — no contract bytecode to deploy, and transfers cost roughly half an ERC-20’s.',
  'You become the token’s admin (DEFAULT_ADMIN_ROLE) — only you can grant roles or configure it.',
  'Admin alone cannot mint. Granting yourself MINT_ROLE is what unlocks issuing new supply.',
  'The token address is deterministic and encodes the B20 variant in its prefix, so it is recognizable on-chain without a lookup.',
  'It is ERC-20 compatible from block one — wallets, explorers, and exchanges treat it like any token.',
]

export default function Launchpad() {
  const [tokenName, setTokenName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('18')
  const [supplyCap, setSupplyCap] = useState('')
  const [mintAmount, setMintAmount] = useState('')

  // Immutable facts about the token once deployed.
  const [deployedToken, setDeployedToken] = useState<Address | null>(null)
  const [deployedDecimals, setDeployedDecimals] = useState(18)

  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const connectors = useConnectors()
  const { data: ethBalance } = useBalance({ address, query: { enabled: !!address } })

  const { data: gasPrice } = useGasPrice({ query: { refetchInterval: 15000 } })
  const deployFee = gasPrice ? Number(formatEther(B20_CREATE_GAS * gasPrice)).toFixed(8) : null

  // --- Deploy ---
  const { writeContract: deployWrite, data: deployHash, isPending: deployPending, error: deployError } = useWriteContract()
  const { data: deployReceipt, isLoading: deployConfirming } = useWaitForTransactionReceipt({ hash: deployHash })

  // Pull the new token address out of the B20Created event once the tx confirms.
  useEffect(() => {
    if (!deployReceipt) return
    const logs = parseEventLogs({ abi: B20_FACTORY_ABI, eventName: 'B20Created', logs: deployReceipt.logs })
    const token = logs[0]?.args?.token
    if (token) setDeployedToken(token as Address)
  }, [deployReceipt])

  const dec = Number(decimals || '18')
  const decimalsValid = Number.isInteger(dec) && dec >= MIN_DECIMALS && dec <= MAX_DECIMALS
  const canDeploy = isConnected && !!tokenName.trim() && !!symbol.trim() && decimalsValid && !deployPending && !deployConfirming

  const handleDeploy = () => {
    if (!address) return
    setDeployedDecimals(dec)
    const params = encodeAssetCreateParams(tokenName.trim(), symbol.trim(), address, dec)
    const initCalls: `0x${string}`[] = []
    // Optional hard supply cap, applied at creation. Blank = protocol default (no cap).
    const capStr = supplyCap.replace(/[, ]/g, '').trim()
    if (capStr) {
      const capRaw = parseUnits(capStr, dec)
      initCalls.push(encodeFunctionData({ abi: B20_TOKEN_ABI, functionName: 'updateSupplyCap', args: [capRaw] }))
    }
    deployWrite({
      address: B20_FACTORY_ADDRESS,
      abi: B20_FACTORY_ABI,
      functionName: 'createB20',
      args: [B20_VARIANT_ASSET, randomSalt(), params, initCalls],
      value: 0n,
    })
  }

  // --- Grant MINT_ROLE ---
  const { data: hasMintRole, refetch: refetchRole } = useReadContract({
    address: deployedToken ?? undefined,
    abi: B20_TOKEN_ABI,
    functionName: 'hasRole',
    args: address ? [MINT_ROLE, address] : undefined,
    query: { enabled: !!deployedToken && !!address },
  })
  const { writeContract: grantWrite, data: grantHash, isPending: grantPending } = useWriteContract()
  const { isSuccess: grantConfirmed } = useWaitForTransactionReceipt({ hash: grantHash })
  useEffect(() => {
    if (grantConfirmed) refetchRole()
  }, [grantConfirmed])

  const handleGrant = () => {
    if (!deployedToken || !address) return
    grantWrite({ address: deployedToken, abi: B20_TOKEN_ABI, functionName: 'grantRole', args: [MINT_ROLE, address] })
  }

  // --- Mint ---
  const { writeContract: mintWrite, data: mintHash, isPending: mintPending } = useWriteContract()
  const { isSuccess: mintConfirmed, isLoading: mintConfirming } = useWaitForTransactionReceipt({ hash: mintHash })
  const { data: myBalance, refetch: refetchBalance } = useReadContract({
    address: deployedToken ?? undefined,
    abi: B20_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!deployedToken && !!address },
  })
  useEffect(() => {
    if (mintConfirmed) refetchBalance()
  }, [mintConfirmed])

  const handleMint = () => {
    if (!deployedToken || !address || !mintAmount.trim()) return
    const amount = parseUnits(mintAmount.replace(/[, ]/g, '').trim(), deployedDecimals)
    mintWrite({ address: deployedToken, abi: B20_TOKEN_ABI, functionName: 'mint', args: [address, amount] })
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm font-mono text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500'

  const enoughEth = useMemo(
    () => (ethBalance && gasPrice ? ethBalance.value >= B20_CREATE_GAS * gasPrice : null),
    [ethBalance, gasPrice],
  )

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col items-center gap-8 py-16 px-8">
        <h1 className="text-3xl font-bold text-black dark:text-white text-center">B20 Launchpad</h1>

        <div className="w-full flex flex-col md:flex-row gap-6 items-start">
          {/* LEFT: deploy info + connected wallet */}
          <div className="w-full md:flex-1 flex flex-col gap-6">
            <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Network</span>
                <span className="font-mono">Base Sepolia</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Deploy Fee</span>
                <span className="font-mono">{deployFee ? `≈ ${deployFee} ETH` : '…'}</span>
              </div>
              <p className="text-xs text-zinc-500">
                Live estimate — {B20_CREATE_GAS.toLocaleString()} gas × current gas price. No protocol fee; you only pay network gas.
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

                {enoughEth === true && (
                  <p className="text-xs text-green-600 dark:text-green-500">✓ Enough ETH to cover the deploy fee</p>
                )}
                {enoughEth === false && (
                  <p className="text-xs text-amber-500">
                    Not enough ETH to deploy — get test ETH from the{' '}
                    <a href="https://portal.cdp.coinbase.com/products/faucet" target="_blank" rel="noopener noreferrer" className="underline">
                      Base Sepolia Faucet
                    </a>
                  </p>
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

          {/* RIGHT: deploy → address → grant → mint */}
          <div className="w-full md:flex-1">
            <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
              <span className="text-sm font-medium text-black dark:text-white">Deploy a B20 Token</span>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Token Name</span>
                  <input className={inputClass} placeholder="My Token" value={tokenName} onChange={(e) => setTokenName(e.target.value)} disabled={!!deployedToken} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Symbol</span>
                  <input className={inputClass} placeholder="MYT" value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={!!deployedToken} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Decimals (6–18)</span>
                  <input className={inputClass} placeholder="18" value={decimals} onChange={(e) => setDecimals(e.target.value)} disabled={!!deployedToken} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-zinc-500">Supply Cap (optional)</span>
                  <input className={inputClass} placeholder="No cap" value={supplyCap} onChange={(e) => setSupplyCap(e.target.value)} disabled={!!deployedToken} />
                </label>
              </div>

              {!decimalsValid && decimals !== '' && (
                <p className="text-xs text-amber-500">Decimals must be a whole number between 6 and 18.</p>
              )}

              {!deployedToken ? (
                <>
                  <button
                    onClick={handleDeploy}
                    disabled={!canDeploy}
                    className="rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {deployPending ? 'Confirm in wallet…' : deployConfirming ? 'Deploying…' : 'Deploy B20'}
                  </button>
                  {deployError && (
                    <p className="text-xs text-red-500 break-words">{deployError.message.split('\n')[0]}</p>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Deployed address */}
                  <div className="rounded-lg border border-green-500/40 bg-green-500/5 p-3 flex flex-col gap-1">
                    <span className="text-xs text-green-600 dark:text-green-500">🎉 Token deployed</span>
                    <span className="font-mono text-xs break-all text-black dark:text-white">{deployedToken}</span>
                    <a
                      href={`${EXPLORER}/address/${deployedToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View on Basescan ↗
                    </a>
                  </div>

                  {/* Grant MINT_ROLE */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">MINT_ROLE</span>
                      <span className={`font-mono text-xs ${hasMintRole ? 'text-green-600 dark:text-green-500' : 'text-amber-500'}`}>
                        {hasMintRole ? 'Granted ✓' : 'Not granted'}
                      </span>
                    </div>
                    {!hasMintRole && (
                      <button
                        onClick={handleGrant}
                        disabled={grantPending}
                        className="rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {grantPending ? 'Confirm in wallet…' : 'Grant MINT_ROLE to me'}
                      </button>
                    )}
                  </div>

                  {/* Mint */}
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="text-zinc-500">Mint amount</span>
                      <input className={inputClass} placeholder="1000" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} />
                    </label>
                    <button
                      onClick={handleMint}
                      disabled={!hasMintRole || !mintAmount.trim() || mintPending || mintConfirming}
                      className="rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {mintPending ? 'Confirm in wallet…' : mintConfirming ? 'Minting…' : 'Mint'}
                    </button>
                    {!hasMintRole && (
                      <p className="text-xs text-zinc-500 text-center">Grant yourself MINT_ROLE first to enable minting.</p>
                    )}
                    {mintConfirmed && (
                      <p className="text-xs text-green-600 dark:text-green-500 text-center">
                        Minted ✓ — your balance: <span className="font-mono">{myBalance ? formatUnits(myBalance, deployedDecimals) : '—'}</span> {symbol}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* What you're doing */}
        <section className="w-full flex flex-col gap-4">
          <h2 className="text-xl font-bold text-black dark:text-white">What you’re doing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEPLOY_FACTS.map((fact, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 text-sm text-zinc-500">
                {fact}
              </div>
            ))}
          </div>
        </section>

        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to mint
        </Link>
      </main>
    </div>
  )
}
