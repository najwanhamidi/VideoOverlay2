// Small UI component library for property panels.
import { el, hex6, alphaOf, setAlpha, clamp } from '../util.js';
import { FONTS } from '../render/fontlist.js';
import { ICON_NAMES, drawIcon } from '../render/draw.js';
import { EMOJIS } from '../widgets/media.js';
import { App } from './state.js';

export function section(title, body, opts = {}) {
  const key = 'sec:' + (opts.key || title);
  let open = opts.open ?? true;
  try { const v = localStorage.getItem(key); if (v != null) open = v === '1'; } catch (e) { /* ignore */ }
  const s = el('div', { class: 'sec' + (open ? ' open' : '') });
  const h = el('button', { class: 'sec-h', type: 'button' }, el('span', {}, title), el('i', { class: 'chev' }));
  h.onclick = () => { s.classList.toggle('open'); try { localStorage.setItem(key, s.classList.contains('open') ? '1' : '0'); } catch (e) { /* ignore */ } };
  s.append(h, el('div', { class: 'sec-b' }, body));
  return s;
}
export function row(label, control, opts = {}) {
  return el('label', { class: 'row' + (opts.half ? ' half' : '') + (opts.stack ? ' stack' : '') }, label ? el('span', { class: 'lbl' }, label) : null, control);
}

export function textInput(val, onInput, opts = {}) {
  const i = el('input', { type: 'text', value: val ?? '', placeholder: opts.placeholder || '' });
  i.addEventListener('input', () => onInput(i.value, false));
  i.addEventListener('change', () => onInput(i.value, true));
  i._set = (v) => { if (document.activeElement !== i) i.value = v ?? ''; };
  return i;
}
export function textArea(val, onInput, opts = {}) {
  const t = el('textarea', { rows: opts.rows || 3 }); t.value = val ?? '';
  t.addEventListener('input', () => onInput(t.value, false));
  t.addEventListener('change', () => onInput(t.value, true));
  t._set = (v) => { if (document.activeElement !== t) t.value = v ?? ''; };
  return t;
}
export function numInput(val, onInput, opts = {}) {
  const i = el('input', { type: 'number', value: fmtN(val), step: opts.step ?? 1, min: opts.min, max: opts.max });
  i.addEventListener('input', () => { const v = parseFloat(i.value); if (isFinite(v)) onInput(v, false); });
  i.addEventListener('change', () => { const v = parseFloat(i.value); if (isFinite(v)) onInput(v, true); });
  i._set = (v) => { if (document.activeElement !== i) i.value = fmtN(v); };
  return i;
}
function fmtN(v) { return typeof v === 'number' ? Math.round(v * 100) / 100 : v ?? ''; }
export function range(val, onInput, opts = {}) {
  const wrap = el('div', { class: 'range' });
  const r = el('input', { type: 'range', min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1, value: val ?? 0 });
  const n = el('input', { type: 'number', min: opts.min, max: opts.max, step: opts.step ?? 1, value: fmtN(val) });
  r.addEventListener('input', () => { n.value = fmtN(+r.value); onInput(+r.value, false); });
  r.addEventListener('change', () => onInput(+r.value, true));
  n.addEventListener('change', () => { const v = parseFloat(n.value); if (isFinite(v)) { r.value = v; onInput(v, true); } });
  wrap.append(r, n);
  wrap._set = (v) => { if (document.activeElement !== n && document.activeElement !== r) { r.value = v ?? 0; n.value = fmtN(v); } };
  return wrap;
}
export function select(val, options, onChange) {
  const s = el('select', {}, options.map(([v, l]) => el('option', { value: v }, l)));
  s.value = val;
  s.addEventListener('change', () => onChange(s.value, true));
  s._set = (v) => { s.value = v; };
  return s;
}
export function seg(val, options, onChange) {
  const w = el('div', { class: 'seg' });
  const btns = options.map(([v, l]) => { const b = el('button', { type: 'button', class: v === val ? 'on' : '' }, l); b.onclick = () => { btns.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onChange(v, true); }; b._v = v; return b; });
  w.append(...btns);
  w._set = (v) => btns.forEach((b) => b.classList.toggle('on', b._v === v));
  return w;
}
export function toggle(val, onChange) {
  const i = el('input', { type: 'checkbox', class: 'tgl' }); i.checked = !!val;
  i.addEventListener('change', () => onChange(i.checked, true));
  i._set = (v) => { i.checked = !!v; };
  return i;
}
export function button(label, onClick, cls = '') { const b = el('button', { type: 'button', class: 'btn ' + cls }, label); b.onclick = onClick; return b; }

