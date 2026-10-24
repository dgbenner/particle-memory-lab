// SVG leader line from a point on the cloud to the project card: a 45° diagonal, then horizontal.
// The anchor is on the cloud's bounding sphere, 45° up and to the right of center, projected to screen.

import * as THREE from 'three';

export function createLeader(svg, cardEl) {
  const line = svg.querySelector('polyline');
  const dot = svg.querySelector('circle');
  const world = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  let ax = null, ay = null;

  return {
    update(camera, dt, radius = 1.05) {
      // Camera-space right and up, so the anchor stays upper-right of the cloud from any angle.
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      world.set(0, 0, 0).addScaledVector(right, radius * Math.SQRT1_2).addScaledVector(up, radius * Math.SQRT1_2).project(camera);
      const tx = (world.x * 0.5 + 0.5) * innerWidth, ty = (-world.y * 0.5 + 0.5) * innerHeight;
      const k = ax === null ? 1 : Math.min(1, dt * 8);
      ax = ax === null ? tx : ax + (tx - ax) * k;
      ay = ay === null ? ty : ay + (ty - ay) * k;

      const r = cardEl.getBoundingClientRect();
      const ex = r.left - 10, ey = r.top + 10;
      // Diagonal up-right until level with the card, then across.
      const rise = ay - ey;
      const kx = Math.min(ex, ax + Math.max(0, rise));
      const ky = ay - Math.max(0, kx - ax);
      line.setAttribute('points', `${ax.toFixed(1)},${ay.toFixed(1)} ${kx.toFixed(1)},${ky.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`);
      dot.setAttribute('cx', ax.toFixed(1));
      dot.setAttribute('cy', ay.toFixed(1));
    },
  };
}
