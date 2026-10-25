// Recipes: each is a complete look (colors, mood, motion and a shape). They drive the HUD list on the
// left and the Recipes buttons in the panel. A recipe starts from the schema defaults and applies its own
// values. Non-visual settings (count, pixel ratio, auto quality, orbit mode, text, city) are left alone.

import { SCHEMA } from './schema.js';

export const NON_VISUAL = ['preset', 'count', 'pixelRatio', 'autoQuality', 'orbitMode', 'textString', 'city'];

// Older saved settings used these ids.
const ALIASES = { 'ember-rings': 'sunburn', solar: 'sunburn', blueice: 'blueicicle', painting: 'paint', swarm: 'signal' };
export const canonical = (id) => ALIASES[id] || id;

export const PRESETS = [
  {
    id: 'sunburn',
    name: 'Sunburn',
    mood: ['WARM', 'RESTLESS'],
    description: 'Dan’s tuned look: tiny sparkling rings rising off a ring of fire, long trails, a wide soft cursor.',
    values: {
      shapeSource: 'ring',
      size: 1.3, sizeVar: 0.5, sizeMin: 0.75, sizeMax: 11, sprite: 'ring', sparkle: 0.89,
      pull: 2.9, noiseStrength: 1.6, noiseScale: 1.2, noiseSpeed: 0.4, damping: 0.94, maxSpeed: 8, gravity: 0.3,
      colorMode: 'speed', colorA: '#ff8a2a', colorB: '#8a0d00', intensity: 2.2, opacity: 0.3, speedRange: 2.5, depthRange: 1,
      blending: 'additive',
      bloomStrength: 1.3, bloomRadius: 0.6, bloomThreshold: 0.1, trails: 0.85, grain: 0.06, vignette: 0.45, aberration: 0, exposure: 1,
      fov: 40, distance: 4.5, parallax: 0.25, autoOrbit: 0.05,
      bgTop: '#000000', bgBottom: '#050201',
    },
  },
  {
    id: 'blueicicle',
    name: 'Blue Icicle',
    mood: ['COLD', 'STILL'],
    description: 'A frozen lattice breathing out long, slow vapor trails, like dry-ice smoke.',
    values: {
      shapeSource: 'lattice',
      sprite: 'soft', size: 1.6, sizeVar: 0.6, sparkle: 0.3,
      pull: 5, noiseStrength: 1.0, noiseScale: 0.8, noiseSpeed: 0.12, damping: 0.95, maxSpeed: 4, gravity: 0.04,
      settle: 0.8, settleTime: 3,
      colorMode: 'speed', colorA: '#bfe8ff', colorB: '#ffffff', intensity: 1.4, opacity: 0.2, speedRange: 1.2,
      bloomStrength: 0.9, bloomRadius: 0.75, bloomThreshold: 0.12, trails: 0.93, grain: 0.05, vignette: 0.5, aberration: 0.001,
      bgTop: '#02060c', bgBottom: '#071423', autoOrbit: 0.03,
    },
  },
  {
    id: 'courtyard',
    name: 'Night Courtyard',
    mood: ['QUIET', 'NOCTURNAL'],
    description: 'A torus knot in white-blue light on a dark void, soft glow, slow drift.',
    values: { shapeSource: 'torusKnot', settle: 0.75, settleTime: 2.5 },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    mood: ['DREAMY', 'SLOW'],
    description: 'A spiral galaxy shading from teal to violet with depth, drifting and twinkling.',
    values: {
      shapeSource: 'galaxy', shapeFill: 'volume',
      sprite: 'soft', size: 1.8, sizeVar: 0.7, sparkle: 0.5,
      pull: 4, noiseStrength: 0.9, noiseScale: 0.9, noiseSpeed: 0.15, damping: 0.95,
      settle: 0.5, settleTime: 3,
      colorMode: 'depth', colorA: '#3fe0c5', colorB: '#8a5cff', intensity: 1.7, opacity: 0.24, depthRange: 0.9,
      bloomStrength: 1.2, bloomRadius: 0.7, bloomThreshold: 0.1, trails: 0.6, vignette: 0.5,
      bgTop: '#03040a', bgBottom: '#0a0b1a', autoOrbit: 0.04,
    },
  },
  {
    id: 'signal',
    name: 'Signal',
    mood: ['NERVOUS', 'ALERT'],
    description: 'A Lorenz attractor held loosely by a flock of small hard dots. Black and white, no glow.',
    values: {
      shapeSource: 'lorenz',
      bgTop: '#000000', bgBottom: '#000000',
      colorMode: 'solid', colorA: '#ffffff', intensity: 1, sprite: 'hard', size: 1.4, sizeVar: 0.3, sparkle: 0,
      blending: 'normal', opacity: 0.85,
      pull: 1.5, noiseStrength: 2.6, noiseSpeed: 0.8, noiseScale: 1.6, maxSpeed: 10, damping: 0.95,
      bloomStrength: 0, grain: 0.04, vignette: 0.3, aberration: 0,
    },
  },
  {
    id: 'paint',
    name: 'Paint',
    mood: ['FLUID', 'WARM'],
    description: 'Dan\u2019s painting sampled into particles that keep its colors and flow like wet paint. Close, wide and swaying.',
    values: {
      shapeSource: 'image', imageWeight: 0.25, imageDepth: 0.04, textDepth: 0,
      colorMode: 'source', blending: 'normal', opacity: 0.9, intensity: 1, sprite: 'square', size: 1.2, sizeVar: 0.2, sizeMax: 24, sparkle: 0,
      pull: 3, noiseStrength: 2.4, noiseScale: 0.6, noiseSpeed: 0.08, damping: 0.94, maxSpeed: 6, gravity: 0, settle: 0,
      bloomStrength: 0.25, bloomRadius: 0.6, bloomThreshold: 0.6, trails: 0, grain: 0.04, vignette: 0.45, aberration: 0.0008, exposure: 1,
      fov: 58, distance: 2.75, parallax: 0.88, autoOrbit: 0.02, orbitSway: 160, cloudX: 0.32,
      bgTop: '#050608', bgBottom: '#0a0b0e',
    },
  },
  {
    id: 'smoke',
    name: 'Blue Smoke',
    mood: ['CALM', 'DRIFTING'],
    description: 'Thin ribbons of glowing blue smoke folding over each other in the dark, like incense in cold light.',
    values: {
      shapeSource: 'lorenz',
      sprite: 'soft', size: 1.1, sizeVar: 0.6, sparkle: 0,
      pull: 3, noiseStrength: 0.9, noiseScale: 0.8, noiseSpeed: 0.18, damping: 0.97, maxSpeed: 4, gravity: 0.12, settle: 0,
      colorMode: 'speed', colorA: '#1d4dff', colorB: '#a8ecff', intensity: 1.9, opacity: 0.025, speedRange: 0.8,
      blending: 'additive',
      bloomStrength: 0.75, bloomRadius: 0.8, bloomThreshold: 0.08, trails: 0.94, grain: 0.03, vignette: 0.55, aberration: 0,
      bgTop: '#010409', bgBottom: '#020b16', autoOrbit: 0.02,
    },
  },
];

export const recipeIndex = (id) => Math.max(0, PRESETS.findIndex((p) => p.id === canonical(id)));

export function presetValues(id) {
  const p = PRESETS[recipeIndex(id)];
  const base = {};
  for (const s of SCHEMA) if (!NON_VISUAL.includes(s.key) && s.type !== 'file') base[s.key] = s.default;
  return { ...base, ...p.values, preset: p.id };
}
