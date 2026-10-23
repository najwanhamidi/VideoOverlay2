// Multi-run (weekly / period) widgets.
import { register, progOf, stateOf } from './core.js';
import { TS, drawText, textBox, col, rrect, measureStr, drawIcon } from '../render/draw.js';
import { tableProps, tableLayout, drawTable, TABLE_SCHEMA } from './table.js';
import { fmtPace, fmtDuration, fmtDist, fmtInt, fmtElev, fmtDate, isNum, clamp, distUnit, paceUnit, DAYS, EASE, rampColor } from '../util.js';
import { routePoints } from './map.js';

export const RUN_COLS = [['day', 'Day'], ['date', 'Date'], ['name', 'Name'], ['dist', 'Distance'], ['time', 'Time'], ['pace', 'Avg pace'], ['hr', 'Avg HR'], ['elev', 'Elev gain'], ['cad', 'Cadence'], ['bar', 'Distance bar']];

function runRows(el, env, staticAll) {
  const p = el.props, S = env.multi; if (!S) return [];
  const P = staticAll ? 1 : progOf(el, env);
  const list = S.list;
  const maxD = Math.max(...list.map((a) => a.distance), 1);
  const longest = S.longest, fastest = S.fastest;
  return list.map((a, i) => {
    const appear = P >= 1 ? 1 : EASE.outCubic(clamp(P * list.length - i, 0, 1));
    return {
      cells: {
        day: DAYS[a.start.getDay()], date: fmtDate(a.start, p.dateStyle || 'short'), name: a.name,
        dist: fmtDist(a.distance, env.units, p.decimals ?? 2) + (p.units ? ' ' + distUnit(env.units) : ''), time: fmtDuration(a.moving), pace: fmtPace(a.avgPace, env.units) + (p.units ? paceUnit(env.units) : ''),
        hr: fmtInt(a.avgHr), elev: fmtElev(a.ascent, env.units), cad: fmtInt(a.avgCad),
      },
      bar: 0.15 + 0.85 * (a.distance / maxD), alpha: appear,
      hl: p.hlMode === 'longest' && a === longest ? 'fast' : p.hlMode === 'fastest' && a === fastest ? 'fast' : null,
    };
  });
}
function runCols(el) {
  const p = el.props;
  const labels = { day: 'Day', date: 'Date', name: 'Run', dist: 'Dist', time: 'Time', pace: 'Pace', hr: 'HR', elev: 'Elev', cad: 'Cad', bar: '' };
  return p.columns.filter((c) => c.on).map((c) => ({ key: c.k, label: c.label || labels[c.k], align: /name|day|date/.test(c.k) ? 'left' : 'right', bar: c.k === 'bar', chip: c.k === 'pace', ts: c.k === 'day' ? p.dayTS : c.k === 'name' ? p.nameTS : undefined }));
}
register({
  type: 'mlist', name: 'Run list', auto: true, modes: ['multi'],
  props: () => tableProps({
    design: 'cards', hlMode: 'longest', dateStyle: 'short', decimals: 2, units: false, rowScale: 2.1,
    columns: RUN_COLS.map(([k]) => ({ k, on: ['day', 'name', 'dist', 'time', 'pace', 'hr'].includes(k), label: '' })),
    dayTS: TS({ size: 26, weight: 800, font: 'Inter', transform: 'upper', color: '@accent', role: 'accent' }),
    nameTS: TS({ size: 28, weight: 700, font: 'Inter' }), cellTS: TS({ size: 28, weight: 600, font: 'Inter' }),
  }),
  measure(ctx, el, env) { const L = tableLayout(ctx, el.props, runCols(el), runRows(el, env, true)); return { w: L.w, h: L.h }; },
  render(ctx, el, W, H, env) {
    const cols = runCols(el), p = el.props;
    const L = tableLayout(ctx, p, cols, runRows(el, env, true));
    const rows = runRows(el, env);
    const list = p.maxRows > 0 && rows.length > p.maxRows ? (p.rowsFrom === 'last' ? rows.slice(-p.maxRows) : rows.slice(0, p.maxRows)) : rows;
    drawTable(ctx, p, cols, { ...L, list }, env);
  },
  schema: () => [
    { title: 'Columns', fields: [{ k: 'props.columns', t: 'cols', label: 'Toggle, rename, reorder', options: RUN_COLS }, { k: 'props.dateStyle', t: 'select', label: 'Date format', options: [['short', '18 Oct'], ['medium', '18 Oct 2026'], ['numeric', '18/10/2026'], ['us', 'Oct 18, 2026'], ['weekday', 'Sunday']] }, { k: 'props.decimals', t: 'num', label: 'Distance decimals', min: 0, max: 3 }, { k: 'props.units', t: 'toggle', label: 'Show units in cells' }, { k: 'props.hlMode', t: 'seg', label: 'Highlight', options: [['longest', 'Longest'], ['fastest', 'Fastest'], ['none', 'None']] }] },
    { title: 'Design', fields: TABLE_SCHEMA },
    { title: 'Header text', ts: 'props.headerTS' }, { title: 'Cell text', ts: 'props.cellTS' }, { title: 'Day text', ts: 'props.dayTS' }, { title: 'Name text', ts: 'props.nameTS' },
  ],
});

