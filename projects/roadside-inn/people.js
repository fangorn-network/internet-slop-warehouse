// Rigged, textured Microsoft Rocketbox people, converted by Avatar Studio.
// MIT, © Microsoft. Full notice: licenses/rocketbox-NOTICE.md.
import * as T from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
export function createPerson(source, { height = 1.72, tint } = {}) {
  const body = cloneSkinned(source.scene), root = new T.Group();
  root.name = 'Textured hotel resident'; root.userData.hotelResident = true;
  body.traverse(n => {
    if (!n.isMesh) return;
    n.castShadow = n.receiveShadow = true;
    n.frustumCulled = false;
    n.material = n.material.clone();
    // Preserve authored face, hair and cloth maps. No procedural replacement geometry.
    if (tint && /Top_shirt/.test(n.name)) n.material.color.set(tint);
    if (/Hair/.test(n.name)) { n.material.transparent = false; n.material.alphaTest = 0.45; n.material.side = T.DoubleSide; }
  });
  const bounds = new T.Box3().setFromObject(body);
  body.position.y -= bounds.min.y;
  root.add(body); root.scale.setScalar(height / (bounds.max.y - bounds.min.y));
  const mixer = new T.AnimationMixer(body);
  const actions = new Map(source.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  let current = null;
  function play(name) {
    const resolved = name === 'Interact' ? 'Talk' : actions.has(name) ? name : 'Idle';
    if (resolved === current) return;
    const next = actions.get(resolved), prev = actions.get(current);
    next.reset().setEffectiveWeight(1).play();
    if (prev) next.crossFadeFrom(prev, 0.25, false);
    current = resolved;
  }
  play('Idle'); mixer.update(0);
  return { root, play, update(dt) { mixer.update(dt); } };
}
