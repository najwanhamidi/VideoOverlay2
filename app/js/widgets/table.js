// Generic table renderer used by splits, best efforts and run lists.
import { TS, drawText, measureStr, textBox, col, rrect, drawIcon } from '../render/draw.js';
import { withAlpha, clamp } from '../util.js';

export const TABLE_DESIGNS = [
  ['plain', 'Plain'], ['striped', 'Striped'], ['cards', 'Cards'], ['lines', 'Lines'], ['bars', 'Speed bars'], ['boxed', 'Boxed grid'],
  ['minimal', 'Minimal'], ['chips', 'Chips'], ['neon', 'Neon rows'], ['timeline', 'Timeline'], ['ticket', 'Ticket'],
];

export function tableProps(o = {}) {
  return {
    design: 'striped', header: true, rowScale: 1.9, colGap: 34, rowGap: 6, rowPad: 18, barW: 160, barColor: '@accent', barOpacity: 0.85,
    fastColor: '@accent', slowColor: '#ff6b6b', highlight: 'fastest', stripeColor: '#ffffff14', cardColor: '#00000066', lineColor: '#ffffff33',
    accent: '@accent', wrapCols: 1, maxRows: 0, rowsFrom: 'first', rowRadius: 10, appear: 'slide',
    headerTS: TS({ size: 20, weight: 700, transform: 'upper', spacing: 1.5, role: 'muted', font: 'Inter' }),
    cellTS: TS({ size: 30, weight: 600, font: 'Inter' }),
    ...o,
  };
}
export const TABLE_SCHEMA = [
  { k: 'props.design', t: 'select', label: 'Table design', options: TABLE_DESIGNS },
  { k: 'props.header', t: 'toggle', label: 'Header row' },
  { k: 'props.rowScale', t: 'range', label: 'Row height', min: 1.1, max: 3.5, step: 0.05 },
  { k: 'props.colGap', t: 'range', label: 'Column gap', min: 0, max: 120 }, { k: 'props.rowGap', t: 'range', label: 'Row gap', min: 0, max: 40 },
  { k: 'props.rowPad', t: 'range', label: 'Row padding', min: 0, max: 60 }, { k: 'props.rowRadius', t: 'range', label: 'Row radius', min: 0, max: 40 },
  { k: 'props.wrapCols', t: 'range', label: 'Wrap into columns', min: 1, max: 4 },
  { k: 'props.maxRows', t: 'range', label: 'Max rows (0 = all)', min: 0, max: 60 }, { k: 'props.rowsFrom', t: 'seg', label: 'When limited show', options: [['first', 'First'], ['last', 'Last']] },
  { k: 'props.barW', t: 'range', label: 'Bar column width', min: 40, max: 600 },
  { k: 'props.barColor', t: 'color', label: 'Bar color' }, { k: 'props.barOpacity', t: 'range', label: 'Bar opacity', min: 0, max: 1, step: 0.05 },
  { k: 'props.highlight', t: 'seg', label: 'Highlight', options: [['fastest', 'Fastest'], ['both', 'Fast + slow'], ['none', 'None']] },
  { k: 'props.fastColor', t: 'color', label: 'Fastest color' }, { k: 'props.slowColor', t: 'color', label: 'Slowest color' },
  { k: 'props.stripeColor', t: 'color', label: 'Stripe color' }, { k: 'props.cardColor', t: 'color', label: 'Card color' }, { k: 'props.lineColor', t: 'color', label: 'Line color' }, { k: 'props.accent', t: 'color', label: 'Accent' },
  { k: 'props.appear', t: 'seg', label: 'Row animation', options: [['slide', 'Slide'], ['fade', 'Fade'], ['pop', 'Pop']] },
];

