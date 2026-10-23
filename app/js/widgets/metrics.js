// Metric definitions used by stat-style widgets and text tokens.
import { fmtDist, fmtDuration, fmtPace, fmtElev, fmtSpeed, fmtInt, fmtDate, fmtTime, distUnit, paceUnit, elevUnit, speedUnit, isNum } from '../util.js';
import { getSplits, bestEfforts } from '../data/activity.js';

const dec = (el, d) => (el && el.props && isNum(el.props.decimals) ? el.props.decimals : d);
const ts = (el) => (el && el.props && el.props.timeStyle) || 'auto';

// value(st, env, el) -> string. `st` = state at progress (stateAt) or final.
export const SINGLE_METRICS = {
  distance: { label: 'Distance', icon: 'route', unit: (u) => distUnit(u), value: (s, e, el) => fmtDist(s.distance, e.units, dec(el, 2)) },
  time: { label: 'Time', icon: 'timer', unit: () => '', value: (s, e, el) => fmtDuration(s.time, ts(el)) },
  elapsed: { label: 'Elapsed', icon: 'clock', unit: () => '', value: (s, e, el) => fmtDuration(s.elapsed, ts(el)) },
  avgPace: { label: 'Avg Pace', icon: 'gauge', unit: (u) => paceUnit(u), value: (s, e) => fmtPace(s.avgPace, e.units) },
  pace: { label: 'Pace', icon: 'gauge', unit: (u) => paceUnit(u), live: true, value: (s, e) => fmtPace(s.pace, e.units) },
  avgSpeed: { label: 'Avg Speed', icon: 'zap', unit: (u) => speedUnit(u), value: (s, e) => fmtSpeed(s.time > 0 ? s.distance / s.time : NaN, e.units) },
  speed: { label: 'Speed', icon: 'zap', unit: (u) => speedUnit(u), live: true, value: (s, e) => fmtSpeed(s.speed, e.units) },
  avgHr: { label: 'Avg HR', icon: 'heart', unit: () => 'bpm', value: (s) => fmtInt(s.avgHr), need: 'hasHr' },
  maxHr: { label: 'Max HR', icon: 'heart-pulse', unit: () => 'bpm', value: (s) => fmtInt(s.maxHr), need: 'hasHr' },
  hr: { label: 'Heart Rate', icon: 'heart-pulse', unit: () => 'bpm', live: true, value: (s) => fmtInt(s.hr), need: 'hasHr' },
  ascent: { label: 'Elev Gain', icon: 'mountain', unit: (u) => elevUnit(u), value: (s, e) => fmtElev(s.ascent, e.units) },
  descent: { label: 'Elev Loss', icon: 'trending-down', unit: (u) => elevUnit(u), value: (s, e) => fmtElev(s.descent, e.units) },
  ele: { label: 'Elevation', icon: 'mountain-snow', unit: (u) => elevUnit(u), live: true, value: (s, e) => fmtElev(s.ele, e.units) },
  maxEle: { label: 'Max Elev', icon: 'mountain-snow', unit: (u) => elevUnit(u), value: (s, e) => fmtElev(e.act?.maxEle, e.units) },
  calories: { label: 'Calories', icon: 'flame', unit: () => 'kcal', value: (s) => fmtInt(s.calories) },
  avgCad: { label: 'Cadence', icon: 'footprints', unit: () => 'spm', value: (s) => fmtInt(s.avgCad), need: 'hasCad' },
  cad: { label: 'Cadence', icon: 'footprints', unit: () => 'spm', live: true, value: (s) => fmtInt(s.cad), need: 'hasCad' },
  avgPwr: { label: 'Avg Power', icon: 'bolt', unit: () => 'W', value: (s) => fmtInt(s.avgPwr), need: 'hasPwr' },
  pwr: { label: 'Power', icon: 'bolt', unit: () => 'W', live: true, value: (s) => fmtInt(s.pwr), need: 'hasPwr' },
  steps: { label: 'Steps', icon: 'footprints', unit: () => '', value: (s, e) => (isNum(e.act?.steps) ? Math.round(e.act.steps * (s.t ?? 1)).toLocaleString() : '--') },
  temp: { label: 'Temp', icon: 'thermometer', unit: () => '°C', value: (s, e) => (isNum(e.act?.avgTemp) ? Math.round(e.act.avgTemp).toString() : '--') },
  date: { label: 'Date', icon: 'calendar', unit: () => '', value: (s, e, el) => fmtDate(e.act?.start, el?.props?.dateStyle || 'medium') },
  startTime: { label: 'Start', icon: 'sunrise', unit: () => '', value: (s, e) => fmtTime(e.act?.start, e.settings?.h24 !== false) },
  clock: { label: 'Time of Day', icon: 'clock-3', unit: () => '', live: true, value: (s, e) => fmtTime(s.clock, e.settings?.h24 !== false) },
  splits: { label: 'Splits', icon: 'flag', unit: () => '', value: (s, e, el) => (e.act ? String(getSplits(e.act, splitCfgOf(el, e)).length) : '--') },
  fastestSplit: { label: 'Fastest Split', icon: 'trophy', unit: (u) => paceUnit(u), value: (s, e, el) => { const f = e.act && getSplits(e.act, splitCfgOf(el, e)).find((x) => x.fastest); return f ? fmtPace(f.pace, e.units) : '--'; } },
  best1k: { label: 'Best 1K', icon: 'medal', unit: () => '', value: (s, e) => best(e, 1000) },
  bestMile: { label: 'Best Mile', icon: 'medal', unit: () => '', value: (s, e) => best(e, 1609.344) },
  best5k: { label: 'Best 5K', icon: 'medal', unit: () => '', value: (s, e) => best(e, 5000) },
  best10k: { label: 'Best 10K', icon: 'medal', unit: () => '', value: (s, e) => best(e, 10000) },
};
function best(e, d) { if (!e.act) return '--'; const b = bestEfforts(e.act).find((x) => Math.abs(x.dist - d) < 1); return b ? fmtDuration(b.time) : '--'; }
export function splitCfgOf(el, env) {
  const c = (el && el.props && el.props.splits) || { mode: 'km' };
  return { ...c, unitsMi: env.units === 'imperial', mode: c.mode === 'km' && env.units === 'imperial' ? 'mi' : c.mode };
}

