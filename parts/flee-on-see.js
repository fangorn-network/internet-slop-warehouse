// A drop-in for patrol's onSee: run directly away from the target instead of chasing it.
import * as THREE from "three";

export function onSee(self, target) {
    return new THREE.Vector3().subVectors(self.position, target.position).setY(0).normalize();
}