// ---------- Day bars ----------
register({
  type: 'mbars', name: 'Daily chart', auto: false, w: 900, h: 420, modes: ['multi'],
  props: () => ({ metric: 'distance', design: 'bars', color: '@accent', color2: '@accent2', track: '#ffffff1a', radius: 14, gap: 0.3, showValues: true, showDays: true, dayFormat: 'short', hlMax: true, hlColor: '#ffffff', emptyDot: true, gradient: false,
    dayTS: TS({ size: 24, weight: 700, transform: 'upper', role: 'muted', font: 'Inter' }), valueTS: TS({ size: 24, weight: 700, font: 'Inter' }) }),
  render(ctx, el, W, H, env) {
    const p = el.props, S = env.multi; if (!S) return;
    const P = progOf(el, env), k = EASE.outCubic(clamp(P, 0, 1));
    const days = S.days;
    const v = (d) => (p.metric === 'time' ? d.time : p.metric === 'ascent' ? d.ascent : d.distance);
    const max = Math.max(...days.map(v), 1);
    const dayH = p.showDays ? p.dayTS.size * 1.8 : 0, valH = p.showValues ? p.valueTS.size * 1.6 : 0;
    const ch = H - dayH - valH, cw = W / days.length, bw = cw * (1 - p.gap);
    const fmtV = (x) => (p.metric === 'time' ? fmtDuration(x, 'hm').replace(/^0h /, '') : p.metric === 'ascent' ? fmtElev(x, env.units) : fmtDist(x, env.units, 1));
    const pts = [];
    days.forEach((d, i) => {
      const x = i * cw + (cw - bw) / 2, val = v(d), stagger = clamp(k * days.length * 1.2 - i * 0.6, 0, 1);
      const h = (val / max) * ch * EASE.outCubic(Math.min(1, stagger * 1.4));
      const isMax = p.hlMax && val === max && val > 0;
      const c = isMax ? col(p.hlColor, env) : col(p.color, env);
      if (p.design === 'bars' || p.design === 'pills') {
        if (p.design === 'pills' || p.track) { ctx.fillStyle = col(p.track, env); rrect(ctx, x, valH, bw, ch, p.radius); ctx.fill(); }
        if (val > 0) { if (p.gradient) { const g = ctx.createLinearGradient(0, valH + ch - h, 0, valH + ch); g.addColorStop(0, c); g.addColorStop(1, col(p.color2, env)); ctx.fillStyle = g; } else ctx.fillStyle = c; rrect(ctx, x, valH + ch - h, bw, Math.max(h, 2), p.radius); ctx.fill(); }
        else if (p.emptyDot) { ctx.fillStyle = col(p.track, env); ctx.beginPath(); ctx.arc(x + bw / 2, valH + ch - 6, 6, 0, Math.PI * 2); ctx.fill(); }
      } else if (p.design === 'lollipop') {
        if (val > 0) { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = Math.max(4, bw * 0.12); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + bw / 2, valH + ch); ctx.lineTo(x + bw / 2, valH + ch - h); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + bw / 2, valH + ch - h, Math.min(bw / 2, 22), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      } else if (p.design === 'circles') {
        const r = Math.min(bw / 2, ch / 2) * (val > 0 ? 0.35 + 0.65 * Math.sqrt(val / max) : 0.18) * Math.min(1, stagger * 1.4);
        ctx.fillStyle = val > 0 ? c : col(p.track, env); ctx.beginPath(); ctx.arc(x + bw / 2, valH + ch / 2, r, 0, Math.PI * 2); ctx.fill();
      }
      pts.push([x + bw / 2, valH + ch - h, val]);
      if (p.showValues && val > 0 && stagger > 0.5) drawText(ctx, fmtV(val), x + bw / 2, p.design === 'circles' ? valH + ch / 2 - Math.min(bw / 2, ch / 2) - 8 : valH + ch - h - p.valueTS.size * 0.5, { ...p.valueTS, opacity: clamp((stagger - 0.5) * 2, 0, 1) }, env, 'center');
      if (p.showDays) { const dl = p.dayFormat === 'letter' ? DAYS[d.date.getDay()][0] : p.dayFormat === 'date' ? String(d.date.getDate()) : DAYS[d.date.getDay()]; drawText(ctx, dl, x + bw / 2, H - p.dayTS.size * 0.3, isMax ? { ...p.dayTS, color: p.hlColor } : p.dayTS, env, 'center'); }
    });
    if (p.design === 'area' || p.design === 'line') {
      ctx.save(); ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      if (p.design === 'area') { ctx.lineTo(pts[pts.length - 1][0], valH + ch); ctx.lineTo(pts[0][0], valH + ch); ctx.closePath(); const g = ctx.createLinearGradient(0, valH, 0, valH + ch); g.addColorStop(0, col(p.color, env)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fill(); ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); }
      ctx.strokeStyle = col(p.color, env); ctx.lineWidth = 5; ctx.stroke();
      pts.forEach((q) => { ctx.fillStyle = q[2] > 0 ? col(p.color, env) : col(p.track, env); ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }
  },
  schema: () => [{ title: 'Chart', fields: [
    { k: 'props.metric', t: 'seg', label: 'Metric', options: [['distance', 'Distance'], ['time', 'Time'], ['ascent', 'Elevation']] },
    { k: 'props.design', t: 'select', label: 'Design', options: [['bars', 'Bars'], ['pills', 'Pills with track'], ['lollipop', 'Lollipop'], ['circles', 'Circles'], ['area', 'Area'], ['line', 'Line']] },
    { k: 'props.color', t: 'color', label: 'Color' }, { k: 'props.gradient', t: 'toggle', label: 'Gradient bars' }, { k: 'props.color2', t: 'color', label: 'Gradient end', when: (e) => e.props.gradient },
    { k: 'props.track', t: 'color', label: 'Track / empty' }, { k: 'props.hlMax', t: 'toggle', label: 'Highlight best day' }, { k: 'props.hlColor', t: 'color', label: 'Highlight color', when: (e) => e.props.hlMax },
    { k: 'props.radius', t: 'range', label: 'Radius', min: 0, max: 60 }, { k: 'props.gap', t: 'range', label: 'Gap', min: 0, max: 0.8, step: 0.05 },
    { k: 'props.showValues', t: 'toggle', label: 'Values', half: true }, { k: 'props.showDays', t: 'toggle', label: 'Days', half: true },
    { k: 'props.dayFormat', t: 'seg', label: 'Day labels', options: [['short', 'Mon'], ['letter', 'M'], ['date', '18']] },
  ] }, { title: 'Day text', ts: 'props.dayTS' }, { title: 'Value text', ts: 'props.valueTS' }],
});

// ---------- Week strip / calendar ----------
register({
  type: 'mcal', name: 'Week strip', auto: false, w: 900, h: 200, modes: ['multi'],
  props: () => ({ design: 'circles', color: '@accent', empty: '#ffffff1f', textOn: '#0d0f14', showDist: true, showDay: true, icon: 'check', dayFormat: 'short',
    dayTS: TS({ size: 22, weight: 700, transform: 'upper', role: 'muted', font: 'Inter' }), valueTS: TS({ size: 26, weight: 800, font: 'Inter' }) }),
  render(ctx, el, W, H, env) {
    const p = el.props, S = env.multi; if (!S) return;
    const P = progOf(el, env);
    const days = S.days, n = days.length, cw = W / n;
    const max = Math.max(...days.map((d) => d.distance), 1);
    const dayH = p.showDay ? p.dayTS.size * 1.8 : 0, distH = p.showDist && p.design !== 'circles' && p.design !== 'squares' ? p.valueTS.size * 1.6 : 0;
    const size = Math.min(cw * 0.82, H - dayH - distH);
    days.forEach((d, i) => {
      const cx = i * cw + cw / 2, cy = dayH + size / 2;
      const on = d.runs.length > 0;
      const a = P >= 1 ? 1 : EASE.outBack(clamp(P * n * 1.3 - i, 0, 1));
      const r = size / 2 * (on ? Math.max(0.001, a) : 1);
      if (p.showDay) { const dl = p.dayFormat === 'letter' ? DAYS[d.date.getDay()][0] : p.dayFormat === 'date' ? String(d.date.getDate()) : DAYS[d.date.getDay()]; drawText(ctx, dl, cx, p.dayTS.size * 1.05, p.dayTS, env, 'center'); }
      ctx.save();
      const c = col(p.color, env);
      const rr = p.design === 'squares' ? size * 0.22 : p.design === 'pills' ? size : 999;
      if (p.design === 'rings') {
        ctx.lineWidth = size * 0.12; ctx.strokeStyle = col(p.empty, env); ctx.beginPath(); ctx.arc(cx, cy, size / 2 - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
        if (on) { ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, size / 2 - ctx.lineWidth / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (d.distance / max) * Math.max(0, a)); ctx.stroke(); }
      } else if (p.design === 'heat') {
        ctx.fillStyle = col(p.empty, env); rrect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.2); ctx.fill();
        if (on) { ctx.globalAlpha *= (0.35 + 0.65 * d.distance / max) * clamp(a, 0, 1); ctx.fillStyle = c; rrect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.2); ctx.fill(); }
      } else {
        ctx.fillStyle = col(p.empty, env); rrect(ctx, cx - size / 2, cy - size / 2, size, size, rr); ctx.fill();
        if (on && a > 0) { ctx.fillStyle = c; rrect(ctx, cx - r, cy - r, r * 2, r * 2, rr === 999 ? 999 : rr * a); ctx.fill(); }
      }
      ctx.restore();
      if (on && a > 0.6) {
        if ((p.design === 'circles' || p.design === 'squares') && p.showDist) { const s = fmtDist(d.distance, env.units, d.distance >= 10000 ? 0 : 1); const ts = { ...p.valueTS, color: p.textOn, size: Math.min(p.valueTS.size, size * 0.34) }; drawText(ctx, s, cx, cy + textBox(ctx, s, ts).asc / 2, ts, env, 'center'); }
        else if ((p.design === 'circles' || p.design === 'squares') && p.icon) drawIcon(ctx, p.icon, cx - size * 0.25, cy - size * 0.25, size * 0.5, col(p.textOn, env), { stroke: 3 });
      }
      if (distH && on) drawText(ctx, fmtDist(d.distance, env.units, 1), cx, H - p.valueTS.size * 0.3, p.valueTS, env, 'center');
    });
  },
  schema: () => [{ title: 'Week strip', fields: [
    { k: 'props.design', t: 'select', label: 'Design', options: [['circles', 'Circles'], ['squares', 'Squares'], ['rings', 'Rings (distance)'], ['heat', 'Heat squares'], ['pills', 'Pills']] },
    { k: 'props.color', t: 'color', label: 'Run day color' }, { k: 'props.empty', t: 'color', label: 'Rest day color' }, { k: 'props.textOn', t: 'color', label: 'Text on color' },
    { k: 'props.showDist', t: 'toggle', label: 'Show distance' }, { k: 'props.showDay', t: 'toggle', label: 'Show day names' }, { k: 'props.icon', t: 'icon', label: 'Icon (if no distance)' },
    { k: 'props.dayFormat', t: 'seg', label: 'Day labels', options: [['short', 'Mon'], ['letter', 'M'], ['date', '18']] },
  ] }, { title: 'Day text', ts: 'props.dayTS' }, { title: 'Value text', ts: 'props.valueTS' }],
});

