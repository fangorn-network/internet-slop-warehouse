// SPDX-License-Identifier: CC0-1.0
// zone-culling: draw only what can be seen from where the camera stands. three.js frustum-culls but never
// occlusion-culls, so from inside one room it still draws every other room behind the walls. Give it the level's
// zones (boxes) and which zones each one can see; it buckets the scene's top-level objects by zone and hides the
// rest. The cheapest big win for indoor and multi-level games on phones.
//
// Bucketing: an object belongs to the smallest zone whose box, shrunk by `margin`, holds its whole bounding box.
// A group that crosses a border is split: its children are bucketed one by one. A mesh that crosses one (walls,
// floors, a building's shell), or lies in no zone but touches one, is always drawn. Anything outside every zone is in "outside". Things that move between zones (skinned
// characters, `userData.loose` props, `userData.moves`) are always drawn, unless `userData.zone` names a zone,
// which beats the box (an InstancedMesh's box spans every instance, so say where it stands), as are lights: hiding a light changes the
// light count and recompiles every shader. Hiding is by render layers, so `visible` stays the game's own: hidden
// objects also drop out of raycasts (Raycaster tests layers), which only matters for zones you can't see.
// ponytail: buckets top-level objects once, when they arrive; an object that moves later without a flag stays in
// its first bucket. refresh(obj) re-buckets one.
import { Box3 } from "three";

const volume = (z) => (z.x1 - z.x0) * (z.y1 - z.y0) * (z.z1 - z.z0);
const keyOf = (z) => z.id ?? z.name;
const holds = (z, p, m = 0) => p.x >= z.x0 + m && p.x <= z.x1 - m && p.y >= z.y0 + m && p.y <= z.y1 - m && p.z >= z.z0 + m && p.z <= z.z1 - m;
const touches = (z, b) => b.max.x > z.x0 && b.min.x < z.x1 && b.max.y > z.y0 && b.min.y < z.y1 && b.max.z > z.z0 && b.min.z < z.z1;

/**
 * attach(scene, { zones, sees, margin }) → { update(eye), refresh(obj), zoneAt(eye), stats() }
 * zones: [{ name | id, x0, x1, y0, y1, z0, z1 }]: boxes; overlapping is fine, the smallest wins.
 * sees: { [zone]: [zones visible from it] }; "outside" is the name for no zone. A zone missing from `sees` sees everything.
 * update(eye): call each frame (or a few times a second) with the camera's position.
 */
export function attach(scene, { zones, sees, margin = 0.25 }) {
    const bySize = [...zones].sort((a, b) => volume(a) - volume(b));
    const bucket = new Map(); // object → zone key, "outside", or null (always drawn)
    const box = new Box3();
    const zoneAt = (p) => { const z = bySize.find((z) => holds(z, p)); return z ? keyOf(z) : "outside"; };

    function place(obj) {
        let moves = !!(obj.userData.loose || obj.userData.moves), light = false;
        obj.traverse((o) => { if (o.isLight) light = true; if (o.isSkinnedMesh) moves = true; });
        if (typeof obj.userData.zone === "string") return bucket.set(obj, obj.userData.zone);
        if (moves) return bucket.set(obj, null);
        box.setFromObject(obj);
        const z = box.isEmpty() ? null : bySize.find((z) => holds(z, box.min, margin) && holds(z, box.max, margin));
        const k = box.isEmpty() ? null : z ? keyOf(z) : zones.some((z) => touches(z, box)) ? null : "outside";
        if (k !== null && !light) return bucket.set(obj, k);
        if (obj.children.length && !obj.isMesh) { bucket.set(obj, null); for (const c of obj.children) place(c); return; } // split it
        bucket.set(obj, null);
    }
    const refresh = (obj) => place(obj);
    // Hidden through render layers, never `visible`: the game keeps full control of what it shows and hides (a
    // breakfast bar at dawn, a note under the door), and a camera on layer 0 just doesn't draw what's in no layer.
    // Walks the subtree each time, so children that arrive later (streamed models) hide with their parent.
    function hide(obj, off) {
        obj.userData.zoneHidden = off;
        obj.traverse((o) => {
            if (off && o.userData.zoneMask === undefined) { o.userData.zoneMask = o.layers.mask; o.layers.mask = 0; }
            else if (!off && o.userData.zoneMask !== undefined) { o.layers.mask = o.userData.zoneMask; delete o.userData.zoneMask; }
        });
    }

    let seen = null, last = -1;
    function update(eye) {
        if (scene.children.length !== last) { // new arrivals (streamed models): bucket them
            last = scene.children.length;
            for (const o of scene.children) if (!bucket.has(o)) refresh(o);
            seen = null;
        }
        const here = zoneAt(eye);
        if (seen?.here === here) return here;
        const visible = sees[here] ? new Set([here, ...sees[here]]) : null;
        seen = { here };
        for (const [o, k] of bucket) if (k !== null) hide(o, !!visible && !visible.has(k));
        return here;
    }
    function stats() {
        const n = {};
        for (const k of bucket.values()) n[k ?? "always"] = (n[k ?? "always"] ?? 0) + 1;
        return n;
    }
    return { update, refresh, zoneAt, stats };
}
