# Warehouse economics experiments

Status: recovery instrumentation pilot completed 2026-11-17; no validated savings claim. See [the report](evidence/recovery-2026-11-17/REPORT.md).

## Recovery round, 2026-11-17

The original builders' temporary artifacts and temporary independent review were lost during interruption. Their conversational timings are not retained as auditable benchmark results. Durable recovery runs are under `runs/2026-11-17-recovery-01/`, with masked-label review copies under `reviews/2026-11-17-recovery-01/`. The corpus remains the same 355-record fixture.

The pinned embedding model was downloaded to ignored workspace cache rather than temporary storage. ONNX sizes and LFS hashes were checked against Hugging Face metadata. File hashes and revision are recorded in `evidence/model-2026-11-17.json`. A 355-record local q8 vector index and a basic semantic-query check passed; evidence is under `evidence/semantic-validation-2026-11-17/`. This is local semantic search, not hosted-runtime parity or hybrid-search validation. Cold setup was approximately 191.8 seconds, measured separately from builder time. The recovery C condition is `C-semantic-local`, not the prior lexical diagnostic.

Vector caches are resumable and bound to the captured view hash, embedder identity, model revision and text extractor. For local replay, set `BENCH_MODEL_ROOT`, `BENCH_MODEL_REVISION`, and `BENCH_VECTOR_CACHE` as in the recovered C access instructions. Model and vector caches are ignored by Git; their paths persist in the workspace, and pinned downloads allow reconstruction.

Browser/loopback restrictions still apply. The recovery is a one-run-per-condition instrumentation exercise with unavailable model-token/dollar telemetry, not a statistical savings estimate. Previously observed results are not combined with the recovery round.

## Preparation tooling and current fixture

The first captured live view is `fixtures/2026-11-16-pilot-02/`: 355 records (245 assets, 82 logic, 25 games, 3 skills). All 110 non-asset source files are materialized (7,231,131 bytes). Binary asset references are pinned but not fully cached. This is not a fully offline fixture. Read `manifest.json` and `materialization.json` for integrity scope; SHA-256 checks do not constitute independent verification of the registry, stitch, or UnixFS DAG.

Commands from the warehouse root:

```sh
# Capture a saved view; destination must not exist.
node benchmarks/freeze.mjs /path/to/view.json benchmarks/fixtures/NEW_ID
# Download version-pinned source responses with bounded requests; resume on rerun.
node benchmarks/materialize.mjs benchmarks/fixtures/NEW_ID text
# Import already-downloaded source files if Node's network access is restricted.
node benchmarks/materialize.mjs benchmarks/fixtures/NEW_ID text --offline
# Create condition folders, identical briefs and empty result records.
node benchmarks/prepare.mjs benchmarks/fixtures/NEW_ID /tmp/NEW_RUN
# Read-only stdio MCP, frozen catalog and sources, metrics to a separate file.
node benchmarks/frozen-mcp.mjs benchmarks/fixtures/NEW_ID lexical /tmp/metrics.jsonl
# Semantic mode uses Westmarch's local EmbeddingGemma; requires model availability.
node benchmarks/frozen-mcp.mjs benchmarks/fixtures/NEW_ID semantic /tmp/metrics.jsonl
# Loading evidence only; gameplay checks are still separate.
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node benchmarks/browser-smoke.mjs http://localhost:PORT /tmp/NEW_EVIDENCE
```

Lexical MCP initialize, tool listing, filtered search, pinned text retrieval, and missing-record errors passed an instrumentation smoke check. This lexical scorer is intentionally simple and is **not** the production semantic/hybrid ranker. Semantic mode exists but has not been validated; record runtime/model differences before using it in scored condition C. The browser smoke runner could not launch Chrome in the current sandbox (`setsockopt: Operation not permitted`); no browser acceptance result is available.

