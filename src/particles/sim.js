// GPU particle simulation: position and velocity live in float textures, updated by fragment shaders.
// Morph targets (from/to positions and colors) are float DataTextures the shaders blend between.

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import noiseGlsl from './shaders/noise.glsl?raw';
import easeGlsl from './shaders/ease.glsl?raw';
import velocityGlsl from './shaders/velocity.glsl?raw';
import positionGlsl from './shaders/position.glsl?raw';

const floatTex = (size) => {
  const t = new THREE.DataTexture(new Float32Array(size * size * 4), size, size, THREE.RGBAFormat, THREE.FloatType);
  t.needsUpdate = true;
  return t;
};

// xyz triples (+ optional rgb triples) → RGBA float data. Color alpha 0 means "no source color".
function fillPoints(tex, points) {
  const d = tex.image.data, n = points.length / 3;
  for (let i = 0; i < n; i++) { d[i * 4] = points[i * 3]; d[i * 4 + 1] = points[i * 3 + 1]; d[i * 4 + 2] = points[i * 3 + 2]; d[i * 4 + 3] = 1; }
  tex.needsUpdate = true;
}
function fillColors(tex, colors) {
  const d = tex.image.data, n = d.length / 4;
  if (!colors) { d.fill(0); tex.needsUpdate = true; return; }
  if (colors.length === n * 4) d.set(colors);
  else for (let i = 0; i < n; i++) { d[i * 4] = colors[i * 3]; d[i * 4 + 1] = colors[i * 3 + 1]; d[i * 4 + 2] = colors[i * 3 + 2]; d[i * 4 + 3] = 1; }
  tex.needsUpdate = true;
}

export function createSim(renderer, size, shape) {
  const n = size * size;
  const gpu = new GPUComputationRenderer(size, size, renderer);

  const from = floatTex(size), to = floatTex(size), colFrom = floatTex(size), colTo = floatTex(size);
  fillPoints(from, shape.points); fillPoints(to, shape.points);
  fillColors(colFrom, shape.colors); fillColors(colTo, shape.colors);

  // Start scattered around the shape so the first frames show it gathering. Seed goes in .w.
  const seeds = new Float32Array(n);
  const pos0 = gpu.createTexture();
  const vel0 = gpu.createTexture();
  const p = pos0.image.data;
  for (let i = 0; i < n; i++) {
    seeds[i] = Math.random();
    p[i * 4] = shape.points[i * 3] * 1.6 + (Math.random() - 0.5) * 0.6;
    p[i * 4 + 1] = shape.points[i * 3 + 1] * 1.6 + (Math.random() - 0.5) * 0.6;
    p[i * 4 + 2] = shape.points[i * 3 + 2] * 1.6 + (Math.random() - 0.5) * 0.6;
    p[i * 4 + 3] = seeds[i];
  }

  const posVar = gpu.addVariable('texturePosition', positionGlsl, pos0);
  const velVar = gpu.addVariable('textureVelocity', noiseGlsl + '\n' + easeGlsl + '\n' + velocityGlsl, vel0);
  gpu.setVariableDependencies(posVar, [posVar, velVar]);
  gpu.setVariableDependencies(velVar, [posVar, velVar]);

  const vu = velVar.material.uniforms;
  Object.assign(vu, {
    uTime: { value: 0 }, uDt: { value: 0 }, uPull: { value: 0 },
    uNoiseStrength: { value: 0 }, uNoiseScale: { value: 1 }, uNoiseSpeed: { value: 0 },
    uDamping: { value: 0.94 }, uMaxSpeed: { value: 6 }, uGravity: { value: 0 },
    uCursor: { value: new THREE.Vector3() }, uCursorVel: { value: new THREE.Vector3() },
    uCursorRadius: { value: 0 }, uCursorPush: { value: 0 }, uCursorDrag: { value: 0 },
    uFrom: { value: from }, uTo: { value: to },
    uMorphStart: { value: -1e6 }, uMorphDur: { value: 1.6 }, uStagger: { value: 0.5 },
    uScatter: { value: 0 }, uBurst: { value: 0 }, uEase: { value: 0 },
    uSettle: { value: 0 }, uSettleTime: { value: 2.5 },
  });
  const pu = posVar.material.uniforms;
  pu.uDt = { value: 0 };

  const err = gpu.init();
  if (err) throw new Error(err);

  const scratch = gpu.createTexture();

  return {
    size,
    count: n,
    seeds,
    uniforms: vu,
    textures: { from, to, colFrom, colTo },
    step(dt, time) {
      vu.uDt.value = dt;
      vu.uTime.value = time;
      pu.uDt.value = dt;
      gpu.compute();
    },
    // New morph: targets go from `fromPts` to `toPts`, starting at sim time `start`.
    setTargets(fromPts, toPts, fromCols, toCols, start) {
      fillPoints(from, fromPts); fillPoints(to, toPts);
      fillColors(colFrom, fromCols); fillColors(colTo, toCols);
      vu.uMorphStart.value = start;
    },
    // Place every particle on `points` at rest (used by the reduced-motion crossfade).
    teleport(points) {
      const d = scratch.image.data;
      for (let i = 0; i < n; i++) { d[i * 4] = points[i * 3]; d[i * 4 + 1] = points[i * 3 + 1]; d[i * 4 + 2] = points[i * 3 + 2]; d[i * 4 + 3] = seeds[i]; }
      scratch.needsUpdate = true;
      gpu.renderTexture(scratch, posVar.renderTargets[0]);
      gpu.renderTexture(scratch, posVar.renderTargets[1]);
      d.fill(0);
      scratch.needsUpdate = true;
      gpu.renderTexture(scratch, velVar.renderTargets[0]);
      gpu.renderTexture(scratch, velVar.renderTargets[1]);
    },
    get positionTexture() { return gpu.getCurrentRenderTarget(posVar).texture; },
    get velocityTexture() { return gpu.getCurrentRenderTarget(velVar).texture; },
    // Debug/test only: copy current positions back to the CPU (slow; never call per frame).
    readPositions() {
      const out = new Float32Array(n * 4);
      renderer.readRenderTargetPixels(gpu.getCurrentRenderTarget(posVar), 0, 0, size, size, out);
      return out;
    },
    dispose() {
      gpu.dispose();
      [from, to, colFrom, colTo, pos0, vel0, scratch].forEach((t) => t.dispose());
    },
  };
}
