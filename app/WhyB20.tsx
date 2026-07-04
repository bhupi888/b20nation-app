// Static informational section explaining the B20 token standard. Rendered
// below the mint UI on the home page. Content is sourced from the official Base
// docs for the Beryl upgrade (docs.base.org/base-chain/specs/upgrades/beryl/b20)
// and B20 launch coverage. No client state — plain server component.

type Feature = {
  title: string
  body: string
}

// Points 2–9 from the B20 research. Point 1 is the section lead paragraph below.
const FEATURES: Feature[] = [
  {
    title: 'Live since the Beryl upgrade',
    body: 'B20 is not a third-party contract — it shipped as part of Base’s official Beryl network upgrade on June 25, 2026. NAT20 is built on a protocol-level standard, not a one-off ERC-20 clone.',
  },
  {
    title: '~50% cheaper transfers',
    body: 'Because transfers execute as a native precompile instead of EVM bytecode, transfer costs are roughly half those of a standard ERC-20 — with higher throughput and less state for nodes to store.',
  },
  {
    title: 'Zero integration friction',
    body: 'A B20 token looks identical to an ERC-20 to everything downstream. Existing wallets, exchanges, indexers, and Basescan support it with no new integrations required.',
  },
  {
    title: 'Compliance built into the chain',
    body: 'Roles, supply caps, pausing, policy gating, memos, and permit are baked directly into the protocol. Issuers inherit safety from the chain instead of rewriting and re-auditing the same custom logic.',
  },
  {
    title: 'Role-based access control',
    body: 'Permissions split into distinct roles (DEFAULT_ADMIN_ROLE, MINT_ROLE, BURN_ROLE, PAUSE_ROLE, and more). Notably, holding admin does not let you mint — minting requires the separate MINT_ROLE.',
  },
  {
    title: 'Hard supply caps',
    body: 'A B20 token’s supply cap is a protocol-enforced ceiling — minting beyond it reverts. NAT20 is capped at 1,000,000 and already at its hard cap.',
  },
  {
    title: 'On-chain memos, no backend',
    body: 'Transfers can carry an optional bytes32 memo (a payment ID or reference) that emits a Memo event, letting apps verify payments on-chain without a backend database.',
  },
  {
    title: 'Signature approvals (permit)',
    body: 'B20 implements ERC-2612 permits, so holders can approve spenders with a signature instead of a separate transaction — a smoother, gasless-feeling UX.',
  },
]

export function WhyB20() {
  return (
    <section className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-black dark:text-white">Why B20?</h2>
        <p className="text-sm text-zinc-500 max-w-3xl">
          B20 is Base’s native token standard — an ERC-20 superset that runs
          as a chain-native precompile instead of a per-issuer smart contract. It
          keeps full ERC-20 compatibility while building extra features directly
          into the chain.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-2"
          >
            <h3 className="text-sm font-semibold text-black dark:text-white">{f.title}</h3>
            <p className="text-sm text-zinc-500">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
