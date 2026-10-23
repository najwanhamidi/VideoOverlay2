// Activity model: normalisation, splits/laps, cumulative stats, best efforts, HR zones.
import { isNum, clamp, uid } from '../util.js';

const R = 6371008.8;
function hav(lat1, lon1, lat2, lon2) {
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function defaultName(date, sport) {
  const h = date.getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 14 ? 'Lunch' : h < 18 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  const s = { running: 'Run', cycling: 'Ride', walking: 'Walk', hiking: 'Hike' }[sport] || 'Run';
  return `${part} ${s}`;
}

export function buildActivity(raw, opts = {}) {
  let recs = raw.records.filter((r) => isNum(r.ts)).sort((a, b) => a.ts - b.ts);
  // de-duplicate identical timestamps (keep last non-null values merged)
  const merged = [];
  for (const r of recs) {
    const last = merged[merged.length - 1];
    if (last && last.ts === r.ts) { for (const k in r) if (r[k] != null) last[k] = r[k]; } else merged.push({ ...r });
  }
  recs = merged;
  if (recs.length < 2) throw new Error('Activity has too few data points');
  const n = recs.length;
  const col = () => new Float64Array(n).fill(NaN);
  const C = { t: col(), tt: col(), d: col(), lat: col(), lon: col(), ele: col(), hr: col(), cad: col(), pwr: col(), spd: col(), temp: col() };
  const t0 = recs[0].ts;
  const hasGps = recs.some((r) => isNum(r.lat) && isNum(r.lon) && !(r.lat === 0 && r.lon === 0));
  const hasDist = recs.filter((r) => isNum(r.dist)).length > n * 0.5;
  // timer pauses from events
  const pauses = [];
  if (raw.timer && raw.timer.length) {
    let off = null;
    for (const e of raw.timer) {
      if (!e.on && off == null) off = e.ts;
      else if (e.on && off != null) { pauses.push([off, e.ts]); off = null; }
    }
  }
  let d = 0, lastLat = NaN, lastLon = NaN, lastDist = 0, tt = 0;
  for (let i = 0; i < n; i++) {
    const r = recs[i];
    C.t[i] = r.ts - t0;
    if (isNum(r.lat) && isNum(r.lon) && !(r.lat === 0 && r.lon === 0)) { C.lat[i] = r.lat; C.lon[i] = r.lon; }
    if (hasDist) {
      if (isNum(r.dist)) { d = Math.max(d, r.dist); lastDist = d; } else d = lastDist;
    } else if (hasGps && isNum(C.lat[i])) {
      if (isNum(lastLat)) d += hav(lastLat, lastLon, C.lat[i], C.lon[i]);
      lastLat = C.lat[i]; lastLon = C.lon[i];
    }
    C.d[i] = d;
    if (isNum(r.ele)) C.ele[i] = r.ele;
    if (isNum(r.hr) && r.hr > 20 && r.hr < 250) C.hr[i] = r.hr;
    if (isNum(r.cad)) C.cad[i] = r.cad;
    if (isNum(r.pwr)) C.pwr[i] = r.pwr;
    if (isNum(r.temp)) C.temp[i] = r.temp;
    if (isNum(r.spd)) C.spd[i] = r.spd;
    // timer time
    if (i > 0) {
      const dt = C.t[i] - C.t[i - 1];
      let add = dt;
      if (pauses.length) {
        const a = recs[i - 1].ts, b = r.ts;
        for (const [p0, p1] of pauses) { const o = Math.min(b, p1) - Math.max(a, p0); if (o > 0) add -= o; }
        add = Math.max(0, add);
      } else if (dt > 10) {
        const dd = C.d[i] - C.d[i - 1];
        if (dd / dt < 0.6) add = Math.min(dt, 1); // auto-pause gap
      }
      tt += add;
    }
    C.tt[i] = tt;
  }
  // fill gaps (forward fill short holes) for hr / ele
  for (const k of ['hr', 'ele', 'cad']) {
    let last = NaN, firstVal = NaN;
    for (let i = 0; i < n; i++) { if (isNum(C[k][i])) { firstVal = C[k][i]; break; } }
    for (let i = 0; i < n; i++) { if (isNum(C[k][i])) last = C[k][i]; else if (isNum(last)) C[k][i] = last; else if (isNum(firstVal)) C[k][i] = firstVal; }
  }
  // speed from distance if missing
  if (!Array.from(C.spd).some(isNum)) {
    for (let i = 0; i < n; i++) {
      const j0 = Math.max(0, i - 1), j1 = Math.min(n - 1, i + 1);
      const dt = C.tt[j1] - C.tt[j0];
      C.spd[i] = dt > 0 ? (C.d[j1] - C.d[j0]) / dt : 0;
    }
  } else for (let i = 0; i < n; i++) if (!isNum(C.spd[i])) C.spd[i] = i ? C.spd[i - 1] : 0;

  const S = raw.summary || {};
  const distance = isNum(S.dist) && S.dist > 0 ? S.dist : C.d[n - 1];
  const moving = isNum(S.timer) && S.timer > 0 ? S.timer : C.tt[n - 1];
  const elapsed = isNum(S.elapsed) && S.elapsed > 0 ? S.elapsed : C.t[n - 1];
  // prefix sums for weighted averages
  const P = { hr: new Float64Array(n), hrT: new Float64Array(n), cad: new Float64Array(n), cadT: new Float64Array(n), pwr: new Float64Array(n), pwrT: new Float64Array(n), up: new Float64Array(n), down: new Float64Array(n) };
  // smoothed elevation for ascent
  const eleS = smoothArr(C.ele, C.t, 15);
  let lastE = eleS[0];
  for (let i = 1; i < n; i++) {
    const dt = Math.min(C.tt[i] - C.tt[i - 1], 10);
    P.hr[i] = P.hr[i - 1]; P.hrT[i] = P.hrT[i - 1]; P.cad[i] = P.cad[i - 1]; P.cadT[i] = P.cadT[i - 1]; P.pwr[i] = P.pwr[i - 1]; P.pwrT[i] = P.pwrT[i - 1];
    P.up[i] = P.up[i - 1]; P.down[i] = P.down[i - 1];
    if (isNum(C.hr[i]) && dt > 0) { P.hr[i] += C.hr[i] * dt; P.hrT[i] += dt; }
    if (isNum(C.cad[i]) && C.cad[i] > 0 && dt > 0) { P.cad[i] += C.cad[i] * dt; P.cadT[i] += dt; }
    if (isNum(C.pwr[i]) && dt > 0) { P.pwr[i] += C.pwr[i] * dt; P.pwrT[i] += dt; }
    if (isNum(eleS[i]) && isNum(lastE)) {
      const de = eleS[i] - lastE;
      if (Math.abs(de) >= 1) { if (de > 0) P.up[i] += de; else P.down[i] -= de; lastE = eleS[i]; }
    } else if (isNum(eleS[i])) lastE = eleS[i];
  }
  const hrVals = Array.from(C.hr).filter(isNum);
  const eleVals = Array.from(C.ele).filter(isNum);
  const startDate = new Date((isNum(S.start) ? S.start : t0) * 1000);
  const sport = raw.sport || 'running';
  const act = {
    id: uid(), name: opts.name || raw.name || defaultName(startDate, sport), file: opts.file || '', sport,
    start: startDate, n, C, P, eleS, hasGps, hasHr: hrVals.length > 0, hasEle: eleVals.length > 0,
    hasCad: Array.from(C.cad).some((v) => v > 0), hasPwr: Array.from(C.pwr).some(isNum),
    distance, moving, elapsed,
    avgHr: isNum(S.avgHr) ? S.avgHr : P.hrT[n - 1] ? P.hr[n - 1] / P.hrT[n - 1] : NaN,
    maxHr: isNum(S.maxHr) ? S.maxHr : hrVals.length ? maxOf(hrVals) : NaN,
    minHr: hrVals.length ? minOf(hrVals) : NaN,
    ascent: isNum(S.ascent) ? S.ascent : P.up[n - 1],
    descent: isNum(S.descent) ? S.descent : P.down[n - 1],
    maxEle: eleVals.length ? maxOf(eleVals) : NaN, minEle: eleVals.length ? minOf(eleVals) : NaN,
    calories: isNum(S.cal) ? S.cal : estimateCalories(distance),
    avgCad: isNum(S.cad) ? S.cad : P.cadT[n - 1] ? P.cad[n - 1] / P.cadT[n - 1] : NaN,
    maxCad: isNum(S.maxCad) ? S.maxCad : maxOf(Array.from(C.cad).filter(isNum)) || NaN,
    avgPwr: isNum(S.pwr) ? S.pwr : P.pwrT[n - 1] ? P.pwr[n - 1] / P.pwrT[n - 1] : NaN,
    maxPwr: isNum(S.maxPwr) ? S.maxPwr : NaN,
    avgTemp: avg(Array.from(C.temp).filter(isNum)),
    rawLaps: raw.laps || [], raw0: t0, _cache: {},
  };
  act.avgPace = act.distance > 0 ? act.moving / (act.distance / 1000) : NaN;
  act.avgSpeed = act.moving > 0 ? act.distance / act.moving : NaN;
  act.maxSpeed = maxOf(smoothSpeed(act, 10).filter(isNum));
  act.steps = isNum(act.avgCad) ? Math.round(act.avgCad * act.moving / 60) : NaN;
  return act;
}
export function maxOf(a) { let m = -Infinity; for (const v of a) if (v > m) m = v; return m === -Infinity ? NaN : m; }
export function minOf(a) { let m = Infinity; for (const v of a) if (v < m) m = v; return m === Infinity ? NaN : m; }
function avg(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN; }
function estimateCalories(dist) { return Math.round((dist / 1000) * 65); }

function smoothArr(arr, t, win) {
  const n = arr.length, out = new Float64Array(n).fill(NaN);
  let j0 = 0, j1 = 0, sum = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    while (j1 < n && t[j1] <= t[i] + win / 2) { if (isNum(arr[j1])) { sum += arr[j1]; cnt++; } j1++; }
    while (j0 < n && t[j0] < t[i] - win / 2) { if (isNum(arr[j0])) { sum -= arr[j0]; cnt--; } j0++; }
    out[i] = cnt ? sum / cnt : arr[i];
  }
  return out;
}

