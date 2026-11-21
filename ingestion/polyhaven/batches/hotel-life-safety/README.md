# Hotel life safety, batch 1

Powered by Poly Haven. CC0-1.0 (https://polyhaven.com/license).

- **fire_alarm** (by Slinc, https://polyhaven.com/a/fire_alarm): a red manual pull station, packed by
  `node ingestion/polyhaven/ingest.js --batch hotel-life-safety` into `parts/haven/ph-fire-alarm.glb` (1K maps, geometry
  unchanged). Used for the Heartland Inn's pull stations at the exits (`projects/roadside-inn/world/life-safety.js`).
- Searched 2026-11-21 for the other devices (smoke/CO detectors, horn/strobes, exit signs, emergency lights, sprinkler
  heads): none on Poly Haven, Grab3D or ambientCG. Briefed to Victor in `artifacts/roadside-inn/briefs/natasha-2026-11-21.md`.
- `provenance.json` keeps creator, sources, sizes, MD5 and SHA-256; `parts.json` is the publication batch (not yet published).
