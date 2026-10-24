// Velocity update. texturePosition, textureVelocity and resolution are provided by GPUComputationRenderer.
// position.w holds the particle's stable seed. noise.glsl and ease.glsl are prepended.

uniform float uTime;
uniform float uDt;
uniform float uPull;
uniform float uNoiseStrength;
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uDamping;
uniform float uMaxSpeed;
uniform float uGravity;
uniform vec3 uCursor;
uniform vec3 uCursorVel;
uniform float uCursorRadius;
uniform float uCursorPush;
uniform float uCursorDrag;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uMorphStart;
uniform float uMorphDur;
uniform float uStagger;
uniform float uScatter;
uniform float uBurst;
uniform int uEase;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p4 = texture2D(texturePosition, uv);
  vec3 pos = p4.xyz;
  float seed = p4.w;
  vec3 v = texture2D(textureVelocity, uv).xyz;

  // Morph: the target slides from the old shape to the new one, staggered per particle.
  float mp = morphProgress(uTime, uMorphStart, seed, uStagger, uMorphDur);
  vec3 target = mix(texture2D(uFrom, uv).xyz, texture2D(uTo, uv).xyz, easeMorph(mp, uEase));
  float dissolve = (mp > 0.0 && mp < 1.0) ? sin(3.14159265 * mp) : 0.0;

  // Shape pull
  v += (target - pos) * uPull * uDt;

  // Flow, stronger mid-morph so the shape visibly breaks apart
  v += curlNoise(pos * uNoiseScale + uTime * uNoiseSpeed) * (uNoiseStrength + dissolve * uScatter) * uDt;

  // Outward burst from the center during the morph
  float pl = length(pos);
  if (pl > 1e-4) v += (pos / pl) * dissolve * uBurst * uDt;

  // Cursor push, plus a share of the cursor's own motion
  vec3 d = pos - uCursor;
  float r = length(d);
  if (r < uCursorRadius && r > 1e-5) {
    float f = pow(1.0 - r / uCursorRadius, 2.0);
    v += (d / r) * uCursorPush * f * uDt;
    v += (uCursorVel - v) * uCursorDrag * f * min(1.0, uDt * 10.0);
  }

  v.y += uGravity * uDt;
  v *= pow(uDamping, uDt * 60.0);

  float sp = length(v);
  if (sp > uMaxSpeed) v *= uMaxSpeed / sp;

  gl_FragColor = vec4(v, 1.0);
}
