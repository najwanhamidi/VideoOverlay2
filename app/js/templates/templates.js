// Quick-start templates for single activities and multi-run periods.
import { makeElement, layoutElement, REG } from '../widgets/core.js';
import { deepMerge, clone } from '../util.js';

function kit(doc, env, ctx) {
  const W = doc.w, H = doc.h;
  const u = Math.min(W / 1080, H / 1500);
  const M = 64 * u;
  let delay = 0.1;
  const list = [];
  const mk = (type, over = {}, opt = {}) => {
    const o = clone(over);
    const el = makeElement(type, env, o);
    if (REG[type].auto) el.s = (el.s || 1) * u * (opt.s || 1);
    else { el.w = (opt.w ?? el.w) * u; el.h = (opt.h ?? el.h) * u; el.s = (el.s || 1) * u * (opt.s || 1); }
    if (opt.anim !== false) { el.anim.delay = opt.delay ?? delay; delay += opt.step ?? 0.12; if (opt.in) el.anim.in = opt.in; }
    layoutElement(ctx, el, env);
    if (opt.name) el.name = opt.name;
    list.push(el);
    return el;
  };
  // place anchor (ax, ay in 0..1) of element at (x, y)
  const place = (el, ax, ay, x, y) => { el.x = x - el.w * ax; el.y = y - el.h * ay; return el; };
  const fitW = (el, maxW) => { if (el.w > maxW) { const k = maxW / el.w; if (REG[el.type].auto) el.s *= k; else { el.w *= k; el.h *= k; el.s *= k; } layoutElement(ctx, el, env); } return el; };
  const group = (els) => { const g = Math.random().toString(36).slice(2, 9); els.forEach((e) => (e.group = g)); };
  return { W, H, u, M, mk, place, fitW, list, group, setDelay: (d) => (delay = d) };
}
const TS = (o) => o;

