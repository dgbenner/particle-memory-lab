// The one settings object. Saved to localStorage automatically; copy/paste as JSON.

import { SCHEMA, BY_KEY } from './schema.js';

const KEY = 'particle-memory-lab:v1';

export const defaults = Object.fromEntries(SCHEMA.map((s) => [s.key, s.default]));
export const S = { ...defaults };

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);

// Coerce a value to what the schema allows; returns undefined if it can't be used.
function sanitize(key, v) {
  const s = BY_KEY[key];
  if (!s) return undefined;
  switch (s.type) {
    case 'range': {
      const n = typeof v === 'number' ? v : parseFloat(v);
      if (!Number.isFinite(n)) return undefined;
      return Math.min(s.max, Math.max(s.min, n));
    }
    case 'select': {
      const str = String(v);
      return s.options.some(([val]) => val === str) ? str : undefined;
    }
    case 'toggle': return typeof v === 'boolean' ? v : undefined;
    case 'color': return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined;
    default: return typeof v === typeof s.default ? v : undefined;
  }
}

export function set(patch, source = 'ui') {
  const changed = [];
  for (const k of Object.keys(patch)) {
    const v = sanitize(k, patch[k]);
    if (v === undefined || S[k] === v) continue;
    S[k] = v;
    changed.push(k);
  }
  if (!changed.length) return changed;
  save();
  listeners.forEach((fn) => fn(changed, source));
  return changed;
}

export function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!o || typeof o !== 'object') return false;
    for (const k of Object.keys(o)) {
      const v = sanitize(k, o[k]);
      if (v !== undefined) S[k] = v;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: settings just won't persist */ }
}

export const toJSON = () => JSON.stringify(S, null, 2);

// Returns the number of settings applied.
export function fromJSON(text) {
  const o = JSON.parse(text);
  if (!o || typeof o !== 'object') throw new Error('Not a settings object');
  const patch = {};
  for (const k of Object.keys(o)) if (k in defaults) patch[k] = o[k];
  set(patch, 'paste');
  return Object.keys(patch).filter((k) => sanitize(k, patch[k]) !== undefined).length;
}
