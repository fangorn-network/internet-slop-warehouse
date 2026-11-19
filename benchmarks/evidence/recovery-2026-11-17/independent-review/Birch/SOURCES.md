# Reused sources and provenance

## Collectibles rule

- Author: the internet slop warehouse
- Publisher: `0x7b16387c5a8c514880e48bcacd52782fcf9da936`
- Repository: `internet-slop-warehouse`
- Item: `collect`; type: `logic`
- Frozen record CID / version: `bafyreiboqbeceozw5nalignugur2crrjpdcywg7jhpcekgt4wx5bwk7yni`
- Source CID: `bafkreiant6lyf5xsnypb32bv6wz4e3bfkcww2ozbw4jbbjkmkjysdx2tui`
- Fixture root: `bafyreibycvekyxezblss7g2mn3jbutgwbb6frhiic265bz63ijkcmu4uc4`
- License: CC0-1.0, as declared in frozen metadata; https://creativecommons.org/publicdomain/zero/1.0/
- Retained source: `vendor/collect.mjs`; complete metadata/source response: `vendor/collect.metadata.json` and `get-response.jsonl`.
- Modifications: none to the collection module. Transport-escaped newlines were decoded into source line breaks.
- Integration: `game.mjs` supplies plain objects with `position`/`rotation` properties and maps screen y to position.z. Bob and spin are disabled; pickup radius is 30 screen units. `onCollect` marks relics taken and increments inventory. `onAll` opens the gate. This uses the original module's Set-based collect-once behavior.

Discovery used one semantic search and one get request through the exact frozen read-only adapter. Search was warmed local EmbeddingGemma-300m q8 (256 dimensions), revision `5090578d9565bb06545b4552f76e6bc2c93e4a66`; this is not the hosted production runtime. Search/get responses are retained. No retrieval failures occurred. Other returned games were not retrieved or reused.

## Original work

`index.html`, `style.css`, `app.mjs`, `game.mjs`, and `test.mjs`: authored for this task, CC0-1.0. Procedural scenery, relic symbols, avatar, collision map, synthesized sound, UI and state management are original. No external artwork, fonts, audio recordings, packages or code sources were used.
