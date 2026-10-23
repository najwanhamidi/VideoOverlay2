// Data graphs: pace / heart rate / elevation / cadence / power / speed.
import { register, progOf, stateOf } from './core.js';
import { TS, drawText, textBox, col, rrect, measureStr } from '../render/draw.js';
import { smoothSpeed, smoothSeries, fracIndex, getSplits } from '../data/activity.js';
import { fmtPace, fmtElev, fmtSpeed, fmtInt, fmtDist, fmtDuration, isNum, clamp, rampColor, unitLen, distUnit, paceUnit } from '../util.js';
import { splitCfgOf } from './metrics.js';

export const GRAPH_METRICS = [['pace', 'Pace'], ['hr', 'Heart rate'], ['ele', 'Elevation'], ['speed', 'Speed'], ['cad', 'Cadence'], ['pwr', 'Power']];
export const GRAPH_DESIGNS = [
  ['area', 'Area'], ['gradArea', 'Gradient area'], ['line', 'Line'], ['neon', 'Neon line'], ['heat', 'Heat line'], ['ribbon', 'Heat area'],
  ['bars', 'Bars'], ['splitBars', 'Split bars'], ['step', 'Split steps'], ['dots', 'Dots'], ['lollipop', 'Lollipop'], ['spark', 'Sparkline'],
];
export const ZONE_COLORS = ['#60a5fa', '#34d399', '#facc15', '#fb923c', '#ef4444'];
export const RAMPS = {
  fire: ['#facc15', '#f97316', '#dc2626'], cool: ['#22d3ee', '#3b82f6', '#8b5cf6'], lime: ['#bef264', '#22c55e', '#065f46'],
  heat: ['#3b82f6', '#22c55e', '#facc15', '#ef4444'], mono: ['#ffffff55', '#ffffff'], sunset: ['#fde047', '#fb7185', '#7c3aed'],
};

export function fmtMetric(m, v, units) {
  if (!isNum(v)) return '--';
  switch (m) {
    case 'pace': return fmtPace(v, units);
    case 'ele': return fmtElev(v, units);
    case 'speed': return fmtSpeed(v, units);
    default: return fmtInt(v);
  }
}
export function metricUnit(m, units) { return { pace: paceUnit(units), hr: 'bpm', ele: units === 'imperial' ? 'ft' : 'm', speed: units === 'imperial' ? 'mph' : 'km/h', cad: 'spm', pwr: 'W' }[m] || ''; }

function pointSeries(act, metric, smooth) {
  if (metric === 'pace' || metric === 'speed') {
    const s = smoothSpeed(act, Math.max(4, smooth || 20));
    return metric === 'speed' ? s : s.map((v) => (v > 0.4 ? 1000 / v : NaN));
  }
  return smoothSeries(act, metric, smooth || 0);
}
function sample(arr, fi) { const i = Math.floor(fi), f = fi - i; const a = arr[i], b = arr[Math.min(arr.length - 1, i + 1)]; if (!isNum(a)) return b; if (!isNum(b)) return a; return a + (b - a) * f; }

export function graphSeries(act, metric, xAxis, smooth, N) {
  const key = ['G', metric, xAxis, smooth, N].join('|');
  if (act._cache[key]) return act._cache[key];
  const arr = pointSeries(act, metric, smooth);
  const xk = xAxis === 'time' ? 'tt' : 'd';
  const X = act.C[xk][act.n - 1];
  const xs = new Float32Array(N), ys = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * X; xs[i] = i / (N - 1);
    ys[i] = sample(arr, fracIndex(act, xk, x));
  }
  const vals = Array.from(ys).filter(isNum).sort((a, b) => a - b);
  let lo = vals[0], hi = vals[vals.length - 1];
  if (metric === 'pace' && vals.length > 10) { lo = vals[Math.floor(vals.length * 0.01)]; hi = Math.min(vals[Math.floor(vals.length * 0.97)], lo * 2.2); }
  const avg = metric === 'pace' ? act.avgPace : metric === 'hr' ? act.avgHr : metric === 'speed' ? act.avgSpeed : metric === 'cad' ? act.avgCad : metric === 'pwr' ? act.avgPwr : vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  return (act._cache[key] = { xs, ys, lo, hi, avg, X, N });
}

