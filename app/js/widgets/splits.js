// Split/lap widgets, best efforts, HR zones, progress and gauge.
import { register, progOf, stateOf } from './core.js';
import { TS, drawText, textBox, col, rrect, drawIcon, measureStr } from '../render/draw.js';
import { tableProps, tableLayout, drawTable, TABLE_SCHEMA } from './table.js';
import { getSplits, bestEfforts, hrZones } from '../data/activity.js';
import { fmtPace, fmtDuration, fmtDist, fmtInt, fmtElev, isNum, clamp, distUnit, paceUnit, unitLen, EASE } from '../util.js';
import { splitCfgOf } from './metrics.js';
import { statBlock, drawOps, statTextStyles, STAT_LAYOUTS } from './stat.js';
import { ZONE_COLORS, fmtMetric, metricUnit } from './graph.js';

export const SPLIT_COLS = [['idx', '#'], ['dist', 'Distance'], ['time', 'Time'], ['pace', 'Pace'], ['bar', 'Pace bar'], ['hr', 'Avg HR'], ['maxhr', 'Max HR'], ['elev', 'Elev'], ['cad', 'Cadence'], ['cum', 'Total time']];

function splitHeaderIdx(cfg, units) { return cfg.mode === 'laps' ? 'Lap' : cfg.mode === 'time' ? '#' : distUnit(units).toUpperCase(); }
function splitRows(el, env) {
  const p = el.props, act = env.act;
  const cfg = splitCfgOf(el, env);
  const sp = getSplits(act, cfg);
  const P = progOf(el, env), st = stateOf(el, env);
  const speeds = sp.filter((s) => !s.partial).map((s) => s.speed).filter(isNum);
  const sMax = Math.max(...speeds, 0.1), sMin = Math.min(...speeds, sMax);
  const win = Math.max(1, act.moving * 0.025);
  const rows = [];
  let cum = 0;
  for (const s of sp) {
    cum += s.time;
    if (s.partial && !p.showPartial) continue;
    let alpha = 1, live = false;
    if (P < 1) {
      if (st.tt < s.startT) break;
      if (st.tt < s.endT) { if (!p.liveRow) break; live = true; }
      else alpha = EASE.outCubic(clamp((st.tt - s.endT) / win, 0, 1));
    }
    let cur = s;
    if (live) { cur = { ...s, distance: st.d - s.startD, time: st.tt - s.startT }; cur.pace = cur.distance > 0 ? cur.time / (cur.distance / 1000) : NaN; cur.speed = cur.time > 0 ? cur.distance / cur.time : 0; }
    const cells = {
      idx: s.partial ? fmtDist(s.distance, env.units, 2) : (p.idxPrefix || '') + s.index,
      dist: fmtDist(cur.distance, env.units, 2), time: fmtDuration(cur.time), pace: fmtPace(cur.pace, env.units),
      hr: fmtInt(cur.avgHr), maxhr: fmtInt(cur.maxHr), cad: fmtInt(cur.avgCad), cum: fmtDuration(cum),
      elev: isNum(s.eleEnd) && isNum(s.eleStart) ? ((s.eleEnd - s.eleStart >= 0 ? '+' : '') + fmtElev(s.eleEnd - s.eleStart, env.units)) : '--',
    };
    rows.push({ cells, bar: isNum(cur.speed) ? 0.25 + 0.75 * clamp((cur.speed - sMin * 0.9) / Math.max(0.01, sMax - sMin * 0.9), 0, 1) : 0, hl: live ? null : s.fastest ? 'fast' : s.slowest ? 'slow' : null, alpha: live ? 1 : alpha, dim: live });
  }
  return { rows, cfg };
}
function splitCols(el, env, cfg) {
  const p = el.props;
  const labels = { idx: splitHeaderIdx(cfg, env.units), dist: 'Dist', time: 'Time', pace: 'Pace', bar: '', hr: 'HR', maxhr: 'Max', elev: 'Elev', cad: 'Cad', cum: 'Total' };
  return p.columns.filter((c) => c.on).map((c) => ({ key: c.k, label: c.label || labels[c.k], align: c.k === 'idx' ? 'left' : 'right', bar: c.k === 'bar', chip: c.k === 'pace', ts: c.k === 'idx' ? p.idxTS : undefined }));
}
register({
  type: 'splits', name: 'Splits table', auto: true, modes: ['single'],
  props: () => tableProps({
    splits: { mode: 'km', every: 1, custom: '' }, showPartial: true, liveRow: true, idxPrefix: '',
    columns: SPLIT_COLS.map(([k, label]) => ({ k, on: ['idx', 'pace', 'bar', 'hr'].includes(k), label: '' })),
    idxTS: TS({ size: 30, weight: 800, font: 'Inter', role: 'accent', color: '@accent' }),
  }),
  measure(ctx, el, env) {
    if (!env.act) return { w: 300, h: 200 };
    const { rows, cfg } = splitRows(el, { ...env, static: true });
    const L = tableLayout(ctx, el.props, splitCols(el, env, cfg), rows); return { w: L.w, h: L.h };
  },
  render(ctx, el, W, H, env) {
    if (!env.act) return;
    const full = splitRows(el, { ...env, static: true });
    const cols = splitCols(el, env, full.cfg);
    const L = tableLayout(ctx, el.props, cols, full.rows);
    const { rows } = splitRows(el, env);
    // keep layout from the final table, swap in animated rows
    const list = el.props.maxRows > 0 && rows.length > el.props.maxRows ? (el.props.rowsFrom === 'last' ? rows.slice(-el.props.maxRows) : rows.slice(0, el.props.maxRows)) : rows;
    drawTable(ctx, el.props, cols, { ...L, list }, env);
  },
  schema: () => [
    { title: 'Splits', fields: [{ k: 'props.splits', t: 'splits', label: 'Split by' }, { k: 'props.columns', t: 'cols', label: 'Columns (toggle, rename, reorder)', options: SPLIT_COLS }, { k: 'props.showPartial', t: 'toggle', label: 'Show last partial split' }, { k: 'props.liveRow', t: 'toggle', label: 'Live row while animating' }, { k: 'props.idxPrefix', t: 'text', label: 'Index prefix', placeholder: 'e.g. KM ' }] },
    { title: 'Design', fields: TABLE_SCHEMA },
    { title: 'Header text', ts: 'props.headerTS' }, { title: 'Cell text', ts: 'props.cellTS' }, { title: 'Index text', ts: 'props.idxTS' },
  ],
});

