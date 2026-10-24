// Boot, resize, loop, visibility pause, navigation.

import './style.css';
import * as THREE from 'three';
import { S, set, load, onChange } from './settings/store.js';
import { COUNTS, BY_KEY } from './settings/schema.js';
import { presetValues, PRESETS, recipeIndex } from './settings/presets.js';
import { createRenderer, pixelRatioFor } from './engine/renderer.js';
import { createCamera } from './engine/camera.js';
import { createPost } from './engine/post.js';
import { createSim } from './particles/sim.js';
import { createPoints, SPRITES, COLOR_MODES } from './particles/render.js';
import { createCursor } from './particles/cursor.js';
import { createMorph, EASES } from './particles/morph.js';
import { createVoid } from './environment/void.js';
import { getShape, specFor, setImage, setModel } from './shapes/index.js';
import { loadModel } from './shapes/model.js';
import { createHud } from './hud/hud.js';
import { createPanel } from './panel/panel.js';

const canvas = document.getElementById('gl');
const panelEl = document.getElementById('panel');
const showBtn = document.getElementById('panel-show');
const notice = document.getElementById('notice');
const announceEl = document.getElementById('announce');
const descEl = document.getElementById('gl-desc');

const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => rmq.matches;
const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;

// Settings: restore, or on a first visit start from the default preset (lighter on phones).
if (!load()) {
  set(presetValues(S.preset), 'boot');
  if (mobile) set({ count: 'low', pixelRatio: '1.5', trails: 0 }, 'boot');
}
if (mobile && S.count === 'ultra') set({ count: 'high' }, 'boot');

const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const cam = createCamera(canvas);
const post = createPost(renderer, scene, cam.camera);
const cursor = createCursor(cam.camera, canvas);
const bg = createVoid();
scene.add(bg.mesh);

// The list on the left: one entry per recipe, with its title-card tag line and full settings.
const RECIPES = PRESETS.map((p, i) => {
  const values = presetValues(p.id);
  const shape = BY_KEY.shapeSource.options.find(([v]) => v === values.shapeSource)?.[1] || '';
  return { ...p, values, tag: [`RCP_${String(i + 1).padStart(2, '0')}`, p.mood.join(' · '), shape.toUpperCase()] };
});
let index = recipeIndex(S.preset);

// Simulation + points + morph, rebuilt when the count changes.
let sim = null, pts = null, morph = null, buildToken = 0;
async function build() {
  const token = ++buildToken;
  const size = COUNTS[S.count];
  const shape = await getShape(specFor(), size * size);
  if (token !== buildToken) return;
  if (pts) { scene.remove(pts.points); pts.dispose(); }
  if (sim) sim.dispose();
  sim = createSim(renderer, size, shape);
  pts = createPoints(sim);
  pts.material.blending = S.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
  morph = createMorph(sim, shape);
  scene.add(pts.points);
  quality.reset();
  precache();
}

// Sample every recipe's shape at this count ahead of time, one per idle slot, so switching never waits.
let precacheToken = 0;
function precache() {
  const token = ++precacheToken, n = sim.count;
  const queue = RECIPES.map((r) => specFor(r.values.shapeSource));
  const next = () => {
    if (token !== precacheToken || !queue.length) return;
    const spec = queue.shift();
    getShape(spec, n).finally(() => setTimeout(next, 120));
  };
  setTimeout(next, 800);
}

// Morph to the current Shape setting.
let morphToken = 0;
const fade = { phase: null, t0: 0, shape: null };
async function morphToCurrent() {
  if (!sim) return;
  const token = ++morphToken;
  const shape = await getShape(specFor(), sim.count);
  if (token !== morphToken || !sim || shape.points.length !== sim.count * 3) return;
  if (reduced()) {
    // Reduced motion: a 400 ms crossfade instead of travel.
    fade.phase = 'out'; fade.t0 = performance.now(); fade.shape = shape;
  } else {
    morph.to(shape, simTime);
  }
}

// Switch recipe: apply its settings, decode its name, morph to its shape.
function go(i, { apply = true } = {}) {
  const n = RECIPES.length;
  index = ((i % n) + n) % n;
  const r = RECIPES[index];
  hud.setRecipe(index, { instant: reduced() });
  announceEl.textContent = apply ? `${r.name}, recipe ${index + 1} of ${n}` : '';
  descEl.textContent = `Particle visualization of the current recipe, ${r.name}: ${r.description}`;
  if (apply) {
    set(r.values, 'recipe');
    clearTimeout(reshapeTimer);
    morphToCurrent();
  }
}

