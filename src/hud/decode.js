// Text decode: each character runs through solid blocks, then random glyphs, then resolves,
// left to right with jitter.

export const GLYPHS = {
  code: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>_|',
  blocks: '█▓▒',
  binary: '01',
};
const BLOCKS = '█▓▒';

export function createDecoder(el) {
  let raf = 0;
  return {
    run(text, { ms = 700, glyphs = 'code', instant = false } = {}) {
      cancelAnimationFrame(raf);
      if (instant || ms <= 0) { el.textContent = text; return; }
      const set = GLYPHS[glyphs] || GLYPHS.code;
      const chars = [...text];
      const n = chars.length;
      // When each position resolves (ms from start)
      const at = chars.map((_, i) => ms * (0.65 * (n > 1 ? i / (n - 1) : 0) + 0.35 * Math.random()));
      const t0 = performance.now();
      let lastRoll = -1, rolled = [];
      const tick = (now) => {
        const t = now - t0;
        const roll = Math.floor(t / 45);
        if (roll !== lastRoll) {
          lastRoll = roll;
          rolled = chars.map(() => set[(Math.random() * set.length) | 0]);
        }
        let out = '';
        for (let i = 0; i < n; i++) {
          const c = chars[i];
          if (c === ' ' || t >= at[i]) { out += c; continue; }
          // First stretch of each position's wait shows blocks, the rest random glyphs.
          out += t < at[i] * 0.4 ? BLOCKS[(i + roll) % BLOCKS.length] : rolled[i];
        }
        el.textContent = out;
        if (t < ms) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    },
  };
}
