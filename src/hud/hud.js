// The HUD: real HTML and SVG over the canvas. Nav, recipe list, title card with decode,
// leader line, chevrons, cursor/clock readouts, progress tick, floating fragments, and the
// recipe sheet (what's in a recipe), opened from each list row's ⓘ or the card's Recipe button.

import './hud.css';
import { S } from '../settings/store.js';
import { BY_KEY } from '../settings/schema.js';
import { createDecoder } from './decode.js';
import { createLeader } from './leader.js';
import { createFragments } from './fragments.js';

const pad = (n) => String(n).padStart(2, '0');
const INFO = `<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true" fill="none" stroke="currentColor"><circle cx="6.5" cy="6.5" r="5.8"/><path d="M6.5 5.6V9.6M6.5 3.4V4.2" stroke-linecap="round"/></svg>`;

const label = (key, v) => (BY_KEY[key].options.find(([o]) => o === v) || [v, v])[1];
const swatch = (c) => `<span class="sw" style="background:${c}"></span>`;
const level = (v, steps) => steps.find(([t]) => v <= t)[1];

// Plain-language summary of a recipe's settings.
function describe(r) {
  const v = r.values;
  const colors = v.colorMode === 'source' ? 'From the image'
    : v.colorMode === 'solid' ? `${swatch(v.colorA)} Solid`
    : `${swatch(v.colorA)}${swatch(v.colorB)} By ${v.colorMode === 'speed' ? 'speed' : 'depth'}`;
  const rows = [
    ['Shape', label('shapeSource', v.shapeSource) + (v.shapeFill === 'volume' ? ', filled' : '')],
    ['Mood', r.mood.join(' · ').toLowerCase()],
    ['Colors', colors],
    ['Void', `${swatch(v.bgTop)}${swatch(v.bgBottom)}`],
    ['Particles', `${label('sprite', v.sprite).toLowerCase()}s, ${v.size} px${v.sparkle ? `, ${Math.round(v.sparkle * 100)}% sparkle` : ''}`],
    ['Wiggle', `${level(v.noiseStrength, [[0.5, 'gentle'], [1.4, 'moderate'], [2.2, 'strong'], [99, 'wild']])} (${v.noiseStrength})`],
    ['Settle', v.settle ? `calms ${Math.round(v.settle * 100)}% over ${v.settleTime} s` : 'never calms'],
    ['Trails', v.trails ? `${level(v.trails, [[0.5, 'short'], [0.8, 'medium'], [0.9, 'long'], [1, 'very long']])} (${v.trails})` : 'off'],
    ['Glow', v.bloomStrength ? `${level(v.bloomStrength, [[0.5, 'faint'], [1, 'soft'], [1.25, 'strong'], [9, 'blazing']])} (${v.bloomStrength})` : 'none'],
  ];
  if (v.gravity) rows.push(['Drift', v.gravity > 0 ? 'rises' : 'falls']);
  return `<dl>${rows.map(([k, d]) => `<div><dt>${k}</dt><dd>${d}</dd></div>`).join('')}</dl>`;
}