function splitValue(sp, metric) {
  return { pace: sp.pace, hr: sp.avgHr, ele: sp.eleEnd, speed: sp.speed, cad: sp.avgCad, pwr: sp.avgPwr }[metric];
}

register({
  type: 'graph', name: 'Graph', auto: false, w: 900, h: 360, modes: ['single'],
  props: () => ({
    metric: 'pace', design: 'gradArea', xAxis: 'distance', smooth: 30, invert: true, samples: 240,
    lineColor: '@accent', lineW: 5, fillColor: '@accent', fillColor2: '#00000000', fillOpacity: 0.55,
    colorMode: 'solid', ramp: 'heat', zoneColors: [...ZONE_COLORS],
    showTitle: true, title: '', showY: true, showX: true, yTicks: 3, grid: true, gridColor: '#ffffff26',
    showAvg: true, avgColor: '#ffffffcc', showMinMax: false, barGap: 0.25, barRadius: 6, bars: 30, yPad: 0.08, baseline: 'zero',
    cursor: true, cursorColor: '#ffffff', ghost: true, ghostOpacity: 0.18,
    splits: { mode: 'km', every: 1, custom: '' },
    titleTS: TS({ size: 26, weight: 700, transform: 'upper', spacing: 2 }),
    axisTS: TS({ size: 20, weight: 500, role: 'muted', font: 'Inter' }),
    valueTS: TS({ size: 22, weight: 700, font: 'Inter', color: '#0d0f14', role: 'fixed' }),
  }),
  render(ctx, el, W, H, env) { drawGraph(ctx, el, W, H, env); },
  schema: (el) => [
    { title: 'Data', fields: [
      { k: 'props.metric', t: 'select', label: 'Metric', options: GRAPH_METRICS },
      { k: 'props.design', t: 'select', label: 'Design', options: GRAPH_DESIGNS },
      { k: 'props.xAxis', t: 'seg', label: 'X axis', options: [['distance', 'Distance'], ['time', 'Time']] },
      { k: 'props.smooth', t: 'range', label: 'Smoothing (s)', min: 0, max: 120 },
      { k: 'props.invert', t: 'toggle', label: 'Faster pace = higher', when: (e) => e.props.metric === 'pace' },
      { k: 'props.splits', t: 'splits', label: 'Splits', when: (e) => /splitBars|step|lollipop/.test(e.props.design) },
      { k: 'props.bars', t: 'range', label: 'Bar count', min: 5, max: 120, when: (e) => e.props.design === 'bars' || e.props.design === 'dots' },
    ] },
    { title: 'Colors', fields: [
      { k: 'props.colorMode', t: 'seg', label: 'Coloring', options: [['solid', 'Solid'], ['ramp', 'By value'], ['zones', 'HR zones']] },
      { k: 'props.ramp', t: 'select', label: 'Value palette', options: Object.keys(RAMPS).map((k) => [k, k[0].toUpperCase() + k.slice(1)]), when: (e) => e.props.colorMode === 'ramp' },
      { k: 'props.lineColor', t: 'color', label: 'Line color' }, { k: 'props.lineW', t: 'range', label: 'Line width', min: 1, max: 20, step: 0.5 },
      { k: 'props.fillColor', t: 'color', label: 'Fill color' }, { k: 'props.fillColor2', t: 'color', label: 'Fill fade-to' }, { k: 'props.fillOpacity', t: 'range', label: 'Fill opacity', min: 0, max: 1, step: 0.05 },
      { k: 'props.barGap', t: 'range', label: 'Bar gap', min: 0, max: 0.8, step: 0.05, when: (e) => /bars|splitBars/i.test(e.props.design) }, { k: 'props.barRadius', t: 'range', label: 'Bar radius', min: 0, max: 40, when: (e) => /bars|splitBars/i.test(e.props.design) },
    ] },
    { title: 'Axes & labels', fields: [
      { k: 'props.showTitle', t: 'toggle', label: 'Title' }, { k: 'props.title', t: 'text', label: 'Title text', placeholder: 'auto', when: (e) => e.props.showTitle },
      { k: 'props.showY', t: 'toggle', label: 'Y labels', half: true }, { k: 'props.showX', t: 'toggle', label: 'X labels', half: true },
      { k: 'props.yTicks', t: 'range', label: 'Y ticks', min: 2, max: 6 }, { k: 'props.grid', t: 'toggle', label: 'Grid lines' }, { k: 'props.gridColor', t: 'color', label: 'Grid color', when: (e) => e.props.grid },
      { k: 'props.showAvg', t: 'toggle', label: 'Average line' }, { k: 'props.avgColor', t: 'color', label: 'Average color', when: (e) => e.props.showAvg },
      { k: 'props.showMinMax', t: 'toggle', label: 'Best / worst markers' },
      { k: 'props.baseline', t: 'seg', label: 'Y range', options: [['zero', 'Auto'], ['tight', 'Tight']] },
    ] },
    { title: 'Animation extras', fields: [{ k: 'props.cursor', t: 'toggle', label: 'Moving cursor & value' }, { k: 'props.cursorColor', t: 'color', label: 'Cursor color' }, { k: 'props.ghost', t: 'toggle', label: 'Show upcoming part faintly' }, { k: 'props.ghostOpacity', t: 'range', label: 'Upcoming opacity', min: 0, max: 1, step: 0.05, when: (e) => e.props.ghost }] },
    { title: 'Title text', ts: 'props.titleTS' }, { title: 'Axis text', ts: 'props.axisTS' }, { title: 'Cursor value text', ts: 'props.valueTS' },
  ],
});

