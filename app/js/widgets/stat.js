// Stat widgets: single value with many layouts; grid of stats.
import { register, stateOf } from './core.js';
import { TS, textBox, drawText, drawIcon, rrect, col, measureStr, applyTransform, luma } from '../render/draw.js';
import { metricsFor } from './metrics.js';

export const STAT_LAYOUTS = [
  ['classic', 'Classic'], ['reverse', 'Value first'], ['inline', 'Inline'], ['valueOnly', 'Value only'],
  ['iconLeft', 'Icon left'], ['iconTop', 'Icon top'], ['iconInline', 'Icon inline'], ['stackUnit', 'Stacked unit'],
  ['ticker', 'Ticker'], ['tag', 'Tag'], ['ring', 'Ring'], ['lcd', 'Digital'], ['vlabel', 'Side label'],
  ['underline', 'Underline'], ['badge', 'Badge'], ['split', 'Divider'], ['bigSmall', 'Big + caption'],
];

// Builds a layout for one stat. Returns {w, h, ops}
export function statBlock(ctx, parts, o, env) {
  const ops = [];
  const lay = o.layout || 'classic';
  const align = o.align || 'left';
  const gap = o.gap ?? 8;
  const vts = o.valueTS, lts = o.labelTS, uts = o.unitTS;
  const showL = o.showLabel !== false && parts.label, showU = o.showUnit !== false && parts.unit;
  const V = textBox(ctx, parts.value, vts);
  const U = showU ? textBox(ctx, parts.unit, uts) : null;
  const L = showL ? textBox(ctx, parts.label, lts) : null;
  const ug = U ? Math.max(4, vts.size * 0.12) : 0;
  const unitTop = o.unitPos === 'top';
  // value row
  const VR = { w: V.w + (U ? ug + U.w : 0), asc: V.asc, desc: Math.max(V.desc, U ? (unitTop ? 0 : U.desc) : 0) };
  VR.h = VR.asc + VR.desc;
  const putVR = (x, top) => {
    const base = top + VR.asc;
    ops.push({ k: 't', s: parts.value, x, y: base, ts: vts });
    if (U) ops.push({ k: 't', s: parts.unit, x: x + V.w + ug, y: unitTop ? top + U.asc : base, ts: uts });
  };
  const putL = (x, top) => { if (L) ops.push({ k: 't', s: parts.label, x, y: top + L.asc, ts: lts }); };
  const ax = (W, w) => (align === 'center' ? (W - w) / 2 : align === 'right' ? W - w : 0);
  const iconName = parts.icon;
  const iconCol = o.iconColor || '@accent';
  const accent = o.accent || '@accent';
  const chipText = !o.chipText || o.chipText === 'auto' ? (luma(col(accent, env)) > 0.55 ? '#0d0f14' : '#ffffff') : o.chipText;
  let w = 0, h = 0;
  const stack = (rows, x0 = 0, y0 = 0, Wf) => { // rows: [{w,h,put}]
    const W = Wf ?? Math.max(...rows.map((r) => r.w));
    let y = y0;
    rows.forEach((r, i) => { r.put(x0 + ax(W, r.w), y); y += r.h + (i < rows.length - 1 ? gap : 0); });
    return { w: W, h: y - y0 };
  };
  const rowVR = { w: VR.w, h: VR.h, put: putVR };
  const rowL = L ? { w: L.w, h: L.h, put: putL } : null;
  switch (lay) {
    case 'reverse': { const r = stack([rowVR, rowL].filter(Boolean)); w = r.w; h = r.h; break; }
    case 'inline': {
      const g = L ? gap * 2 : 0;
      const asc = Math.max(VR.asc, L ? L.asc : 0);
      if (L) ops.push({ k: 't', s: parts.label, x: 0, y: asc, ts: lts });
      putVR((L ? L.w : 0) + g, asc - VR.asc);
      w = (L ? L.w : 0) + g + VR.w; h = asc + Math.max(VR.desc, L ? L.desc : 0); break;
    }
    case 'valueOnly': putVR(0, 0); w = VR.w; h = VR.h; break;
    case 'iconLeft': case 'iconTop': case 'iconInline': {
      if (lay === 'iconInline') {
        const isz = VR.asc * (o.iconScale || 1) * 1.05;
        if (iconName) ops.push({ k: 'i', n: iconName, x: 0, y: VR.asc - isz, s: isz, c: iconCol });
        const ix = iconName ? isz + gap * 1.5 : 0;
        putVR(ix, 0); w = ix + VR.w; h = Math.max(VR.h, isz); break;
      }
      if (lay === 'iconTop') {
        const isz = vts.size * 0.6 * (o.iconScale || 1);
        const rows = [];
        if (iconName) rows.push({ w: isz, h: isz, put: (x, y) => ops.push({ k: 'i', n: iconName, x, y, s: isz, c: iconCol }) });
        rows.push(rowVR); if (rowL) rows.push(rowL);
        const r = stack(rows); w = r.w; h = r.h; break;
      }
      const inner = [rowL, rowVR].filter(Boolean);
      const ih = inner.reduce((a, r) => a + r.h, 0) + (inner.length - 1) * gap;
      const isz = ih * 0.9 * (o.iconScale || 1);
      const ix = iconName ? isz + gap * 2 : 0;
      if (iconName) ops.push({ k: 'i', n: iconName, x: 0, y: (ih - isz) / 2, s: isz, c: iconCol });
      const W = Math.max(...inner.map((r) => r.w));
      let y = 0; inner.forEach((r) => { r.put(ix + (align === 'right' ? W - r.w : align === 'center' ? (W - r.w) / 2 : 0), y); y += r.h + gap; });
      w = ix + W; h = Math.max(ih, isz); break;
    }
    case 'stackUnit': {
      putVR2(); break;
      function putVR2() {
        ops.push({ k: 't', s: parts.value, x: 0, y: V.asc, ts: vts });
        const cx = V.w + gap * 1.5;
        let cw = 0;
        if (U) { ops.push({ k: 't', s: parts.unit, x: cx, y: U.asc, ts: uts }); cw = U.w; }
        if (L) { ops.push({ k: 't', s: parts.label, x: cx, y: V.asc, ts: lts }); cw = Math.max(cw, L.w); }
        w = V.w + (cw ? gap * 1.5 + cw : 0); h = V.h;
      }
    }
    case 'ticker': {
      const ip = Math.max(8, (lts?.size || 20) * 0.45);
      const hh = Math.max(L ? L.asc : 0, VR.asc) + ip * 2;
      let x = 0;
      if (L) { ops.push({ k: 'r', x: 0, y: 0, w: L.w + ip * 2, h: hh, r: o.chipRadius ?? 6, c: accent }); ops.push({ k: 't', s: parts.label, x: ip, y: hh / 2 + L.asc / 2, ts: { ...lts, color: chipText } }); x = L.w + ip * 2; }
      ops.push({ k: 'r', x, y: 0, w: VR.w + ip * 2, h: hh, r: o.chipRadius ?? 6, c: o.chipBg || '#000000aa' });
      putVR(x + ip, hh / 2 - VR.asc / 2);
      w = x + VR.w + ip * 2; h = hh; break;
    }
    case 'tag': {
      const ip = Math.max(6, (lts?.size || 20) * 0.4);
      const rows = [];
      if (L) rows.push({ w: L.w + ip * 2, h: L.asc + ip * 1.6, put: (x, y) => { ops.push({ k: 'r', x, y, w: L.w + ip * 2, h: L.asc + ip * 1.6, r: o.chipRadius ?? 999, c: accent }); ops.push({ k: 't', s: parts.label, x: x + ip, y: y + ip * 0.8 + L.asc, ts: { ...lts, color: chipText } }); } });
      rows.push(rowVR);
      const r = stack(rows); w = r.w; h = r.h; break;
    }
    case 'ring': case 'badge': {
      const inner = lay === 'ring' ? [rowVR, rowL].filter(Boolean) : [rowVR];
      const ih = inner.reduce((a, r) => a + r.h, 0) + (inner.length - 1) * gap;
      const iw = Math.max(...inner.map((r) => r.w));
      const D = Math.max(iw * 1.18, ih * 1.6) + 16;
      const lw = o.ringWidth ?? Math.max(4, D * 0.035);
      if (lay === 'ring') ops.push({ k: 'c', cx: D / 2, cy: D / 2, r: D / 2 - lw / 2, lw, c: accent, p: o.ringProgress ?? 1 });
      else ops.push({ k: 'cf', cx: D / 2, cy: D / 2, r: D / 2, c: accent });
      let y = (D - ih) / 2;
      inner.forEach((r) => { r.put((D - r.w) / 2, y); y += r.h + gap; });
      w = D; h = D;
      if (lay === 'badge' && L) { ops.push({ k: 't', s: parts.label, x: D / 2 - L.w / 2, y: D + gap + L.asc, ts: lts }); w = Math.max(D, L.w); if (L.w > D) ops.forEach((op) => { if (op.k !== 't' || op.s !== parts.label) { if ('x' in op) op.x += (L.w - D) / 2; if ('cx' in op) op.cx += (L.w - D) / 2; } else op.x = 0; }); h = D + gap + L.h; }
      break;
    }
    case 'lcd': {
      const ghost = String(applyTransform(parts.value, vts)).replace(/[0-9]/g, '8');
      const rows = [];
      if (rowL) rows.push(rowL);
      rows.push({ w: VR.w, h: VR.h, put: (x, y) => { ops.push({ k: 't', s: ghost, x, y: y + VR.asc, ts: { ...vts, opacity: 0.12, shadow: false, stroke: 0 } }); putVR(x, y); } });
      const r = stack(rows); w = r.w; h = r.h; break;
    }
    case 'vlabel': {
      if (L) ops.push({ k: 'vt', s: parts.label, x: L.asc, y: VR.h / 2, ts: lts, w: L.w });
      const lx = L ? L.asc + gap * 1.5 : 0;
      putVR(lx, 0); w = lx + VR.w; h = Math.max(VR.h, L ? Math.min(L.w, VR.h) : 0); break;
    }
    case 'underline': {
      const lh = Math.max(3, vts.size * 0.06);
      const rows = [rowVR, { w: VR.w, h: lh, put: (x, y) => ops.push({ k: 'r', x, y, w: VR.w, h: lh, r: lh / 2, c: accent }) }];
      if (rowL) rows.push(rowL);
      const r = stack(rows); w = r.w; h = r.h; break;
    }
    case 'split': {
      const asc = Math.max(VR.asc, L ? L.asc : 0);
      let x = 0;
      if (L) { ops.push({ k: 't', s: parts.label, x: 0, y: asc / 2 + L.asc / 2, ts: lts }); x = L.w + gap * 2; ops.push({ k: 'r', x, y: 0, w: Math.max(2, vts.size * 0.04), h: asc, r: 2, c: accent }); x += gap * 2 + Math.max(2, vts.size * 0.04); }
      putVR(x, asc - VR.asc); w = x + VR.w; h = asc + VR.desc; break;
    }
    case 'bigSmall': {
      const cap = [U ? parts.unit : '', L ? parts.label : ''].filter(Boolean).join(o.sep ?? '  ·  ');
      ops.push({ k: 't', s: parts.value, x: 0, y: V.asc, ts: vts });
      const C = cap ? textBox(ctx, cap, lts) : null;
      const W = Math.max(V.w, C ? C.w : 0);
      ops[ops.length - 1].x = ax(W, V.w);
      if (C) ops.push({ k: 't', s: cap, x: ax(W, C.w), y: V.h + gap + C.asc, ts: lts });
      w = W; h = V.h + (C ? gap + C.h : 0); break;
    }
    default: { const r = stack([rowL, rowVR].filter(Boolean)); w = r.w; h = r.h; }
  }
  return { w: Math.max(1, w), h: Math.max(1, h), ops };
}

