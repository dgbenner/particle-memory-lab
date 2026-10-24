# Particle Memory Lab: build spec

A browser lab for GPU particle effects that assemble into shapes, dissolve, and reassemble, inside a styled HUD. One particle engine, many looks: every look is a preset over the same settings, and a control panel exposes all of them, like Dither Crawl Lab.

Reference looks:

- The Assassin's Creed Animus: AC1's pale fog and HUD, Black Flag's teal void with a particle band and light rays.
- A dark-courtyard Three.js portfolio with a particle mass that morphs between project marks.
- Refik Anadol–style data paintings.
- Image-tile walls.

Original work only. No Assassin's Creed or Abstergo logos, glyphs, fonts or artwork. HUD motifs (corner brackets, × marks, hatch blocks, tiny text blocks) are drawn fresh.

---

## 0. Ground rules

- **Stack:**
  - Vite with vanilla JavaScript ES modules and no UI framework.
  - Three.js, current stable release, r179 or later. That minimum is required by Spark, the Gaussian splat library used in phase 4.
  - Use **`WebGLRenderer`**, not `WebGPURenderer`, so splats work later. Particles run on the GPU with `GPUComputationRenderer` (render-to-texture simulation).
  - Addons come from `three/examples/jsm`: `GPUComputationRenderer`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `AfterimagePass`, `OutputPass`, `ShaderPass`, `GLTFLoader`, `RGBELoader`, `EXRLoader`, `MeshSurfaceSampler`, `Reflector`, `OrbitControls`.
- **Repo:** `dgbenner/particle-memory-lab`. Deploy to GitHub Pages with a GitHub Actions workflow that runs `vite build` with `base: '/particle-memory-lab/'`.
- **Structure:** Build in the phases below, in order. Each phase ends in a working, deployable page. Don't start a phase until the previous one passes its checks.
- **Settings:** Everything visual is driven by one settings object, defined by a schema (section 7). The panel, presets, saving, copy/paste and randomize all read that schema. No hard-coded magic numbers in shaders; pass uniforms from settings.
- **Accessibility:**
  - The HUD is real HTML over the canvas. The canvas is `aria-hidden` with a text description nearby.
  - Project changes are announced through an `aria-live="polite"` region.
  - Everything works from the keyboard.
  - `prefers-reduced-motion` is respected (section 11).

## File structure

```
particle-memory-lab/
  index.html
  vite.config.js
  .github/workflows/deploy.yml
  public/
    env/            # 360 images, .glb scenes, splats (user-supplied)
    fonts/          # only if a self-hosted HUD font is used
  src/
    main.js               # boot, resize, loop, visibility pause
    settings/
      schema.js           # every setting: key, label, section, type, range, default
      presets.js          # style presets (section 8)
      store.js            # current settings, localStorage, copy/paste, randomize
    engine/
      renderer.js         # WebGLRenderer, pixel-ratio cap, tone mapping
      camera.js           # camera, mouse parallax, optional orbit
      post.js             # composer: bloom, trails, grain, vignette, aberration
    particles/
      sim.js              # GPUComputationRenderer setup
      shaders/position.glsl
      shaders/velocity.glsl
      shaders/noise.glsl  # simplex + curl noise
      render.js           # Points material, sprite shapes, color
      cursor.js           # cursor ray → 3D point
      morph.js            # transitions between shapes
    shapes/
      index.js            # registry: id → sampler returning N points (+ optional colors)
      primitives.js       # sphere, torus knot, prism, lattice, ring, wave plane
      attractors.js       # Lorenz, Aizawa, Thomas
      text.js             # text → points via 2D canvas
      image.js            # image → points + colors
      model.js            # .glb → points via MeshSurfaceSampler
      splat.js            # phase 4
    environment/
      index.js            # active background layer
      void.js             # color/gradient background + fog
      panorama.js         # 360 image (JPG/HDR/EXR)
      scene.js            # .glb environment
      band.js             # Black Flag–style horizontal particle band
      shaft.js            # light shaft cone
      floor.js            # reflective floor
      splat.js            # phase 4
    hud/
      hud.js              # builds and updates HUD DOM
      decode.js           # text decode transition
      leader.js           # SVG leader line from cloud to project card
      fragments.js        # floating brackets/×/hatch/tiny text with parallax
    content/
      projects.js         # project list (section 9)
    panel/
      panel.js            # control panel built from the schema
      panel.css
    capture/
      record.js           # video + PNG export (phase 5)
```

