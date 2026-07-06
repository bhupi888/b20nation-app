import {
  createPublicClient,
  encodePacked,
  http,
  keccak256,
  namehash,
  stringToBytes,
  type Address,
} from 'viem'
import { base } from 'viem/chains'

// Basenames (base.eth) are registered on Base *mainnet*, so reverse-resolve there
// regardless of which chain the app itself runs on.
const baseClient = createPublicClient({ chain: base, transport: http() })

// Base mainnet L2 reverse resolver.
const BASENAME_L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as const

const RESOLVER_ABI = [
  {
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Reverse node for `<addr>.<coinType>.reverse`, matching Base's reverse registrar.
function reverseNode(address: Address): `0x${string}` {
  const labelHash = keccak256(stringToBytes(address.toLowerCase().slice(2)))
  const coinType = ((0x80000000 | base.id) >>> 0).toString(16).toUpperCase()
  const parent = namehash(`${coinType}.reverse`)
  return keccak256(encodePacked(['bytes32', 'bytes32'], [parent, labelHash]))
}

// Returns the wallet's base.eth name, or null if it has none / lookup fails.
export async function resolveBasename(address: Address): Promise<string | null> {
  try {
    const name = await baseClient.readContract({
      address: BASENAME_L2_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: 'name',
      args: [reverseNode(address)],
    })
    return name && name.length > 0 ? name : null
  } catch {
    return null
  }
}
