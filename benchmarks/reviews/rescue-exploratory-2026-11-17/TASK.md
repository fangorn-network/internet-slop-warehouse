# Challenge 02 — Rescue Relay: update without losing the expedition

Brief version: `rescue-relay-update-v1`. Requires a common neutral starter fixture before launch. It must not be sourced from a condition's prior output or selected to favor a warehouse recipe.

## Operator fixture contract — not builder hints

Prepare a small static, keyboard/touch-capable starter with movement/collision, three signal locations, a simple objective loop, and a validated portable save string. Use original benchmark code or an independently licensed neutral starter, not a warehouse-only inventory item. Freeze its exact source, assets, dependency lock/manifest, baseline behavior tests, and three saves (start, partial progress, completed), with hashes. Every arm receives identical starter bytes and requirements; the supplied starter is exempt from condition A's prohibition on warehouse/mirrored inventory.

Also prepare a **v2 dependency update** with one documented breaking interface change in movement or objective handling and one documented behavior improvement. Deliver identical v2 bytes, migration notes, and availability at the same task-relative point to all arms. Ordinary versioned files/manifest are available to A; B/C may obtain equivalent publication records through their assigned interfaces. Do not make conventional delivery deliberately cumbersome or hide the migration note from A.

The starter must be playable before the experiment. An operator must complete the baseline route and validate all saves. Freeze expected old behavior before builders see it. These fixtures and checks are prerequisites, not work to be improvised during scoring.

## Exact builder brief

You are maintaining **Rescue Relay**, the supplied browser expedition prototype. Turn it into a coherent short rescue mission, apply the supplied dependency update, and preserve existing expeditions. Use the supplied starter rather than replacing it with an unrelated game.

The mission takes place around three damaged signal towers. Your player recovers a distinct component for each tower, repairs towers in an order they choose, and uses the restored signals to locate and escort a stranded surveyor to the extraction point. Keep the starter's recognizable route, movement controls, and baseline functionality.

Required behavior:

1. Add recover/repair progression with visible prerequisite feedback. Components collect once, repair consumes the correct component once, and towers retain repaired state. Every tower can be repaired through ordinary play.
2. The rescued surveyor begins following only after all three towers are restored. They can navigate the authored route to extraction without walking through obstacles or becoming permanently stuck. Include a clear wait/follow action and explain it in game.
3. Add one environmental obstruction that a repaired tower resolves. It must change a meaningful route choice while preserving reachability for every valid repair order.
4. Provide coherent arrival, repair, rescue, and extraction feedback; in-game controls; visible progress; pause/resume; restart before and after victory; keyboard and touch controls; and mute if audio is present.
5. Apply the supplied v2 dependency update. Preserve all unaffected starter behavior. Explain interface adaptations and pin exact versions of dependencies, including reused external work.
6. Load the supplied v1 saves. Preserve completed work and player/mission state that still has meaning; initialize new state safely and communicate any unavoidable change. Reject invalid/corrupted saves without crashing or destroying the current expedition.
7. Export a new portable save that resumes the same mission state in a fresh page. Saved inventory, repaired towers, surveyor state, and extraction status must be internally consistent. A save must not award duplicate components/repairs/rewards on repeated load.
8. Supply a reproducible static artifact and an exact dependency/source manifest. Reopening that artifact must not silently pick up a newer unpinned version. Existing v1 artifact behavior must remain reproducible from its frozen package.

Make this feel like a small finished rescue experience, with legible goals, responsive controls, coherent presentation, and a satisfying conclusion. Do not maximize feature count. Procedural or reusable assets are both allowed; no specific inventory item, engine, or implementation is required. Preserve the starter's license and record all sources/modifications. No paid services/assets, accounts, public publication, or backend requirement.

## Common acceptance checklist

- Starter v1 package and behavior checks pass before modification; any initial defect is recorded for all conditions before scoring.
- Updated artifact loads on desktop and phone viewports; controls, presentation and mission are evaluated by actual play, not only source inspection.
- Test all six tower-repair orders. All complete, obstruction never creates a softlock, and component/repair duplication is rejected.
- Surveyor follows around obstacles, can wait/resume, and reaches extraction under ordinary controls. Verify that arrival before the rescue prerequisites cannot trigger victory.
- v1 start, partial and completed saves load according to a common declared migration expectation; invalid input leaves the current good state intact.
- New saves round-trip at partial repair, surveyor following/waiting, and completed extraction. Loading the same save repeatedly does not duplicate state.
- Pause, restart, blur, pointer cancellation and audio-failure checks match challenge 01.
- Independently rebuild/reopen from the dependency manifest and compare declared simulation/save state against the delivered package. Verify v1 reproduction separately from v2 updates.
- Do not silently waive a failed required item because an artifact looks better. Record functional coverage, blockers and human play-quality ratings separately.

## What this challenge measures

This tests adaptation, composition, state migration, and reproducibility over a common base. It does not establish cheaper chain anchoring or private/paid access. Keep source acquisition, update handling, implementation, validation and repair costs identifiable. Preparation of the shared starter is setup cost; neither a free benefit attributed only to Fangorn nor a cost charged only to the baseline.
