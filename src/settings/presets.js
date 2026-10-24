// Style presets. A preset sets every visual setting at once: it starts from the schema defaults
// and applies its own values. Non-visual settings (count, pixel ratio, auto quality, orbit mode) are left alone.
// Phase 1 ships the presets that only need phase-1 settings; the rest arrive with their features.

import { SCHEMA } from './schema.js';

export const NON_VISUAL = ['preset', 'count', 'pixelRatio', 'autoQuality', 'orbitMode'];

export const PRESETS = [
  {
    id: 'courtyard',
    name: 'Night courtyard',
    description: 'Dark void, white-blue particles, additive glow, strong bloom.',
    values: {},
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Black void, orange to deep red by speed, long trails, sparks rising.',
    values: {
      bgTop: '#000000', bgBottom: '#050201',
      colorMode: 'speed', colorA: '#ff8a2a', colorB: '#8a0d00', intensity: 2.2, speedRange: 2.5,
      gravity: 0.3, noiseStrength: 2.2, noiseSpeed: 0.4, pull: 5, maxSpeed: 8,
      trails: 0.85, bloomStrength: 1.3, bloomThreshold: 0.1, sparkle: 0.35, opacity: 0.3,
    },
  },
  {
    id: 'swarm',
    name: 'Swarm',
    description: 'Loose formation: low pull, fast noise, small hard dots, black and white, no bloom.',
    values: {
      bgTop: '#000000', bgBottom: '#000000',
      colorMode: 'solid', colorA: '#ffffff', intensity: 1, sprite: 'hard', size: 1.4, sizeVar: 0.3, sparkle: 0,
      blending: 'normal', opacity: 0.85,
      pull: 1.5, noiseStrength: 2.6, noiseSpeed: 0.8, noiseScale: 1.6, maxSpeed: 10, damping: 0.95,
      bloomStrength: 0, grain: 0.04, vignette: 0.3, aberration: 0,
    },
  },
];

export function presetValues(id) {
  const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
  const base = {};
  for (const s of SCHEMA) if (!NON_VISUAL.includes(s.key)) base[s.key] = s.default;
  return { ...base, ...p.values, preset: p.id };
}
