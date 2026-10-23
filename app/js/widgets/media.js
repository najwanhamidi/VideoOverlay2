// Text, image, sticker and shape elements.
import { register, stateOf } from './core.js';
import { TS, textBlock, drawBlock, measureStr, col, rrect, gradFill, drawIcon, applyTransform, textBox, drawText, ICON_NAMES } from '../render/draw.js';
import { expandTokens, TOKEN_HELP } from './metrics.js';

// ---------- Text ----------
function wrapLines(ctx, str, ts, maxW) {
  if (!maxW) return str;
  const out = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(/\s+/); let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (line && measureStr(ctx, t, ts) > maxW) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out.join('\n');
}
function textContent(ctx, el, env) {
  const p = el.props;
  let s = expandTokens(p.text, env, stateOf(el, env), el);
  s = applyTransform(s, p.ts);
  if (env.entr && env.entr.type != null && env.entr.type < 1) s = s.slice(0, Math.round(s.length * env.entr.type));
  return wrapLines(ctx, s, { ...p.ts, transform: 'none' }, p.wrap || 0);
}
register({
  type: 'text', name: 'Text', auto: true, modes: ['single', 'multi'],
  props: () => ({ text: 'Your text', align: 'left', wrap: 0, ts: TS({ size: 64 }), hl: false, hlColor: '@accent', hlPad: 14, hlRadius: 10, hlOpacity: 1 }),
  measure(ctx, el, env) {
    const p = el.props;
    const full = wrapLines(ctx, applyTransform(expandTokens(p.text, env, stateOf(el, env), el), p.ts), { ...p.ts, transform: 'none' }, p.wrap || 0);
    const b = textBlock(ctx, full, { ...p.ts, transform: 'none' });
    const pad = p.hl ? p.hlPad : 0;
    return { w: Math.max(b.w + pad * 2, 4), h: Math.max(b.h + pad * 2, 4) };
  },
  render(ctx, el, W, H, env) {
    const p = el.props, ts = { ...p.ts, transform: 'none' };
    const s = textContent(ctx, el, env);
    const b = textBlock(ctx, s, ts);
    const pad = p.hl ? p.hlPad : 0;
    if (p.hl) {
      ctx.save(); ctx.fillStyle = col(p.hlColor, env); ctx.globalAlpha *= p.hlOpacity ?? 1;
      let y = pad + b.asc;
      b.lines.forEach((ln, i) => {
        const w = b.boxes[i].w; if (!ln) { y += b.lh; return; }
        const x = p.align === 'center' ? (W - w) / 2 - pad : p.align === 'right' ? W - w - 2 * pad : 0;
        rrect(ctx, x, y - b.asc - pad * 0.7, w + pad * 2, b.asc + pad * 1.4 + ts.size * 0.08, p.hlRadius); ctx.fill();
        y += b.lh;
      });
      ctx.restore();
    }
    drawBlock(ctx, b, pad, pad, ts, env, p.align, W - pad * 2);
  },
  schema: (el, env) => [
    { title: 'Text', fields: [
      { k: 'props.text', t: 'textarea', label: 'Text', help: 'Data tokens: ' + TOKEN_HELP[env.mode].join(' ') },
      { k: 'props.align', t: 'seg', label: 'Align', options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] },
      { k: 'props.wrap', t: 'range', label: 'Wrap width (0 = off)', min: 0, max: 2000, step: 10 },
    ] },
    { title: 'Font & style', ts: 'props.ts' },
    { title: 'Highlight behind lines', fields: [{ k: 'props.hl', t: 'toggle', label: 'Line highlight' }, { k: 'props.hlColor', t: 'color', label: 'Color', when: (e) => e.props.hl }, { k: 'props.hlOpacity', t: 'range', label: 'Opacity', min: 0, max: 1, step: 0.05, when: (e) => e.props.hl }, { k: 'props.hlPad', t: 'range', label: 'Padding', min: 0, max: 60, when: (e) => e.props.hl }, { k: 'props.hlRadius', t: 'range', label: 'Radius', min: 0, max: 60, when: (e) => e.props.hl }] },
  ],
});

