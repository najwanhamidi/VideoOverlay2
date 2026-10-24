// App bootstrap: wiring, keyboard shortcuts, autosave, project files.
import './widgets/index.js';
import { App, on, emit, commit, undo, redo, canUndo, canRedo, setSel, selected, deleteSelected, duplicateSelected, resetHistory, layoutAll, newDoc, addAsset, addElement, usedAssets, invalidateMulti, setTextSel } from './editor/state.js';
import { initStage, fitZoom, setZoom, view, nudge, requestRender, openInlineEditor } from './editor/stage.js';
import { initPanels, ensureFontsLoaded } from './editor/panels.js';
import { initSidebar, showTab, handleFiles, applyTemplate } from './editor/sidebar.js';
import { initTimeline, togglePlay, pause } from './editor/timeline.js';
import { arrange, groupSel, ungroupSel, copySel, paste, selectAll } from './editor/actions.js';
import { openExport } from './export/export.js';
import { TEMPLATES } from './templates/templates.js';
import { kvGet, kvSet, packAct, unpackAct, actToJSON, actFromJSON } from './editor/storage.js';
import { modal, button, toast } from './editor/ui.js';
import { el, debounce, readFileAs } from './util.js';
import { saveBlob, initDesktop, isDesktop } from './platform.js';

const $ = (s) => document.querySelector(s);

async function boot() {
  initDesktop();
  try { const s = JSON.parse(localStorage.getItem('lari-settings') || 'null'); if (s) Object.assign(App.settings, s); } catch (e) { /* ignore */ }
  const restored = await restore();
  if (!restored) {
    App.mode = 'single'; applyTemplate(TEMPLATES.single[0]);
    App.mode = 'multi'; applyTemplate(TEMPLATES.multi[0]);
    App.mode = 'single';
  }
  for (const m of ['single', 'multi']) resetHistory(m);
  initStage(); initPanels(); initSidebar(); initTimeline();
  wireTop(); wireKeys(); wireDrop(); wireMobile();
  setMode(App.mode, true);
  ensureFontsLoaded();
  document.fonts.ready.then(() => { layoutAll(); emit('doc'); });
  on((w) => { if (w === 'doc' || w === 'data') autosave(); if (w === 'doc' || w === 'sel') updateUndo(); if (w === 'switch-multi') setMode('multi'); });
  updateUndo();
  if (!localStorage.getItem('lari-welcomed')) { try { localStorage.setItem('lari-welcomed', '1'); } catch (e) { /* */ } }
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !isDesktop() && location.hostname !== 'localhost') navigator.serviceWorker.register('sw.js').catch(() => {});
  document.body.classList.add('ready');
}

function setMode(m, initial) {
  pause(); App.time = null;
  App.mode = m; setSel([], true);
  document.querySelectorAll('#mode-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  document.body.dataset.mode = m;
  layoutAll(); fitZoom();
  emit('mode'); emit('doc');
  if (!initial) requestRender();
}

function updateUndo() { $('#undo').disabled = !canUndo(); $('#redo').disabled = !canRedo(); }

function wireTop() {
  document.querySelectorAll('#mode-tabs button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  $('#undo').onclick = undo; $('#redo').onclick = redo;
  $('#zoom-in').onclick = () => setZoom(view.zoom * 1.2);
  $('#zoom-out').onclick = () => setZoom(view.zoom / 1.2);
  $('#zoom-label').onclick = () => fitZoom();
  $('#btn-export').onclick = () => openExport('image');
  $('#btn-video').onclick = () => openExport('video');
  $('#btn-menu').onclick = openMenu;
  const st = $('#seltools');
  st.addEventListener('pointerdown', (e) => e.stopPropagation());
  st.querySelectorAll('button').forEach((b) => (b.onclick = () => {
    const a = b.dataset.act;
    if (a === 'dup') duplicateSelected(); else if (a === 'del') deleteSelected();
    else if (a === 'up') arrange('up'); else if (a === 'down') arrange('down');
    else if (a === 'group') groupSel(); else if (a === 'ungroup') ungroupSel();
    else if (a === 'lock') { const s = selected(); const l = !s.every((e) => e.locked); s.forEach((e) => (e.locked = l)); commit(l ? 'Lock' : 'Unlock'); emit('sel'); }
    else if (a === 'edit') openSheet('props');
    else if (a === 'edittext') openInlineEditor();
  }));
}

function wireKeys() {
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'range') { if (e.key === 'Escape') document.activeElement.blur(); return; }
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    if (mod && k === 'd') { e.preventDefault(); duplicateSelected(); return; }
    if (mod && k === 'g') { e.preventDefault(); e.shiftKey ? ungroupSel() : groupSel(); return; }
    if (mod && k === 'a') { e.preventDefault(); selectAll(); return; }
    if (mod && k === 'c') { copySel(); return; }
    if (mod && k === 'x') { copySel(); deleteSelected(); return; }
    if (mod && k === 'v') { paste(); return; }
    if (mod && k === 's') { e.preventDefault(); saveProject(); return; }
    if (mod && k === 'e') { e.preventDefault(); openExport('image'); return; }
    if (mod && (k === '=' || k === '+')) { e.preventDefault(); setZoom(view.zoom * 1.2); return; }
    if (mod && k === '-') { e.preventDefault(); setZoom(view.zoom / 1.2); return; }
    if (mod && k === '0') { e.preventDefault(); fitZoom(); return; }
    if (k === 'delete' || k === 'backspace') { if (App.sel.length) { e.preventDefault(); deleteSelected(); } return; }
    if (k === 'escape') { if (App.tsel) setTextSel(null); else setSel([]); return; }
    if (k === 'enter' && App.tsel) { e.preventDefault(); openInlineEditor(); return; }
    if (k === '[') { arrange(e.shiftKey ? 'back' : 'down'); return; }
    if (k === ']') { arrange(e.shiftKey ? 'front' : 'up'); return; }
    if (e.key.startsWith('Arrow') && App.sel.length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : App.doc.grid.snap ? App.doc.grid.size : 1;
      const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0, dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
      nudge(dx, dy); return;
    }
    if (k === ' ' && !App.sel.length && e.target === document.body) { e.preventDefault(); togglePlay(); }
  });
}

