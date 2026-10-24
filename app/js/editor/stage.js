// Workspace: canvas rendering, zoom/pan, selection, move/resize/rotate, snapping, marquee.
import { App, on, emit, makeEnv, byId, selected, setSel, commit, layoutAll, setTextSel, currentText, setTextOverride, tselStyle } from './state.js';
import { REG, renderScene, textHits, hitContains, hitCorners } from '../widgets/core.js';
import { fontStr } from '../render/draw.js';
import { rad, clamp } from '../util.js';

const $ = (s) => document.querySelector(s);
export const view = { zoom: 0.3, fit: true, hover: null, hoverText: null };
let selHits = [], inlineEd = null;
let canvas, ctx, stageEl, scrollEl, overlay, selBox, marqueeEl, guideEls = [], toolbarEl;
let needRender = true;

export function initStage() {
  scrollEl = $('#stage-scroll'); stageEl = $('#stage'); canvas = $('#view'); overlay = $('#overlay');
  ctx = canvas.getContext('2d');
  selBox = document.createElement('div'); selBox.className = 'selbox'; overlay.append(selBox);
  for (const h of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rot']) { const d = document.createElement('div'); d.className = 'handle h-' + h; d.dataset.h = h; selBox.append(d); }
  marqueeEl = document.createElement('div'); marqueeEl.className = 'marquee'; overlay.append(marqueeEl);
  toolbarEl = $('#seltools');
  on((w) => { if (w !== 'sel-panel') requestRender(); });
  new ResizeObserver(() => { if (view.fit) fitZoom(); else applyZoom(); }).observe(scrollEl);
  bindPointer(); bindWheel();
  fitZoom();
  const loop = () => { if (needRender || App.playing) { needRender = false; render(); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
export function requestRender() { needRender = true; }

// ---------- Zoom ----------
export function fitZoom() {
  const d = App.doc, r = scrollEl.getBoundingClientRect();
  const pad = window.innerWidth < 760 ? 24 : 64;
  view.zoom = clamp(Math.min((r.width - pad) / d.w, (r.height - pad) / d.h), 0.05, 4);
  view.fit = true; applyZoom();
}
export function setZoom(z, cx, cy) {
  const r = scrollEl.getBoundingClientRect();
  cx = cx ?? r.left + r.width / 2; cy = cy ?? r.top + r.height / 2;
  const before = toDoc(cx, cy);
  view.zoom = clamp(z, 0.05, 6); view.fit = false;
  applyZoom();
  const after = toDoc(cx, cy);
  scrollEl.scrollLeft += (before.x - after.x) * view.zoom; scrollEl.scrollTop += (before.y - after.y) * view.zoom;
}
function applyZoom() {
  const d = App.doc, z = view.zoom;
  const W = Math.round(d.w * z), H = Math.round(d.h * z);
  const r = scrollEl.getBoundingClientRect();
  const mp = window.innerWidth < 760 ? 12 : 40;
  const padX = Math.max(mp, (r.width - W) / 2), padY = Math.max(mp, (r.height - H) / 2);
  const pad = $('#stage-pad');
  pad.style.width = W + padX * 2 + 'px'; pad.style.height = H + padY * 2 + 'px';
  stageEl.style.left = padX + 'px'; stageEl.style.top = padY + 'px';
  stageEl.style.width = W + 'px'; stageEl.style.height = H + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  $('#zoom-label').textContent = Math.round(z * 100) + '%';
  requestRender();
}
export function toDoc(clientX, clientY) {
  const r = stageEl.getBoundingClientRect();
  return { x: (clientX - r.left) / view.zoom, y: (clientY - r.top) / view.zoom };
}

// ---------- Render ----------
function render() {
  const d = App.doc, z = view.zoom, dpr = canvas.width / Math.max(1, d.w * z);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(z * dpr, 0, 0, z * dpr, 0, 0);
  const env = makeEnv(d, { time: App.time });
  renderScene(ctx, d, env, { checker: true });
  if (d.grid.show) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1 / z;
    ctx.beginPath();
    for (let x = d.grid.size; x < d.w; x += d.grid.size) { ctx.moveTo(x, 0); ctx.lineTo(x, d.h); }
    for (let y = d.grid.size; y < d.h; y += d.grid.size) { ctx.moveTo(0, y); ctx.lineTo(d.w, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(198,255,61,0.35)'; ctx.beginPath(); ctx.moveTo(d.w / 2, 0); ctx.lineTo(d.w / 2, d.h); ctx.moveTo(0, d.h / 2); ctx.lineTo(d.w, d.h / 2); ctx.stroke();
    ctx.restore();
  }
  // hover + multi outlines
  ctx.save(); ctx.lineWidth = 1.5 / z;
  const outline = (el, color, dash) => { ctx.save(); ctx.strokeStyle = color; ctx.setLineDash(dash); ctx.translate(el.x + el.w / 2, el.y + el.h / 2); ctx.rotate(rad(el.rot)); ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h); ctx.restore(); };
  if (view.hover && !App.sel.includes(view.hover) && !App.playing) { const h = byId(view.hover); if (h) outline(h, '#5ee7ff', []); }
  if (App.sel.length > 1) for (const el of selected()) outline(el, '#c6ff3d', [6 / z, 4 / z]);
  // text parts of the selected widget
  selHits = [];
  const one = App.sel.length === 1 && !App.playing ? byId(App.sel[0]) : null;
  if (one) {
    selHits = textHits(one, env);
    const quad = (h, color, dash, w) => { const c = hitCorners(h); ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w / z; ctx.setLineDash(dash); ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke(); ctx.restore(); };
    const ts = App.tsel && App.tsel.id === one.id ? App.tsel : null;
    if (ts) {
      const same = selHits.filter((h) => h.p === ts.p && (ts.single || h.key === ts.key || App.tselScope === 'all'));
      for (const h of same) if (!(h.n === ts.n)) quad(h, 'rgba(255,77,141,.55)', [4 / z, 3 / z], 1.2);
      const cur = findHit(ts);
      if (cur) quad(cur, '#ff4d8d', [], 2.2);
    }
    if (view.hoverText != null && selHits[view.hoverText] && !(ts && findHit(ts) === selHits[view.hoverText])) quad(selHits[view.hoverText], '#5ee7ff', [3 / z, 3 / z], 1.2);
  }
  ctx.restore();
  positionInline();
  updateSelBox();
}

// ---------- Geometry ----------
function corners(el) {
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2, a = rad(el.rot || 0), c = Math.cos(a), s = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => { const lx = (sx * el.w) / 2, ly = (sy * el.h) / 2; return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c }; });
}
export function selBounds(list = selected()) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of list) for (const p of corners(el)) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function hitTest(p) {
  const els = App.doc.elements;
  for (let i = els.length - 1; i >= 0; i--) {
    const el = els[i];
    if (el.hidden) continue;
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2, a = -rad(el.rot || 0);
    const dx = p.x - cx, dy = p.y - cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    const tol = 6 / view.zoom;
    if (Math.abs(lx) <= el.w / 2 + tol && Math.abs(ly) <= el.h / 2 + tol) return el;
  }
  return null;
}
function findHit(t, hits = selHits) { return hits.find((h) => h.p === t.p && h.n === t.n) || hits.find((h) => h.p === t.p && h.key === t.key) || null; }
function textAt(el, p, hits) {
  hits = hits || textHits(el, makeEnv(App.doc, { time: App.time }));
  const tol = 4 / view.zoom;
  let best = null, bi = -1;
  hits.forEach((h, i) => { if (hitContains(h, p.x, p.y, tol)) { const a = h.w * h.h * (h.m.a * h.m.a + h.m.b * h.m.b); if (!best || a < best.a) { best = { h, a }; bi = i; } } });
  return best ? { h: best.h, i: bi } : null;
}
function tselFrom(el, h) { return { id: el.id, p: h.p, key: h.key, n: h.n, orig: h.orig, shown: h.shown, single: h.single }; }
// Tap on an already-selected widget: pick the text part under the pointer (tap again = type on canvas).
function tapText(el, p) {
  const r = textAt(el, p);
  if (!r) { if (App.tsel) setTextSel(null); return false; }
  const t = tselFrom(el, r.h);
  if (App.tsel && App.tsel.id === el.id && App.tsel.p === t.p && App.tsel.n === t.n) { openInlineEditor(); return true; }
  setTextSel(t);
  return true;
}
export function openInlineEditor() {
  const el = App.tsel && byId(App.tsel.id); if (!el || el.locked) return;
  if (inlineEd) inlineEd.ed.blur();
  const multi = el.type === 'text' || /\n/.test(currentText());
  const ed = document.createElement(multi ? 'textarea' : 'input');
  ed.className = 'inline-edit'; ed.value = currentText(); ed.spellcheck = false; ed.setAttribute('enterkeyhint', 'done');
  if (multi) ed.rows = 1;
  const ts = tselStyle() || {};
  const start = ed.value;
  inlineEd = { ed, start, id: el.id };
  const finish = (ok) => {
    if (!inlineEd || inlineEd.ed !== ed) return;
    inlineEd = null; ed.remove();
    if (!ok) setTextOverride(start, true); else if (ed.value !== start) setTextOverride(ed.value, true);
    emit('rebuild'); requestRender();
  };
  ed.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
  });
  ed.addEventListener('input', () => { setTextOverride(ed.value, false); fitInline(); });
  ed.addEventListener('blur', () => finish(true));
  ed.addEventListener('pointerdown', (e) => e.stopPropagation());
  inlineEd.font = ts;
  overlay.append(ed);
  positionInline();
  ed.focus(); ed.select();
}
export function closeInlineEditor() { if (inlineEd) { const { ed } = inlineEd; inlineEd = null; ed.remove(); } }
function fitInline() { if (!inlineEd) return; const ed = inlineEd.ed; ed.style.width = '0px'; ed.style.width = Math.max(inlineEd.minW || 60, ed.scrollWidth + 12) + 'px'; if (ed.tagName === 'TEXTAREA') { ed.style.height = '0px'; ed.style.height = ed.scrollHeight + 4 + 'px'; } }
function positionInline() {
  if (!inlineEd) return;
  const el = byId(inlineEd.id); if (!el || !App.tsel) { closeInlineEditor(); return; }
  const z = view.zoom, h = findHit(App.tsel);
  let x, y, w, ht, k = 1;
  if (h) { const c = hitCorners(h); x = Math.min(...c.map((p) => p.x)); y = Math.min(...c.map((p) => p.y)); w = Math.max(...c.map((p) => p.x)) - x; ht = Math.max(...c.map((p) => p.y)) - y; k = Math.hypot(h.m.a, h.m.b); }
  else { x = el.x; y = el.y; w = el.w; ht = el.h; }
  const ts = inlineEd.font || {};
  const ed = inlineEd.ed;
  const fs = Math.max(13, Math.min(64, (ts.size || 40) * k * z));
  Object.assign(ed.style, { left: x * z - 6 + 'px', top: y * z - 6 + 'px', minHeight: Math.max(fs * 1.35, ht * z) + 12 + 'px', font: fontStr({ ...ts, size: fs }), letterSpacing: (ts.spacing || 0) * k * z + 'px' });
  inlineEd.minW = w * z + 12;
  fitInline();
}
function groupMates(el) { return el.group ? App.doc.elements.filter((e) => e.group === el.group).map((e) => e.id) : [el.id]; }

