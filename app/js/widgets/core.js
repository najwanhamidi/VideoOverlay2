// Widget registry, element model, skins, entrance animations and scene rendering.
import { uid, clone, deepMerge, rad, EASE, clamp } from '../util.js';
import { DEFAULT_STYLE, drawBackdrop, isTS, col, gradFill, checker } from '../render/draw.js';

export const REG = {};
export function register(def) { REG[def.type] = def; return def; }

export function defaultAnim(o = {}) { return { in: 'fade', delay: 0, dur: 0.6, ease: 'outCubic', data: true, ...o }; }

export function makeElement(type, env, over = {}) {
  const def = REG[type];
  if (!def) throw new Error('Unknown widget ' + type);
  const el = {
    id: uid(), type, name: def.name, x: 0, y: 0, w: def.w || 400, h: def.h || 240, s: 1, rot: 0, opacity: 1,
    hidden: false, locked: false, group: null, blend: 'source-over', flipX: false, flipY: false,
    props: def.props ? def.props(env) : {}, style: { ...DEFAULT_STYLE, ...(def.style || {}) }, anim: defaultAnim(def.anim || {}),
  };
  if (over.skin) { applySkin(el, over.skin); delete over.skin; }
  deepMerge(el, over);
  return el;
}

// iterate text styles inside an element's props (deep)
export function forEachTS(obj, fn, path = 'props') {
  const o = path === 'props' ? obj.props : obj;
  const walk = (x, p) => {
    if (!x || typeof x !== 'object') return;
    if (isTS(x)) { fn(x, p); return; }
    for (const k in x) if (x[k] && typeof x[k] === 'object' && !Array.isArray(x[k])) walk(x[k], p + '.' + k);
  };
  walk(o, path);
}