export function drawOps(ctx, ops, ox, oy, env) {
  for (const op of ops) {
    switch (op.k) {
      case 't': drawText(ctx, op.s, ox + op.x, oy + op.y, op.ts, env); break;
      case 'i': drawIcon(ctx, op.n, ox + op.x, oy + op.y, op.s, col(op.c, env), { stroke: op.sw || 2 }); break;
      case 'r': ctx.save(); ctx.fillStyle = col(op.c, env); rrect(ctx, ox + op.x, oy + op.y, op.w, op.h, op.r >= 999 ? op.h / 2 : op.r); ctx.fill(); ctx.restore(); break;
      case 'c': ctx.save(); ctx.strokeStyle = col(op.c, env); ctx.lineWidth = op.lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ox + op.cx, oy + op.cy, op.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (op.p ?? 1)); ctx.stroke(); ctx.restore(); break;
      case 'cf': ctx.save(); ctx.fillStyle = col(op.c, env); ctx.beginPath(); ctx.arc(ox + op.cx, oy + op.cy, op.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); break;
      case 'vt': ctx.save(); ctx.translate(ox + op.x, oy + op.y); ctx.rotate(-Math.PI / 2); drawText(ctx, op.s, 0, 0, op.ts, env, 'center'); ctx.restore(); break;
    }
  }
}

