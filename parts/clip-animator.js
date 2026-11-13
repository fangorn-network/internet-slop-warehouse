// Play a model's animation clips by state name, crossfading: wire `state` to a controller's state.
import * as THREE from "three";

export function attach(model, {
    animations = [], state = () => "idle", fade = 0.2,
    clips = { idle: "Idle", walk: "Walking", run: "Running", jump: "Jump" },
} = {}) {
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(Object.entries(clips).map(([s, name]) => {
        const clip = THREE.AnimationClip.findByName(animations, name);
        return [s, clip && mixer.clipAction(clip)];
    }).filter(([, a]) => a));
    let current = null;
    return {
        mixer,
        update(dt) {
            const next = actions[state()] ?? actions.idle;
            if (next && next !== current) { next.reset().fadeIn(fade).play(); current?.fadeOut(fade); current = next; }
            mixer.update(dt);
        },
        dispose() { mixer.stopAllAction(); },
    };
}
