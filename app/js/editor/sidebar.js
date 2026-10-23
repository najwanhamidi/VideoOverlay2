// Left sidebar: Data, Templates, Add, Layers, Trash.
import { App, on, emit, commit, setSel, addElement, restoreTrash, makeEnv, layoutAll, currentAct, currentActs, usingSample, invalidateMulti, addAsset, resetHistory, newDoc, THEMES } from './state.js';
import { REG, renderScene } from '../widgets/core.js';
import { LIBRARY } from '../widgets/index.js';
import { TEMPLATES, buildTemplate, templateDocPatch } from '../templates/templates.js';
import { loadFiles } from '../data/loader.js';
import { el, clone, fmtDist, fmtDuration, fmtPace, fmtDate, fmtInt, distUnit, paceUnit, readFileAs, deepMerge, uid } from '../util.js';
import { section, row, textInput, numInput, select, seg, toggle, button, iconCanvas, toast, modal } from './ui.js';
import { moveLayer } from './actions.js';
import { fitZoom } from './stage.js';
import { ensureFontsLoaded } from './panels.js';
import { saveUserTemplate, listUserTemplates, deleteUserTemplate } from './storage.js';

let root, tab = 'data';
export function initSidebar() {
  root = document.querySelector('#side-body');
  document.querySelectorAll('#side-tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
  on((w) => {
    if (w === 'mode' || w === 'data') build();
    else if ((w === 'doc' || w === 'sel' || w === 'layers') && (tab === 'layers' || tab === 'trash')) build();
  });
  build();
}
export function showTab(t) {
  tab = t;
  document.querySelectorAll('#side-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  build();
}
function build() {
  if (!root) return;
  const s = root.scrollTop;
  root.innerHTML = '';
  ({ data: dataTab, templates: templatesTab, add: addTab, layers: layersTab, trash: trashTab })[tab]();
  root.scrollTop = s;
}

// ---------- Data ----------
function fileInput(multiple, onFiles) {
  const inp = el('input', { type: 'file', accept: '.fit,.tcx,.gpx,.zip,.gz,application/zip', multiple: multiple ? true : null, style: { display: 'none' } });
  inp.onchange = () => { if (inp.files.length) onFiles([...inp.files]); inp.value = ''; };
  return inp;
}
export async function handleFiles(files) {
  const busy = el('div', { class: 'busy' }, 'Reading files…'); document.body.append(busy);
  try {
    const { activities, errors } = await loadFiles(files);
    errors.forEach((e) => toast(e, 'err'));
    if (!activities.length) { if (!errors.length) toast('No activities found', 'err'); return; }
    if (App.mode === 'single') {
      if (activities.length > 1) { pickActivity(activities); return; }
      setActivity(activities[0]);
    } else {
      const key = (a) => Math.round(a.start.getTime() / 1000) + ':' + Math.round(a.distance);
      const seen = new Set(App.acts.map(key));
      const fresh = activities.filter((a) => { const k = key(a); if (seen.has(k)) return false; seen.add(k); return true; });
      App.acts = [...App.acts, ...fresh].sort((a, b) => a.start - b.start);
      invalidateMulti(); layoutAll(); emit('data'); emit('doc');
      const dup = activities.length - fresh.length;
      toast(`Loaded ${fresh.length} run${fresh.length !== 1 ? 's' : ''}${dup ? ` (${dup} duplicate${dup > 1 ? 's' : ''} skipped)` : ''}`);
    }
  } finally { busy.remove(); }
}
function setActivity(a) {
  App.act = a; layoutAll(); emit('data'); emit('doc');
  toast(`Loaded “${a.name}” · ${fmtDist(a.distance, App.settings.units)} ${distUnit(App.settings.units)}`);
}
function pickActivity(list) {
  const body = el('div', { class: 'pick-list' });
  const m = modal(`${list.length} activities found — pick one`, body, [button('Use all in Multi-run tab', () => { App.acts = [...App.acts, ...list].sort((a, b) => a.start - b.start); invalidateMulti(); m.close(); emit('switch-multi'); }, 'primary')]);
  for (const a of list) body.append(button(`${fmtDate(a.start, 'medium')} · ${a.name} · ${fmtDist(a.distance, App.settings.units)} ${distUnit(App.settings.units)}`, () => { setActivity(a); m.close(); }, 'wide'));
}
function dropZone(multi) {
  const inp = fileInput(true, handleFiles);
  const dz = el('div', { class: 'drop' },
    iconCanvas('route', 34, '#c6ff3d'),
    el('b', {}, multi ? 'Drop a ZIP or several run files' : 'Drop your run file'),
    el('span', {}, '.fit  .tcx  .gpx  .zip  .gz'),
    button(multi ? 'Choose files…' : 'Choose file…', () => inp.click(), 'primary'), inp);
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); handleFiles([...e.dataTransfer.files]); });
  return dz;
}
function settingsBox() {
  const s = App.settings, box = el('div');
  const upd = (k, v) => { s[k] = v; invalidateMulti(); for (const d of Object.values(App.docs)) for (const e of d.elements) { /* noop */ } layoutAll(); emit('doc'); emit('data'); try { localStorage.setItem('lari-settings', JSON.stringify(s)); } catch (e) { /* ignore */ } };
  box.append(row('Units', seg(s.units, [['metric', 'Metric (km)'], ['imperial', 'Imperial (mi)']], (v) => upd('units', v))));
  box.append(row('Max heart rate', numInput(s.maxHr || '', (v, fin) => fin && upd('maxHr', v), { min: 0, max: 240, placeholder: 'auto' }), { half: true }));
  box.append(row('24-hour clock', toggle(s.h24, (v) => upd('h24', v)), { half: true }));
  box.append(row('HR zone limits (% of max)', el('div', { class: 'list5' }, s.zonePct.map((p, i) => numInput(p, (v, fin) => { if (!fin) return; const a = [...s.zonePct]; a[i] = v; upd('zonePct', a); }, { min: 30, max: 100 })))), { stack: true });
  if (App.mode === 'multi') {
    box.append(row('Week starts on', seg(String(s.weekStart), [['1', 'Monday'], ['0', 'Sunday']], (v) => upd('weekStart', +v))));
    box.append(row('Date range from', seg(s.rangeFromRuns ? 'runs' : 'week', [['week', 'Calendar week'], ['runs', 'First–last run']], (v) => upd('rangeFromRuns', v === 'runs'))));
  }
  box.append(el('div', { class: 'help' }, 'Max HR 0 = use the highest HR in the file (min 170).'));
  return section('Settings', box, { key: 'settings', open: false });
}
function dataTab() {
  const u = App.settings.units;
  if (App.mode === 'single') {
    root.append(dropZone(false));
    const a = currentAct();
    const card = el('div', { class: 'act-card' + (usingSample() ? ' sample' : '') });
    if (usingSample()) card.append(el('div', { class: 'badge-s' }, 'Sample data — load your own file above'));
    card.append(row('Run name', textInput(a.name, (v, fin) => { a.name = v; layoutAll(); emit(fin ? 'doc' : 'doc-live'); })));
    card.append(el('div', { class: 'kv' },
      kv('Date', fmtDate(a.start, 'medium')), kv('Distance', `${fmtDist(a.distance, u)} ${distUnit(u)}`), kv('Moving time', fmtDuration(a.moving)),
      kv('Avg pace', `${fmtPace(a.avgPace, u)}${paceUnit(u)}`), kv('Avg HR', a.hasHr ? fmtInt(a.avgHr) + ' bpm' : '—'), kv('Elev gain', fmtInt(a.ascent) + ' m'),
      kv('Device laps', String(a.rawLaps.length || '—')), kv('GPS', a.hasGps ? 'Yes' : 'No'), kv('Points', String(a.n))));
    if (!usingSample()) card.append(button('Remove file (use sample)', () => { App.act = null; layoutAll(); emit('data'); emit('doc'); }, 'small ghost'));
    root.append(card);
  } else {
    root.append(dropZone(true));
    const d = App.doc;
    root.append(row('Period title', textInput(d.title, (v, fin) => { d.title = v; commit('Title', fin ? 0 : 500); }), { stack: true }));
    const acts = currentActs();
    const list = el('div', { class: 'runs' });
    if (usingSample()) list.append(el('div', { class: 'badge-s' }, 'Sample week — drop your ZIP above'));
    acts.forEach((a) => {
      const r = el('div', { class: 'run' + (a.enabled === false ? ' off' : '') },
        toggle(a.enabled !== false, (v) => { a.enabled = v; invalidateMulti(); layoutAll(); emit('doc'); emit('data'); }),
        el('div', { class: 'run-main' },
          textInput(a.name, (v, fin) => { a.name = v; invalidateMulti(); layoutAll(); emit(fin ? 'doc' : 'doc-live'); }),
          el('span', { class: 'run-meta' }, `${fmtDate(a.start, 'short')} · ${fmtDist(a.distance, u)} ${distUnit(u)} · ${fmtDuration(a.moving)} · ${fmtPace(a.avgPace, u)}${paceUnit(u)}`)),
        !usingSample() ? button('✕', () => { App.acts = App.acts.filter((x) => x !== a); invalidateMulti(); layoutAll(); emit('data'); emit('doc'); }, 'tiny ghost') : null);
      list.append(r);
    });
    root.append(section(`Runs (${acts.filter((a) => a.enabled !== false).length} of ${acts.length} included)`, list, { key: 'runs' }));
    if (!usingSample()) root.append(button('Clear all runs', () => { App.acts = []; invalidateMulti(); layoutAll(); emit('data'); emit('doc'); }, 'small ghost'));
  }
  root.append(settingsBox());
}
const kv = (k, v) => el('div', {}, el('span', {}, k), el('b', {}, v));