export function statTextStyles(o = {}) {
  return {
    valueTS: TS({ font: 'Oswald', weight: 700, size: 96, ...(o.value || {}) }),
    labelTS: TS({ font: 'Inter', weight: 700, size: 24, role: 'muted', transform: 'upper', spacing: 2, ...(o.label || {}) }),
    unitTS: TS({ font: 'Oswald', weight: 400, size: 40, role: 'muted', ...(o.unit || {}) }),
  };
}

export function statParts(el, env) {
  const M = metricsFor(env.mode)[el.props.metric] || Object.values(metricsFor(env.mode))[0];
  const st = stateOf(el, env);
  const p = el.props;
  let value = st ? M.value(st, env, el) : '--';
  if (p.prefix) value = p.prefix + value;
  if (p.suffix) value = value + p.suffix;
  return { label: p.label || M.label, value, unit: p.unit || M.unit(env.units), icon: p.icon || M.icon };
}
export function statOpts(el) {
  const p = el.props;
  return { layout: p.layout, align: p.align, gap: p.gap, valueTS: p.valueTS, labelTS: p.labelTS, unitTS: p.unitTS, showLabel: p.showLabel, showUnit: p.showUnit, iconColor: p.iconColor, iconScale: p.iconScale, accent: p.accent, unitPos: p.unitPos, chipText: p.chipText, chipBg: p.chipBg, ringWidth: p.ringWidth };
}

