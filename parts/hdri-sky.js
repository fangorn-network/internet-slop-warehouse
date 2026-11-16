// An HDRI (.hdr) as the scene's sky and its image-based light, optionally slowly turning.
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

export function attach(scene, { url, background = true, blur = 0, intensity = 1, spin = 0, onLoad = () => {} } = {}) {
    let tex = null, dead = false;
    new RGBELoader().loadAsync(url).then((t) => {
        if (dead) return t.dispose();
        t.mapping = THREE.EquirectangularReflectionMapping; tex = t;
        scene.environment = t; scene.environmentIntensity = intensity;
        if (background) { scene.background = t; scene.backgroundBlurriness = blur; scene.backgroundIntensity = intensity; }
        onLoad(t);
    });
    return {
        get texture() { return tex; },
        update(dt) { if (spin) { scene.backgroundRotation.y += spin * dt; scene.environmentRotation.y += spin * dt; } },
        dispose() { dead = true; if (tex) { if (scene.environment === tex) scene.environment = null; if (scene.background === tex) scene.background = null; tex.dispose(); } },
    };
}
