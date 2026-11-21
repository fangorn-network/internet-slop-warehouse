# Internet Slop Warehouse business plan

**November 2026 · Working plan**

The Warehouse sells games made from reusable Fangorn parts. A part owner publishes terms for commercial reuse. A game developer accepts those terms, ships a game with version-pinned credits, and sends upstream owners a share of each covered game sale. Players buy the game and the Warehouse earns a checkout fee. Start with zero upfront license fees and one paid remix with independent contributors.

## The purchase and the license

Players choose games based on what they can play. Give each game a free playable preview. Developers get a license to ship upstream work and see the full royalty schedule before committing to a release. Contributors get attribution and receipts showing which games generated their royalties. The Heartland Inn integration into Slopov II gives us a real example of a game incorporating a reusable environment with geometry, collision, and interactions. Use that pattern with a fresh rights-cleared paid contribution for the pilot. Existing grants, including CC0, continue to apply. A free component can receive credit without changing the economic split. [Hotel reuse case](../product-research/heartland-inn-reuse-case-2026-11-17.md)

## Pilot split

Test **80% game team / 15% upstream contributors / 5% Warehouse** on sales proceeds after refunds and excluding taxes collected from buyers. The Warehouse covers payment and delivery costs from its fee. The 80% pays for original work, assembly, game design, and support. An independent creator making a new licensed module can join the contributor pool. Someone commissioned by the team can also negotiate payment from the team share.

- **Make credit economically neutral for the publisher.** Every enrolled paid game funds the same pool regardless of its dependency count. Extra credits and self-building leave the publisher's 80% fixed. With zero eligible dependencies, route 15% to a separately accounted creator fund with no sale-linked rebate to the publisher or its affiliates. This fallback gives an original-only game the same split and makes enrollment more expensive than a conventional 5% storefront. Test whether teams accept it. The incentive applies within the program, while publishers can still choose another storefront for original work.
- **Separate attribution from royalties.** Credit all known dependencies, including free parts. A payout requires a verified shipped dependency, an eligible rights holder, and accepted commercial terms. The fixed pool takes away the publisher's direct gain from omission, but an incumbent contributor still gains if a peer's share is omitted. Review the release against its build lock and package, publish a claim channel, and define suspension and back-payment terms. Honor existing buyer entitlements during a listing dispute.
- **Count component families, not files or references.** Start with one payout unit per independently usable and reviewed art or logic family. Deduplicate across direct use, transitive use, copies, versions and minor variants. Exclude publisher-controlled and affiliate units from that release's pool. Check beneficial ownership and reciprocal arrangements in the curated pilot. Publishers can earn as upstream contributors in other independent games. Disclose the full split before launch, since adding a legitimate recipient reduces the others' shares. Test weight tiers for substantial systems after reviewing pilot allocations.
- **Aggregate small royalties.** Accrue balances per recipient, use deterministic rounding with carry, and batch payouts. Make each sale and refund reconcile to exactly one allocation. One checkout should work even when a game has hundreds of recipients.

### Example at $10 per game

Assume 100 licensed art families, 150 licensed logic families and 100 new first-party pieces. All 250 upstream families are independent and equally weighted. All 350 pieces can be visible in credits.

| Recipient | Per sale | At 1,000 sales |
|---|---:|---:|
| Game team | $8.00 | $8,000 |
| Art contributors combined | $0.60 | $600 |
| Logic contributors combined | $0.90 | $900 |
| Warehouse before costs | $0.50 | $500 |

An equal-weight unit earns $0.006 per sale, or $6 at 1,000 sales. An owner with ten eligible units earns $60. A free dependency appears in the manifest at zero weight, and the full $1.50 divides among the remaining eligible units. Thin payouts are a real test of the model. Measure contributor earnings across multiple games and ask whether owners would continue supplying parts at those rates.

## Release terms and provenance

Freeze a signed manifest per saleable release. Resolve the Warehouse's existing pinned `uses` and `parent` links into dependency versions, accepted license IDs, rights holders, economic families, weights, and beneficiary addresses. Give released builds and manifests immutable identifiers. Updates can change the split on future sales. Prior purchases retain their original allocation except for refunds or documented dispute adjustments.

A part license must explicitly authorize incorporation and distribution in the game release. An unlock gives access to bytes, while the license grants commercial rights. Include a remix parent when the developer incorporates licensed work. Traverse bundles under explicit pass-through grants and deduplicate claims when a publisher already holds redistribution rights. Resolve unclear rights before listing. The first pilot covers Warehouse checkout. Additional channels need separate consent, reporting and remittance or their own compatible checkout. Fangorn records can prove the declared graph and covered purchases. Finding copied, modified or omitted dependencies still requires inspection and a claims process. [Warehouse part schema](part.js)

## Annual market scenarios

Market size here is player spend on paid indie games that could fit this model. Contributor royalties come from that same spend. Warehouse revenue is the fee. The inputs below are hypotheses about annual active paid titles, copies per title and realized price.

| Market | Low | Base | High |
|---|---:|---:|---:|
| TAM · Paid indie games a broader implementation could serve | 5,000 × 1,000 × $8 = **$40M** | 10,000 × 2,500 × $10 = **$250M** | 20,000 × 5,000 × $12 = **$1.2B** |
| SAM · Paid web-first games compatible with the initial storefront | 100 × 250 × $6 = **$150k** | 500 × 500 × $8 = **$2M** | 2,000 × 1,000 × $10 = **$20M** |
| First-year Warehouse game sales | 3 × 50 × $6 = **$900** | 12 × 200 × $8 = **$19,200** | 40 × 500 × $10 = **$200k** |
| First-year Warehouse fee revenue at 5% | **$45** | **$960** | **$10k** |

SteamDB recorded roughly 21,000 Steam releases in 2025 across all types of games. That gives a scale reference for title output on one channel. The web-first title count, sell-through, and willingness to pay still need evidence. Build a named pipeline of compatible paid releases and replace the assumptions with observed title and buyer conversion. The base case is a validation budget. At 5%, $10M annual game sales yield $500k gross Warehouse revenue before costs. [SteamDB releases](https://steamdb.info/stats/releases/)

## Fangorn native payment pilot

Anchor release and dependency records in Fangorn on Base. Use standard x402 v2 with Base USDC and a hosted facilitator. The Warehouse reconciles each purchase to its pinned allocation, releases the game through a Cloudflare Worker, and batches royalties from a dedicated treasury. The initial payment path avoids Barliman and SettlementRegistry. The access Worker needs an entitlement adapter for purchases tracked in the Warehouse ledger. Start on Base Sepolia and move to a capped mainnet cohort after independent review and a low-value operator rehearsal. [Payment architecture and rollout](PAYMENTS-PLAN.md)

## First 90 days

| Window | Work and evidence |
|---|---|
| Days 1–14 | Show the split, empty-pool rule, and payout examples to three publishers and five part creators. Recruit a game publisher and two independent upstream owners willing to sign. Build a named pipeline of 20 potential releases. |
| Days 15–30 | On testnet, prove that one purchase unlocks a game and funds its creators. Reconcile payments, repeat delivery and payouts. Run the same accounting on a 350-part fixture. |
| Days 31–60 | Launch one paid game after validating rights, routing and recovery. Target 25 independent player purchases and reconcile each sale. Measure preview-to-purchase conversion, cost per order, and verified integration. |
| Days 61–90 | Launch or enroll a second game from another publisher using at least one previously paid contributor. Measure whether an upstream owner earns again and whether developers choose reuse at the proposed economics. Expand when both sides return and fees cover direct transaction and delivery costs at the observed volume. |