Preparation folders exist at `/tmp/fangorn-warehouse-pilot-20261116/`. On 2026-11-16 the user explicitly authorized delegation. Fresh-context builders were launched for A, B, and a separately labeled C-lexical diagnostic. The local semantic initialization attempt failed because the model was not cached and sandbox DNS access to Hugging Face failed (`EAI_AGAIN`); C-lexical must not be pooled with production semantic-search results. This conversation is contaminated with the task and inventory, so its own work must not be presented as an independent builder run.

The first pilot uses one builder per condition to exercise instrumentation, not the three repetitions proposed for a subsequent round. All inherit the parent model configuration, receive the same 60-minute cap and task, and are prohibited from paid purchases and public publication. Token and dollar budgets remain uninstrumented; any resulting elapsed-time data is not a full economic benchmark. Conditions are instruction-isolated on the shared filesystem, not security-sandboxed from one another. Binary assets are frozen references only. These limitations must accompany the results.

## Questions

1. Does warehouse access reduce the cost of completing useful agent work compared with ordinary tools and public sources?
2. How much of that benefit comes from the inventory, packaging, and search rather than Fangorn's publication infrastructure?
3. What does publishing, updating, and consuming the same material cost each participant?

Run these as separate experiments. A faster build using warehouse parts is evidence for warehouse reuse, not by itself evidence that blockchain publication is cheaper.

## First pilot: a small playable artifact

Give every builder this same brief:

> Build a browser-playable scavenger scene with keyboard and touch controls. The player collects three distinct objects and opens an exit after collecting all three. Include visible progress, a restart action, and sound that starts only after a user gesture. Serve the result as static files. Provide dependency and license information. Creative style is unrestricted. Deliver a working artifact, launch instructions, and a list of reused sources and modifications.

Acceptance checks, set before runs:

- The scene loads on desktop and a phone-sized viewport without fatal errors.
- Keyboard and touch input can move the player and reach every collectible and the exit.
- Each collectible counts once; the exit remains locked until all three are collected.
- Restart restores the initial state and collectible availability.
- Audio obeys the initial user-gesture requirement.
- Dependencies are reachable and reused sources have attribution/license information.

Judge completion against these checks. Record aesthetic impressions separately; this experiment does not require a high-quality game. An evaluator should not know the run's condition when practical.

## Three conditions

| Condition | Access | What comparison estimates |
| --- | --- | --- |
| A: ordinary workflow | Normal coding tools, documentation, public search, packages, and external assets; no warehouse or its mirrored source | Realistic alternative to using the warehouse |
| B: static warehouse | Same permitted ordinary tools, plus a frozen file/catalog export of the warehouse corpus and its documentation; ordinary file/text search | A vs B: value of available inventory and packaging |
| C: agent warehouse | Same permitted ordinary tools and the same frozen corpus exposed through warehouse search/get | B vs C: incremental value of agent-facing discovery and retrieval |

Do not handicap A by banning established libraries or making it build everything from scratch. B must receive all documentation available in C. C must not see later records or unrecorded hints. Record cross-condition contamination as a protocol deviation rather than concealing it.

The initial build pilot is read-only against the warehouse. Builders write outputs to isolated local directories. No public publication, wallet access, or paid services are required.

## Run controls

- Use the same model/revision, reasoning configuration, ordinary tool permissions, initial scaffold, and environment in all conditions. Record unavailable model metadata as unknown.
- Give builders only the task and their condition's tool instructions. They must discover relevant parts rather than receiving hand-selected IDs or a solution walkthrough.
- Use fresh sessions and workspaces. Builders and evaluators must not inherit prior implementation conversations or another condition's outputs.
- Freeze corpus records, source bytes, docs, and search configuration before starting. Record publisher/repo heads, record and source CIDs, checksums of exported files, and the embedding model/text-extraction configuration. A mutable live endpoint alone is not a reproducible fixture.
- Prepare each condition's dependencies without its builder's output code. Do not give control builders a checkout containing warehouse parts.
- Record the scaffold, runtime/browser versions, dependency lockfile, and network policy.
- Set the same maximum elapsed time and model/tool spending before runs. For the pilot, use a 60-minute cap; select and record the dollar/token cap before starting, based on the execution provider.
- Counterbalance condition order across repetitions. Use at least three fresh sessions per condition for an instrumentation pilot; that sample is not a defensible general productivity estimate.
- Record cold preparation and warm execution separately. Count one-time export/index/setup costs and state explicitly how they are amortized.

