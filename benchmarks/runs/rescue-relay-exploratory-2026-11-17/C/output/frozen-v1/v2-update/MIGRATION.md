# Dependency update 2.0.0

Every condition receives the exact same update bytes and this note. This is an original benchmark dependency, not a warehouse-only component.

## Breaking interface change

Replace `move(state, dx, dy, dtSeconds)` with:

```js
const { distance, clamped } = RescueRelay.advance(state, { x: dx, y: dy }, dtSeconds);
```

`move` no longer exists. Other core exports, coordinates, collision geometry, objective activation, v1 save format, and the meanings of old state fields remain unchanged. Do not load v2 directly into the untouched v1 page; it calls the removed interface. Adapt the page when applying the update. Preserve v1 separately for reproduction.

## Behavior improvement

V1 discards frame time beyond 50ms, causing movement to slow during frame gaps. V2 accepts up to 250ms and integrates it in steps of at most 25ms. The same travel distance is preserved during ordinary 50–250ms lag without jumping through obstacles. Time above 250ms is deliberately discarded; `clamped` reports that condition. `distance` reports actual displacement, not attempted travel.

Input direction is normalized, completed runs remain stationary, and collisions use the same radius. Callers still own pause, input capture, UI, and scene rendering.

## Save migration expectations

All three supplied RR1 saves load unchanged in v2. Challenge extensions must preserve their activated towers and player positions. New repair/component state should initialize consistently with towers already activated: a v1 active tower must become repaired, its unique component must not respawn for collection, and a completed baseline must not be silently erased. The extended rescue mission may still require locating/escorting the surveyor; communicate this new objective. Define and test that declared extension policy equally across all arms.
