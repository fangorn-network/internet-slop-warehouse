// body: stillness punctuated by discrete, motivated events (GAIT-AND-POSE.md). Seeded, so these are exact replays.
import { test, expect } from "vitest";
import { attention, cadence, split, stance, breather, blinker, sway, STUDY } from "./body.js";

const seeded = (s = 7) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const D = Math.PI / 180;

test("walking: cadence and step both fall with speed (walk ratio), no slow-motion stepping", () => {
  const slow = cadence(0.6), brisk = cadence(1.3);
  expect(brisk.C).toBeGreaterThan(100); expect(brisk.C).toBeLessThan(125);   // 100-120 steps/min at a normal pace
  expect(slow.C).toBeGreaterThan(70);                                          // not 50: the stride shortens too
  expect(slow.L / slow.C).toBeCloseTo(STUDY.walk.ratio, 5);
  expect(slow.L * slow.C / 60).toBeCloseTo(0.6, 5);
});

test("gaze split: small shifts are the eyes', big ones the head's, the torso only past the head's range", () => {
  expect(split(8 * D, 0).head[0]).toBe(0);
  const big = split(60 * D, -30 * D);
  expect(big.head[0]).toBeCloseTo(52 * D); expect(big.eyes[0]).toBeCloseTo(8 * D); expect(big.torso).toBe(0);
  expect(big.head[1]).toBeCloseTo(-22 * D);
  expect(split(100 * D, 0).torso).toBeCloseTo(22 * D);
});

test("a TV watcher mostly watches, looks away briefly, and holds each look (no constant drift)", () => {
  const a = attention({}, seeded()), sense = { head: [0, 1.1, 0], facing: 0, task: { at: [0, 1.5, 4], kind: "tv" }, social: null, noise: null };
  let onTask = 0, shifts = 0; const dt = 1 / 30, n = 30 * 600;
  for (let i = 0; i < n; i++) { const f = a.tick(dt, sense); if (f.id === "task") onTask++; if (f.changed) shifts++; }
  expect(onTask / n).toBeGreaterThan(0.7);
  const perMin = shifts / 10;
  expect(perMin).toBeGreaterThan(1.5); expect(perMin).toBeLessThan(25);   // looks away a few times a minute: not a flicker, not a stare
});

test("someone stopping near gets looked at; someone walking past close does not get stared at", () => {
  const a = attention({}, seeded(3)), base = { head: [0, 1.1, 0], facing: 0, task: { at: [0, 1.5, 4], kind: "tv" }, noise: null };
  let looked = 0;
  for (let i = 0; i < 30 * 12; i++) if (a.tick(1 / 30, { ...base, social: { at: [0.6, 1.6, 1.5], speed: 0 } }).id === "social") looked++;
  expect(looked / (30 * 12)).toBeGreaterThan(0.4);
  const b = attention({}, seeded(5)); let stare = 0;
  for (let i = 0; i < 60; i++) { const z = 2 - i * 0.04; if (b.tick(1 / 30, { ...base, social: { at: [0.8, 1.6, z], speed: 1.2 } }).id === "social" && Math.hypot(0.8, z) < 2) stare++; }
  expect(stare).toBe(0);
});

test("a noise is oriented to within ~0.3 s, head first, even from behind", () => {
  const a = attention({}, seeded(11)), base = { head: [0, 1.1, 0], facing: 0, task: { at: [0, 1.5, 4], kind: "tv" }, social: null };
  a.tick(1 / 30, { ...base, noise: [0, 0, -3] });
  let t = 0, f; do { f = a.tick(1 / 30, { ...base, noise: null }); t += 1 / 30; } while (f.id !== "noise" && t < 1);
  expect(t).toBeLessThan(0.34); expect(f.lead).toBe("head");
});

test("standing: a stance is held for seconds, then shifted quickly", () => {
  const s = stance(3, { rng: seeded(2) }); let shifting = 0, changes = 0, last = s.state.to;
  for (let i = 0; i < 30 * 300; i++) { const r = s.tick(1 / 30); if (r.w < 1) shifting++; if (r.to !== last) { changes++; last = r.to; } }
  expect(changes).toBeGreaterThan(4); expect(changes).toBeLessThan(40);   // every ~8-90 s over 5 min
  expect(shifting / (30 * 300)).toBeLessThan(0.15);                     // and mostly still
});

test("breathing is 12-16 a minute; sway is millimetres; blinks fewer on a screen", () => {
  const b = breather(seeded(4)); let peaks = 0, prev = 0, rising = true;
  for (let i = 0; i < 30 * 60; i++) { const v = b.tick(1 / 30); if (rising && v < prev) { peaks++; rising = false; } if (v > prev) rising = true; prev = v; }
  expect(peaks).toBeGreaterThanOrEqual(10); expect(peaks).toBeLessThanOrEqual(18);
  const sw = sway(seeded(9)); let max = 0; for (let i = 0; i < 3000; i++) max = Math.max(max, Math.hypot(...sw.tick(1 / 30)));
  expect(max).toBeLessThan(0.008);
  const count = screen => { const k = blinker(seeded(6)); let n = 0, was = 0; for (let i = 0; i < 30 * 300; i++) { const c = k.tick(1 / 30, { screen }); if (c > 0 && !was) n++; was = c > 0; } return n / 5; };
  expect(count(false)).toBeGreaterThan(12); expect(count(true)).toBeLessThan(10);
});
