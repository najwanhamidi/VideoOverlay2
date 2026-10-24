// Properties panel (selected element(s)) and canvas settings panel.
import { App, on, emit, commit, selected, makeEnv, layoutAll, addAsset, THEMES, SIZES, videoLength, duplicateSelected, deleteSelected, setTextSel, currentText, setTextOverride, isTextOverridden } from './state.js';
import { REG, SKINS, ENTRANCES, applySkin, forEachTS, layoutElement, drawElement, boxOf } from '../widgets/core.js';
import { el, getPath, setPath, clone, readFileAs, EASE } from '../util.js';
import { section, row, textInput, textArea, numInput, range, select, seg, toggle, button, colorInput, fontSelect, weightsFor, iconPicker, emojiPicker, toast } from './ui.js';
import { metricsFor } from '../widgets/metrics.js';
import { fitZoom, requestRender, openInlineEditor } from './stage.js';
import { arrange, alignSel, groupSel, ungroupSel } from './actions.js';
import { clearFontCache } from '../render/draw.js';

let root, rebuildPending = false, selfChange = false, lastTsel = '';
const controls = []; // {path, ctl, get}

export function initPanels() {
  root = document.querySelector('#props');
  on((w) => {
    if (w === 'sel' || w === 'mode' || w === 'rebuild') { const k = App.tsel ? App.tsel.id + App.tsel.p + App.tsel.n : ''; if (k !== lastTsel && k) { lastTsel = k; build(); root.scrollTop = 0; } else { lastTsel = k; build(); } }
    else if ((w === 'doc' || w === 'live' || w === 'doc-live') && !selfChange) refresh();
    else if (w === 'focus-text') { build(); const t = root.querySelector('textarea'); if (t) { t.focus(); t.select(); } }
  });
  build();
}
function refresh() { for (const c of controls) { try { c.ctl._set && c.ctl._set(c.get()); } catch (e) { /* ignore */ } } }
function scheduleRebuild() { if (rebuildPending) return; rebuildPending = true; requestAnimationFrame(() => { rebuildPending = false; build(); }); }

function apply(els, path, v, final, label = 'Edit') {
  for (const e of els) setPath(e, path, clone(v));
  selfChange = true;
  commit(label, final ? 0 : 450);
  selfChange = false;
  if (/^props\.(text|metric|label|unit)/.test(path) || /\.font$/.test(path)) ensureFontsLoaded();
}
export function ensureFontsLoaded() {
  const specs = new Set();
  for (const d of Object.values(App.docs)) for (const e of d.elements) forEachTS(e, (ts) => specs.add(`${ts.italic ? 'italic ' : ''}${ts.weight} 40px "${ts.font}"`));
  Promise.all([...specs].map((s) => document.fonts.load(s).catch(() => null))).then(() => { clearFontCache(); layoutAll(); emit('doc'); });
}