const LAYOUT_FIELD = { k: 'props.layout', t: 'select', label: 'Layout', options: STAT_LAYOUTS };
const ALIGN_FIELD = { k: 'props.align', t: 'seg', label: 'Align', options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] };

register({
  type: 'stat', name: 'Stat', auto: true, modes: ['single', 'multi'],
  props: () => ({
    metric: 'distance', label: '', unit: '', prefix: '', suffix: '', layout: 'classic', align: 'left', gap: 6,
    showLabel: true, showUnit: true, icon: '', iconScale: 1, iconColor: '@accent', accent: '@accent', unitPos: 'baseline',
    decimals: 2, timeStyle: 'auto', dateStyle: 'medium', chipText: 'auto', chipBg: '#000000aa', ringWidth: 6, ...statTextStyles(),
  }),
  measure(ctx, el, env) { const b = statBlock(ctx, statParts(el, env), statOpts(el), env); return { w: b.w, h: b.h }; },
  render(ctx, el, W, H, env) { const b = statBlock(ctx, statParts(el, env), statOpts(el), env); drawOps(ctx, b.ops, 0, 0, env); },
  layouts: STAT_LAYOUTS,
  schema: (el, env) => [
    { title: 'Data', fields: [
      { k: 'props.metric', t: 'select', label: 'Metric', options: Object.entries(metricsFor(env.mode)).map(([k, m]) => [k, m.label + (m.live ? ' (live)' : '')]) },
      { k: 'props.label', t: 'text', label: 'Label text', placeholder: 'auto' },
      { k: 'props.unit', t: 'text', label: 'Unit text', placeholder: 'auto' },
      { k: 'props.prefix', t: 'text', label: 'Prefix', half: true }, { k: 'props.suffix', t: 'text', label: 'Suffix', half: true },
      { k: 'props.decimals', t: 'num', label: 'Decimals', min: 0, max: 3, when: (e) => /distance|longest|avgDist/.test(e.props.metric) },
      { k: 'props.timeStyle', t: 'select', label: 'Time format', options: [['auto', 'Auto'], ['hms', 'h:mm:ss'], ['ms', 'mm:ss'], ['words', '1h 05m'], ['hm', '1h 5m']], when: (e) => /time|elapsed/i.test(e.props.metric) },
      { k: 'props.dateStyle', t: 'select', label: 'Date format', options: DATE_STYLES, when: (e) => /date|range/.test(e.props.metric) },
    ] },
    { title: 'Layout', fields: [LAYOUT_FIELD, ALIGN_FIELD, { k: 'props.gap', t: 'range', label: 'Spacing', min: 0, max: 60 },
      { k: 'props.showLabel', t: 'toggle', label: 'Show label', half: true }, { k: 'props.showUnit', t: 'toggle', label: 'Show unit', half: true },
      { k: 'props.unitPos', t: 'seg', label: 'Unit position', options: [['baseline', 'Baseline'], ['top', 'Superscript']] },
      { k: 'props.icon', t: 'icon', label: 'Icon', when: (e) => /icon/i.test(e.props.layout) },
      { k: 'props.iconColor', t: 'color', label: 'Icon color', when: (e) => /icon/i.test(e.props.layout) },
      { k: 'props.iconScale', t: 'range', label: 'Icon size', min: 0.3, max: 2.5, step: 0.05, when: (e) => /icon/i.test(e.props.layout) },
      { k: 'props.accent', t: 'color', label: 'Accent color', when: (e) => /ticker|tag|ring|underline|badge|split/.test(e.props.layout) },
      { k: 'props.chipText', t: 'color', label: 'Chip text', when: (e) => /ticker|tag/.test(e.props.layout) },
      { k: 'props.chipBg', t: 'color', label: 'Value chip bg', when: (e) => /ticker/.test(e.props.layout) },
      { k: 'props.ringWidth', t: 'range', label: 'Ring width', min: 1, max: 30, when: (e) => e.props.layout === 'ring' },
    ] },
    { title: 'Value text', ts: 'props.valueTS' }, { title: 'Label text', ts: 'props.labelTS' }, { title: 'Unit text', ts: 'props.unitTS' },
  ],
});
export const DATE_STYLES = [['medium', '18 Oct 2026'], ['short', '18 Oct'], ['long', 'Sunday, 18 October 2026'], ['us', 'Oct 18, 2026'], ['numeric', '18/10/2026'], ['iso', '2026-10-18'], ['weekday', 'Sunday']];

