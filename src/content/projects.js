// The project list. Each project's shape is what the particles assemble into when it's active.
// shape: { type: 'primitive', name } | { type: 'attractor', name } | { type: 'text', text } | { type: 'model', src }
// style: optional settings overrides applied when the project becomes active (null = none).

export const PROJECTS = [
  {
    id: 'dither-crawl-lab',
    name: 'Dither Crawl Lab',
    tag: ['PRJ_01', 'INTERACTION', '2026'],
    url: 'https://dgbenner.github.io/dither-crawl-lab/',
    shape: { type: 'primitive', name: 'lattice' },
    style: null,
  },
  {
    id: 'poster-grid',
    name: 'Waypoints Poster Grid',
    tag: ['PRJ_02', 'TYPOGRAPHY', '2026'],
    url: 'https://dgbenner.github.io/poster-grid/',
    shape: { type: 'primitive', name: 'wave' },
    style: null,
  },
  {
    id: 'ux-audit-lens',
    name: 'UX Audit Lens',
    tag: ['PRJ_03', 'UX TOOLING', '2026'],
    url: '#',
    shape: { type: 'primitive', name: 'torusKnot' },
    style: null,
  },
  {
    id: 'wcag-auditor',
    name: 'WCAG Accessibility Auditor',
    tag: ['PRJ_04', 'ACCESSIBILITY', '2026'],
    url: '#',
    shape: { type: 'primitive', name: 'ring' },
    style: null,
  },
  {
    id: 'lore',
    name: 'LORE',
    tag: ['PRJ_05', 'CONVERSATIONAL AI', '2026'],
    url: '#',
    shape: { type: 'attractor', name: 'aizawa' },
    style: null,
  },
  {
    id: 'isometric-atlanta',
    name: 'Isometric Atlanta',
    tag: ['PRJ_06', 'ILLUSTRATION', '2026'],
    url: '#',
    shape: { type: 'text', text: 'ATL' },
    style: null,
  },
  {
    id: 'transmission-hypothesis',
    name: 'The Transmission Hypothesis',
    tag: ['PRJ_07', '3D WORLD', '2026'],
    url: '#',
    shape: { type: 'attractor', name: 'lorenz' },
    style: null,
  },
];
