# Particle Memory Lab

GPU particle effects that assemble into shapes, dissolve and reassemble, inside a styled HUD. One particle engine, many looks: every look is a preset over the same settings, and the control panel exposes all of them.

Live: https://dgbenner.github.io/particle-memory-lab/

The full build plan is in [SPEC.md](SPEC.md).

## Status

**Phase 1, core engine: built.** A GPU-simulated particle cloud (16k to 1M particles) on a gradient void, held by a spring to its shape, moved by curl noise, and pushed by the cursor. Bloom, trails, grain, vignette and aberration in post. The control panel is generated from the settings schema, with copy/paste of settings and auto-save in the browser.

**Phase 2, shapes, morphing and HUD: built.**
- Shapes: sphere, torus knot, triangular prism ring, cube lattice, ring, wave plane, spiral galaxy; Lorenz, Aizawa and Thomas attractors; text; image (uploaded, or a generated sample); image grid; `.glb` model. Primitives and attractors are sampled in a Web Worker.
- Morph: staggered per particle, with a dissolve mid-way (extra noise plus an outward burst), three easings, and random or sorted point assignment. A morph started mid-morph begins from the current blended targets.
- HUD: nav, project index, project card with a decode transition, leader line from the cloud, chevrons, cursor and clock readouts, progress tick, floating fragments, and three HUD styles.
- Navigation: arrow keys, chevrons, index list, mouse wheel (one project per gesture) and swipe.
- Presets: Ember rings (the default), Night courtyard, Ember, Swarm, Data painting, Tile wall.

Phases 3–5 (environments and atmosphere, Gaussian splats, capture) are not started.

## Running locally

```
npm install
npm run dev
```

`npm run build` writes the static site to `dist/`. Pushing to `main` deploys it to GitHub Pages through `.github/workflows/deploy.yml`.

## Keys

| Key | Action |
|---|---|
| ← / → | Previous or next project |
| H | Hide or show the control panel |
| U | Hide or show the HUD |
| Esc | Close the About or Contact panel |
| O | Toggle orbit mode (drag to inspect; cursor push is off) |
| Space | Pause or resume the simulation |

## Adding projects

Edit `src/content/projects.js`. Each entry has a name, a three-part tag, a URL (`#` shows the link as unavailable) and a shape:

```js
shape: { type: 'primitive', name: 'torusKnot' }   // sphere, torusKnot, prism, lattice, ring, wave, galaxy
shape: { type: 'attractor', name: 'aizawa' }      // lorenz, aizawa, thomas
shape: { type: 'text', text: 'ATL' }
shape: { type: 'model', src: 'env/thing.glb' }    // a file in public/
```

`style` can hold settings overrides applied when that project becomes active.

## Notes beyond the spec

- **Opacity** (Color section, default 0.22) is a per-particle alpha. With additive blending, 65k dots at full strength stack into a solid white blob, so this keeps the spec's intensity and bloom defaults readable.
- **Min size, Max size, Follow, Speed for color B, Depth range, Exposure and Distance** are exposed so that every number the shaders use comes from a setting.
- With reduced motion, auto-orbit, parallax and sparkle are off and noise speed drops by 75%. The saved settings themselves aren't changed.
- **Auto-orbit sways** around the front view (Orbit sway, default 35° each side) instead of circling, so flat shapes like text and images never turn edge-on. Set Orbit sway to 180° for a full orbit.
- **Data painting and Tile wall** arrived in phase 2 with the image shape. Presets don't change the particle count, so the spec's "High count" for Data painting is left to the Count control.
- **Cloud position** (Camera) shifts the view so the cloud sits left of the project card rather than dead center.
- **Burst** (Shape & Morph) sets the outward push during the dissolve, so the spec's "small outward impulse" comes from a setting rather than a fixed number.
- With reduced motion, morphs are a 400 ms crossfade and the name swaps instantly.