// ---------- Split card (one split highlighted) ----------
register({
  type: 'splitcard', name: 'Split highlight', auto: true, modes: ['single'],
  props: () => ({
    splits: { mode: 'km', every: 1, custom: '' }, which: 'fastest', number: 1, metric: 'pace', label: '', layout: 'classic', align: 'left', gap: 6,
    showLabel: true, showUnit: true, sub: true, subTpl: '{time} · {hr} bpm', iconColor: '@accent', accent: '@accent', icon: 'zap', iconScale: 1,
    ...statTextStyles({ value: { size: 88 } }), subTS: TS({ size: 24, weight: 600, role: 'muted', font: 'Inter' }),
  }),
  measure(ctx, el, env) { const b = splitCardBlock(ctx, el, env); return { w: b.w, h: b.h }; },
  render(ctx, el, W, H, env) { const b = splitCardBlock(ctx, el, env); drawOps(ctx, b.ops, 0, 0, env); },
  schema: () => [
    { title: 'Which split', fields: [{ k: 'props.splits', t: 'splits', label: 'Split by' },
      { k: 'props.which', t: 'select', label: 'Show', options: [['fastest', 'Fastest'], ['slowest', 'Slowest'], ['first', 'First'], ['last', 'Last full'], ['number', 'Split number…'], ['current', 'Current (animated)']] },
      { k: 'props.number', t: 'num', label: 'Split number', min: 1, max: 200, when: (e) => e.props.which === 'number' },
      { k: 'props.metric', t: 'seg', label: 'Main value', options: [['pace', 'Pace'], ['time', 'Time'], ['hr', 'HR'], ['dist', 'Dist']] },
      { k: 'props.label', t: 'text', label: 'Label', placeholder: 'auto e.g. FASTEST KM · 5' },
      { k: 'props.sub', t: 'toggle', label: 'Sub line' }, { k: 'props.subTpl', t: 'text', label: 'Sub line', help: 'Tokens: {time} {pace} {hr} {dist} {n} {elev}', when: (e) => e.props.sub }] },
    { title: 'Layout', fields: [{ k: 'props.layout', t: 'select', label: 'Layout', options: STAT_LAYOUTS }, { k: 'props.align', t: 'seg', label: 'Align', options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] }, { k: 'props.gap', t: 'range', label: 'Spacing', min: 0, max: 60 }, { k: 'props.icon', t: 'icon', label: 'Icon' }, { k: 'props.iconColor', t: 'color', label: 'Icon color' }, { k: 'props.accent', t: 'color', label: 'Accent' }] },
    { title: 'Value text', ts: 'props.valueTS' }, { title: 'Label text', ts: 'props.labelTS' }, { title: 'Unit text', ts: 'props.unitTS' }, { title: 'Sub line text', ts: 'props.subTS' },
  ],
});
function pickSplit(el, env) {
  const p = el.props, act = env.act; if (!act) return null;
  const sp = getSplits(act, splitCfgOf(el, env));
  const full = sp.filter((s) => !s.partial);
  const st = stateOf(el, env), P = progOf(el, env);
  switch (p.which) {
    case 'slowest': return sp.find((s) => s.slowest) || sp[0];
    case 'first': return sp[0];
    case 'last': return full[full.length - 1] || sp[sp.length - 1];
    case 'number': return sp[clamp((p.number | 0) - 1, 0, sp.length - 1)];
    case 'current': { if (P >= 1) return full[full.length - 1] || sp[sp.length - 1]; const s = sp.find((x) => st.tt <= x.endT) || sp[sp.length - 1]; const d = st.d - s.startD, t = st.tt - s.startT; return { ...s, distance: d, time: t, pace: d > 5 ? t / (d / 1000) : NaN, avgHr: st.hr }; }
    default: return sp.find((s) => s.fastest) || sp[0];
  }
}
function splitCardBlock(ctx, el, env) {
  const p = el.props, s = pickSplit(el, env), u = env.units;
  const cfg = splitCfgOf(el, env);
  const unitWord = cfg.mode === 'laps' ? 'LAP' : cfg.mode === 'time' ? 'SPLIT' : distUnit(u).toUpperCase();
  const whichWord = { fastest: 'Fastest ', slowest: 'Slowest ', first: 'First ', last: 'Last ', number: '', current: 'Current ' }[p.which] || '';
  const label = p.label || (s ? `${whichWord}${unitWord} ${s.index}` : 'Split');
  const vals = s ? { pace: [fmtPace(s.pace, u), paceUnit(u)], time: [fmtDuration(s.time), ''], hr: [fmtInt(s.avgHr), 'bpm'], dist: [fmtDist(s.distance, u, 2), distUnit(u)] }[p.metric] : ['--', ''];
  const b = statBlock(ctx, { label, value: vals[0], unit: vals[1], icon: p.icon }, { ...p, valueTS: p.valueTS, labelTS: p.labelTS, unitTS: p.unitTS }, env);
  if (p.sub && s) {
    const sub = p.subTpl.replace('{time}', fmtDuration(s.time)).replace('{pace}', fmtPace(s.pace, u) + paceUnit(u)).replace('{hr}', fmtInt(s.avgHr)).replace('{dist}', fmtDist(s.distance, u, 2) + ' ' + distUnit(u)).replace('{n}', s.index).replace('{elev}', isNum(s.ascent) ? fmtElev(s.ascent, u) : '--');
    const sb = textBox(ctx, sub, p.subTS);
    const W = Math.max(b.w, sb.w);
    if (sb.w > b.w && p.align !== 'left') { const dx = p.align === 'center' ? (W - b.w) / 2 : W - b.w; b.ops.forEach((o) => { if ('x' in o) o.x += dx; if ('cx' in o) o.cx += dx; }); }
    const sx = p.align === 'center' ? (W - sb.w) / 2 : p.align === 'right' ? W - sb.w : 0;
    b.ops.push({ k: 't', s: sub, x: sx, y: b.h + p.gap + sb.asc, ts: p.subTS });
    b.w = W; b.h += p.gap + sb.h;
  }
  return b;
}

