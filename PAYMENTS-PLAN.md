# Warehouse payment architecture and rollout

**Decision proposed.** Keep paid records and dependency manifests in Fangorn on Base. Take payment in Base USDC through standard x402 v2 `exact` with a hosted facilitator. Record purchases and accrue royalties in a transactional Warehouse ledger. Run fulfillment in a Cloudflare Worker and approve contributor payouts from a dedicated treasury. This avoids a Warehouse settlement contract, Barliman, and a Warehouse-held gas relay key in the payment path.

## Where Base fits

| Layer | Source of authority |
|---|---|
| What was published | Fangorn DataRegistry, publisher records, and immutable release and manifest CIDs |
| What is offered | Warehouse-verified publisher signature over the release, manifest, price, payment asset and network, license, and validity window |
| What was paid | Successful Base USDC authorization and transfer to the quoted treasury, reconciled to a single Warehouse order |
| Who gets access and royalties | Warehouse purchase and entitlement ledger, using the accepted offer and pinned allocation |
| What has been paid out | Base payout transfers reconciled against ledger entries |

A Base publication anchors a release. The payment receipt establishes the transfer. The Warehouse binds them to a purchase and entitlement. If the purchase itself must be independently discoverable on-chain, we can later anchor a batch commitment of receipt hashes without publishing buyer details. Independently enforceable on-chain royalty claims would require a distinct design.

## Options

| Option | Use | Tradeoff |
|---|---|---|
| Standard x402 plus a hosted facilitator | Recommended for the pilot. Use the upstream SDK and compare PayAI with Coinbase CDP. | Keeps the chain payment to standard USDC. The Warehouse owns fulfillment, reconciliation, custody and distribution. |
| Direct USDC transfer | Useful in internal rehearsals or an explicitly separate checkout flow. | Requires buyer gas or wallet sponsorship and careful order matching. Adds a second UX and receipt flow if shipped as a fallback. |
| Barliman plus SettlementRegistry | Revisit if independent entitlement checks or the existing Semaphore flow become product requirements. | Adds unaudited contracts and relay logic to the money path. Its single referrer cut still leaves graph royalties to another accounting layer. |
| Purpose-built royalty contract | Revisit if volume or trust requirements justify independent claims. | Adds contract and operational complexity. Requires independent review of the exact deployment and configuration. |

PayAI advertises Base support and documents `/supported`, `/verify`, and `/settle`. Confirm Base mainnet `eip155:8453`, v2 `exact`, the intended USDC EIP-3009 path, fees, and rate limits through provider capabilities and an end-to-end canary. Check the equivalent Coinbase CDP configuration before selecting a fallback. An HTTP success or a provider's stated chain coverage alone does not establish that our exact configured path works. [PayAI facilitator](https://facilitator.payai.network/) · [PayAI supported schemes](https://facilitator.payai.network/supported) · [Coinbase x402 facilitator](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)

## First paid release

**Publish.** Use one merchant, one immutable game release, and two independent contributors. Record the pinned release, all dependency licenses, the proposed 80/15/5 allocation, price, and treasury in a signed offer. Separate the free demo from the encrypted paid bundle. Verify the deployed DataRegistry and publisher authorization path before relying on it for offer provenance. Keep selling and signing authority separate.

**Pay.** The Worker creates an expiring order with a buyer wallet, release, offer hash, canonical USDC address, exact integer amount, and dedicated treasury. Use a unique EIP-3009 authorization nonce bound to that order. Prove in the spike that our checkout client and the facilitator preserve the server-issued nonce without departing from standard x402. If the SDK cannot do that, require a separate buyer-signed order binding that covers the payment authorization nonce, and reserve that nonce to one order before calling settlement. A generic x402 client may need an order-binding extension for this workflow. Pin the protocol and SDK versions after the spike. Verify the wallet, token, chain, amount, destination and validity window against the stored order.

**Reconcile.** Persist the order and authorization identifiers before the external call. After settlement, verify the successful chain receipt and match the expected token contract, consumed authorization, sender, destination and exact transfer amount. Never unlock on signature verification or on a transaction hash supplied by the client alone. Enforce uniqueness on the authorization and matched transfer event across all orders. After a timeout, mark the order pending and reconcile the original authorization against Base before submitting anything again or asking the buyer to sign again. Use one facilitator per attempt and keep fallback routing for new orders until recovery behavior is proven.

**Fulfill.** In one database transaction, attach the verified payment, grant the wallet access to the pinned release, and post ledger entries against the saved allocation. Replaying the same order returns its existing receipt. Adapt the existing access Worker or add a dedicated entitlement adapter. Its current buyer check calls SettlementRegistry `canRead`. Retain signed key requests and scoped key handling, with an authoritative lookup for either a buyer purchase or a separate developer license. Keep buyer receipts recoverable by wallet authentication. Serve key responses privately and back up and test restoration of the custody key. A TEE can replace custody after the entitlement interface is stable. [Access Worker](../webworker/fangorn-access-worker/README.md)

**Pay out.** Collect into a low-exposure, dedicated treasury. Keep treasury signing keys out of the Worker. Accrue all three shares in integer USDC units, preserving the full amount through deterministic rounding. Use manually reviewed payout batches for the pilot. Reconcile each payout and refund to its chain transfer and journal entry. Verify recipients and refund authorization before funds move. Keep enough reserve to honor the published refund terms. Use refundable credits or reversal entries in the ledger as appropriate to the state of each payout, with the pilot terms spelling out what happens after a contributor has already been paid.

## Implementation order and release gates

1. **Local prototype.** Implement offer validation, order binding, a settlement adapter, an append-only accounting journal with unique payment IDs, a transaction that grants entitlement alongside the journal, and a Worker key-release adapter. Generate a payout report and a manually approved transfer list. Keep the catalog, commerce, fulfillment and treasury authorities distinct.
2. **Base Sepolia rehearsal.** Walk through purchase, timeout after successful payment, duplicate submissions, same payment presented against two releases, wrong wallet, token, chain or treasury, expired offers, payment confirmation delays, refund, and recovery from database or key backup. Test integer conservation with the 350-part fixture. Compare testnet facilitator behavior and document provider-specific gaps.
3. **Independent review and mainnet canary.** Use LLM-assisted review for threat modeling, code review and test generation. Require a human reviewer independent of the implementer to verify the fixes and the exact configuration that will ship. Confirm authorized custody and payout operations. Then run operator-owned, low-value Base mainnet purchases, duplicate attempts, fulfillment recovery, one refund and one payout before opening the cohort. Ship only when every accepted charge reconciles to one order and every order can recover after a restart.
4. **Capped cohort.** Start with one release, an allowlist, and a cap such as 25 $10 orders or $250 in gross collections, whichever comes first. Reserve capacity before quoting. Pause new authorizations on unexplained payments, duplicate allocations, entitlement leaks, lost recovery, or treasury mismatches. Keep reconciliation and redownloads available when sales pause. Close or reconcile any outstanding quotes when shutting a cohort.
5. **Expansion decision.** Review conversion, payout accounting, refunds, support and provider reliability. Add automated disbursement or on-chain claims when contributor trust or volume makes the extra complexity worthwhile. Before putting material funds through custom contracts, commission independent contract review of the exact version, remediate findings, and verify deployed bytecode, roles and configuration.

An LLM review can find defects and improve coverage. It provides no assurance comparable to independent review, and it cannot validate a real deployment on its own. Keeping unaudited settlement contracts outside the pilot reduces the amount of code whose failure can move or lock customer funds. The remaining risks are checkout correctness, treasury custody, fulfillment and recovery.