// Speed smoothed over a time window (seconds) based on distance/timer-time.
export function smoothSpeed(act, win = 20) {
  const key = 'spd' + win;
  if (act._cache[key]) return act._cache[key];
  const { C, n } = act, out = new Array(n);
  let j0 = 0, j1 = 0;
  for (let i = 0; i < n; i++) {
    while (j1 < n - 1 && C.tt[j1] < C.tt[i] + win / 2) j1++;
    while (j0 < i && C.tt[j0] < C.tt[i] - win / 2) j0++;
    const dt = C.tt[j1] - C.tt[j0];
    out[i] = dt > 0 ? (C.d[j1] - C.d[j0]) / dt : (i ? out[i - 1] : 0);
  }
  return (act._cache[key] = out);
}
export function smoothSeries(act, key, win) {
  const ck = 'S' + key + win;
  if (act._cache[ck]) return act._cache[ck];
  const arr = key === 'ele' ? act.eleS : act.C[key];
  return (act._cache[ck] = Array.from(win > 1 ? smoothArr(arr, act.C.tt, win) : arr));
}

// ---- interpolation helpers ----
function bsearch(arr, v) { // last index with arr[i] <= v
  let lo = 0, hi = arr.length - 1;
  if (v <= arr[0]) return 0;
  if (v >= arr[hi]) return hi;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] <= v) lo = m; else hi = m; }
  return lo;
}
// fractional index where column `key` reaches value v (monotonic columns: d, tt, t)
export function fracIndex(act, key, v) {
  const a = act.C[key], i = bsearch(a, v);
  if (i >= act.n - 1) return act.n - 1;
  const span = a[i + 1] - a[i];
  return i + (span > 0 ? clamp((v - a[i]) / span, 0, 1) : 0);
}
export function valAt(act, key, fi) {
  const a = key === 'ele' ? act.eleS : act.C[key]; const i = Math.floor(fi), f = fi - i;
  if (i >= act.n - 1) return a[act.n - 1];
  const x = a[i], y = a[i + 1];
  if (!isNum(x)) return y; if (!isNum(y)) return x;
  return x + (y - x) * f;
}
function prefAt(arr, fi, n) { const i = Math.floor(fi), f = fi - i; if (i >= n - 1) return arr[n - 1]; return arr[i] + (arr[i + 1] - arr[i]) * f; }