function wireDrop() {
  window.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', async (e) => {
    if (e.defaultPrevented || !e.dataTransfer.files.length) return;
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    const data = files.filter((f) => !f.type.startsWith('image/'));
    for (const f of imgs) await addImageFile(f);
    if (data.length) handleFiles(data);
  });
  window.addEventListener('paste', async (e) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) { e.preventDefault(); addImageFile(f); }
  });
}
async function addImageFile(f) {
  const url = await readFileAs(f, 'dataURL'); const id = addAsset(url); const img = App.assets[id];
  await new Promise((r) => (img.complete ? r() : (img.onload = r)));
  const max = App.doc.w * 0.6, k = Math.min(max / img.naturalWidth, max / img.naturalHeight, 1);
  addElement('image', { props: { asset: id, radius: 0 }, w: img.naturalWidth * k, h: img.naturalHeight * k, name: f.name.replace(/\.[^.]+$/, '') });
}

// ---------- Mobile sheets ----------
function openSheet(which) {
  document.body.classList.remove('sheet-side', 'sheet-props');
  if (which) document.body.classList.add('sheet-' + which);
  document.querySelectorAll('#mnav button').forEach((b) => b.classList.toggle('on', which && (b.dataset.sheet === which && (!b.dataset.tab || b.dataset.tab === curTab))));
}
let curTab = 'data';
function wireMobile() {
  document.querySelectorAll('#mnav button').forEach((b) => (b.onclick = () => {
    const sh = b.dataset.sheet;
    if (sh === 'export') { openExport('image'); return; }
    if (sh === 'play') { togglePlay(); return; }
    const already = document.body.classList.contains('sheet-' + sh) && (!b.dataset.tab || b.dataset.tab === curTab);
    if (b.dataset.tab) { curTab = b.dataset.tab; showTab(b.dataset.tab); }
    openSheet(already ? null : sh);
  }));
  document.querySelectorAll('.sheet-close').forEach((b) => (b.onclick = () => openSheet(null)));
  on((w) => { if (w === 'added' && window.innerWidth < 900) openSheet(null); });
}

