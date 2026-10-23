// Canvas drawing primitives: colors/themes, text with spacing/stroke/shadow, backdrops, icons.
import { ICONS } from './icondata.js';
import { parseColor, clamp } from '../util.js';

export function col(c, env) {
  if (typeof c !== 'string') return '#ffffff';
  if (c[0] === '@') return (env && env.theme && env.theme[c.slice(1)]) || '#ffffff';
  return c;
}

// ---------- Text style ----------
export function TS(o = {}) {
  return {
    font: 'Inter', weight: 700, italic: false, size: 48, color: '@text', fill: 'solid', color2: '@accent',
    spacing: 0, lineHeight: 1.15, transform: 'none', stroke: 0, strokeColor: '#000000',
    shadow: false, shadowColor: '#00000099', shadowBlur: 10, shadowX: 0, shadowY: 3, opacity: 1, ...o,
  };
}
export function isTS(o) { return o && typeof o === 'object' && 'font' in o && 'size' in o && 'weight' in o; }
export function fontStr(ts, k = 1) {
  return `${ts.italic ? 'italic ' : ''}${ts.weight || 400} ${Math.max(1, ts.size * k)}px "${ts.font}", "Inter", system-ui, sans-serif`;
}
export function applyTransform(str, ts) {
  str = str == null ? '' : String(str);
  if (ts.transform === 'upper') return str.toUpperCase();
  if (ts.transform === 'lower') return str.toLowerCase();
  if (ts.transform === 'title') return str.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return str;
}
const capCache = new Map();
export function capRatio(ctx, ts) {
  const key = ts.font + ts.weight + ts.italic;
  let r = capCache.get(key);
  if (r) return r;
  ctx.save(); ctx.font = fontStr({ ...ts, size: 100 });
  const m = ctx.measureText('H0');
  r = m.actualBoundingBoxAscent ? m.actualBoundingBoxAscent / 100 : 0.72;
  ctx.restore();
  if (document.fonts && document.fonts.check && document.fonts.check(fontStr({ ...ts, size: 20 }))) capCache.set(key, r);
  return r;
}
export function clearFontCache() { capCache.clear(); }

export function measureStr(ctx, str, ts) {
  ctx.font = fontStr(ts);
  str = applyTransform(str, ts);
  if (!ts.spacing) return ctx.measureText(str).width;
  let w = 0; const chars = Array.from(str);
  for (const ch of chars) w += ctx.measureText(ch).width;
  return w + ts.spacing * Math.max(0, chars.length - 1);
}
// Box of a single line: w, asc (cap height), desc
export function textBox(ctx, str, ts) {
  const s = applyTransform(str, ts);
  const w = measureStr(ctx, s, { ...ts, transform: 'none' });
  const asc = capRatio(ctx, ts) * ts.size;
  const desc = ts.size * (/[gjpqyQ,;()\[\]{}|/]/.test(s) ? 0.22 : 0.04);
  return { w, asc, desc, h: asc + desc };
}
// multi-line block
export function textBlock(ctx, str, ts) {
  const lines = String(str ?? '').split('\n');
  const boxes = lines.map((l) => textBox(ctx, l, ts));
  const lh = ts.size * (ts.lineHeight || 1.15);
  const w = Math.max(0, ...boxes.map((b) => b.w));
  const h = boxes.length ? boxes[0].asc + lh * (lines.length - 1) + boxes[boxes.length - 1].desc : 0;
  return { lines, boxes, w, h, lh, asc: boxes[0]?.asc || 0 };
}

function rawText(ctx, str, x, y, ts, mode) {
  if (!ts.spacing) { mode === 'stroke' ? ctx.strokeText(str, x, y) : ctx.fillText(str, x, y); return; }
  let cx = x;
  for (const ch of Array.from(str)) {
    mode === 'stroke' ? ctx.strokeText(ch, cx, y) : ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + ts.spacing;
  }
}
// Draw a single line with baseline at y. align relative to x.
export function drawText(ctx, str, x, y, ts, env, align = 'left') {
  const s = applyTransform(str, ts);
  if (!s) return 0;
  ctx.save();
  ctx.font = fontStr(ts);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const w = measureStr(ctx, s, { ...ts, transform: 'none' });
  let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.globalAlpha *= ts.opacity ?? 1;
  const asc = capRatio(ctx, ts) * ts.size;
  let fill = col(ts.color, env);
  if (ts.fill === 'gradient') {
    const g = ctx.createLinearGradient(0, y - asc, 0, y + ts.size * 0.05);
    g.addColorStop(0, col(ts.color, env)); g.addColorStop(1, col(ts.color2, env)); fill = g;
  } else if (ts.fill === 'hgradient') {
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, col(ts.color, env)); g.addColorStop(1, col(ts.color2, env)); fill = g;
  }
  const shadowOn = ts.shadow;
  const setShadow = () => {
    ctx.shadowColor = col(ts.shadowColor, env); ctx.shadowBlur = ts.shadowBlur;
    ctx.shadowOffsetX = ts.shadowX; ctx.shadowOffsetY = ts.shadowY;
  };
  if (ts.stroke > 0) {
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.lineWidth = ts.stroke * 2; ctx.strokeStyle = col(ts.strokeColor, env);
    if (shadowOn) setShadow();
    rawText(ctx, s, x0, y, ts, 'stroke');
    ctx.shadowColor = 'transparent';
  } else if (shadowOn) setShadow();
  if (ts.fill !== 'none') { ctx.fillStyle = fill; rawText(ctx, s, x0, y, ts, 'fill'); }
  ctx.restore();
  return w;
}
// Multi-line text in a box, top at y.
export function drawBlock(ctx, blk, x, y, ts, env, align = 'left', width) {
  let by = y + blk.asc;
  const W = width ?? blk.w;
  for (let i = 0; i < blk.lines.length; i++) {
    const ax = align === 'center' ? x + W / 2 : align === 'right' ? x + W : x;
    drawText(ctx, blk.lines[i], ax, by, ts, env, align);
    by += blk.lh;
  }
}