// ---------- Templates ----------
function tplPreview(tpl, w = 150) {
  const d = newDoc(App.mode); d.w = App.doc.w; d.h = App.doc.h;
  deepMerge(d, clone(templateDocPatch(tpl)));
  if (!tpl.bg) d.bg = { ...d.bg, type: 'gradient', color: '#3b4252', color2: '#1b1f27', angle: 160 };
  const env = makeEnv(d);
  const c = document.createElement('canvas');
  const k = w / d.w, h = Math.round(d.h * k);
  c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px';
  const ctx = c.getContext('2d');
  d.elements = buildTemplate(tpl, d, env, ctx);
  ctx.scale(k * 2, k * 2);
  renderScene(ctx, d, env, {});
  return c;
}
export function applyTemplate(tpl, mode = 'replace') {
  const d = App.doc;
  if (mode === 'replace') { d.trash = [...d.elements.map((e) => ({ el: e, at: Date.now() })), ...d.trash].slice(0, 80); d.elements = []; }
  const patch = clone(templateDocPatch(tpl));
  if (mode === 'replace') { const t0 = THEMES[0]; d.theme = { text: t0.text, muted: t0.muted, accent: t0.accent, accent2: t0.accent2, ...(patch.theme || {}) }; }
  else if (patch.theme) Object.assign(d.theme, patch.theme);
  if (patch.bg) d.bg = { ...d.bg, ...patch.bg };
  else if (mode === 'replace' && d.bg.type !== 'image') d.bg.type = 'transparent';
  const env = makeEnv(d);
  const els = buildTemplate(tpl, d, env, App.measureCtx);
  d.elements.push(...els);
  setSel([], true);
  commit('Template: ' + tpl.name);
  emit('sel');
  ensureFontsLoaded();
}
function templatesTab() {
  root.append(el('div', { class: 'help' }, 'Start from a template, then customise every element. Applying replaces the current design (old elements go to Trash, and Undo works).'));
  const g = el('div', { class: 'tpl-grid' });
  for (const t of TEMPLATES[App.mode]) {
    const b = el('button', { type: 'button', class: 'tpl' }, el('div', { class: 'tpl-img' }), el('b', {}, t.name), el('span', {}, t.desc));
    b.onclick = () => applyTemplate(t);
    g.append(b);
    requestAnimationFrame(() => { try { b.firstChild.append(tplPreview(t)); } catch (e) { console.warn(e); } });
  }
  root.append(g);
  // user templates
  const mine = el('div', { class: 'tpl-grid mine' });
  const sec = section('My saved designs', el('div', {}, button('Save current design as template', async () => {
    const name = prompt('Template name', App.doc.title || 'My design'); if (!name) return;
    await saveUserTemplate({ id: uid(), name, mode: App.mode, doc: clone({ ...App.doc, trash: [] }), assets: Object.fromEntries(Object.entries(App.assetSrc)) });
    toast('Template saved'); build();
  }, 'small primary'), mine), { key: 'mytpl' });
  root.append(sec);
  listUserTemplates(App.mode).then((list) => {
    if (!list.length) mine.append(el('div', { class: 'help' }, 'Nothing saved yet.'));
    for (const t of list) {
      mine.append(el('div', { class: 'mytpl' }, el('b', {}, t.name),
        button('Use', () => { for (const [id, src] of Object.entries(t.assets || {})) if (!App.assets[id]) addAsset(src, id); const d = clone(t.doc); d.trash = App.doc.elements.map((e) => ({ el: e, at: Date.now() })); App.docs[App.mode] = d; setSel([], true); commit('Template: ' + t.name); fitZoom(); ensureFontsLoaded(); }, 'tiny'),
        button('Delete', async () => { await deleteUserTemplate(t.id); build(); }, 'tiny ghost')));
    }
  });
}