// ---------- Routes grid ----------
register({
  type: 'mroutes', name: 'Routes', auto: false, w: 900, h: 600, modes: ['multi'],
  props: () => ({ design: 'grid', cols: 3, color: '@accent', width: 5, glow: 12, cellBg: '#ffffff12', radius: 18, gap: 18, showLabel: true, label: 'dist', palette: false,
    labelTS: TS({ size: 22, weight: 700, font: 'Inter' }) }),
  render(ctx, el, W, H, env) {
    const p = el.props, S = env.multi; if (!S) return;
    const list = S.list.filter((a) => a.hasGps), P = progOf(el, env);
    if (!list.length) { drawText(ctx, 'No GPS routes', W / 2, H / 2, TS({ size: 30 }), env, 'center'); return; }
    const pal = ['#c6ff3d', '#00e0ff', '#ff6bd6', '#ffb020', '#8b5cf6', '#22c55e', '#f43f5e', '#38bdf8'];
    const draw = (a, x, y, w, h, color, f) => {
      const R = routePoints(a, 400); if (!R) return;
      const sc = Math.min(w / Math.max(1, R.maxX - R.minX), h / Math.max(1, R.maxY - R.minY));
      const ox = x + w / 2 - ((R.minX + R.maxX) / 2) * sc, oy = y + h / 2 - ((R.minY + R.maxY) / 2) * sc;
      const n = Math.max(2, Math.floor(R.pts.length * f));
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = p.width; ctx.lineJoin = ctx.lineCap = 'round'; ctx.shadowColor = color; ctx.shadowBlur = p.glow;
      ctx.beginPath(); for (let i = 0; i < n; i++) { const q = R.pts[i]; i ? ctx.lineTo(q.x * sc + ox, q.y * sc + oy) : ctx.moveTo(q.x * sc + ox, q.y * sc + oy); } ctx.stroke(); ctx.restore();
    };
    if (p.design === 'overlay') {
      list.forEach((a, i) => draw(a, p.gap, p.gap, W - 2 * p.gap, H - 2 * p.gap, p.palette ? pal[i % pal.length] : col(p.color, env), P >= 1 ? 1 : clamp(P * list.length - i, 0, 1)));
      return;
    }
    const cols = p.design === 'row' ? list.length : Math.max(1, Math.min(p.cols, list.length));
    const rows = Math.ceil(list.length / cols);
    const labH = p.showLabel ? p.labelTS.size * 1.8 : 0;
    const cw = (W - p.gap * (cols - 1)) / cols, ch = (H - p.gap * (rows - 1)) / rows;
    list.forEach((a, i) => {
      const x = (i % cols) * (cw + p.gap), y = Math.floor(i / cols) * (ch + p.gap);
      const f = P >= 1 ? 1 : clamp(P * list.length - i, 0, 1);
      if (f <= 0) return;
      ctx.save(); ctx.globalAlpha *= Math.min(1, f * 3);
      if (p.cellBg) { ctx.fillStyle = col(p.cellBg, env); rrect(ctx, x, y, cw, ch, p.radius); ctx.fill(); }
      const pad = Math.min(cw, ch) * 0.12;
      draw(a, x + pad, y + pad, cw - 2 * pad, ch - 2 * pad - labH, p.palette ? pal[i % pal.length] : col(p.color, env), f);
      if (p.showLabel) { const s = p.label === 'name' ? a.name : p.label === 'day' ? DAYS[a.start.getDay()].toUpperCase() + ' · ' + fmtDist(a.distance, env.units, 1) + ' ' + distUnit(env.units) : fmtDist(a.distance, env.units, 1) + ' ' + distUnit(env.units); drawText(ctx, s, x + cw / 2, y + ch - pad * 0.6, p.labelTS, env, 'center'); }
      ctx.restore();
    });
  },
  schema: () => [{ title: 'Routes', fields: [
    { k: 'props.design', t: 'seg', label: 'Design', options: [['grid', 'Grid'], ['row', 'Row'], ['overlay', 'Overlay']] },
    { k: 'props.cols', t: 'range', label: 'Columns', min: 1, max: 7, when: (e) => e.props.design === 'grid' },
    { k: 'props.color', t: 'color', label: 'Line color' }, { k: 'props.palette', t: 'toggle', label: 'Different color per run' },
    { k: 'props.width', t: 'range', label: 'Line width', min: 1, max: 20, step: 0.5 }, { k: 'props.glow', t: 'range', label: 'Glow', min: 0, max: 40 },
    { k: 'props.cellBg', t: 'color', label: 'Cell background' }, { k: 'props.radius', t: 'range', label: 'Cell radius', min: 0, max: 60 }, { k: 'props.gap', t: 'range', label: 'Gap', min: 0, max: 80 },
    { k: 'props.showLabel', t: 'toggle', label: 'Labels' }, { k: 'props.label', t: 'seg', label: 'Label', options: [['dist', 'Distance'], ['day', 'Day + dist'], ['name', 'Name']] },
  ] }, { title: 'Label text', ts: 'props.labelTS' }],
});

