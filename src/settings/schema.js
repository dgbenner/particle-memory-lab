// Every setting the lab exposes. The panel, presets, saving and copy/paste all read this list.
// type: range | select | toggle | color | hidden
// safeMin/safeMax bound Randomize (phase 5). rebuild: true means the simulation must be rebuilt.

export const SECTIONS = [
  'Style', 'Particles', 'Forces', 'Cursor', 'Color', 'Glow & Post', 'Camera', 'Background', 'Performance', 'Settings',
];

export const COUNTS = { low: 128, medium: 256, high: 512, ultra: 1024 };

export const SCHEMA = [
  { key: 'preset', section: 'Style', type: 'hidden', default: 'courtyard' },

  // Particles
  { key: 'count', label: 'Count', section: 'Particles', type: 'select', default: 'medium', rebuild: true,
    options: [['low', 'Low · 16k'], ['medium', 'Medium · 65k'], ['high', 'High · 262k'], ['ultra', 'Ultra · 1M (desktop)']] },
  { key: 'size', label: 'Size', section: 'Particles', type: 'range', min: 0.5, max: 8, step: 0.1, default: 2, unit: 'px', safeMin: 1, safeMax: 4 },
  { key: 'sizeVar', label: 'Size variation', section: 'Particles', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },
  { key: 'sizeMin', label: 'Min size', section: 'Particles', type: 'range', min: 0.5, max: 4, step: 0.05, default: 0.75, unit: 'px' },
  { key: 'sizeMax', label: 'Max size', section: 'Particles', type: 'range', min: 4, max: 64, step: 1, default: 24, unit: 'px' },
  { key: 'sprite', label: 'Sprite', section: 'Particles', type: 'select', default: 'soft',
    options: [['soft', 'Soft dot'], ['hard', 'Hard dot'], ['square', 'Square'], ['ring', 'Ring']] },
  { key: 'sparkle', label: 'Sparkle', section: 'Particles', type: 'range', min: 0, max: 1, step: 0.01, default: 0.2,
    hint: 'Share of particles that twinkle.' },

  // Forces
  { key: 'pull', label: 'Shape pull', section: 'Forces', type: 'range', min: 0, max: 20, step: 0.1, default: 6, safeMin: 1, safeMax: 12 },
  { key: 'noiseStrength', label: 'Noise strength', section: 'Forces', type: 'range', min: 0, max: 10, step: 0.05, default: 1.2, safeMax: 5 },
  { key: 'noiseScale', label: 'Noise scale', section: 'Forces', type: 'range', min: 0.1, max: 5, step: 0.05, default: 1.2 },
  { key: 'noiseSpeed', label: 'Noise speed', section: 'Forces', type: 'range', min: 0, max: 2, step: 0.01, default: 0.25 },
  { key: 'damping', label: 'Damping', section: 'Forces', type: 'range', min: 0.8, max: 0.999, step: 0.001, default: 0.94,
    hint: 'Velocity kept per 1/60 s. Higher is floatier.' },
  { key: 'maxSpeed', label: 'Max speed', section: 'Forces', type: 'range', min: 0.5, max: 20, step: 0.1, default: 6 },
  { key: 'gravity', label: 'Gravity', section: 'Forces', type: 'range', min: -2, max: 2, step: 0.01, default: 0,
    hint: 'Positive pulls up.' },

  // Cursor
  { key: 'cursorRadius', label: 'Radius', section: 'Cursor', type: 'range', min: 0, max: 2, step: 0.01, default: 0.6 },
  { key: 'cursorPush', label: 'Push', section: 'Cursor', type: 'range', min: 0, max: 50, step: 0.5, default: 18 },
  { key: 'cursorDrag', label: 'Drag along', section: 'Cursor', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3,
    hint: 'How much nearby particles pick up the cursor’s own motion.' },
  { key: 'cursorEase', label: 'Follow', section: 'Cursor', type: 'range', min: 1, max: 30, step: 0.5, default: 10,
    hint: 'How fast the push point catches up to the pointer. Lower leaves a longer wake.' },

  // Color
  { key: 'colorMode', label: 'Mode', section: 'Color', type: 'select', default: 'speed',
    options: [['solid', 'Solid (color A)'], ['speed', 'Gradient by speed'], ['depth', 'Gradient by depth'], ['source', 'Source colors (phase 2)']] },
  { key: 'colorA', label: 'Color A', section: 'Color', type: 'color', default: '#cfd8e6' },
  { key: 'colorB', label: 'Color B', section: 'Color', type: 'color', default: '#ffffff' },
  { key: 'intensity', label: 'Intensity', section: 'Color', type: 'range', min: 0.2, max: 4, step: 0.05, default: 1.6,
    hint: 'Above 1 feeds the bloom.' },
  { key: 'opacity', label: 'Opacity', section: 'Color', type: 'range', min: 0.02, max: 1, step: 0.01, default: 0.22,
    hint: 'Per particle. With additive blending, overlapping dots add up, so keep this low for dense clouds.' },
  { key: 'speedRange', label: 'Speed for color B', section: 'Color', type: 'range', min: 0.2, max: 10, step: 0.1, default: 3 },
  { key: 'depthRange', label: 'Depth range', section: 'Color', type: 'range', min: 0.2, max: 3, step: 0.05, default: 1 },
  { key: 'blending', label: 'Blending', section: 'Color', type: 'select', default: 'additive',
    options: [['additive', 'Additive (glow)'], ['normal', 'Normal']] },

  // Glow & Post
  { key: 'bloomStrength', label: 'Bloom strength', section: 'Glow & Post', type: 'range', min: 0, max: 3, step: 0.01, default: 1.1 },
  { key: 'bloomRadius', label: 'Bloom radius', section: 'Glow & Post', type: 'range', min: 0, max: 1, step: 0.01, default: 0.6 },
  { key: 'bloomThreshold', label: 'Bloom threshold', section: 'Glow & Post', type: 'range', min: 0, max: 1, step: 0.01, default: 0.15 },
  { key: 'trails', label: 'Trails', section: 'Glow & Post', type: 'range', min: 0, max: 0.98, step: 0.01, default: 0, safeMax: 0.9 },
  { key: 'grain', label: 'Grain', section: 'Glow & Post', type: 'range', min: 0, max: 0.3, step: 0.005, default: 0.06 },
  { key: 'vignette', label: 'Vignette', section: 'Glow & Post', type: 'range', min: 0, max: 1, step: 0.01, default: 0.45 },
  { key: 'aberration', label: 'Aberration', section: 'Glow & Post', type: 'range', min: 0, max: 0.01, step: 0.0001, default: 0.0015 },
  { key: 'exposure', label: 'Exposure', section: 'Glow & Post', type: 'range', min: 0.2, max: 3, step: 0.01, default: 1 },

  // Camera
  { key: 'fov', label: 'FOV', section: 'Camera', type: 'range', min: 30, max: 70, step: 1, default: 40, unit: '°' },
  { key: 'distance', label: 'Distance', section: 'Camera', type: 'range', min: 2, max: 10, step: 0.05, default: 4.5 },
  { key: 'parallax', label: 'Parallax', section: 'Camera', type: 'range', min: 0, max: 1, step: 0.01, default: 0.25 },
  { key: 'autoOrbit', label: 'Auto-orbit speed', section: 'Camera', type: 'range', min: 0, max: 0.5, step: 0.005, default: 0.05 },
  { key: 'orbitMode', label: 'Orbit mode (O)', section: 'Camera', type: 'toggle', default: false,
    hint: 'Drag to inspect. Cursor push is off while it’s on.' },

  // Background (the full environment layer arrives in phase 3)
  { key: 'bgTop', label: 'Void top', section: 'Background', type: 'color', default: '#05070a' },
  { key: 'bgBottom', label: 'Void bottom', section: 'Background', type: 'color', default: '#0d1117' },

  // Performance
  { key: 'pixelRatio', label: 'Pixel ratio cap', section: 'Performance', type: 'select', default: '2',
    options: [['1', '1×'], ['1.5', '1.5×'], ['2', '2×']] },
  { key: 'autoQuality', label: 'Auto quality', section: 'Performance', type: 'toggle', default: true,
    hint: 'Drops the count one step if the frame rate stays under 40 for 3 seconds.' },
];

export const BY_KEY = Object.fromEntries(SCHEMA.map((s) => [s.key, s]));
