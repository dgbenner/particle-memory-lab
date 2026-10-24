// Transitions between shapes. Keeps CPU copies of the current from/to targets so a morph started
// mid-morph can begin from the particles' current blended targets.

import { S } from '../settings/store.js';

export const EASES = { cubic: 0, expo: 1, back: 2 };

// Same curves as ease.glsl.
export function ease(t, mode) {
  if (mode === 1) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
  }
  if (mode === 2) {
    const c2 = 1.70158 * 1.525;
    return t < 0.5
      ? ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2
      : ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  }
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

const toRGBA = (colors, n) => {
  const out = new Float32Array(n * 4);
  if (colors) for (let i = 0; i < n; i++) { out[i * 4] = colors[i * 3]; out[i * 4 + 1] = colors[i * 3 + 1]; out[i * 4 + 2] = colors[i * 3 + 2]; out[i * 4 + 3] = 1; }
  return out;
};

export function createMorph(sim, shape) {
  const n = sim.count;
  let fromP = shape.points, toP = shape.points;
  let fromC = toRGBA(shape.colors, n), toC = fromC;
  let start = -1e6;

  const timing = () => ({ dur: S.morphDuration, stagger: S.morphStagger, mode: EASES[S.morphEase] });

  function blendedAt(t) {
    const { dur, stagger, mode } = timing();
    const p = new Float32Array(n * 3), c = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const k = Math.min(1, Math.max(0, (t - start - sim.seeds[i] * stagger) / dur));
      const e = ease(k, mode);
      for (let j = 0; j < 3; j++) p[i * 3 + j] = fromP[i * 3 + j] + (toP[i * 3 + j] - fromP[i * 3 + j]) * e;
      for (let j = 0; j < 4; j++) c[i * 4 + j] = fromC[i * 4 + j] + (toC[i * 4 + j] - fromC[i * 4 + j]) * e;
    }
    return { p, c };
  }

  return {
    // Travel to a new shape, starting at sim time t.
    to(next, t) {
      const cur = blendedAt(t);
      fromP = cur.p; fromC = cur.c;
      toP = next.points; toC = toRGBA(next.colors, n);
      start = t;
      sim.setTargets(fromP, toP, fromC, toC, start);
    },
    // Switch targets with no travel (reduced motion, rebuilds).
    jump(next, { teleport = false } = {}) {
      fromP = toP = next.points;
      fromC = toC = toRGBA(next.colors, n);
      start = -1e6;
      sim.setTargets(fromP, toP, fromC, toC, start);
      if (teleport) sim.teleport(next.points);
    },
    get start() { return start; },
    busy(t) { const { dur, stagger } = timing(); return t - start < dur + stagger; },
  };
}
