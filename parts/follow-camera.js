// A camera that trails the target at an offset, easing toward it, always looking at it.
import * as THREE from "three";

export function attach(camera, { target, offset = [0, 4, 7], lag = 5, lookAbove = 1 } = {}) {
    const off = new THREE.Vector3(...offset), want = new THREE.Vector3(), look = new THREE.Vector3();
    camera.position.copy(target.position).add(off);
    return {
        update(dt) {
            want.copy(target.position).add(off);
            camera.position.lerp(want, 1 - Math.exp(-lag * dt));
            camera.lookAt(look.copy(target.position).setY(target.position.y + lookAbove));
        },
        dispose() {},
    };
}
