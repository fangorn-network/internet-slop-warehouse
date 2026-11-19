# Core and save adaptation

The frozen v1 page calls `move(state,dx,dy,dt)`. The new mission calls the supplied **2.0.0** `advance(shadow,{x,y},elapsedSeconds)` API. That dependency is copied unchanged. The wrapper subdivides time to 25 ms and accepts at most 250 ms, retaining v2's normalized direction, collision radius, lag behavior, returned displacement and clamping flag. A shadow with no active baseline signals prevents the old extraction rule from prematurely stopping the new escort mission. Mission completion instead requires both player and rescued surveyor at extraction. The extra crossing collision is applied during the same bounded movement steps.

The navigation dependency uses four-neighbor A* on authored integer cells. Every free center has clearance for the existing 0.22-radius actor. The escort follows connected centers with bounded 0.06-unit collision-checked steps, begins from the current cell center when reconstructing a route, and recalculates as the player's target cell changes. This avoids direct obstacle-cutting pursuit. Path caches are transient and safely rebuilt on load. The escort pauses its movement when told to wait, and only begins following after all towers are restored and the player meets it.

## RR1 import

The exact supplied v2 loader first validates the old checksum, schema, collision position, unique signal IDs and old completion invariants. Position is copied exactly. Activated towers become repaired; their components are marked collected and consumed. Remaining components start uncollected, inventory starts empty, and the surveyor starts unrescued at its camp. A previously completed expedition retains `legacyCompleted: true`, visible in the progress log. It is not reported as a completed rescue: the new escort objective remains and the import message explains it.

For an arbitrary valid old save occupying the new flooded crossing before North repair, position is preserved and `legacyGateOverride` keeps that crossing safely open for this expedition. This is disclosed on import and preserved in RR2. The three supplied fixtures need no override. No supplied position, activation or old completion is discarded.

## RR2 export and trust

RR2 is base64url JSON with an FNV-1a corruption checksum. It contains schema 2, exact player position, unique `signals` (repaired tower IDs), `collected`, `inventory`, surveyor position/rescue/follow order, rescue completion, legacy completion and crossing override. Arrays export in canonical ID order; their ordering has no mission meaning. Consumed inventory cannot recur: collected equals the disjoint union of installed and carried components. The surveyor cannot be rescued before three repairs, cannot follow before rescue, and must remain at its authored camp before rescue. Completed saves require both actors at extraction and no continuing follow order. There are no repeating rewards or scores.

Inputs are bounded to 8192 characters. Checksums, schema, IDs, uniqueness, finite positions, collisions and cross-field consistency are validated before the UI assigns the result. Invalid input leaves the current expedition untouched. The checksum is not authentication, encryption, a publisher signature or anti-cheat protection. Saves are explicit portable strings; there is no hidden autosave or storage migration.