// Auto quality: if the frame rate stays under 40 for 3 s, step the count down once and say so.
const ORDER = ['low', 'medium', 'high', 'ultra'];
const quality = {
  lowSince: 0, grace: 0,
  reset() { this.lowSince = 0; this.grace = performance.now() + 2500; },
  check(fps, now) {
    if (!S.autoQuality || now < this.grace) return;
    if (fps >= 40) { this.lowSince = 0; return; }
    if (!this.lowSince) { this.lowSince = now; return; }
    if (now - this.lowSince < 3000) return;
    const i = ORDER.indexOf(S.count);
    if (i <= 0) return;
    set({ count: ORDER[i - 1] }, 'auto');
    showNotice(`Frame rate was low, so the count dropped to ${ORDER[i - 1]}. You can raise it again under Particles.`);
  },
};
function showNotice(text) { notice.querySelector('span').textContent = text; notice.hidden = false; }
notice.querySelector('button').addEventListener('click', () => (notice.hidden = true));

// File uploads from the panel
async function onFile(key, file, report) {
  try {
    if (key === 'imageFile') {
      const bmp = await createImageBitmap(file);
      setImage(bmp, `${file.name}:${file.size}:${file.lastModified}`);
      report('Loaded ' + file.name);
      if (S.shapeSource !== 'image' && S.shapeSource !== 'imageGrid') set({ shapeSource: 'image' });
      else morphToCurrent();
    } else if (key === 'modelFile') {
      report('Loading…');
      const m = await loadModel(file);
      setModel(m, `${file.name}:${file.size}:${file.lastModified}`);
      report('Loaded ' + file.name);
      if (S.shapeSource !== 'model') set({ shapeSource: 'model' });
      else morphToCurrent();
    }
  } catch (e) {
    report('Couldn’t read that file');
    console.warn(e);
  }
}

const panel = createPanel(panelEl, {
  onAction: (a, ...args) => {
    if (a === 'hide') togglePanel(false);
    if (a === 'file') onFile(...args);
    if (a === 'recipe') go(recipeIndex(args[0]));
  },
  disabledOptions: mobile ? { count: ['ultra'] } : {},
});
function togglePanel(show = panelEl.hidden) {
  panelEl.hidden = !show;
  showBtn.hidden = show;
  (show ? panelEl.querySelector('.panel-head button') : showBtn).focus({ preventScroll: true });
}
showBtn.addEventListener('click', () => togglePanel(true));

const hudEl = document.getElementById('hud');
const hud = createHud(hudEl, {
  recipes: RECIPES,
  onSelect: (i) => go(i),
  onStep: (d) => go(index + d),
});

// Settings that change the current shape re-morph to it (sliders settle first).
const SHAPE_KEYS = ['shapeSource', 'shapeFill', 'torusP', 'torusQ', 'textString', 'textDepth', 'imageWeight', 'imageDepth', 'assignment'];
let reshapeTimer = 0;
onChange((keys, source) => {
  if (keys.includes('count')) build();
  else if (source !== 'recipe' && keys.some((k) => SHAPE_KEYS.includes(k))) { clearTimeout(reshapeTimer); reshapeTimer = setTimeout(morphToCurrent, 160); }
  if (keys.includes('pixelRatio')) resize();
  if (keys.includes('blending') && pts) {
    pts.material.blending = S.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
    pts.material.needsUpdate = true;
  }
  if (keys.includes('fragments')) hud.rebuildFragments();
});

// The docked panel takes the right 300px on desktop; the cloud, card and chevrons stay in the open area.
function panelWidth() {
  if (panelEl.hidden || panelEl.classList.contains('floating') || innerWidth <= 640) return 0;
  return panelEl.offsetWidth;
}
let lastPanelW = -1;
function syncPanelWidth() {
  const w = panelWidth();
  if (w === lastPanelW) return;
  lastPanelW = w;
  document.documentElement.style.setProperty('--panel-w', w + 'px');
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight, pr = pixelRatioFor();
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  post.setSize(w, h, pr);
  cam.setAspect(w / h);
}
window.addEventListener('resize', resize);

// Keyboard: ← → projects, H panel, U HUD, O orbit mode, Space pause. Ignored while typing in a field.
let paused = false;
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t.matches?.('textarea, select, input:not([type=checkbox]):not([type=range])')) return;
  const inRange = t.matches?.('input[type=range]');
  const k = e.key.toLowerCase();
  if ((k === 'arrowleft' || k === 'arrowright') && !inRange) { go(index + (k === 'arrowright' ? 1 : -1)); e.preventDefault(); }
  else if (k === 'h') togglePanel();
  else if (k === 'u') hudEl.hidden = !hudEl.hidden;
  else if (k === 'o') set({ orbitMode: !S.orbitMode });
  else if (k === 'escape') hud.closePops();
  else if (k === ' ' && !t.matches?.('button, input, a')) { paused = !paused; e.preventDefault(); }
});

// Wheel: one project per gesture. Trackpad momentum keeps the lock until the events stop.
let wheelAcc = 0, wheelLocked = false, wheelTimer = 0;
window.addEventListener('wheel', (e) => {
  if (e.target.closest?.('#panel, .hud-pop') || S.orbitMode) return;
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => { wheelLocked = false; wheelAcc = 0; }, 220);
  if (wheelLocked) return;
  wheelAcc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (Math.abs(wheelAcc) > 40) { go(index + Math.sign(wheelAcc)); wheelLocked = true; }
}, { passive: true });