---

## 1. Phase 1: core engine

**Goal:** a particle sphere on a dark void, glowing, drifting, pushed by the cursor, with a working control panel.

### Simulation

- Use `GPUComputationRenderer` with two float textures, **position** and **velocity**. Texture size sets the particle count:
  - 128² ≈ 16k (Low)
  - 256² ≈ 65k (Medium, default)
  - 512² ≈ 262k (High)
  - 1024² ≈ 1M (Ultra, desktop only)
- Changing the count rebuilds the simulation.
- Also keep a **target** texture: the point on the current shape that each particle is pulled toward.
- Give each particle a stable random **seed** (0–1), stored in position.w or a separate texture. It's used for staggering, size variation and color variation.

**Velocity shader, per frame:**

```
toTarget = target - pos
v += toTarget * springStrength * dt                      // shape pull
v += curlNoise(pos * noiseScale + time * noiseSpeed)     // flow
       * noiseStrength * dt
d = pos - cursorPoint; r = length(d)                      // cursor push
if (r < cursorRadius) v += normalize(d) * cursorPush * pow(1 - r/cursorRadius, 2) * dt
v += vec3(0, gravity, 0) * dt                            // optional
v *= pow(damping, dt * 60)
v = clampLength(v, maxSpeed)
```

**Position shader:** `pos += v * dt`.

- Use a proper 3D simplex noise and its curl. Put both in `noise.glsl`.
- Cap `dt` at 1/30 s so tab switches don't explode the simulation.

### Cursor

- Cast a ray from the camera through the mouse. The cursor point is where the ray meets a plane through the cloud's center, facing the camera.
- Ease the cursor point toward the new hit, so fast mouse moves leave a wake.
- Track cursor velocity, and add an optional "drag" setting: particles near the cursor also pick up some of its velocity.
- On touch, use the touch point. With no pointer, push strength fades to 0 over 300 ms.

### Rendering

- `THREE.Points` with a custom `ShaderMaterial` that reads position from the simulation texture.
- **Sprite shapes** (setting): soft dot (Gaussian falloff), hard dot, square, ring.
- **Size:** base size × (0.6 + seed × variation) × perspective attenuation, clamped to a min and max pixel size.
- **Color modes** (setting):
  - **Solid:** one color.
  - **Gradient by speed:** slow = color A, fast = color B.
  - **Gradient by depth.**
  - **Source colors:** from an image or model.
- Brightness can exceed 1 so bloom picks it up.
- **Blending** (setting): additive (default) or normal. Use additive for glowing looks and normal for the tile wall.
- **Sparkle** (setting): a fraction of particles twinkle in brightness over time, keyed by seed.

### Post

- `EffectComposer` running RenderPass → UnrealBloomPass (strength, radius, threshold) → AfterimagePass (trail amount, 0 = off) → a custom finishing pass → OutputPass.
- The finishing pass does film grain, vignette, slight chromatic aberration at the edges, and exposure.
- Tone mapping is ACES Filmic.

### Camera

- Perspective, FOV 35–50 (setting).
- Mouse parallax: the camera eases a small amount toward the cursor (setting).
- Optional slow auto-orbit.
- "Orbit mode" switch enables `OrbitControls` for inspection. When it's on, cursor push turns off.

### Loop

- Pause when the tab is hidden.
- Cap pixel ratio at 2 (setting: 1, 1.5 or 2).
- FPS and particle count readout in the panel.
- Auto quality: if average FPS stays under 40 for 3 seconds, drop the particle count one step and show a dismissible notice. Setting: on/off.

### Phase 1 checks

1. 65k particles hold a sphere, drift with noise, and part around the cursor, then flow back.
2. Every simulation, rendering, bloom and camera setting is in the panel and changes live.
3. 60 fps at Medium on a recent laptop.

---

## 2. Phase 2: shapes, morphing and HUD

### Shapes

Every shape is a sampler that returns exactly N points (N = particle count), centered and scaled to a unit radius, plus optional per-point colors. Cache the results per shape and per N.

**Primitives** (surface or volume, setting):

- Sphere
- Torus knot (p, q)
- Triangular prism ring: three bars forming a triangle, original proportions
- Cube lattice
- Ring
- Wave plane
- Spiral galaxy

**Attractors:** integrate in JavaScript once, skip the first 1,000 steps, keep N points along the path, then normalize.

