# Mercy exploration pass — asset plan

Brief: `../../mercy-ideas/ideas.md`. `index.md` was absent on November 15, 2026. The three supplied images are research references, not distributable game assets. Aim for a fictional town with the reference's spatial rhythm and period architecture, without reproducing its buildings. Main homes should be maintained and occupied; reserve decay for a separate abandoned location.

## Required assets and decisions

| Need | Existing material / warehouse result | Decision and acceptance criteria |
| --- | --- | --- |
| Enterable houses | Existing original CC0 house geometry; warehouse semantic-architecture has exterior details only | Build reusable hollow shells with walls, ceilings, floor, framed opening and door. Keep roofs and recognizable silhouettes. Validate walking across every threshold in both directions. |
| Diner facade | Existing original CC0 geometry and furnished interior | Repair opening, jambs, lower door panel and window framing. No mesh may cross the passage; closed door must block it. |
| Hotel | Existing motor court; supplied map suggests a separate hotel site | Author a modest original hotel with lobby and claimable rooms after planning the expanded town layout. Keep motor court distinct. |
| Chapel / post office | Existing solid exterior boxes | Replace with hollow shells, simple interiors, readable outward signage and operable entrances. Preserve landmarks. |
| Civilian characters | Existing original articulated geometry; warehouse search returned robot and furniture, no suitable human | Improve gait immediately; then source a verified CC0 rigged civilian or author a new period civilian. Require neutral proportions, readable face, idle/walk clips, correct scale and heading. Do not substitute the unused Soldier reference. |
| Interior dressing | Warehouse `settlement-model-library`, `ph-armchair-01`, `ph-vintage-suitcase`, `ph-wooden-crate-01` | Reuse selected CC0 pieces after budgets and scale checks. Suitcase fits hotel; chair fits houses. No dressing needed to make shells traversable. |
| Soundscape | Existing synthesized rain and low platform tone | Author layered rain, sheltered rain filtering, wet footsteps, door latch/hinge, distant mechanical strain and occasional chapel bell. Tie sources to places and platform timing; avoid a constant foreground drone. |
| Maintained house finishes | Existing original material atlas; supplied houses reference | Reuse materials initially, reduce excessive distress, add siding, porch railings and varied muted paint. Derelict reference informs only the abandoned property. |
| Expanded town | Current straight road on 100 × 162 m deck | Plan side roads, hotel, open lots and exploration routes before growing geometry. Use the supplied map for relationships rather than a traced replica. |

## Warehouse discovery

Live searches on November 15, 2026: “CC0 civilian human character realistic rigged walking animation” and “CC0 small town house hotel modular enterable building doors rain ambient sound”. No suitable human or complete enterable period house returned in those results. Useful candidates:

- `settlement-model-library`: original CC0 named furniture prototypes, locally available generator `parts/settlement-models.js`.
- `semantic-architecture`: original CC0 facade logic, locally available `parts/semantic-architecture.js`; not an interior system.
- `ph-armchair-01`: Kirill Sannikov, Poly Haven, CC0; source https://polyhaven.com/a/ArmChair_01.
- `ph-vintage-suitcase`: Maximilian Schuster, Poly Haven, CC0; source https://polyhaven.com/a/vintage_suitcase.
- `ph-wooden-crate-01`: James Ray Cock, Poly Haven, CC0; source https://polyhaven.com/a/wooden_crate_01.

Search results identify candidates, not newly imported assets. Verify license and archive source metadata when importing any external file. Existing original code/materials remain reusable. Package original reusable shells and sound modules with manifests and preview before permanent warehouse publication.

## Implementation sequence

1. Repair diner passage and sign orientation; tie gait to travel speed.
2. Add reusable building/door records and hollow shells. Replace hardcoded single-door session logic with authoritative door arrays, validated commands and per-building occupancy. Add interior claiming to shared state, with clear owner/release behavior.
3. Convert every ground-floor building, including individual motel rooms. Validate collision and claims in solo and co-op; upper story access needs explicit stairs rather than hidden teleportation.
4. Add sound layers with interior detection and footsteps.
5. Refine civilian art, house assets and hotel; expand the layout after traversal works.

## First implementation slice

Completed in source: post-office sign faces the exterior; diner lower wall and trim leave a two-metre opening matching its side colliders; door has a metal lower panel and visible vertical rails. Resident route velocity now controls gait cadence, with eased turns instead of instantaneous heading flips. Player gait uses the simulated walking speed.

Still pending: hollow shells beyond the diner, claims, additional doors, sound pass, replacement civilian art, hotel and expanded layout. No new third-party assets imported and no permanent publication in this slice.


## Enterable-town slice

Completed: reusable authored layout and hollow-shell builders; all 13 ground-floor spaces have real entrances and independent shared doors. Four houses, six motel rooms, chapel and post office can be claimed; the diner stays communal. Painted interior liners, clear walking paths, simple furnishings and ceiling lights are original CC0 geometry. Plants are excluded from indoor footprints. Rain drops reset above roofs, and rain audio becomes muffled indoors.

Claims are host-authoritative, limited to one home per visitor, releasable from inside and cleared when their owner leaves. Hosting preserves a solo claim; leaving co-op preserves the local visitor’s claim while releasing other claims. Closing a door is refused while anyone occupies its opening. Co-op uses a new protocol identifier to avoid joining incompatible earlier builds. Claims remain session-only.

Still pending: upper-storey access, detailed civilian art, fuller soundscape and footsteps, maintained exterior finishes, hotel and expanded layout. No new third-party assets imported. Exploration study 003 was published after user review and an explicit publish request; the reusable shell code is bundled in the game.
