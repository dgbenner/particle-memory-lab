// Shape samplers return exactly n points as a Float32Array of xyz triples, centered, unit radius.
// Phase 1 has the sphere; the rest of the primitives arrive in phase 2.

export function sphere(n) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // Uniform on the surface
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    out[i * 3] = r * Math.cos(a);
    out[i * 3 + 1] = z;
    out[i * 3 + 2] = r * Math.sin(a);
  }
  return out;
}