- Lorenz: dx = σ(y − x), dy = x(ρ − z) − y, dz = xy − βz, with σ 10, ρ 28, β 8/3.
- Aizawa:
  - dx = (z − b)x − dy
  - dy = dx + (z − b)y
  - dz = c + az − z³/3 − (x² + y²)(1 + ez) + fzx³
  - with a 0.95, b 0.7, c 0.6, d 3.5, e 0.25, f 0.1. In the dx and dy lines, d is the constant 3.5.
- Thomas: dx = sin y − bx, dy = sin z − by, dz = sin x − bz, with b 0.208186.

**Text:**

- Draw the string in a bold font on a 2D canvas and sample filled pixels.
- Add depth jitter (setting) so it reads as a slab, not a flat sheet.
- Use it for project names and marks.

**Image:**

- The user uploads a picture, or one comes from `public/`.
- Sample N pixels weighted by brightness (setting).
- Points lie on a plane with depth from brightness (setting), and each takes its pixel's color.
- This powers the Data painting and Tile wall looks.

**Model:**

- Load a `.glb` (upload or `public/`). `MeshSurfaceSampler` gives points and colors from vertex colors or texture.

**Point assignment between shapes** (setting):

- **Random:** particles are shuffled, so they cross paths and scatter dramatically.
- **Sorted:** both shapes' points are sorted by height, then angle, so particles travel shorter paths and the morph is cleaner.

### Morph

- Keep two target textures, `from` and `to`, and a morph start time.
- Per particle:
  - `delay = seed * stagger`
  - `p = clamp((time - start - delay) / duration, 0, 1)`
  - `target = mix(from, to, easeInOut(p))`
- **Dissolve:** while `p` is between 0 and 1, add `sin(π·p) * scatter` to the noise strength and a small outward impulse from the center. Particles visibly break apart and reassemble.
- Settings:
  - Duration: 0.4–4 s
  - Stagger: 0–1 s
  - Scatter: 0–5
  - Assignment mode
  - Easing: in-out cubic, expo or back
- A morph started during another morph begins from the particles' current blended targets. Render the current target into `from` first.

### HUD

Real HTML and SVG over the canvas, styled with tokens: color, line color, accent and font.

- **Fonts:**
  - A clean mono for tiny text, for example JetBrains Mono or IBM Plex Mono from Google Fonts.
  - A light, wide display face for project names.
- **Top-left:** `[ NAV ]` and `[ INDEX ]` bracket labels. WORK / ABOUT / CONTACT as buttons. ABOUT and CONTACT open small HUD panels with placeholder text. The project index list highlights the active project.
- **Project card:**
  - Tag line in boxed segments: `PRJ_01 | 3D IDENTITY | 2026`.
  - Large project name.
  - `→ VIEW PROJECT` link, which takes its URL from the project config.
- **Leader line:**
  - An SVG polyline from a point on the cloud to the card: a diagonal segment, then a horizontal one.
  - The anchor is the cloud's bounding sphere projected to screen, at about 45° up and right of center. It updates every frame and eases.
- **Previous / next chevrons** (`«` `»`) at mid-height on the left and right.
- **Bottom right:** live cursor readout `X 0.530 · Y 0.425` (normalized, three decimals), and a clock `HH:MM:SS` with a city label (setting, default `ST. PAUL`).
- **Left edge:** a thin vertical progress tick showing position in the project list.
- **Decode transition** (on project change):
  - Over 500–900 ms (setting), each character position in the name passes through white solid blocks (█ ▓ ▒) and random glyphs from `A–Z 0–9 / \ < > _ |`, then resolves, left to right with jitter.
  - The tag line does the same, shorter.
  - Glyph set and duration are settings.
- **Floating fragments** (setting: off / few / many):
  - Corner-bracket reticles, × marks, diagonal hatch blocks, tiny lorem-free text blocks, made from project data, coordinates and timestamps.
  - Scattered at three depths with mouse parallax. They fade in on project change and drift slowly.
  - All motifs are original SVG.
- **HUD style presets:**
  - **Courtyard:** thin white lines on dark.
  - **Fog:** dark grey lines on pale.
  - **Minimal:** only the name and readouts.
- **HUD opacity** setting, plus a hide-HUD key (`U`).

### Navigation