// ---------- Best efforts ----------
register({
  type: 'best', name: 'Best efforts', auto: true, modes: ['single'],
  props: () => tableProps({ design: 'cards', which: ['1K', '1 Mile', '5K', '10K', 'Half', 'Marathon'], showPace: true, header: false, cellTS: TS({ size: 30, weight: 600, font: 'Inter' }), labelTS: TS({ size: 30, weight: 800, font: 'Inter', color: '@accent', role: 'accent' }) }),
  measure(ctx, el, env) { const { cols, rows } = bestData(el, env); const L = tableLayout(ctx, el.props, cols, rows); return { w: L.w, h: L.h }; },
  render(ctx, el, W, H, env) { const { cols, rows } = bestData(el, env); drawTable(ctx, el.props, cols, tableLayout(ctx, el.props, cols, rows), env); },
  schema: () => [{ title: 'Efforts', fields: [{ k: 'props.which', t: 'multi', label: 'Distances', options: ['400 m', '1K', '1 Mile', '3K', '5K', '10K', '15K', 'Half', '30K', 'Marathon'].map((x) => [x, x]) }, { k: 'props.showPace', t: 'toggle', label: 'Show pace' }] }, { title: 'Design', fields: TABLE_SCHEMA }, { title: 'Distance text', ts: 'props.labelTS' }, { title: 'Value text', ts: 'props.cellTS' }, { title: 'Header text', ts: 'props.headerTS' }],
});
function bestData(el, env) {
  const p = el.props;
  const list = env.act ? bestEfforts(env.act).filter((b) => p.which.includes(b.label)) : [];
  const P = progOf(el, env);
  const cols = [{ key: 'l', label: 'Effort', align: 'left', ts: p.labelTS }, { key: 't', label: 'Time', align: 'right' }];
  if (p.showPace) cols.push({ key: 'p', label: 'Pace', align: 'right', chip: true });
  const rows = list.map((b, i) => ({ cells: { l: b.label, t: fmtDuration(b.time), p: fmtPace(b.pace, env.units) + paceUnit(env.units) }, alpha: P >= 1 ? 1 : clamp(P * list.length * 1.2 - i, 0, 1) }));
  if (!rows.length) rows.push({ cells: { l: 'No efforts', t: '', p: '' } });
  return { cols, rows };
}

