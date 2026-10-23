// General helpers: math, formatting, colors, object paths.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const clone = (o) => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
export const isNum = (v) => typeof v === 'number' && isFinite(v);
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

export function getPath(obj, path) {
  if (!path) return obj;
  let o = obj;
  for (const k of path.split('.')) { if (o == null) return undefined; o = o[k]; }
  return o;
}
export function setPath(obj, path, val) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
    o = o[ks[i]];
  }
  o[ks[ks.length - 1]] = val;
}
export function deepMerge(target, src) {
  for (const k in src) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
      deepMerge(target[k], v);
    } else target[k] = Array.isArray(v) ? clone(v) : v;
  }
  return target;
}

// ---------- Units & formatting ----------
export const KM = 1000, MI = 1609.344, FT = 0.3048;
export function unitLen(units) { return units === 'imperial' ? MI : KM; }
export function distUnit(units) { return units === 'imperial' ? 'mi' : 'km'; }
export function paceUnit(units) { return units === 'imperial' ? '/mi' : '/km'; }
export function elevUnit(units) { return units === 'imperial' ? 'ft' : 'm'; }
export function speedUnit(units) { return units === 'imperial' ? 'mph' : 'km/h'; }

export function fmtDuration(sec, style = 'auto') {
  if (!isNum(sec)) return '--:--';
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  if (style === 'hms' || (style === 'auto' && h > 0)) return `${h}:${p(m)}:${p(s)}`;
  if (style === 'words') return h ? `${h}h ${p(m)}m` : `${m}m ${p(s)}s`;
  if (style === 'hm') return `${h}h ${m}m`;
  return `${m}:${p(s)}`;
}
// pace: seconds per km (internal). returns string in chosen units.
export function fmtPace(secPerKm, units) {
  if (!isNum(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return '--:--';
  let s = units === 'imperial' ? secPerKm * (MI / KM) : secPerKm;
  s = Math.round(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function fmtDist(m, units, dec = 2) {
  if (!isNum(m)) return '--';
  return (m / unitLen(units)).toFixed(dec);
}
export function fmtElev(m, units) {
  if (!isNum(m)) return '--';
  return Math.round(units === 'imperial' ? m / FT : m).toString();
}
export function fmtSpeed(mps, units) {
  if (!isNum(mps)) return '--';
  return (units === 'imperial' ? mps * 2.236936 : mps * 3.6).toFixed(1);
}
export function fmtInt(v) { return isNum(v) ? Math.round(v).toString() : '--'; }
export function fmtNum(v, dec = 1) { return isNum(v) ? v.toFixed(dec) : '--'; }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export { DAYS, DAYS_L, MONTHS };
export function fmtDate(d, style = 'medium') {
  if (!(d instanceof Date) || isNaN(d)) return '';
  const day = d.getDate(), mo = d.getMonth(), y = d.getFullYear();
  switch (style) {
    case 'short': return `${day} ${MONTHS[mo]}`;
    case 'long': return `${DAYS_L[d.getDay()]}, ${day} ${MONTHS_L[mo]} ${y}`;
    case 'numeric': return `${String(day).padStart(2, '0')}/${String(mo + 1).padStart(2, '0')}/${y}`;
    case 'iso': return `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'us': return `${MONTHS[mo]} ${day}, ${y}`;
    case 'weekday': return DAYS_L[d.getDay()];
    default: return `${day} ${MONTHS[mo]} ${y}`;
  }
}
export function fmtTime(d, h24 = true) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  if (h24) return `${String(h).padStart(2, '0')}:${m}`;
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ap}`;
}
export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

// ---------- Colors ----------
export function parseColor(c) {
  if (!c || c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
  return { r: 255, g: 255, b: 255, a: 1 };
}
const hx = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
export function toHex({ r, g, b, a = 1 }) { return '#' + hx(r) + hx(g) + hx(b) + (a < 1 ? hx(a * 255) : ''); }
export function hex6(c) { const p = parseColor(c); return '#' + hx(p.r) + hx(p.g) + hx(p.b); }
export function alphaOf(c) { return parseColor(c).a; }
export function withAlpha(c, a) { const p = parseColor(c); return `rgba(${p.r},${p.g},${p.b},${clamp(p.a * a, 0, 1)})`; }
export function setAlpha(c, a) { const p = parseColor(c); p.a = a; return toHex(p); }
export function mix(c1, c2, t) {
  const a = parseColor(c1), b = parseColor(c2);
  return `rgba(${Math.round(lerp(a.r, b.r, t))},${Math.round(lerp(a.g, b.g, t))},${Math.round(lerp(a.b, b.b, t))},${lerp(a.a, b.a, t)})`;
}
export function luminance(c) { const p = parseColor(c); return (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255; }
// Multi-stop gradient sampling: stops = [c0, c1, c2...]
export function rampColor(stops, t) {
  t = clamp(t, 0, 1);
  if (stops.length === 1) return stops[0];
  const f = t * (stops.length - 1), i = Math.min(Math.floor(f), stops.length - 2);
  return mix(stops[i], stops[i + 1], f - i);
}

// ---------- Easing ----------
export const EASE = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(c));
  return e;
}
export function readFileAs(file, as = 'arrayBuffer') {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = rej;
    if (as === 'text') r.readAsText(file); else if (as === 'dataURL') r.readAsDataURL(file); else r.readAsArrayBuffer(file);
  });
}
