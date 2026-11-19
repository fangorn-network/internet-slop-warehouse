# Builder token telemetry

Investigated 2026-11-17. No paid model tasks were launched. Existing benchmark evidence and artifacts were not modified.

## Recovered pilot usage

The recovery builders' token usage **is recoverable** from their separate persisted Codex rollout files. `recovery-2026-11-17.json` contains sanitized counts, source file hashes, line references, exact child/parent/session/turn linkage, timestamps and per-event usage snapshots. No prompts, tool arguments, raw transcripts, account IDs or credentials are exported.

| Condition | Input, including cache reads | Cached input | Uncached input | Output, including reasoning | Reasoning subset | Total input + output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 144,707 | 125,952 | 18,755 | 7,153 | 214 | 151,860 |
| B | 392,060 | 372,864 | 19,196 | 11,672 | 482 | 403,732 |
| C-semantic-local | 241,209 | 218,112 | 23,097 | 9,865 | 357 | 251,074 |

All three are `gpt-6.1-sol`, provider `openai`, reasoning effort `low`, with a single fresh turn each. The metadata identifies `/root/recovery_a`, `/root/recovery_b`, `/root/recovery_c`, the expected parent session, and unique child session IDs. Seven, thirteen, and nine usage events respectively were found. For each, the first cumulative total equals the first request's usage, cumulative totals are monotone, and the sum of last-request usage equals the final cumulative total. Final usage precedes the corresponding task completion. This makes these own-child counts suitable for the recovered builds; they are not parent or reviewer totals.

Cached input is a subset of input; do not add it to total input. Every recovered event says `last_usage_includes_reasoning=true`, and total equals input plus output. Reasoning is a subset of output here; do not add it a second time. Total input includes repeated context presented across model requests, not unique source-text length.

The scope includes the builder's own task, tools/context, test-writing and final response. It excludes parent orchestration, independent review, local embedding preparation, shell CPU, storage and hosting. One cannot infer game quality or useful production code quantity from token counts alone.

## Dollars

The official pricing page explicitly lists the exact model `gpt-6.1-sol`. On 2026-11-17, Standard short-context rates were $2.00 uncached input, $0.10 cached input and $10.00 output per million tokens. Each individual request in these builds was below 272K input tokens; no cache-write tokens were recorded. [Official pricing](https://developers.openai.com/api/docs/pricing)

Under that **explicit comparison assumption**, API-equivalent amounts are:

- A: **$0.1216352**
- B: **$0.1923984**
- C-semantic-local: **$0.1666552**

Formula: `((input-cached)*2 + cached*0.10 + output*10) / 1,000,000`.

These are not actual account charges. Local authentication mode is ChatGPT; selected contexts do not establish the actual service tier or subscription accounting. API list prices are a normalized comparison unit only. Actual billed dollars remain null. Other tiers, regional processing, tool charges, subscription allocations and infrastructure costs must be accounted for separately. A single small trial does not establish a general cost effect.

## Timing reconciliation

| Condition | Builder-reported elapsed | First outer tool call to task completion | Task-start event to completion | Opaque recorded `duration_ms` |
| --- | ---: | ---: | ---: | ---: |
| A | 142.83 s | 156.482 s | 160.571 s | 149,693 |
| B | 262 s | 268.471 s | 272.792 s | 255,679 |
| C | 215.731 s | 225.290 s | 230.060 s | 215,174 |

These scopes differ. Builder self-timing begins inside tool execution and ends before its final response; outer tool timestamps also include dispatch/response overhead. The recorded duration field is preserved without assuming it equals wallclock. Future manifests should declare one timing boundary and capture it externally.

## Repeatable collection

`collect-rollouts.py` only reads explicitly named child sessions. It verifies child/parent lineage, one finalized fresh turn, observed zero-origin cumulative usage and monotonicity, and exports whitelisted metadata. It refuses ambiguous duplicate files and output overwrites. The supplied manifest links the recovered sessions. A second collector output was generated and checked against the recovered counts.

```sh
python3 benchmarks/telemetry/collect-rollouts.py \
  benchmarks/telemetry/recovery-manifest.json \
  /path/to/NEW_usage_export.json
```

For each future builder, record the exact agent path, child session UUID, parent UUID, run ID, task ID, condition, model, effort, service tier if available, and start/end boundaries. Never attribute a parent session's cumulative count to a child. Use fresh builder sessions without inherited conversation history. Preserve metadata-only usage checkpoints in the workspace while work proceeds, rather than depending on temporary directories or final self-reports.

For a long-running or resumed builder, snapshot the child's cumulative baseline before work and compute deltas on the same session/usage segment, checking for resets or model changes. Do not sum every cumulative `total_token_usage` event. Duplicate events can repeat `last_token_usage`; summing last usage is a consistency test here, not a universally safe primary collector. The final cumulative total or an explicitly bounded cumulative delta is primary.

## CLI alternative

Installed CLI: `codex-cli 0.169.0`. Local `codex exec --help` confirms `--json`, `--cd`, `--output-last-message`, config/profile options and `--ephemeral`. Official non-interactive documentation shows a JSONL stream with `thread.started`, `turn.started`, `turn.completed` and usage containing input, cached input, output and reasoning. The official event schema also includes cache-write input. [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [event schema](https://github.com/openai/codex/blob/main/codex-rs/exec/src/exec_events.rs)

A future headless harness can capture stdout JSONL and stderr separately and use `thread.started` as an exact session link. `-o` writes only the final message; it is not usage telemetry. Do not use `--ephemeral` if rollout recovery is required. Explicitly freeze the approved configuration across conditions: launching the CLI does not prove it inherits this app's model. The current base config does not declare model/effort; observed builder settings came from app session context. Config/profile hashes should be recorded, but credentials must remain outside artifacts. CLI persistent state may need a writable configured location in this sandbox; help emitted a read-only PATH-alias warning. No authenticated CLI inference call was made, so network/auth/write feasibility for full exec is not validated.

Prefer the already-supported collaboration agents plus exact rollout collection for the next round. It recovers provider-reported usage without changing the builder execution surface. For hard token limits, inspect usage at request boundaries where possible; a polling observer and interrupt only enforce a soft cap and can overshoot by an in-flight request. Label that distinction. A strict dollar budget requires a provider-side/harness admission limit, an identified billing tier and explicit tool/infrastructure accounting.

## Recommended scorecard

Keep functional coverage and blind play-quality ratings separate from token/cost metrics. Report a quality-versus-API-equivalent-cost curve or the cost to reach a declared quality threshold, rather than a combined opaque score. Preserve gross input, cached/uncached split, output and reasoning, repeated contexts, cold/warm infrastructure costs and failed attempts. Retrieving source can increase input while improving the final game; the experiment should be able to observe that tradeoff.