// ---------- Skins (backdrop designs) ----------
export const SKINS = [
  { id: 'none', name: 'Clean', style: {} },
  { id: 'glass', name: 'Dark glass', style: { bg: 'solid', bgColor: '#000000', bgOpacity: 0.45, radius: 24 } },
  { id: 'frost', name: 'Light glass', style: { bg: 'solid', bgColor: '#ffffff', bgOpacity: 0.16, borderW: 1.5, borderColor: '#ffffff66', radius: 24 } },
  { id: 'solidDark', name: 'Solid dark', style: { bg: 'solid', bgColor: '#0d0f14', bgOpacity: 1, radius: 18 } },
  { id: 'solidLight', name: 'Solid light', style: { bg: 'solid', bgColor: '#ffffff', bgOpacity: 1, radius: 18 }, text: '#0d0f14', muted: '#0d0f1499' },
  { id: 'accent', name: 'Accent fill', style: { bg: 'solid', bgColor: '@accent', bgOpacity: 1, radius: 18 }, text: '#0d0f14', muted: '#0d0f14b3', accent: '#0d0f14' },
  { id: 'outline', name: 'Outline', style: { borderW: 3, borderColor: '@text', radius: 18 } },
  { id: 'neon', name: 'Neon', style: { bg: 'solid', bgColor: '#000000', bgOpacity: 0.35, borderW: 3, borderColor: '@accent', radius: 20, shadow: true, shadowColor: '@accent', shadowBlur: 28, shadowX: 0, shadowY: 0 }, textGlow: '@accent' },
  { id: 'gradient', name: 'Gradient', style: { bg: 'gradient', bgColor: '@accent', bgColor2: '@accent2', bgAngle: 135, bgOpacity: 1, radius: 22 }, text: '#0d0f14', muted: '#0d0f14b3', accent: '#0d0f14' },
  { id: 'brutal', name: 'Brutal', style: { bg: 'solid', bgColor: '#ffffff', bgOpacity: 1, borderW: 4, borderColor: '#0d0f14', radius: 0, shadow: true, shadowColor: '#0d0f14', shadowBlur: 0, shadowX: 10, shadowY: 10 }, text: '#0d0f14', muted: '#0d0f14aa' },
  { id: 'pill', name: 'Pill', style: { bg: 'solid', bgColor: '#000000', bgOpacity: 0.55, radius: 999, padX: 36 } },
  { id: 'underline', name: 'Underline', style: { borderW: 4, borderColor: '@accent', borderSides: 'bottom', radius: 0, padX: 4 } },
  { id: 'leftbar', name: 'Side bar', style: { bg: 'solid', bgColor: '#000000', bgOpacity: 0.3, borderW: 8, borderColor: '@accent', borderSides: 'left', radius: 0 } },
  { id: 'sticker', name: 'Sticker', style: { bg: 'solid', bgColor: '#ffffff', bgOpacity: 1, radius: 16, shadow: true, shadowColor: '#00000055', shadowBlur: 18, shadowX: 0, shadowY: 6 }, text: '#111111', muted: '#11111199' },
  { id: 'retro', name: 'Retro', style: { bg: 'solid', bgColor: '#f4e4c1', bgOpacity: 1, borderW: 3, borderColor: '#3b2a1a', radius: 10 }, text: '#3b2a1a', muted: '#3b2a1aaa', accent: '#c2410c' },
  { id: 'night', name: 'Midnight', style: { bg: 'gradient', bgColor: '#1e1b4b', bgColor2: '#0f172a', bgAngle: 160, bgOpacity: 0.92, radius: 22, borderW: 1, borderColor: '#ffffff22' } },
  { id: 'dashed', name: 'Dashed', style: { borderW: 2.5, borderColor: '@text', borderStyle: 'dashed', radius: 14 } },
  { id: 'shadow', name: 'Text shadow', style: {}, textShadow: '#000000b3' },
  { id: 'rules', name: 'Rules', style: { borderW: 2, borderColor: '@muted', borderSides: 'tb', radius: 0, padX: 4 } },
  { id: 'sunset', name: 'Sunset', style: { bg: 'gradient', bgColor: '#ff5f6d', bgColor2: '#ffc371', bgAngle: 120, bgOpacity: 1, radius: 22 }, text: '#ffffff', muted: '#ffffffcc', accent: '#ffffff' },
  { id: 'ocean', name: 'Ocean', style: { bg: 'gradient', bgColor: '#0ea5e9', bgColor2: '#1e3a8a', bgAngle: 150, bgOpacity: 0.95, radius: 22 }, text: '#ffffff', muted: '#ffffffcc', accent: '#a5f3fc' },
];
const STYLE_RESET = { bg: 'none', bgOpacity: 1, borderW: 0, borderStyle: 'solid', borderSides: 'all', shadow: false, borderOpacity: 1, padX: DEFAULT_STYLE.padX, padY: DEFAULT_STYLE.padY, radius: DEFAULT_STYLE.radius };
export function applySkin(el, skinId) {
  const sk = SKINS.find((s) => s.id === skinId) || SKINS[0];
  Object.assign(el.style, STYLE_RESET, clone(sk.style));
  el.style.skin = sk.id;
  forEachTS(el, (ts) => {
    const role = ts.role || 'main';
    if (role === 'main') ts.color = sk.text || '@text';
    else if (role === 'muted') ts.color = sk.muted || '@muted';
    else if (role === 'accent') ts.color = sk.accent || '@accent';
    if (sk.textGlow) Object.assign(ts, { shadow: true, shadowColor: sk.textGlow, shadowBlur: 18, shadowX: 0, shadowY: 0 });
    else if (sk.textShadow) Object.assign(ts, { shadow: true, shadowColor: sk.textShadow, shadowBlur: 12, shadowX: 0, shadowY: 3 });
    else ts.shadow = false;
  });
  if (el.props && 'accent' in el.props) el.props.accent = sk.accent || '@accent';
}

// ---------- Entrance animations ----------
export const ENTRANCES = [
  ['none', 'None'], ['fade', 'Fade'], ['up', 'Slide up'], ['down', 'Slide down'], ['left', 'Slide from left'], ['right', 'Slide from right'],
  ['zoom', 'Zoom in'], ['pop', 'Pop'], ['drop', 'Drop & bounce'], ['spin', 'Spin in'], ['wipe', 'Wipe'], ['flip', 'Flip'], ['typewriter', 'Typewriter (text)'], ['blur', 'Blur in'],
];
export function entranceState(el, env) {
  const A = el.anim || {};
  const r = { alpha: 1, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, clip: 1, blur: 0, e: 1 };
  if (env.static || !A.in || A.in === 'none') return r;
  const raw = clamp((env.time - (A.delay || 0)) / Math.max(0.01, A.dur || 0.6), 0, 1);
  const ease = EASE[A.ease] || EASE.outCubic;
  const e = ease(raw);
  r.e = raw;
  const dist = (env.docW || 1080) * 0.08;
  switch (A.in) {
    case 'fade': r.alpha = raw; break;
    case 'up': r.alpha = raw; r.dy = (1 - e) * dist; break;
    case 'down': r.alpha = raw; r.dy = -(1 - e) * dist; break;
    case 'left': r.alpha = raw; r.dx = -(1 - e) * dist * 1.5; break;
    case 'right': r.alpha = raw; r.dx = (1 - e) * dist * 1.5; break;
    case 'zoom': r.alpha = raw; r.sx = r.sy = 0.4 + 0.6 * e; break;
    case 'pop': { const b = EASE.outBack(raw); r.alpha = Math.min(1, raw * 3); r.sx = r.sy = Math.max(0, b); break; }
    case 'drop': { const b = EASE.outBounce(raw); r.alpha = Math.min(1, raw * 4); r.dy = -(1 - b) * dist * 3; break; }
    case 'spin': r.alpha = raw; r.rot = (1 - e) * -180; r.sx = r.sy = 0.3 + 0.7 * e; break;
    case 'wipe': r.clip = e; break;
    case 'flip': r.sx = Math.max(0.001, e); r.alpha = raw > 0 ? 1 : 0; break;
    case 'typewriter': r.type = raw; break;
    case 'blur': r.alpha = raw; r.blur = (1 - e) * 24; break;
  }
  return r;
}