// ---------- Per-run chart ----------
register({
  type: 'mchart', name: 'Per-run chart', auto: false, w: 900, h: 420, modes: ['multi'],
  props: () => ({ metric: 'avgPace', design: 'hbars', color: '@accent', track: '#ffffff1a', radius: 10, showValues: true, label: 'day', ramp: false,
    labelTS: TS({ size: 22, weight: 700, font: 'Inter', role: 'muted', transform: 'upper' }), valueTS: TS({ size: 24, weight: 700, font: 'Inter' }) }),
  render(ctx, el, W, H, env) {
    const p = el.props, S = env.multi; if (!S || !S.list.length) return;
    const P = progOf(el, env), list = S.list;
    const get = (a) => ({ avgPace: a.avgPace, avgHr: a.avgHr, distance: a.distance, time: a.moving, ascent: a.ascent }[p.metric]);
    const fmt = (v) => ({ avgPace: fmtPace(v, env.units), avgHr: fmtInt(v), distance: fmtDist(v, env.units, 1), time: fmtDuration(v), ascent: fmtElev(v, env.units) }[p.metric]);
    const vals = list.map(get).filter(isNum); const mx = Math.max(...vals), mn = Math.min(...vals);
    const norm = (v) => p.metric === 'avgPace' ? 0.3 + 0.7 * ((mx - v) / ((mx - mn) || 1)) : 0.15 + 0.85 * (v / (mx || 1));
    const lab = (a) => (p.label === 'name' ? a.name : p.label === 'date' ? fmtDate(a.start, 'short') : DAYS[a.start.getDay()]);
    const n = list.length;
    if (p.design === 'hbars') {
      const rh = H / n, bh = rh * 0.6, lw = Math.max(...list.map((a) => measureStr(ctx, lab(a), p.labelTS))) + 20, vw = Math.max(...list.map((a) => measureStr(ctx, fmt(get(a)), p.valueTS))) + 20;
      list.forEach((a, i) => {
        const f = P >= 1 ? 1 : EASE.outCubic(clamp(P * n - i, 0, 1)); const y = i * rh + (rh - bh) / 2, bw = W - lw - vw;
        drawText(ctx, lab(a), 0, y + bh / 2 + p.labelTS.size * 0.35, p.labelTS, env);
        ctx.fillStyle = col(p.track, env); rrect(ctx, lw, y, bw, bh, p.radius); ctx.fill();
        const v = get(a); if (!isNum(v)) return;
        ctx.fillStyle = p.ramp ? rampColor(['#22d3ee', '#a3e635', '#f97316'], norm(v)) : col(p.color, env); rrect(ctx, lw, y, Math.max(bh, bw * norm(v) * f), bh, p.radius); ctx.fill();
        if (p.showValues && f > 0.3) drawText(ctx, fmt(v), W, y + bh / 2 + p.valueTS.size * 0.35, p.valueTS, env, 'right');
      });
    } else {
      const cw = W / n, bw = cw * 0.6, lh = p.labelTS.size * 1.8, vh = p.valueTS.size * 1.6, ch = H - lh - vh;
      list.forEach((a, i) => {
        const f = P >= 1 ? 1 : EASE.outCubic(clamp(P * n - i, 0, 1)), x = i * cw + (cw - bw) / 2, v = get(a);
        drawText(ctx, lab(a), x + bw / 2, H - p.labelTS.size * 0.3, p.labelTS, env, 'center');
        if (!isNum(v)) return;
        const h = ch * norm(v) * f;
        ctx.fillStyle = p.ramp ? rampColor(['#22d3ee', '#a3e635', '#f97316'], norm(v)) : col(p.color, env);
        if (p.design === 'dots') { ctx.beginPath(); ctx.arc(x + bw / 2, vh + ch - h, Math.min(bw / 2, 20), 0, Math.PI * 2); ctx.fill(); }
        else { rrect(ctx, x, vh + ch - h, bw, h, p.radius); ctx.fill(); }
        if (p.showValues && f > 0.3) drawText(ctx, fmt(v), x + bw / 2, vh + ch - h - p.valueTS.size * 0.5, p.valueTS, env, 'center');
      });
    }
  },
  schema: () => [{ title: 'Per-run chart', fields: [
    { k: 'props.metric', t: 'select', label: 'Metric', options: [['avgPace', 'Avg pace'], ['avgHr', 'Avg HR'], ['distance', 'Distance'], ['time', 'Time'], ['ascent', 'Elevation']] },
    { k: 'props.design', t: 'seg', label: 'Design', options: [['hbars', 'Horizontal'], ['vbars', 'Vertical'], ['dots', 'Dots']] },
    { k: 'props.label', t: 'seg', label: 'Labels', options: [['day', 'Day'], ['date', 'Date'], ['name', 'Name']] },
    { k: 'props.color', t: 'color', label: 'Color' }, { k: 'props.ramp', t: 'toggle', label: 'Color by value' }, { k: 'props.track', t: 'color', label: 'Track' }, { k: 'props.radius', t: 'range', label: 'Radius', min: 0, max: 40 }, { k: 'props.showValues', t: 'toggle', label: 'Values' },
  ] }, { title: 'Label text', ts: 'props.labelTS' }, { title: 'Value text', ts: 'props.valueTS' }],
});
