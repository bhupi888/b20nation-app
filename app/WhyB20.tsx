// Static informational section explaining the B20 token standard. Rendered
// below the mint UI on the home page. Content is sourced from the official Base
// docs for the Beryl upgrade (docs.base.org/base-chain/specs/upgrades/beryl/b20)
// and B20 launch coverage. No client state — CSS-only hover interactions.

type Feature = {
  // Short chip label shown at rest.
  title: string
  // One-word/short tag for the collapsed chip.
  tag: string
  // Full description, revealed on hover.
  body: string
}

// Points 2–9 from the B20 research. Point 1 is the section lead below.
const FEATURES: Feature[] = [
  {
    title: 'Beryl-native',
    tag: 'Standard',
    body: 'B20 is not a third-party contract — it shipped as part of Base’s official Beryl network upgrade on June 25, 2026. NAT20 is built on a protocol-level standard, not a one-off ERC-20 clone.',
  },
  {
    title: '~50% cheaper',
    tag: 'Gas',
    body: 'Because transfers execute as a native precompile instead of EVM bytecode, transfer costs are roughly half those of a standard ERC-20 — with higher throughput and less state for nodes to store.',
  },
  {
    title: 'Zero friction',
    tag: 'Compatible',
    body: 'A B20 token looks identical to an ERC-20 to everything downstream. Existing wallets, exchanges, indexers, and Basescan support it with no new integrations required.',
  },
  {
    title: 'Compliance built in',
    tag: 'Safety',
    body: 'Roles, supply caps, pausing, policy gating, memos, and permit are baked directly into the protocol. Issuers inherit safety from the chain instead of rewriting and re-auditing the same custom logic.',
  },
  {
    title: 'Role-based access',
    tag: 'Roles',
    body: 'Permissions split into distinct roles (DEFAULT_ADMIN_ROLE, MINT_ROLE, BURN_ROLE, PAUSE_ROLE, and more). Notably, holding admin does not let you mint — minting requires the separate MINT_ROLE.',
  },
  {
    title: 'Hard supply caps',
    tag: 'Supply',
    body: 'A B20 token’s supply cap is a protocol-enforced ceiling — minting beyond it reverts. NAT20 is capped at 1,000,000 and already at its hard cap.',
  },
  {
    title: 'On-chain memos',
    tag: 'Payments',
    body: 'Transfers can carry an optional bytes32 memo (a payment ID or reference) that emits a Memo event, letting apps verify payments on-chain without a backend database.',
  },
  {
    title: 'Signature approvals',
    tag: 'Permit',
    body: 'B20 implements ERC-2612 permits, so holders can approve spenders with a signature instead of a separate transaction — a smoother, gasless-feeling UX.',
  },
]

export function WhyB20() {
  return (
    <section className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-white">Why B20?</h2>
        <p className="text-sm text-zinc-500">Base’s native token standard. Hover any tile for the detail.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="group relative">
            {/* Collapsed chip */}
            <div className="panel rounded-xl px-4 py-3.5 h-full flex flex-col gap-1 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-blue-500/40 cursor-default">
              <span className="text-[11px] font-mono uppercase tracking-wide text-blue-400/80">{f.tag}</span>
              <span className="text-sm font-medium text-white leading-snug">{f.title}</span>
            </div>

            {/* Expanded popup on hover */}
            <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-72 max-w-[80vw] -translate-x-1/2 -translate-y-1 scale-95 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
              <div className="panel rounded-xl border border-blue-500/30 p-4 shadow-2xl shadow-blue-950/60">
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wide text-blue-400/80">{f.tag}</span>
                  <span className="text-sm font-medium text-white">{f.title}</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">{f.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