// ---------- Shapes ----------
export function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  if (!r) { ctx.rect(x, y, w, h); return; }
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
export function gradFill(ctx, c1, c2, angle, x, y, w, h, kind = 'linear') {
  if (kind === 'radial') {
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) / 1.4);
    g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
  }
  const a = ((angle ?? 90) * Math.PI) / 180;
  const cx = x + w / 2, cy = y + h / 2;
  const len = (Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a))) / 2;
  const dx = Math.sin(a) * len, dy = -Math.cos(a) * len;
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
}

export const DEFAULT_STYLE = {
  bg: 'none', bgColor: '#000000', bgColor2: '@accent', bgAngle: 135, bgOpacity: 0.5, radius: 20, padX: 24, padY: 20,
  borderW: 0, borderColor: '#ffffff', borderStyle: 'solid', borderSides: 'all', borderOpacity: 1,
  shadow: false, shadowColor: '#00000080', shadowBlur: 24, shadowX: 0, shadowY: 8,
};

// Backdrop behind widget content. (x,y,w,h) is the full element box in content units.
export function drawBackdrop(ctx, st, w, h, env) {
  const hasBg = st.bg && st.bg !== 'none';
  const hasBorder = st.borderW > 0;
  if (!hasBg && !hasBorder) return;
  const r = st.radius >= 999 ? Math.min(w, h) / 2 : st.radius;
  ctx.save();
  if (hasBg) {
    ctx.save();
    if (st.shadow) {
      ctx.shadowColor = col(st.shadowColor, env); ctx.shadowBlur = st.shadowBlur;
      ctx.shadowOffsetX = st.shadowX; ctx.shadowOffsetY = st.shadowY;
    }
    ctx.globalAlpha *= clamp(st.bgOpacity ?? 1, 0, 1);
    rrect(ctx, 0, 0, w, h, r);
    if (st.bg === 'gradient' || st.bg === 'radial') ctx.fillStyle = gradFill(ctx, col(st.bgColor, env), col(st.bgColor2, env), st.bgAngle, 0, 0, w, h, st.bg === 'radial' ? 'radial' : 'linear');
    else ctx.fillStyle = col(st.bgColor, env);
    ctx.fill();
    ctx.restore();
  }
  if (hasBorder) {
    ctx.globalAlpha *= st.borderOpacity ?? 1;
    ctx.strokeStyle = col(st.borderColor, env);
    ctx.lineWidth = st.borderW;
    if (st.borderStyle === 'dashed') ctx.setLineDash([st.borderW * 3, st.borderW * 2]);
    else if (st.borderStyle === 'dotted') { ctx.setLineDash([0.1, st.borderW * 2]); ctx.lineCap = 'round'; }
    if (!hasBg && st.shadow) {
      ctx.shadowColor = col(st.shadowColor, env); ctx.shadowBlur = st.shadowBlur; ctx.shadowOffsetX = st.shadowX; ctx.shadowOffsetY = st.shadowY;
    }
    const b = st.borderW / 2, sides = st.borderSides || 'all';
    ctx.beginPath();
    if (sides === 'all') { rrect(ctx, b, b, w - 2 * b, h - 2 * b, Math.max(0, r - b)); }
    else {
      if (sides === 'bottom' || sides === 'tb') { ctx.moveTo(0, h - b); ctx.lineTo(w, h - b); }
      if (sides === 'top' || sides === 'tb') { ctx.moveTo(0, b); ctx.lineTo(w, b); }
      if (sides === 'left' || sides === 'lr') { ctx.moveTo(b, 0); ctx.lineTo(b, h); }
      if (sides === 'right' || sides === 'lr') { ctx.moveTo(w - b, 0); ctx.lineTo(w - b, h); }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- Icons ----------
const pathCache = new Map();
export function iconPath(name) {
  let p = pathCache.get(name);
  if (!p && ICONS[name]) { p = new Path2D(ICONS[name]); pathCache.set(name, p); }
  return p;
}
export const ICON_NAMES = Object.keys(ICONS);
export function drawIcon(ctx, name, x, y, size, color, opts = {}) {
  const p = iconPath(name);
  if (!p) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 24, size / 24);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (opts.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = opts.shadowBlur || 10; }
  if (opts.fill) { ctx.fillStyle = opts.fillColor || color; ctx.fill(p); }
  ctx.strokeStyle = color; ctx.lineWidth = opts.stroke ?? 2; ctx.stroke(p);
  ctx.restore();
}

export function checker(ctx, w, h, sz = 24) {
  ctx.save();
  ctx.fillStyle = '#2a2d34'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#353943';
  for (let y = 0; y < h; y += sz) for (let x = (y / sz) % 2 ? sz : 0; x < w; x += sz * 2) ctx.fillRect(x, y, sz, sz);
  ctx.restore();
}
export function luma(c) { const p = parseColor(c); return (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255; }