- `←` `→` keys, chevrons, index list clicks, mouse wheel (debounced, one project per gesture), and swipe on touch.
- Each change triggers the morph and the decode.
- Wrap around at the ends.

### Phase 2 checks

1. Arrow keys cycle all projects. Particles dissolve and reassemble into each shape, and the name decodes.
2. The leader line tracks the cloud while it moves and stays attached during morphs.
3. A screen reader announces each new project name once.
4. Text, image and model shapes all load and morph.

---

## 3. Phase 3: environments and atmosphere

The background is a swappable layer, with one active at a time (setting: Void / 360 photo / 3D scene). Splat is added in phase 4.

**Void:**

- Solid color or vertical gradient (two colors).
- `FogExp2` with color and density settings, applied to the particles too via a fog-aware point shader.

**360 photo:**

- Equirectangular JPG, PNG, HDR or EXR, from upload or `public/env/`.
- Shown as the background. HDR and EXR also set `scene.environment` for lighting.
- Settings:
  - Rotation
  - Blur (background blurriness)
  - Brightness
  - Tint
  - Fog over it: a fullscreen haze plane with density

**3D scene:**

- A `.glb` environment, from upload or `public/env/`.
- If the materials have baked lightmaps, render them unlit (`MeshBasicMaterial` with the map), keeping the bake as authored.
- Settings: scale, position offset, brightness, and the camera start position (save the camera from Orbit mode into the setting).
- Document in the README how to bake in Blender Cycles and export a `.glb`.

**Atmosphere add-ons** (each with an on/off switch and settings, working on any background):

- **Particle band:** a second, cheaper particle system of 5–20k points in a thin, wide horizontal band at about eye height, slowly drifting, with its own color and glow. This is the Black Flag horizon.
- **Light shaft:**
  - A cone or box mesh from above with an additive shader: scrolling noise, soft edges, fresnel falloff.
  - Settings: position, angle, width, color, intensity.
  - A point light at the cloud's center pulses gently with particle density, so it seems to light nearby objects in 3D scenes.
- **Dust:** sparse, slow, larger soft particles throughout the scene. Some are out of focus as big bokeh discs (size by distance from a focus depth setting).
- **Reflective floor:**
  - `Reflector` plane under the cloud, mixed with a dark rough base.
  - A normal-map ripple gives a wet look.
  - Settings: height, reflectivity, ripple.

### Phase 3 checks

1. A 360 JPG and an HDR both load from upload and display. The HDR changes the scene's lighting.
2. Each atmosphere add-on works on Void and on 360 photo.
3. A `.glb` scene loads and the particles sit inside it.
4. Medium count still runs at 50+ fps with band, shaft, dust and floor all on.

---

## 4. Phase 4: Gaussian splats

- Add Spark (sparkjs.dev). It works with `WebGLRenderer` and supports PLY, SPZ, SPLAT, KSPLAT and SOG.
- New background option: **Splat**. Load from upload or `public/env/`, with settings for position, rotation, scale and brightness.
- **Shape source "Splat":** take N splat centers and their colors as particle targets, so the particles assemble into the scanned place or object.
  - Check whether Spark exposes splat data directly.
  - If it doesn't, parse the `.ply` file separately for positions and colors (standard 3DGS PLY: x, y, z, f_dc_0..2 → color = 0.5 + 0.282095 × f_dc).
- **Dissolve into particles** (the signature transition):
  - The splat background fades out while particles spawn at the splat's own points and colors.
  - Those particles then morph into the active project shape.
  - Reverse on demand.
- Show a file-size warning for uploads over 100 MB. Document recommended compressed formats and capture apps (Polycam, Luma AI) in the README.

### Phase 4 check

A phone-captured splat loads, displays, dissolves into particles, and the particles form the active project shape.

---

## 5. Phase 5: capture and extras

- **Record video:**
  - `canvas.captureStream(60)` + `MediaRecorder` to WebM (VP9 where supported).
  - Settings: duration (5–30 s), whether the HUD is included (if on, composite the HUD by rendering it to the canvas, or note that HUD is excluded).
  - Start and stop button, countdown, then download.
- **Snapshot:** PNG at 1× or 2× resolution, with an option for a transparent background (void only).
- **Autoplay mode:** cycles projects every N seconds with no UI. Good for screen recordings and kiosks.
- **Randomize:** button in the panel that randomizes within each setting's "safe range" from the schema. Never touches particle count or files.
- **Share link:** encode the current settings as a compressed URL hash (`#s=...`) and load it on open. Files (images, models, splats) aren't included; say so in the panel.

