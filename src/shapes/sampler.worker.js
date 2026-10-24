// Worker: sample a primitive or attractor, normalize it and order it for the assignment mode.

import * as prim from './primitives.js';
import { attractor } from './attractors.js';
import { normalize, order } from './process.js';

self.onmessage = (e) => {
  const { id, spec, n, opts } = e.data;
  const raw = spec.type === 'attractor'
    ? attractor(spec.name, n)
    : (prim[spec.name] || prim.sphere)(n, opts);
  normalize(raw);
  const { points } = order(raw, null, opts.assignment);
  self.postMessage({ id, points }, [points.buffer]);
};
