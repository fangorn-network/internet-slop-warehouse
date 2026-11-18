// SPDX-License-Identifier: CC0-1.0
// One full-screen pass for everything a scene does to the picture: the dream look, fades, a door-peephole fisheye and
// eyelids. Phones can afford exactly one extra pass, so it is one pass, and none at all when every control is at rest
// (the scene then renders straight to the screen exactly as before).
//
//   const fx = createDream(renderer, { economy });
//   fx.set({ dream: 0.8 });              // targets; values ease toward them (fx.snap() to jump)
//   fx.render(scene, camera, dt);        // instead of renderer.render(scene, camera)
//   await fx.to({ fade: 1 }, 1.2);       // resolve when the value arrives (seconds)
//
// Controls, all 0..1: dream (grain, drift, chromatic fringe, cold desaturation, breathing vignette), fade (to black),
// flash (to white), peep (fisheye + round lens + door darkness), lids (eyelids closed).
import * as T from 'three';

const KEYS = ['dream', 'fade', 'flash', 'peep', 'lids'];

export function createDream(renderer, { economy = false } = {}) {
  const size = renderer.getDrawingBufferSize(new T.Vector2());
  // Half-float keeps the scene's HDR range so tone mapping still happens once, at the end, in this pass.
  const target = new T.WebGLRenderTarget(size.x, size.y, { type: T.HalfFloatType, samples: economy ? 0 : 4 });
  const uniforms = { tScene: { value: target.texture }, time: { value: 0 }, aspect: { value: size.x / size.y } };
  for (const k of KEYS) uniforms[k] = { value: 0 };
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, toneMapped: true,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tScene; uniform float time, aspect, dream, fade, flash, peep, lids;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = vUv, c = uv - 0.5; c.x *= aspect;
        float r = length(c);
        // Peephole: barrel distortion (a door viewer is a ~180° fisheye), sampled inside a round lens.
        if (peep > 0.0) { float k = 1.0 + peep * 1.6 * r * r; vec2 d = c / k; d.x /= aspect; uv = 0.5 + d; }
        // Dream drift: the picture breathes and swims a little, never enough to read as a wobble effect.
        uv += dream * 0.0025 * vec2(sin(uv.y * 9.0 + time * 0.7), cos(uv.x * 7.0 + time * 0.5));
        float fringe = dream * 0.0035 * r + peep * 0.004 * r;
        vec3 col = vec3(texture2D(tScene, uv + vec2(fringe, 0.0)).r, texture2D(tScene, uv).g, texture2D(tScene, uv - vec2(fringe, 0.0)).b);
        // Cold, slightly drained colour, lifted blacks.
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, vec3(luma) * vec3(0.86, 0.95, 1.12), dream * 0.45) + dream * vec3(0.004, 0.006, 0.012);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 o = gl_FragColor.rgb;
        // Grain after tone mapping, so it lives in the shadows the way film grain does.
        o += dream * 0.06 * (hash(vUv * 731.0 + fract(time * 13.0)) - 0.5);
        float breathe = 0.5 + 0.5 * sin(time * 0.45);
        o *= 1.0 - dream * smoothstep(0.35, 1.05, r) * (0.55 + 0.15 * breathe);
        if (peep > 0.0) { float lens = smoothstep(0.43, 0.39, r); o *= mix(1.0, lens, peep); }
        // Eyelids: an ellipse that closes from top and bottom, soft-edged.
        if (lids > 0.0) { float open = 1.0 - lids; float e = abs(vUv.y - 0.5) * 2.0 / max(open * (1.0 - 0.35 * c.x * c.x), 0.001); o *= 1.0 - smoothstep(0.75, 1.0, e); }
        o = mix(o, vec3(1.0), flash);
        gl_FragColor = vec4(o * (1.0 - fade), 1.0);
      }`,
  }));
  const ortho = new T.Camera(), post = new T.Scene(); post.add(quad);
  const now = Object.fromEntries(KEYS.map(k => [k, 0])), want = { ...now }, rate = Object.fromEntries(KEYS.map(k => [k, 1]));
  const waiters = [];

  function resize() {
    renderer.getDrawingBufferSize(size);
    target.setSize(size.x, size.y); uniforms.aspect.value = size.x / size.y;
  }
  return {
    get values() { return { ...now }; },
    get active() { return KEYS.some(k => now[k] > 0.001 || want[k] > 0.001); },
    resize,
    /** Ease toward these values over `seconds` (default 1). */
    set(values, seconds = 1) { for (const [k, v] of Object.entries(values)) { want[k] = v; rate[k] = Math.abs(v - now[k]) / Math.max(seconds, 1e-3); } },
    snap(values) { for (const [k, v] of Object.entries(values)) { now[k] = want[k] = v; } },
    /** Like set(), resolving when every value has arrived. */
    to(values, seconds = 1) { this.set(values, seconds); return new Promise(done => waiters.push({ values, done })); },
    render(scene, camera, dt) {
      for (const k of KEYS) { const d = want[k] - now[k]; now[k] += Math.sign(d) * Math.min(Math.abs(d), rate[k] * dt); uniforms[k].value = now[k]; }
      for (let i = waiters.length - 1; i >= 0; i--) if (Object.entries(waiters[i].values).every(([k, v]) => Math.abs(now[k] - v) < 1e-4)) waiters.splice(i, 1)[0].done();
      uniforms.time.value += dt;
      if (!this.active) { renderer.setRenderTarget(null); return renderer.render(scene, camera); }
      if (target.width !== renderer.getDrawingBufferSize(size).x || target.height !== size.y) resize();
      renderer.setRenderTarget(target); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(post, ortho);
    },
  };
}
