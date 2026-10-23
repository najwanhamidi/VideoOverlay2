// Route map widget.
import { register, progOf, stateOf } from './core.js';
import { TS, drawText, col, drawIcon, textBox } from '../render/draw.js';
import { isNum, rampColor, unitLen, clamp } from '../util.js';
import { RAMPS, zoneColor } from './graph.js';
import { smoothSpeed } from '../data/activity.js';

export function routePoints(act, maxPts = 1500) {
  const key = 'route' + maxPts;
  if (act._cache[key]) return act._cache[key];
  const { C, n } = act;
  const idx = [];
  for (let i = 0; i < n; i++) if (isNum(C.lat[i]) && isNum(C.lon[i])) idx.push(i);
  if (idx.length < 2) return (act._cache[key] = null);
  const step = Math.max(1, Math.floor(idx.length / maxPts));
  const sel = idx.filter((_, k) => k % step === 0); if (sel[sel.length - 1] !== idx[idx.length - 1]) sel.push(idx[idx.length - 1]);
  const lat0 = C.lat[sel[0]] * Math.PI / 180;
  const pts = sel.map((i) => {
    const x = C.lon[i] * Math.PI / 180 * Math.cos(lat0) * 6371000;
    const y = -(C.lat[i] * Math.PI / 180) * 6371000;
    return { x, y, d: C.d[i], tt: C.tt[i], i };
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  return (act._cache[key] = { pts, minX, maxX, minY, maxY });
}

export const MAP_LINES = [['solid', 'Solid'], ['glow', 'Glow'], ['casing', 'Outlined'], ['gradient', 'Gradient'], ['heat', 'Heat (data)'], ['dashed', 'Dashed'], ['dots', 'Dotted'], ['double', 'Double'], ['shadow3d', '3D shadow']];
export const MARKERS = [['none', 'None'], ['dot', 'Dot'], ['ring', 'Ring'], ['flag', 'Flag'], ['pin', 'Pin'], ['label', 'Label'], ['checkered', 'Checkered']];

register({
  type: 'map', name: 'Route map', auto: false, w: 700, h: 700, modes: ['single'],
  props: () => ({
    line: 'glow', color: '@accent', color2: '@accent2', width: 10, heatMetric: 'pace', ramp: 'heat',
    casingColor: '#000000', casingW: 6, glow: 26, rotate: 0, fitPad: 0.06,
    start: 'dot', end: 'checkered', markerColor: '#ffffff', startColor: '#22c55e', endColor: '#ef4444', markerSize: 1,
    kmMarkers: 'none', kmColor: '#ffffff', fillInside: false, fillColor: '@accent', fillOpacity: 0.15,
    dot: 'pulse', dotColor: '#ffffff', remaining: 'ghost', ghostColor: '#ffffff40',
    labelTS: TS({ size: 22, weight: 800, transform: 'upper', spacing: 1, color: '#0d0f14', role: 'fixed' }),
  }),
  render(ctx, el, W, H, env) { drawMap(ctx, el, W, H, env); },
  schema: () => [
    { title: 'Route line', fields: [
      { k: 'props.line', t: 'select', label: 'Line design', options: MAP_LINES },
      { k: 'props.color', t: 'color', label: 'Color' }, { k: 'props.color2', t: 'color', label: 'End color', when: (e) => e.props.line === 'gradient' || e.props.line === 'double' },
      { k: 'props.heatMetric', t: 'seg', label: 'Heat by', options: [['pace', 'Pace'], ['hr', 'HR'], ['ele', 'Elevation'], ['zones', 'HR zones']], when: (e) => e.props.line === 'heat' },
      { k: 'props.ramp', t: 'select', label: 'Heat palette', options: Object.keys(RAMPS).map((k) => [k, k]), when: (e) => e.props.line === 'heat' },
      { k: 'props.width', t: 'range', label: 'Width', min: 1, max: 40, step: 0.5 },
      { k: 'props.casingColor', t: 'color', label: 'Outline / shadow color', when: (e) => /casing|shadow3d/.test(e.props.line) }, { k: 'props.casingW', t: 'range', label: 'Outline width', min: 1, max: 30, when: (e) => e.props.line === 'casing' },
      { k: 'props.glow', t: 'range', label: 'Glow', min: 0, max: 80, when: (e) => e.props.line === 'glow' },
      { k: 'props.rotate', t: 'range', label: 'Rotate route', min: -180, max: 180 }, { k: 'props.fitPad', t: 'range', label: 'Padding', min: 0, max: 0.4, step: 0.01 },
      { k: 'props.fillInside', t: 'toggle', label: 'Fill inside route' }, { k: 'props.fillColor', t: 'color', label: 'Fill color', when: (e) => e.props.fillInside }, { k: 'props.fillOpacity', t: 'range', label: 'Fill opacity', min: 0, max: 1, step: 0.05, when: (e) => e.props.fillInside },
    ] },
    { title: 'Markers', fields: [
      { k: 'props.start', t: 'select', label: 'Start marker', options: MARKERS }, { k: 'props.startColor', t: 'color', label: 'Start color' },
      { k: 'props.end', t: 'select', label: 'Finish marker', options: MARKERS }, { k: 'props.endColor', t: 'color', label: 'Finish color' },
      { k: 'props.markerSize', t: 'range', label: 'Marker size', min: 0.3, max: 3, step: 0.05 },
      { k: 'props.kmMarkers', t: 'select', label: 'Distance markers', options: [['none', 'None'], ['dots', 'Dots'], ['numbers', 'Numbers'], ['ticks', 'Ticks']] }, { k: 'props.kmColor', t: 'color', label: 'Marker color', when: (e) => e.props.kmMarkers !== 'none' },
    ] },
    { title: 'Animation', fields: [
      { k: 'props.dot', t: 'select', label: 'Runner marker', options: [['none', 'None'], ['dot', 'Dot'], ['pulse', 'Pulse'], ['runner', 'Runner icon'], ['arrow', 'Arrow']] }, { k: 'props.dotColor', t: 'color', label: 'Marker color' },
      { k: 'props.remaining', t: 'seg', label: 'Upcoming route', options: [['ghost', 'Faint'], ['hide', 'Hidden']] }, { k: 'props.ghostColor', t: 'color', label: 'Faint color', when: (e) => e.props.remaining === 'ghost' },
    ] },
    { title: 'Label text', ts: 'props.labelTS' },
  ],
});

function drawMap(ctx, el, W, H, env) {
  const p = el.props, act = env.act;
  const R = act && routePoints(act);
  if (!R) { ctx.save(); ctx.strokeStyle = '#ffffff55'; ctx.setLineDash([10, 10]); ctx.lineWidth = 3; ctx.strokeRect(0, 0, W, H); ctx.restore(); drawText(ctx, 'No GPS data', W / 2, H / 2, TS({ size: 32 }), env, 'center'); return; }
  const P = progOf(el, env), st = stateOf(el, env);
  const rot = (p.rotate || 0) * Math.PI / 180, cs = Math.cos(rot), sn = Math.sin(rot);
  const cx0 = (R.minX + R.maxX) / 2, cy0 = (R.minY + R.maxY) / 2;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const rp = R.pts.map((q) => { const x = (q.x - cx0) * cs - (q.y - cy0) * sn, y = (q.x - cx0) * sn + (q.y - cy0) * cs; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); return { x, y, d: q.d, tt: q.tt, i: q.i }; });
  const pad = Math.min(W, H) * p.fitPad + p.width * p.markerSize * 1.2 + 6;
  const sc = Math.min((W - 2 * pad) / Math.max(1, maxX - minX), (H - 2 * pad) / Math.max(1, maxY - minY));
  const ox = W / 2 - ((minX + maxX) / 2) * sc, oy = H / 2 - ((minY + maxY) / 2) * sc;
  const pts = rp.map((q) => ({ x: q.x * sc + ox, y: q.y * sc + oy, d: q.d, tt: q.tt, i: q.i }));
  // progress point
  const curD = P >= 1 ? Infinity : st.d;
  let k = pts.length - 1;
  if (P < 1) { k = 0; while (k < pts.length - 1 && pts[k + 1].d <= curD) k++; }
  let tip = pts[k];
  if (P < 1 && k < pts.length - 1) { const a = pts[k], b = pts[k + 1]; const f = b.d > a.d ? clamp((curD - a.d) / (b.d - a.d), 0, 1) : 0; tip = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, d: curD }; }
  const done = pts.slice(0, k + 1); if (P < 1) done.push(tip);
  const path = (list) => { ctx.beginPath(); list.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); };
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const color = col(p.color, env);
  if (p.fillInside) { path(pts); ctx.closePath(); ctx.save(); ctx.globalAlpha *= p.fillOpacity; ctx.fillStyle = col(p.fillColor, env); ctx.fill(); ctx.restore(); }
  if (P < 1 && p.remaining === 'ghost') { path(pts); ctx.strokeStyle = col(p.ghostColor, env); ctx.lineWidth = p.width; ctx.stroke(); }
  const drawLine = (list) => {
    if (list.length < 2) return;
    switch (p.line) {
      case 'glow': ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = p.glow; path(list); ctx.strokeStyle = color; ctx.lineWidth = p.width; ctx.stroke(); ctx.restore(); ctx.save(); path(list); ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = p.width * 0.3; ctx.stroke(); ctx.restore(); break;
      case 'casing': path(list); ctx.strokeStyle = col(p.casingColor, env); ctx.lineWidth = p.width + p.casingW * 2; ctx.stroke(); path(list); ctx.strokeStyle = color; ctx.lineWidth = p.width; ctx.stroke(); break;
      case 'shadow3d': ctx.save(); ctx.translate(p.width * 0.6, p.width * 1.2); path(list); ctx.strokeStyle = col(p.casingColor, env); ctx.globalAlpha *= 0.55; ctx.lineWidth = p.width; ctx.stroke(); ctx.restore(); path(list); ctx.strokeStyle = color; ctx.lineWidth = p.width; ctx.stroke(); break;
      case 'dashed': ctx.save(); ctx.setLineDash([p.width * 2.5, p.width * 1.8]); path(list); ctx.strokeStyle = color; ctx.lineWidth = p.width; ctx.stroke(); ctx.restore(); break;
      case 'dots': ctx.save(); ctx.setLineDash([0.1, p.width * 2]); path(list); ctx.strokeStyle = color; ctx.lineWidth = p.width; ctx.stroke(); ctx.restore(); break;
      case 'double': path(list); ctx.strokeStyle = color; ctx.lineWidth = p.width * 2.2; ctx.stroke(); path(list); ctx.strokeStyle = col(p.color2, env); ctx.lineWidth = p.width * 0.8; ctx.stroke(); break;
      case 'gradient': case 'heat': {
        const c2 = col(p.color2, env);
        const spd = p.heatMetric === 'pace' ? smoothSpeed(act, 30) : null;
        let lo = Infinity, hi = -Infinity;
        const valOf = (q) => p.heatMetric === 'pace' ? spd[q.i] : p.heatMetric === 'ele' ? act.eleS[q.i] : act.C.hr[q.i];
        if (p.line === 'heat') for (const q of pts) { const v = valOf(q); if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
        if (p.heatMetric === 'pace' && isFinite(lo)) { const vs = pts.map(valOf).filter(isNum).sort((a, b) => a - b); lo = vs[Math.floor(vs.length * 0.05)]; hi = vs[Math.floor(vs.length * 0.95)]; }
        const total = pts[pts.length - 1].d || 1;
        ctx.lineWidth = p.width;
        for (let i = 1; i < list.length; i++) {
          const a = list[i - 1], b = list[i];
          let c;
          if (p.line === 'gradient') c = rampColor([color, c2], (b.d || 0) / total);
          else if (p.heatMetric === 'zones') c = zoneColor(act.C.hr[a.i ?? 0], env);
          else { const v = valOf(a.i != null ? a : list[i - 2] || a); c = rampColor(RAMPS[p.ramp] || RAMPS.heat, isNum(v) ? (v - lo) / (hi - lo || 1) : 0.5); }
          ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        break;
      }
      default: path(list); ctx.strokeStyle = color; ctx.lineWidth = p.width; ctx.stroke();
    }
  };
  drawLine(done);
  // distance markers
  if (p.kmMarkers !== 'none') {
    const ul = unitLen(env.units); let next = ul, n = 1;
    for (let i = 1; i < pts.length; i++) {
      while (pts[i].d >= next && next <= (P < 1 ? curD : Infinity)) {
        const a = pts[i - 1], b = pts[i], f = b.d > a.d ? (next - a.d) / (b.d - a.d) : 0;
        const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
        const r = p.width * 0.9 * p.markerSize;
        ctx.fillStyle = col(p.kmColor, env);
        if (p.kmMarkers === 'dots') { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
        else if (p.kmMarkers === 'ticks') { ctx.save(); ctx.strokeStyle = col(p.kmColor, env); ctx.lineWidth = 3; const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * r * 1.6, y - Math.sin(ang) * r * 1.6); ctx.lineTo(x + Math.cos(ang) * r * 1.6, y + Math.sin(ang) * r * 1.6); ctx.stroke(); ctx.restore(); }
        else { const rr = Math.max(r * 1.5, p.labelTS.size * 0.75); ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); const ts = { ...p.labelTS, size: rr * 0.95 }; const tb = textBox(ctx, String(n), ts); drawText(ctx, String(n), x, y + tb.asc / 2, ts, env, 'center'); }
        next += ul; n++;
      }
    }
  }
  const ms = Math.max(8, p.width * 1.1) * p.markerSize;
  marker(ctx, p.start, pts[0], ms, col(p.startColor, env), 'START', p, env);
  if (P >= 1 || env.static) marker(ctx, p.end, pts[pts.length - 1], ms, col(p.endColor, env), 'FINISH', p, env);
  // runner marker
  if (P < 1 && !env.static && p.dot !== 'none') {
    const c = col(p.dotColor, env);
    if (p.dot === 'pulse') { const ph = (env.time * 1.4) % 1; ctx.save(); ctx.globalAlpha *= 1 - ph; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(tip.x, tip.y, ms * (1 + ph * 2.2), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (p.dot === 'runner') { ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(tip.x, tip.y, ms * 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); drawIcon(ctx, 'footprints', tip.x - ms * 1.2, tip.y - ms * 1.2, ms * 2.4, '#0d0f14', { stroke: 2.4 }); }
    else if (p.dot === 'arrow') { const a = done[Math.max(0, done.length - 3)]; const ang = Math.atan2(tip.y - a.y, tip.x - a.x); ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(ang); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(ms * 1.8, 0); ctx.lineTo(-ms, -ms * 1.2); ctx.lineTo(-ms * 0.4, 0); ctx.lineTo(-ms, ms * 1.2); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else { ctx.save(); ctx.fillStyle = c; ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(tip.x, tip.y, ms, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  ctx.restore();
}

function marker(ctx, kind, q, s, c, label, p, env) {
  if (!q || kind === 'none') return;
  ctx.save();
  switch (kind) {
    case 'dot': ctx.fillStyle = c; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.35; ctx.beginPath(); ctx.arc(q.x, q.y, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
    case 'ring': ctx.strokeStyle = c; ctx.lineWidth = s * 0.45; ctx.beginPath(); ctx.arc(q.x, q.y, s * 1.2, 0, Math.PI * 2); ctx.stroke(); break;
    case 'flag': drawIcon(ctx, 'flag', q.x - s * 0.5, q.y - s * 3, s * 3, c, { stroke: 2.4, fill: true, fillColor: c }); break;
    case 'pin': drawIcon(ctx, 'map-pin', q.x - s * 1.6, q.y - s * 3.2, s * 3.2, '#ffffff', { stroke: 1.8, fill: true, fillColor: c }); break;
    case 'checkered': {
      const n = 4, cs = s * 0.65, x0 = q.x - (n * cs) / 2, y0 = q.y - (n * cs) / 2;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 - 2, y0 - 2, n * cs + 4, n * cs + 4);
      ctx.fillStyle = '#111111'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) ctx.fillRect(x0 + i * cs, y0 + j * cs, cs, cs);
      break;
    }
    case 'label': {
      const ts = p.labelTS, tb = textBox(ctx, label, ts), pad = ts.size * 0.45, w = tb.w + pad * 2, h = tb.asc + pad * 1.6;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(q.x, q.y, s * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(q.x - w / 2, q.y - h - s * 1.2, w, h, h / 2) : ctx.rect(q.x - w / 2, q.y - h - s * 1.2, w, h); ctx.fill();
      drawText(ctx, label, q.x, q.y - s * 1.2 - h / 2 + tb.asc / 2, ts, env, 'center'); break;
    }
  }
  ctx.restore();
}