// ---------- Menu & project files ----------
function openMenu() {
  const body = el('div', { class: 'menu' },
    button('💾  Save project file (.lari)', () => { m.close(); saveProject(); }, 'wide'),
    button('📂  Open project file…', () => { m.close(); openProject(); }, 'wide'),
    button('🔤  Add a custom font (.ttf .otf .woff)…', () => { m.close(); pickFont(); }, 'wide'),
    button('🧹  New blank design (this tab)', () => { m.close(); const d = App.doc; d.trash = [...d.elements.map((e) => ({ el: e, at: Date.now() })), ...d.trash]; d.elements = []; commit('Clear'); }, 'wide'),
    button('↺  Reset app (clears autosave)', async () => { if (!confirm('Clear all designs, loaded runs and settings?')) return; await kvSet('state', null); try { localStorage.clear(); } catch (e) { /* */ } location.reload(); }, 'wide danger'),
    el('h4', {}, 'Keyboard shortcuts'),
    el('div', { class: 'keys', html: `
      <span>Undo / Redo</span><kbd>Ctrl Z</kbd> <kbd>Ctrl Shift Z</kbd>
      <span>Duplicate</span><kbd>Ctrl D</kbd>
      <span>Copy / Paste</span><kbd>Ctrl C</kbd> <kbd>Ctrl V</kbd>
      <span>Group / Ungroup</span><kbd>Ctrl G</kbd> <kbd>Ctrl Shift G</kbd>
      <span>Delete</span><kbd>Del</kbd>
      <span>Move</span><kbd>←↑→↓</kbd> <kbd>Shift</kbd> ×10
      <span>Layer order</span><kbd>[</kbd> <kbd>]</kbd>
      <span>Zoom</span><kbd>Ctrl +/−</kbd> <kbd>Ctrl 0</kbd> fit, Ctrl+wheel
      <span>Pan</span><kbd>Space</kbd>+drag, middle mouse
      <span>Select one in group</span><kbd>Alt</kbd>+click
      <span>Lock aspect / snap 15°</span><kbd>Shift</kbd> while dragging
      <span>Play preview</span><kbd>Space</kbd>
      <span>Export</span><kbd>Ctrl E</kbd>` }),
    el('p', { class: 'help' }, 'Lari Studio · runs entirely on your device — your files never leave it.'));
  const m = modal('Menu', body);
}
export async function saveProject() {
  const assets = {};
  for (const d of Object.values(App.docs)) for (const id of usedAssets(d)) if (App.assetSrc[id]) assets[id] = App.assetSrc[id];
  const proj = { app: 'lari-studio', v: 1, docs: App.docs, settings: App.settings, assets, fonts: App.fontSrc, act: App.act ? actToJSON(App.act) : null, acts: App.acts.map((a) => ({ ...actToJSON(a), enabled: a.enabled })) };
  await saveBlob(new Blob([JSON.stringify(proj)], { type: 'application/json' }), (App.act?.name || 'design').replace(/[^\w-]+/g, '-') + '.lari');
}
function openProject() {
  const inp = el('input', { type: 'file', accept: '.lari,.json,application/json' });
  inp.onchange = async () => {
    try {
      const p = JSON.parse(await readFileAs(inp.files[0], 'text'));
      if (p.app !== 'lari-studio') throw new Error('Not a Lari project');
      for (const [id, src] of Object.entries(p.assets || {})) addAsset(src, id);
      for (const [n, u] of Object.entries(p.fonts || {})) await registerFont(n, u);
      App.docs = p.docs; Object.assign(App.settings, p.settings || {});
      App.act = p.act ? actFromJSON(p.act) : null; App.acts = (p.acts || []).map(actFromJSON); invalidateMulti();
      for (const m of ['single', 'multi']) resetHistory(m);
      setMode(App.mode); emit('data'); ensureFontsLoaded(); toast('Project opened');
    } catch (e) { toast('Could not open: ' + e.message, 'err'); }
  };
  inp.click();
}

// ---------- Custom fonts ----------
App.customFonts = []; App.fontSrc = {};
async function registerFont(name, url) {
  try { const f = new FontFace(name, `url(${url})`); await f.load(); document.fonts.add(f); if (!App.customFonts.includes(name)) App.customFonts.push(name); App.fontSrc[name] = url; return true; }
  catch (e) { toast('Could not load font: ' + e.message, 'err'); return false; }
}
function pickFont() {
  const inp = el('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2' });
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    if (await registerFont(name, await readFileAs(f, 'dataURL'))) { toast(`Font “${name}” added — pick it in any Font menu`); emit('rebuild'); autosave(); }
  };
  inp.click();
}

// ---------- Autosave ----------
const autosave = debounce(async () => {
  const assets = {};
  for (const d of Object.values(App.docs)) for (const id of usedAssets(d)) if (App.assetSrc[id]) assets[id] = App.assetSrc[id];
  await kvSet('state', { v: 1, mode: App.mode, docs: App.docs, assets, fonts: App.fontSrc, act: packAct(App.act), acts: App.acts.map(packAct) });
}, 1200);
async function restore() {
  try {
    const s = await kvGet('state');
    if (!s || !s.docs) return false;
    for (const [id, src] of Object.entries(s.assets || {})) addAsset(src, id);
    for (const [n, u] of Object.entries(s.fonts || {})) await registerFont(n, u);
    App.docs = { single: s.docs.single || newDoc('single'), multi: s.docs.multi || newDoc('multi') };
    App.act = unpackAct(s.act); App.acts = (s.acts || []).map(unpackAct);
    App.mode = s.mode || 'single';
    return App.docs.single.elements.length + App.docs.multi.elements.length > 0;
  } catch (e) { console.warn('restore failed', e); return false; }
}

window.LariApp = App;
boot().catch((e) => { console.error(e); document.body.append(el('pre', { class: 'fatal' }, 'Startup error: ' + e.message)); });
