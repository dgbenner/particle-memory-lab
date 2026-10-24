// Pointer → a 3D push point on the plane through the cloud's center, facing the camera.

import * as THREE from 'three';
import { S } from '../settings/store.js';

export function createCursor(camera, dom) {
  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const normal = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const point = new THREE.Vector3();
  const prev = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const rawVel = new THREE.Vector3();
  const origin = new THREE.Vector3();
  let active = false, seen = false, strength = 0, primed = false;

  const move = (e) => {
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    active = true;
    seen = true;
  };
  dom.addEventListener('pointermove', move);
  dom.addEventListener('pointerdown', move);
  dom.addEventListener('pointerleave', () => (active = false));
  dom.addEventListener('pointercancel', () => (active = false));
  dom.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') active = false; });

  return {
    ndc,
    point,
    vel,
    // 0..1: full while a pointer is present, fading to 0 over 300 ms after it leaves.
    get strength() { return strength; },
    get seen() { return seen; },
    update(dt) {
      strength = active ? 1 : Math.max(0, strength - dt / 0.3);
      if (!seen || dt <= 0) return;
      camera.getWorldDirection(normal).negate();
      plane.setFromNormalAndCoplanarPoint(normal, origin);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      if (!primed) { point.copy(hit); prev.copy(hit); primed = true; return; }
      prev.copy(point);
      point.lerp(hit, Math.min(1, dt * S.cursorEase));
      rawVel.subVectors(point, prev).divideScalar(dt);
      vel.lerp(rawVel, Math.min(1, dt * 12));
    },
  };
}
