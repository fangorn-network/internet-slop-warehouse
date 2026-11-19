# Warehouse workflow pilot: recovered run

Date: 2026-11-17. This is one instrumentation run per condition, not a statistical or monetary savings benchmark.

## Observations

| Condition | Builder-reported elapsed time | Reuse | Feasible checks |
| --- | --- | --- | --- |
| A: ordinary workflow | 142.83 seconds (2m 23s) | No external runtime parts | Seven core simulation checks |
| B: static warehouse catalog/files | 262 seconds (4m 22s) | One unchanged CC0 collector module | Eight core checks and a mocked DOM/input check |
| C: frozen local semantic search/get | 215.731 seconds (3m 36s) | The same unchanged CC0 collector module | Core route/state and instrumented DOM/input/audio checks |

All delivered static scavenger artifacts. Parent reruns of the supplied checks passed. Different check counts and test scaffolds do not constitute a quality ranking. Actual browser playability remains unverified for every condition: browser and localhost socket operations are unavailable in this execution environment.

On the observed wallclock measure, neither warehouse run finished sooner than the ordinary workflow. With one session per condition, different validation effort, no token/dollar telemetry, and no complete browser acceptance, this does not establish a general performance effect or cost per accepted task. It does establish that simply exposing reusable parts did not produce an observed speedup on this particular small task.

## What the warehouse demonstrably did

Both warehouse builders discovered and incorporated an existing collector, with exact record/source identifiers and license notes retained. Static-catalog B also inspected another candidate and rejected it. C used one semantic search and one get, with zero adapter errors.

C's adapter returned 16,865 JSON-RPC response bytes across its two calls; the builder reported 2,893 retrieved bytes for its selected retrieval. These are different scopes and must not be treated as interchangeable storage, bandwidth, or token measurements. Search ranking, metadata, JSON escaping, and source text all contribute to interface responses.

The recovered semantic interface is EmbeddingGemma-300m q8 on local CPU with 256-dimensional normalized vectors and a pinned model revision. It is not an exact reproduction of the hosted Workers runtime or its full search behavior. Basic vector/query checks passed; no search-quality evaluation is claimed.

## Setup costs and missing costs

The frozen corpus contains 355 records: 245 assets, 82 logic modules, 25 games, and 3 skills. All 110 non-asset source files were materialized and checksummed; binary assets remain version-pinned references rather than a fully cached corpus. No playable submission needed remote runtime assets.

Local semantic index preparation took 191.812 seconds for 355 records. That cold setup is excluded from C's warmed builder duration and must be amortized separately if estimating service economics. C's reported setupSeconds is a different, run-local measure; it is not the full indexing cost. Model download, earlier corpus freezing, orchestration, and independent review are also outside builder elapsed times. No complete all-in setup bill was measured.

Input/output tokens, model-dollar costs, and equivalent coverage of discovery effort were unavailable. A/B raw reports did not preserve the common schema; their original `output/result.json` files remain intact, with only reported elapsed times mapped into common root result records. Missing measurements remain null. Builder wallclock is not an independently metered billed-compute measure.

## Independent review

A fresh reviewer received neutral directory labels and no timing/result reports. Embedded provenance and launch paths can reveal origins, so masking is imperfect. The independent probes supported core reachability, collect-once behavior and exit gating for all three submissions. They also found defects the builders' checks missed:

- A and B: releasing one held keyboard alias or pointer can erase another still-held input. Ordinary single-input completion remains possible.
- A: source inspection found an optional-audio constructor/resume failure can abort input or reset.
- C: the Restart button does nothing after victory; Explore again does reset. A throwing optional AudioContext constructor can prevent starting, reproduced with the substitute runtime. Multiple-pointer held styling can also clear early while movement correctly remains active.

These findings are preserved without repairing submissions after measurement. No actual browser results are available, so none is a fully browser-accepted task. Full executable review evidence is archived in `independent-review/review/` and also retained under `../../reviews/2026-11-17-recovery-01/review/`. The mapping is Larch=B, Willow=A, Birch=C; reviewers did not receive that mapping.

Builder-reported acceptance fields use different evidence labels and are not a comparative score. A/B common templates intentionally retain not-evaluated entries rather than inventing missing builder assessments; use the independent review for common acceptance evidence.

## Interruption and preservation

The previous 2026-11-16 builder outputs and temporary review were lost when temporary storage was cleared. Their conversational timings are excluded from this report. The original frozen fixture survived. This recovery uses the same fixture but fresh builders; prior attempts are not combined with the recovered sessions.

Recovered artifacts, raw reports, normalized records, logs and file hashes are archived here. Source workspaces and masked review copies are also durable workspace paths. Model/vector caches are ignored by Git but stored in the workspace; pinned model revision and hashes permit reconstruction.

## Implication for the next round

The current evidence supports successful reuse/discovery, not demonstrated time or money savings. A small original Canvas game is a useful negative/control case: producing its basic behavior is already inexpensive for the baseline builder.

Before more runs, fix result-schema compliance and capture task lifecycle and model usage uniformly. Real browser acceptance needs an execution environment that supports it. Define a balanced task set before seeing further outcomes: retain this simple task, add a genuinely compositional task, and add an update/reproduction task over existing published versions. Keep ordinary public-source alternatives available to the baseline and include tasks poorly served by current inventory. Repeat/counterbalance before estimating effects.

This build experiment does not measure DataRegistry publishing, multi-app synchronization, mainnet fees, paid access, acquisition cost, willingness to pay, or Fangorn LLC profitability. Those remain separate experiments in the protocol.

## Files

- `summary.json`: normalized builder results, adapter aggregates, and archived-file hashes.
- `A/output/`, `B/output/`, `C/output/`: delivered artifacts and original builder reports.
- `../semantic-validation-2026-11-17/`: semantic setup/query checks and cache-mismatch rejection.
- `../model-2026-11-17.json`: pinned model file metadata and hashes.
