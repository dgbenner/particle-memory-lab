// GPU particle simulation: position and velocity live in float textures, updated by fragment shaders.

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import noiseGlsl from './shaders/noise.glsl?raw';
import velocityGlsl from './shaders/velocity.glsl?raw';
import positionGlsl from './shaders/position.glsl?raw';

export function createSim(renderer, size, shapePoints) {
  const n = size * size;
  const gpu = new GPUComputationRenderer(size, size, renderer);

  // Target: the point on the current shape each particle is pulled toward.
  const targetData = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    targetData[i * 4] = shapePoints[i * 3];
    targetData[i * 4 + 1] = shapePoints[i * 3 + 1];
    targetData[i * 4 + 2] = shapePoints[i * 3 + 2];
    targetData[i * 4 + 3] = 1;
  }
  const target = new THREE.DataTexture(targetData, size, size, THREE.RGBAFormat, THREE.FloatType);
  target.needsUpdate = true;

  // Start scattered around the shape so the first frames show it gathering. Seed goes in .w.
  const pos0 = gpu.createTexture();
  const vel0 = gpu.createTexture();
  const p = pos0.image.data;
  for (let i = 0; i < n; i++) {
    p[i * 4] = targetData[i * 4] * 1.6 + (Math.random() - 0.5) * 0.6;
    p[i * 4 + 1] = targetData[i * 4 + 1] * 1.6 + (Math.random() - 0.5) * 0.6;
    p[i * 4 + 2] = targetData[i * 4 + 2] * 1.6 + (Math.random() - 0.5) * 0.6;
    p[i * 4 + 3] = Math.random();
  }

  const posVar = gpu.addVariable('texturePosition', positionGlsl, pos0);
  const velVar = gpu.addVariable('textureVelocity', noiseGlsl + '\n' + velocityGlsl, vel0);
  gpu.setVariableDependencies(posVar, [posVar, velVar]);
  gpu.setVariableDependencies(velVar, [posVar, velVar]);

  const vu = velVar.material.uniforms;
  Object.assign(vu, {
    uTime: { value: 0 }, uDt: { value: 0 }, uPull: { value: 0 },
    uNoiseStrength: { value: 0 }, uNoiseScale: { value: 1 }, uNoiseSpeed: { value: 0 },
    uDamping: { value: 0.94 }, uMaxSpeed: { value: 6 }, uGravity: { value: 0 },
    uCursor: { value: new THREE.Vector3() }, uCursorVel: { value: new THREE.Vector3() },
    uCursorRadius: { value: 0 }, uCursorPush: { value: 0 }, uCursorDrag: { value: 0 },
    uTarget: { value: target },
  });
  const pu = posVar.material.uniforms;
  pu.uDt = { value: 0 };

  const err = gpu.init();
  if (err) throw new Error(err);

  return {
    size,
    count: n,
    uniforms: vu,
    step(dt, time) {
      vu.uDt.value = dt;
      vu.uTime.value = time;
      pu.uDt.value = dt;
      gpu.compute();
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
      target.dispose();
      pos0.dispose();
      vel0.dispose();
    },
  };
}