// ---------- Add ----------
function addTab() {
  const cats = [...LIBRARY[App.mode], LIBRARY.media];
  for (const c of cats) {
    const g = el('div', { class: 'lib' });
    for (const it of c.items) {
      const b = el('button', { type: 'button', class: 'lib-item' }, iconCanvas(it.icon || 'star', 26), el('span', {}, it.label));
      b.onclick = () => addFromLibrary(it);
      g.append(b);
    }
    root.append(section(c.cat, g, { key: 'lib' + c.cat }));
  }
}
export async function addFromLibrary(it) {
  if (it.type === 'image') {
    const inp = el('input', { type: 'file', accept: 'image/*' });
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const url = await readFileAs(f, 'dataURL'); const id = addAsset(url);
      const img = App.assets[id];
      await new Promise((r) => { if (img.complete) r(); else img.onload = r; });
      const max = App.doc.w * 0.6, k = Math.min(max / img.naturalWidth, max / img.naturalHeight, 1);
      addElement('image', { props: { asset: id, mask: 'rect', radius: 0 }, w: img.naturalWidth * k, h: img.naturalHeight * k, name: f.name.replace(/\.[^.]+$/, '') });
      emit('added');
    };
    inp.click();
    return;
  }
  const over = clone(it.over || {});
  if (!over.name) over.name = it.label;
  addElement(it.type, over);
  ensureFontsLoaded();
  emit('added');
}