export const TEMPLATES = {
  single: [
    {
      id: 'classic', name: 'Classic', desc: 'Name, stats row and small route',
      build(k) {
        const { W, H, M, mk, place, fitW } = k;
        const sh = { shadow: true, shadowColor: '#000000aa', shadowBlur: 14, shadowY: 3 };
        const map = mk('map', { props: { line: 'glow', start: 'dot', end: 'checkered', width: 9 } }, { w: 380, h: 380, in: 'wipe' });
        place(map, 1, 0, W - M, M);
        const stats = ['distance', 'avgPace', 'time'].map((m) => mk('stat', { props: { metric: m, layout: 'classic', valueTS: { size: 92, ...sh }, labelTS: { ...sh }, unitTS: { ...sh } } }, { in: 'up' }));
        const gap = (W - 2 * M - stats.reduce((a, s) => a + s.w, 0)) / 2;
        let x = M; for (const s of stats) { place(s, 0, 1, x, H - M); x += s.w + gap; }
        const date = mk('text', { props: { text: '{date} · {startTime}', ts: { size: 30, weight: 600, color: '@muted', role: 'muted', ...sh } } }, { in: 'up' });
        place(date, 0, 1, M, stats[0].y - 40 * k.u);
        const name = mk('text', { props: { text: '{name}', ts: { size: 84, font: 'Montserrat', weight: 900, ...sh } } }, { in: 'up' });
        fitW(name, W - 2 * M); place(name, 0, 1, M, date.y - 18 * k.u);
        const hr = mk('stat', { props: { metric: 'avgHr', layout: 'iconInline', valueTS: { size: 54, ...sh }, unitTS: { size: 26, ...sh }, iconColor: '#ff5470' } }, { in: 'fade' });
        place(hr, 0, 1, M, name.y - 26 * k.u);
      },
    },
    {
      id: 'bignumber', name: 'Big Distance', desc: 'Huge distance with a stat strip',
      bg: { type: 'gradient', color: '#0b1220', color2: '#1e293b', angle: 160 },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const lab = mk('text', { align: 'center', props: { text: 'TODAY I RAN', align: 'center', ts: { size: 40, weight: 800, spacing: 10, color: '@accent', role: 'accent' } } }, { in: 'down' });
        const big = mk('stat', { props: { metric: 'distance', layout: 'valueOnly', showUnit: false, align: 'center', valueTS: { size: 420, font: 'Bebas Neue', weight: 400, spacing: -4 } } }, { in: 'pop' });
        const unit = mk('text', { props: { text: 'KILOMETERS', align: 'center', ts: { size: 54, weight: 700, spacing: 14, font: 'Oswald' } } }, { in: 'up' });
        place(big, 0.5, 0.5, W / 2, H * 0.42); place(lab, 0.5, 1, W / 2, big.y - 30 * u); place(unit, 0.5, 0, W / 2, big.y + big.h + 26 * u);
        const grid = mk('statgrid', { skin: 'frost', props: { cols: 3, align: 'center', dividers: true, cellGapX: 70, items: [{ m: 'avgPace', on: true }, { m: 'time', on: true }, { m: 'avgHr', on: true }, { m: 'ascent', on: false }], valueTS: { size: 64 }, unitTS: { size: 26 } }, style: { padX: 44, padY: 34, radius: 28 } }, { in: 'up' });
        k.fitW(grid, W - 2 * M);
        place(grid, 0.5, 0, W / 2, unit.y + unit.h + 90 * u);
        const pg = mk('graph', { props: { metric: 'pace', design: 'gradArea', showTitle: false, showY: false, grid: false, showX: false, showAvg: false, fillOpacity: 0.5 } }, { w: 952, h: 220, in: 'wipe' });
        place(pg, 0.5, 1, W / 2, H - M);
        const name = mk('text', { props: { text: '{name} · {date}', align: 'center', ts: { size: 30, weight: 600, color: '@muted', role: 'muted' } } });
        place(name, 0.5, 1, W / 2, pg.y - 30 * u);
      },
    },
    {
      id: 'splits', name: 'Splits Board', desc: 'Splits table + split pace bars',
      bg: { type: 'gradient', color: '#111827', color2: '#030712', angle: 180 },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const name = mk('text', { props: { text: '{name}', ts: { size: 76, font: 'Montserrat', weight: 900 } } }, { in: 'left' });
        k.fitW(name, W - 2 * M); place(name, 0, 0, M, M + 10 * u);
        const sub = mk('text', { props: { text: '{distance} {unit} · {time} · {avgPace}{paceunit}', ts: { size: 34, weight: 600, color: '@accent', role: 'accent' } } }, { in: 'left' });
        place(sub, 0, 0, M, name.y + name.h + 20 * u);
        const bars = mk('graph', { skin: 'glass', props: { metric: 'pace', design: 'splitBars', title: 'Pace per km', showY: true, grid: true, yTicks: 3 } }, { w: 952, h: 400, in: 'wipe' });
        place(bars, 0, 0, M, sub.y + sub.h + 50 * u);
        const tbl = mk('splits', { props: { design: 'bars', rowScale: 1.75, columns: [{ k: 'idx', on: true }, { k: 'pace', on: true }, { k: 'hr', on: true }, { k: 'elev', on: true }, { k: 'cum', on: true }], cellTS: { size: 32 }, colGap: 60, maxRows: 14 } }, { in: 'fade' });
        k.fitW(tbl, W - 2 * M);
        place(tbl, 0, 0, M, bars.y + bars.h + 50 * u);
        const fast = mk('splitcard', { skin: 'accent', props: { layout: 'iconLeft', valueTS: { size: 58 }, subTS: { size: 22 } } }, { in: 'pop' });
        place(fast, 1, 1, W - M, H - M);
      },
    },
    {
      id: 'dashboard', name: 'Glass Dashboard', desc: 'Cards with map, stats and graphs',
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const G = 26 * u;
        const cw = (W - 2 * M - G) / 2;
        const map = mk('map', { skin: 'glass', props: { line: 'heat', width: 8, start: 'dot', end: 'checkered' }, style: { padX: 20, padY: 20 } }, { w: cw / u, h: cw / u, in: 'zoom' });
        place(map, 0, 0, M, M);
        const grid = mk('statgrid', { skin: 'glass', props: { cols: 1, cellGapY: 26, layout: 'iconLeft', items: [{ m: 'distance', on: true }, { m: 'avgPace', on: true }, { m: 'time', on: true }, { m: 'avgHr', on: true }], valueTS: { size: 56 }, unitTS: { size: 24 }, labelTS: { size: 18 } }, style: { padX: 32, padY: 30 } }, { in: 'right' });
        k.fitW(grid, cw); place(grid, 0, 0, M + cw + G, M);
        if (grid.h < map.h) grid.y = M + (map.h - grid.h) / 2;
        const pace = mk('graph', { skin: 'glass', props: { metric: 'pace', design: 'gradArea', showY: true, title: 'Pace' } }, { w: (W - 2 * M) / u, h: 360, in: 'wipe' });
        place(pace, 0, 0, M, Math.max(map.y + map.h, grid.y + grid.h) + G);
        const hr = mk('graph', { skin: 'glass', props: { metric: 'hr', design: 'area', colorMode: 'zones', lineColor: '#ff5470', fillColor: '#ff5470', title: 'Heart rate' } }, { w: (W - 2 * M) / u, h: 360, in: 'wipe' });
        place(hr, 0, 0, M, pace.y + pace.h + G);
        const name = mk('text', { skin: 'glass', props: { text: '{name}  ·  {date}', ts: { size: 34, weight: 700 } }, style: { padX: 30, padY: 22, radius: 999 } }, { in: 'up' });
        k.fitW(name, W - 2 * M); place(name, 0.5, 0, W / 2, hr.y + hr.h + G);
      },
    },
    {
      id: 'neon', name: 'Neon Night', desc: 'Glowing route and neon stats',
      bg: { type: 'solid', color: '#05060a' }, theme: { accent: '#00f0ff', accent2: '#ff2bd6' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const map = mk('map', { props: { line: 'gradient', color: '@accent', color2: '@accent2', width: 12, glow: 40, start: 'ring', end: 'ring', dot: 'pulse' } }, { w: 900, h: 800, in: 'wipe' });
        place(map, 0.5, 0, W / 2, M + 40 * u);
        const title = mk('text', { props: { text: 'NIGHT RUN', align: 'center', ts: { size: 120, font: 'Audiowide', weight: 400, color: '@accent', shadow: true, shadowColor: '@accent', shadowBlur: 30, shadowX: 0, shadowY: 0 } } }, { in: 'blur' });
        place(title, 0.5, 0, W / 2, map.y + map.h + 30 * u);
        const stats = ['distance', 'avgPace', 'time'].map((m) => mk('stat', { skin: 'neon', props: { metric: m, layout: 'reverse', align: 'center', valueTS: { size: 60, font: 'Orbitron' }, unitTS: { size: 24 }, labelTS: { size: 18 } }, style: { padX: 26, padY: 22 } }, { in: 'pop' }));
        const gap = 24 * u, tot = stats.reduce((a, s) => a + s.w, 0) + gap * 2;
        if (tot > W - 2 * M) stats.forEach((s) => k.fitW(s, (W - 2 * M - gap * 2) / 3));
        let x = (W - (stats.reduce((a, s) => a + s.w, 0) + gap * 2)) / 2;
        const sy = title.y + title.h + 70 * u;
        for (const s of stats) { place(s, 0, 0, x, sy); x += s.w + gap; }
        const g = mk('graph', { props: { metric: 'pace', design: 'neon', showTitle: false, showY: false, showX: false, grid: false, showAvg: false, lineColor: '@accent2', lineW: 4 } }, { w: 952, h: 230, in: 'wipe' });
        place(g, 0.5, 1, W / 2, H - M);
      },
    },
    {
      id: 'strip', name: 'Minimal Strip', desc: 'One clean line of stats at the bottom',
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const grid = mk('statgrid', { props: { cols: 4, dividers: true, dividerColor: '#ffffff55', cellGapX: 54, layout: 'reverse', items: [{ m: 'distance', on: true }, { m: 'avgPace', on: true }, { m: 'time', on: true }, { m: 'avgHr', on: true }], valueTS: { size: 58, font: 'Inter', weight: 800, shadow: true, shadowColor: '#00000099' }, unitTS: { size: 24, font: 'Inter' }, labelTS: { size: 18 } } }, { in: 'up' });
        k.fitW(grid, W - 2 * M); place(grid, 0.5, 1, W / 2, H - M * 1.4);
        const line = mk('shape', { props: { shape: 'line', color: '@accent', strokeW: 4 } }, { w: (W - 2 * M) / u, h: 8, in: 'wipe' });
        place(line, 0.5, 1, W / 2, grid.y - 34 * u);
        const name = mk('text', { props: { text: '{name}', ts: { size: 44, weight: 800, font: 'Inter', shadow: true, shadowColor: '#00000099' } } }, { in: 'up' });
        place(name, 0, 1, M, line.y - 22 * u);
        const date = mk('text', { align: 'right', props: { text: '{date}', align: 'right', ts: { size: 28, weight: 600, color: '@muted', role: 'muted' } } }, { in: 'up' });
        place(date, 1, 1, W - M, line.y - 26 * u);
      },
    },
    {
      id: 'brutal', name: 'Brutalist', desc: 'Bold boxes with hard shadows',
      bg: { type: 'solid', color: '#f2f0ea' }, theme: { text: '#0d0f14', muted: '#0d0f14aa', accent: '#ff3d2e', accent2: '#2563eb' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const t = mk('text', { props: { text: 'RUN\nREPORT', ts: { size: 150, font: 'Archivo Black', weight: 400, lineHeight: 0.92, spacing: -4 } } }, { in: 'left' });
        place(t, 0, 0, M, M + 20 * u);
        const badge = mk('sticker', { props: { kind: 'badge', text: '{distance}', shape: 'burst', color: '@accent', textColor: '#ffffff', font: 'Archivo Black' }, rot: 12 }, { w: 260, h: 260, in: 'spin' });
        badge.props.text = 'DONE!';
        place(badge, 1, 0, W - M, M);
        const items = ['distance', 'time', 'avgPace', 'avgHr'];
        const cw = (W - 2 * M - 40 * u) / 2;
        items.forEach((m, i) => {
          const s = mk('stat', { skin: 'brutal', props: { metric: m, layout: 'tag', valueTS: { size: 84, font: 'Archivo Black', weight: 400 }, unitTS: { size: 30, font: 'Archivo Black', weight: 400 }, labelTS: { size: 20 }, accent: '@accent' }, style: { padX: 30, padY: 28 } }, { in: 'drop' });
          k.fitW(s, cw);
          place(s, 0, 0, M + (i % 2) * (cw + 40 * u), t.y + t.h + 90 * u + Math.floor(i / 2) * 260 * u);
        });
        const last = k.list[k.list.length - 1];
        const g = mk('graph', { skin: 'brutal', props: { metric: 'pace', design: 'splitBars', title: 'Splits', lineColor: '@accent', fillColor: '#0d0f14', gridColor: '#0d0f1422', titleTS: { color: '#0d0f14' }, axisTS: { color: '#0d0f14aa' } }, style: { padX: 30, padY: 26 } }, { w: (W - 2 * M - 10 * u) / u, h: 380, in: 'drop' });
        place(g, 0, 0, M, last.y + last.h + 70 * u);
        const map = mk('map', { skin: 'brutal', props: { line: 'solid', color: '#0d0f14', width: 7, start: 'dot', end: 'checkered', startColor: '@accent' }, style: { padX: 20, padY: 20 } }, { w: 380, h: 380, in: 'drop' });
        place(map, 1, 1, W - M - 10 * u, H - M - 10 * u);
        const nm = mk('text', { props: { text: '{name}\n{date}', ts: { size: 40, font: 'Archivo Black', weight: 400, lineHeight: 1.2 } } }, { in: 'left' });
        k.fitW(nm, W - 2 * M - map.w - 40 * u); place(nm, 0, 1, M, H - M - 10 * u);
      },
    },
    {
      id: 'hud', name: 'Live HUD (video)', desc: 'Live pace, HR gauge, progress and moving map — made for video',
      build(k) {
        const { W, H, M, mk, place, u } = k;
        k.setDelay(0);
        const pace = mk('stat', { skin: 'glass', props: { metric: 'pace', layout: 'iconLeft', icon: 'gauge', valueTS: { size: 80 }, label: 'Pace' } }, { in: 'left' });
        place(pace, 0, 0, M, M);
        const gauge = mk('gauge', { skin: 'glass', props: { metric: 'hr', design: 'arc' }, style: { padX: 20, padY: 20 } }, { w: 300, h: 300, in: 'right' });
        place(gauge, 1, 0, W - M, M);
        const dist = mk('stat', { skin: 'glass', props: { metric: 'distance', layout: 'iconLeft', valueTS: { size: 80 } } }, { in: 'left' });
        place(dist, 0, 0, M, pace.y + pace.h + 24 * u);
        const time = mk('stat', { skin: 'glass', props: { metric: 'time', layout: 'iconLeft', valueTS: { size: 80 } } }, { in: 'left' });
        place(time, 0, 0, M, dist.y + dist.h + 24 * u);
        const map = mk('map', { skin: 'glass', props: { line: 'casing', width: 7, dot: 'pulse', start: 'dot', end: 'none' }, style: { padX: 16, padY: 16, radius: 24 } }, { w: 320, h: 320, in: 'zoom' });
        place(map, 1, 0, W - M, gauge.y + gauge.h + 24 * u);
        const pg = mk('graph', { skin: 'glass', props: { metric: 'hr', design: 'area', colorMode: 'zones', showTitle: true, title: 'Heart rate', showY: false, showX: false, grid: false, lineColor: '#ff5470', fillColor: '#ff5470' } }, { w: (W - 2 * M) / u, h: 240, in: 'up' });
        place(pg, 0.5, 1, W / 2, H - M - 150 * u);
        const pr = mk('progress', { props: { design: 'track', thickness: 14 } }, { w: (W - 2 * M) / u, h: 110, in: 'up' });
        place(pr, 0.5, 1, W / 2, H - M);
      },
    },
    {
      id: 'magazine', name: 'Magazine', desc: 'Serif headline with editorial stats',
      bg: { type: 'gradient', color: '#1c1917', color2: '#44403c', angle: 200 }, theme: { accent: '#f5c542', accent2: '#ff7849', text: '#fffaf0', muted: '#fffaf0b3' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const kicker = mk('text', { props: { text: 'THE {date} EDITION', ts: { size: 26, weight: 700, spacing: 6, color: '@accent', role: 'accent' } } }, { in: 'fade' });
        place(kicker, 0, 0, M, M + 30 * u);
        const t = mk('text', { props: { text: '{name}', wrap: 900, ts: { size: 140, font: 'Playfair Display', weight: 900, lineHeight: 1.0, italic: true } } }, { in: 'up' });
        k.fitW(t, W - 2 * M); place(t, 0, 0, M, kicker.y + kicker.h + 30 * u);
        const rule = mk('shape', { props: { shape: 'line', color: '@accent', strokeW: 3 } }, { w: (W - 2 * M) / u, h: 6, in: 'wipe' });
        place(rule, 0, 0, M, t.y + t.h + 50 * u);
        const grid = mk('statgrid', { props: { cols: 2, cellGapX: 80, cellGapY: 50, layout: 'bigSmall', items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }, { m: 'avgHr', on: true }, { m: 'ascent', on: true }, { m: 'calories', on: true }], valueTS: { size: 110, font: 'DM Serif Display', weight: 400 }, labelTS: { size: 20, spacing: 4 } } }, { in: 'up' });
        k.fitW(grid, W - 2 * M); place(grid, 0, 0, M, rule.y + 60 * u);
        const map = mk('map', { props: { line: 'solid', color: '@text', width: 5, start: 'dot', end: 'dot', startColor: '#f5c542', endColor: '#f5c542' } }, { w: 360, h: 360, in: 'wipe' });
        place(map, 1, 1, W - M, H - M);
        const q = mk('text', { props: { text: '“Every mile\nis a story.”', ts: { size: 50, font: 'Playfair Display', weight: 400, italic: true, color: '@muted', role: 'muted', lineHeight: 1.25 } } }, { in: 'fade' });
        place(q, 0, 1, M, H - M - 40 * u);
      },
    },
    {
      id: 'routehero', name: 'Route Hero', desc: 'Large heat-colored route with stat badges',
      bg: { type: 'gradient', color: '#0f172a', color2: '#020617', kind: 'radial', angle: 0 },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const map = mk('map', { props: { line: 'heat', heatMetric: 'pace', ramp: 'heat', width: 14, kmMarkers: 'numbers', start: 'label', end: 'label', labelTS: { size: 20 } } }, { w: 960, h: 1000, in: 'wipe' });
        place(map, 0.5, 0, W / 2, M + 60 * u);
        const name = mk('text', { props: { text: '{name}', align: 'center', ts: { size: 64, font: 'Montserrat', weight: 900, transform: 'upper', spacing: 2 } } }, { in: 'up' });
        k.fitW(name, W - 2 * M); place(name, 0.5, 0, W / 2, map.y + map.h + 30 * u);
        const stats = ['distance', 'avgPace', 'time', 'ascent'].map((m) => mk('stat', { skin: 'pill', props: { metric: m, layout: 'iconInline', valueTS: { size: 44 }, unitTS: { size: 22 } }, style: { padX: 30, padY: 18 } }, { in: 'pop' }));
        const gap = 22 * u;
        const rows = [[stats[0], stats[1]], [stats[2], stats[3]]];
        let y = name.y + name.h + 50 * u;
        for (const r of rows) { const tw = r[0].w + r[1].w + gap; let x = (W - tw) / 2; for (const s of r) { place(s, 0, 0, x, y); x += s.w + gap; } y += r[0].h + gap; }
      },
    },
    {
      id: 'hrfocus', name: 'Heart Focus', desc: 'HR graph, zones and HR stats',
      bg: { type: 'gradient', color: '#2a0a12', color2: '#0a0a0f', angle: 170 }, theme: { accent: '#ff4d6d', accent2: '#ffb36b' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const icon = mk('sticker', { props: { kind: 'icon', icon: 'heart-pulse', color: '@accent', strokeW: 1.6 } }, { w: 140, h: 140, in: 'pop' });
        place(icon, 0, 0, M, M + 20 * u);
        const t = mk('text', { props: { text: 'HEART\nWORK', ts: { size: 120, font: 'Anton', weight: 400, lineHeight: 0.95 } } }, { in: 'left' });
        place(t, 0, 0, icon.x + icon.w + 30 * u, M + 10 * u);
        const avg = mk('stat', { props: { metric: 'avgHr', layout: 'reverse', valueTS: { size: 150, font: 'Anton', weight: 400, color: '@accent', role: 'accent' }, unitTS: { size: 40 } } }, { in: 'up' });
        place(avg, 0, 0, M, t.y + t.h + 80 * u);
        const mx = mk('stat', { props: { metric: 'maxHr', layout: 'reverse', align: 'right', valueTS: { size: 150, font: 'Anton', weight: 400 }, unitTS: { size: 40 } } }, { in: 'up' });
        place(mx, 1, 0, W - M, avg.y);
        const g = mk('graph', { props: { metric: 'hr', design: 'ribbon', colorMode: 'zones', showTitle: false, fillOpacity: 0.9, grid: true, showAvg: true } }, { w: (W - 2 * M) / u, h: 420, in: 'wipe' });
        place(g, 0, 0, M, avg.y + avg.h + 70 * u);
        const z = mk('zones', { skin: 'glass', props: { design: 'bars' }, style: { padX: 30, padY: 30 } }, { w: (W - 2 * M) / u, h: 440, in: 'up' });
        place(z, 0, 1, M, H - M);
      },
    },
    {
      id: 'medal', name: 'Finisher', desc: 'Medal badge and race-style card',
      bg: { type: 'gradient', color: '#1d4ed8', color2: '#0f172a', angle: 150 }, theme: { accent: '#facc15', accent2: '#fb923c' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const medal = mk('sticker', { props: { kind: 'badge', text: 'FINISHER', shape: 'burst', color: '@accent', textColor: '#0d0f14', font: 'Bungee' } }, { w: 520, h: 520, in: 'spin' });
        place(medal, 0.5, 0, W / 2, M + 60 * u);
        const name = mk('text', { props: { text: '{name}', align: 'center', ts: { size: 72, font: 'Bungee', weight: 400 } } }, { in: 'up' });
        k.fitW(name, W - 2 * M); place(name, 0.5, 0, W / 2, medal.y + medal.h + 60 * u);
        const card = mk('statgrid', { skin: 'sticker', props: { cols: 2, cellGapX: 70, cellGapY: 40, align: 'center', layout: 'reverse', items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }, { m: 'avgHr', on: true }], valueTS: { size: 76, font: 'Bungee', weight: 400 }, unitTS: { size: 26 } }, style: { padX: 60, padY: 50, radius: 34 } }, { in: 'up' });
        k.fitW(card, W - 2 * M); place(card, 0.5, 0, W / 2, name.y + name.h + 60 * u);
        const date = mk('text', { props: { text: '{date}', align: 'center', ts: { size: 32, weight: 700, color: '@muted', role: 'muted' } } });
        place(date, 0.5, 1, W / 2, H - M);
      },
    },
  ],
  multi: [
    {
      id: 'weekly', name: 'Weekly Recap', desc: 'Total, stats, daily chart and run list',
      bg: { type: 'gradient', color: '#0b1220', color2: '#111827', angle: 180 },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const t = mk('text', { props: { text: 'WEEKLY RECAP', ts: { size: 110, font: 'Bebas Neue', weight: 400, spacing: 3 } } }, { in: 'left' });
        place(t, 0, 0, M, M + 10 * u);
        const r = mk('text', { props: { text: '{range}', ts: { size: 32, weight: 700, color: '@accent', role: 'accent' } } }, { in: 'left' });
        place(r, 0, 0, M, t.y + t.h + 16 * u);
        const tot = mk('stat', { props: { metric: 'distance', layout: 'stackUnit', label: 'Total distance', decimals: 1, valueTS: { size: 220, font: 'Bebas Neue', weight: 400 }, unitTS: { size: 60, font: 'Bebas Neue', weight: 400 }, labelTS: { size: 22 } } }, { in: 'pop' });
        place(tot, 0, 0, M, r.y + r.h + 50 * u);
        const grid = mk('statgrid', { props: { cols: 4, dividers: true, cellGapX: 40, layout: 'reverse', items: [{ m: 'runs', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }, { m: 'avgHr', on: true }], valueTS: { size: 66 }, unitTS: { size: 26 }, labelTS: { size: 20 } } }, { in: 'up' });
        k.fitW(grid, W - 2 * M); place(grid, 0, 0, M, tot.y + tot.h + 40 * u);
        const bars = mk('mbars', { skin: 'glass', props: { design: 'bars', gradient: true } }, { w: (W - 2 * M) / u, h: 380, in: 'wipe' });
        place(bars, 0, 0, M, grid.y + grid.h + 50 * u);
        const list = mk('mlist', { props: { design: 'cards', rowScale: 2.0, rowGap: 10, cellTS: { size: 36 }, nameTS: { size: 36 }, dayTS: { size: 32 } } }, { in: 'fade' });
        k.fitW(list, W - 2 * M);
        place(list, 0, 0, M, bars.y + bars.h + 40 * u);
      },
    },
    {
      id: 'strip', name: 'Week Strip', desc: 'Calendar dots and big totals',
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const sh = { shadow: true, shadowColor: '#00000099', shadowBlur: 14 };
        const cal = mk('mcal', { props: { design: 'circles' } }, { w: (W - 2 * M) / u, h: 190, in: 'fade' });
        place(cal, 0.5, 1, W / 2, H - M);
        const grid = mk('statgrid', { props: { cols: 3, align: 'center', cellGapX: 60, layout: 'reverse', items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'runs', on: true }], valueTS: { size: 78, ...sh }, unitTS: { size: 30, ...sh }, labelTS: { size: 20, ...sh } } }, { in: 'up' });
        k.fitW(grid, W - 2 * M); place(grid, 0.5, 1, W / 2, cal.y - 50 * u);
        const t = mk('text', { props: { text: 'THIS WEEK', align: 'center', ts: { size: 64, font: 'Montserrat', weight: 900, spacing: 6, ...sh } } }, { in: 'down' });
        place(t, 0.5, 1, W / 2, grid.y - 40 * u);
      },
    },
    {
      id: 'log', name: 'Run Log', desc: 'Full run table with every column',
      bg: { type: 'solid', color: '#0d0f14' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const t = mk('text', { props: { text: 'RUN LOG', ts: { size: 96, font: 'Oswald', weight: 700, spacing: 4 } } }, { in: 'left' });
        place(t, 0, 0, M, M + 10 * u);
        const wk = mk('text', { align: 'right', props: { text: 'WEEK {week}', align: 'right', ts: { size: 40, font: 'Oswald', weight: 700, color: '@accent', role: 'accent' } } }, { in: 'right' });
        place(wk, 1, 1, W - M, t.y + t.h);
        const list = mk('mlist', { props: { design: 'striped', rowScale: 2.6, columns: [{ k: 'day', on: true }, { k: 'date', on: true }, { k: 'name', on: true }, { k: 'dist', on: true }, { k: 'time', on: true }, { k: 'pace', on: true }, { k: 'hr', on: true }, { k: 'elev', on: false }, { k: 'cad', on: false }, { k: 'bar', on: false }], colGap: 26, cellTS: { size: 30 }, nameTS: { size: 30 }, dayTS: { size: 28 } } }, { in: 'fade' });
        k.fitW(list, W - 2 * M); place(list, 0, 0, M, t.y + t.h + 50 * u);
        const ch = mk('mchart', { skin: 'glass', props: { metric: 'avgPace', design: 'hbars', ramp: true, labelTS: { size: 28 }, valueTS: { size: 30 } } }, { w: (W - 2 * M) / u, h: 560, in: 'wipe' });
        place(ch, 0, 0, M, list.y + list.h + 50 * u);
        const grid = mk('statgrid', { skin: 'accent', props: { cols: 3, align: 'center', layout: 'reverse', cellGapX: 50, items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }], valueTS: { size: 56 }, unitTS: { size: 22 } }, style: { padX: 40, padY: 30 } }, { in: 'up' });
        k.fitW(grid, W - 2 * M); place(grid, 0.5, 1, W / 2, H - M);
      },
    },
    {
      id: 'bignum', name: 'Big Numbers', desc: 'Giant total distance',
      bg: { type: 'gradient', color: '#c6ff3d', color2: '#00e0ff', angle: 145 }, theme: { text: '#0d0f14', muted: '#0d0f14aa', accent: '#0d0f14', accent2: '#ffffff' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const t = mk('text', { props: { text: 'THIS WEEK I RAN', align: 'center', ts: { size: 48, weight: 900, spacing: 8 } } }, { in: 'down' });
        const big = mk('stat', { props: { metric: 'distance', layout: 'valueOnly', showUnit: false, decimals: 1, align: 'center', valueTS: { size: 460, font: 'Anton', weight: 400 } } }, { in: 'pop' });
        k.fitW(big, W - 2 * M);
        place(big, 0.5, 0.5, W / 2, H * 0.4); place(t, 0.5, 1, W / 2, big.y - 30 * u);
        const un = mk('text', { props: { text: 'KILOMETERS', align: 'center', ts: { size: 70, font: 'Anton', weight: 400, spacing: 12 } } }, { in: 'up' });
        place(un, 0.5, 0, W / 2, big.y + big.h + 20 * u);
        const grid = mk('statgrid', { skin: 'solidDark', props: { cols: 2, align: 'center', layout: 'reverse', cellGapX: 70, cellGapY: 40, items: [{ m: 'runs', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }, { m: 'longest', on: true }], valueTS: { size: 70, font: 'Anton', weight: 400, color: '#ffffff' }, unitTS: { size: 28, color: '#ffffffb3' }, labelTS: { color: '#c6ff3d' } }, style: { padX: 60, padY: 46, radius: 30 } }, { in: 'up' });
        k.fitW(grid, W - 2 * M); place(grid, 0.5, 0, W / 2, un.y + un.h + 80 * u);
        const r = mk('text', { props: { text: '{range}', align: 'center', ts: { size: 32, weight: 700 } } });
        place(r, 0.5, 1, W / 2, H - M);
      },
    },
    {
      id: 'routes', name: 'Routes Gallery', desc: 'Every route of the week',
      bg: { type: 'solid', color: '#0a0a0f' },
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const t = mk('text', { props: { text: '{runs} RUNS', ts: { size: 120, font: 'Bebas Neue', weight: 400, spacing: 2 } } }, { in: 'left' });
        place(t, 0, 0, M, M + 20 * u);
        const r = mk('text', { props: { text: '{distance} {unit} · {time}', ts: { size: 40, weight: 700, color: '@accent', role: 'accent' } } }, { in: 'left' });
        place(r, 0, 0, M, t.y + t.h + 16 * u);
        const g = mk('mroutes', { props: { design: 'grid', cols: 2, palette: true, label: 'day' } }, { w: (W - 2 * M) / u, h: 1150, in: 'fade' });
        place(g, 0, 0, M, r.y + r.h + 60 * u);
        const d = mk('text', { props: { text: '{range}', ts: { size: 30, weight: 600, color: '@muted', role: 'muted' } } });
        place(d, 0, 1, M, H - M);
      },
    },
    {
      id: 'mdash', name: 'Glass Dashboard', desc: 'Cards with charts, strip and totals',
      build(k) {
        const { W, H, M, mk, place, u } = k;
        const G = 26 * u;
        const t = mk('text', { skin: 'glass', props: { text: 'WEEK {week} · {range}', ts: { size: 32, weight: 800 } }, style: { padX: 30, padY: 20, radius: 999 } }, { in: 'down' });
        k.fitW(t, W - 2 * M); place(t, 0.5, 0, W / 2, M);
        const grid = mk('statgrid', { skin: 'glass', props: { cols: 3, cellGapX: 40, cellGapY: 30, layout: 'iconTop', align: 'center', items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'runs', on: true }, { m: 'avgPace', on: true }, { m: 'avgHr', on: true }, { m: 'ascent', on: true }], valueTS: { size: 54 }, unitTS: { size: 22 }, labelTS: { size: 16 } }, style: { padX: 36, padY: 30 } }, { in: 'up' });
        k.fitW(grid, W - 2 * M); place(grid, 0.5, 0, W / 2, t.y + t.h + G);
        const cal = mk('mcal', { skin: 'glass', props: { design: 'rings' }, style: { padX: 24, padY: 20 } }, { w: (W - 2 * M) / u, h: 210, in: 'up' });
        place(cal, 0, 0, M, grid.y + grid.h + G);
        const bars = mk('mbars', { skin: 'glass', props: { design: 'pills' } }, { w: (W - 2 * M) / u, h: 360, in: 'wipe' });
        place(bars, 0, 0, M, cal.y + cal.h + G);
        const ch = mk('mchart', { skin: 'glass', props: { metric: 'avgPace', design: 'vbars' } }, { w: (W - 2 * M) / u, h: 340, in: 'wipe' });
        place(ch, 0, 0, M, bars.y + bars.h + G);
      },
    },
  ],
};

// Build a template into a doc
export function buildTemplate(tpl, doc, env, ctx) {
  const k = kit(doc, env, ctx);
  tpl.build(k);
  return k.list;
}
export function templateDocPatch(tpl) {
  const p = {};
  if (tpl.bg) p.bg = tpl.bg;
  if (tpl.theme) p.theme = tpl.theme;
  return p;
}
export { deepMerge, TS };
