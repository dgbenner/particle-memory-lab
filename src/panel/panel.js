// Control panel, built entirely from the schema. Docked right by default; can float and be dragged.

import './panel.css';
import { SCHEMA, SECTIONS, BY_KEY } from '../settings/schema.js';
import { PRESETS } from '../settings/presets.js';
import { S, set, onChange, toJSON, fromJSON } from '../settings/store.js';

const OPEN_KEY = 'particle-memory-lab:sections';
const OPEN_DEFAULT = ['Recipes', 'Particles', 'Forces'];

const fmt = (s, v) => {
  if (s.type !== 'range') return '';
  const dec = s.step < 0.001 ? 4 : s.step < 0.01 ? 3 : s.step < 0.1 ? 2 : s.step < 1 ? 1 : 0;
  return (+v).toFixed(dec) + (s.unit || '');
};

export function createPanel(root, { onAction, disabledOptions = {} }) {
  root.className = 'panel';
  root.setAttribute('aria-label', 'Controls');
  root.innerHTML = `
    <header class="panel-head">
      <span class="panel-title">Particle Memory Lab</span>
      <span class="panel-tools">
        <button type="button" class="pbtn" data-act="detach" aria-pressed="false">Float</button>
        <button type="button" class="pbtn" data-act="hide" aria-label="Hide controls (H)">Hide</button>
      </span>
    </header>
    <div class="panel-readout" aria-live="off"><span id="ro-fps">— fps</span><span id="ro-count">—</span></div>
    <div class="panel-body"></div>`;
  const body = root.querySelector('.panel-body');

  let open = OPEN_DEFAULT;
  try { const o = JSON.parse(localStorage.getItem(OPEN_KEY) || 'null'); if (Array.isArray(o)) open = o; } catch (e) {}
  const saveOpen = () => {
    try { localStorage.setItem(OPEN_KEY, JSON.stringify([...body.querySelectorAll('details')].filter((d) => d.open).map((d) => d.dataset.sec))); } catch (e) {}
  };

  const inputs = {};
  for (const sec of SECTIONS) {
    const d = document.createElement('details');
    d.dataset.sec = sec;
    d.open = open.includes(sec);
    d.innerHTML = `<summary>${sec}</summary><div class="sec-body"></div>`;
    d.addEventListener('toggle', saveOpen);
    const sb = d.querySelector('.sec-body');
    body.appendChild(d);

    if (sec === 'Recipes') {
      sb.innerHTML = `<div class="presets" role="group" aria-label="Recipes">${PRESETS.map((p) =>
        `<button type="button" class="pbtn" data-preset="${p.id}" aria-pressed="false">${p.name}</button>`).join('')}</div>
        <p class="hint" id="preset-desc"></p>`;
      sb.querySelectorAll('[data-preset]').forEach((b) =>
        b.addEventListener('click', () => onAction('recipe', b.dataset.preset)));
      continue;
    }
    if (sec === 'Settings') {
      sb.innerHTML = `
        <div class="row-btns">
          <button type="button" class="pbtn" data-act="copy">Copy settings</button>
          <button type="button" class="pbtn" data-act="reset">Reset to recipe</button>
        </div>
        <label class="ctl-label" for="paste-box">Paste settings</label>
        <textarea id="paste-box" rows="3" spellcheck="false" placeholder="Paste copied JSON here"></textarea>
        <div class="row-btns"><button type="button" class="pbtn" data-act="paste">Apply pasted settings</button></div>
        <p class="status" id="settings-status" role="status"></p>
        <p class="hint">Changes save in this browser automatically.</p>`;
      continue;
    }

    for (const s of SCHEMA.filter((x) => x.section === sec && x.type !== 'hidden')) {
      const id = 'set-' + s.key;
      const wrap = document.createElement('div');
      wrap.className = 'ctl' + (s.type === 'toggle' ? ' ctl-toggle' : '');
      if (s.type === 'range') {
        wrap.innerHTML = `<div class="ctl-top"><label for="${id}">${s.label}</label><output for="${id}"></output></div>
          <input type="range" id="${id}" min="${s.min}" max="${s.max}" step="${s.step}">`;
      } else if (s.type === 'select') {
        wrap.innerHTML = `<label class="ctl-label" for="${id}">${s.label}</label><select id="${id}">${s.options.map(([v, l]) =>
          `<option value="${v}"${(disabledOptions[s.key] || []).includes(v) ? ' disabled' : ''}>${l}</option>`).join('')}</select>`;
      } else if (s.type === 'color') {
        wrap.innerHTML = `<label class="ctl-color" for="${id}"><span>${s.label}</span><input type="color" id="${id}"></label>`;
      } else if (s.type === 'toggle') {
        wrap.innerHTML = `<label class="ctl-check" for="${id}"><input type="checkbox" id="${id}"> ${s.label}</label>`;
      } else if (s.type === 'text') {
        wrap.innerHTML = `<label class="ctl-label" for="${id}">${s.label}</label><input type="text" id="${id}" maxlength="${s.maxLength || 40}" spellcheck="false" autocomplete="off">`;
      } else if (s.type === 'file') {
        wrap.innerHTML = `<div class="ctl-top"><span>${s.label}</span><span class="file-name" aria-live="polite"></span></div>
          <input type="file" id="${id}" accept="${s.accept || ''}" class="sr"><label class="pbtn file-btn" for="${id}">Choose file\u2026</label>`;
      }
      if (s.hint) wrap.insertAdjacentHTML('beforeend', `<p class="hint">${s.hint}</p>`);
      sb.appendChild(wrap);
      const el = wrap.querySelector('#' + id);
      if (s.type === 'file') {
        const nameEl = wrap.querySelector('.file-name');
        el.addEventListener('change', () => {
          const f = el.files[0];
          if (!f) return;
          nameEl.textContent = f.name.length > 22 ? f.name.slice(0, 20) + '\u2026' : f.name;
          onAction('file', s.key, f, (msg) => (nameEl.textContent = msg));
          el.value = '';
        });
        continue;
      }
      inputs[s.key] = { el, out: wrap.querySelector('output') };
      el.addEventListener(s.type === 'text' ? 'change' : 'input', () => {
        const v = s.type === 'toggle' ? el.checked : s.type === 'range' ? parseFloat(el.value) : el.value;
        set({ [s.key]: v });
      });
    }
  }

  function syncAll(keys = Object.keys(inputs)) {
    for (const k of keys) {
      const c = inputs[k];
      if (!c) continue;
      const s = BY_KEY[k];
      if (s.type === 'toggle') c.el.checked = !!S[k];
      else if (c.el.value !== String(S[k])) c.el.value = S[k];
      if (c.out) c.out.textContent = fmt(s, S[k]);
    }
    root.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === S.preset)));
    const p = PRESETS.find((x) => x.id === S.preset);
    root.querySelector('#preset-desc').textContent = p ? p.description : '';
  }
  onChange((keys) => syncAll(keys.includes('preset') ? undefined : keys));
  syncAll();

  // Settings actions
  const status = root.querySelector('#settings-status');
  const flash = (m) => { status.textContent = m; clearTimeout(flash.t); flash.t = setTimeout(() => (status.textContent = ''), 2600); };
  root.querySelector('[data-act=copy]').addEventListener('click', () => {
    const text = toJSON();
    const fallback = () => {
      const box = root.querySelector('#paste-box');
      box.value = text; box.focus(); box.select();
      flash('Clipboard blocked. The settings are selected in the box: press Cmd+C.');
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => flash('Copied'), fallback);
    else fallback();
  });
  root.querySelector('[data-act=paste]').addEventListener('click', () => {
    const box = root.querySelector('#paste-box');
    try { const n = fromJSON(box.value); flash(`Applied ${n} setting${n === 1 ? '' : 's'}`); }
    catch (e) { flash('That isn’t valid settings JSON.'); }
  });
  root.querySelector('[data-act=reset]').addEventListener('click', () => {
    onAction('recipe', S.preset);
    flash('Reset to ' + (PRESETS.find((p) => p.id === S.preset)?.name || 'recipe'));
  });

  // Hide / float
  root.querySelector('[data-act=hide]').addEventListener('click', () => onAction('hide'));
  const detachBtn = root.querySelector('[data-act=detach]');
  detachBtn.addEventListener('click', () => {
    const on = !root.classList.contains('floating');
    root.classList.toggle('floating', on);
    detachBtn.setAttribute('aria-pressed', String(on));
    detachBtn.textContent = on ? 'Dock' : 'Float';
    if (!on) { root.style.left = ''; root.style.top = ''; }
  });
  const head = root.querySelector('.panel-head');
  head.addEventListener('pointerdown', (e) => {
    if (!root.classList.contains('floating') || e.target.closest('button')) return;
    const r = root.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      root.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - dx)) + 'px';
      root.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + 'px';
    };
    const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); };
    head.addEventListener('pointermove', mv);
    head.addEventListener('pointerup', up);
  });

  const fpsEl = root.querySelector('#ro-fps'), countEl = root.querySelector('#ro-count');
  return {
    readout(fps, count) {
      fpsEl.textContent = fps.toFixed(0) + ' fps';
      countEl.textContent = count.toLocaleString() + ' particles';
    },
  };
}
