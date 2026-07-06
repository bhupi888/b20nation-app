import { encodeAbiParameters, keccak256, toBytes, type Address, type Hex } from 'viem'

// Singleton B20 factory precompile — same address on every network (Base + testnets).
export const B20_FACTORY_ADDRESS = '0xB20f000000000000000000000000000000000000' as const

// B20Variant enum: ASSET = 0, STABLECOIN = 1. We deploy the Asset variant
// (configurable decimals 6–18), which is what a general-purpose token wants.
export const B20_VARIANT_ASSET = 0 as const

// Asset decimals are constrained to [6, 18] by the factory (reverts otherwise).
export const MIN_DECIMALS = 6
export const MAX_DECIMALS = 18

// Role identifiers, per base-std B20Constants.sol.
export const DEFAULT_ADMIN_ROLE = `0x${'0'.repeat(64)}` as Hex // bytes32(0)
export const MINT_ROLE = keccak256(toBytes('MINT_ROLE'))

// Encoding version carried as the first field of B20AssetCreateParams.
const ASSET_PARAMS_VERSION = 1

// Factory ABI — only the pieces we call/decode.
export const B20_FACTORY_ABI = [
  {
    name: 'createB20',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
      { name: 'params', type: 'bytes' },
      { name: 'initCalls', type: 'bytes[]' },
    ],
    outputs: [{ name: 'token', type: 'address' }],
  },
  {
    name: 'getB20Address',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'sender', type: 'address' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'B20Created',
    type: 'event',
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'variant', type: 'uint8', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false },
      { name: 'decimals', type: 'uint8', indexed: false },
      { name: 'variantEventParams', type: 'bytes', indexed: false },
    ],
  },
] as const

// Deployed B20 token ABI — the calls the launchpad makes on a token after creation.
export const B20_TOKEN_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'supplyCap', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'grantRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateSupplyCap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newSupplyCap', type: 'uint256' }],
    outputs: [],
  },
] as const

// Encodes the `params` blob for an Asset-variant createB20 call. Mirrors
// base-std's B20FactoryLib.encodeAssetCreateParams: abi.encode of the struct
// { uint8 version, string name, string symbol, address initialAdmin, uint8 decimals }.
export function encodeAssetCreateParams(name: string, symbol: string, initialAdmin: Address, decimals: number): Hex {
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'initialAdmin', type: 'address' },
          { name: 'decimals', type: 'uint8' },
        ],
      },
    ],
    [{ version: ASSET_PARAMS_VERSION, name, symbol, initialAdmin, decimals }],
  )
}

// A random 32-byte salt fixes the deterministic token address for a deploy.
export function randomSalt(): Hex {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}
