Build **Lantern Courier**, a small complete browser game about delivering supplies to a storm-darkened settlement. A new player should understand it without reading external documentation, complete an initial route in roughly 3–5 minutes, and have a reason to try again.

Use a **3D third-person view** with a bounded, deliberately authored route, visible depth/occlusion, and a following camera. Three.js or another ordinary browser library is allowed; no specific engine, warehouse component, asset, or art style is required. Procedural art and public reusable assets are equally acceptable. Deliver static files, with keyboard and touch play, no sign-in or backend, and no runtime dependence on paid services.

Required behavior:

1. There are three distinguishable supply parcels and three distinguishable destinations. Carry at most one parcel; deliver it only to its matching destination. Destinations indicate what they need and whether delivery is complete.
2. At least one shortcut creates a meaningful choice between a safer longer route and a shorter hazardous route. The player can see or learn the risk before committing.
3. Two moving storm hazards interfere with travel. Contact produces clear feedback and returns the player to the most recent safe checkpoint, while keeping completed deliveries. Prevent repeated damage/recall every frame.
4. A lantern ability briefly protects the player from hazards. It has a visible cooldown, rejects unavailable activation, and has equivalent keyboard/touch controls. It cannot be permanently held to bypass its cooldown.
5. Movement, camera, collisions, carrying, delivery, hazard response, and ability interact consistently. Parcels and destinations are reachable; leaving the route cannot bypass the delivery rules or strand the player.
6. Show the next useful action, carried parcel, delivery progress, and ability availability in play. Include concise in-game controls, pause/resume, mute, and a full restart. Clear held input on blur, hidden page, pointer cancellation, and restart.
7. After all deliveries, show a finish screen with time and hazard recalls. A second attempt must reset the complete run. Do not demand a particular difficulty or make completion depend on precision mobile inputs.
8. Audio, if implemented, starts only after a gesture and has a mute control. Audio failure must not prevent starting or moving. Include feedback that remains understandable with sound off.

Make the movement satisfying, route readable, feedback coherent, and the world feel like a finished small experience. More objects, mechanics, code, or visual effects do not earn points by themselves. Extra content is optional and must not compromise the required loop.

Deliver `index.html`, all needed source/assets, static-server launch instructions, dependency/license/source notes with exact reused versions where available, and an append-only implementation log. Include meaningful tests and a short list of remaining limitations. Do not publish publicly or purchase services/assets. Reuse is optional.


## Common run rules
Exploratory fixed-spec build, not a hard-token-budget experiment. Safety time cap 60 minutes. Soft targets: at most 25,000 output tokens and $0.75 Standard API-equivalent model use; these are observed externally and may overshoot an in-flight call. No paid services or public publication. Finish a coherent result rather than padding time/features. The supplied Three.js 0.170.0 module and license are identical in all conditions; use it locally if useful. It is a normal shared library allowance, not warehouse-only source. Do not read the minified library into model context; use its public API knowledge/docs. Browser and localhost sockets are known unavailable: do not retry installs/launches. Write an append-only output/RUN-LOG.md starting immediately with UTC time and preserve checkpoints. Put code/tests/docs under output/ and update the common result.json at condition root. Record actual facts, leave unavailable tokens/cost null; parent collects exact model telemetry independently.
