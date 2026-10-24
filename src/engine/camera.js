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

  let angle = 0, phase = 0;
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
      // Auto-orbit sways around the front view so flat shapes (text, images) never turn edge-on.
      // Peak angular speed is the Auto-orbit speed setting; a sway of 180° is a full orbit.
      const speed = reduced ? 0 : S.autoOrbit, sway = (S.orbitSway * Math.PI) / 180;
      if (S.orbitSway >= 180) angle += dt * speed;
      else { phase += (dt * speed) / Math.max(sway, 0.01); angle = sway * Math.sin(phase); }
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
    // Shift the projection so the cloud's center lands at S.cloudX across the open screen (left of the panel).
    frame(w, h, panelW) {
      const off = w / 2 - S.cloudX * (w - panelW);
      const v = camera.view;
      if (v && v.enabled && v.offsetX === off && v.fullWidth === w && v.fullHeight === h) return;
      camera.setViewOffset(w, h, off, 0, w, h);
    },
  };
}
