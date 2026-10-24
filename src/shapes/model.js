// .glb → points (and colors) with MeshSurfaceSampler, area-weighted across every mesh in the file.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

export async function loadModel(source) {
  const loader = new GLTFLoader();
  const gltf = typeof source === 'string'
    ? await loader.loadAsync(source)
    : await loader.parseAsync(await source.arrayBuffer(), '');
  gltf.scene.updateMatrixWorld(true);
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isMesh && o.geometry?.attributes.position) meshes.push(o); });
  if (!meshes.length) throw new Error('No meshes in that file');

  const parts = meshes.map((mesh) => {
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const tmp = new THREE.Mesh(geo, mesh.material);
    const sampler = new MeshSurfaceSampler(tmp).build();
    const area = sampler.distribution ? sampler.distribution[sampler.distribution.length - 1] : 1;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    let tex = null;
    if (mat?.map?.image) {
      try {
        const im = mat.map.image, c = document.createElement('canvas');
        c.width = im.width; c.height = im.height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(im, 0, 0);
        tex = { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data, flipY: mat.map.flipY };
      } catch (e) { tex = null; }
    }
    return { sampler, area, matrix: mesh.matrixWorld, hasColor: !!geo.attributes.color, tex, base: mat?.color || new THREE.Color(1, 1, 1) };
  });
  const total = parts.reduce((s, p) => s + p.area, 0);
  return { parts, total };
}

export function sampleModel(model, n) {
  const points = new Float32Array(n * 3), colors = new Float32Array(n * 3);
  const p = new THREE.Vector3(), nrm = new THREE.Vector3(), col = new THREE.Color(), uv = new THREE.Vector2();
  const cum = [];
  let acc = 0;
  for (const part of model.parts) { acc += part.area; cum.push(acc); }
  for (let i = 0; i < n; i++) {
    const r = Math.random() * acc;
    let k = 0;
    while (k < cum.length - 1 && cum[k] < r) k++;
    const part = model.parts[k];
    part.sampler.sample(p, nrm, col, uv);
    p.applyMatrix4(part.matrix);
    points[i * 3] = p.x; points[i * 3 + 1] = p.y; points[i * 3 + 2] = p.z;
    if (!part.hasColor) {
      if (part.tex) {
        const u = ((uv.x % 1) + 1) % 1, v = ((uv.y % 1) + 1) % 1;
        const x = Math.min(part.tex.w - 1, (u * part.tex.w) | 0);
        const y = Math.min(part.tex.h - 1, ((part.tex.flipY ? 1 - v : v) * part.tex.h) | 0);
        const j = (y * part.tex.w + x) * 4;
        col.setRGB(part.tex.data[j] / 255, part.tex.data[j + 1] / 255, part.tex.data[j + 2] / 255, THREE.SRGBColorSpace);
        col.multiply(part.base);
      } else col.copy(part.base);
    }
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  return { points, colors };
}