// ---------- Field factory ----------
function field(f, els) {
  const first = els[0];
  const get = () => getPath(first, f.k);
  const set = (v, final) => { apply(els, f.k, v, final); if (final && ['select', 'seg', 'toggle', 'splits', 'icon', 'image'].includes(f.t)) scheduleRebuild(); };
  let ctl;
  switch (f.t) {
    case 'text': ctl = textInput(get(), set, f); break;
    case 'textarea': {
      ctl = textArea(get(), set, f);
      if (f.presets) { const wrap = el('div', { class: 'stack-ctl' }, ctl, el('div', { class: 'presets' }, f.presets.map((p) => button(p, () => { ctl.value = p; set(p, true); }, 'tiny')))); controls.push({ ctl, get }); return row(f.label, wrap, { stack: true }); }
      if (f.help) { const wrap = el('div', { class: 'stack-ctl' }, ctl, el('div', { class: 'help' }, f.help)); controls.push({ ctl, get }); return row(f.label, wrap, { stack: true }); }
      break;
    }
    case 'num': ctl = numInput(get(), set, f); break;
    case 'range': ctl = range(get(), set, f); break;
    case 'select': ctl = select(get(), f.options, set); break;
    case 'seg': ctl = seg(get(), f.options, set); break;
    case 'toggle': ctl = toggle(get(), set); break;
    case 'color': ctl = colorInput(get(), set); break;
    case 'font': ctl = fontSelect(get(), set); break;
    case 'icon': ctl = iconPicker(get(), set); break;
    case 'emoji': ctl = emojiPicker(get(), set); break;
    case 'image': ctl = imagePicker(get(), set); break;
    case 'splits': return splitsCtl(f, els);
    case 'cols': return colsCtl(f, els);
    case 'items': return itemsCtl(f, els);
    case 'multi': {
      const cur = new Set(get() || []);
      ctl = el('div', { class: 'checks' }, f.options.map(([v, l]) => { const c = toggle(cur.has(v), (on) => { on ? cur.add(v) : cur.delete(v); set(f.options.map((o) => o[0]).filter((x) => cur.has(x)), true); }); return el('label', { class: 'check' }, c, l); }));
      break;
    }
    case 'list5': ctl = el('div', { class: 'list5' }, (get() || []).map((v, i) => textInput(v, (nv, fin) => { const a = clone(get()); a[i] = nv; set(a, fin); }))); break;
    case 'colors5': ctl = el('div', { class: 'list5 colors' }, (get() || []).map((v, i) => colorInput(v, (nv, fin) => { const a = clone(get()); a[i] = nv; set(a, fin); }))); break;
    default: ctl = el('span', {}, '?');
  }
  controls.push({ ctl, get });
  return row(f.label, ctl, { half: f.half, stack: f.t === 'textarea' || f.t === 'multi' });
}
function imagePicker(val, set) {
  const w = el('div', { class: 'img-pick' });
  const prev = el('div', { class: 'img-prev' });
  const show = (id) => { prev.innerHTML = ''; if (id && App.assetSrc[id]) prev.append(el('img', { src: App.assetSrc[id] })); };
  const inp = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const url = await readFileAs(f, 'dataURL'); const id = addAsset(url); show(id); set(id, true); };
  w.append(prev, button('Choose image…', () => inp.click()), inp);
  show(val); w._set = show;
  return w;
}
function splitsCtl(f, els) {
  const p = () => getPath(els[0], f.k) || { mode: 'km' };
  const upd = (k, v, fin) => { const s = clone(p()); s[k] = v; apply(els, f.k, s, fin, 'Splits'); if (fin && k === 'mode') scheduleRebuild(); };
  const cur = p();
  const u = App.settings.units === 'imperial' ? 'mi' : 'km';
  const box = el('div', { class: 'splits-ctl' },
    row(f.label || 'Split by', select(cur.mode, [['km', `Every 1 ${u} (auto splits)`], ['laps', 'Device laps (from file)'], ['dist', `Manual: every X ${u}`], ['time', 'Manual: every X minutes'], ['custom', `Manual: custom ${u} marks`]], (v) => upd('mode', v, true))),
  );
  if (cur.mode === 'dist' || cur.mode === 'time') box.append(row(cur.mode === 'time' ? 'Every (minutes)' : `Every (${u})`, numInput(cur.every ?? 1, (v, fin) => upd('every', v, fin), { step: cur.mode === 'time' ? 1 : 0.1, min: 0.1 })));
  if (cur.mode === 'custom') box.append(row(`Marks (${u}, comma separated)`, textInput(cur.custom || '', (v, fin) => upd('custom', v, fin), { placeholder: '1, 3, 5, 8.5' }), { stack: true }));
  if (cur.mode !== 'laps') box.append(row('Ignore last split shorter than (m)', numInput(cur.minPartial ?? 50, (v, fin) => upd('minPartial', v, fin), { min: 0, step: 10 })));
  return box;
}
function colsCtl(f, els) {
  const get = () => getPath(els[0], f.k);
  const names = Object.fromEntries(f.options);
  const box = el('div', { class: 'cols-ctl' });
  const draw = () => {
    box.innerHTML = '';
    get().forEach((c, i) => {
      const r = el('div', { class: 'col-row' },
        toggle(c.on, (v) => { const a = clone(get()); a[i].on = v; apply(els, f.k, a, true); draw(); }),
        el('span', { class: 'col-name' }, names[c.k] || c.k),
        textInput(c.label, (v, fin) => { const a = clone(get()); a[i].label = v; apply(els, f.k, a, fin); }, { placeholder: 'header' }),
        button('↑', () => { if (!i) return; const a = clone(get()); [a[i - 1], a[i]] = [a[i], a[i - 1]]; apply(els, f.k, a, true); draw(); }, 'tiny ghost'),
        button('↓', () => { const a = clone(get()); if (i >= a.length - 1) return; [a[i + 1], a[i]] = [a[i], a[i + 1]]; apply(els, f.k, a, true); draw(); }, 'tiny ghost'),
      );
      box.append(r);
    });
  };
  draw();
  return row(f.label, box, { stack: true });
}
function itemsCtl(f, els) {
  const get = () => getPath(els[0], f.k);
  const M = f.metrics;
  const box = el('div', { class: 'cols-ctl' });
  const draw = () => {
    box.innerHTML = '';
    get().forEach((it, i) => {
      box.append(el('div', { class: 'col-row' },
        toggle(it.on, (v) => { const a = clone(get()); a[i].on = v; apply(els, f.k, a, true); }),
        select(it.m, Object.entries(M).map(([k, m]) => [k, m.label]), (v) => { const a = clone(get()); a[i].m = v; apply(els, f.k, a, true); }),
        textInput(it.label, (v, fin) => { const a = clone(get()); a[i].label = v; apply(els, f.k, a, fin); }, { placeholder: 'label' }),
        button('↑', () => { if (!i) return; const a = clone(get()); [a[i - 1], a[i]] = [a[i], a[i - 1]]; apply(els, f.k, a, true); draw(); }, 'tiny ghost'),
        button('✕', () => { const a = clone(get()); a.splice(i, 1); apply(els, f.k, a, true); draw(); }, 'tiny ghost'),
      ));
    });
    box.append(button('+ Add stat', () => { const a = clone(get()); a.push({ m: Object.keys(M)[0], on: true, label: '' }); apply(els, f.k, a, true); draw(); }, 'small'));
  };
  draw();
  return row(f.label, box, { stack: true });
}

