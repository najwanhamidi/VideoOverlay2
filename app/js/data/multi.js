// Multi-activity (weekly / any period) aggregation.
import { isNum, clamp, isoWeek, fmtDate } from '../util.js';

export function multiStats(acts, opts = {}) {
  const list = acts.filter((a) => a.enabled !== false);
  const S = { runs: list.length, list };
  let dist = 0, time = 0, el = 0, asc = 0, cal = 0, hrW = 0, hrT = 0, cadW = 0, cadT = 0, maxHr = NaN, longest = null, fastest = null;
  for (const a of list) {
    dist += a.distance; time += a.moving; el += a.elapsed; asc += a.ascent || 0; cal += a.calories || 0;
    if (isNum(a.avgHr)) { hrW += a.avgHr * a.moving; hrT += a.moving; }
    if (isNum(a.avgCad)) { cadW += a.avgCad * a.moving; cadT += a.moving; }
    if (isNum(a.maxHr) && !(a.maxHr <= maxHr)) maxHr = a.maxHr;
    if (!longest || a.distance > longest.distance) longest = a;
    if (a.distance > 500 && (!fastest || a.avgPace < fastest.avgPace)) fastest = a;
  }
  Object.assign(S, {
    distance: dist, time, elapsed: el, ascent: asc, calories: cal,
    avgPace: dist > 0 ? time / (dist / 1000) : NaN, avgHr: hrT ? hrW / hrT : NaN, avgCad: cadT ? cadW / cadT : NaN,
    maxHr, longest, fastest, avgDist: list.length ? dist / list.length : NaN, avgTime: list.length ? time / list.length : NaN,
  });
  // period
  const all = list.length ? list : acts;
  const first = all.length ? all[0].start : new Date();
  const last = all.length ? all[all.length - 1].start : new Date();
  const ws = opts.weekStart ?? 1; // Monday
  const p0 = new Date(first); p0.setHours(0, 0, 0, 0); p0.setDate(p0.getDate() - ((p0.getDay() - ws + 7) % 7));
  const span = Math.max(7, Math.ceil((new Date(last).setHours(23, 59, 59) - p0) / 86400000));
  const nDays = opts.days || (span <= 7 ? 7 : span);
  const days = [];
  for (let i = 0; i < nDays; i++) {
    const d = new Date(p0); d.setDate(p0.getDate() + i);
    days.push({ date: d, distance: 0, time: 0, runs: [], ascent: 0 });
  }
  for (const a of list) {
    const d0 = new Date(a.start); d0.setHours(0, 0, 0, 0);
    const idx = Math.round((d0 - p0) / 86400000);
    if (days[idx]) { days[idx].distance += a.distance; days[idx].time += a.moving; days[idx].ascent += a.ascent || 0; days[idx].runs.push(a); }
  }
  S.days = days; S.periodStart = p0; S.periodEnd = days[days.length - 1].date;
  S.firstDate = first; S.lastDate = last;
  S.activeDays = days.filter((d) => d.runs.length).length;
  S.week = isoWeek(first);
  S.rangeText = (style) => {
    const a = opts.rangeFromRuns ? first : p0, b = opts.rangeFromRuns ? last : S.periodEnd;
    if (style === 'numeric') return `${fmtDate(a, 'numeric')} – ${fmtDate(b, 'numeric')}`;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()} – ${fmtDate(b, 'medium')}`;
    return `${fmtDate(a, 'short')} – ${fmtDate(b, 'medium')}`;
  };
  return S;
}

// Animated cumulative state (counts up with t)
export function multiStateAt(S, t) {
  t = clamp(t, 0, 1);
  if (t >= 1) return { ...S, t: 1, shown: S.list.length };
  const k = t;
  const shown = Math.min(S.list.length, Math.floor(t * S.list.length + 1e-9) + (t > 0 ? 1 : 0));
  return {
    ...S, t, shown,
    distance: S.distance * k, time: S.time * k, elapsed: S.elapsed * k, ascent: S.ascent * k, calories: S.calories * k,
    runs: Math.floor(S.runs * k + 1e-6), activeDays: Math.floor(S.activeDays * k + 1e-6),
  };
}
