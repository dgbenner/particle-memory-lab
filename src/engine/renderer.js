import * as THREE from 'three';
import { S } from '../settings/store.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export const pixelRatioFor = () => Math.min(window.devicePixelRatio || 1, parseFloat(S.pixelRatio));
