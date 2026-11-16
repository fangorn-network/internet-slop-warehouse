# Warehouse game systems: what exists and what this game adds

Start from a complete game, then change data/rules. Avoid collecting unrelated
engines before the design needs them. `DEAD-AIR-QUICKSTART.md` is the entry point
for geographic co-op; `SURVIVAL-QUICKSTART.md` is the fastest enclosed survival
starter; `HOMESTEAD-QUICKSTART.md` covers gathering/crafting/building co-op.

| Need | Existing reusable part | Used by Dead Air |
|---|---|---|
| HP, damage, immunity, healing, death/revive | health | Yes: clarity |
| Resources, ammo, repair costs, capacity, atomic trades | resource-inventory | Yes: cells/evidence |
| Crafting, recipes, station requirements | recipe-book | Available; not needed for this case |
| Quest prerequisites and completion | objective-journal | Yes |
| Save/export, validation and migration hooks | save-codec | Yes |
| Deterministic randomness | seeded-random | Available; OSM/view have deterministic content hashes/seeds |
| Grid pathfinding, walls, doors | grid-navigation | Available for interiors |
| Hearing, sight, patrol, pursuit, attacks | perception-brain | Available for enemies/NPCs |
| Nearest usable target and action hooks | proximity-interaction | Available; case rules validate shared targets |
| Melee, stealth, survival, crafting and loot composition | survival-kit | Complete alternative starter |
| Shared building/gathering and authoritative co-op | homestead-kit + p2p-homestead | Reference and existing game |
| Model animation | clip-animator | Available for animated GLBs |
| Touch directions and buttons | touch-controls | Available; atlas uses an analog pointer stick |
| Checkpoints, carrying, towing, cycles and triggers | checkpoint-course, spring-tether, phase-cycle, trigger-zones | Available |
| Point/XP rewards with retry deduplication | **score-ledger** | **New, used** |
| Attack/skill use, ammo costs, cooldowns | **ability-clock** | **New, used for scanner pulse** |
| OSM vector decoding and bounded map fallback | **osm-vector-district**, @mapbox/vector-tile, pbf | **New integration, used** |
| Geographic projection, OSM semantics, map validation | **osm-district** | **New, used** |
| Street graph routing / tap-to-follow | **street-navigation** | **New, used** |
| OSM footprint-based 3D world | **osm-town-view** | **New, used** |
| Water tower model/generator | **water-tower**, municipal-water-tower GLB | **New, used** |
| Exact map manifest + host-owned case replication | **p2p-case-session** | **New, real WebRTC tested** |
| Complete investigation / shared notebook / relay progression | **dead-air-case** | **New, complete playable rules** |

## Imported/reused assets

The catalog already supplies CC0 scanned brick and snow textures, a Poly Haven
boombox, plus original Northwoods branching trees, needle/bark textures and
synthesized wind. Dead Air actually uses those parts and pins them in `uses`.
A new generic CC0 municipal water-tower GLB and its generator add a reusable
landmark. The OSM district is an additional data asset, **ODbL, not CC0**.
No unreviewed bulk model pack or unused state framework was added.

## Further tools worth considering when a game needs them

- **@mapbox/vector-tile 3.0.0 / pbf 5.1.2** are imported for the map fallback,
  bundled for browser/Worker/Node use and published with BSD/ISC notices. This
  avoids reimplementing the binary tile decoder. OpenFreeMap/OpenMapTiles
  attribution and map ODbL are retained separately from adapter-code CC0.
- Three.js GLTFLoader and GLTFExporter are already in use: runtime model reuse
  and reproducible GLB generation, rather than bespoke binary formats.
- Trystero is already vendored and MIT-licensed; the new adapter composes it
  rather than introducing another networking stack.
- OSM's Simple 3D Buildings vocabulary provides height, levels, roof information
  and multipolygons where contributors mapped them. The renderer deliberately
  marks its own missing-detail assumptions.
- Detailed animation, physics, terrain elevation, streaming independent players,
  persistent servers and AI navigation in interiors need their own focused
  integrations and tests. None is required to turn this kit into an agent-edited,
  playable first case. Add them against a concrete gameplay need.

## Primary references

- OSM licensing: https://www.openstreetmap.org/copyright
- OSM 3D scheme: https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings
- Water tower tag: https://wiki.openstreetmap.org/wiki/Tag:man_made%3Dwater_tower
- Public Overpass resource policy: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- Three.js: https://threejs.org/docs/
- Trystero: https://github.com/dmotz/trystero (vendored 0.27.0 and notices in parts/vendor/)
