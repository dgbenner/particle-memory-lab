// Floating HUD fragments: corner-bracket reticles, × marks, hatch blocks and tiny text blocks,
// scattered at three depths with mouse parallax. Rebuilt (and faded in) on each project change.

const NS = 'http://www.w3.org/2000/svg';
const DEPTHS = [8, 18, 32]; // px of parallax at the screen edge, far to near
const COUNTS = { off: 0, few: 9, many: 22 };

function svg(w, h, inner) {
  return `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" stroke="currentColor" stroke-width="1">${inner}</svg>`;
}
const MOTIFS = {
  reticle: (s) => svg(s, s, `<path d="M0 ${s * 0.25}V0H${s * 0.25} M${s * 0.75} 0H${s}V${s * 0.25} M${s} ${s * 0.75}V${s}H${s * 0.75} M${s * 0.25} ${s}H0V${s * 0.75}"/>`),
  cross: (s) => svg(s, s, `<path d="M0 0L${s} ${s}M${s} 0L0 ${s}"/>`),
  hatch: (w) => {
    const h = 12;
    let d = '';
    for (let x = -h; x < w; x += 4) d += `M${x} ${h}L${x + h} 0`;
    return svg(w, h, `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}"/><path d="${d}" stroke-width="0.75"/>`);
  },
};

const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
const pad = (n) => String(n).padStart(2, '0');

function textBlock(project, i) {
  const d = new Date();
  const lines = [
    [`${project.tag[0]} // ${project.tag[1]}`, `44.9537 N  93.0900 W`, `T ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`],
    [`SEQ ${hex()}-${hex()}`, `IDX ${String(i + 1).padStart(3, '0')}`, `${project.name.toUpperCase().slice(0, 18)}`],
    [`MEM ${hex()}`, `SYNC ${(Math.random() * 100).toFixed(1)}%`, `${project.tag[2]}`],
  ][(Math.random() * 3) | 0];
  return `<div class="frag-text">${lines.map((l) => `<span>${l}</span>`).join('')}</div>`;
}

export function createFragments(root, avoid) {
  let items = [];
  return {
    build(level, project, index) {
      root.innerHTML = '';
      items = [];
      const count = COUNTS[level] || 0;
      const W = innerWidth - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel-w')) || 0);
      const keepOut = avoid().map((el) => el.getBoundingClientRect());
      for (let i = 0; i < count; i++) {
        let x = 0, y = 0;
        for (let tries = 0; tries < 12; tries++) {
          x = W * (0.06 + Math.random() * 0.88);
          y = innerHeight * (0.08 + Math.random() * 0.84);
          if (!keepOut.some((r) => x > r.left - 40 && x < r.right + 40 && y > r.top - 30 && y < r.bottom + 30)) break;
        }
        const kind = ['reticle', 'reticle', 'cross', 'cross', 'hatch', 'text'][(Math.random() * 6) | 0];
        const el = document.createElement('div');
        el.className = 'frag frag-' + kind;
        el.innerHTML = kind === 'text' ? textBlock(project, index)
          : kind === 'hatch' ? MOTIFS.hatch(40 + ((Math.random() * 50) | 0))
          : MOTIFS[kind](kind === 'cross' ? 7 + ((Math.random() * 5) | 0) : 16 + ((Math.random() * 22) | 0));
        const depth = (Math.random() * 3) | 0;
        el.style.left = x.toFixed(0) + 'px';
        el.style.top = y.toFixed(0) + 'px';
        el.style.opacity = '0';
        el.style.setProperty('--frag-alpha', String(0.35 + depth * 0.22));
        root.appendChild(el);
        items.push({ el, depth, phase: Math.random() * 6.28, drift: 4 + Math.random() * 8 });
      }
      // Fade in on the next frame, staggered.
      requestAnimationFrame(() => items.forEach((it, k) => {
        it.el.style.transitionDelay = (k * 35) + 'ms';
        it.el.style.opacity = 'var(--frag-alpha)';
      }));
    },
    update(t, ndc, still) {
      for (const it of items) {
        const p = DEPTHS[it.depth];
        const dx = still ? 0 : -ndc.x * p + Math.sin(t * 0.13 + it.phase) * it.drift;
        const dy = still ? 0 : ndc.y * p + Math.cos(t * 0.11 + it.phase) * it.drift * 0.6;
        it.el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      }
    },
  };
}