// ---------- HR zones ----------
register({
  type: 'zones', name: 'HR zones', auto: false, w: 800, h: 420, modes: ['single'],
  props: () => ({ design: 'bars', colors: [...ZONE_COLORS], names: ['Z1 Easy', 'Z2 Aerobic', 'Z3 Tempo', 'Z4 Threshold', 'Z5 Max'], showTime: true, showPct: true, showRange: false, barRadius: 10, trackColor: '#ffffff1f', ring: 0.28, title: 'Heart rate zones', showTitle: true,
    labelTS: TS({ size: 24, weight: 700, font: 'Inter' }), valueTS: TS({ size: 24, weight: 600, font: 'Inter', role: 'muted' }), titleTS: TS({ size: 26, weight: 800, transform: 'upper', spacing: 2 }) }),
  render(ctx, el, W, H, env) { drawZones(ctx, el, W, H, env); },
  schema: () => [{ title: 'Zones', fields: [
    { k: 'props.design', t: 'select', label: 'Design', options: [['bars', 'Horizontal bars'], ['columns', 'Columns'], ['stacked', 'Stacked bar'], ['donut', 'Donut'], ['pills', 'Pills']] },
    { k: 'props.showTitle', t: 'toggle', label: 'Title' }, { k: 'props.title', t: 'text', label: 'Title text', when: (e) => e.props.showTitle },
    { k: 'props.showTime', t: 'toggle', label: 'Time', half: true }, { k: 'props.showPct', t: 'toggle', label: 'Percent', half: true }, { k: 'props.showRange', t: 'toggle', label: 'BPM range' },
    { k: 'props.names', t: 'list5', label: 'Zone names' }, { k: 'props.colors', t: 'colors5', label: 'Zone colors' },
    { k: 'props.trackColor', t: 'color', label: 'Track color' }, { k: 'props.barRadius', t: 'range', label: 'Radius', min: 0, max: 40 }, { k: 'props.ring', t: 'range', label: 'Donut thickness', min: 0.05, max: 0.5, step: 0.01, when: (e) => e.props.design === 'donut' },
  ] }, { title: 'Title text', ts: 'props.titleTS' }, { title: 'Label text', ts: 'props.labelTS' }, { title: 'Value text', ts: 'props.valueTS' }],
});
function drawZones(ctx, el, W, H, env) {
  const p = el.props; if (!env.act) return;
  const Z = hrZones(env.act, env.settings || {});
  const P = progOf(el, env), k = EASE.outCubic(P);
  let top = 0;
  if (p.showTitle && p.title) { const tb = textBox(ctx, p.title, p.titleTS); drawText(ctx, p.title, 0, tb.asc, p.titleTS, env); top = tb.h + p.titleTS.size * 0.6; }
  const maxPct = Math.max(...Z.map((z) => z.pct), 0.01);
  const val = (z) => [p.showTime ? fmtDuration(z.time) : '', p.showPct ? Math.round(z.pct * 100) + '%' : '', p.showRange ? `${z.min}-${z.max}` : ''].filter(Boolean).join('  ');
  const c = (i) => col(p.colors[i] || ZONE_COLORS[i], env);
  if (p.design === 'donut') {
    const R = Math.min(W * 0.45, (H - top) / 2) , cx = R, cy = top + (H - top) / 2, th = R * p.ring;
    let a = -Math.PI / 2;
    Z.forEach((z, i) => { const da = z.pct * Math.PI * 2 * k; ctx.save(); ctx.strokeStyle = c(i); ctx.lineWidth = th; ctx.beginPath(); ctx.arc(cx, cy, R - th / 2, a, a + Math.max(0, da - 0.02)); ctx.stroke(); ctx.restore(); a += da; });
    const lx = cx * 2 + p.labelTS.size, rowH = (H - top) / 5;
    Z.forEach((z, i) => { const y = top + rowH * i + rowH / 2; ctx.fillStyle = c(i); ctx.beginPath(); ctx.arc(lx, y, p.labelTS.size * 0.35, 0, Math.PI * 2); ctx.fill(); drawText(ctx, p.names[i], lx + p.labelTS.size * 0.8, y + p.labelTS.size * 0.35, p.labelTS, env); drawText(ctx, val(z), W, y + p.labelTS.size * 0.35, p.valueTS, env, 'right'); });
    return;
  }
  if (p.design === 'stacked') {
    const bh = Math.min((H - top) * 0.35, 60); let x = 0;
    ctx.save(); rrect(ctx, 0, top, W, bh, p.barRadius); ctx.clip();
    Z.forEach((z, i) => { const w = z.pct * W * k; ctx.fillStyle = c(i); ctx.fillRect(x, top, w, bh); x += w; }); ctx.restore();
    const ly = top + bh + p.labelTS.size * 1.4, cw = W / 5;
    Z.forEach((z, i) => { drawText(ctx, p.names[i], i * cw, ly + p.labelTS.size * 0.8, { ...p.labelTS, color: c(i) }, env); drawText(ctx, val(z), i * cw, ly + p.labelTS.size * 2.2, { ...p.valueTS, size: p.valueTS.size * 0.85 }, env); });
    return;
  }
  if (p.design === 'columns') {
    const lh = p.labelTS.size * 1.6 + (p.showTime || p.showPct ? p.valueTS.size * 1.4 : 0);
    const ch = H - top - lh, cw = W / 5, bw = cw * 0.62;
    Z.forEach((z, i) => {
      const x = i * cw + (cw - bw) / 2, h = ch * (z.pct / maxPct) * k;
      ctx.fillStyle = col(p.trackColor, env); rrect(ctx, x, top, bw, ch, p.barRadius); ctx.fill();
      ctx.fillStyle = c(i); rrect(ctx, x, top + ch - h, bw, Math.max(h, 1), p.barRadius); ctx.fill();
      drawText(ctx, p.names[i].split(' ')[0], i * cw + cw / 2, top + ch + p.labelTS.size * 1.2, p.labelTS, env, 'center');
      drawText(ctx, p.showPct ? Math.round(z.pct * 100) + '%' : fmtDuration(z.time), i * cw + cw / 2, top + ch + p.labelTS.size * 1.2 + p.valueTS.size * 1.3, p.valueTS, env, 'center');
    });
    return;
  }
  // bars / pills
  const rows = 5, gap = (H - top) * 0.04, rh = (H - top - gap * 4) / rows;
  const nameW = Math.max(...p.names.map((n) => measureStr(ctx, n, p.labelTS))) + p.labelTS.size;
  const valW = Math.max(...Z.map((z) => measureStr(ctx, val(z), p.valueTS))) + p.valueTS.size * 0.8;
  Z.forEach((z, i) => {
    const y = top + i * (rh + gap), bx = p.design === 'pills' ? 0 : nameW, bw = W - bx - valW, bh = p.design === 'pills' ? rh : Math.min(rh * 0.6, 40);
    const by = y + (rh - bh) / 2;
    ctx.fillStyle = col(p.trackColor, env); rrect(ctx, bx, by, bw, bh, p.barRadius); ctx.fill();
    ctx.fillStyle = c(i); rrect(ctx, bx, by, Math.max(bh * (p.design === 'pills' ? 0.0 : 0.2), bw * (z.pct / maxPct) * k), bh, p.barRadius); ctx.fill();
    const ty = y + rh / 2 + p.labelTS.size * 0.35;
    if (p.design === 'pills') drawText(ctx, p.names[i], bx + p.labelTS.size * 0.6, ty, { ...p.labelTS, color: '#0d0f14' }, env);
    else drawText(ctx, p.names[i], 0, ty, p.labelTS, env);
    drawText(ctx, val(z), W, ty, p.valueTS, env, 'right');
  });
}

