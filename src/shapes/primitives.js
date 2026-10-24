// Primitive samplers. Each returns exactly n points as xyz triples, centered, about unit radius
// (shapes/index.js normalizes them exactly). opts.volume fills the shape instead of its surface.

const TAU = Math.PI * 2;
const rnd = Math.random;

// A random unit vector perpendicular to (tx, ty, tz), which must be normalized.
function perp(tx, ty, tz) {
  let x = rnd() - 0.5, y = rnd() - 0.5, z = rnd() - 0.5;
  const d = x * tx + y * ty + z * tz;
  x -= d * tx; y -= d * ty; z -= d * tz;
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function rotX(out, a) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let i = 0; i < out.length; i += 3) {
    const y = out[i + 1], z = out[i + 2];
    out[i + 1] = y * c - z * s;
    out[i + 2] = y * s + z * c;
  }
  return out;
}

export function sphere(n, { volume } = {}) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const z = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - z * z);
    const k = volume ? Math.cbrt(rnd()) : 1;
    out[i * 3] = r * Math.cos(a) * k;
    out[i * 3 + 1] = z * k;
    out[i * 3 + 2] = r * Math.sin(a) * k;
  }
  return out;
}

export function torusKnot(n, { volume, p = 2, q = 3 } = {}) {
  const out = new Float32Array(n * 3);
  const tube = 0.22, e = 1e-3;
  const curve = (t) => {
    const r = 2 + Math.cos(q * t);
    return [r * Math.cos(p * t), r * Math.sin(p * t), -Math.sin(q * t)];
  };
  for (let i = 0; i < n; i++) {
    const t = rnd() * TAU;
    const a = curve(t), b = curve(t + e);
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    const l = Math.hypot(tx, ty, tz); tx /= l; ty /= l; tz /= l;
    const [nx, ny, nz] = perp(tx, ty, tz);
    const r = tube * (volume ? Math.sqrt(rnd()) : 1);
    out[i * 3] = (a[0] + nx * r) / 3;
    out[i * 3 + 1] = (a[1] + ny * r) / 3;
    out[i * 3 + 2] = (a[2] + nz * r) / 3;
  }
  return out;
}

// Three square-section bars forming an equilateral triangle, standing face-on.
export function prism(n, { volume } = {}) {
  const out = new Float32Array(n * 3);
  const th = 0.16;
  const V = [0, 1, 2].map((k) => [Math.cos(Math.PI / 2 + (k * TAU) / 3), Math.sin(Math.PI / 2 + (k * TAU) / 3)]);
  for (let i = 0; i < n; i++) {
    const k = (rnd() * 3) | 0, A = V[k], B = V[(k + 1) % 3];
    const t = rnd();
    const x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t;
    // In-plane normal to the bar, plus depth (z)
    let nx = -(B[1] - A[1]), ny = B[0] - A[0];
    const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    let u, w;
    if (volume) { u = (rnd() - 0.5) * th; w = (rnd() - 0.5) * th; }
    else {
      // A point on the perimeter of the square cross-section
      const s = rnd() * 4, f = (s % 1) - 0.5;
      [u, w] = s < 1 ? [f * th, th / 2] : s < 2 ? [th / 2, f * th] : s < 3 ? [f * th, -th / 2] : [-th / 2, f * th];
    }
    out[i * 3] = x + nx * u;
    out[i * 3 + 1] = y + ny * u;
    out[i * 3 + 2] = w;
  }
  return out;
}

// Edges of a 4×4×4 cube lattice.
export function lattice(n, { volume } = {}) {
  const out = new Float32Array(n * 3);
  const g = [-0.6, -0.2, 0.2, 0.6], th = volume ? 0.035 : 0.012;
  for (let i = 0; i < n; i++) {
    const axis = (rnd() * 3) | 0;
    const a = g[(rnd() * 4) | 0], b = g[(rnd() * 4) | 0], t = (rnd() * 2 - 1) * 0.6;
    const j = () => (rnd() - 0.5) * th;
    const p = axis === 0 ? [t, a + j(), b + j()] : axis === 1 ? [a + j(), t, b + j()] : [a + j(), b + j(), t];
    out.set(p, i * 3);
  }
  return out;
}

export function ring(n, { volume } = {}) {
  const out = new Float32Array(n * 3);
  const R = 0.9, r = 0.07;
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, b = rnd() * TAU, k = r * (volume ? Math.sqrt(rnd()) : 1);
    const rr = R + Math.cos(b) * k;
    out[i * 3] = rr * Math.cos(a);
    out[i * 3 + 1] = rr * Math.sin(a);
    out[i * 3 + 2] = Math.sin(b) * k;
  }
  return out;
}

// A rippled sheet, tilted toward the camera so it doesn't sit edge-on.
export function wave(n, { volume } = {}) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = rnd() * 2 - 1, z = rnd() * 2 - 1;
    const y = 0.16 * Math.sin(x * 4.2 + z * 1.3) * Math.cos(z * 3.1) + (volume ? (rnd() - 0.5) * 0.08 : 0);
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return rotX(out, 0.95);
}

export function galaxy(n) {
  const out = new Float32Array(n * 3);
  const arms = 3;
  for (let i = 0; i < n; i++) {
    const r = Math.pow(rnd(), 0.65);
    const arm = (rnd() * arms) | 0;
    const spread = (rnd() - 0.5) * 0.5 * (1 - r * 0.6) + (rnd() - 0.5) * 0.15;
    const a = (arm * TAU) / arms + r * 4.2 + spread;
    const h = (rnd() + rnd() + rnd() - 1.5) * 0.05 * (1.2 - r);
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = h;
    out[i * 3 + 2] = Math.sin(a) * r;
  }
  return rotX(out, 0.55);
}
