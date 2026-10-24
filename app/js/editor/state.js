// Central application state, documents, history, environment.
import { clone, uid, getPath } from '../util.js';
import { REG, layoutElement, makeElement } from '../widgets/core.js';
import { stateAt, buildActivity, sampleRaw } from '../data/activity.js';
import { multiStats, multiStateAt } from '../data/multi.js';

export const THEMES = [
  { name: 'Lime', text: '#ffffff', muted: '#ffffffb3', accent: '#c6ff3d', accent2: '#00e0ff' },
  { name: 'Ember', text: '#ffffff', muted: '#ffffffb3', accent: '#ff6a3d', accent2: '#ffc53d' },
  { name: 'Ice', text: '#ffffff', muted: '#d6e4ffb3', accent: '#5ee7ff', accent2: '#7c5cff' },
  { name: 'Rose', text: '#ffffff', muted: '#ffe4ecb3', accent: '#ff4d8d', accent2: '#ffb36b' },
  { name: 'Mono', text: '#ffffff', muted: '#ffffff99', accent: '#ffffff', accent2: '#9ca3af' },
  { name: 'Ink', text: '#0d0f14', muted: '#0d0f1499', accent: '#ff3d2e', accent2: '#2563eb' },
  { name: 'Forest', text: '#f3f7ee', muted: '#f3f7eeb3', accent: '#7ee081', accent2: '#e9c46a' },
  { name: 'Violet', text: '#ffffff', muted: '#e9e3ffb3', accent: '#a78bfa', accent2: '#f472b6' },
  { name: 'Gold', text: '#fffaf0', muted: '#fffaf0b3', accent: '#f5c542', accent2: '#ff7849' },
];

export const SIZES = [
  ['story', 'Story 9:16', 1080, 1920], ['portrait', 'Portrait 4:5', 1080, 1350], ['square', 'Square 1:1', 1080, 1080],
  ['landscape', 'Landscape 16:9', 1920, 1080], ['reel4k', 'Story 4K', 2160, 3840], ['wide', 'Wide 2:1', 2000, 1000],
];

export function newDoc(mode) {
  return {
    v: 1, mode, w: 1080, h: 1920,
    bg: { type: 'transparent', color: '#0d0f14', color2: '#1f2a44', angle: 160, kind: 'linear', image: null, fit: 'cover', dim: 0.25, dimMode: 'bottom', blur: 0, zoom: 1, ox: 0, oy: 0, brightness: 1, saturate: 1 },
    theme: { ...THEMES[0] }, elements: [], trash: [],
    grid: { show: false, snap: false, size: 40, guides: true },
    video: { intro: 1.2, duration: 8, hold: 2.5, fps: 30, by: 'time' },
    title: mode === 'multi' ? 'Weekly Recap' : '',
  };
}

const listeners = new Set();
export const App = {
  mode: 'single',
  docs: { single: newDoc('single'), multi: newDoc('multi') },
  hist: { single: { stack: [], idx: -1 }, multi: { stack: [], idx: -1 } },
  act: null, acts: [], sample: null, sampleActs: null,
  settings: { units: 'metric', maxHr: 0, zonePct: [50, 60, 70, 80, 90], h24: true, weekStart: 1, rangeFromRuns: false },
  sel: [], tsel: null, tselScope: 'one', assets: {}, assetSrc: {},
  time: null, playing: false,
  measureCtx: document.createElement('canvas').getContext('2d'),
  get doc() { return this.docs[this.mode]; },
};

export function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(what = 'all') { for (const f of listeners) f(what); }

// ---------- Data ----------
export function getSampleAct() { if (!App.sample) App.sample = buildActivity(sampleRaw(1)); return App.sample; }
export function getSampleActs() {
  if (!App.sampleActs) {
    const base = new Date(2026, 9, 12, 6, 30).getTime() / 1000;
    const plan = [[0, 6.1, 345, 'Easy Run'], [1, 8.4, 318, 'Tempo Tuesday'], [3, 5.2, 300, 'Intervals'], [4, 7.0, 350, 'Recovery Jog'], [6, 16.3, 335, 'Sunday Long Run']];
    App.sampleActs = plan.map(([d, km, pace, name], i) => buildActivity(sampleRaw(i + 2, { km, pace, start: base + d * 86400, name })));
  }
  return App.sampleActs;
}
export function currentAct() { return App.act || getSampleAct(); }
export function currentActs() { return App.acts.length ? App.acts : getSampleActs(); }
export function usingSample() { return App.mode === 'single' ? !App.act : !App.acts.length; }