// ---------- Selection box ----------
function updateSelBox() {
  const sel = selected();
  if (!sel.length || App.playing) { selBox.style.display = 'none'; toolbarEl.classList.add('hidden'); return; }
  const z = view.zoom;
  let x, y, w, h, rot = 0;
  const single = sel.length === 1;
  if (single) { const e = sel[0]; x = e.x; y = e.y; w = e.w; h = e.h; rot = e.rot || 0; }
  else { const b = selBounds(sel); x = b.x; y = b.y; w = b.w; h = b.h; }
  selBox.style.display = 'block';
  selBox.style.left = x * z + 'px'; selBox.style.top = y * z + 'px';
  selBox.style.width = w * z + 'px'; selBox.style.height = h * z + 'px';
  selBox.style.transform = `rotate(${rot}deg)`;
  const uniform = !single || REG[sel[0].type]?.auto;
  selBox.classList.toggle('uniform', !!uniform);
  selBox.classList.toggle('locked', sel.every((e) => e.locked));
  selBox.classList.toggle('small', w * z < 46 || h * z < 46);
  // floating toolbar
  const b = selBounds(sel);
  const sr = stageEl.getBoundingClientRect(), wr = scrollEl.getBoundingClientRect();
  let tx = sr.left + (b.x + b.w / 2) * z - wr.left, ty = sr.top + b.y * z - wr.top - 104;
  if (ty < 6) ty = sr.top + (b.y + b.h) * z - wr.top + 22;
  if (ty > wr.height - 50) ty = Math.max(6, sr.top + b.y * z - wr.top + 10);
  toolbarEl.classList.remove('hidden');
  const tw = toolbarEl.offsetWidth || 260;
  toolbarEl.style.left = clamp(tx - tw / 2, 6, wr.width - tw - 6) + 'px';
  toolbarEl.style.top = clamp(ty, 6, wr.height - 50) + 'px';
  toolbarEl.querySelector('[data-act=group]').classList.toggle('hidden', !(sel.length > 1 && !(sel.every((e) => e.group && e.group === sel[0].group))));
  toolbarEl.querySelector('[data-act=ungroup]').classList.toggle('hidden', !sel.some((e) => e.group));
  toolbarEl.querySelector('[data-act=lock]').classList.toggle('on', sel.every((e) => e.locked));
  toolbarEl.querySelector('[data-act=edittext]').classList.toggle('hidden', !(App.tsel && single && App.tsel.id === sel[0].id));
}

