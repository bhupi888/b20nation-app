export const CLAIM_ADDRESS = '0xcC46443DD11A1ADD7C936F4f0ac2c473F51f4efF' as const

// Treasury / deployer wallet — the only address allowed to view the creator stats page.
export const CREATOR_ADDRESS = '0xC703801d6A8d6a226B9CD81213B99485A09aA4E9' as const

export const CLAIM_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'hasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'totalClaims',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'CLAIM_AMOUNT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const
