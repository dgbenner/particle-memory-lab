// Composer: render → bloom → trails → finishing (grain, vignette, aberration) → output (tone map, sRGB).

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { S } from '../settings/store.js';

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uGrain: { value: 0 },
    uVignette: { value: 0 },
    uAberration: { value: 0 },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uGrain, uVignette, uAberration, uTime;
    uniform vec2 uRes;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      // Aberration grows toward the edges: uAberration is the offset at the edge midpoints.
      vec2 off = c * 2.0 * uAberration;
      vec4 g = texture2D(tDiffuse, vUv);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, g.g, texture2D(tDiffuse, vUv - off).b);
      float d = length(c) * 1.4142;
      col *= 1.0 - uVignette * smoothstep(0.35, 1.0, d);
      // Hash without sin(): no banding at large pixel coordinates.
      vec3 p3 = fract(vec3(floor(vUv * uRes).xyx + floor(uTime * 24.0) * 17.0) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      float n = fract((p3.x + p3.y) * p3.z) - 0.5;
      col += n * uGrain;
      gl_FragColor = vec4(max(col, 0.0), g.a);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), S.bloomStrength, S.bloomRadius, S.bloomThreshold);
  const trails = new AfterimagePass(0);
  const finish = new ShaderPass(FinishShader);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(trails);
  composer.addPass(finish);
  composer.addPass(output);

  return {
    composer,
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      finish.uniforms.uRes.value.set(w * pr, h * pr);
    },
    render(time) {
      bloom.enabled = S.bloomStrength > 0;
      bloom.strength = S.bloomStrength;
      bloom.radius = S.bloomRadius;
      bloom.threshold = S.bloomThreshold;
      trails.enabled = S.trails > 0;
      trails.uniforms.damp.value = S.trails;
      const fu = finish.uniforms;
      fu.uGrain.value = S.grain;
      fu.uVignette.value = S.vignette;
      fu.uAberration.value = S.aberration;
      fu.uTime.value = time;
      renderer.toneMappingExposure = S.exposure;
      composer.render();
    },
    dispose() { composer.dispose(); bloom.dispose(); trails.dispose(); finish.dispose(); output.dispose(); },
  };
}
