// Image → points with per-point colors.
// image(): pixels sampled with probability weighted by brightness, depth from brightness.
// imageGrid(): a regular grid on a flat plane (the tile wall).

const MAX = 512;

export function readPixels(img) {
  const k = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

const lin = (v) => Math.pow(v / 255, 2.2); // sRGB → linear, close enough for particle color

export function image(px, n, { weight = 1, depth = 0.25 } = {}) {
  const { w, h, data } = px;
  const count = w * h;
  const cdf = new Float64Array(count);
  let acc = 0;
  for (let i = 0; i < count; i++) {
    const l = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    acc += (weight === 0 ? 1 : Math.pow(l, weight) + 1e-4) * (data[i * 4 + 3] / 255);
    cdf[i] = acc;
  }
  const points = new Float32Array(n * 3), colors = new Float32Array(n * 3);
  const scale = 2 / Math.max(w, h);
  for (let i = 0; i < n; i++) {
    const r = Math.random() * acc;
    let lo = 0, hi = count - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
    const x = lo % w, y = (lo / w) | 0, j = lo * 4;
    const l = (0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]) / 255;
    points[i * 3] = (x + Math.random() - w / 2) * scale;
    points[i * 3 + 1] = -(y + Math.random() - h / 2) * scale;
    points[i * 3 + 2] = (l - 0.5) * 2 * depth;
    colors[i * 3] = lin(data[j]); colors[i * 3 + 1] = lin(data[j + 1]); colors[i * 3 + 2] = lin(data[j + 2]);
  }
  return { points, colors };
}

export function imageGrid(px, n) {
  const { w, h, data } = px;
  const aspect = w / h;
  const cols = Math.max(1, Math.round(Math.sqrt(n * aspect))), rows = Math.ceil(n / cols);
  const points = new Float32Array(n * 3), colors = new Float32Array(n * 3);
  const sx = 2 / Math.max(cols, rows * aspect);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = ((i / cols) | 0) % rows;
    const ix = Math.min(w - 1, Math.floor(((c + 0.5) / cols) * w)), iy = Math.min(h - 1, Math.floor(((r + 0.5) / rows) * h));
    const j = (iy * w + ix) * 4;
    points[i * 3] = (c - (cols - 1) / 2) * sx;
    points[i * 3 + 1] = -(r - (rows - 1) / 2) * sx;
    points[i * 3 + 2] = 0;
    colors[i * 3] = lin(data[j]); colors[i * 3 + 1] = lin(data[j + 1]); colors[i * 3 + 2] = lin(data[j + 2]);
  }
  return { points, colors };
}

// The bundled sample: an abstract flow field painted procedurally, no outside artwork.
export function sampleImage() {
  const w = 480, h = 300;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const pal = [[18, 22, 64], [40, 120, 160], [240, 140, 70], [250, 220, 170], [150, 40, 110]];
  const mix = (a, b, t) => a + (b - a) * t;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      let f = Math.sin(u * 6.0 + Math.sin(v * 5.0 + u * 2.0) * 1.6) * 0.5 + 0.5;
      f = 0.55 * f + 0.45 * (Math.sin((u + v) * 9.0 + Math.cos(u * 7.0 - v * 3.0) * 2.2) * 0.5 + 0.5);
      const t = Math.min(0.9999, Math.max(0, f)) * (pal.length - 1), k = Math.floor(t), fr = t - k;
      const a = pal[k], b = pal[k + 1];
      const glow = Math.exp(-((u - 0.62) ** 2 + (v - 0.42) ** 2) * 9);
      const j = (y * w + x) * 4;
      img.data[j] = Math.min(255, mix(a[0], b[0], fr) + glow * 60);
      img.data[j + 1] = Math.min(255, mix(a[1], b[1], fr) + glow * 40);
      img.data[j + 2] = Math.min(255, mix(a[2], b[2], fr) + glow * 30);
      img.data[j + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