export const MULTI_METRICS = {
  distance: { label: 'Total Distance', icon: 'route', unit: (u) => distUnit(u), value: (s, e, el) => fmtDist(s.distance, e.units, dec(el, 1)) },
  time: { label: 'Total Time', icon: 'timer', unit: () => '', value: (s, e, el) => fmtDuration(s.time, ts(el) === 'auto' ? 'hms' : ts(el)) },
  runs: { label: 'Runs', icon: 'footprints', unit: () => '', value: (s) => String(s.runs) },
  avgPace: { label: 'Avg Pace', icon: 'gauge', unit: (u) => paceUnit(u), value: (s, e) => fmtPace(s.avgPace, e.units) },
  avgHr: { label: 'Avg HR', icon: 'heart', unit: () => 'bpm', value: (s) => fmtInt(s.avgHr) },
  maxHr: { label: 'Max HR', icon: 'heart-pulse', unit: () => 'bpm', value: (s) => fmtInt(s.maxHr) },
  ascent: { label: 'Elev Gain', icon: 'mountain', unit: (u) => elevUnit(u), value: (s, e) => fmtElev(s.ascent, e.units) },
  calories: { label: 'Calories', icon: 'flame', unit: () => 'kcal', value: (s) => fmtInt(s.calories) },
  longest: { label: 'Longest Run', icon: 'trophy', unit: (u) => distUnit(u), value: (s, e) => (s.longest ? fmtDist(s.longest.distance, e.units, 1) : '--') },
  avgDist: { label: 'Avg Distance', icon: 'route', unit: (u) => distUnit(u), value: (s, e) => fmtDist(s.avgDist, e.units, 1) },
  avgTime: { label: 'Avg Duration', icon: 'clock', unit: () => '', value: (s) => fmtDuration(s.avgTime) },
  fastest: { label: 'Fastest Pace', icon: 'zap', unit: (u) => paceUnit(u), value: (s, e) => (s.fastest ? fmtPace(s.fastest.avgPace, e.units) : '--') },
  activeDays: { label: 'Active Days', icon: 'calendar-days', unit: () => '', value: (s) => String(s.activeDays) },
  avgCad: { label: 'Avg Cadence', icon: 'footprints', unit: () => 'spm', value: (s) => fmtInt(s.avgCad) },
  week: { label: 'Week', icon: 'calendar', unit: () => '', value: (s) => String(s.week) },
  range: { label: 'Period', icon: 'calendar', unit: () => '', value: (s, e, el) => s.rangeText(el?.props?.dateStyle) },
};

export function metricsFor(mode) { return mode === 'multi' ? MULTI_METRICS : SINGLE_METRICS; }

// Text tokens: {distance} {time} etc. Returns replaced string.
export function expandTokens(str, env, st, el) {
  if (!str || str.indexOf('{') < 0) return str;
  return str.replace(/\{([a-zA-Z0-9_]+)(?::([a-z]+))?\}/g, (m, key, mod) => {
    if (key === 'name') return env.mode === 'multi' ? env.title || 'Weekly Recap' : env.act?.name || 'My Run';
    if (key === 'title') return env.title || env.act?.name || '';
    if (key === 'unit') return distUnit(env.units);
    if (key === 'paceunit') return paceUnit(env.units);
    const M = metricsFor(env.mode)[key];
    if (!M || !st) return m;
    let v = M.value(st, env, el);
    if (mod === 'u') v += ' ' + M.unit(env.units);
    return v;
  });
}
export const TOKEN_HELP = {
  single: ['{name}', '{distance}', '{time}', '{avgPace}', '{avgHr}', '{maxHr}', '{ascent}', '{calories}', '{avgCad}', '{date}', '{startTime}', '{unit}', '{paceunit}', '{distance:u}'],
  multi: ['{title}', '{distance}', '{time}', '{runs}', '{avgPace}', '{avgHr}', '{ascent}', '{longest}', '{range}', '{week}', '{unit}', '{distance:u}'],
};