// Color control: theme swatches + picker + alpha
export function colorInput(val, onChange, opts = {}) {
  const w = el('div', { class: 'color' });
  const sw = el('div', { class: 'sw' });
  const theme = App.doc.theme;
  const chips = ['@text', '@muted', '@accent', '@accent2'].map((k) => {
    const c = el('button', { type: 'button', class: 'chip', title: 'Theme ' + k.slice(1), style: { background: theme[k.slice(1)] } });
    c.onclick = () => { onChange(k, true); setv(k); }; c._k = k; return c;
  });
  const pick = el('input', { type: 'color' });
  const alpha = el('input', { type: 'range', min: 0, max: 1, step: 0.01, class: 'alpha', title: 'Opacity' });
  const hex = el('input', { type: 'text', class: 'hex', maxlength: 9 });
  let cur = val;
  const resolve = (v) => (v && v[0] === '@' ? theme[v.slice(1)] || '#ffffff' : v || '#ffffff');
  function setv(v) {
    cur = v;
    const r = resolve(v);
    if (document.activeElement !== pick) pick.value = hex6(r);
    if (document.activeElement !== alpha) alpha.value = alphaOf(r);
    if (document.activeElement !== hex) hex.value = v && v[0] === '@' ? v : r;
    sw.style.setProperty('--c', r);
    chips.forEach((c) => c.classList.toggle('on', c._k === v));
  }
  pick.addEventListener('input', () => { const v = setAlpha(pick.value, +alpha.value); onChange(v, false); setv(v); });
  pick.addEventListener('change', () => onChange(cur, true));
  alpha.addEventListener('input', () => { const v = setAlpha(resolve(cur), +alpha.value); onChange(v, false); setv(v); });
  alpha.addEventListener('change', () => onChange(cur, true));
  hex.addEventListener('change', () => { let v = hex.value.trim(); if (/^#?[0-9a-f]{3,8}$/i.test(v)) { if (v[0] !== '#') v = '#' + v; onChange(v, true); setv(v); } else if (/^@(text|muted|accent|accent2)$/.test(v)) { onChange(v, true); setv(v); } });
  const pw = el('div', { class: 'pickwrap' }, sw, pick);
  w.append(pw, el('div', { class: 'chips' }, chips), alpha, hex);
  setv(val);
  w._set = setv;
  return w;
}

const loadedCustom = new Set();
export function fontList() { return [...FONTS.map((f) => f.name), ...App.customFonts || []]; }
export function fontSelect(val, onChange) {
  const s = el('select', { class: 'font-sel' }, fontList().map((f) => el('option', { value: f, style: { fontFamily: `"${f}"` } }, f)));
  s.value = val;
  s.addEventListener('change', () => onChange(s.value, true));
  s._set = (v) => { s.value = v; };
  return s;
}
export function weightsFor(font) { const f = FONTS.find((x) => x.name === font); return f ? f.weights : [400, 700]; }

// Popover grid picker
export function popPicker(anchor, items, render, onPick) {
  closePop();
  const pop = el('div', { class: 'pop' });
  const grid = el('div', { class: 'pop-grid' });
  const search = el('input', { type: 'search', placeholder: 'Search…' });
  const draw = (q) => {
    grid.innerHTML = '';
    for (const it of items) { if (q && !String(it).includes(q)) continue; const b = el('button', { type: 'button', title: it }); render(b, it); b.onclick = () => { onPick(it); closePop(); }; grid.append(b); }
  };
  search.oninput = () => draw(search.value.trim().toLowerCase());
  pop.append(search, grid); draw('');
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  const pw = Math.min(340, window.innerWidth - 16);
  pop.style.width = pw + 'px';
  pop.style.left = clamp(r.left, 8, window.innerWidth - pw - 8) + 'px';
  const below = r.bottom + 6, h = Math.min(360, window.innerHeight * 0.5);
  pop.style.top = (below + h > window.innerHeight ? Math.max(8, r.top - h - 6) : below) + 'px';
  pop.style.maxHeight = h + 'px';
  setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  function outside(e) { if (!pop.contains(e.target)) closePop(); }
  pop._off = () => document.removeEventListener('pointerdown', outside);
}
export function closePop() { document.querySelectorAll('.pop').forEach((p) => { p._off && p._off(); p.remove(); }); }
export function iconCanvas(name, size = 28, color = '#e8ecf3') {
  const c = el('canvas', { width: size * 2, height: size * 2, style: { width: size + 'px', height: size + 'px' } });
  const x = c.getContext('2d'); x.scale(2, 2); drawIcon(x, name, 2, 2, size - 4, color, { stroke: 2 });
  return c;
}
export function iconPicker(val, onChange) {
  const b = el('button', { type: 'button', class: 'btn icon-pick' });
  const set = (v) => { b.innerHTML = ''; if (v) b.append(iconCanvas(v, 22)); b.append(el('span', {}, v || 'Auto')); };
  set(val);
  b.onclick = () => popPicker(b, ['', ...ICON_NAMES], (btn, n) => { if (n) btn.append(iconCanvas(n, 26)); else btn.textContent = 'Auto'; }, (n) => { set(n); onChange(n, true); });
  b._set = set;
  return b;
}
export function emojiPicker(val, onChange) {
  const b = el('button', { type: 'button', class: 'btn emoji-pick' }, val);
  b.onclick = () => popPicker(b, EMOJIS, (btn, e) => { btn.textContent = e; btn.classList.add('emo'); }, (e) => { b.textContent = e; onChange(e, true); });
  b._set = (v) => { b.textContent = v; };
  return b;
}
export function toast(msg, kind = '') {
  const t = el('div', { class: 'toast ' + kind }, msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, kind === 'err' ? 5000 : 2600);
}
export function modal(title, body, actions = []) {
  const bg = el('div', { class: 'modal-bg' });
  const m = el('div', { class: 'modal' }, el('div', { class: 'modal-h' }, el('h3', {}, title), button('✕', () => close(), 'ghost x')), el('div', { class: 'modal-b' }, body), actions.length ? el('div', { class: 'modal-f' }, actions) : null);
  bg.append(m); document.body.append(bg);
  bg.addEventListener('pointerdown', (e) => { if (e.target === bg) close(); });
  function close() { bg.remove(); }
  return { close, el: m };
}
export { loadedCustom };