// Swipe on touch
let swipe = null;
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') swipe = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!swipe || e.pointerType !== 'touch') return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, dt = performance.now() - swipe.t;
  swipe = null;
  if (dt < 700 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
});

// Per-frame: push settings into uniforms (cheap) so every control is live.
function applyUniforms() {
  const u = sim.uniforms, rm = reduced();
  u.uPull.value = S.pull;
  u.uNoiseStrength.value = S.noiseStrength;
  u.uNoiseScale.value = S.noiseScale;
  u.uNoiseSpeed.value = S.noiseSpeed * (rm ? 0.25 : 1);
  u.uDamping.value = S.damping;
  u.uMaxSpeed.value = S.maxSpeed;
  u.uGravity.value = S.gravity;
  u.uCursor.value.copy(cursor.point);
  u.uCursorVel.value.copy(cursor.vel);
  u.uCursorRadius.value = S.cursorRadius;
  u.uCursorPush.value = S.orbitMode ? 0 : S.cursorPush * cursor.strength;
  u.uCursorDrag.value = S.orbitMode ? 0 : S.cursorDrag * cursor.strength;
  u.uMorphDur.value = S.morphDuration;
  u.uStagger.value = S.morphStagger;
  u.uScatter.value = S.morphScatter;
  u.uBurst.value = S.morphBurst;
  u.uEase.value = EASES[S.morphEase];
  u.uSettle.value = S.settle;
  u.uSettleTime.value = S.settleTime;

  const m = pts.material.uniforms;
  m.uSize.value = S.size;
  m.uSizeVar.value = S.sizeVar;
  m.uSizeMin.value = S.sizeMin;
  m.uSizeMax.value = S.sizeMax;
  m.uPixelRatio.value = renderer.getPixelRatio();
  m.uRefDist.value = S.distance;
  m.uSparkle.value = rm ? 0 : S.sparkle;
  m.uIntensity.value = S.intensity;
  m.uSpeedRange.value = S.speedRange;
  m.uDepthRange.value = S.depthRange;
  m.uColorMode.value = COLOR_MODES[S.colorMode];
  m.uColorA.value.set(S.colorA);
  m.uColorB.value.set(S.colorB);
  m.uSprite.value = SPRITES[S.sprite];
  m.uOpacity.value = S.opacity;
  m.uMorphStart.value = u.uMorphStart.value;
  m.uMorphDur.value = S.morphDuration;
  m.uStagger.value = S.morphStagger;
  m.uEase.value = EASES[S.morphEase];
}

// Reduced-motion crossfade: fade out at the old shape, swap, fade in at the new one.
function stepFade(now) {
  if (!fade.phase) return 1;
  const t = (now - fade.t0) / 200;
  if (fade.phase === 'out') {
    if (t < 1) return 1 - t;
    if (fade.shape.points.length === sim.count * 3) morph.jump(fade.shape, { teleport: true });
    fade.phase = 'in'; fade.t0 = now;
    return 0;
  }
  if (t < 1) return t;
  fade.phase = null;
  return 1;
}

let last = performance.now(), simTime = 0, running = true;
let fpsFrames = 0, fpsSince = last;
function frame(now) {
  if (!running) return;
  const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
  last = now;

  syncPanelWidth();
  cam.frame(innerWidth, innerHeight, lastPanelW);
  cam.update(dt, cursor.ndc, reduced());
  cam.camera.updateMatrixWorld();
  if (sim) {
    cursor.update(dt);
    bg.update();
    applyUniforms();
    if (!paused) {
      simTime += dt;
      sim.step(dt, simTime);
    }
    const m = pts.material.uniforms;
    m.uTime.value = simTime;
    m.uFade.value = stepFade(now);
    m.texturePosition.value = sim.positionTexture;
    m.textureVelocity.value = sim.velocityTexture;
    post.render(now / 1000);
  }
  hud.update(cam.camera, cursor.ndc, dt, reduced());

  fpsFrames++;
  if (now - fpsSince >= 500) {
    const fps = (fpsFrames * 1000) / (now - fpsSince);
    if (sim) { panel.readout(fps, sim.count); quality.check(fps, now); }
    fpsFrames = 0;
    fpsSince = now;
  }
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { running = false; return; }
  if (running) return;
  running = true;
  last = performance.now();
  fpsFrames = 0; fpsSince = last;
  quality.reset();
  requestAnimationFrame(frame);
});

resize();
go(index, { apply: false });
build().then(() => requestAnimationFrame((t) => { last = t; fpsSince = t; frame(t); }));

// Test hook for automated checks; harmless in normal use.
window.__pml = { S, set, renderer, cursor, go, get index() { return index; }, get sim() { return sim; }, get morph() { return morph; } };