// Stats over [fi0, fi1] fractional index range
export function rangeStats(act, fi0, fi1) {
  const { P, n } = act;
  const d = valAt(act, 'd', fi1) - (fi0 <= 0 ? 0 : valAt(act, 'd', fi0));
  const time = valAt(act, 'tt', fi1) - valAt(act, 'tt', fi0);
  const el = valAt(act, 't', fi1) - valAt(act, 't', fi0);
  const hrT = prefAt(P.hrT, fi1, n) - prefAt(P.hrT, fi0, n);
  const cadT = prefAt(P.cadT, fi1, n) - prefAt(P.cadT, fi0, n);
  const pwrT = prefAt(P.pwrT, fi1, n) - prefAt(P.pwrT, fi0, n);
  let maxHr = NaN;
  for (let i = Math.ceil(fi0); i <= Math.min(n - 1, Math.floor(fi1)); i++) if (isNum(act.C.hr[i]) && !(act.C.hr[i] <= maxHr)) maxHr = act.C.hr[i];
  return {
    distance: d, time, elapsed: el,
    pace: d > 0 ? time / (d / 1000) : NaN, speed: time > 0 ? d / time : NaN,
    avgHr: hrT > 0 ? (prefAt(P.hr, fi1, n) - prefAt(P.hr, fi0, n)) / hrT : NaN, maxHr,
    avgCad: cadT > 0 ? (prefAt(P.cad, fi1, n) - prefAt(P.cad, fi0, n)) / cadT : NaN,
    avgPwr: pwrT > 0 ? (prefAt(P.pwr, fi1, n) - prefAt(P.pwr, fi0, n)) / pwrT : NaN,
    ascent: prefAt(P.up, fi1, n) - prefAt(P.up, fi0, n),
    descent: prefAt(P.down, fi1, n) - prefAt(P.down, fi0, n),
    eleStart: valAt(act, 'ele', fi0), eleEnd: valAt(act, 'ele', fi1),
  };
}

