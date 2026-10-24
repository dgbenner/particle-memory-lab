// Void background: a full-screen vertical gradient drawn behind everything.
// Fog and the other background layers arrive in phase 3.

import * as THREE from 'three';
import { S } from '../settings/store.js';

export function createVoid() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() } },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() { vY = position.y * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.9999, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uBottom;
      varying float vY;
      void main() { gl_FragColor = vec4(mix(uBottom, uTop, vY), 1.0); }
    `,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return {
    mesh,
    update() {
      material.uniforms.uTop.value.set(S.bgTop);
      material.uniforms.uBottom.value.set(S.bgBottom);
    },
  };
}