// ---------- Progress ----------
register({
  type: 'progress', name: 'Progress', auto: false, w: 900, h: 120, modes: ['single'],
  props: () => ({ design: 'bar', basis: 'distance', color: '@accent', track: '#ffffff26', thickness: 18, radius: 999, segGap: 8, showLabels: true, showIcon: true, icon: 'footprints', iconColor: '#ffffff', ticks: true, splits: { mode: 'km', every: 1, custom: '' }, labelTS: TS({ size: 24, weight: 700, font: 'Inter' }) }),
  render(ctx, el, W, H, env) {
    const p = el.props, act = env.act; if (!act) return;
    const P = progOf(el, env), st = stateOf(el, env);
    const frac = P >= 1 ? 1 : p.basis === 'time' ? st.time / act.moving : st.distance / act.distance;
    const c = col(p.color, env), tr = col(p.track, env);
    const labH = p.showLabels ? p.labelTS.size * 1.6 : 0;
    const th = Math.min(p.thickness, H - labH);
    const y0 = (H - labH - th) / 2 + (p.design === 'track' ? 0 : 0);
    const label = () => {
      if (!p.showLabels) return;
      const cur = p.basis === 'time' ? fmtDuration(st.time) : `${fmtDist(st.distance, env.units, 2)} ${distUnit(env.units)}`;
      const tot = p.basis === 'time' ? fmtDuration(act.moving) : `${fmtDist(act.distance, env.units, 2)} ${distUnit(env.units)}`;
      drawText(ctx, cur, 0, H - p.labelTS.size * 0.25, p.labelTS, env);
      drawText(ctx, tot, W, H - p.labelTS.size * 0.25, { ...p.labelTS, opacity: 0.6 }, env, 'right');
    };
    if (p.design === 'ring') {
      const R = Math.min(W, H) / 2 - th / 2, cx = W / 2, cy = H / 2;
      ctx.save(); ctx.lineWidth = th; ctx.lineCap = 'round'; ctx.strokeStyle = tr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke(); ctx.restore();
      const t = Math.round(frac * 100) + '%'; const tb = textBox(ctx, t, { ...p.labelTS, size: R * 0.5 });
      drawText(ctx, t, cx, cy + tb.asc / 2, { ...p.labelTS, size: R * 0.5 }, env, 'center');
      return;
    }
    if (p.design === 'segments' || p.design === 'dots') {
      const sp = getSplits(act, splitCfgOf(el, env)); const n = sp.length || 1; const tot = act.C.d[act.n - 1];
      let x = 0;
      sp.forEach((s) => {
        const w = (s.distance / tot) * W - p.segGap;
        const f = clamp(((P >= 1 ? tot : st.d) - s.startD) / (s.endD - s.startD || 1), 0, 1);
        if (p.design === 'dots') { const r = th / 2, cx = x + w / 2; ctx.fillStyle = f >= 1 ? c : tr; ctx.beginPath(); ctx.arc(cx, y0 + r, r, 0, Math.PI * 2); ctx.fill(); if (f > 0 && f < 1) { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, y0 + r, r - 1.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.restore(); } }
        else { ctx.fillStyle = tr; rrect(ctx, x, y0, Math.max(2, w), th, p.radius); ctx.fill(); if (f > 0) { ctx.fillStyle = c; rrect(ctx, x, y0, Math.max(2, w * f), th, p.radius); ctx.fill(); } }
        x += w + p.segGap;
      });
      label(); return;
    }
    // bar / track
    ctx.fillStyle = tr; rrect(ctx, 0, y0, W, th, p.radius); ctx.fill();
    if (p.ticks && p.design === 'track') { const ul = unitLen(env.units), n = Math.floor(act.distance / ul); ctx.fillStyle = '#ffffff66'; for (let i = 1; i <= n; i++) { const x = (i * ul / act.distance) * W; ctx.fillRect(x - 1.5, y0 - th * 0.4, 3, th * 1.8); } }
    ctx.save(); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = p.design === 'track' ? 0 : 14; rrect(ctx, 0, y0, Math.max(th, W * frac), th, p.radius); ctx.fill(); ctx.restore();
    if (p.design === 'track' && p.showIcon) {
      const r = th * 1.3, x = clamp(W * frac, r, W - r);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y0 + th / 2, r, 0, Math.PI * 2); ctx.fill();
      drawIcon(ctx, p.icon, x - r * 0.65, y0 + th / 2 - r * 0.65, r * 1.3, col(p.iconColor, env), { stroke: 2.4 });
    }
    label();
  },
  schema: () => [{ title: 'Progress', fields: [
    { k: 'props.design', t: 'select', label: 'Design', options: [['bar', 'Bar'], ['track', 'Track with runner'], ['segments', 'Split segments'], ['dots', 'Split dots'], ['ring', 'Ring']] },
    { k: 'props.basis', t: 'seg', label: 'Based on', options: [['distance', 'Distance'], ['time', 'Time']] },
    { k: 'props.splits', t: 'splits', label: 'Segments by', when: (e) => /segments|dots/.test(e.props.design) },
    { k: 'props.color', t: 'color', label: 'Fill' }, { k: 'props.track', t: 'color', label: 'Track' },
    { k: 'props.thickness', t: 'range', label: 'Thickness', min: 2, max: 120 }, { k: 'props.radius', t: 'range', label: 'Radius', min: 0, max: 999 },
    { k: 'props.segGap', t: 'range', label: 'Segment gap', min: 0, max: 40, when: (e) => /segments|dots/.test(e.props.design) },
    { k: 'props.showLabels', t: 'toggle', label: 'Labels' }, { k: 'props.ticks', t: 'toggle', label: 'Distance ticks', when: (e) => e.props.design === 'track' },
    { k: 'props.showIcon', t: 'toggle', label: 'Runner icon', when: (e) => e.props.design === 'track' }, { k: 'props.icon', t: 'icon', label: 'Icon', when: (e) => e.props.design === 'track' }, { k: 'props.iconColor', t: 'color', label: 'Icon color', when: (e) => e.props.design === 'track' },
  ] }, { title: 'Label text', ts: 'props.labelTS' }],
});

