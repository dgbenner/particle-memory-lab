// Velocity update. texturePosition, textureVelocity and resolution are provided by GPUComputationRenderer.
// position.w holds the particle's stable seed.

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
uniform sampler2D uTarget;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec3 v = texture2D(textureVelocity, uv).xyz;
  vec3 target = texture2D(uTarget, uv).xyz;

  // Shape pull
  v += (target - pos) * uPull * uDt;

  // Flow
  v += curlNoise(pos * uNoiseScale + uTime * uNoiseSpeed) * uNoiseStrength * uDt;

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
