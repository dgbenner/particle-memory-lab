// The HUD: real HTML and SVG over the canvas. Nav, project index, project card with decode,
// leader line, chevrons, cursor/clock readouts, progress tick and floating fragments.

import './hud.css';
import { S } from '../settings/store.js';
import { createDecoder } from './decode.js';
import { createLeader } from './leader.js';
import { createFragments } from './fragments.js';

const pad = (n) => String(n).padStart(2, '0');

export function createHud(root, { projects, onSelect, onStep }) {
  root.className = 'hud';
  root.innerHTML = `
    <nav class="hud-nav" aria-label="Site">
      <span class="hud-bracket" aria-hidden="true">[ NAV ]</span>
      <div class="hud-nav-row">
        <button type="button" data-nav="work" aria-pressed="true">WORK</button>
        <button type="button" data-nav="about" aria-expanded="false" aria-controls="hud-about">ABOUT</button>
        <button type="button" data-nav="contact" aria-expanded="false" aria-controls="hud-contact">CONTACT</button>
      </div>
      <span class="hud-bracket hud-index-label" aria-hidden="true">[ INDEX ]</span>
      <ol class="hud-index" aria-label="Projects">
        ${projects.map((p, i) => `<li><button type="button" data-i="${i}"><span class="num">${pad(i + 1)}</span>${p.name}</button></li>`).join('')}
      </ol>
    </nav>
    <section class="hud-pop" id="hud-about" hidden aria-label="About">
      <span class="hud-bracket" aria-hidden="true">[ ABOUT ]</span>
      <p>Placeholder. A short paragraph about the studio and the work goes here.</p>
      <p class="dim">Particle Memory Lab · experiments in assembling, dissolving and reassembling form.</p>
    </section>
    <section class="hud-pop" id="hud-contact" hidden aria-label="Contact">
      <span class="hud-bracket" aria-hidden="true">[ CONTACT ]</span>
      <p>Placeholder. Contact details go here.</p>
      <p class="dim">hello@example.com</p>
    </section>
    <article class="hud-card" aria-labelledby="card-name">
      <div class="hud-tag" aria-hidden="true"><span></span><span></span><span></span></div>
      <h2 class="hud-name" id="card-name"><span class="sr" id="card-name-sr"></span><span class="hud-name-vis" aria-hidden="true"></span></h2>
      <a class="hud-link" href="#"><span aria-hidden="true">→ </span>VIEW PROJECT</a>
    </article>
    <svg class="hud-leader" aria-hidden="true"><polyline fill="none"/><circle r="2.5"/></svg>
    <button type="button" class="hud-chev hud-prev" aria-label="Previous project">«</button>
    <button type="button" class="hud-chev hud-next" aria-label="Next project">»</button>
    <div class="hud-progress" aria-hidden="true"><span></span></div>
    <div class="hud-readout" aria-hidden="true"><span class="hud-xy">X 0.000 · Y 0.000</span><span class="hud-clock"></span></div>
    <div class="hud-frags" aria-hidden="true"></div>`;

  const $ = (s) => root.querySelector(s);
  const card = $('.hud-card'), nameVis = $('.hud-name-vis'), nameSr = $('#card-name-sr'), link = $('.hud-link');
  const tagSpans = [...root.querySelectorAll('.hud-tag span')];
  const nameDecoder = createDecoder(nameVis);
  const tagDecoders = tagSpans.map((el) => createDecoder(el));
  const leader = createLeader($('.hud-leader'), $('.hud-tag'));
  const frags = createFragments($('.hud-frags'), () => [card, $('.hud-nav')]);
  const xyEl = $('.hud-xy'), clockEl = $('.hud-clock'), tick = $('.hud-progress span');
  const indexBtns = [...root.querySelectorAll('.hud-index button')];

  // Nav: WORK closes the panels; ABOUT / CONTACT toggle theirs.
  const pops = { about: $('#hud-about'), contact: $('#hud-contact') };
  const navBtns = [...root.querySelectorAll('[data-nav]')];
  function openPop(which) {
    for (const [k, el] of Object.entries(pops)) el.hidden = k !== which;
    navBtns.forEach((b) => {
      const k = b.dataset.nav;
      if (k === 'work') b.setAttribute('aria-pressed', String(!which));
      else b.setAttribute('aria-expanded', String(k === which));
    });
  }
  navBtns.forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.nav;
    openPop(k === 'work' || !pops[k].hidden ? null : k);
  }));
  indexBtns.forEach((b) => b.addEventListener('click', () => onSelect(+b.dataset.i)));
  $('.hud-prev').addEventListener('click', () => onStep(-1));
  $('.hud-next').addEventListener('click', () => onStep(1));

  window.addEventListener('pointermove', (e) => {
    xyEl.textContent = `X ${(e.clientX / innerWidth).toFixed(3)} · Y ${(e.clientY / innerHeight).toFixed(3)}`;
  }, { passive: true });

  // Size the name so its longest word fits the card on one line (words never break mid-word).
  const measure = document.createElement('canvas').getContext('2d');
  function fitName(name) {
    const w = card.clientWidth || 300;
    const longest = name.toUpperCase().split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
    measure.font = `200 100px ${getComputedStyle(nameVis).fontFamily}`;
    const per100 = measure.measureText(longest).width + longest.length * 4; // + letter-spacing 0.04em
    const size = Math.max(22, Math.min(64, (w / per100) * 100 * 0.97));
    card.style.setProperty('--name-size', size.toFixed(1) + 'px');
  }
  window.addEventListener('resize', () => fitName(projects[current].name));
  document.fonts?.ready.then(() => fitName(projects[current].name));

  let lastSec = -1, current = 0;
  return {
    root,
    closePops() { openPop(null); },
    setProject(i, { instant = false } = {}) {
      current = i;
      const p = projects[i];
      nameSr.textContent = p.name;
      fitName(p.name);
      nameDecoder.run(p.name.toUpperCase(), { ms: S.decodeMs, glyphs: S.decodeGlyphs, instant });
      p.tag.forEach((t, k) => tagDecoders[k].run(t, { ms: S.decodeMs * 0.55, glyphs: S.decodeGlyphs, instant }));
      const live = p.url && p.url !== '#';
      if (live) { link.href = p.url; link.removeAttribute('aria-disabled'); link.tabIndex = 0; }
      else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); link.tabIndex = -1; }
      link.setAttribute('aria-label', live ? `View project: ${p.name}` : `${p.name}: no link yet`);
      indexBtns.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
      const f = projects.length > 1 ? i / (projects.length - 1) : 0;
      tick.style.top = (f * 100).toFixed(2) + '%';
      frags.build(S.fragments, p, i);
    },
    rebuildFragments() { frags.build(S.fragments, projects[current], current); },
    update(camera, ndc, dt, reduced) {
      root.dataset.style = S.hudStyle;
      root.style.opacity = S.hudOpacity;
      leader.update(camera, dt);
      frags.update(performance.now() / 1000, ndc, reduced);
      const d = new Date(), sec = d.getSeconds();
      if (sec !== lastSec) {
        lastSec = sec;
        clockEl.textContent = `${S.city}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(sec)}`;
      }
    },
  };
}
