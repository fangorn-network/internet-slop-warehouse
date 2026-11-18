// Battery-conscious defaults; explicit quality=high opts into desktop effects. (Guards let package.mjs import this in Node.)
const browser = typeof location !== 'undefined';
const requested = browser ? new URLSearchParams(location.search).get('quality') : null;
const mobile = browser && (matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent));
const dpr = browser ? devicePixelRatio : 1;
export const economy = requested === 'low' || (requested !== 'high' && mobile);
export const quality = { economy, fps: economy ? 30 : 60, pixelRatio: requested === 'low' ? 0.5 : economy ? Math.min(dpr, 1) : Math.min(dpr, 1.5), lights: economy ? 4 : 8 };
