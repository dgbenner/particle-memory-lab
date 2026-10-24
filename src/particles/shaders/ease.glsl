// Morph easing, shared by the simulation and the renderer. 0: in-out cubic, 1: in-out expo, 2: in-out back.
// Keep in step with ease() in particles/morph.js.

float easeMorph(float t, int mode) {
  if (mode == 1) {
    if (t <= 0.0) return 0.0;
    if (t >= 1.0) return 1.0;
    return t < 0.5 ? pow(2.0, 20.0 * t - 10.0) / 2.0 : (2.0 - pow(2.0, -20.0 * t + 10.0)) / 2.0;
  }
  if (mode == 2) {
    float c2 = 1.70158 * 1.525;
    return t < 0.5
      ? (pow(2.0 * t, 2.0) * ((c2 + 1.0) * 2.0 * t - c2)) / 2.0
      : (pow(2.0 * t - 2.0, 2.0) * ((c2 + 1.0) * (t * 2.0 - 2.0) + c2) + 2.0) / 2.0;
  }
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

// Per-particle morph progress: staggered by seed.
float morphProgress(float time, float start, float seed, float stagger, float dur) {
  return clamp((time - start - seed * stagger) / dur, 0.0, 1.0);
}
