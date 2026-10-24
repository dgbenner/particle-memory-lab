// Text → points: draw the string bold on a 2D canvas and sample the filled pixels.

export function text(str, n, { depth = 0.12 } = {}) {
  const s = (str || ' ').slice(0, 24);
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const px = 220;
  const font = `900 ${px}px "Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(s).width) + 40;
  c.width = Math.max(64, w);
  c.height = Math.round(px * 1.3);
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(s, 20, c.height / 2);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;

  const filled = [];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 128) filled.push(x, y);
  const out = new Float32Array(n * 3);
  const m = filled.length / 2;
  if (!m) return out;
  const cx = c.width / 2, cy = c.height / 2, scale = 2 / c.width;
  for (let i = 0; i < n; i++) {
    const k = ((Math.random() * m) | 0) * 2;
    out[i * 3] = (filled[k] + Math.random() - cx) * scale;
    out[i * 3 + 1] = -(filled[k + 1] + Math.random() - cy) * scale;
    out[i * 3 + 2] = (Math.random() * 2 - 1) * depth;
  }
  return out;
}