// ---------- State helpers for widgets ----------
export function stateOf(el, env) {
  const live = el.anim?.data !== false && !env.static;
  if (env.mode === 'multi') return live ? env.mcur : env.mfin;
  return live ? env.cur : env.fin;
}
export function progOf(el, env) { return el.anim?.data !== false && !env.static ? env.t : 1; }

// ---------- Box computation ----------
export function padOf(el) {
  const def = REG[el.type], st = el.style;
  if (def.backdrop === false) return [0, 0];
  if ((st.bg && st.bg !== 'none') || st.borderW > 0) return [st.padX || 0, st.padY || 0];
  return [0, 0];
}
export function boxOf(ctx, el, env) {
  const def = REG[el.type];
  const [px, py] = padOf(el);
  const s = el.s || 1;
  if (def.auto) {
    const m = def.measure(ctx, el, env);
    const fw = m.w + 2 * px, fh = m.h + 2 * py;
    const w = fw * s, h = fh * s;
    let x = el.x;
    if (!env.layout) {
      const al = (el.props && el.props.align) || 'left';
      if (al === 'center') x = el.x + (el.w - w) / 2;
      else if (al === 'right') x = el.x + el.w - w;
    }
    return { x, y: el.y, w, h, fw, fh, W: m.w, H: m.h, px, py };
  }
  const fw = el.w / s, fh = el.h / s;
  return { x: el.x, y: el.y, w: el.w, h: el.h, fw, fh, W: Math.max(1, fw - 2 * px), H: Math.max(1, fh - 2 * py), px, py };
}
// Sync stored size of auto elements with final-state layout.
export function layoutElement(ctx, el, env) {
  const def = REG[el.type];
  if (!def || !def.auto) return;
  const b = boxOf(ctx, el, { ...env, layout: true, static: true });
  const al = (el.props && el.props.align) || 'left';
  if (el.w && Math.abs(el.w - b.w) > 0.01) {
    if (al === 'center') el.x += (el.w - b.w) / 2;
    else if (al === 'right') el.x += el.w - b.w;
  }
  el.w = b.w; el.h = b.h;
}

// ---------- Scene rendering ----------
export function drawElement(ctx, el, env) {
  const def = REG[el.type];
  if (!def) return;
  const a = entranceState(el, env);
  if (a.alpha <= 0.001 || a.clip <= 0.001) return;
  const b = boxOf(ctx, el, env);
  ctx.save();
  ctx.globalAlpha *= (el.opacity ?? 1) * a.alpha;
  if (el.blend && el.blend !== 'source-over') ctx.globalCompositeOperation = el.blend;
  ctx.translate(b.x + b.w / 2 + a.dx, b.y + b.h / 2 + a.dy);
  ctx.rotate(rad((el.rot || 0) + a.rot));
  ctx.scale(a.sx * (el.flipX ? -1 : 1), a.sy * (el.flipY ? -1 : 1));
  ctx.translate(-b.w / 2, -b.h / 2);
  if (a.clip < 1) { ctx.beginPath(); ctx.rect(-4, -b.h, (b.w + 8) * a.clip, b.h * 3); ctx.clip(); }
  if (a.blur > 0.3 && 'filter' in ctx) ctx.filter = `blur(${a.blur.toFixed(1)}px)`;
  ctx.scale(el.s || 1, el.s || 1);
  const st = el.style;
  if (def.backdrop !== false) drawBackdrop(ctx, st, b.fw, b.fh, env);
  if (st.shadow && !(st.bg && st.bg !== 'none') && !(st.borderW > 0)) {
    ctx.shadowColor = col(st.shadowColor, env); ctx.shadowBlur = st.shadowBlur; ctx.shadowOffsetX = st.shadowX; ctx.shadowOffsetY = st.shadowY;
  }
  ctx.translate(b.px, b.py);
  env.entr = a;
  try { def.render(ctx, el, b.W, b.H, env); } catch (e) { console.warn('render', el.type, e); }
  env.entr = null;
  ctx.restore();
}