// ---------- Image ----------
export function shapePath(ctx, shape, x, y, w, h, r = 0) {
  const cx = x + w / 2, cy = y + h / 2;
  ctx.beginPath();
  switch (shape) {
    case 'ellipse': case 'circle': ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2); break;
    case 'triangle': ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
    case 'hexagon': for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; ctx[i ? 'lineTo' : 'moveTo'](cx + (w / 2) * Math.cos(a), cy + (h / 2) * Math.sin(a)); } ctx.closePath(); break;
    case 'star': case 'burst': {
      const n = shape === 'star' ? 5 : 14, inner = shape === 'star' ? 0.45 : 0.78;
      for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, k = i % 2 ? inner : 1; ctx[i ? 'lineTo' : 'moveTo'](cx + (w / 2) * k * Math.cos(a), cy + (h / 2) * k * Math.sin(a)); }
      ctx.closePath(); break;
    }
    case 'shield': ctx.moveTo(x, y + h * 0.12); ctx.quadraticCurveTo(cx, y - h * 0.04, x + w, y + h * 0.12); ctx.lineTo(x + w, y + h * 0.5); ctx.quadraticCurveTo(x + w, y + h * 0.85, cx, y + h); ctx.quadraticCurveTo(x, y + h * 0.85, x, y + h * 0.5); ctx.closePath(); break;
    case 'ribbon': ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - h * 0.3, cy); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x + h * 0.3, cy); ctx.closePath(); break;
    case 'arrow': ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x + w * 0.62, y + h * 0.3); ctx.lineTo(x + w * 0.62, y); ctx.lineTo(x + w, cy); ctx.lineTo(x + w * 0.62, y + h); ctx.lineTo(x + w * 0.62, y + h * 0.7); ctx.lineTo(x, y + h * 0.7); ctx.closePath(); break;
    case 'diamond': ctx.moveTo(cx, y); ctx.lineTo(x + w, cy); ctx.lineTo(cx, y + h); ctx.lineTo(x, cy); ctx.closePath(); break;
    case 'line': ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); break;
    case 'heart': { ctx.moveTo(cx, y + h * 0.3); ctx.bezierCurveTo(cx, y, x, y, x, y + h * 0.32); ctx.bezierCurveTo(x, y + h * 0.6, cx, y + h * 0.8, cx, y + h); ctx.bezierCurveTo(cx, y + h * 0.8, x + w, y + h * 0.6, x + w, y + h * 0.32); ctx.bezierCurveTo(x + w, y, cx, y, cx, y + h * 0.3); ctx.closePath(); break; }
    default: rrect(ctx, x, y, w, h, r >= 999 ? Math.min(w, h) / 2 : r);
  }
}
export const SHAPES = [['rect', 'Rectangle'], ['ellipse', 'Ellipse'], ['triangle', 'Triangle'], ['hexagon', 'Hexagon'], ['star', 'Star'], ['burst', 'Burst'], ['shield', 'Shield'], ['ribbon', 'Ribbon'], ['arrow', 'Arrow'], ['diamond', 'Diamond'], ['heart', 'Heart'], ['line', 'Line']];

