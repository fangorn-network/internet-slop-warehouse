# Set pipeline: real place → spec → plan → assets → placed

One space at a time (a "space" is a room or a part of one: `room-212-bath`, `lobby-coffee`). Each step has one owner,
one input file and one output file, so nobody re-reads the codebase to find out what to do.

| step | who | reads | writes |
|---|---|---|---|
| 1. spec | scout | real photos (web) | `specs/<space>.md` (SPEC-TEMPLATE.md) |
| 2. diff | script | the spec + the running scene | `node pipeline/diff.mjs <space>`: missing / no model / extra |
| 3. plan | Natasha | spec + diff | placements in the space's world/ module (put()), kinds in `kinds.js`, briefs `briefs/<id>.md` (BRIEF-TEMPLATE.md) |
| 4. build | Victor | briefs (all of a round in one go) | `assets/<id>.glb` + `blender/<file>.py`, hooks named per the brief, `assets-N.parts.json` entry |
| 5. place | Natasha | Victor's report | put() the new models, run lint + screenshots |
| 6. ship | lead (main session) | Natasha's report | review shots, publish, commit |

Rules that keep it cheap:
- A spec is written once per space and reused (another room of the same type reuses `room-king.md`). Re-scout only
  when the spec is wrong.
- Placement is data: `put(model, x, y, z, yaw, opts)`. What a thing *does* comes from its kind (`kinds.js`), never from
  the placement. A lamp is a lamp: cord, plug, switch, light. A new behaviour is a new trait in `kinds.js` +
  `world/put.js`, used by every model of that kind.
- Victor builds the hooks a kind needs (named nodes, BRIEF-TEMPLATE.md) so behaviour and later physics attach without
  rebuilding the model.
- Checks are scripts, not agents: `node check.mjs lint` (overlaps, door swings, sunk below floor, kinds missing their
  traits), `node check.mjs flow`, `pipeline/diff.mjs`. Agents read their JSON, not the code.
- Reports are short: what changed, file paths, shots. No narration.

Paths are relative to `projects/roadside-inn/`. Specs: `specs/`. Briefs: `../../artifacts/roadside-inn/briefs/`.
Shots: `../../artifacts/roadside-inn/<space>/`.