---

## 6. Interaction summary

| Input | Action |
|---|---|
| Mouse move | Cursor push, camera parallax, HUD readout |
| Mouse wheel / swipe | Next or previous project |
| ← / → | Previous or next project |
| Click chevrons or index item | Go to that project |
| H | Hide or show the control panel |
| U | Hide or show the HUD |
| O | Toggle orbit mode |
| R | Randomize |
| Space | Pause or resume the simulation |

---

## 7. Settings schema and control panel

- Every setting has: `key`, `label`, `section`, `type` (range / select / toggle / color / file / button), `min`, `max`, `step`, `default`, `safeMin`/`safeMax` for randomize, and an optional `rebuild: true` for settings that need a simulation rebuild.
- **Panel:** a docked right column, its own scroll, collapsible sections. Each range shows its value. Built entirely from the schema.
- **Sections:**
  - Style
  - Particles
  - Forces
  - Cursor
  - Shape & Morph
  - Color
  - Glow & Post
  - Camera
  - Background
  - Atmosphere
  - HUD
  - Performance
  - Capture
  - Settings
- **Settings section:**
  - Copy settings (JSON to clipboard, with a select-text fallback)
  - Paste settings (from a textarea)
  - Reset to preset
  - Save to browser (automatic, localStorage, wrapped in try/catch)
  - Share link
- Panel styling matches the HUD tokens so it feels part of the piece. It can also be detached into a floating, draggable window.

**Key settings and ranges** (defaults are the Night courtyard preset):

| Section | Setting | Range | Default |
|---|---|---|---|
| Particles | Count | Low / Medium / High / Ultra | Medium |
| Particles | Size | 0.5–8 px | 2 |
| Particles | Size variation | 0–1 | 0.5 |
| Particles | Sprite | soft / hard / square / ring | soft |
| Particles | Sparkle | 0–1 | 0.2 |
| Forces | Shape pull | 0–20 | 6 |
| Forces | Noise strength | 0–10 | 1.2 |
| Forces | Noise scale | 0.1–5 | 1.2 |
| Forces | Noise speed | 0–2 | 0.25 |
| Forces | Damping | 0.8–0.999 | 0.94 |
| Forces | Max speed | 0.5–20 | 6 |
| Forces | Gravity | −2 to 2 | 0 |
| Cursor | Radius | 0–2 (world units) | 0.6 |
| Cursor | Push | 0–50 | 18 |
| Cursor | Drag along | 0–1 | 0.3 |
| Shape & Morph | Duration | 0.4–4 s | 1.6 |
| Shape & Morph | Stagger | 0–1 s | 0.5 |
| Shape & Morph | Scatter | 0–5 | 2 |
| Shape & Morph | Assignment | random / sorted | random |
| Color | Mode | solid / speed / depth / source | speed |
| Color | Color A / B | color | #cfd8e6 / #ffffff |
| Color | Intensity | 0.2–4 | 1.6 |
| Color | Blending | additive / normal | additive |
| Glow & Post | Bloom strength | 0–3 | 1.1 |
| Glow & Post | Bloom radius | 0–1 | 0.6 |
| Glow & Post | Bloom threshold | 0–1 | 0.15 |
| Glow & Post | Trails | 0–0.98 | 0 |
| Glow & Post | Grain | 0–0.3 | 0.06 |
| Glow & Post | Vignette | 0–1 | 0.45 |
| Glow & Post | Aberration | 0–0.01 | 0.0015 |
| Camera | FOV | 30–70 | 40 |
| Camera | Parallax | 0–1 | 0.25 |
| Camera | Auto-orbit speed | 0–0.5 | 0.05 |

---

## 8. Style presets

A preset sets every visual setting at once. Files (360 photos, models, splats) are referenced by path in `public/env/` and skipped if missing.

