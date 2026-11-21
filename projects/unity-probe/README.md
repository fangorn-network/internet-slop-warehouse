# Signal Sweep and Warehouse game dependencies

Signal Sweep is a small Unity probe. Move with WASD or the arrow keys, collect five signals, and press R to reset. It uses generated primitive geometry and has no art or package dependencies beyond Unity itself.

## Run and export

1. Create a scratch Unity 6 project using the built-in 3D renderer. Install Web Build Support for that Editor. Copy this directory's `Assets` into the project. Set Active Input Handling to **Input Manager (Old)** or **Both**.
2. In the scratch project, select **Warehouse → Generate Signal Sweep Scene**, then press Play. The menu rewrites the generated scene at `Assets/SignalSweep.unity`.
3. Select Web as the active build platform. Use a single-threaded release build and disable compression and data caching for the initial compatibility check. Select **Warehouse → Build Signal Sweep for Web**. Test the exported `Builds/SignalSweep` with Unity's build-and-run workflow or static hosting configured for its output. Serve Wasm with `application/wasm`. Measure total transfer and time to first input before choosing compression. [Unity Web deployment](https://docs.unity3d.com/cn/6000.0/Manual/webgl-deploying.html)

This is source ready for a scratch Editor project. Unity Editor and Web Build Support are unavailable in the current workspace. Compilation, export, browser playback, and startup measurements are pending.

## Game-to-game references

A game already records a pinned remix `parent` or pinned `uses` credits. The links in the player navigate to current indexed records. The player boots a single HTML document, and only its public GLB slots currently resolve versions for runtime composition.

| Use case | Recommended behavior |
|---|---|
| Launch another game or build a playlist | Resolve the target publisher, repo and game ID at launch. Let a link choose a pinned version or the latest accepted head. Use existing routes and player lifecycle. Record the exact CID opened. |
| Build a remix on another full game | Preserve the pinned parent for provenance. Promote a parent update only after the remix builds and passes its own compatibility checks. |
| Reuse a level or world inside a game | Have the owner publish an explicit versioned data export. Let games follow an opted-in compatible channel, with a known-good CID and session lock. Keep executable game code pinned until the consumer approves an update. |

The Warehouse implements **linked launch** first. Publish ordinary games with an optional Warehouse payload field specifying target identity, policy, and pinned fallback. The player resolves against the shared catalog snapshot. Historical release reads use the supplied immutable file CID. Resolve once per launch, close the previous game, and use the target game's own storage scope. A link to a paid game uses the target's entitlement. A paid game that includes another game's world instead needs a commercial grant, a frozen payout allocation, and compatible transitive rights. Add release promotion, rollback and cycle handling when introducing composition.

## Unity versus Three.js

| | Warehouse HTML / Three.js | Unity Web |
|---|---|---|
| Build | Game JavaScript and HTML, usually with a small external asset set | Editor project with C# scripts and scenes, exported to JavaScript loader/runtime, Wasm, and data files |
| Agent workflow | Edit source and use existing MCP publication directly | Edit C# and project assets, build with Unity on a licensed machine or runner, then publish the artifact manifest |
| Reuse | Read resolved GLB and data URLs in JavaScript | Add a Unity runtime importer or consume a shared data schema. A Unity scene inside the compiled build is ordinarily part of that build's release. |
| Saves | Existing sandboxed localStorage bridge | Start with an explicit Unity Web JavaScript interop adapter for saves. Test persistence in the Warehouse iframe before promising support for PlayerPrefs or IndexedDB. |

The same modal can host both formats. For the pilot, wrap the exported loader in the normal Warehouse game HTML and point it at the exact build files on a compatible static host. Keep the files in an immutable release directory and test cross-origin requests from the sandbox. The MCP publish file limit is 5 MB decoded today. Publish a compact entrypoint or manifest there and upload the bulk artifacts separately. Keep the standard MCP API.

Once the exported probe starts successfully in the sandbox, test restart and close, desktop keyboard focus and fullscreen, mobile behavior, then explicitly bridge saves and a single externally loaded data slot. Use those results to decide whether to add first-class build packaging. [Westmarch publish spec](../../../westmarch/worker/API.md) · [Warehouse player](../../site/index.html) · [Licensed parts plan](../../LICENSING-PLAN.md)

## Publish to the Warehouse player

For a single-threaded, uncompressed public build, upload the loader JavaScript, framework JavaScript, Wasm, and data as four immutable files. The configured gateway must serve them to the sandbox with CORS. Serve the JavaScript files with a JavaScript MIME type and Wasm as `application/wasm`. Publish a regular `game` through MCP with `payload.runtime: "unity-web"` and the following `file.json`. Replace each placeholder with the file CID.

```json
{
  "unityWeb": {
    "version": 1,
    "loader": "<loader file CID>",
    "framework": "<framework file CID>",
    "wasm": "<wasm file CID>",
    "data": "<data file CID>"
  }
}
```

The Warehouse builds the canvas and calls the exported loader inside its existing sandbox. It does not compile Unity projects. The same catalog can carry C# source and Unity-specific skills as existing source and skill types. C# gameplay logic belongs in an exported game build. The current JavaScript logic viewer and runtime module interface cannot execute it directly.

For a game launch link, put a `gameLinks` array in the source game's payload. Each entry uses `name`, `label`, `publisher`, `repo`, `id`, `mode` (`pin` or `follow`), and `baseline: { cid, src }` (target record and entrypoint CIDs). Leave `gameLinks` outside the MCP `pin` array. Links appear in Parts & Credits. Follow resolves against the latest accepted catalog snapshot. If a current public game is absent, the declared snapshot is isolated from the target's normal saves. The pinned selection uses a catalog-verified target when its CID matches the baseline, and is otherwise presented as a linked snapshot. Share URLs identify the source record and named link. The current source record must still contain that link. Paid targets require their own access flow.