register({
  type: 'image', name: 'Image', auto: false, backdrop: false, keepAspect: true, w: 500, h: 500, modes: ['single', 'multi'],
  props: () => ({ asset: null, fit: 'cover', mask: 'rect', radius: 24, borderW: 0, borderColor: '#ffffff', zoom: 1, ox: 0, oy: 0, gray: 0, bright: 1, contrast: 1, sat: 1 }),
  render(ctx, el, W, H, env) {
    const p = el.props, img = env.assets && env.assets[p.asset];
    ctx.save();
    shapePath(ctx, p.mask, 0, 0, W, H, p.radius);
    if (!img || !img.naturalWidth) {
      ctx.fillStyle = '#ffffff22'; ctx.fill(); ctx.strokeStyle = '#ffffff66'; ctx.setLineDash([12, 8]); ctx.lineWidth = 3; ctx.stroke();
      drawIcon(ctx, 'camera', W / 2 - 40, H / 2 - 40, 80, '#ffffffaa'); ctx.restore(); return;
    }
    ctx.save(); ctx.clip();
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let sc = p.fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
    sc *= p.zoom || 1;
    const dw = p.fit === 'stretch' ? W : iw * sc, dh = p.fit === 'stretch' ? H : ih * sc;
    const f = [];
    if (p.gray) f.push(`grayscale(${p.gray})`); if (p.bright !== 1) f.push(`brightness(${p.bright})`); if (p.contrast !== 1) f.push(`contrast(${p.contrast})`); if (p.sat !== 1) f.push(`saturate(${p.sat})`);
    if (f.length && 'filter' in ctx) ctx.filter = f.join(' ');
    ctx.drawImage(img, (W - dw) / 2 + p.ox * W, (H - dh) / 2 + p.oy * H, dw, dh);
    ctx.restore();
    if (p.borderW > 0) { ctx.lineWidth = p.borderW * 2; ctx.strokeStyle = col(p.borderColor, env); ctx.save(); ctx.clip(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  },
  schema: () => [
    { title: 'Image', fields: [{ k: 'props.asset', t: 'image', label: 'Image file' }, { k: 'props.fit', t: 'seg', label: 'Fit', options: [['cover', 'Fill'], ['contain', 'Fit'], ['stretch', 'Stretch']] },
      { k: 'props.zoom', t: 'range', label: 'Zoom', min: 0.2, max: 4, step: 0.01 }, { k: 'props.ox', t: 'range', label: 'Offset X', min: -1, max: 1, step: 0.01, half: true }, { k: 'props.oy', t: 'range', label: 'Offset Y', min: -1, max: 1, step: 0.01, half: true }] },
    { title: 'Shape & border', fields: [{ k: 'props.mask', t: 'select', label: 'Mask shape', options: SHAPES.filter((s) => s[0] !== 'line') }, { k: 'props.radius', t: 'range', label: 'Corner radius', min: 0, max: 400, when: (e) => e.props.mask === 'rect' },
      { k: 'props.borderW', t: 'range', label: 'Border', min: 0, max: 40 }, { k: 'props.borderColor', t: 'color', label: 'Border color' }] },
    { title: 'Filters', fields: [{ k: 'props.gray', t: 'range', label: 'Grayscale', min: 0, max: 1, step: 0.05 }, { k: 'props.bright', t: 'range', label: 'Brightness', min: 0.2, max: 2, step: 0.05 }, { k: 'props.contrast', t: 'range', label: 'Contrast', min: 0.2, max: 2, step: 0.05 }, { k: 'props.sat', t: 'range', label: 'Saturation', min: 0, max: 3, step: 0.05 }] },
  ],
});

// ---------- Shape ----------
register({
  type: 'shape', name: 'Shape', auto: false, backdrop: false, w: 400, h: 400, modes: ['single', 'multi'],
  props: () => ({ shape: 'rect', fill: 'solid', color: '@accent', color2: '@accent2', angle: 135, radius: 24, strokeW: 0, strokeColor: '#ffffff', dash: 'solid', fillOpacity: 1 }),
  render(ctx, el, W, H, env) {
    const p = el.props;
    ctx.save();
    if (p.shape === 'line') { ctx.strokeStyle = p.fill === 'gradient' ? gradFill(ctx, col(p.color, env), col(p.color2, env), 90, 0, 0, W, H) : col(p.color, env); ctx.lineWidth = Math.max(1, p.strokeW || H); ctx.lineCap = 'round'; if (p.dash === 'dashed') ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]); if (p.dash === 'dotted') ctx.setLineDash([0.1, ctx.lineWidth * 2]); shapePath(ctx, 'line', 0, 0, W, H); ctx.stroke(); ctx.restore(); return; }
    shapePath(ctx, p.shape, p.strokeW / 2, p.strokeW / 2, W - p.strokeW, H - p.strokeW, p.radius);
    if (p.fill !== 'none') {
      ctx.save(); ctx.globalAlpha *= p.fillOpacity ?? 1;
      ctx.fillStyle = p.fill === 'gradient' || p.fill === 'radial' ? gradFill(ctx, col(p.color, env), col(p.color2, env), p.angle, 0, 0, W, H, p.fill === 'radial' ? 'radial' : 'linear') : col(p.color, env);
      ctx.fill(); ctx.restore();
    }
    if (p.strokeW > 0) { ctx.shadowColor = 'transparent'; ctx.lineWidth = p.strokeW; ctx.strokeStyle = col(p.strokeColor, env); ctx.lineJoin = 'round'; if (p.dash === 'dashed') ctx.setLineDash([p.strokeW * 3, p.strokeW * 2]); if (p.dash === 'dotted') { ctx.setLineDash([0.1, p.strokeW * 2]); ctx.lineCap = 'round'; } ctx.stroke(); }
    ctx.restore();
  },
  schema: () => [{ title: 'Shape', fields: [
    { k: 'props.shape', t: 'select', label: 'Shape', options: SHAPES }, { k: 'props.radius', t: 'range', label: 'Corner radius', min: 0, max: 500, when: (e) => e.props.shape === 'rect' },
    { k: 'props.fill', t: 'seg', label: 'Fill', options: [['solid', 'Solid'], ['gradient', 'Linear'], ['radial', 'Radial'], ['none', 'None']] },
    { k: 'props.color', t: 'color', label: 'Color' }, { k: 'props.color2', t: 'color', label: 'Color 2', when: (e) => /gradient|radial/.test(e.props.fill) }, { k: 'props.angle', t: 'range', label: 'Angle', min: 0, max: 360, when: (e) => e.props.fill === 'gradient' },
    { k: 'props.fillOpacity', t: 'range', label: 'Fill opacity', min: 0, max: 1, step: 0.05 },
    { k: 'props.strokeW', t: 'range', label: 'Outline / line width', min: 0, max: 60 }, { k: 'props.strokeColor', t: 'color', label: 'Outline color' },
    { k: 'props.dash', t: 'seg', label: 'Line style', options: [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']] },
  ] }],
});

// ---------- Sticker ----------
export const EMOJIS = '🏃 🏃‍♀️ 🏃‍♂️ 👟 🔥 ⚡ 💪 🏅 🥇 🏆 🎯 ❤️ 💓 🫀 ⏱️ 🌅 🌄 🌙 ☀️ 🌧️ 🏔️ 🌴 🌊 🎉 🥳 😤 😅 🤘 👊 🙌 ✅ ⭐ 🌟 💯 🚀 🍌 💧 🥤 ☕ 🍕 🍺 🎧 📍 🗺️ 🏁 🚩 🇲🇾'.split(' ');
export const BADGE_PRESETS = ['PR!', 'NEW PB', 'FINISHER', 'RACE DAY', 'LONG RUN', 'EASY DAY', 'TEMPO', 'INTERVALS', 'RECOVERY', 'SUB 25', 'DONE ✓', 'NIGHT RUN', 'RUN CLUB', 'MARATHON', 'HALF', '5K', '10K'];
register({
  type: 'sticker', name: 'Sticker', auto: false, backdrop: false, keepAspect: true, w: 220, h: 220, modes: ['single', 'multi'],
  props: () => ({ kind: 'icon', icon: 'flame', emoji: '🔥', text: 'PR!', shape: 'burst', color: '@accent', fill: false, fillColor: '#ffffff', strokeW: 2, textColor: '#0d0f14', font: 'Bungee', outline: 0, outlineColor: '#000000' }),
  render(ctx, el, W, H, env) {
    const p = el.props, S = Math.min(W, H);
    if (p.kind === 'emoji') {
      ctx.save(); ctx.font = `${S * 0.82}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, W / 2, H / 2 + S * 0.05); ctx.restore(); return;
    }
    if (p.kind === 'badge') {
      ctx.save();
      shapePath(ctx, p.shape, 2, 2, W - 4, H - 4, Math.min(W, H) * 0.2);
      ctx.fillStyle = col(p.color, env); ctx.fill();
      if (p.outline > 0) { ctx.lineWidth = p.outline; ctx.strokeStyle = col(p.outlineColor, env); ctx.stroke(); }
      ctx.restore();
      const lines = String(p.text).split('\n');
      const ts = TS({ font: p.font, weight: 700, size: 100, color: p.textColor });
      const maxW = Math.max(...lines.map((l) => measureStr(ctx, l, ts)));
      const fit = /burst|star|ellipse|circle|hexagon|shield/.test(p.shape) ? 0.62 : 0.8;
      const size = Math.min((W * fit / maxW) * 100, (H * 0.5) / lines.length);
      const t2 = { ...ts, size };
      const bx = textBox(ctx, 'H', t2);
      const lh = size * 1.05, total = bx.asc + lh * (lines.length - 1);
      let y = H / 2 - total / 2 + bx.asc + (p.shape === 'shield' ? -H * 0.04 : 0);
      for (const l of lines) { drawText(ctx, l, W / 2, y, t2, env, 'center'); y += lh; }
      return;
    }
    const pad = S * 0.06;
    drawIcon(ctx, p.icon, (W - S) / 2 + pad, (H - S) / 2 + pad, S - 2 * pad, col(p.color, env), { stroke: p.strokeW, fill: p.fill, fillColor: col(p.fillColor, env) });
  },
  schema: () => [{ title: 'Sticker', fields: [
    { k: 'props.kind', t: 'seg', label: 'Type', options: [['icon', 'Icon'], ['emoji', 'Emoji'], ['badge', 'Badge']] },
    { k: 'props.icon', t: 'icon', label: 'Icon', when: (e) => e.props.kind === 'icon' },
    { k: 'props.strokeW', t: 'range', label: 'Line weight', min: 0.5, max: 5, step: 0.25, when: (e) => e.props.kind === 'icon' },
    { k: 'props.fill', t: 'toggle', label: 'Filled', when: (e) => e.props.kind === 'icon' }, { k: 'props.fillColor', t: 'color', label: 'Fill color', when: (e) => e.props.kind === 'icon' && e.props.fill },
    { k: 'props.emoji', t: 'emoji', label: 'Emoji', when: (e) => e.props.kind === 'emoji' },
    { k: 'props.text', t: 'textarea', label: 'Badge text', presets: BADGE_PRESETS, when: (e) => e.props.kind === 'badge' },
    { k: 'props.shape', t: 'select', label: 'Badge shape', options: SHAPES.filter((s) => s[0] !== 'line'), when: (e) => e.props.kind === 'badge' },
    { k: 'props.font', t: 'font', label: 'Badge font', when: (e) => e.props.kind === 'badge' },
    { k: 'props.textColor', t: 'color', label: 'Text color', when: (e) => e.props.kind === 'badge' },
    { k: 'props.outline', t: 'range', label: 'Outline', min: 0, max: 30, when: (e) => e.props.kind === 'badge' }, { k: 'props.outlineColor', t: 'color', label: 'Outline color', when: (e) => e.props.kind === 'badge' && e.props.outline > 0 },
    { k: 'props.color', t: 'color', label: 'Color', when: (e) => e.props.kind !== 'emoji' },
  ] }],
});
export { ICON_NAMES };
