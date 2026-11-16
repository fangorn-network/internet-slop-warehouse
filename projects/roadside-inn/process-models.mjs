// One-time import preparation. Source URLs and licenses: assets-provenance.json.
// Requires @gltf-transform/{core,extensions,functions} and sharp in /tmp/warehouse-validation.
import { readFile } from 'node:fs/promises';
import { NodeIO } from '/tmp/warehouse-validation/node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '/tmp/warehouse-validation/node_modules/@gltf-transform/extensions/dist/index.js';
import { prune, dedup } from '/tmp/warehouse-validation/node_modules/@gltf-transform/functions/dist/index.js';
import sharp from '/tmp/warehouse-validation/node_modules/sharp/dist/index.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const name of ['sophia_formal', 'marcus_formal', 'emma_casual', 'andre_casual']) {
  const doc = await io.read(`/tmp/${name}.glb`), root = doc.getRoot();
  root.getAsset().copyright = 'Copyright (c) 2020 Microsoft; Copyright (c) 2026 Rohit Biradar';
  root.setExtras({ source: 'https://github.com/memoriesrohit/avatar-studio', license: 'MIT', licenseNotices: await readFile('projects/roadside-inn/licenses/rocketbox-NOTICE.md', 'utf8') + '\n' + await readFile('projects/roadside-inn/licenses/avatar-studio-LICENSE.txt', 'utf8') });
  const keep = new Set(['Body', 'Hair', 'Outfit_original', 'Skin_original']);
  for (const node of root.listNodes()) if (node.getMesh() && !keep.has(node.getName())) node.dispose();
  for (const animation of root.listAnimations()) if (!['Idle', 'Walk', 'Wave', 'Talk'].includes(animation.getName())) animation.dispose();
  // Facial morphs are unused in the hotel. Preserve authored skinning and normals.
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) for (const target of primitive.listTargets()) primitive.removeTarget(target);
    mesh.setWeights([]);
  }
  for (const node of root.listNodes()) if (node.getMesh()) node.setWeights([]);
  await doc.transform(prune(), dedup());
  for (const texture of root.listTextures()) {
    const bytes = await sharp(texture.getImage()).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    texture.setImage(bytes).setMimeType('image/webp');
  }
  const path = `projects/roadside-inn/assets/rb-${name.replaceAll('_', '-')}.glb`;
  await io.write(path, doc);
  console.log(name, root.listMeshes().length, 'meshes', root.listTextures().length, 'textures');
}

for (const name of ['shower-cabin', 'treadmill', 'exercise-bike']) {
  const path = `projects/roadside-inn/assets/g3-${name}.glb`, doc = await io.read(path);
  for (const texture of doc.getRoot().listTextures()) {
    const bytes = await sharp(texture.getImage()).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    texture.setImage(bytes).setMimeType('image/webp');
  }
  await doc.transform(prune(), dedup()); await io.write(path, doc);
  console.log(name, 'textures capped at 1K');
}
