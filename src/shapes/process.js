// Shared by the main thread and the sampler worker: center + unit radius, then order for assignment.

export function normalize(points) {
  const n = points.length / 3;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = points[i * 3], y = points[i * 3 + 1], z = points[i * 3 + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  let r = 1e-9;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(points[i * 3] - cx, points[i * 3 + 1] - cy, points[i * 3 + 2] - cz);
    if (d > r) r = d;
  }
  for (let i = 0; i < n; i++) {
    points[i * 3] = (points[i * 3] - cx) / r;
    points[i * 3 + 1] = (points[i * 3 + 1] - cy) / r;
    points[i * 3 + 2] = (points[i * 3 + 2] - cz) / r;
  }
  return points;
}

// Random: shuffle, so particles cross paths. Sorted: by height band, then angle, so paths are short.
export function order(points, colors, assignment) {
  const n = points.length / 3;
  let idx;
  if (assignment === 'sorted') {
    const BANDS = 96, keys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const y = points[i * 3 + 1];
      const band = Math.min(BANDS - 1, Math.max(0, Math.floor(((y + 1) / 2) * BANDS)));
      const ang = (Math.atan2(points[i * 3 + 2], points[i * 3]) + Math.PI) / (2 * Math.PI);
      keys[i] = Math.floor((band + Math.min(0.999999, ang)) * 2 ** 24) * 2 ** 21 + i;
    }
    keys.sort();
    idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = keys[i] % 2 ** 21;
  } else {
    idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  }
  const p = new Float32Array(n * 3), c = colors ? new Float32Array(n * 3) : null;
  for (let i = 0; i < n; i++) {
    const k = idx[i] * 3;
    p[i * 3] = points[k]; p[i * 3 + 1] = points[k + 1]; p[i * 3 + 2] = points[k + 2];
    if (c) { c[i * 3] = colors[k]; c[i * 3 + 1] = colors[k + 1]; c[i * 3 + 2] = colors[k + 2]; }
  }
  return { points: p, colors: c };
}