// cols: [{key,label,align,bar,chip,icon}] ; rows: [{cells:{}, bar, hl, alpha}]
export function tableLayout(ctx, p, cols, rows) {
  let list = rows;
  if (p.maxRows > 0 && rows.length > p.maxRows) list = p.rowsFrom === 'last' ? rows.slice(-p.maxRows) : rows.slice(0, p.maxRows);
  const cs = p.cellTS, hs = p.headerTS;
  const widths = cols.map((c) => {
    if (c.bar) return p.barW;
    let w = p.header ? measureStr(ctx, c.label, hs) : 0;
    for (const r of list) w = Math.max(w, measureStr(ctx, r.cells[c.key] ?? '', c.ts || cs) + (c.chip ? cs.size * 0.9 : 0));
    return Math.ceil(w);
  });
  const rowH = cs.size * p.rowScale;
  const headH = p.header ? hs.size * 2.1 : 0;
  const tl = p.design === 'timeline' ? cs.size * 1.2 : 0;
  const tw = tl + p.rowPad * 2 + widths.reduce((a, b) => a + b, 0) + p.colGap * Math.max(0, cols.length - 1);
  const wc = Math.max(1, Math.min(p.wrapCols || 1, list.length || 1));
  const per = Math.ceil(list.length / wc) || 0;
  const th = headH + per * rowH + Math.max(0, per - 1) * p.rowGap;
  const gapW = p.colGap * 1.5;
  return { list, widths, rowH, headH, tw, th, wc, per, gapW, tl, w: tw * wc + gapW * (wc - 1), h: Math.max(th, headH + 1) };
}

