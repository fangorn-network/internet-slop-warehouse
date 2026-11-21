# Licensed parts and live game updates

A game release can license ten parts and choose a version policy for each. The release pins the original parts it was tested with. A Warehouse resolver assembles the exact set for each play session. A pinned dependency always selects its chosen version. A dependency that follows updates selects the latest eligible revision on its owner's named channel, with a tested fallback. The game consumes resolved dependencies by slot, so an owner can improve a model or world without requiring the game author to republish the game.

The Westmarch API and MCP tool schemas can stay as they are. The additions live in Warehouse record payloads, the agent publishing workflow, the commercial license and entitlement service, and the player. Existing games continue to load their HTML and existing URLs. Adding metadata to a legacy game by itself will leave those URLs in use. A game must load its chosen assets through the new slot-based player interface. [Westmarch API specification](../westmarch/worker/API.md) · [Current Warehouse player](site/index.html)

## What gets published

| Object | Purpose |
|---|---|
| Part family | A stable identity using publisher, repo and record ID, with an asset kind and compatibility contract. Its current record can name the latest release and available channels. |
| Part version | An immutable record CID, with a content CID, version, contract version, and sealed payload reference where required. Storage retention must cover licensed historical revisions. |
| Game release | Immutable game code plus a slot manifest. Each slot names the part family, pinned baseline CID, license grant reference, version policy and compatibility requirements. Keep existing pinned `uses` for provenance. |
| Commercial grant | Signed, immutable terms or a signed reference to them. Bind the verified rights holder and beneficiary to the builder, game project, part family, allowed versions and channels, distribution rights, and royalty terms. |
| Session lock | The exact game release and part version CIDs delivered for one play session. It also gives support and playtests a reproducible input. |

For the first pass, keep the new manifest and public pointers as versioned fields in existing Warehouse record types. Use a Warehouse schema and local preflight, plus existing configurable validators for deterministic checks if the deployment needs them. Check signatures, current grants and cross-record rights in the commerce and resolution service. The Westmarch validator is designed for record and file checks without external I/O. A creator-controlled head may inform the next resolution. It cannot rewrite a previously accepted grant, the terms of a sold game, or a saved session lock. [Westmarch publishing and validation](../westmarch/worker/API.md)

### Slot example

A game can set its collision-critical hotel world to the pinned CID it tested and set a decorative sign to `follow` the owner's `stable` channel within its supported contract. The sign still has a known-good baseline CID. A game that follows ten parts resolves them as a set, including any required transitive dependencies, before launch. Each slot gets a version from its own policy and grant.

Use the existing MCP `pin` option for default current-version provenance when that is the version intended. It resolves top-level reference fields to current records at publish time. To preserve an explicitly chosen old CID in the release lock, supply that exact CID in the Warehouse manifest and omit that field from the MCP `pin` list. Preflight verifies it belongs to the expected family. The MCP `get` tool provides the current record. Historical versions need retrieval by durable CID through verified storage or Fangorn history. Test this before promising fallback across updates or takedowns. [MCP publish and get implementation](../westmarch/worker/mcp.js) · [Current Warehouse pinning](part.js)

## What the publishing agent does

1. Discover candidates with MCP search and get. Inspect previews, compatibility, license offers and current owner. Generate a proposed slot manifest with pinned versions as the default.
2. Show the person the commercial grants, proposed payout weights and chosen version policies. Accept grants using the Warehouse license flow with explicit approval or a separate, narrowly scoped delegation. A standard MCP publish grant authorizes publishing records under that wallet. It does not itself establish permission to sign a new royalty agreement or spend funds.
3. Fetch authorized builder data, validate the interface and transitive rights, and run the game using the recorded baseline. Generate the release lock and dependency credits from the same inputs. Use a preflight helper or agent skill for the routine steps. Never include plaintext paid files or decryption secrets in an MCP publish request. Upload ciphertext only through a supported storage flow. The standard publish file field uploads its input and replaces `payload.src`, so a pre-uploaded ciphertext CID should be referenced without a competing file upload.
4. Publish through the standard MCP tool using the existing publish grant. The Warehouse verifies and enrolls that exact game release for commerce. An agent can publish public work without enrollment. A paid listing requires validated grants, build references and an immutable payout manifest.

## What “latest” means when someone plays

Resolve the newest available version named by the approved owner channel that satisfies the accepted grant, compatibility contract, transitive licenses and current release policy. Treat the pinned baseline as the tested starting point. Cache the evaluated candidates and retain the last-known-good lock. Check factual compatibility separately from a version string. For a GLB, the contract can specify units, required nodes, attachment points, collision expectations, format and performance limits. For a world, use a versioned data schema plus runtime checks on spawn points and navigation. Hold an update when the contract fails or the necessary rights change.

Resolve once per new session. Use the same lock on restart and bind co-op rooms and saves that depend on simulation or world state to that same version set. Ship owner updates for passive data first. Executable logic stays pinned until the game publisher approves a specific update after review and tests. A valid publisher signature proves provenance. It does not establish the safety or behavior of new code. Allow per-title rollback to a known-good authorized set. An unavailable head or incompatible candidate can fall back to authorized cached versions. An explicit restriction that applies to a version must be respected by the fallback path too. Surface an actionable error when every available version is ineligible.

Keep paid-content credentials in the host or the Worker. Pass only session-scoped asset handles or the authorized bytes into the sandboxed game. Verify the source frame and allowed slot for any host-side messages. The game can use the licensed part in context without each player buying ten separate assets. Browser delivery gives the client access to the bytes needed to render or run the game. The license governs standalone redistribution. A TEE changes key custody and leaves that browser property intact.

## Keep payouts stable as versions move

The contributor, license and royalty weight belong to the accepted family grant and the release's signed allocation. A compatible update already covered by the same grant can change what plays without changing who gets paid. If a revision adds an unpaid transitive dependency, changes its beneficiary or terms, or requires a new distribution right, hold the update until the publisher approves a new commercial manifest. Apply any new payout schedule to future sales under that manifest. Preserve purchase receipts and access to versions covered by the original grant. Public credits can show the exact versions used in a session alongside the frozen purchase allocation. [Business plan](BUSINESS-PLAN.md) · [Payments plan](PAYMENTS-PLAN.md)

## First end-to-end slice

1. Define and test a Warehouse manifest with one pinned dependency and one following slot. Use a public GLB with a stable attachment point first, so version selection can be tested independently of payment and key delivery.
2. Publish a game and the GLB through the unchanged MCP tool. Publish a compatible GLB revision under the same family. Start a new session and verify that the following slot changes while the pinned slot and an open session retain their original versions. Then publish an incompatible revision and verify rollback or fallback to the last authorized compatible version.
3. Repeat with a licensed encrypted GLB. Verify a license for the builder, a separate game entitlement for the player, and denial for a buyer of a different release. Confirm the new version needs no extra purchase and leaves the royalty schedule untouched. Verify that expired offers cannot create new grants and that already granted versions follow their agreed rights.
4. Expand to a ten-slot fixture. Cover mixed public and paid content, failed storage, removed channel heads, invalid grant signatures, new unlicensed transitive parts, co-op session agreement and reproducible restart. Treat contract changes and executable dependencies as publisher-approved releases.
