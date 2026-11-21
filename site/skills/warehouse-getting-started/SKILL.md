---
name: warehouse-getting-started
description: Publish or update a game in the Internet Slop Warehouse through MCP. Use for a first HTML or Three.js game, a remix, or an existing Unity Web export.
---

# Publish a game to the Warehouse

## Publish HTML

A playable HTML file is the complete default workflow. Open it in a browser, check that the main interaction works and asset URLs load, then call the Warehouse MCP `publish` tool. If the tool isn't connected, use the command in the Warehouse Loading Dock. Follow the app's connect flow for a publish grant.

Send the full HTML string in `file.json.html`. A minimal request looks like this.

```json
{
  "record": {
    "id": "signal-sweep",
    "type": "game",
    "payload": {
      "title": "Signal Sweep",
      "description": "Recover five signals. Move with WASD.",
      "tags": ["arcade"]
    }
  },
  "file": {
    "json": {
      "html": "<!doctype html><html>…</html>"
    }
  }
}
```

Use a short lowercase ID with hyphens. To update a game in the same publisher's repo, reuse its ID. Use a new ID for a separate game. The tool returns the published record CID. Open the game when the catalog picks it up, and report the result. A publish tool success and a browser playtest are separate checks.

In a local Warehouse checkout, the existing wallet-based shortcut is `NETWORK=baseSepolia node publish.js path/to/game.html`. Keep using that if it's already the user's workflow.

## Add detail when the game needs it

- **Give credit.** For a remix add `record.payload.parent`. For included parts add `record.payload.uses`. Refs are `{ "publisher": "0x…", "repo": "internet-slop-warehouse", "id": "part-id" }`. Set the top-level `pin` to the fields you used, such as `["parent", "uses"]`, to pin their current versions. If the game was built against an older version, include that ref's exact CID and omit that field from `pin` so it stays pinned to the tested release.
- **Store progress.** The Warehouse player supports `localStorage.getItem`, `setItem`, and `removeItem` for game saves. Saves stay in the current browser and survive updates to the same game ID. Fetch external assets from storage that allows cross-origin requests from the sandbox.
- **Link another game.** For a player-facing launch, add `payload.gameLinks` with an entry containing `name`, `label`, `publisher`, `repo`, `id`, `mode` (`pin` or `follow`), and `baseline: { cid, src }`. Use MCP `get` to find the target's public record CID and entrypoint file CID. Keep `gameLinks` out of `pin`. The link appears in Parts & Credits. Use `parent` as well if the game is a remix.
- **Publish a Unity Web export.** Use this only for a game already built in Unity. Export and test a single-threaded, uncompressed Web build. Upload the loader JavaScript, framework JavaScript, Wasm, and data files to immutable storage served by the Warehouse gateway with CORS and the appropriate MIME types. Set `payload.runtime` to `"unity-web"`. In the same MCP request shape, replace `file.json` with `{ "unityWeb": { "version": 1, "loader": "<cid>", "framework": "<cid>", "wasm": "<cid>", "data": "<cid>" } }`. These are file CIDs. The editor project and bulk build files stay out of the MCP request, which accepts at most 5 MB of decoded file data. Verify the exported build in the Warehouse player before claiming it works there.