// ---- Splits ----
// cfg: { mode: 'km'|'mi'|'laps'|'dist'|'time'|'custom', every: number, custom: '1,2.5,5', minPartial: meters }
export function splitKey(cfg) { return JSON.stringify([cfg.mode, cfg.every, cfg.custom, cfg.minPartial, cfg.unitsMi]); }
export function getSplits(act, cfg = { mode: 'km' }) {
  const key = 'splits' + splitKey(cfg);
  if (act._cache[key]) return act._cache[key];
  const res = computeSplits(act, cfg);
  return (act._cache[key] = res);
}
function computeSplits(act, cfg) {
  const total = act.C.d[act.n - 1];
  const bounds = []; // fractional indexes
  let mode = cfg.mode || 'km';
  if (mode === 'laps') {
    const laps = act.rawLaps.filter((l) => isNum(l.start));
    if (laps.length >= 1) {
      const out = [];
      for (let i = 0; i < laps.length; i++) {
        const l = laps[i];
        const s = l.start - act.raw0;
        const e = i < laps.length - 1 && isNum(laps[i + 1].start) ? laps[i + 1].start - act.raw0 : isNum(l.end) ? l.end - act.raw0 : act.C.t[act.n - 1];
        const fi0 = fracIndex(act, 't', s), fi1 = fracIndex(act, 't', e);
        const st = rangeStats(act, fi0, fi1);
        // prefer device lap values
        if (isNum(l.timer) && l.timer > 0) st.time = l.timer;
        if (isNum(l.dist)) st.distance = l.dist;
        if (isNum(l.avgHr)) st.avgHr = l.avgHr;
        if (isNum(l.maxHr)) st.maxHr = l.maxHr;
        if (isNum(l.cad)) st.avgCad = l.cad;
        if (isNum(l.ascent)) st.ascent = l.ascent;
        st.pace = st.distance > 0 ? st.time / (st.distance / 1000) : NaN;
        st.speed = st.time > 0 ? st.distance / st.time : NaN;
        if (st.distance < 1 && st.time < 1) continue;
        out.push(finishSplit(act, st, out.length, fi0, fi1, false));
      }
      if (out.length) return markExtremes(out);
    }
    mode = 'km'; // fallback when file has no laps
  }
  if (mode === 'km' || mode === 'mi' || mode === 'dist') {
    const step = mode === 'km' ? 1000 : mode === 'mi' ? 1609.344 : Math.max(50, (cfg.every || 1) * (cfg.unitsMi ? 1609.344 : 1000));
    for (let x = step; x < total - 0.5; x += step) bounds.push(fracIndex(act, 'd', x));
  } else if (mode === 'time') {
    const step = Math.max(10, (cfg.every || 5) * 60), totT = act.C.tt[act.n - 1];
    for (let x = step; x < totT - 0.5; x += step) bounds.push(fracIndex(act, 'tt', x));
  } else if (mode === 'custom') {
    const mul = cfg.unitsMi ? 1609.344 : 1000;
    const marks = String(cfg.custom || '').split(/[,;\s]+/).map(parseFloat).filter((v) => v > 0).map((v) => v * mul).sort((a, b) => a - b);
    for (const m of marks) if (m < total) bounds.push(fracIndex(act, 'd', m));
  }
  const out = [];
  let prev = 0;
  const all = [...bounds, act.n - 1];
  for (let i = 0; i < all.length; i++) {
    const fi = all[i];
    const st = rangeStats(act, prev, fi);
    const partial = i === all.length - 1 && mode !== 'custom' && bounds.length > 0;
    if (partial && st.distance < (cfg.minPartial ?? 50) && mode !== 'time') { prev = fi; continue; }
    out.push(finishSplit(act, st, out.length, prev, fi, partial));
    prev = fi;
  }
  return markExtremes(out);
}
function finishSplit(act, st, idx, fi0, fi1, partial) {
  return { ...st, index: idx + 1, fi0, fi1, partial, startD: valAt(act, 'd', fi0), endD: valAt(act, 'd', fi1), startT: valAt(act, 'tt', fi0), endT: valAt(act, 'tt', fi1) };
}
function markExtremes(list) {
  const full = list.filter((s) => !s.partial && isNum(s.pace));
  const src = full.length ? full : list;
  let fast = null, slow = null;
  for (const s of src) { if (!fast || s.pace < fast.pace) fast = s; if (!slow || s.pace > slow.pace) slow = s; }
  if (fast) fast.fastest = true; if (slow && slow !== fast) slow.slowest = true;
  return list;
}