export function drawGraph(ctx, el, W, H, env) {
  const p = el.props, act = env.act;
  if (!act) return;
  const metric = p.metric;
  const units = env.units;
  const P = progOf(el, env), st = stateOf(el, env);
  const xAxis = p.xAxis;
  const xCur = P >= 1 ? 1 : xAxis === 'time' ? st.tt / act.C.tt[act.n - 1] : st.d / act.C.d[act.n - 1];
  // layout
  let top = 0;
  const title = p.title || (GRAPH_METRICS.find((m) => m[0] === metric) || [, ''])[1];
  if (p.showTitle && title) {
    const tb = textBox(ctx, title, p.titleTS);
    drawText(ctx, title, 0, tb.asc, p.titleTS, env);
    const avgStr = `AVG ${fmtMetric(metric, metric === 'pace' ? act.avgPace : seriesAvg(act, metric), units)} ${metricUnit(metric, units)}`;
    if (p.showAvg) drawText(ctx, avgStr, W, tb.asc, { ...p.axisTS, size: p.titleTS.size * 0.8 }, env, 'right');
    top = tb.h + p.titleTS.size * 0.5;
  }
  const isSplit = /splitBars|step|lollipop/.test(p.design);
  const G = graphSeries(act, metric, xAxis, p.smooth, Math.max(40, Math.min(800, Math.round(p.samples || 240))));
  let splits = null, lo = G.lo, hi = G.hi;
  if (isSplit) {
    splits = getSplits(act, splitCfgOf(el, env)).filter((s) => isNum(splitValue(s, metric)));
    const v = splits.map((s) => splitValue(s, metric)); if (v.length) { lo = Math.min(...v); hi = Math.max(...v); }
  }
  if (!isNum(lo) || !isNum(hi)) return;
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  const span = hi - lo;
  if (p.baseline === 'zero' && metric !== 'pace' && metric !== 'ele' && metric !== 'hr') lo = Math.min(lo, 0);
  else lo -= span * (p.baseline === 'tight' ? 0.02 : 0.25);
  hi += span * (p.yPad ?? 0.08);
  const inv = metric === 'pace' && p.invert;
  const axs = p.axisTS;
  const yLabW = p.showY ? Math.max(measureStr(ctx, fmtMetric(metric, hi, units), axs), measureStr(ctx, fmtMetric(metric, lo, units), axs)) + axs.size * 0.6 : 0;
  const xLabH = p.showX ? axs.size * 1.6 : 0;
  const px0 = yLabW, py0 = top + (p.cursor && P < 1 ? p.valueTS.size * 1.8 : axs.size * 0.4), pw = Math.max(10, W - px0), ph = Math.max(10, H - py0 - xLabH);
  const Y = (v) => { const k = (v - lo) / (hi - lo); return py0 + ph - (inv ? 1 - k : k) * ph; };
  const X = (x) => px0 + x * pw;
  const baseY = py0 + ph;
  // grid + y labels
  if (p.grid || p.showY) {
    for (let i = 0; i < p.yTicks; i++) {
      const v = lo + ((hi - lo) * i) / (p.yTicks - 1), y = Y(v);
      if (p.grid) { ctx.save(); ctx.strokeStyle = col(p.gridColor, env); ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(px0, y); ctx.lineTo(px0 + pw, y); ctx.stroke(); ctx.restore(); }
      if (p.showY) drawText(ctx, fmtMetric(metric, v, units), px0 - axs.size * 0.5, y + axs.size * 0.35, axs, env, 'right');
    }
  }
  // x labels
  if (p.showX) {
    const XT = xAxis === 'time' ? act.C.tt[act.n - 1] : act.C.d[act.n - 1];
    const ul = xAxis === 'time' ? 60 : unitLen(units);
    const total = XT / ul;
    const steps = [1, 2, 5, 10, 15, 20, 30, 60, 120];
    const step = steps.find((s) => total / s <= 6) || 240;
    for (let v = 0; v <= total + 1e-6; v += step) {
      const x = X((v * ul) / XT);
      const lab = xAxis === 'time' ? (v >= 60 ? `${Math.floor(v / 60)}h${v % 60 ? String(v % 60).padStart(2, '0') : ''}` : `${v}m`) : String(v);
      if (x < W - axs.size * 2.5) drawText(ctx, lab, x, H - axs.size * 0.2, axs, env, v === 0 ? 'left' : 'center');
    }
    drawText(ctx, xAxis === 'time' ? '' : distUnit(units), W, H - axs.size * 0.2, axs, env, 'right');
  }
  const colorAt = (v, x) => {
    if (p.colorMode === 'zones' && metric === 'hr') return zoneColor(v, env, p);
    if (p.colorMode === 'ramp') { let k = (v - G.lo) / (G.hi - G.lo || 1); if (metric === 'pace') k = 1 - k; return rampColor(RAMPS[p.ramp] || RAMPS.heat, k); }
    return null;
  };
  const lineCol = col(p.lineColor, env), fillCol = col(p.fillColor, env);
  const drawPass = (limit, ghost) => {
    ctx.save();
    if (ghost) ctx.globalAlpha *= p.ghostOpacity;
    if (isSplit) drawSplitDesign(ctx, p, splits, metric, X, Y, baseY, limit, env, colorAt, lineCol, fillCol, act, xAxis);
    else drawSeriesDesign(ctx, p, G, X, Y, baseY, py0, ph, limit, env, colorAt, lineCol, fillCol);
    ctx.restore();
  };
  if (P < 1 && p.ghost && !env.static) drawPass(1, true);
  // clip progress
  ctx.save();
  if (P < 1) { ctx.beginPath(); ctx.rect(0, 0, X(xCur), H); ctx.clip(); }
  drawPass(xCur, false);
  ctx.restore();
  // avg line
  if (p.showAvg) {
    const av = isSplit ? avgOf(splits.map((s) => splitValue(s, metric))) : G.avg;
    if (isNum(av)) { const y = Y(av); ctx.save(); ctx.strokeStyle = col(p.avgColor, env); ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(px0, y); ctx.lineTo(px0 + pw, y); ctx.stroke(); ctx.restore(); }
  }
  if (p.showMinMax && !isSplit) {
    let bi = -1, wi = -1;
    for (let i = 0; i < G.N; i++) { const v = G.ys[i]; if (!isNum(v)) continue; if (bi < 0 || (metric === 'pace' ? v < G.ys[bi] : v > G.ys[bi])) bi = i; if (wi < 0 || (metric === 'pace' ? v > G.ys[wi] : v < G.ys[wi])) wi = i; }
    for (const [i, c] of [[bi, '@accent'], [wi, '@muted']]) { if (i < 0 || G.xs[i] > xCur) continue; const x = X(G.xs[i]), y = Y(clamp(G.ys[i], lo, hi)); ctx.save(); ctx.fillStyle = col(c, env); ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore(); drawText(ctx, fmtMetric(metric, G.ys[i], units), x, y - 16, axs, env, 'center'); }
  }
  // cursor
  if (p.cursor && P < 1 && !env.static) {
    const i = Math.min(G.N - 1, Math.round(xCur * (G.N - 1)));
    const v = isSplit ? currentSplitVal(splits, metric, xCur, act, xAxis) : G.ys[i];
    if (isNum(v)) {
      const x = X(xCur), y = Y(clamp(v, lo, hi));
      ctx.save(); ctx.strokeStyle = col(p.cursorColor, env); ctx.globalAlpha *= 0.6; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, py0); ctx.lineTo(x, py0 + ph); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.fillStyle = col(p.cursorColor, env); ctx.shadowColor = col(p.lineColor, env); ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(x, y, Math.max(8, p.lineW * 1.6), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      const label = `${fmtMetric(metric, v, units)} ${metricUnit(metric, units)}`;
      const vb = textBox(ctx, label, p.valueTS), padx = p.valueTS.size * 0.5, bw = vb.w + padx * 2, bh = vb.asc + padx * 1.2;
      const bx = clamp(x - bw / 2, 0, W - bw), by = Math.max(top, py0 - bh - 6);
      ctx.save(); ctx.fillStyle = col(p.cursorColor, env); rrect(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); ctx.restore();
      drawText(ctx, label, bx + padx, by + bh / 2 + vb.asc / 2, p.valueTS, env);
    }
  }
}
function avgOf(a) { const v = a.filter(isNum); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : NaN; }
function seriesAvg(act, m) { return { hr: act.avgHr, ele: (act.maxEle + act.minEle) / 2, speed: act.avgSpeed, cad: act.avgCad, pwr: act.avgPwr }[m]; }
export function zoneColor(hr, env, p) {
  const s = env.settings || {}, max = s.maxHr || (isNum(env.act?.maxHr) ? Math.max(env.act.maxHr, 170) : 190);
  const pct = s.zonePct || [50, 60, 70, 80, 90];
  let z = 0; for (let k = 0; k < 5; k++) if (hr >= (pct[k] / 100) * max) z = k;
  return ((p && p.zoneColors) || s.zoneColors || ZONE_COLORS)[z];
}
function currentSplitVal(splits, metric, x, act, xAxis) {
  const tot = xAxis === 'time' ? act.C.tt[act.n - 1] : act.C.d[act.n - 1];
  for (const s of splits) { const e = (xAxis === 'time' ? s.endT : s.endD) / tot; if (x <= e + 1e-9) return splitValue(s, metric); }
  return NaN;
}

