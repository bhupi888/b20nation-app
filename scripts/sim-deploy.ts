// Read-only validation of the launchpad's on-chain createB20 flow.
// Uses the REAL lib/b20.ts encoding to simulate (eth_call) the deploy against
// the live Base Sepolia B20 factory precompile — no wallet, no gas, no signing.
// If the simulation returns the token address, the encoding is proven correct.
import { createPublicClient, http, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'
import {
  B20_FACTORY_ABI,
  B20_FACTORY_ADDRESS,
  B20_VARIANT_ASSET,
  B20_TOKEN_ABI,
  MINT_ROLE,
  encodeAssetCreateParams,
  randomSalt,
} from '../lib/b20'
import { encodeFunctionData, parseUnits } from 'viem'

// Live NAT20 token — the creator wallet is its admin, so we can validate the
// grant-role step's encoding against it (read-only).
const NAT20 = '0xb200000000000000000000bb7b06fa1bafde03f8' as Address

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') })

// Deployer = admin, mirroring the launchpad (uses the connected wallet for both).
const sender = '0xc703801d6a8d6a226b9cd81213b99485a09aa4e9' as Address
const name = 'Sample B20'
const symbol = 'SB20'
const decimals = 18

async function simulate(label: string, initCalls: `0x${string}`[]) {
  const salt = randomSalt()
  const params = encodeAssetCreateParams(name, symbol, sender, decimals)

  const predicted = (await client.readContract({
    address: B20_FACTORY_ADDRESS,
    abi: B20_FACTORY_ABI,
    functionName: 'getB20Address',
    args: [B20_VARIANT_ASSET, sender, salt],
  })) as Address

  const { result } = await client.simulateContract({
    address: B20_FACTORY_ADDRESS,
    abi: B20_FACTORY_ABI,
    functionName: 'createB20',
    args: [B20_VARIANT_ASSET, salt, params, initCalls],
    account: sender,
    value: 0n,
  })

  const match = (result as Address).toLowerCase() === predicted.toLowerCase()
  console.log(`\n[${label}]`)
  console.log('  predicted (getB20Address):', predicted)
  console.log('  simulated createB20 ->    :', result)
  console.log('  match:', match ? 'YES ✅' : 'NO ❌')
  return match
}

async function main() {
  console.log('Simulating createB20 on Base Sepolia (read-only)…')
  console.log('factory:', B20_FACTORY_ADDRESS, '| block:', (await client.getBlockNumber()).toString())

  // Case 1: no supply cap (launchpad with cap field blank).
  const ok1 = await simulate('no cap', [])

  // Case 2: with an updateSupplyCap initCall (launchpad with a cap entered).
  const cap = encodeFunctionData({ abi: B20_TOKEN_ABI, functionName: 'updateSupplyCap', args: [parseUnits('1000000', decimals)] })
  const ok2 = await simulate('with supply cap', [cap])

  // Case 3: grant MINT_ROLE step — simulate against live NAT20 (sender is admin).
  let ok3 = false
  try {
    await client.simulateContract({
      address: NAT20,
      abi: B20_TOKEN_ABI,
      functionName: 'grantRole',
      args: [MINT_ROLE, sender],
      account: sender,
    })
    console.log('\n[grantRole on NAT20]\n  simulated OK ✅ (grant-role step encoding + auth valid)')
    ok3 = true
  } catch (e) {
    const x = e as { shortMessage?: string; message?: string }
    console.log('\n[grantRole on NAT20]\n  reverted:', x.shortMessage || x.message)
  }

  console.log('\n=== RESULT:', ok1 && ok2 && ok3 ? 'FULL FLOW ENCODING PROVEN ✅' : 'PARTIAL — see above', '===')
  if (!(ok1 && ok2)) process.exit(1)
}

main().catch((e) => {
  console.error('\n=== SIMULATION REVERTED ❌ ===')
  console.error(e?.shortMessage || e?.message || e)
  if (e?.metaMessages) console.error(e.metaMessages.join('\n'))
  process.exit(1)
})
