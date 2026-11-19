# Challenge 01 — Lantern Courier

Brief version: `lantern-courier-v1`. Draft for pre-registration; do not score runs until the shared token meter and browser evaluator are validated.

## Exact builder brief

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

## Common acceptance checklist

The same evaluator must apply this to every condition, independently of builder tests.

- At 1280×800 and 390×844, load from static hosting with no fatal error, blocked required dependency, clipped essential control, or required external account.
- First-time player can identify a parcel, its destination, and the ability without external explanation. Record the player's understanding; this is not established from source alone.
- Complete three matching deliveries through ordinary movement. Reject wrong destinations and more than one carried parcel; repeating input cannot duplicate a delivery.
- Reach every parcel/destination/checkpoint without debug commands. Verify hazard risk and both routes are real, not decorative labels.
- Contact a hazard: one clear recall per grace interval, completed deliveries preserved, ability status consistent, no softlock or unrecoverable parcel loss.
- Activate protection, reject activation during cooldown, demonstrate that protection ends and the cooldown recovers.
- Test pause/resume, restart before and after victory, blur/visibility loss, keyboard aliases, simultaneous touch ownership, pointer cancellation, and muted/audio-failure paths.
- Finish and repeat a full run. Record any blocker, misleading state, broken camera, or consistently unresponsive controls.
- Retain functional evidence separately from human play ratings in the common protocol.

## Optional, unscored extras

Weather styling, secondary animation, additional scenery, local best time, and alternative camera options are optional. Reviewers judge how well choices serve the experience, not whether these extras exist.
