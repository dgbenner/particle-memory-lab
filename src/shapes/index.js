// Shape registry. getShape(spec, n) returns exactly n points (+ optional colors), centered,
// scaled to unit radius and ordered for the current assignment mode. Results are cached.

import { S } from '../settings/store.js';
import * as prim from './primitives.js';
import { attractor } from './attractors.js';
import { text } from './text.js';
import { image, imageGrid, readPixels, sampleImage } from './image.js';
import { loadModel, sampleModel } from './model.js';
import { normalize, order } from './process.js';

const cache = new Map();
let imagePx = null, imageId = 'default';
let model = null, modelId = '';
const modelLoads = new Map();

export function setImage(img, id) { imagePx = readPixels(img); imageId = id; }

// Paint's image ships in public/img. If it can't load, fall back to the generated sample.
let defaultImage = null;
function loadDefaultImage() {
  if (!defaultImage) {
    defaultImage = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(readPixels(img));
      img.onerror = () => resolve(readPixels(sampleImage()));
      img.src = `${import.meta.env.BASE_URL}img/paint.jpg`;
    });
  }
  return defaultImage;
}
export function setModel(m, id) { model = m; modelId = id; }
export const hasModel = () => !!model;
export const currentImageId = () => imageId;

// The current shape, from the Shape setting (each recipe sets it).
export function specFor(src = S.shapeSource) {
  if (['lorenz', 'aizawa', 'thomas'].includes(src)) return { type: 'attractor', name: src };
  if (src === 'text') return { type: 'text', text: S.textString };
  if (src === 'image' || src === 'imageGrid' || src === 'model') return { type: src };
  return { type: 'primitive', name: src };
}

function keyFor(spec, n) {
  const parts = [spec.type, spec.name || '', n, S.assignment];
  if (spec.type === 'primitive') parts.push(S.shapeFill, spec.name === 'torusKnot' ? `${S.torusP}/${S.torusQ}` : '');
  if (spec.type === 'text') parts.push(spec.text, S.textDepth);
  if (spec.type === 'image') parts.push(imageId, S.imageWeight, S.imageDepth);
  if (spec.type === 'imageGrid') parts.push(imageId);
  if (spec.type === 'model') parts.push(spec.src || modelId);
  return parts.join('|');
}

// Primitives and attractors are pure math: sample, normalize and order them in a worker so a
// 1M-point shape never blocks a frame. Text, image and model need the DOM and stay here.
let worker = null, jobId = 0;
const jobs = new Map();
function inWorker(spec, n) {
  if (!worker) {
    worker = new Worker(new URL('./sampler.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } };
  }
  const id = ++jobId;
  return new Promise((resolve) => {
    jobs.set(id, (d) => resolve({ points: d.points, colors: null, ordered: true }));
    worker.postMessage({ id, spec, n, opts: { volume: S.shapeFill === 'volume', p: S.torusP, q: S.torusQ, assignment: S.assignment } });
  });
}

async function build(spec, n) {
  const volume = S.shapeFill === 'volume';
  switch (spec.type) {
    case 'primitive':
    case 'attractor':
      if (typeof Worker !== 'undefined') return inWorker(spec, n);
      return spec.type === 'attractor'
        ? { points: attractor(spec.name, n), colors: null }
        : { points: (prim[spec.name] || prim.sphere)(n, { volume, p: S.torusP, q: S.torusQ }), colors: null };
    case 'text': return { points: text(spec.text, n, { depth: S.textDepth }), colors: null };
    case 'image':
    case 'imageGrid': {
      if (!imagePx) imagePx = await loadDefaultImage();
      return spec.type === 'image' ? image(imagePx, n, { weight: S.imageWeight, depth: S.imageDepth }) : imageGrid(imagePx, n);
    }
    case 'model': {
      let m = model;
      if (spec.src) {
        if (!modelLoads.has(spec.src)) modelLoads.set(spec.src, loadModel(spec.src));
        m = await modelLoads.get(spec.src);
      }
      if (!m) return { points: prim.sphere(n), colors: null };
      return sampleModel(m, n);
    }
    default: return { points: prim.sphere(n), colors: null };
  }
}

export async function getShape(spec, n) {
  const key = keyFor(spec, n);
  if (!cache.has(key)) {
    const raw = await build(spec, n);
    if (raw.ordered) cache.set(key, { points: raw.points, colors: null });
    else { normalize(raw.points); cache.set(key, order(raw.points, raw.colors, S.assignment)); }
    if (cache.size > 12) cache.delete(cache.keys().next().value);
  }
  return cache.get(key);
}
