// Strange attractors: integrate once, skip the first 1,000 steps, keep n points along the path.
// Each spans a fixed amount of attractor time, so low and high counts trace the same figure.

const SYSTEMS = {
  lorenz: {
    start: [0.1, 0, 0], span: 120, dt: 0.004,
    f(x, y, z, o) { const s = 10, r = 28, b = 8 / 3; o[0] = s * (y - x); o[1] = x * (r - z) - y; o[2] = x * y - b * z; },
  },
  aizawa: {
    start: [0.1, 0, 0], span: 400, dt: 0.008,
    f(x, y, z, o) {
      const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
      o[0] = (z - b) * x - d * y;
      o[1] = d * x + (z - b) * y;
      o[2] = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
    },
  },
  thomas: {
    start: [0.1, 0, 0], span: 3000, dt: 0.04,
    f(x, y, z, o) { const b = 0.208186; o[0] = Math.sin(y) - b * x; o[1] = Math.sin(z) - b * y; o[2] = Math.sin(x) - b * z; },
  },
};

export function attractor(name, n) {
  const sys = SYSTEMS[name] || SYSTEMS.lorenz;
  const out = new Float32Array(n * 3);
  const d = [0, 0, 0];
  let [x, y, z] = sys.start;
  const step = (h) => {
    // Midpoint (RK2): stable enough at these step sizes
    sys.f(x, y, z, d);
    const mx = x + d[0] * h * 0.5, my = y + d[1] * h * 0.5, mz = z + d[2] * h * 0.5;
    sys.f(mx, my, mz, d);
    x += d[0] * h; y += d[1] * h; z += d[2] * h;
  };
  for (let i = 0; i < 1000; i++) step(sys.dt);
  // Steps per kept point: at least one; more when n is small so the path still covers the span.
  const per = Math.max(1, Math.round(sys.span / sys.dt / n));
  const h = Math.min(sys.dt, sys.span / (n * per));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < per; k++) step(h);
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  // Lorenz reads best with its wings side by side: swap y and z so z is up.
  if (name === 'lorenz') for (let i = 0; i < n; i++) { const t = out[i * 3 + 1]; out[i * 3 + 1] = out[i * 3 + 2]; out[i * 3 + 2] = t; }
  return out;
}
