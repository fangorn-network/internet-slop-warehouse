#!/usr/bin/env node
// the warehouse's own seed textures and sounds, made from nothing (CC0): node parts/make-assets.js
// Writes grass.png, crate.png, coin.wav, jump.wav and hit.wav next to this file. Deterministic.

import { writeFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const here = (f) => new URL(f, import.meta.url);
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function png(w, h, px) { // px(x, y) → [r, g, b]
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(px(x, y).map((v) => Math.max(0, Math.min(255, v | 0))), y * (w * 3 + 1) + 1 + x * 3);
    const chunk = (type, data) => {
        const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]);
        len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function wav(seconds, sample) { // sample(t) → -1..1, 22050 Hz mono 16-bit
    const rate = 22050, n = Math.floor(seconds * rate), b = Buffer.alloc(44 + n * 2);
    b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28);
    b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample(i / rate))) * 32000), 44 + i * 2);
    return b;
}

// grass: mottled greens, tiles seamlessly (per-pixel noise only)
writeFileSync(here("grass.png"), png(64, 64, () => { const v = rand(); return [60 + v * 40, 140 + v * 60, 50 + v * 30]; }));
// crate: planks with dark seams and a frame
writeFileSync(here("crate.png"), png(64, 64, (x, y) => {
    const edge = x < 5 || y < 5 || x > 58 || y > 58, seam = y % 16 < 2, grain = Math.sin(x * 0.7 + Math.sin(y * 0.3) * 3) * 12 + rand() * 14;
    const base = edge ? [110, 70, 35] : seam ? [90, 55, 25] : [170, 120, 65];
    return base.map((c) => c + grain);
}));
const env = (t, len) => Math.max(0, 1 - t / len);
const sq = (f, t) => (Math.sin(2 * Math.PI * f * t) > 0 ? 0.5 : -0.5);
writeFileSync(here("coin.wav"), wav(0.25, (t) => sq(t < 0.07 ? 988 : 1319, t) * env(t, 0.25)));
writeFileSync(here("jump.wav"), wav(0.2, (t) => sq(300 + t * 2400, t) * env(t, 0.2) * 0.8));
writeFileSync(here("hit.wav"), wav(0.35, (t) => (rand() * 2 - 1) * env(t, 0.35) * (0.6 + 0.4 * sq(80, t))));
console.log("wrote grass.png crate.png coin.wav jump.wav hit.wav");