// ---- Current state at progress t (0..1) ----
export function stateAt(act, t, by = 'time') {
  t = clamp(t, 0, 1);
  const fi = by === 'distance' ? fracIndex(act, 'd', t * act.C.d[act.n - 1]) : fracIndex(act, 'tt', t * act.C.tt[act.n - 1]);
  const st = rangeStats(act, 0, fi);
  const spd = smoothSpeed(act, 20);
  const i = Math.floor(fi);
  const scaleD = act.C.d[act.n - 1] > 0 ? act.distance / act.C.d[act.n - 1] : 1;
  const scaleT = act.C.tt[act.n - 1] > 0 ? act.moving / act.C.tt[act.n - 1] : 1;
  const final = t >= 1;
  return {
    t, fi,
    distance: final ? act.distance : st.distance * scaleD,
    time: final ? act.moving : st.time * scaleT,
    elapsed: final ? act.elapsed : st.elapsed,
    avgPace: final ? act.avgPace : st.pace,
    avgHr: final ? act.avgHr : st.avgHr,
    maxHr: final ? act.maxHr : st.maxHr,
    ascent: final ? act.ascent : st.ascent, descent: final ? act.descent : st.descent,
    avgCad: final ? act.avgCad : st.avgCad, avgPwr: final ? act.avgPwr : st.avgPwr,
    calories: act.calories * (final ? 1 : st.distance / Math.max(1, act.C.d[act.n - 1])),
    hr: valAt(act, 'hr', fi), ele: valAt(act, 'ele', fi), cad: valAt(act, 'cad', fi), pwr: valAt(act, 'pwr', fi),
    speed: spd[Math.min(i, act.n - 1)], pace: spd[Math.min(i, act.n - 1)] > 0.3 ? 1000 / spd[Math.min(i, act.n - 1)] : NaN,
    clock: new Date(act.start.getTime() + valAt(act, 't', fi) * 1000),
    lat: valAt(act, 'lat', fi), lon: valAt(act, 'lon', fi),
    d: valAt(act, 'd', fi), tt: valAt(act, 'tt', fi),
  };
}

