# Condition C-semantic-local
Use ordinary coding tools, docs, packages and public sources plus this frozen warehouse search/get interface. You may read documentation/ (the same frozen docs available to the static-catalog condition). Do not inspect the warehouse checkout, fixture, other conditions, or cache files. You may execute the exact adapter below, but do not inspect its implementation. Do not use live warehouse search or newer records.

BENCH_MODEL_ROOT=/home/driemworks/fangorn/internet-slop-warehouse/benchmarks/cache/models BENCH_MODEL_REVISION=5090578d9565bb06545b4552f76e6bc2c93e4a66 BENCH_VECTOR_CACHE=/home/driemworks/fangorn/internet-slop-warehouse/benchmarks/cache/vectors-pilot-02-q8.json node /home/driemworks/fangorn/internet-slop-warehouse/benchmarks/frozen-mcp.mjs /home/driemworks/fangorn/internet-slop-warehouse/benchmarks/fixtures/2026-11-16-pilot-02 semantic /home/driemworks/fangorn/internet-slop-warehouse/benchmarks/runs/rescue-relay-exploratory-2026-11-17/C/adapter-metrics.jsonl

Send JSON lines on stdin, for example:
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search","arguments":{"query":"YOUR QUERY","k":5}}}
Search accepts optional type and k (1..30). Results contain publisher and id. Retrieve with:
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get","arguments":{"publisher":"PUBLISHER FROM SEARCH","id":"ID FROM SEARCH"}}}
Get returns saved file source or a version-pinned asset URL. You may start a new process for each query; metrics append automatically. Text sources are frozen; binary assets are pinned network references, not fully cached. Record retrieval failures. Save any returned source you use and retain publisher/source/version/license information.

Search uses local EmbeddingGemma q8 semantic vectors and CPU query embedding, not the production hosted runtime or hybrid ranker. The task is unchanged; reuse is optional. Browser and loopback sockets are known unavailable in this sandbox. Do not spend effort retrying browser installs; use meaningful feasible checks and record real browser behavior as unverified.