export function createHud(root, { recipes, onSelect, onStep }) {
  root.className = 'hud';
  root.innerHTML = `
    <nav class="hud-nav" aria-label="Site">
      <span class="hud-bracket" aria-hidden="true">[ NAV ]</span>
      <div class="hud-nav-row">
        <button type="button" data-nav="work" aria-pressed="true">WORK</button>
        <button type="button" data-nav="about" aria-expanded="false" aria-controls="hud-about">ABOUT</button>
        <button type="button" data-nav="contact" aria-expanded="false" aria-controls="hud-contact">CONTACT</button>
      </div>
      <span class="hud-bracket hud-index-label" aria-hidden="true">[ RECIPES ]</span>
      <ol class="hud-index" aria-label="Recipes">
        ${recipes.map((r, i) => `<li>
          <button type="button" class="hud-pick" data-i="${i}"><span class="num">${pad(i + 1)}</span>${r.name}</button>
          <button type="button" class="hud-info" data-i="${i}" aria-label="What’s in ${r.name}" aria-expanded="false" aria-controls="hud-recipe">${INFO}</button>
        </li>`).join('')}
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
    <section class="hud-pop hud-recipe" id="hud-recipe" hidden aria-labelledby="recipe-title">
      <div class="hud-recipe-head">
        <span class="hud-bracket" id="recipe-title"></span>
        <button type="button" class="hud-close" aria-label="Close recipe">×</button>
      </div>
      <p class="hud-recipe-desc"></p>
      <div class="hud-recipe-body"></div>
      <button type="button" class="hud-use">Use this recipe</button>
    </section>
    <article class="hud-card" aria-labelledby="card-name">
      <div class="hud-tag" aria-hidden="true"><span></span><span></span><span></span></div>
      <h2 class="hud-name" id="card-name"><span class="sr" id="card-name-sr"></span><span class="hud-name-vis" aria-hidden="true"></span></h2>
      <button type="button" class="hud-card-info" aria-expanded="false" aria-controls="hud-recipe">${INFO}<span>RECIPE</span></button>
    </article>
    <svg class="hud-leader" aria-hidden="true"><polyline fill="none"/><circle r="2.5"/></svg>
    <button type="button" class="hud-chev hud-prev" aria-label="Previous recipe">«</button>
    <button type="button" class="hud-chev hud-next" aria-label="Next recipe">»</button>
    <div class="hud-progress" aria-hidden="true"><span></span></div>
    <div class="hud-readout" aria-hidden="true"><span class="hud-xy">X 0.000 · Y 0.000</span><span class="hud-clock"></span></div>
    <div class="hud-frags" aria-hidden="true"></div>`;

  const $ = (s) => root.querySelector(s);
  const card = $('.hud-card'), nameVis = $('.hud-name-vis'), nameSr = $('#card-name-sr');
  const tagSpans = [...root.querySelectorAll('.hud-tag span')];
  const nameDecoder = createDecoder(nameVis);
  const tagDecoders = tagSpans.map((el) => createDecoder(el));
  const leader = createLeader($('.hud-leader'), $('.hud-tag'));
  const frags = createFragments($('.hud-frags'), () => [card, $('.hud-nav'), sheet].filter((el) => !el.hidden));
  const xyEl = $('.hud-xy'), clockEl = $('.hud-clock'), tick = $('.hud-progress span');
  const pickBtns = [...root.querySelectorAll('.hud-pick')];
  const infoBtns = [...root.querySelectorAll('.hud-info')];
  const cardInfo = $('.hud-card-info');
  const sheet = $('#hud-recipe');

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
    if (which) closeSheet();
  }
  navBtns.forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.nav;
    openPop(k === 'work' || !pops[k].hidden ? null : k);
  }));

  // Recipe sheet. `sheetFor` is a recipe index, or 'card' to follow the active recipe.
  let sheetFor = null, current = 0, opener = null;
  function fillSheet(i) {
    const r = recipes[i];
    $('#recipe-title').textContent = `[ ${pad(i + 1)} · ${r.name.toUpperCase()} ]`;
    $('.hud-recipe-desc').textContent = r.description;
    $('.hud-recipe-body').innerHTML = describe(r);
    $('.hud-use').hidden = i === current;
    $('.hud-use').dataset.i = i;
  }
  function placeSheet(btn) {
    const r = btn.getBoundingClientRect();
    if (btn === cardInfo) {
      const c = card.getBoundingClientRect();
      sheet.style.left = c.left + 'px';
      sheet.style.top = r.bottom + 14 + 'px';
    } else {
      sheet.style.left = r.right + 14 + 'px';
      sheet.style.top = Math.max(16, r.top - 12) + 'px';
    }
  }
  function openSheet(target, btn) {
    openPop(null);
    sheetFor = target;
    opener = btn;
    fillSheet(target === 'card' ? current : target);
    sheet.hidden = false;
    placeSheet(btn);
    [...infoBtns, cardInfo].forEach((b) => b.setAttribute('aria-expanded', String(b === btn)));
  }
  function closeSheet({ refocus = false } = {}) {
    if (sheet.hidden) return;
    sheet.hidden = true;
    sheetFor = null;
    [...infoBtns, cardInfo].forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (refocus && opener) opener.focus();
  }
  infoBtns.forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    if (sheetFor === i) closeSheet(); else openSheet(i, b);
  }));
  cardInfo.addEventListener('click', () => (sheetFor === 'card' ? closeSheet() : openSheet('card', cardInfo)));
  $('.hud-close').addEventListener('click', () => closeSheet({ refocus: true }));
  $('.hud-use').addEventListener('click', (e) => { const i = +e.currentTarget.dataset.i; closeSheet(); onSelect(i); });

  pickBtns.forEach((b) => b.addEventListener('click', () => onSelect(+b.dataset.i)));
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
  window.addEventListener('resize', () => { fitName(recipes[current].name); if (!sheet.hidden && opener) placeSheet(opener); });
  document.fonts?.ready.then(() => fitName(recipes[current].name));

  let lastSec = -1;
  return {
    root,
    closePops() { openPop(null); closeSheet({ refocus: true }); },
    setRecipe(i, { instant = false } = {}) {
      current = i;
      const r = recipes[i];
      nameSr.textContent = r.name;
      fitName(r.name);
      nameDecoder.run(r.name.toUpperCase(), { ms: S.decodeMs, glyphs: S.decodeGlyphs, instant });
      r.tag.forEach((t, k) => tagDecoders[k].run(t, { ms: S.decodeMs * 0.55, glyphs: S.decodeGlyphs, instant }));
      cardInfo.setAttribute('aria-label', `What’s in ${r.name}`);
      pickBtns.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
      const f = recipes.length > 1 ? i / (recipes.length - 1) : 0;
      tick.style.top = (f * 100).toFixed(2) + '%';
      if (sheetFor === 'card') fillSheet(i);
      else if (sheetFor !== null) fillSheet(sheetFor);
      frags.build(S.fragments, r, i);
    },
    rebuildFragments() { frags.build(S.fragments, recipes[current], current); },
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
