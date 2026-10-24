// Boot, resize, loop, visibility pause.

import './style.css';
import * as THREE from 'three';
import { S, set, load, onChange } from './settings/store.js';
import { COUNTS } from './settings/schema.js';
import { createRenderer, pixelRatioFor } from './engine/renderer.js';
import { createCamera } from './engine/camera.js';
import { createPost } from './engine/post.js';
import { createSim } from './particles/sim.js';
import { createPoints, SPRITES, COLOR_MODES } from './particles/render.js';
import { createCursor } from './particles/cursor.js';
import { createVoid } from './environment/void.js';
import { sphere } from './shapes/primitives.js';
import { createPanel } from './panel/panel.js';

const canvas = document.getElementById('gl');
const panelEl = document.getElementById('panel');
const showBtn = document.getElementById('panel-show');
const notice = document.getElementById('notice');

const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => rmq.matches;
const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;

// Settings: restore, or on a first visit pick lighter defaults for phones.
if (!load() && mobile) set({ count: 'low', pixelRatio: '1.5', trails: 0 }, 'boot');
if (mobile && S.count === 'ultra') set({ count: 'high' }, 'boot');

const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const cam = createCamera(canvas);
const post = createPost(renderer, scene, cam.camera);
const cursor = createCursor(cam.camera, canvas);
const bg = createVoid();
scene.add(bg.mesh);

// Simulation + points, rebuilt when the count changes.
const shapeCache = new Map();
const shapeFor = (n) => { if (!shapeCache.has(n)) shapeCache.set(n, sphere(n)); return shapeCache.get(n); };
let sim = null, pts = null;
function build() {
  if (pts) { scene.remove(pts.points); pts.dispose(); }
  if (sim) sim.dispose();
  const size = COUNTS[S.count];
  sim = createSim(renderer, size, shapeFor(size * size));
  pts = createPoints(sim);
  scene.add(pts.points);
  quality.reset();
}

// Auto quality: if the frame rate stays under 40 for 3 s, step the count down once and say so.
const ORDER = ['low', 'medium', 'high', 'ultra'];
const quality = {
  lowSince: 0, grace: 0,
  reset() { this.lowSince = 0; this.grace = performance.now() + 2000; },
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

const panel = createPanel(panelEl, {
  onAction: (a) => { if (a === 'hide') togglePanel(false); },
  disabledOptions: mobile ? { count: ['ultra'] } : {},
});
function togglePanel(show = panelEl.hidden) {
  panelEl.hidden = !show;
  showBtn.hidden = show;
  (show ? panelEl.querySelector('.panel-head button') : showBtn).focus({ preventScroll: true });
}
showBtn.addEventListener('click', () => togglePanel(true));

onChange((keys) => {
  if (keys.includes('count')) build();
  if (keys.includes('pixelRatio')) resize();
  if (keys.includes('blending') && pts) {
    pts.material.blending = S.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
    pts.material.needsUpdate = true;
  }
});

function resize() {
  const w = window.innerWidth, h = window.innerHeight, pr = pixelRatioFor();
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  post.setSize(w, h, pr);
  cam.setAspect(w / h);
}
window.addEventListener('resize', resize);

// Keyboard: H panel, O orbit mode, Space pause. Ignored while typing in a field.
let paused = false;
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t.matches?.('textarea, select, input:not([type=range]):not([type=checkbox])')) return;
  const k = e.key.toLowerCase();
  if (k === 'h') togglePanel();
  else if (k === 'o') set({ orbitMode: !S.orbitMode });
  else if (k === ' ' && !t.matches?.('button, input')) { paused = !paused; e.preventDefault(); }
});

// Per-frame: push settings into uniforms (cheap) so every control is live.
function applyUniforms(dt) {
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
}

let last = performance.now(), simTime = 0, running = true;
let fpsFrames = 0, fpsSince = last;
function frame(now) {
  if (!running) return;
  const raw = (now - last) / 1000;
  const dt = Math.min(1 / 30, Math.max(0, raw));
  last = now;

  cam.update(dt, cursor.ndc, reduced());
  cursor.update(dt);
  bg.update();
  applyUniforms(dt);
  if (!paused) {
    simTime += dt;
    sim.step(dt, simTime);
  }
  pts.material.uniforms.uTime.value = simTime;
  pts.material.uniforms.texturePosition.value = sim.positionTexture;
  pts.material.uniforms.textureVelocity.value = sim.velocityTexture;
  post.render(now / 1000);

  fpsFrames++;
  if (now - fpsSince >= 500) {
    const fps = (fpsFrames * 1000) / (now - fpsSince);
    panel.readout(fps, sim.count);
    quality.check(fps, now);
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
build();
pts.material.blending = S.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
requestAnimationFrame((t) => { last = t; fpsSince = t; frame(t); });

// Test hook for automated checks; harmless in normal use.
window.__pml = { S, set, renderer, cursor, get sim() { return sim; } };