function drawSeriesDesign(ctx, p, G, X, Y, baseY, py0, ph, limit, env, colorAt, lineCol, fillCol) {
  const { xs, ys, N } = G;
  const pts = [];
  for (let i = 0; i < N; i++) if (isNum(ys[i])) pts.push([X(xs[i]), Y(clampV(ys[i], G, p)), ys[i], xs[i]]);
  if (!pts.length) return;
  const d = p.design;
  const path = () => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); };
  const smoothPath = () => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  };
  const fillArea = (style) => {
    smoothPath(); ctx.lineTo(pts[pts.length - 1][0], baseY); ctx.lineTo(pts[0][0], baseY); ctx.closePath();
    ctx.save(); ctx.globalAlpha *= p.fillOpacity; ctx.fillStyle = style; ctx.fill(); ctx.restore();
  };
  const vGrad = () => { const g = ctx.createLinearGradient(0, py0, 0, py0 + ph); g.addColorStop(0, fillCol); g.addColorStop(1, col(p.fillColor2, env)); return g; };
  const hGradByValue = () => { const g = ctx.createLinearGradient(pts[0][0], 0, pts[pts.length - 1][0], 0); const step = Math.max(1, Math.floor(pts.length / 60)); for (let i = 0; i < pts.length; i += step) g.addColorStop(clamp((pts[i][0] - pts[0][0]) / (pts[pts.length - 1][0] - pts[0][0] || 1), 0, 1), colorAt(pts[i][2]) || lineCol); return g; };
  const strokeLine = (w, color, glow) => {
    ctx.save(); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = p.colorMode !== 'solid' ? hGradByValue() : color;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    smoothPath(); ctx.stroke(); ctx.restore();
  };
  switch (d) {
    case 'line': case 'spark': strokeLine(p.lineW, lineCol); break;
    case 'neon': strokeLine(p.lineW * 2.2, lineCol, 30); strokeLine(p.lineW * 0.6, '#ffffff'); break;
    case 'area': fillArea(p.colorMode !== 'solid' ? hGradByValue() : fillCol); strokeLine(p.lineW, lineCol); break;
    case 'gradArea': fillArea(p.colorMode !== 'solid' ? hGradByValue() : vGrad()); strokeLine(p.lineW, lineCol); break;
    case 'heat': { const pm = p.colorMode; p.colorMode = pm === 'solid' ? 'ramp' : pm; strokeLine(p.lineW, lineCol); p.colorMode = pm; break; }
    case 'ribbon': { const pm = p.colorMode; p.colorMode = pm === 'solid' ? 'ramp' : pm; fillArea(hGradByValue()); p.colorMode = pm; break; }
    case 'bars': case 'dots': {
      const n = Math.max(3, p.bars | 0), bw = (X(1) - X(0)) / n;
      for (let b = 0; b < n; b++) {
        let s = 0, c = 0;
        for (let i = 0; i < N; i++) if (xs[i] >= b / n && xs[i] < (b + 1) / n && isNum(ys[i])) { s += ys[i]; c++; }
        if (!c) continue;
        const v = s / c, y = Y(clampV(v, G, p)), x = X(b / n) + (bw * p.barGap) / 2, w = bw * (1 - p.barGap);
        ctx.fillStyle = colorAt(v) || fillCol;
        if (d === 'dots') { ctx.beginPath(); ctx.arc(x + w / 2, y, Math.max(3, w / 2), 0, Math.PI * 2); ctx.fill(); }
        else { rrect(ctx, x, Math.min(y, baseY), w, Math.abs(baseY - y), Math.min(p.barRadius, w / 2)); ctx.fill(); }
      }
      break;
    }
    case 'lollipop': break;
    default: strokeLine(p.lineW, lineCol);
  }
}
function clampV(v, G, p) { return v; }

