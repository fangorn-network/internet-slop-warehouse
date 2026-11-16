import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('./', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const manifests = ['provenance.json'];
const batches = new URL('batches/', root);
if (existsSync(batches)) for (const dir of readdirSync(batches, { withFileTypes: true })) {
  const path = `batches/${dir.name}/provenance.json`;
  if (dir.isDirectory() && existsSync(new URL(path, root))) manifests.push(path);
}
const provenance = manifests.flatMap(path => JSON.parse(read(path)));

test('published GLBs preserve every source buffer view and embed every texture', () => {
  for (const item of provenance) {
    const b = read(`../../parts/${item.output.file}`);
    assert.equal(createHash('sha256').update(b).digest('hex'), item.output.sha256);
    assert.equal(b.readUInt32LE(0), 0x46546c67);
    assert.equal(b.readUInt32LE(4), 2);
    assert.equal(b.readUInt32LE(8), b.length);
    const jsonLength = b.readUInt32LE(12);
    const doc = JSON.parse(b.subarray(20,20+jsonLength));
    const binary = b.subarray(28+jsonLength);
    assert.equal(binary.length, doc.buffers[0].byteLength);
    assert.equal(doc.buffers.length, 1);
    assert.equal(doc.buffers[0].uri, undefined);
    for (const view of doc.bufferViews) {
      assert.equal(view.buffer, 0);
      assert((view.byteOffset ?? 0) + view.byteLength <= binary.length);
    }
    // Source hash equality confirms that repacking never changed mesh data or images.
    for (const resource of item.resources.filter(r=>!r.url.endsWith('.gltf'))) {
      let matched = false;
      // Source buffers are placed first, followed by embedded images, each aligned to 4 bytes.
      for (const offset of new Set([0, ...doc.bufferViews.map(v=>v.byteOffset ?? 0)])) {
        if (offset + resource.bytes > binary.length) continue;
        if (createHash('sha256').update(binary.subarray(offset,offset+resource.bytes)).digest('hex') === resource.sha256) { matched = true; break; }
      }
      assert(matched, `${item.id}: packed source resource ${resource.url}`);
    }
    for (const image of doc.images) {
      assert.equal(image.uri, undefined);
      assert(Number.isInteger(image.bufferView));
      assert(['image/jpeg','image/png'].includes(image.mimeType));
    }
  }
});