let multiCache = null, multiKey = '';
export function currentMulti() {
  const acts = currentActs();
  const key = acts.map((a) => a.id + (a.enabled === false ? '0' : '1') + a.name).join('|') + App.settings.weekStart + App.settings.rangeFromRuns;
  if (key !== multiKey) { multiCache = multiStats(acts, { weekStart: App.settings.weekStart, rangeFromRuns: App.settings.rangeFromRuns }); multiKey = key; }
  return multiCache;
}
export function invalidateMulti() { multiKey = ''; }

// ---------- Environment ----------
export function videoLength(doc) { const v = doc.video; return v.intro + v.duration + v.hold; }
export function makeEnv(doc, opts = {}) {
  const mode = doc.mode;
  const time = opts.time ?? null;
  const isStatic = time == null;
  const v = doc.video;
  const t = isStatic ? 1 : Math.max(0, Math.min(1, (time - v.intro) / v.duration));
  const env = {
    mode, units: App.settings.units, settings: App.settings, theme: doc.theme, assets: App.assets, docW: doc.w,
    static: isStatic, time: isStatic ? Infinity : time, t, title: doc.title,
  };
  if (mode === 'single') {
    const act = currentAct();
    env.act = act;
    env.fin = stateAt(act, 1, v.by);
    env.cur = isStatic ? env.fin : stateAt(act, t, v.by);
  } else {
    const S = currentMulti();
    env.multi = S; env.mfin = multiStateAt(S, 1); env.mcur = isStatic ? env.mfin : multiStateAt(S, t);
    env.act = S.longest || S.list[0];
  }
  return env;
}

export function layoutAll(doc = App.doc) {
  const env = makeEnv(doc);
  for (const el of doc.elements) layoutElement(App.measureCtx, el, env);
}

// ---------- Elements ----------
export function byId(id, doc = App.doc) { return doc.elements.find((e) => e.id === id); }
export function selected() { return App.sel.map((id) => byId(id)).filter(Boolean); }
export function setSel(ids, silent) {
  App.sel = [...new Set(ids)].filter((id) => byId(id));
  if (App.tsel && !(App.sel.length === 1 && App.sel[0] === App.tsel.id)) App.tsel = null;
  if (!silent) emit('sel');
}
// ---------- Individual text inside a widget ----------
// App.tsel = { id, p (text style path), key ('*' or '=<original>'), n, orig, shown, single }
export function setTextSel(t) { App.tsel = t; emit('sel'); }
export function tselElement() { return App.tsel ? byId(App.tsel.id) : null; }
export function tselStyle() { const e = tselElement(); return e ? getPath(e, App.tsel.p) : null; }
export function currentText(e = tselElement(), t = App.tsel) {
  if (!e || !t) return '';
  if (e.type === 'text') return e.props.text;
  const ts = getPath(e, t.p);
  return ts && ts.txt && t.key in ts.txt ? ts.txt[t.key] : t.orig;
}
export function setTextOverride(value, final = true, e = tselElement(), t = App.tsel) {
  if (!e || !t) return;
  if (e.type === 'text') e.props.text = value;
  else {
    const ts = getPath(e, t.p); if (!ts) return;
    ts.txt = ts.txt || {};
    if (value === t.orig) delete ts.txt[t.key]; else ts.txt[t.key] = value;
    if (!Object.keys(ts.txt).length) delete ts.txt;
  }
  commit('Edit text', final ? 0 : 450);
}
export function isTextOverridden(e = tselElement(), t = App.tsel) {
  if (!e || !t || e.type === 'text') return false;
  const ts = getPath(e, t.p); return !!(ts && ts.txt && t.key in ts.txt);
}
export function addElement(type, over = {}, opts = {}) {
  const doc = App.doc;
  const env = makeEnv(doc);
  const el = makeElement(type, env, clone(over));
  // fit into canvas
  layoutElement(App.measureCtx, el, env);
  const maxW = doc.w * 0.8;
  if (el.w > maxW) { if (REG[type].auto) el.s = maxW / el.w; else { const k = maxW / el.w; el.w *= k; el.h *= k; } layoutElement(App.measureCtx, el, env); }
  if (opts.x == null) { el.x = (doc.w - el.w) / 2; el.y = (doc.h - el.h) / 2; } else { el.x = opts.x; el.y = opts.y; }
  // offset if same position taken
  while (doc.elements.some((e) => Math.abs(e.x - el.x) < 2 && Math.abs(e.y - el.y) < 2)) { el.x += 30; el.y += 30; }
  doc.elements.push(el);
  setSel([el.id], true);
  commit('Add ' + el.name);
  emit('sel');
  return el;
}
export function deleteSelected() {
  const doc = App.doc, ids = new Set(App.sel);
  if (!ids.size) return;
  const removed = doc.elements.filter((e) => ids.has(e.id) && !e.locked);
  if (!removed.length) return;
  doc.elements = doc.elements.filter((e) => !removed.includes(e));
  for (const e of removed) doc.trash.unshift({ el: e, at: Date.now() });
  doc.trash = doc.trash.slice(0, 80);
  App.sel = []; App.tsel = null;
  commit('Delete');
}
export function restoreTrash(i) {
  const doc = App.doc, item = doc.trash[i]; if (!item) return;
  doc.trash.splice(i, 1);
  doc.elements.push(item.el);
  setSel([item.el.id], true);
  commit('Restore');
  emit('sel');
}
export function duplicateSelected() {
  const doc = App.doc, sel = selected(); if (!sel.length) return;
  const gmap = {}, ids = [];
  for (const e of sel) {
    const c = clone(e); c.id = uid(); c.x += 40; c.y += 40;
    if (c.group) { gmap[c.group] = gmap[c.group] || uid(); c.group = gmap[c.group]; }
    doc.elements.splice(doc.elements.indexOf(e) + 1 + ids.length, 0, c); ids.push(c.id);
  }
  setSel(ids, true); commit('Duplicate'); emit('sel');
}

