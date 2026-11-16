// Battery-conscious defaults; explicit quality=high opts into desktop effects.
const requested = new URLSearchParams(location.search).get('quality');
const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
export const economy = requested === 'low' || (requested !== 'high' && mobile);
export const quality = { economy, fps: economy ? 30 : 60, pixelRatio: requested === 'low' ? 0.5 : economy ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 1.5), lights: economy ? 4 : 8 };
