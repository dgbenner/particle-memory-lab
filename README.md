# Particle Memory Lab

GPU particle effects that assemble into shapes, dissolve and reassemble, inside a styled HUD. One particle engine, many looks: every look is a preset over the same settings, and the control panel exposes all of them.

Live: https://dgbenner.github.io/particle-memory-lab/

The full build plan is in [SPEC.md](SPEC.md).

## Status

**Phase 1, core engine: built.** A GPU-simulated particle cloud (16k to 1M particles) on a gradient void, held by a spring to its shape, moved by curl noise, and pushed by the cursor. Bloom, trails, grain, vignette and aberration in post. The control panel is generated from the settings schema, with copy/paste of settings and auto-save in the browser.

**Phase 2, shapes, morphing and HUD: built.**
- Shapes: sphere, torus knot, triangular prism ring, cube lattice, ring, wave plane, spiral galaxy; Lorenz, Aizawa and Thomas attractors; text; image (uploaded, or a generated sample); image grid; `.glb` model. Primitives and attractors are sampled in a Web Worker.
- Morph: staggered per particle, with a dissolve mid-way (extra noise plus an outward burst), three easings, and random or sorted point assignment. A morph started mid-morph begins from the current blended targets.
- HUD: recipe list, title card with a decode transition, leader line from the cloud, chevrons, cursor and clock readouts, progress tick, floating fragments, and three HUD styles.
- Navigation: arrow keys, chevrons, index list, mouse wheel (one project per gesture) and swipe.
- Recipes: six complete looks that replace the spec's project list (see Recipes below).

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
| ← / → | Previous or next recipe |
| H | Hide or show the control panel |
| U | Hide or show the HUD |
| Esc | Close the recipe sheet |
| O | Toggle orbit mode (drag to inspect; cursor push is off) |
| Space | Pause or resume the simulation |

## Recipes

The list on the left and the Recipes buttons in the panel are the same six recipes. Each is a complete look: colors, mood, motion and a shape. Picking one (click, arrow keys, wheel, chevrons or swipe) applies it, decodes its name into the title and morphs the particles into its shape. The ⓘ beside each one, or Recipe under the title, opens a sheet listing what's in it.

| Recipe | Mood | Shape |
|---|---|---|
| Sunburn (default) | warm, restless | Ring |
| Blue Icicle | cold, still | Cube lattice |
| Night Courtyard | quiet, nocturnal | Torus knot |
| Aurora | dreamy, slow | Spiral galaxy |
| Signal | nervous, alert | Lorenz attractor |
| Paint | fluid, warm | Image |

Recipes live in `src/settings/presets.js`. Each lists only the settings it changes; everything else takes the schema default. Add `mood` (two words) and a `description`; the tag line and sheet are generated from them.

**Settle** (Forces) calms the wiggle once particles arrive at a shape, so it comes into focus. Blue Icicle, Night Courtyard and Aurora use it.

## Notes beyond the spec

- **Opacity** (Color section, default 0.22) is a per-particle alpha. With additive blending, 65k dots at full strength stack into a solid white blob, so this keeps the spec's intensity and bloom defaults readable.
- **Min size, Max size, Follow, Speed for color B, Depth range, Exposure and Distance** are exposed so that every number the shaders use comes from a setting.
- With reduced motion, auto-orbit, parallax and sparkle are off and noise speed drops by 75%. The saved settings themselves aren't changed.
- **Auto-orbit sways** around the front view (Orbit sway, default 35° each side) instead of circling, so flat shapes like text and images never turn edge-on. Set Orbit sway to 180° for a full orbit.
- **Recipes replace projects.** This lab is a single piece for an ai.html page, so the spec's project list became six recipes. The spec's Ember, Swarm, Data painting and Tile wall presets were folded in or dropped: Swarm became Signal, Data painting became Paint. Recipes don't change the particle count.
- **Cloud position** (Camera) shifts the view so the cloud sits left of the project card rather than dead center.
- **Burst** (Shape & Morph) sets the outward push during the dissolve, so the spec's "small outward impulse" comes from a setting rather than a fixed number.
- With reduced motion, morphs are a 400 ms crossfade and the name swaps instantly.
