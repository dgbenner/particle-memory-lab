// Points that read their position and velocity from the simulation textures.

import * as THREE from 'three';
import easeGlsl from './shaders/ease.glsl?raw';

const vertex = easeGlsl + /* glsl */ `
attribute vec2 reference;
uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float uSize;
uniform float uSizeVar;
uniform float uSizeMin;
uniform float uSizeMax;
uniform float uPixelRatio;
uniform float uRefDist;
uniform float uTime;
uniform float uSparkle;
uniform float uIntensity;
uniform float uSpeedRange;
uniform float uDepthRange;
uniform int uColorMode;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform sampler2D uColFrom;
uniform sampler2D uColTo;
uniform float uMorphStart;
uniform float uMorphDur;
uniform float uStagger;
uniform int uEase;
varying vec3 vColor;

void main() {
  vec4 p = texture2D(texturePosition, reference);
  vec3 v = texture2D(textureVelocity, reference).xyz;
  float seed = p.w;
  vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = max(0.001, -mv.z);
  float s = uSize * (0.6 + seed * uSizeVar) * (uRefDist / dist);
  gl_PointSize = clamp(s, uSizeMin, uSizeMax) * uPixelRatio;

  float t = 0.0;
  if (uColorMode == 1) t = clamp(length(v) / uSpeedRange, 0.0, 1.0);
  else if (uColorMode == 2) t = clamp((dist - (uRefDist - uDepthRange)) / (2.0 * uDepthRange), 0.0, 1.0);
  vec3 c = uColorMode == 0 ? uColorA : mix(uColorA, uColorB, t);
  if (uColorMode == 3) {
    // Source colors travel with the morph; shapes without colors fall back to color A.
    float mp = easeMorph(morphProgress(uTime, uMorphStart, seed, uStagger, uMorphDur), uEase);
    vec4 sc = mix(texture2D(uColFrom, reference), texture2D(uColTo, reference), mp);
    c = mix(uColorA, sc.rgb, sc.a);
  }

  // Sparkle: the lowest-seeded share of particles twinkles, each at its own rate and phase.
  float tw = 1.0;
  if (seed < uSparkle) {
    float k = seed / max(uSparkle, 1e-4);
    tw = 0.35 + 2.4 * pow(0.5 + 0.5 * sin(uTime * (1.5 + k * 6.0) + k * 91.0), 6.0);
  }
  vColor = c * uIntensity * tw;
}
`;

const fragment = /* glsl */ `
uniform int uSprite;
uniform float uOpacity;
uniform float uFade;
varying vec3 vColor;

void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  float a = 1.0;
  if (uSprite == 0) {            // soft dot
    if (r2 > 1.0) discard;
    a = exp(-r2 * 4.0);
  } else if (uSprite == 1) {     // hard dot
    if (r2 > 1.0) discard;
  } else if (uSprite == 3) {     // ring
    float r = sqrt(r2);
    if (r > 1.0) discard;
    a = smoothstep(0.5, 0.68, r) * (1.0 - smoothstep(0.86, 1.0, r));
  }                              // 2: square, full cell
  gl_FragColor = vec4(vColor, a * uOpacity * uFade);
}
`;

export const SPRITES = { soft: 0, hard: 1, square: 2, ring: 3 };
export const COLOR_MODES = { solid: 0, speed: 1, depth: 2, source: 3 };

export function createPoints(sim) {
  const n = sim.count, size = sim.size;
  const geo = new THREE.BufferGeometry();
  const ref = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    ref[i * 2] = ((i % size) + 0.5) / size;
    ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
  }
  geo.setAttribute('reference', new THREE.BufferAttribute(ref, 2));
  // Placeholder positions; the vertex shader reads the real ones from the texture.
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      texturePosition: { value: null }, textureVelocity: { value: null },
      uSize: { value: 2 }, uSizeVar: { value: 0.5 }, uSizeMin: { value: 0.75 }, uSizeMax: { value: 24 },
      uPixelRatio: { value: 1 }, uRefDist: { value: 4.5 }, uTime: { value: 0 }, uSparkle: { value: 0 },
      uIntensity: { value: 1.6 }, uSpeedRange: { value: 3 }, uDepthRange: { value: 1 },
      uColorMode: { value: 1 }, uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() },
      uSprite: { value: 0 }, uOpacity: { value: 0.22 }, uFade: { value: 1 },
      uColFrom: { value: sim.textures.colFrom }, uColTo: { value: sim.textures.colTo },
      uMorphStart: { value: -1e6 }, uMorphDur: { value: 1.6 }, uStagger: { value: 0.5 }, uEase: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return {
    points,
    material,
    dispose() { geo.dispose(); material.dispose(); },
  };
}