function drawSplitDesign(ctx, p, splits, metric, X, Y, baseY, limit, env, colorAt, lineCol, fillCol, act, xAxis) {
  const tot = xAxis === 'time' ? act.C.tt[act.n - 1] : act.C.d[act.n - 1];
  const d = p.design;
  if (d === 'step') {
    ctx.save(); ctx.lineWidth = p.lineW; ctx.strokeStyle = lineCol; ctx.lineJoin = 'round'; ctx.beginPath();
    splits.forEach((s, i) => { const x0 = X((xAxis === 'time' ? s.startT : s.startD) / tot), x1 = X((xAxis === 'time' ? s.endT : s.endD) / tot), y = Y(splitValue(s, metric)); if (!i) ctx.moveTo(x0, y); else ctx.lineTo(x0, y); ctx.lineTo(x1, y); });
    ctx.stroke();
    ctx.lineTo(X(1), baseY); ctx.lineTo(X(0), baseY); ctx.closePath(); ctx.globalAlpha *= p.fillOpacity * 0.6; ctx.fillStyle = fillCol; ctx.fill();
    ctx.restore(); return;
  }
  for (const s of splits) {
    const x0 = X((xAxis === 'time' ? s.startT : s.startD) / tot), x1 = X((xAxis === 'time' ? s.endT : s.endD) / tot);
    const v = splitValue(s, metric), y = Y(v);
    const gap = (x1 - x0) * p.barGap / 2, w = Math.max(1, x1 - x0 - gap * 2);
    let c = colorAt(v) || (s.fastest ? lineCol : fillCol);
    if (d === 'lollipop') {
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, p.lineW * 0.6); ctx.beginPath(); ctx.moveTo(x0 + gap + w / 2, baseY); ctx.lineTo(x0 + gap + w / 2, y); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x0 + gap + w / 2, y, Math.max(6, Math.min(w / 2, 18)), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else {
      ctx.save(); ctx.fillStyle = c; ctx.globalAlpha *= s.fastest || p.colorMode !== 'solid' ? 1 : 0.85;
      rrect(ctx, x0 + gap, Math.min(y, baseY), w, Math.abs(baseY - y), Math.min(p.barRadius, w / 2)); ctx.fill(); ctx.restore();
    }
  }
}