// ---------- Stat grid ----------
const DEFAULT_ITEMS_SINGLE = ['distance', 'time', 'avgPace', 'avgHr', 'ascent', 'calories', 'avgCad', 'maxHr'];
const DEFAULT_ITEMS_MULTI = ['distance', 'time', 'runs', 'avgPace', 'avgHr', 'ascent', 'longest', 'calories'];
register({
  type: 'statgrid', name: 'Stat grid', auto: true, modes: ['single', 'multi'],
  props: (env) => {
    const ids = env && env.mode === 'multi' ? DEFAULT_ITEMS_MULTI : DEFAULT_ITEMS_SINGLE;
    return {
      items: ids.map((m, i) => ({ m, on: i < 4, label: '' })), cols: 2, layout: 'classic', align: 'left', gap: 4, cellGapX: 56, cellGapY: 36,
      dividers: false, dividerColor: '#ffffff33', showLabel: true, showUnit: true, iconColor: '@accent', iconScale: 1, accent: '@accent', decimals: 2, timeStyle: 'auto', unitPos: 'baseline',
      cellBg: false, cellBgColor: '#00000066', cellRadius: 16, cellPad: 18, ...statTextStyles({ value: { size: 72 }, unit: { size: 30 }, label: { size: 20 } }),
    };
  },
  measure(ctx, el, env) { return gridLayout(ctx, el, env).size; },
  render(ctx, el, W, H, env) {
    const g = gridLayout(ctx, el, env), p = el.props;
    g.cells.forEach((c) => {
      if (p.cellBg) { ctx.save(); ctx.fillStyle = col(p.cellBgColor, env); rrect(ctx, c.x, c.y, g.cw, g.ch, p.cellRadius); ctx.fill(); ctx.restore(); }
      const pad = p.cellBg ? p.cellPad : 0;
      const ix = p.align === 'center' ? (g.cw - 2 * pad - c.b.w) / 2 : p.align === 'right' ? g.cw - 2 * pad - c.b.w : 0;
      drawOps(ctx, c.b.ops, c.x + pad + ix, c.y + pad, env);
    });
    if (p.dividers) {
      ctx.save(); ctx.strokeStyle = col(p.dividerColor, env); ctx.lineWidth = 2;
      for (let i = 1; i < g.cols; i++) { const x = i * (g.cw + p.cellGapX) - p.cellGapX / 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, g.size.h); ctx.stroke(); }
      for (let r = 1; r < g.rows; r++) { const y = r * (g.ch + p.cellGapY) - p.cellGapY / 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.size.w, y); ctx.stroke(); }
      ctx.restore();
    }
  },
  schema: (el, env) => [
    { title: 'Stats shown', fields: [{ k: 'props.items', t: 'items', label: 'Enable, rename and reorder', metrics: metricsFor(env.mode) }] },
    { title: 'Grid', fields: [{ k: 'props.cols', t: 'range', label: 'Columns', min: 1, max: 6 }, { k: 'props.cellGapX', t: 'range', label: 'Column gap', min: 0, max: 200 }, { k: 'props.cellGapY', t: 'range', label: 'Row gap', min: 0, max: 200 },
      { k: 'props.dividers', t: 'toggle', label: 'Dividers' }, { k: 'props.dividerColor', t: 'color', label: 'Divider color', when: (e) => e.props.dividers },
      { k: 'props.cellBg', t: 'toggle', label: 'Cell backgrounds' }, { k: 'props.cellBgColor', t: 'color', label: 'Cell color', when: (e) => e.props.cellBg }, { k: 'props.cellRadius', t: 'range', label: 'Cell radius', min: 0, max: 60, when: (e) => e.props.cellBg }, { k: 'props.cellPad', t: 'range', label: 'Cell padding', min: 0, max: 60, when: (e) => e.props.cellBg }] },
    { title: 'Cell layout', fields: [LAYOUT_FIELD, ALIGN_FIELD, { k: 'props.gap', t: 'range', label: 'Label spacing', min: 0, max: 40 },
      { k: 'props.showLabel', t: 'toggle', label: 'Labels', half: true }, { k: 'props.showUnit', t: 'toggle', label: 'Units', half: true },
      { k: 'props.iconColor', t: 'color', label: 'Icon color', when: (e) => /icon/i.test(e.props.layout) }, { k: 'props.accent', t: 'color', label: 'Accent' }, { k: 'props.decimals', t: 'num', label: 'Distance decimals', min: 0, max: 3 }] },
    { title: 'Value text', ts: 'props.valueTS' }, { title: 'Label text', ts: 'props.labelTS' }, { title: 'Unit text', ts: 'props.unitTS' },
  ],
});
function gridLayout(ctx, el, env) {
  const p = el.props, M = metricsFor(env.mode), st = stateOf(el, env);
  const items = p.items.filter((i) => i.on && M[i.m]);
  const o = statOpts(el);
  const blocks = items.map((i) => {
    const m = M[i.m];
    return statBlock(ctx, { label: i.label || m.label, value: st ? m.value(st, env, el) : '--', unit: m.unit(env.units), icon: m.icon }, o, env);
  });
  const cols = Math.max(1, Math.min(p.cols, blocks.length || 1)), rows = Math.ceil(blocks.length / cols) || 1;
  const pad = p.cellBg ? p.cellPad * 2 : 0;
  const cw = Math.max(1, ...blocks.map((b) => b.w)) + pad, ch = Math.max(1, ...blocks.map((b) => b.h)) + pad;
  const cells = blocks.map((b, i) => ({ b, x: (i % cols) * (cw + p.cellGapX), y: Math.floor(i / cols) * (ch + p.cellGapY) }));
  return { cells, cw, ch, cols, rows, size: { w: cols * cw + (cols - 1) * p.cellGapX, h: rows * ch + (rows - 1) * p.cellGapY } };
}
export { measureStr };