// ---------- History ----------
function snap(doc) { const { trash, ...rest } = doc; return JSON.stringify({ ...rest, trash: trash.map((t) => ({ el: t.el, at: t.at })) }); }
export function resetHistory(mode = App.mode) { App.hist[mode] = { stack: [snap(App.docs[mode])], idx: 0, labels: ['Start'] }; }
let commitTimer = null;
export function commit(label = 'Edit', debounce = 0) {
  clearTimeout(commitTimer);
  const doIt = () => {
    layoutAll();
    const h = App.hist[App.mode];
    const s = snap(App.doc);
    if (h.stack[h.idx] === s) { emit('doc'); return; }
    h.stack = h.stack.slice(0, h.idx + 1); h.labels = (h.labels || []).slice(0, h.idx + 1);
    h.stack.push(s); h.labels.push(label);
    if (h.stack.length > 150) { h.stack.shift(); h.labels.shift(); }
    h.idx = h.stack.length - 1;
    emit('doc');
  };
  if (debounce) { layoutAll(); emit('doc-live'); commitTimer = setTimeout(doIt, debounce); } else doIt();
}
function restore(s) {
  const d = JSON.parse(s);
  App.docs[App.mode] = d;
  App.sel = App.sel.filter((id) => d.elements.some((e) => e.id === id));
  if (App.tsel && !App.sel.includes(App.tsel.id)) App.tsel = null;
  layoutAll(); emit('doc'); emit('sel');
}
export function undo() { const h = App.hist[App.mode]; if (h.idx > 0) { h.idx--; restore(h.stack[h.idx]); } }
export function redo() { const h = App.hist[App.mode]; if (h.idx < h.stack.length - 1) { h.idx++; restore(h.stack[h.idx]); } }
export function canUndo() { return App.hist[App.mode].idx > 0; }
export function canRedo() { const h = App.hist[App.mode]; return h.idx < h.stack.length - 1; }

// ---------- Assets ----------
export function addAsset(dataURL, id = uid()) {
  App.assetSrc[id] = dataURL;
  const img = new Image();
  img.onload = () => emit('asset');
  img.src = dataURL;
  App.assets[id] = img;
  return id;
}
export function usedAssets(doc) {
  const s = new Set();
  if (doc.bg.image) s.add(doc.bg.image);
  const walk = (els) => els.forEach((e) => e.props && e.props.asset && s.add(e.props.asset));
  walk(doc.elements); walk(doc.trash.map((t) => t.el));
  return [...s];
}