1. **Night courtyard**
   - Dark void (#05070a → #0d1117), white-blue particles, additive, strong bloom.
   - Light shaft from above, dust on, reflective floor on, fog light.
   - Courtyard HUD.
   - The look of the portfolio reference, without its environment.
2. **Animus fog**
   - Pale void (#dfe7ee → #b9c7d3), dense fog (#cdd8e1).
   - Particles in soft white-grey with normal blending and low bloom; they read through the fog as brighter specks.
   - Floating fragments set to many, Fog HUD (dark lines), slow drift, gentle morphs.
3. **Black Flag**
   - Teal void (#0b2a2f → #1d4b50).
   - Particle band on (cyan, wide), light shaft from upper right (warm white), dust with bokeh.
   - Particles cyan-white, medium bloom. Courtyard HUD in a teal tint.
4. **Data painting**
   - Image shape source; ship one sample abstract image the build generates procedurally, with no copyrighted art.
   - Color mode "source", normal blending, High count, square sprites at small size.
   - Strong, slow curl noise (scale 0.6, speed 0.08) so the image flows like liquid paint.
   - Low bloom, no HUD fragments, Minimal HUD.
5. **Tile wall**
   - Image or grid shape on a flat plane, square sprites at a large size (6–8 px), normal blending, source colors.
   - Low noise, strong cursor push with a large radius, so moving the cursor ripples the wall.
   - Black void, no bloom.
6. **Ember**
   - Black void, orange-to-deep-red speed gradient, additive, trails 0.85.
   - Upward gravity (+0.3), high noise. Particles rise like sparks between morphs.
7. **Swarm**
   - Low shape pull (1.5), high noise and speed, small hard dots, no bloom, black and white.
   - Shapes appear only loosely, like a flock holding a formation.
8. **Splat memory** (phase 4)
   - Splat background that dissolves into particles on load.
   - Courtyard HUD.

Each preset gets a short description shown under the preset buttons.

---

## 9. Content: projects

`content/projects.js` holds the list. Each entry:

```js
{
  id: 'dither-crawl-lab',
  name: 'Dither Crawl Lab',
  tag: ['PRJ_01', 'INTERACTION', '2026'],
  url: 'https://dgbenner.github.io/dither-crawl-lab/',
  shape: { type: 'text', text: 'DCL' },   // or { type: 'attractor', name: 'aizawa' }, { type: 'model', src: '...' }
  style: null                              // optional per-project preset overrides
}
```

Seed it with Dan's own projects as placeholders, each with a distinct shape:

| Project | Shape |
|---|---|
| Dither Crawl Lab | Cube lattice |
| Waypoints Poster Grid | Wave plane |
| UX Audit Lens | Torus knot |
| WCAG Accessibility Auditor | Ring |
| LORE | Aizawa attractor |
| Isometric Atlanta | Text "ATL" |
| The Transmission Hypothesis | Lorenz attractor |

Leave URLs as `#` where none is known.

---

## 10. Performance budget

- Medium (65k) runs at 60 fps on a 2020+ laptop with integrated graphics, with bloom on. High (262k) runs at 60 fps on a discrete GPU.
- On mobile, default to Low count, pixel ratio 1.5, and trails off.
- Avoid per-frame allocations. Reuse vectors and render targets.
- Shape sampling for large N happens once and is cached. Attractor integration runs in a Web Worker if it blocks for more than 50 ms.
- Fully dispose of geometries, textures and render targets on rebuild and when switching backgrounds.

## 11. Reduced motion and accessibility

- With `prefers-reduced-motion`:
  - Auto-orbit, parallax and sparkle are off.
  - Noise speed is reduced by 75%.
  - Morphs become a 400 ms crossfade (particles fade out at the old shape and fade in at the new one) instead of travel.
  - Decode becomes an instant swap.
- The HUD and panel are real HTML with visible focus states.
- Chevrons and nav items are buttons with labels.
- The canvas has `aria-hidden="true"`, plus a visually hidden description: "Particle visualization of the current project, [name]."

---

## 12. Final acceptance checks

1. All 8 presets load and look distinct (phase 4's preset only once splats exist).
2. Every setting in the schema is in the panel and works live. Copy then paste restores an identical look.
3. Project navigation works by keyboard, wheel, swipe, chevrons and index list.
4. Uploading a 360 photo, an image, a `.glb` model and (phase 4) a splat each works.
5. Video recording produces a playable WebM of the expected length.
6. Reduced motion is respected throughout.
7. The deployed GitHub Pages build matches local, and asset paths work under `/particle-memory-lab/`.
8. The README covers:
   - Running locally
   - Adding projects
   - Adding a 360 photo
   - Baking and exporting a Blender scene
   - Capturing and adding a splat
   - Every preset

## Out of scope

Audio reactivity, VR/XR, multiplayer, CMS integration. These are good candidates after phase 5.
