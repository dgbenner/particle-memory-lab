// Camera: slow auto-orbit and mouse parallax, or OrbitControls in orbit mode.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { S } from '../settings/store.js';

export function createCamera(dom) {
  const camera = new THREE.PerspectiveCamera(S.fov, 1, 0.05, 200);
  camera.position.set(0, 0, S.distance);
  const controls = new OrbitControls(camera, dom);
  controls.enabled = false;
  controls.enableDamping = true;

  let angle = 0;
  const par = new THREE.Vector2();
  const right = new THREE.Vector3();

  return {
    camera,
    controls,
    update(dt, ndc, reduced) {
      if (camera.fov !== S.fov) { camera.fov = S.fov; camera.updateProjectionMatrix(); }
      if (S.orbitMode) {
        controls.enabled = true;
        controls.update();
        return;
      }
      controls.enabled = false;
      angle += dt * (reduced ? 0 : S.autoOrbit);
      const k = reduced ? 0 : S.parallax;
      const e = Math.min(1, dt * 3);
      par.x += (ndc.x * k - par.x) * e;
      par.y += (ndc.y * k - par.y) * e;
      const d = S.distance;
      right.set(Math.cos(angle), 0, -Math.sin(angle));
      camera.position.set(Math.sin(angle) * d, 0, Math.cos(angle) * d)
        .addScaledVector(right, par.x * d * 0.3);
      camera.position.y += par.y * d * 0.3;
      camera.lookAt(0, 0, 0);
    },
    setAspect(a) { camera.aspect = a; camera.updateProjectionMatrix(); },
  };
}
