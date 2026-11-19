# Cost and play-quality benchmark protocol

Score/protocol version: `warehouse-game-quality-v1-draft`, 2026-11-17. Freeze a numbered final version, task briefs, fixtures, scoring, and budgets before scored runs. The existing scavenger brief remains the simple control; do not discard its negative or inconclusive results.

## Questions and conditions

Measure two distinct outcomes: **how good a game each workflow produces at the same resource budget**, and **how much resource each workflow consumes before meeting a common acceptance target**. Wall time is secondary. Reuse, feature count, lines of code, file size, and number of tests are descriptive, not quality scores.

Use A ordinary tools/public sources, B the same ordinary tools plus frozen warehouse files/text search, and C the same ordinary tools plus frozen semantic search/get. Reuse is optional. A may use ordinary packages, asset libraries, documentation and public search; it is not forced to reinvent standard components. B/C receive the same corpus, docs and source versions. For the update challenge, all receive identical neutral starter/update bytes. Never give B/C handpicked part IDs or recipes. Freeze any allowed public source snapshots when practical and record unavailable parity.

Use fresh contexts and instruction-restricted workspaces, same model revision/reasoning configuration, equal ordinary tools, same machine/runtime class and validation policy. Expose all token-budget rules and functional criteria to every builder; keep evaluation scripts and raters' identities hidden. Do not supply condition-specific technical advice. Prepare persistent run directories and checkpoints before starting.

## Token and spending policy — provisional

The following quotas are a **calibration proposal, not approved scored-run settings**: 250,000 accounted model tokens and 25,000 generated/output tokens per challenge, with a 60-minute safety cap. Validate telemetry and run one non-scored calibration to ensure quotas permit a meaningful attempt, then freeze the exact quotas identically across arms. Do not launch a claimed fixed-token comparison if the harness cannot meter/enforce its budget.

Accounted tokens = provider-reported input + output across every model turn, retry, repair, and builder subcall. Report cached input separately; do not add cached input again if it is already included in input. Preserve raw provider events and semantics. Do not double-count reasoning if it is a subset of output; report a separate field only when the provider exposes one. Tool text re-entered into model context counts through provider input usage. Runtime code size or bytes retrieved cannot substitute for tokens.

If budgets can only stop between completed provider calls, declare the overshoot rule in advance and report actual usage plus limit. Cached and uncached tokens can have different prices: report token categories and actual attributable provider charges when available. Otherwise use a separately labeled price estimate with model, dated price table and computation; never call list-price estimates billed dollars. Subscription allocations and missing telemetry are not zero cost.

Separate builder-model cost, retrieval/query cost, artifact hosting/publishing, corpus/model/index setup, validation/reviewer-model cost, and human time. Show warm-service and cold/amortized scenarios. Include agent errors and unsuccessful discovery. Preserve raw events with precise run/agent identity; cumulative parent/session totals are not automatically per-builder usage.

## Functional evaluation and evidence

Predeclare the common task checklist and a reproducible evaluator/browser procedure. Score required checks as pass, fail, or unverified, recording source, simulation, actual browser, and human-play evidence separately. Do not pool these evidence levels into a false browser-pass rate.

Critical blockers include failure to load/start, a softlock preventing normal completion, inaccessible required controls, unrecoverable/corrupt state, or failure of a required migration/reproduction path. Other defects remain explicit. A builder's own test suite is useful evidence but not the acceptance authority. Evaluate final artifacts unmodified; any repair creates a new version and incurs further budget.

If actual browser play is unavailable, retain engineering findings but do not claim play-quality scores, complete acceptance, or dollar cost per accepted game. The human comparison page can collect observations on supported devices. Make failures rateable rather than omitting broken submissions.

## Human rating card

Show neutral randomized version labels. Hide condition, reuse, time and cost until ratings are saved; embedded credits may reveal origin, so record masking limits. Use equal viewport/audio settings and randomized/counterbalanced play order. Prefer at least three independent raters; the founder's ratings are valuable but not a population estimate. Give each artifact the same eight-minute play window, with a short optional replay of equal duration. Record completion, crashes, confusion, interruptions and actual minutes played.

Rate each dimension 1–5 with an evidence note; “not played/unrateable” is not a neutral 3:

| Dimension | Question | Anchor 1 | Anchor 3 | Anchor 5 |
| --- | --- | --- | --- | --- |
| Control feel | Did movement, camera and actions respond as expected? | Consistently obstructive | Usable with noticeable friction | Precise, comfortable and dependable |
| Clarity | Did you understand goals, state, consequences and next actions? | Repeatedly lost or misled | Understandable after exploration | Clear without becoming intrusive |
| Coherence | Did mechanics, visuals, sound and feedback work together? | Conflicting or unfinished | Mostly consistent | Deliberate, integrated and convincing |
| Engagement | Did the decisions and progression hold your attention? | No meaningful engagement | Some worthwhile moments | Sustained interest and satisfying decisions |
| Enjoyment/replay | Did you enjoy it and want another attempt? | Wanted to stop | Worth one play | Would choose to play again |

Ask separately: “Which version would you choose to keep playing, and why?” Allow tie/none. Also ask whether one output felt materially simpler or less complete, with a specific example; do not assume a larger/3D artifact is better. The prior control is not penalized for meeting a smaller brief.

The primary human outcome is the equally weighted mean of the five dimensions per rater, reported alongside every dimension, individual ratings, pairwise preference and functional coverage. Do not blend functional tests, token cost and subjective quality into one opaque score. A beautiful incomplete game remains visibly incomplete.

## Fixed-budget and cost-to-acceptance tracks

**Fixed-budget track:** stop each fresh run at the same frozen quotas. Archive its artifact, even if broken or incomplete. Compare functional coverage and human ratings at actual usage; disclose underspending and overshoot. A builder ending early may submit early; it must not receive a hidden follow-up prompt available only to that arm.

**Cost-to-acceptance track:** checkpoint at equal token increments (provisional 50,000 accounted tokens) and evaluate against the same functional gate. Optional repair feedback uses one standardized defect-only template, counts toward tokens, and is available to every arm. Report the earliest accepted checkpoint and all preceding cost; unfinished runs are censored failures, not cheap successes. A provisional quality target is mean human rating at least 3.5/5 with all required functional checks passing and no critical blocker. Freeze that threshold before scoring; it is not established by these drafts. Report functional acceptance and quality-target acceptance separately.

Use a maximum of two fixed-budget tranches for this track only if declared before launch; never let one condition continue indefinitely until it wins. Pair quality with cost or display a cost–quality frontier. Avoid quality/token ratios: a trivial very cheap artifact can dominate such a ratio while failing the product goal.

## Repetition and reporting

After calibration, run at least three independent fresh sessions per condition per challenge as an exploratory minimum, counterbalancing task/condition order. More repeats may be needed for stable effects; do not claim statistical significance from a small sample. Keep one simple control, these two challenges, and predeclared poorly served/holdout cases. Never select only warehouse-friendly tasks after inspecting results.

Publish raw run usage, all artifacts, checklists, ratings, failures, deviations, and setup assumptions. Show distributions/individual points rather than only the best example. Separate “warehouse discovery/reuse worked” from “a quality or economic advantage was demonstrated.” These challenges test creation and maintenance workflows, not protocol fees, data-commerce demand, or company profitability.