## What to record

Keep one run record plus the original trace, delivered files, and evaluation evidence.

```json
{
  "runId": "",
  "taskId": "scavenger-v1",
  "condition": "A|B|C",
  "status": "completed|budget-exhausted|failed",
  "model": {"provider": null, "revision": null, "reasoning": null},
  "fixture": {"manifest": null, "scaffoldCommit": null},
  "budget": {"elapsedMinutes": 60, "modelUsd": null, "tokenCap": null},
  "metrics": {
    "setupSeconds": null,
    "elapsedSeconds": null,
    "humanInterventionMinutes": null,
    "inputTokens": null,
    "cachedInputTokens": null,
    "outputTokens": null,
    "modelCostUsd": null,
    "externalToolCostUsd": null,
    "searchCalls": null,
    "retrievalCalls": null,
    "retrievedBytes": null,
    "repairAttempts": null
  },
  "reuse": [],
  "acceptance": {},
  "artifacts": {"output": null, "trace": null, "evaluation": null},
  "deviations": []
}
```

Null means unmeasured, not free. Reuse entries should identify source/version, what was used, discovery route, adaptation effort when observable, and failures. Record unsuccessful searches and rejected parts as well as successful reuse. Do not infer cost from a subscription's nominal monthly price; show metered costs where available and a separately labeled list-price equivalent otherwise.

## Reading results

Report acceptance rate and checks passed alongside elapsed time and cost. A cheap failed run is not a cheap completed task. Include all failed and capped runs, distinguish time-to-completion from time spent, and do not compare only the fastest successes.

Report per-condition totals, median, range, and individual run data. With small samples, descriptive results are preferable to confident percentage claims. Avoid blending human opportunity cost with cash expense: show actual spending and a separate sensitivity analysis for assumed labor rates.

The pilot also measures benchmark usability: trace completeness, evaluator consistency, corpus access parity, and failure causes. Change the protocol only between versioned rounds.

## Follow-up tasks

After the pilot, select holdout briefs before inspecting condition results:

- Modify an existing artifact under a new requirement, measuring adaptation and repair.
- Find a specialist asset or behavior, documenting false starts and compatibility checks.
- Reproduce a prior build from pinned dependencies after the source publisher updates it.
- Create a second independent application over the same publishers.

Include briefs poorly served by current inventory. A set chosen only because the warehouse already contains exact solutions overstates general value. This remains a workflow economics benchmark, not a game-model benchmark.

## Separate publication and operations experiment

Use identical source bytes and equivalent requirements for two implementations: conventional object storage + version manifest + update feed, and Fangorn + Westmarch. Both must expose the same consumer-facing records. Maintain one publisher/many records and many publishers cases, and one vs multiple consuming apps.

Measure bootstrap, one changed record, a batch of changes, a new publisher, restart recovery, and retrieval after an update. Track source/history/tree/CAR bytes, storage replicas, RPC requests, gateway requests, embeddings, index bytes, view publication, update latency, and operator time.

Report basic hosting separately from authenticated publisher ownership, independent version verification, and portability. If an equivalent-capability baseline needs extra implementation, count it explicitly; don't silently credit Fangorn with features the baseline never needed.

For chain fees, collect successful first/subsequent/direct/relayed commit receipts with realistic calldata and batch sizes. Estimate full mainnet fees, including L1 data fees, under stated prices. Sepolia ETH, free quotas, and treasury subsidy must not be labeled zero underlying cost.

Allocate expenses to publisher, app operator, and Fangorn LLC. Report both an individual's savings and total ecosystem costs. The planned public registry launch excludes future settlement and key-release economics.

## Commercial interpretation

The actionable result is the cost per accepted task and the work avoided, with warehouse delivery costs accounted for. This can support a pricing hypothesis. It does not by itself establish willingness to pay, customer acquisition costs, retention, or the profitability of Fangorn LLC.