// ---------- Snapping ----------
function snapMove(b, dx, dy, ignore) {
  const d = App.doc;
  let nx = b.x + dx, ny = b.y + dy;
  const guides = [];
  if (d.grid.snap) { const g = d.grid.size; nx = Math.round(nx / g) * g; ny = Math.round(ny / g) * g; return { dx: nx - b.x, dy: ny - b.y, guides }; }
  if (!d.grid.guides) return { dx, dy, guides };
  const th = 7 / view.zoom;
  const xs = [0, d.w / 2, d.w], ys = [0, d.h / 2, d.h];
  for (const e of d.elements) if (!ignore.has(e.id) && !e.hidden) { xs.push(e.x, e.x + e.w / 2, e.x + e.w); ys.push(e.y, e.y + e.h / 2, e.y + e.h); }
  const best = (vals, cands) => { let r = null; for (const v of vals) for (const c of cands) { const dd = c - v.v; if (Math.abs(dd) < th && (!r || Math.abs(dd) < Math.abs(r.d))) r = { d: dd, at: c }; } return r; };
  const bx = best([{ v: nx }, { v: nx + b.w / 2 }, { v: nx + b.w }], xs);
  const by = best([{ v: ny }, { v: ny + b.h / 2 }, { v: ny + b.h }], ys);
  if (bx) { nx += bx.d; guides.push({ x: bx.at }); }
  if (by) { ny += by.d; guides.push({ y: by.at }); }
  return { dx: nx - b.x, dy: ny - b.y, guides };
}
function showGuides(gs) {
  guideEls.forEach((g) => g.remove()); guideEls = [];
  const z = view.zoom, d = App.doc;
  for (const g of gs) {
    const e = document.createElement('div'); e.className = 'guide';
    if (g.x != null) Object.assign(e.style, { left: g.x * z + 'px', top: 0, width: '1px', height: d.h * z + 'px' });
    else Object.assign(e.style, { top: g.y * z + 'px', left: 0, height: '1px', width: d.w * z + 'px' });
    overlay.append(e); guideEls.push(e);
  }
}