// ---------- Text style group ----------
function tsFields(path, els, multiTS, acc) {
  // multiTS: apply to every text style in elements (group editing); acc: custom {first(), set(k, v, fin)}
  const first = acc ? acc.first() : multiTS ? firstTS(els) : getPath(els[0], path);
  if (!first) return el('div');
  const get = (k) => () => (acc ? acc.first()[k] : multiTS ? firstTS(els)?.[k] : getPath(els[0], path + '.' + k));
  const set = (k) => (v, fin) => {
    if (acc) acc.set(k, v, fin);
    else if (multiTS) { for (const e of els) forEachTS(e, (ts) => { ts[k] = clone(v); }); selfChange = true; commit('Text style', fin ? 0 : 450); selfChange = false; if (k === 'font' || k === 'weight') ensureFontsLoaded(); }
    else apply(els, path + '.' + k, v, fin, 'Text style');
    if (fin && (k === 'font' || k === 'fill' || k === 'shadow' || k === 'stroke')) scheduleRebuild();
  };
  const C = (k, ctl) => { controls.push({ ctl, get: get(k) }); return ctl; };
  const box = el('div', { class: 'ts' });
  const ws = weightsFor(first.font);
  const wOpts = [[100, 'Thin'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra bold'], [900, 'Black']].map(([v, l]) => [v, l + (ws.includes(v) ? '' : ' *')]);
  box.append(
    row('Font', C('font', fontSelect(first.font, set('font')))),
    row('Weight', C('weight', select(first.weight, wOpts, (v, f) => set('weight')(+v, f))), { half: true }),
    row('Italic', C('italic', toggle(first.italic, set('italic'))), { half: true }),
  );
  if (multiTS && !acc) {
    box.append(row('Size', el('div', { class: 'btnrow' }, button('A−', () => scaleText(els, 0.9), 'small'), button('A+', () => scaleText(els, 1.1), 'small'))));
  } else box.append(row('Size', C('size', range(first.size, set('size'), { min: 6, max: 400, step: 1 }))));
  box.append(
    row('Color', C('color', colorInput(first.color, set('color')))),
    row('Fill', C('fill', seg(first.fill || 'solid', [['solid', 'Solid'], ['gradient', 'V-grad'], ['hgradient', 'H-grad'], ['none', 'None']], set('fill')))),
  );
  if (first.fill === 'gradient' || first.fill === 'hgradient') box.append(row('Color 2', C('color2', colorInput(first.color2, set('color2')))));
  box.append(
    row('Letter spacing', C('spacing', range(first.spacing, set('spacing'), { min: -10, max: 60, step: 0.5 }))),
    row('Line height', C('lineHeight', range(first.lineHeight, set('lineHeight'), { min: 0.6, max: 3, step: 0.05 }))),
    row('Case', C('transform', seg(first.transform || 'none', [['none', 'Aa'], ['upper', 'AA'], ['lower', 'aa'], ['title', 'Title']], set('transform')))),
    row('Opacity', C('opacity', range(first.opacity ?? 1, set('opacity'), { min: 0, max: 1, step: 0.01 }))),
    row('Outline', C('stroke', range(first.stroke || 0, set('stroke'), { min: 0, max: 30, step: 0.5 }))),
  );
  if (first.stroke > 0) box.append(row('Outline color', C('strokeColor', colorInput(first.strokeColor, set('strokeColor')))));
  box.append(row('Shadow / glow', C('shadow', toggle(first.shadow, set('shadow')))));
  if (first.shadow) box.append(
    row('Shadow color', C('shadowColor', colorInput(first.shadowColor, set('shadowColor')))),
    row('Blur', C('shadowBlur', range(first.shadowBlur, set('shadowBlur'), { min: 0, max: 80 }))),
    row('Offset X', C('shadowX', range(first.shadowX, set('shadowX'), { min: -40, max: 40 })), { half: true }),
    row('Offset Y', C('shadowY', range(first.shadowY, set('shadowY'), { min: -40, max: 40 })), { half: true }),
  );
  return box;
}
function firstTS(els) { let r = null; for (const e of els) { forEachTS(e, (ts) => { if (!r) r = ts; }); if (r) break; } return r; }
function scaleText(els, k) { for (const e of els) forEachTS(e, (ts) => { ts.size = Math.max(4, Math.round(ts.size * k * 10) / 10); }); commit('Text size'); }
function countTS(els) { let n = 0; for (const e of els) forEachTS(e, () => n++); return n; }

// ---------- Selected text (second tap on a widget) ----------
function styleTitle(e, p, env) {
  const def = REG[e.type];
  try { for (const s of def.schema ? def.schema(e, env) : []) if (s.ts === p) return s.title.replace(/ text$/i, ''); } catch (err) { /* ignore */ }
  return p.split('.').pop().replace(/TS$/, '');
}
function textSelSec(e, env) {
  const t = App.tsel, ts = getPath(e, t.p);
  if (!ts) return null;
  const box = el('div', { class: 'tsel-sec' });
  const name = styleTitle(e, t.p, env);
  box.append(el('div', { class: 'tsel-head' }, el('b', {}, '✎ Selected text'), el('span', { class: 'pill' }, name), button('Done', () => setTextSel(null), 'tiny ghost')));
  const isText = e.type === 'text';
  const inp = isText || /\n/.test(currentText()) ? textArea(currentText(), (v, fin) => { selfChange = true; setTextOverride(v, fin); selfChange = false; }, { rows: 2 })
    : textInput(currentText(), (v, fin) => { selfChange = true; setTextOverride(v, fin); selfChange = false; if (fin) scheduleRebuild(); });
  inp.classList.add('tsel-input');
  controls.push({ ctl: inp, get: () => currentText() });
  box.append(row('Text', inp, { stack: true }));
  if (!isText) {
    const btns = el('div', { class: 'btnrow' }, button('Type on canvas', () => openInlineEditor(), 'small'));
    if (isTextOverridden()) btns.append(button('Reset to data', () => { setTextOverride(t.orig, true); scheduleRebuild(); }, 'small'));
    box.append(btns);
    box.append(el('div', { class: 'tsel-orig' }, isTextOverridden() ? `Original: “${t.orig}”. Custom text stays fixed during the video.` : t.single ? 'Shows live data. Type to replace it with your own text.' : `Shows live data. Identical “${t.orig}” text in this widget changes together.`));
  } else box.append(el('div', { class: 'tsel-orig' }, 'Data tokens like {distance} still work.'));
  // style scope
  let acc = null;
  if (!t.single && !isText) {
    box.append(row('Style applies to', seg(App.tselScope, [['one', 'This text only'], ['all', `All “${name}” text`]], (v) => { App.tselScope = v; requestRender(); scheduleRebuild(); })));
    if (App.tselScope === 'one') {
      const k = t.key;
      acc = {
        first: () => ({ ...ts, ...((ts.per && ts.per[k]) || {}) }),
        set: (key, v, fin) => { ts.per = ts.per || {}; ts.per[k] = ts.per[k] || {}; ts.per[k][key] = clone(v); selfChange = true; commit('Text style', fin ? 0 : 450); selfChange = false; if (key === 'font' || key === 'weight') ensureFontsLoaded(); },
      };
      if (ts.per && ts.per[k]) box.append(row('', button('Reset this text\'s style', () => { delete ts.per[k]; if (!Object.keys(ts.per).length) delete ts.per; commit('Text style'); scheduleRebuild(); }, 'small')));
    }
  }
  box.append(tsFields(t.p, [e], false, acc));
  return box;
}

// ---------- Common sections ----------
function transformSec(els) {
  const one = els.length === 1 ? els[0] : null;
  const box = el('div');
  if (one) {
    const def = REG[one.type];
    const f = (k, label, opts = {}) => { const ctl = numInput(one[k], (v, fin) => { if (k === 'w' && def.auto) { one.s = Math.max(0.02, (one.s || 1) * v / one.w); } else if (k === 'h' && def.auto) { one.s = Math.max(0.02, (one.s || 1) * v / one.h); } else one[k] = v; selfChange = true; commit('Transform', fin ? 0 : 400); selfChange = false; }, opts); controls.push({ ctl, get: () => Math.round(one[k] * 10) / 10 }); return row(label, ctl, { half: true }); };
    box.append(f('x', 'X'), f('y', 'Y'), f('w', 'Width'), f('h', 'Height'));
    const rot = range(one.rot || 0, (v, fin) => { one.rot = v; selfChange = true; commit('Rotate', fin ? 0 : 400); selfChange = false; }, { min: -180, max: 180, step: 0.5 });
    controls.push({ ctl: rot, get: () => one.rot || 0 });
    box.append(row('Rotation', rot));
    if (!def.auto) { const sc = range(Math.round((one.s || 1) * 100), (v, fin) => { one.s = v / 100; selfChange = true; commit('Scale', fin ? 0 : 400); selfChange = false; }, { min: 10, max: 400 }); controls.push({ ctl: sc, get: () => Math.round((one.s || 1) * 100) }); box.append(row('Content scale %', sc)); }
    else { const sc = range(Math.round((one.s || 1) * 100), (v, fin) => { const cx = one.x + one.w / 2; one.s = v / 100; layoutElement(App.measureCtx, one, makeEnv(App.doc)); one.x = cx - one.w / 2; selfChange = true; commit('Scale', fin ? 0 : 400); selfChange = false; }, { min: 5, max: 500 }); controls.push({ ctl: sc, get: () => Math.round((one.s || 1) * 100) }); box.append(row('Scale %', sc)); }
  }
  const op = range(Math.round((els[0].opacity ?? 1) * 100), (v, fin) => { els.forEach((e) => (e.opacity = v / 100)); selfChange = true; commit('Opacity', fin ? 0 : 400); selfChange = false; }, { min: 0, max: 100 });
  controls.push({ ctl: op, get: () => Math.round((els[0].opacity ?? 1) * 100) });
  box.append(row('Opacity %', op));
  box.append(row('Blend', select(els[0].blend || 'source-over', [['source-over', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['soft-light', 'Soft light'], ['difference', 'Difference'], ['lighter', 'Add']], (v) => { els.forEach((e) => (e.blend = v)); commit('Blend'); })));
  box.append(row('Flip', el('div', { class: 'btnrow' },
    button('↔ Horizontal', () => { els.forEach((e) => (e.flipX = !e.flipX)); commit('Flip'); }, 'small'),
    button('↕ Vertical', () => { els.forEach((e) => (e.flipY = !e.flipY)); commit('Flip'); }, 'small'))));
  box.append(row(els.length > 1 ? 'Align selection' : 'Align to canvas', el('div', { class: 'btnrow align' },
    ...[['left', '⇤'], ['hcenter', '↔'], ['right', '⇥'], ['top', '⤒'], ['vcenter', '↕'], ['bottom', '⤓']].map(([k, l]) => button(l, () => alignSel(k), 'small ' + k)))));
  if (els.length > 2) box.append(row('Distribute', el('div', { class: 'btnrow' }, button('Horizontally', () => alignSel('dh'), 'small'), button('Vertically', () => alignSel('dv'), 'small'))));
  box.append(row('Order', el('div', { class: 'btnrow' }, button('To front', () => arrange('front'), 'small'), button('Forward', () => arrange('up'), 'small'), button('Backward', () => arrange('down'), 'small'), button('To back', () => arrange('back'), 'small'))));
  return section(els.length > 1 ? `Position & size (${els.length} items)` : 'Position & size', box, { key: 'transform' });
}
function backdropSec(els) {
  const st = els[0].style, box = el('div');
  const F = (f) => field(f, els);
  box.append(F({ k: 'style.bg', t: 'seg', label: 'Backdrop', options: [['none', 'None'], ['solid', 'Solid'], ['gradient', 'Linear'], ['radial', 'Radial']] }));
  if (st.bg !== 'none') {
    box.append(F({ k: 'style.bgColor', t: 'color', label: 'Color' }));
    if (st.bg === 'gradient' || st.bg === 'radial') box.append(F({ k: 'style.bgColor2', t: 'color', label: 'Color 2' }));
    if (st.bg === 'gradient') box.append(F({ k: 'style.bgAngle', t: 'range', label: 'Angle', min: 0, max: 360 }));
    box.append(F({ k: 'style.bgOpacity', t: 'range', label: 'Backdrop opacity', min: 0, max: 1, step: 0.01 }));
  }
  box.append(F({ k: 'style.radius', t: 'range', label: 'Corner radius', min: 0, max: 200 }),
    F({ k: 'style.padX', t: 'range', label: 'Padding X', min: 0, max: 160, half: true }), F({ k: 'style.padY', t: 'range', label: 'Padding Y', min: 0, max: 160, half: true }),
    F({ k: 'style.borderW', t: 'range', label: 'Border width', min: 0, max: 30, step: 0.5 }));
  if (st.borderW > 0) box.append(F({ k: 'style.borderColor', t: 'color', label: 'Border color' }),
    F({ k: 'style.borderStyle', t: 'seg', label: 'Border style', options: [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']] }),
    F({ k: 'style.borderSides', t: 'select', label: 'Border sides', options: [['all', 'All'], ['bottom', 'Bottom'], ['top', 'Top'], ['left', 'Left'], ['right', 'Right'], ['tb', 'Top + bottom'], ['lr', 'Left + right']] }));
  box.append(F({ k: 'style.shadow', t: 'toggle', label: 'Drop shadow / glow' }));
  if (st.shadow) box.append(F({ k: 'style.shadowColor', t: 'color', label: 'Shadow color' }), F({ k: 'style.shadowBlur', t: 'range', label: 'Blur', min: 0, max: 100 }), F({ k: 'style.shadowX', t: 'range', label: 'Offset X', min: -60, max: 60, half: true }), F({ k: 'style.shadowY', t: 'range', label: 'Offset Y', min: -60, max: 60, half: true }));
  return section('Backdrop, border & shadow', box, { key: 'backdrop' });
}
function animSec(els) {
  const F = (f) => field(f, els);
  const box = el('div',
    {},
    F({ k: 'anim.in', t: 'select', label: 'Entrance', options: ENTRANCES }),
    F({ k: 'anim.delay', t: 'range', label: 'Delay (s)', min: 0, max: 20, step: 0.05 }),
    F({ k: 'anim.dur', t: 'range', label: 'Duration (s)', min: 0.05, max: 5, step: 0.05 }),
    F({ k: 'anim.ease', t: 'select', label: 'Easing', options: Object.keys(EASE).map((k) => [k, k]) }),
    F({ k: 'anim.data', t: 'toggle', label: 'Animate data with run progress' }),
  );
  if (els.length > 1) box.append(row('Stagger', button('Stagger delays by 0.15s', () => { const s = [...els].sort((a, b) => a.y - b.y || a.x - b.x); const d0 = s[0].anim.delay || 0; s.forEach((e, i) => (e.anim.delay = Math.round((d0 + i * 0.15) * 100) / 100)); commit('Stagger'); scheduleRebuild(); }, 'small')));
  return section('Animation', box, { key: 'anim', open: false });
}

// ---------- Design gallery ----------
function designKeyOf(def, el0, env) {
  if (!def.schema) return null;
  for (const s of def.schema(el0, env)) for (const f of s.fields || []) if (['props.layout', 'props.design', 'props.line'].includes(f.k) && f.options) return f;
  return null;
}
const thumbCache = new Map();
function thumb(elx, env, w = 132, h = 84) {
  const c = document.createElement('canvas');
  const dpr = 2; c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px';
  const x = c.getContext('2d');
  const e = clone(elx); e.rot = 0; e.anim = { ...e.anim, in: 'none' }; e.opacity = 1;
  layoutElement(x, e, env);
  const b = boxOf(x, e, { ...env, layout: true });
  const k = Math.min((w - 12) / b.w, (h - 12) / b.h);
  e.x = 0; e.y = 0;
  x.scale(dpr, dpr);
  x.translate((w - b.w * k) / 2, (h - b.h * k) / 2); x.scale(k, k);
  drawElement(x, e, env);
  return c;
}
function designSec(els) {
  const e0 = els[0], def = REG[e0.type], env = makeEnv(App.doc);
  const box = el('div');
  const df = designKeyOf(def, e0, env);
  if (df && els.every((e) => e.type === e0.type)) {
    const g = el('div', { class: 'thumbs' });
    for (const [v, label] of df.options) {
      const t = clone(e0); setPath(t, df.k, v);
      const b = el('button', { type: 'button', class: 'thumb' + (getPath(e0, df.k) === v ? ' on' : ''), title: label }, thumb(t, env), el('span', {}, label));
      b.onclick = () => { apply(els, df.k, v, true, 'Design'); scheduleRebuild(); };
      g.append(b);
    }
    box.append(el('div', { class: 'sub' }, 'Layout / design'), g);
  }
  if (def.backdrop !== false) {
    const g = el('div', { class: 'thumbs' });
    for (const sk of SKINS) {
      const t = clone(e0); applySkin(t, sk.id);
      const b = el('button', { type: 'button', class: 'thumb' + (e0.style.skin === sk.id ? ' on' : ''), title: sk.name }, thumb(t, env), el('span', {}, sk.name));
      b.onclick = () => { for (const e of els) applySkin(e, sk.id); commit('Style'); scheduleRebuild(); };
      g.append(b);
    }
    box.append(el('div', { class: 'sub' }, 'Style'), g);
  }
  if (!box.children.length) return null;
  return section('Designs', box, { key: 'designs' });
}

// ---------- Build ----------
function build() {
  if (!root) return;
  const scroll = root.scrollTop;
  controls.length = 0;
  root.innerHTML = '';
  const els = selected();
  if (!els.length) { root.append(...canvasPanel()); root.scrollTop = scroll; return; }
  const env = makeEnv(App.doc);
  const sameType = els.every((e) => e.type === els[0].type);
  const def = REG[els[0].type];
  const head = el('div', { class: 'props-head' },
    els.length === 1 ? (() => { const i = textInput(els[0].name, (v, fin) => { els[0].name = v; selfChange = true; commit('Rename', fin ? 0 : 500); selfChange = false; emit('layers'); }); i.className = 'name-in'; return i; })() : el('b', {}, `${els.length} items selected`),
    el('span', { class: 'tag' }, sameType ? def.name : 'Mixed'),
  );
  root.append(head);
  if (App.tsel && els.length === 1 && App.tsel.id === els[0].id) { const ts = textSelSec(els[0], env); if (ts) root.append(ts); }
  else if (els.length === 1) root.append(el('div', { class: 'help tip' }, 'Tip: tap any text in the selected widget to edit just that text. Tap it again (or double-click) to type.'));
  root.append(el('div', { class: 'btnrow quick' },
    button('Duplicate', () => duplicateSelected(), 'small'), button('Delete', () => deleteSelected(), 'small danger'),
    els.length > 1 && !els.every((e) => e.group && e.group === els[0].group) ? button('Group', groupSel, 'small') : null,
    els.some((e) => e.group) ? button('Ungroup', ungroupSel, 'small') : null,
    button(els.every((e) => e.locked) ? 'Unlock' : 'Lock', () => { const l = !els.every((e) => e.locked); els.forEach((e) => (e.locked = l)); commit(l ? 'Lock' : 'Unlock'); build(); }, 'small'),
  ));
  const ds = designSec(els); if (ds) root.append(ds);
  if (sameType && def.schema) {
    for (const s of def.schema(els[0], env)) {
      if (s.ts) { root.append(section(s.title, tsFields(s.ts, els), { key: def.type + s.title, open: false })); continue; }
      const box = el('div');
      for (const f of s.fields) { if (f.when && !f.when(els[0])) continue; box.append(field(f, els)); }
      root.append(section(s.title, box, { key: def.type + s.title }));
    }
  }
  const nTS = countTS(els);
  if (nTS > 1 || (!sameType && nTS)) root.append(section(els.length > 1 ? 'All text in selection' : 'All text in this widget', tsFields(null, els, true), { key: 'alltext', open: !sameType }));
  if (els.every((e) => REG[e.type].backdrop !== false)) root.append(backdropSec(els));
  root.append(transformSec(els));
  root.append(animSec(els));
  root.scrollTop = scroll;
}

// ---------- Canvas panel ----------
function canvasPanel() {
  const d = App.doc, out = [];
  const set = (path, v, fin, rebuild) => { setPath(d, path, clone(v)); selfChange = true; commit('Canvas', fin ? 0 : 400); selfChange = false; if (rebuild && fin) scheduleRebuild(); };
  const C = (path, ctl) => { controls.push({ ctl, get: () => getPath(d, path) }); return ctl; };
  out.push(el('div', { class: 'props-head' }, el('b', {}, 'Canvas'), el('span', { class: 'tag' }, `${d.w} × ${d.h}`)));
  const size = el('div');
  const cur = SIZES.find((s) => s[2] === d.w && s[3] === d.h);
  size.append(row('Format', select(cur ? cur[0] : 'custom', [...SIZES.map((s) => [s[0], `${s[1]} (${s[2]}×${s[3]})`]), ['custom', 'Custom']], (v) => { const s = SIZES.find((x) => x[0] === v); if (s) resizeDoc(s[2], s[3]); })));
  size.append(row('Width', numInput(d.w, (v, fin) => fin && resizeDoc(Math.round(v), d.h), { min: 100, max: 8000 }), { half: true }), row('Height', numInput(d.h, (v, fin) => fin && resizeDoc(d.w, Math.round(v)), { min: 100, max: 8000 }), { half: true }));
  size.append(row('', el('div', { class: 'help' }, 'Resizing the canvas scales all elements to fit.')));
  out.push(section('Size', size, { key: 'c-size' }));
  // background
  const bg = el('div'), b = d.bg;
  bg.append(row('Type', C('bg.type', seg(b.type, [['transparent', 'Transparent'], ['solid', 'Solid'], ['gradient', 'Gradient'], ['image', 'Image']], (v, f) => set('bg.type', v, f, true)))));
  if (b.type === 'solid' || b.type === 'gradient') bg.append(row('Color', C('bg.color', colorInput(b.color, (v, f) => set('bg.color', v, f)))));
  if (b.type === 'gradient') bg.append(row('Color 2', C('bg.color2', colorInput(b.color2, (v, f) => set('bg.color2', v, f)))), row('Kind', seg(b.kind || 'linear', [['linear', 'Linear'], ['radial', 'Radial']], (v, f) => set('bg.kind', v, f, true))), row('Angle', C('bg.angle', range(b.angle, (v, f) => set('bg.angle', v, f), { min: 0, max: 360 }))));
  if (b.type === 'image') {
    bg.append(row('Image', imagePicker(b.image, (id) => set('bg.image', id, true, true))));
    bg.append(row('Fit', seg(b.fit, [['cover', 'Fill'], ['contain', 'Fit']], (v, f) => set('bg.fit', v, f))),
      row('Zoom', C('bg.zoom', range(b.zoom, (v, f) => set('bg.zoom', v, f), { min: 0.3, max: 4, step: 0.01 }))),
      row('Offset X', C('bg.ox', range(b.ox, (v, f) => set('bg.ox', v, f), { min: -1, max: 1, step: 0.01 })), { half: true }), row('Offset Y', C('bg.oy', range(b.oy, (v, f) => set('bg.oy', v, f), { min: -1, max: 1, step: 0.01 })), { half: true }),
      row('Darken', C('bg.dim', range(b.dim, (v, f) => set('bg.dim', v, f), { min: 0, max: 1, step: 0.01 }))),
      row('Darken style', seg(b.dimMode, [['all', 'Even'], ['bottom', 'Bottom fade']], (v, f) => set('bg.dimMode', v, f))),
      row('Blur', C('bg.blur', range(b.blur, (v, f) => set('bg.blur', v, f), { min: 0, max: 40 }))),
      row('Brightness', C('bg.brightness', range(b.brightness ?? 1, (v, f) => set('bg.brightness', v, f), { min: 0.2, max: 2, step: 0.02 }))),
      row('Saturation', C('bg.saturate', range(b.saturate ?? 1, (v, f) => set('bg.saturate', v, f), { min: 0, max: 2, step: 0.02 }))));
  }
  bg.append(el('div', { class: 'help' }, 'Exports use this background. Pick Transparent to export a PNG/WebM you can place over your own photo or video.'));
  out.push(section('Background', bg, { key: 'c-bg' }));
  // theme
  const th = el('div');
  th.append(el('div', { class: 'theme-row' }, THEMES.map((t) => { const bt = el('button', { type: 'button', class: 'theme-chip', title: t.name, style: { background: `linear-gradient(135deg, ${t.accent} 50%, ${t.accent2} 50%)`, color: t.text } }, t.name); bt.onclick = () => { Object.assign(d.theme, { text: t.text, muted: t.muted, accent: t.accent, accent2: t.accent2 }); commit('Theme'); scheduleRebuild(); }; return bt; })));
  for (const [k, l] of [['text', 'Text'], ['muted', 'Muted text'], ['accent', 'Accent'], ['accent2', 'Accent 2']]) th.append(row(l, C('theme.' + k, colorInput(d.theme[k], (v, f) => { if (v[0] === '@') return; set('theme.' + k, v, f); }))));
  th.append(el('div', { class: 'help' }, 'Colors set to a theme swatch follow these colors everywhere.'));
  out.push(section('Theme colors', th, { key: 'c-theme' }));
  // global text
  const gt = el('div');
  gt.append(el('div', { class: 'help' }, 'Edit all text on the canvas at once.'));
  gt.append(tsFields(null, d.elements, true));
  if (d.elements.length) out.push(section('All text on canvas', gt, { key: 'c-text', open: false }));
  // grid
  const gr = el('div');
  gr.append(row('Show grid', C('grid.show', toggle(d.grid.show, (v) => set('grid.show', v, true))), { half: true }), row('Snap to grid', C('grid.snap', toggle(d.grid.snap, (v) => set('grid.snap', v, true))), { half: true }),
    row('Grid size', C('grid.size', range(d.grid.size, (v, f) => set('grid.size', Math.max(2, v), f), { min: 4, max: 240 }))),
    row('Smart guides', C('grid.guides', toggle(d.grid.guides !== false, (v) => set('grid.guides', v, true)))));
  out.push(section('Grid & snapping', gr, { key: 'c-grid' }));
  // video
  const vd = el('div');
  vd.append(row('Intro (s)', C('video.intro', range(d.video.intro, (v, f) => set('video.intro', v, f), { min: 0, max: 10, step: 0.1 }))),
    row('Run playback (s)', C('video.duration', range(d.video.duration, (v, f) => set('video.duration', Math.max(1, v), f), { min: 1, max: 60, step: 0.5 }))),
    row('Hold at end (s)', C('video.hold', range(d.video.hold, (v, f) => set('video.hold', v, f), { min: 0, max: 20, step: 0.1 }))),
    row('Frame rate', select(String(d.video.fps), [['24', '24 fps'], ['30', '30 fps'], ['60', '60 fps']], (v) => set('video.fps', +v, true))),
    row('Progress follows', seg(d.video.by, [['time', 'Time'], ['distance', 'Distance']], (v) => set('video.by', v, true))),
    el('div', { class: 'help' }, () => ''));
  vd.lastChild.textContent = `Total video length: ${videoLength(d).toFixed(1)} s. Elements fade in during the intro, data counts up during playback, then the final frame holds.`;
  out.push(section('Video timing', vd, { key: 'c-video', open: false }));
  return out;
}
export function resizeDoc(w, h) {
  const d = App.doc;
  const k = Math.min(w / d.w, h / d.h);
  const ox = (w - d.w * k) / 2, oy = (h - d.h * k) / 2;
  for (const e of [...d.elements, ...d.trash.map((t) => t.el)]) { e.x = e.x * k + ox; e.y = e.y * k + oy; e.w *= k; e.h *= k; e.s = (e.s || 1) * k; }
  d.w = w; d.h = h;
  commit('Canvas size'); fitZoom(); scheduleRebuild();
}
export { build as buildPanel };
