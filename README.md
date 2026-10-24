# Particle Memory Lab

GPU particle effects that assemble into shapes, dissolve and reassemble, inside a styled HUD. One particle engine, many looks: every look is a preset over the same settings, and the control panel exposes all of them.

Live: https://dgbenner.github.io/particle-memory-lab/

The full build plan is in [SPEC.md](SPEC.md).

## Status

**Phase 1, core engine: built.** A GPU-simulated particle sphere (16k to 1M particles) on a gradient void, held by a spring to its shape, moved by curl noise, and pushed by the cursor. Bloom, trails, grain, vignette and aberration in post. The control panel is generated from the settings schema, with three presets (Night courtyard, Ember, Swarm), copy/paste of settings, and auto-save in the browser.

Phases 2–5 (shapes and morphing, HUD, environments, splats, capture) are not started.

## Running locally

```
npm install
npm run dev
```

`npm run build` writes the static site to `dist/`. Pushing to `main` deploys it to GitHub Pages through `.github/workflows/deploy.yml`.

## Keys

| Key | Action |
|---|---|
| H | Hide or show the control panel |
| O | Toggle orbit mode (drag to inspect; cursor push is off) |
| Space | Pause or resume the simulation |

## Notes beyond the spec

- **Opacity** (Color section, default 0.22) is a per-particle alpha. With additive blending, 65k dots at full strength stack into a solid white blob, so this keeps the spec's intensity and bloom defaults readable.
- **Min size, Max size, Follow, Speed for color B, Depth range, Exposure and Distance** are exposed so that every number the shaders use comes from a setting.
- With reduced motion, auto-orbit, parallax and sparkle are off and noise speed drops by 75%. The saved settings themselves aren't changed.