// ---------- Pointer ----------
let op = null;
const pointers = new Map();
let pinch = null;
function bindPointer() {
  scrollEl.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  scrollEl.addEventListener('dblclick', (e) => {
    const p = toDoc(e.clientX, e.clientY), hit = hitTest(p);
    if (!hit) return;
    if (!(App.sel.length === 1 && App.sel[0] === hit.id)) setSel([hit.id]);
    if (inlineEd) return;
    const r = textAt(hit, p);
    if (r) { const t = tselFrom(hit, r.h); if (!(App.tsel && App.tsel.p === t.p && App.tsel.n === t.n)) setTextSel(t); openInlineEditor(); }
    else emit('focus-text');
  });
  scrollEl.addEventListener('contextmenu', (e) => { if (hitTest(toDoc(e.clientX, e.clientY))) e.preventDefault(); });
}
function onDown(e) {
  if (e.target.closest('#seltools')) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    op = null; marqueeEl.style.display = 'none';
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, sl: scrollEl.scrollLeft, st: scrollEl.scrollTop };
    return;
  }
  if (e.button === 1 || (e.button === 0 && spaceDown)) { op = { kind: 'pan', sx: e.clientX, sy: e.clientY, sl: scrollEl.scrollLeft, st: scrollEl.scrollTop }; e.preventDefault(); return; }
  if (e.button !== 0 && e.pointerType === 'mouse') { const hit = hitTest(toDoc(e.clientX, e.clientY)); if (hit && !App.sel.includes(hit.id)) setSel(groupMates(hit)); return; }
  if (App.playing) return;
  const p = toDoc(e.clientX, e.clientY);
  const h = e.target.dataset && e.target.dataset.h;
  const sel = selected();
  if (h && sel.length) { e.preventDefault(); startTransform(h, p, sel); return; }
  const hit = hitTest(p);
  const additive = e.shiftKey || e.ctrlKey || e.metaKey;
  if (hit) {
    e.preventDefault();
    let ids = App.sel.slice();
    const mates = e.altKey ? [hit.id] : groupMates(hit);
    if (additive) { if (ids.includes(hit.id)) ids = ids.filter((id) => !mates.includes(id)); else ids.push(...mates); setSel(ids); }
    else if (!ids.includes(hit.id)) setSel(mates);
    const wasSel = !additive && ids.includes(hit.id);
    const textTap = wasSel && ids.length === 1;
    const drill = wasSel && ids.length > 1 && !e.altKey && ids.every((id) => mates.includes(id)) ? hit.id : null;
    const moving = selected().filter((x) => !x.locked);
    if (!moving.length) { if (textTap) op = { kind: 'move', p0: p, start: [], b0: selBounds(selected()), moved: false, textTap, hitId: hit.id }; return; }
    op = { kind: 'move', p0: p, start: moving.map((x) => ({ id: x.id, x: x.x, y: x.y })), b0: selBounds(moving), moved: false, pid: e.pointerId, textTap, drill, hitId: hit.id };
  } else {
    if (!additive) setSel([]);
    if (e.pointerType === 'touch') { op = { kind: 'pan', sx: e.clientX, sy: e.clientY, sl: scrollEl.scrollLeft, st: scrollEl.scrollTop, tap: true }; return; }
    op = { kind: 'marquee', p0: p, base: additive ? App.sel.slice() : [] };
  }
}
function startTransform(h, p, sel) {
  const unlocked = sel.filter((x) => !x.locked); if (!unlocked.length) return;
  const start = unlocked.map((x) => ({ id: x.id, x: x.x, y: x.y, w: x.w, h: x.h, s: x.s || 1, rot: x.rot || 0 }));
  if (h === 'rot') {
    const b = unlocked.length === 1 ? { x: unlocked[0].x, y: unlocked[0].y, w: unlocked[0].w, h: unlocked[0].h } : selBounds(unlocked);
    const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    op = { kind: 'rotate', c, a0: Math.atan2(p.y - c.y, p.x - c.x), start };
    return;
  }
  op = { kind: unlocked.length === 1 ? 'resize1' : 'resizeN', h, p0: p, start, b0: selBounds(unlocked) };
}
function onMove(e) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    setZoom(pinch.z * (d / pinch.d), mx, my);
    scrollEl.scrollLeft -= mx - pinch.mx; scrollEl.scrollTop -= my - pinch.my; pinch.mx = mx; pinch.my = my;
    return;
  }
  if (!op) {
    if (e.pointerType === 'mouse' && e.target.closest && e.target.closest('#stage-scroll')) {
      const dp = toDoc(e.clientX, e.clientY);
      const hit = hitTest(dp); const id = hit ? hit.id : null;
      if (id !== view.hover) { view.hover = id; requestRender(); }
      let ht = null;
      if (hit && App.sel.length === 1 && App.sel[0] === hit.id && selHits.length) { const r = textAt(hit, dp, selHits); ht = r ? r.i : null; }
      if (ht !== view.hoverText) { view.hoverText = ht; scrollEl.classList.toggle('text-hover', ht != null); requestRender(); }
    }
    return;
  }
  const p = toDoc(e.clientX, e.clientY);
  switch (op.kind) {
    case 'pan': scrollEl.scrollLeft = op.sl - (e.clientX - op.sx); scrollEl.scrollTop = op.st - (e.clientY - op.sy); if (Math.abs(e.clientX - op.sx) + Math.abs(e.clientY - op.sy) > 6) op.tap = false; break;
    case 'move': {
      let dx = p.x - op.p0.x, dy = p.y - op.p0.y;
      if (!op.moved && Math.hypot(dx, dy) * view.zoom < 3) return;
      op.moved = true;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const sn = snapMove(op.b0, dx, dy, new Set(op.start.map((s) => s.id)));
      showGuides(sn.guides);
      for (const s of op.start) { const el = byId(s.id); el.x = s.x + sn.dx; el.y = s.y + sn.dy; }
      requestRender(); emit('live');
      break;
    }
    case 'marquee': {
      const x0 = Math.min(op.p0.x, p.x), y0 = Math.min(op.p0.y, p.y), x1 = Math.max(op.p0.x, p.x), y1 = Math.max(op.p0.y, p.y);
      const z = view.zoom;
      Object.assign(marqueeEl.style, { display: 'block', left: x0 * z + 'px', top: y0 * z + 'px', width: (x1 - x0) * z + 'px', height: (y1 - y0) * z + 'px' });
      const ids = App.doc.elements.filter((el) => !el.hidden && !el.locked && el.x < x1 && el.x + el.w > x0 && el.y < y1 && el.y + el.h > y0).flatMap((el) => groupMates(el));
      setSel([...op.base, ...ids]);
      break;
    }
    case 'rotate': {
      let da = (Math.atan2(p.y - op.c.y, p.x - op.c.x) - op.a0) * 180 / Math.PI;
      for (const s of op.start) {
        let r = s.rot + da;
        if (op.start.length === 1) {
          if (e.shiftKey) r = Math.round(r / 15) * 15;
          else { const m = ((r % 90) + 90) % 90; if (m < 3) r -= m; else if (m > 87) r += 90 - m; }
        }
        r = ((r + 180) % 360 + 360) % 360 - 180;
        const el = byId(s.id);
        if (op.start.length > 1) {
          const a = rad(da), cx = s.x + s.w / 2 - op.c.x, cy = s.y + s.h / 2 - op.c.y;
          const nx = op.c.x + cx * Math.cos(a) - cy * Math.sin(a), ny = op.c.y + cx * Math.sin(a) + cy * Math.cos(a);
          el.x = nx - s.w / 2; el.y = ny - s.h / 2;
        }
        el.rot = Math.round(r * 10) / 10;
      }
      requestRender(); emit('live'); break;
    }
    case 'resize1': resizeOne(op, p, e.shiftKey); requestRender(); emit('live'); break;
    case 'resizeN': resizeMany(op, p); requestRender(); emit('live'); break;
  }
}
const HV = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
function resizeOne(op, p, shift) {
  const s = op.start[0], el = byId(s.id), def = REG[el.type];
  const [hx, hy] = HV[op.h];
  const a = rad(s.rot), c = Math.cos(a), sn = Math.sin(a);
  const cx0 = s.x + s.w / 2, cy0 = s.y + s.h / 2;
  const dx = p.x - cx0, dy = p.y - cy0;
  const lx = dx * c + dy * sn, ly = -dx * sn + dy * c; // pointer in local coords
  const ax = (-hx * s.w) / 2, ay = (-hy * s.h) / 2; // anchor (opposite)
  let w = s.w, h = s.h;
  const uniform = def.auto || ((def.keepAspect || shift) && hx && hy);
  const minS = 8;
  if (uniform) {
    const vx = hx ? (hx * s.w) : 0, vy = hy ? (hy * s.h) : 0;
    const len = Math.hypot(vx, vy) || 1;
    const proj = ((lx - ax) * (vx / len) + (ly - ay) * (vy / len));
    const f = Math.max(minS / Math.max(s.w, s.h), proj / len);
    w = s.w * f; h = s.h * f;
    if (def.auto) el.s = Math.max(0.02, s.s * f);
  } else {
    if (hx) w = Math.max(minS, hx * (lx - ax));
    if (hy) h = Math.max(minS, hy * (ly - ay));
  }
  if (App.doc.grid.snap && !def.auto && !el.rot) { const g = App.doc.grid.size; if (hx) w = Math.max(g, Math.round(w / g) * g); if (hy) h = Math.max(g, Math.round(h / g) * g); }
  // new center in local coords keeps anchor fixed
  const ncx = ax + (hx ? (hx * w) / 2 : (hy ? 0 : 0)), ncy = ay + (hy ? (hy * h) / 2 : 0);
  const lcx = hx ? ncx : 0, lcy = hy ? ncy : 0;
  const wx = cx0 + lcx * c - lcy * sn, wy = cy0 + lcx * sn + lcy * c;
  el.w = w; el.h = h; el.x = wx - w / 2; el.y = wy - h / 2;
}
function resizeMany(op, p) {
  const b = op.b0, [hx, hy] = HV[op.h];
  if (!hx || !hy) return;
  const ax = hx > 0 ? b.x : b.x + b.w, ay = hy > 0 ? b.y : b.y + b.h;
  const vx = hx * b.w, vy = hy * b.h, len = Math.hypot(vx, vy) || 1;
  const f = Math.max(0.05, ((p.x - ax) * vx + (p.y - ay) * vy) / (len * len));
  for (const s of op.start) {
    const el = byId(s.id);
    const cx = ax + (s.x + s.w / 2 - ax) * f, cy = ay + (s.y + s.h / 2 - ay) * f;
    el.w = s.w * f; el.h = s.h * f; el.s = s.s * f;
    el.x = cx - el.w / 2; el.y = cy - el.h / 2;
  }
}
function onUp(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; return; }
  if (!op) return;
  const k = op.kind;
  if (k === 'pan' && op.tap) setSel([]);
  if (k === 'move' && op.moved) commit('Move');
  if (k === 'move' && !op.moved) {
    const p = toDoc(e.clientX, e.clientY);
    if (op.drill) setSel([op.drill]);
    else if (op.textTap) { const el = byId(op.hitId); if (el) tapText(el, p); }
  }
  if (k === 'rotate') commit('Rotate');
  if (k === 'resize1' || k === 'resizeN') { commit('Resize'); }
  if (k === 'marquee') marqueeEl.style.display = 'none';
  showGuides([]);
  op = null;
  requestRender();
}

let spaceDown = false;
window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { spaceDown = true; scrollEl && scrollEl.classList.add('panning'); } });
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { spaceDown = false; scrollEl && scrollEl.classList.remove('panning'); } });

function bindWheel() {
  scrollEl.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(view.zoom * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY); }
  }, { passive: false });
}

// Nudge with arrow keys
export function nudge(dx, dy) {
  const sel = selected().filter((e) => !e.locked); if (!sel.length) return;
  for (const el of sel) { el.x += dx; el.y += dy; }
  commit('Nudge', 400);
}