export function drawBackground(ctx, doc, env, assets, opts = {}) {
  const bg = opts.override || doc.bg, W = doc.w, H = doc.h;
  if (!bg || bg.type === 'transparent') { if (opts.checker) checker(ctx, W, H, Math.round(W / 40)); return; }
  if (bg.type === 'solid') { ctx.fillStyle = col(bg.color, env); ctx.fillRect(0, 0, W, H); return; }
  if (bg.type === 'gradient') {
    ctx.fillStyle = gradFill(ctx, col(bg.color, env), col(bg.color2, env), bg.angle, 0, 0, W, H, bg.kind);
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (bg.type === 'image') {
    const img = assets && assets[bg.image];
    if (!img || !img.complete || !img.naturalWidth) { if (opts.checker) checker(ctx, W, H, Math.round(W / 40)); else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); } return; }
    ctx.save();
    ctx.fillStyle = col(bg.color || '#000000', env); ctx.fillRect(0, 0, W, H);
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const sc = (bg.fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih)) * (bg.zoom || 1);
    const dw = iw * sc, dh = ih * sc;
    const dx = (W - dw) / 2 + (bg.ox || 0) * W, dy = (H - dh) / 2 + (bg.oy || 0) * H;
    if (bg.blur > 0 && 'filter' in ctx) ctx.filter = `blur(${bg.blur}px)`;
    const f = [];
    if (bg.brightness && bg.brightness !== 1) f.push(`brightness(${bg.brightness})`);
    if (bg.saturate != null && bg.saturate !== 1) f.push(`saturate(${bg.saturate})`);
    if (f.length && 'filter' in ctx) ctx.filter = (ctx.filter && ctx.filter !== 'none' ? ctx.filter + ' ' : '') + f.join(' ');
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    if (bg.dim > 0) {
      if (bg.dimMode === 'bottom') {
        const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${bg.dim})`);
        ctx.fillStyle = g;
      } else ctx.fillStyle = `rgba(0,0,0,${bg.dim})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
}

export function renderScene(ctx, doc, env, opts = {}) {
  ctx.save();
  drawBackground(ctx, doc, env, env.assets, opts);
  ctx.restore();
  for (const el of doc.elements) {
    if (el.hidden) continue;
    drawElement(ctx, el, env);
  }
}

// ---------- Text hit regions (for editing individual text inside a widget) ----------
let hitCtx = null;
// Returns every text drawn by the element: {p (text style path), orig, shown, key, m (local→doc matrix), x, y, w, h, n (index among same style)}
export function textHits(el, env) {
  if (!REG[el.type] || el.hidden) return [];
  if (!hitCtx) { const c = document.createElement('canvas'); c.width = c.height = 2; hitCtx = c.getContext('2d'); }
  const tagged = [];
  forEachTS(el, (ts, p) => { ts.__p = p; tagged.push(ts); });
  const e = { ...env, hits: [] };
  hitCtx.save(); hitCtx.setTransform(1, 0, 0, 1, 0, 0);
  try { drawElement(hitCtx, el, e); } finally { hitCtx.restore(); tagged.forEach((ts) => delete ts.__p); }
  const count = {};
  for (const h of e.hits) count[h.p] = (count[h.p] || 0) + 1;
  const seen = {};
  for (const h of e.hits) {
    const ts = pathGet(el, h.p);
    h.n = seen[h.p] = (seen[h.p] ?? -1) + 1;
    h.single = count[h.p] === 1;
    h.key = ts && ts.txt && '*' in ts.txt ? '*' : h.single ? '*' : '=' + h.orig;
  }
  return e.hits;
}
function pathGet(o, p) { for (const k of p.split('.')) { if (o == null) return undefined; o = o[k]; } return o; }
// Doc-space point inside a hit?
export function hitContains(h, x, y, tol = 0) {
  const q = h.m.inverse().transformPoint(new DOMPoint(x, y));
  const sx = Math.hypot(h.m.a, h.m.b) || 1, t = tol / sx;
  return q.x >= h.x - t && q.x <= h.x + h.w + t && q.y >= h.y - t && q.y <= h.y + h.h + t;
}
export function hitCorners(h) {
  return [[h.x, h.y], [h.x + h.w, h.y], [h.x + h.w, h.y + h.h], [h.x, h.y + h.h]].map(([x, y]) => h.m.transformPoint(new DOMPoint(x, y)));
}
