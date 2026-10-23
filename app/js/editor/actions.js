// Editing actions: arrange, align, group, clipboard.
import { App, selected, setSel, commit, byId, emit } from './state.js';
import { uid, clone } from '../util.js';

export function arrange(dir) {
  const d = App.doc, ids = new Set(App.sel);
  if (!ids.size) return;
  const els = d.elements;
  if (dir === 'front') d.elements = [...els.filter((e) => !ids.has(e.id)), ...els.filter((e) => ids.has(e.id))];
  else if (dir === 'back') d.elements = [...els.filter((e) => ids.has(e.id)), ...els.filter((e) => !ids.has(e.id))];
  else if (dir === 'up') { for (let i = els.length - 2; i >= 0; i--) if (ids.has(els[i].id) && !ids.has(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]]; }
  else if (dir === 'down') { for (let i = 1; i < els.length; i++) if (ids.has(els[i].id) && !ids.has(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]]; }
  commit('Arrange');
}
export function moveLayer(id, toIndex) {
  const d = App.doc, i = d.elements.findIndex((e) => e.id === id);
  if (i < 0) return;
  const [e] = d.elements.splice(i, 1);
  d.elements.splice(Math.max(0, Math.min(d.elements.length, toIndex)), 0, e);
  commit('Reorder');
}
function bboxOf(e) {
  const a = (e.rot || 0) * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = e.w * c + e.h * s, h = e.w * s + e.h * c, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
export function alignSel(kind) {
  const sel = selected().filter((e) => !e.locked); if (!sel.length) return;
  const d = App.doc;
  let ref;
  if (sel.length === 1) ref = { x: 0, y: 0, w: d.w, h: d.h };
  else { const bs = sel.map(bboxOf); const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)); ref = { x: x0, y: y0, w: Math.max(...bs.map((b) => b.x + b.w)) - x0, h: Math.max(...bs.map((b) => b.y + b.h)) - y0 }; }
  if (kind === 'dh' || kind === 'dv') {
    const k = kind === 'dh' ? 'x' : 'y', sz = kind === 'dh' ? 'w' : 'h';
    const items = sel.map((e) => ({ e, b: bboxOf(e) })).sort((a, b) => a.b[k] - b.b[k]);
    const total = items.reduce((s, i) => s + i.b[sz], 0);
    const gap = (ref[sz] - total) / (items.length - 1);
    let pos = ref[k];
    for (const i of items) { i.e[k] += pos - i.b[k]; pos += i.b[sz] + gap; }
    commit('Distribute'); return;
  }
  // when multiple in same group are selected and aligning to canvas, move as a unit
  for (const e of sel) {
    const b = bboxOf(e);
    if (kind === 'left') e.x += ref.x - b.x;
    if (kind === 'right') e.x += ref.x + ref.w - (b.x + b.w);
    if (kind === 'hcenter') e.x += ref.x + ref.w / 2 - (b.x + b.w / 2);
    if (kind === 'top') e.y += ref.y - b.y;
    if (kind === 'bottom') e.y += ref.y + ref.h - (b.y + b.h);
    if (kind === 'vcenter') e.y += ref.y + ref.h / 2 - (b.y + b.h / 2);
  }
  commit('Align');
}
export function alignGroupToCanvas(kind) {
  const sel = selected(); if (!sel.length) return;
  const d = App.doc, bs = sel.map(bboxOf);
  const b = { x: Math.min(...bs.map((q) => q.x)), y: Math.min(...bs.map((q) => q.y)) };
  b.w = Math.max(...bs.map((q) => q.x + q.w)) - b.x; b.h = Math.max(...bs.map((q) => q.y + q.h)) - b.y;
  let dx = 0, dy = 0;
  if (kind === 'hcenter') dx = d.w / 2 - (b.x + b.w / 2);
  if (kind === 'vcenter') dy = d.h / 2 - (b.y + b.h / 2);
  for (const e of sel) { e.x += dx; e.y += dy; }
  commit('Center');
}
export function groupSel() {
  const sel = selected(); if (sel.length < 2) return;
  const g = uid(); sel.forEach((e) => (e.group = g)); commit('Group'); emit('sel');
}
export function ungroupSel() { selected().forEach((e) => (e.group = null)); commit('Ungroup'); emit('sel'); }

let clip = null;
export function copySel() { const s = selected(); if (s.length) clip = clone(s); }
export function cutSel(del) { copySel(); del(); }
export function paste() {
  if (!clip) return;
  const d = App.doc, gmap = {}, ids = [];
  for (const e of clone(clip)) {
    e.id = uid(); e.x += 40; e.y += 40;
    if (e.group) { gmap[e.group] = gmap[e.group] || uid(); e.group = gmap[e.group]; }
    d.elements.push(e); ids.push(e.id);
  }
  clip = clip.map((e) => ({ ...e, x: e.x + 40, y: e.y + 40 }));
  setSel(ids, true); commit('Paste'); emit('sel');
}
export function selectAll() { setSel(App.doc.elements.filter((e) => !e.locked && !e.hidden).map((e) => e.id)); }
export { byId };
