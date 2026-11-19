# checks

The warehouse's checks: what a part must pass to be indexed and served (and to be published through the warehouse).
Each is a `check` record in the warehouse's own repo, which the app's config references with its params, e.g.

```json
{ "check": "0x7b16387C5A8c514880E48bcacd52782FCF9Da936/internet-slop-warehouse/mime-allowlist", "with": { "allowed": ["image/png"] } }
```

A check is one ES module with no imports, exporting

```js
export function validate(record, { publisher, repo, file, params }) → true | "why not"
```

`record` is `{ id, type, cid, payload }`, `file` the bytes at `payload.src` (a game's `{ html }` as JSON, an asset's raw
bytes), `params` the rule's `with`. It runs in westmarch's validator Worker: no bindings, and no fetches (so anyone
rerunning the checks gets the same verdicts). `check.json` is its record's payload: title, description, and `params`,
the JSON Schema its `with` must match.

    npm test                                         the checks against their cases (checks/checks.test.js)
    node scripts/dry-run-checks.js                   every check over the live index: what it would refuse
    NETWORK=baseSepolia node scripts/publish-checks.js [id…]   publish them (bundle to storage, `check` record)