export function drawTable(ctx, p, cols, L, env) {
  const cs = p.cellTS, hs = p.headerTS;
  for (let g = 0; g < L.wc; g++) {
    const ox = g * (L.tw + L.gapW);
    const chunk = L.list.slice(g * L.per, (g + 1) * L.per);
    // header
    if (p.header) {
      let x = ox + L.tl + p.rowPad;
      cols.forEach((c, i) => {
        const w = L.widths[i];
        const ax = c.align === 'right' ? x + w : c.align === 'center' ? x + w / 2 : x;
        if (c.label) drawText(ctx, c.label, ax, hs.size * 1.3, hs, env, c.bar ? 'left' : c.align || 'left');
        x += w + p.colGap;
      });
      if (p.design === 'lines' || p.design === 'boxed' || p.design === 'minimal') { ctx.save(); ctx.fillStyle = col(p.lineColor, env); ctx.fillRect(ox, L.headH - 3, L.tw, 2); ctx.restore(); }
    }
    if (p.design === 'timeline' && chunk.length) {
      ctx.save(); ctx.fillStyle = col(p.lineColor, env); ctx.fillRect(ox + L.tl / 2 - 1.5, L.headH + L.rowH / 2, 3, (chunk.length - 1) * (L.rowH + p.rowGap)); ctx.restore();
    }
    chunk.forEach((r, ri) => {
      const a = clamp(r.alpha ?? 1, 0, 1);
      if (a <= 0) return;
      const y = L.headH + ri * (L.rowH + p.rowGap);
      ctx.save();
      ctx.globalAlpha *= p.appear === 'pop' ? 1 : a;
      if (p.appear === 'slide') ctx.translate((1 - a) * -40, 0);
      if (p.appear === 'pop' && a < 1) { const k = 0.6 + 0.4 * a; ctx.translate(ox + L.tw / 2, y + L.rowH / 2); ctx.scale(k, k); ctx.translate(-(ox + L.tw / 2), -(y + L.rowH / 2)); ctx.globalAlpha *= a; }
      const hl = (r.hl === 'fast' && p.highlight !== 'none') ? col(p.fastColor, env) : (r.hl === 'slow' && p.highlight === 'both') ? col(p.slowColor, env) : null;
      const rx = ox + L.tl, rw = L.tw - L.tl;
      switch (p.design) {
        case 'striped': if (ri % 2 === 0) { ctx.fillStyle = col(p.stripeColor, env); rrect(ctx, rx, y, rw, L.rowH, p.rowRadius); ctx.fill(); } break;
        case 'cards': case 'chips': ctx.fillStyle = col(p.cardColor, env); rrect(ctx, rx, y, rw, L.rowH, p.rowRadius); ctx.fill(); break;
        case 'lines': if (ri < chunk.length - 1) { ctx.fillStyle = col(p.lineColor, env); ctx.fillRect(rx, y + L.rowH + p.rowGap / 2 - 1, rw, 2); } break;
        case 'boxed': ctx.strokeStyle = col(p.lineColor, env); ctx.lineWidth = 2; ctx.strokeRect(rx, y, rw, L.rowH); break;
        case 'bars': { const f = clamp(r.bar ?? 0.5, 0.08, 1); ctx.save(); ctx.globalAlpha *= p.barOpacity * 0.6; ctx.fillStyle = hl || col(p.barColor, env); rrect(ctx, rx, y, rw * f, L.rowH, p.rowRadius); ctx.fill(); ctx.restore(); break; }
        case 'neon': ctx.save(); ctx.strokeStyle = hl || col(p.accent, env); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16; ctx.lineWidth = 2.5; rrect(ctx, rx + 1, y + 1, rw - 2, L.rowH - 2, p.rowRadius); ctx.stroke(); ctx.restore(); break;
        case 'ticket': { ctx.fillStyle = col(p.cardColor, env); rrect(ctx, rx, y, rw, L.rowH, p.rowRadius); ctx.fill(); ctx.fillStyle = hl || col(p.accent, env); rrect(ctx, rx, y, Math.max(8, cs.size * 0.3), L.rowH, Math.min(p.rowRadius, 6)); ctx.fill(); break; }
        case 'timeline': { ctx.fillStyle = hl || col(p.accent, env); ctx.beginPath(); ctx.arc(ox + L.tl / 2, y + L.rowH / 2, cs.size * 0.28, 0, Math.PI * 2); ctx.fill(); break; }
      }
      if (hl && /plain|striped|lines|minimal|boxed/.test(p.design)) { ctx.save(); ctx.globalAlpha *= 0.18; ctx.fillStyle = hl; rrect(ctx, rx, y, rw, L.rowH, p.rowRadius); ctx.fill(); ctx.restore(); }
      let x = rx + p.rowPad;
      const base = y + L.rowH / 2 + textBox(ctx, '0', cs).asc / 2;
      cols.forEach((c, i) => {
        const w = L.widths[i];
        const ts = c.ts || cs;
        const t2 = hl && c.hlText !== false ? { ...ts, color: p.design === 'bars' ? ts.color : hl } : r.dim ? { ...ts, opacity: 0.55 } : ts;
        if (c.bar) {
          const f = clamp(r.bar ?? 0, 0, 1), bh = Math.max(6, cs.size * 0.42);
          ctx.save(); ctx.fillStyle = withAlpha(col(p.barColor, env), 0.18); rrect(ctx, x, y + (L.rowH - bh) / 2, w, bh, bh / 2); ctx.fill();
          ctx.globalAlpha *= p.barOpacity; ctx.fillStyle = hl || col(p.barColor, env); rrect(ctx, x, y + (L.rowH - bh) / 2, Math.max(bh, w * f), bh, bh / 2); ctx.fill(); ctx.restore();
        } else if (c.chip && p.design === 'chips') {
          const s = r.cells[c.key] ?? '', tw = measureStr(ctx, s, ts), ph = cs.size * 0.45;
          ctx.save(); ctx.fillStyle = hl || col(p.accent, env); const bw = tw + ph * 2, bh = cs.size * 1.3; const bx = c.align === 'right' ? x + w - bw + ph : x - ph;
          rrect(ctx, bx, y + (L.rowH - bh) / 2, bw, bh, bh / 2); ctx.fill(); ctx.restore();
          drawText(ctx, s, bx + ph, base, { ...ts, color: '#0d0f14' }, env);
        } else {
          const ax = c.align === 'right' ? x + w : c.align === 'center' ? x + w / 2 : x;
          drawText(ctx, r.cells[c.key] ?? '', ax, base, t2, env, c.align || 'left');
        }
        x += w + p.colGap;
      });
      ctx.restore();
    });
  }
}
