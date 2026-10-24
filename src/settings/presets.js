// Style presets. A preset sets every visual setting at once: it starts from the schema defaults
// and applies its own values. Non-visual settings (count, pixel ratio, auto quality, orbit mode) are left alone.
// Phase 1 ships the presets that only need phase-1 settings; the rest arrive with their features.

import { SCHEMA } from './schema.js';

export const NON_VISUAL = ['preset', 'count', 'pixelRatio', 'autoQuality', 'orbitMode', 'textString', 'city'];

export const PRESETS = [
  {
    id: 'ember-rings',
    name: 'Ember rings',
    description: 'Dan\u2019s tuned Ember: tiny sparkling rings, a wide soft cursor, long trails. The default look.',
    values: {
      size: 1.3, sizeVar: 0.5, sizeMin: 0.75, sizeMax: 11, sprite: 'ring', sparkle: 0.89,
      pull: 2.9, noiseStrength: 1.6, noiseScale: 1.2, noiseSpeed: 0.4, damping: 0.94, maxSpeed: 8, gravity: 0.3,
      cursorRadius: 1.58, cursorPush: 14, cursorDrag: 0.3, cursorEase: 23.5,
      colorMode: 'speed', colorA: '#ff8a2a', colorB: '#8a0d00', intensity: 2.2, opacity: 0.3, speedRange: 2.5, depthRange: 1,
      blending: 'additive',
      bloomStrength: 1.3, bloomRadius: 0.6, bloomThreshold: 0.1, trails: 0.85, grain: 0.06, vignette: 0.45, aberration: 0, exposure: 1,
      fov: 40, distance: 4.5, parallax: 0.25, autoOrbit: 0.05,
      bgTop: '#000000', bgBottom: '#050201',
    },
  },
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
  {
    id: 'painting',
    name: 'Data painting',
    description: 'An image sampled into particles that keep their pixel colors and flow like liquid paint.',
    values: {
      shapeSource: 'image', imageWeight: 0.6, imageDepth: 0.12,
      colorMode: 'source', blending: 'normal', opacity: 0.9, intensity: 1, sprite: 'square', size: 1.2, sizeVar: 0.2, sparkle: 0,
      pull: 3, noiseStrength: 2.4, noiseScale: 0.6, noiseSpeed: 0.08,
      bloomStrength: 0.25, bloomThreshold: 0.6, grain: 0.04, aberration: 0.0008,
      bgTop: '#050608', bgBottom: '#0a0b0e', hudStyle: 'minimal', fragments: 'off', autoOrbit: 0.02,
    },
  },
  {
    id: 'tilewall',
    name: 'Tile wall',
    description: 'A flat wall of large square tiles in source colors. Move the cursor to ripple it.',
    values: {
      shapeSource: 'imageGrid',
      colorMode: 'source', blending: 'normal', opacity: 1, intensity: 1, sprite: 'square', size: 7, sizeVar: 0, sizeMax: 24, sparkle: 0,
      pull: 8, noiseStrength: 0.15, cursorPush: 40, cursorRadius: 1.2,
      bloomStrength: 0, grain: 0.03, vignette: 0.3, aberration: 0,
      bgTop: '#000000', bgBottom: '#000000', autoOrbit: 0, parallax: 0.1,
    },
  },
];

export function presetValues(id) {
  const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
  const base = {};
  for (const s of SCHEMA) if (!NON_VISUAL.includes(s.key)) base[s.key] = s.default;
  return { ...base, ...p.values, preset: p.id };
}