// ---------- Layers ----------
function layersTab() {
  const d = App.doc;
  if (!d.elements.length) { root.append(el('div', { class: 'help' }, 'No elements yet. Add some from the Add tab or pick a template.')); return; }
  root.append(el('div', { class: 'help' }, 'Top of the list is in front. Drag to reorder. Shift/Ctrl-click to select several.'));
  const list = el('div', { class: 'layers' });
  const els = [...d.elements].reverse();
  let dragId = null;
  for (const e of els) {
    const r = el('div', { class: 'layer' + (App.sel.includes(e.id) ? ' on' : '') + (e.hidden ? ' hid' : ''), draggable: 'true' });
    if (e.group) r.style.setProperty('--g', groupColor(e.group));
    const name = el('span', { class: 'lname' }, e.name || REG[e.type]?.name);
    name.ondblclick = () => { const i = textInput(e.name, (v, fin) => { e.name = v; if (fin) commit('Rename'); }); name.replaceWith(i); i.focus(); i.select(); i.onblur = () => commit('Rename'); };
    r.append(
      el('i', { class: 'grip' }, '⋮⋮'),
      name,
      button(e.hidden ? '◌' : '●', (ev) => { ev.stopPropagation(); e.hidden = !e.hidden; commit(e.hidden ? 'Hide' : 'Show'); }, 'tiny ghost eye'),
      button(e.locked ? '🔒' : '🔓', (ev) => { ev.stopPropagation(); e.locked = !e.locked; commit(e.locked ? 'Lock' : 'Unlock'); }, 'tiny ghost'),
    );
    r.onclick = (ev) => {
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) setSel(App.sel.includes(e.id) ? App.sel.filter((x) => x !== e.id) : [...App.sel, e.id]);
      else setSel([e.id]);
      emit('layers');
    };
    r.addEventListener('dragstart', (ev) => { dragId = e.id; ev.dataTransfer.effectAllowed = 'move'; r.classList.add('drag'); });
    r.addEventListener('dragend', () => r.classList.remove('drag'));
    r.addEventListener('dragover', (ev) => { ev.preventDefault(); r.classList.add('over'); });
    r.addEventListener('dragleave', () => r.classList.remove('over'));
    r.addEventListener('drop', (ev) => { ev.preventDefault(); r.classList.remove('over'); if (!dragId || dragId === e.id) return; const to = d.elements.findIndex((x) => x.id === e.id); moveLayer(dragId, to); });
    list.append(r);
  }
  root.append(list);
}
function groupColor(g) { let h = 0; for (const c of g) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 80% 60%)`; }

// ---------- Trash ----------
function trashTab() {
  const d = App.doc;
  if (!d.trash.length) { root.append(el('div', { class: 'help' }, 'Deleted elements appear here so you can restore them.')); return; }
  const list = el('div', { class: 'layers' });
  d.trash.forEach((t, i) => list.append(el('div', { class: 'layer' }, el('span', { class: 'lname' }, t.el.name || t.el.type), button('Restore', () => restoreTrash(i), 'tiny'))));
  root.append(list, button('Restore all', () => { d.elements.push(...d.trash.map((t) => t.el)); d.trash = []; commit('Restore all'); }, 'small'), button('Empty trash', () => { d.trash = []; commit('Empty trash'); }, 'small ghost danger'));
}