// ---------- Gauge ----------
register({
  type: 'gauge', name: 'Gauge', auto: false, w: 420, h: 340, keepAspect: false, modes: ['single'],
  props: () => ({ metric: 'hr', design: 'arc', min: 0, max: 0, color: '@accent', track: '#ffffff26', thickness: 0.12, needle: true, ticks: true, label: '', zoneArc: true,
    valueTS: TS({ size: 80, weight: 700, font: 'Oswald' }), labelTS: TS({ size: 22, weight: 700, transform: 'upper', spacing: 2, role: 'muted' }) }),
  render(ctx, el, W, H, env) {
    const p = el.props, act = env.act; if (!act) return;
    const st = stateOf(el, env), P = progOf(el, env);
    const live = { hr: P >= 1 ? act.avgHr : st.hr, pace: P >= 1 ? act.avgPace : st.pace, cad: P >= 1 ? act.avgCad : st.cad, speed: P >= 1 ? act.avgSpeed : st.speed, pwr: P >= 1 ? act.avgPwr : st.pwr }[p.metric];
    const rng = { hr: [90, Math.max(act.maxHr || 190, 170)], pace: [act.avgPace * 1.5, act.avgPace * 0.7], cad: [140, 200], speed: [0, (act.maxSpeed || 5) * 1.1], pwr: [0, 500] }[p.metric] || [0, 100];
    const lo = p.min || rng[0], hi = p.max || rng[1];
    let f = clamp((live - lo) / (hi - lo), 0, 1); if (!isNum(f)) f = 0;
    const semi = p.design === 'semi';
    const a0 = semi ? Math.PI : Math.PI * 0.75, a1 = semi ? Math.PI * 2 : Math.PI * 2.25;
    const R = semi ? Math.min(W / 2, H * 0.9) * 0.95 : Math.min(W, H) / 2 * 0.95, cx = W / 2, cy = semi ? H * 0.92 : H / 2;
    const th = R * p.thickness;
    ctx.save(); ctx.lineCap = p.design === 'ticks' ? 'butt' : 'round';
    if (p.design === 'ticks') {
      const n = 40;
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); ctx.strokeStyle = i / n <= f ? col(p.color, env) : col(p.track, env); ctx.lineWidth = Math.max(2, th * 0.35); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - th), cy + Math.sin(a) * (R - th)); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    } else {
      ctx.lineWidth = th; ctx.strokeStyle = col(p.track, env); ctx.beginPath(); ctx.arc(cx, cy, R - th / 2, a0, a1); ctx.stroke();
      if (p.metric === 'hr' && p.zoneArc) { const zc = ZONE_COLORS; for (let z = 0; z < 5; z++) { const za0 = a0 + (a1 - a0) * (z / 5), za1 = a0 + (a1 - a0) * Math.min(f, (z + 1) / 5); if (za1 > za0) { ctx.strokeStyle = zc[z]; ctx.beginPath(); ctx.arc(cx, cy, R - th / 2, za0, za1); ctx.stroke(); } } }
      else { ctx.strokeStyle = col(p.color, env); ctx.beginPath(); ctx.arc(cx, cy, R - th / 2, a0, a0 + (a1 - a0) * f); ctx.stroke(); }
    }
    if (p.needle) { const a = a0 + (a1 - a0) * f; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, th * 0.22); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.35, cy + Math.sin(a) * R * 0.35); ctx.lineTo(cx + Math.cos(a) * (R - th * 1.4), cy + Math.sin(a) * (R - th * 1.4)); ctx.stroke(); }
    ctx.restore();
    const vs = fmtMetric(p.metric, live, env.units);
    const vts = { ...p.valueTS, size: Math.min(p.valueTS.size, R * 0.55) };
    const vb = textBox(ctx, vs, vts);
    const vy = semi ? cy - R * 0.18 : cy + vb.asc * 0.35;
    drawText(ctx, vs, cx, vy, vts, env, 'center');
    drawText(ctx, p.label || metricUnit(p.metric, env.units), cx, vy + p.labelTS.size * 1.5, p.labelTS, env, 'center');
  },
  schema: () => [{ title: 'Gauge', fields: [
    { k: 'props.metric', t: 'select', label: 'Metric (live)', options: [['hr', 'Heart rate'], ['pace', 'Pace'], ['speed', 'Speed'], ['cad', 'Cadence'], ['pwr', 'Power']] },
    { k: 'props.design', t: 'seg', label: 'Design', options: [['arc', 'Arc'], ['semi', 'Semi'], ['ticks', 'Ticks']] },
    { k: 'props.label', t: 'text', label: 'Caption', placeholder: 'unit' },
    { k: 'props.min', t: 'num', label: 'Min (0 = auto)', half: true }, { k: 'props.max', t: 'num', label: 'Max (0 = auto)', half: true },
    { k: 'props.color', t: 'color', label: 'Color' }, { k: 'props.track', t: 'color', label: 'Track' }, { k: 'props.thickness', t: 'range', label: 'Thickness', min: 0.02, max: 0.4, step: 0.01 },
    { k: 'props.needle', t: 'toggle', label: 'Needle' }, { k: 'props.zoneArc', t: 'toggle', label: 'HR zone colors', when: (e) => e.props.metric === 'hr' },
  ] }, { title: 'Value text', ts: 'props.valueTS' }, { title: 'Caption text', ts: 'props.labelTS' }],
});