// ---- Best efforts ----
export const BEST_DISTS = [[400, '400 m'], [1000, '1K'], [1609.344, '1 Mile'], [3000, '3K'], [5000, '5K'], [10000, '10K'], [15000, '15K'], [21097.5, 'Half'], [30000, '30K'], [42195, 'Marathon']];
export function bestEfforts(act) {
  if (act._cache.best) return act._cache.best;
  const { C, n } = act, res = [];
  for (const [dist, label] of BEST_DISTS) {
    if (C.d[n - 1] < dist) continue;
    let best = Infinity, j = 0;
    for (let i = 0; i < n; i++) {
      while (j < n - 1 && C.d[j] - C.d[i] < dist) j++;
      if (C.d[j] - C.d[i] < dist) break;
      const over = C.d[j] - C.d[i] - dist, segD = C.d[j] - C.d[j - 1];
      const tj = segD > 0 ? C.tt[j] - (C.tt[j] - C.tt[j - 1]) * (over / segD) : C.tt[j];
      const time = tj - C.tt[i];
      if (time > 0 && time < best) best = time;
    }
    if (isFinite(best)) res.push({ dist, label, time: best, pace: best / (dist / 1000) });
  }
  return (act._cache.best = res);
}

// ---- HR zones ----
export function hrZones(act, settings) {
  const max = settings.maxHr || (isNum(act.maxHr) ? Math.max(act.maxHr, 170) : 190);
  const pct = settings.zonePct || [50, 60, 70, 80, 90];
  const lim = pct.map((p) => (p / 100) * max);
  const out = [0, 0, 0, 0, 0];
  const { C, n } = act;
  for (let i = 1; i < n; i++) {
    const h = C.hr[i], dt = Math.min(C.tt[i] - C.tt[i - 1], 10);
    if (!isNum(h) || dt <= 0) continue;
    let z = 0; for (let k = 0; k < 5; k++) if (h >= lim[k]) z = k;
    out[z] += dt;
  }
  const tot = out.reduce((a, b) => a + b, 0) || 1;
  return out.map((s, i) => ({ zone: i + 1, time: s, pct: s / tot, min: Math.round(lim[i]), max: i < 4 ? Math.round(lim[i + 1]) : Math.round(max) }));
}
export function zoneOf(hr, settings, act) {
  const max = settings.maxHr || (act && isNum(act.maxHr) ? Math.max(act.maxHr, 170) : 190);
  const pct = settings.zonePct || [50, 60, 70, 80, 90];
  let z = 0; for (let k = 0; k < 5; k++) if (hr >= (pct[k] / 100) * max) z = k;
  return z;
}

// ---- Sample activity (for trying the app without a file) ----
export function sampleRaw(seed = 1, opts = {}) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const km = opts.km || 10.2;
  const basePace = opts.pace || 330; // s/km
  const start = opts.start || new Date(2026, 9, 19, 6, 30).getTime() / 1000;
  const records = [];
  let lat = 3.1478, lon = 101.6953, heading = 0.6, d = 0, t = 0, hr = 118, ele = 60;
  const laps = [];
  let lapStart = start, lapD = 0;
  while (d < km * 1000) {
    const prog = d / (km * 1000);
    const pace = basePace * (1 + 0.06 * Math.sin(prog * 9 + seed) - 0.05 * prog + (rnd() - 0.5) * 0.08) * (prog > 0.9 ? 0.93 : 1);
    const v = 1000 / pace;
    const dt = 1;
    t += dt; d += v * dt;
    heading += (rnd() - 0.5) * 0.12 + Math.sin(t / 240) * 0.02;
    const loopPull = Math.sin(prog * Math.PI * 2);
    lat += (Math.cos(heading + loopPull) * v * dt) / 111320;
    lon += (Math.sin(heading + loopPull) * v * dt) / (111320 * Math.cos(lat * Math.PI / 180));
    ele += Math.sin(t / 300) * 0.08 + (rnd() - 0.5) * 0.2;
    const target = 132 + prog * 30 + (pace < basePace ? 8 : 0);
    hr += (target - hr) * 0.03 + (rnd() - 0.5) * 1.2;
    records.push({ ts: start + t, lat, lon, ele, hr: Math.round(hr), cad: 168 + Math.round((rnd() - 0.5) * 6 + (basePace - pace) * 0.15), dist: d, spd: v, pwr: null, temp: 27 });
    if (d - lapD >= 1000) { laps.push({ start: lapStart, end: start + t, timer: start + t - lapStart, elapsed: start + t - lapStart, dist: d - lapD }); lapStart = start + t; lapD = d; }
  }
  laps.push({ start: lapStart, end: start + t, timer: start + t - lapStart, elapsed: start + t - lapStart, dist: d - lapD });
  return { sport: 'running', records, laps, timer: [], summary: { start }, name: opts.name || 'Sample Night Run' };
}
