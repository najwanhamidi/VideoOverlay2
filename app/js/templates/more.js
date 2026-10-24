// Additional quick-start templates (v1.1). Same build kit as templates.js.
const SH = { shadow: true, shadowColor: '#000000aa', shadowBlur: 14, shadowX: 0, shadowY: 3 };
const DARK = '#0d0f14';

export const MORE_SINGLE = [
  {
    id: 'photocard', name: 'Photo Card', desc: 'White card at the bottom, made for photos',
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const cardH = 470 * u;
      const card = mk('shape', { name: 'Card', props: { shape: 'rect', color: '#ffffff', radius: 36 } }, { w: (W - 2 * M) / u, h: cardH / u, in: 'up' });
      place(card, 0.5, 1, W / 2, H - M);
      const name = mk('text', { props: { text: '{name}', ts: { size: 58, font: 'Poppins', weight: 800, color: DARK } } }, { in: 'up' });
      k.fitW(name, W - 2 * M - 100 * u); place(name, 0, 0, M + 50 * u, card.y + 46 * u);
      const date = mk('text', { props: { text: '{date} · {startTime}', ts: { size: 26, font: 'Poppins', weight: 500, color: '#0d0f1499' } } }, { in: 'up' });
      place(date, 0, 0, M + 50 * u, name.y + name.h + 14 * u);
      const grid = mk('statgrid', { props: { cols: 3, layout: 'reverse', cellGapX: 50, dividers: true, dividerColor: '#0d0f1422', items: [{ m: 'distance', on: true }, { m: 'avgPace', on: true }, { m: 'time', on: true }], valueTS: { size: 64, font: 'Poppins', weight: 800, color: DARK }, unitTS: { size: 24, font: 'Poppins', color: '#0d0f1499' }, labelTS: { size: 18, font: 'Poppins', color: '#0d0f1488' } } }, { in: 'up' });
      k.fitW(grid, W - 2 * M - 100 * u); place(grid, 0, 1, M + 50 * u, card.y + card.h - 50 * u);
      const map = mk('map', { props: { line: 'solid', color: DARK, width: 6, start: 'dot', end: 'dot', startColor: '#22c55e', endColor: '#ef4444', dot: 'none' } }, { w: 170, h: 170, in: 'fade' });
      place(map, 1, 0, card.x + card.w - 40 * u, card.y + 34 * u);
    },
  },
  {
    id: 'corners', name: 'Four Corners', desc: 'A stat in each corner, photo stays clear',
    build(k) {
      const { W, H, M, mk, place } = k;
      const opts = (m, align) => ({ props: { metric: m, layout: 'classic', align, valueTS: { size: 88, font: 'Barlow Condensed', weight: 700, ...SH }, labelTS: { ...SH }, unitTS: { font: 'Barlow Condensed', ...SH } } });
      place(mk('stat', opts('distance', 'left'), { in: 'left' }), 0, 0, M, M);
      place(mk('stat', opts('avgPace', 'right'), { in: 'right' }), 1, 0, W - M, M);
      place(mk('stat', opts('time', 'left'), { in: 'left' }), 0, 1, M, H - M);
      place(mk('stat', opts('avgHr', 'right'), { in: 'right' }), 1, 1, W - M, H - M);
      const name = mk('text', { props: { text: '{name}', align: 'center', ts: { size: 40, font: 'Barlow Condensed', weight: 700, transform: 'upper', spacing: 6, ...SH } } }, { in: 'fade' });
      k.fitW(name, W - 2 * M); place(name, 0.5, 1, W / 2, H - M - 200 * k.u);
    },
  },
  {
    id: 'centerstack', name: 'Center Stack', desc: 'Stats stacked in the middle of the story',
    bg: { type: 'gradient', color: '#141e30', color2: '#243b55', angle: 180 },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const items = ['distance', 'avgPace', 'time', 'avgHr'].map((m) => mk('stat', { props: { metric: m, layout: 'reverse', align: 'center', valueTS: { size: 120, font: 'Teko', weight: 600 }, unitTS: { size: 44, font: 'Teko' }, labelTS: { size: 22, spacing: 6 } } }, { in: 'up' }));
      const lines = items.slice(1).map(() => mk('shape', { props: { shape: 'line', color: '@accent', strokeW: 3 } }, { w: 160, h: 6, in: 'wipe', anim: false }));
      const G = 40 * u;
      const total = items.reduce((a, s) => a + s.h, 0) + lines.length * (G * 2 + lines[0].h);
      let y = (H - total) / 2 + 40 * u;
      items.forEach((s, i) => { place(s, 0.5, 0, W / 2, y); y += s.h; if (lines[i]) { y += G; place(lines[i], 0.5, 0, W / 2, y); y += lines[i].h + G; } });
      const name = mk('text', { props: { text: '{name}', align: 'center', ts: { size: 46, font: 'Teko', weight: 500, color: '@accent', role: 'accent', spacing: 4, transform: 'upper' } } }, { in: 'down' });
      k.fitW(name, W - 2 * M); place(name, 0.5, 1, W / 2, items[0].y - 60 * u);
      const date = mk('text', { props: { text: '{date}', align: 'center', ts: { size: 28, weight: 600, color: '@muted', role: 'muted' } } });
      place(date, 0.5, 0, W / 2, H - M - 40 * u);
    },
  },
  {
    id: 'ticker', name: 'Race Ticker', desc: 'Ticker bar on top, split progress below',
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const grid = mk('statgrid', { skin: 'accent', props: { cols: 2, layout: 'ticker', cellGapX: 40, cellGapY: 22, items: [{ m: 'distance', on: true }, { m: 'avgPace', on: true }, { m: 'time', on: true }, { m: 'avgHr', on: true }], valueTS: { size: 64, font: 'Saira Condensed', weight: 800 }, unitTS: { size: 28 }, labelTS: { size: 20 } }, style: { padX: 30, padY: 22, radius: 14 } }, { in: 'down' });
      k.fitW(grid, W - 2 * M); place(grid, 0.5, 0, W / 2, M);
      const name = mk('text', { skin: 'glass', props: { text: '{name}', ts: { size: 34, font: 'Saira Condensed', weight: 800, transform: 'upper', spacing: 3 } }, style: { padX: 26, padY: 16, radius: 10 } }, { in: 'left' });
      k.fitW(name, W - 2 * M); place(name, 0, 0, M, grid.y + grid.h + 20 * u);
      const prog = mk('progress', { props: { design: 'segments', thickness: 16, showLabels: true } }, { w: (W - 2 * M) / u, h: 110, in: 'wipe' });
      place(prog, 0.5, 1, W / 2, H - M);
      const cur = mk('splitcard', { skin: 'glass', props: { which: 'current', layout: 'iconLeft', valueTS: { size: 64 } } }, { in: 'up' });
      place(cur, 0, 1, M, prog.y - 30 * u);
    },
  },
  {
    id: 'paceprofile', name: 'Pace Profile', desc: 'Heat pace graph with best efforts',
    bg: { type: 'solid', color: '#0b0b10' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const t = mk('text', { props: { text: '{avgPace}', ts: { size: 200, font: 'Big Shoulders Display', weight: 800 } } }, { in: 'left' });
      place(t, 0, 0, M, M + 40 * u);
      const tl = mk('text', { props: { text: 'AVG PACE{paceunit}', ts: { size: 30, weight: 800, spacing: 6, color: '@accent', role: 'accent' } } }, { in: 'left' });
      place(tl, 0, 0, M, t.y + t.h + 18 * u);
      const g = mk('graph', { props: { metric: 'pace', design: 'ribbon', colorMode: 'ramp', ramp: 'sunset', showTitle: false, showY: true, showX: true, grid: true, showAvg: true } }, { w: (W - 2 * M) / u, h: 520, in: 'wipe' });
      place(g, 0, 0, M, tl.y + tl.h + 60 * u);
      const best = mk('best', { props: { design: 'lines', which: ['1K', '1 Mile', '5K', '10K'], header: true, rowScale: 2, cellTS: { size: 40 }, labelTS: { size: 40 }, headerTS: { size: 24 } } }, { in: 'up' });
      k.fitW(best, W - 2 * M); place(best, 0, 0, M, g.y + g.h + 60 * u);
      const foot = mk('text', { props: { text: '{name} · {distance} {unit} · {time}', ts: { size: 28, weight: 600, color: '@muted', role: 'muted' } } });
      k.fitW(foot, W - 2 * M); place(foot, 0, 1, M, H - M);
    },
  },
  {
    id: 'splitcards', name: 'Split Cards', desc: 'Two-column split cards with fastest & slowest',
    bg: { type: 'gradient', color: '#1a1a2e', color2: '#16213e', angle: 160 }, theme: { accent: '#ffb703', accent2: '#fb8500' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const t = mk('text', { props: { text: 'SPLITS', ts: { size: 140, font: 'Anton', weight: 400, spacing: 4 } } }, { in: 'left' });
      place(t, 0, 0, M, M);
      const s = mk('text', { props: { text: '{distance} {unit} in {time}', ts: { size: 36, weight: 700, color: '@accent', role: 'accent' } } }, { in: 'left' });
      place(s, 0, 0, M, t.y + t.h + 16 * u);
      const tbl = mk('splits', { props: { design: 'cards', wrapCols: 2, rowScale: 1.7, columns: [{ k: 'idx', on: true }, { k: 'pace', on: true }, { k: 'hr', on: true }], cellTS: { size: 40 }, idxTS: { size: 40 }, headerTS: { size: 22 }, colGap: 44, maxRows: 0 } }, { in: 'fade' });
      k.fitW(tbl, W - 2 * M); place(tbl, 0, 0, M, s.y + s.h + 50 * u);
      const cw = (W - 2 * M - 30 * u) / 2;
      const f = mk('splitcard', { skin: 'accent', props: { which: 'fastest', layout: 'classic', valueTS: { size: 64 } } }, { in: 'pop' });
      const sl = mk('splitcard', { skin: 'frost', props: { which: 'slowest', layout: 'classic', valueTS: { size: 64 } } }, { in: 'pop' });
      k.fitW(f, cw); k.fitW(sl, cw);
      place(f, 0, 1, M, H - M); place(sl, 1, 1, W - M, H - M);
    },
  },
  {
    id: 'receipt', name: 'Run Receipt', desc: 'Monospace receipt with a ticket table',
    bg: { type: 'solid', color: '#e9e5dc' }, theme: { text: '#111111', muted: '#111111aa', accent: '#111111', accent2: '#b91c1c' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const mono = { font: 'JetBrains Mono' };
      const paper = mk('shape', { name: 'Paper', props: { shape: 'rect', color: '#ffffff', radius: 6 } }, { w: (W - 2 * M) / u, h: (H - 2 * M) / u, in: 'up' });
      place(paper, 0.5, 0.5, W / 2, H / 2);
      const P = M + 60 * u;
      const t = mk('text', { props: { text: '*** RUN RECEIPT ***', align: 'center', ts: { size: 46, weight: 800, ...mono } } }, { in: 'fade' });
      k.fitW(t, W - 2 * P); place(t, 0.5, 0, W / 2, paper.y + 70 * u);
      const d = mk('text', { props: { text: '{date}  {startTime}\n{name}', align: 'center', ts: { size: 28, weight: 500, lineHeight: 1.5, ...mono } } }, { in: 'fade' });
      k.fitW(d, W - 2 * P); place(d, 0.5, 0, W / 2, t.y + t.h + 30 * u);
      const tbl = mk('splits', { props: { design: 'lines', lineColor: '#11111133', rowScale: 1.6, colGap: 60, columns: [{ k: 'idx', on: true }, { k: 'time', on: true }, { k: 'pace', on: true }, { k: 'hr', on: true }], cellTS: { size: 36, ...mono, weight: 500 }, headerTS: { size: 22, ...mono }, idxTS: { size: 36, ...mono }, maxRows: 12 } }, { in: 'fade' });
      k.fitW(tbl, W - 2 * P); place(tbl, 0.5, 0, W / 2, d.y + d.h + 50 * u);
      const grid = mk('statgrid', { props: { cols: 2, layout: 'inline', cellGapX: 40, cellGapY: 18, items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }, { m: 'avgHr', on: true }, { m: 'ascent', on: true }, { m: 'calories', on: true }], valueTS: { size: 44, ...mono }, unitTS: { size: 22, ...mono }, labelTS: { size: 20, ...mono } } }, { in: 'fade' });
      k.fitW(grid, W - 2 * P); place(grid, 0.5, 1, W / 2, paper.y + paper.h - 150 * u);
      const thx = mk('text', { props: { text: 'THANK YOU · RUN AGAIN SOON', align: 'center', ts: { size: 24, weight: 700, ...mono } } }, { in: 'fade' });
      k.fitW(thx, W - 2 * P); place(thx, 0.5, 1, W / 2, paper.y + paper.h - 60 * u);
    },
  },
  {
    id: 'retrobadge', name: 'Retro Badge', desc: 'Warm retro colours with a big badge',
    bg: { type: 'solid', color: '#f4e4c1' }, theme: { text: '#3b2a1a', muted: '#3b2a1aaa', accent: '#c2410c', accent2: '#0f766e' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const badge = mk('sticker', { props: { kind: 'badge', text: ' ', shape: 'burst', color: '@accent', textColor: '#f4e4c1', font: 'Righteous' } }, { w: 560, h: 560, in: 'spin' });
      place(badge, 0.5, 0, W / 2, M + 40 * u);
      const bd = mk('stat', { props: { metric: 'distance', layout: 'stackUnit', align: 'center', showLabel: false, decimals: 1, valueTS: { size: 150, font: 'Righteous', weight: 400, color: '#f4e4c1' }, unitTS: { size: 50, font: 'Righteous', weight: 400, color: '#f4e4c1' } } }, { in: 'pop' });
      k.fitW(bd, badge.w * 0.62); place(bd, 0.5, 0.5, W / 2, badge.y + badge.h / 2);
      const t = mk('text', { props: { text: '{name}', align: 'center', ts: { size: 92, font: 'Permanent Marker', weight: 400 } } }, { in: 'up' });
      k.fitW(t, W - 2 * M); place(t, 0.5, 0, W / 2, badge.y + badge.h + 50 * u);
      const items = ['avgPace', 'time', 'avgHr'].map((m) => mk('stat', { skin: 'retro', props: { metric: m, layout: 'reverse', align: 'center', valueTS: { size: 60, font: 'Righteous', weight: 400 }, unitTS: { size: 24, font: 'Righteous', weight: 400 }, labelTS: { size: 18 } }, style: { padX: 28, padY: 24 } }, { in: 'drop' }));
      const gap = 26 * u, cw = (W - 2 * M - gap * 2) / 3;
      items.forEach((s) => k.fitW(s, cw));
      let x = M; const y = t.y + t.h + 70 * u;
      items.forEach((s) => { place(s, 0, 0, x + (cw - s.w) / 2, y); x += cw + gap; });
      const g = mk('graph', { skin: 'retro', props: { metric: 'ele', design: 'area', showTitle: true, title: 'Elevation', lineColor: '@accent2', fillColor: '@accent2', showY: false, gridColor: '#3b2a1a22', titleTS: { color: '#3b2a1a' }, axisTS: { color: '#3b2a1aaa' } }, style: { padX: 28, padY: 24 } }, { w: (W - 2 * M) / u, h: 420, in: 'wipe' });
      place(g, 0.5, 0, W / 2, y + items[0].h + 70 * u);
    },
  },
  {
    id: 'trail', name: 'Trail Elevation', desc: 'Elevation profile, climb stats and 3D route',
    bg: { type: 'gradient', color: '#14281d', color2: '#0b1410', angle: 170 }, theme: { accent: '#a3e635', accent2: '#fbbf24' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const map = mk('map', { props: { line: 'shadow3d', color: '@accent', width: 10, start: 'flag', end: 'checkered', kmMarkers: 'dots' } }, { w: 900, h: 700, in: 'wipe' });
      place(map, 0.5, 0, W / 2, M);
      const asc = mk('stat', { props: { metric: 'ascent', layout: 'iconLeft', icon: 'mountain', valueTS: { size: 110, font: 'Fjalla One', weight: 400 }, unitTS: { size: 40, font: 'Fjalla One', weight: 400 } } }, { in: 'left' });
      place(asc, 0, 0, M, map.y + map.h + 30 * u);
      const g = mk('graph', { props: { metric: 'ele', design: 'gradArea', showTitle: false, showY: true, showX: true, lineColor: '@accent', fillColor: '@accent', showAvg: false } }, { w: (W - 2 * M) / u, h: 480, in: 'wipe' });
      place(g, 0, 0, M, asc.y + asc.h + 40 * u);
      const grid = mk('statgrid', { skin: 'glass', props: { cols: 3, layout: 'reverse', align: 'center', cellGapX: 40, items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }], valueTS: { size: 56, font: 'Fjalla One', weight: 400 }, unitTS: { size: 22 } }, style: { padX: 36, padY: 28 } }, { in: 'up' });
      k.fitW(grid, W - 2 * M); place(grid, 0.5, 1, W / 2, H - M);
    },
  },
  {
    id: 'effort', name: 'Effort & Zones', desc: 'HR donut, gauge and effort stats',
    bg: { type: 'gradient', color: '#2b0f1d', color2: '#0f0a14', angle: 160 }, theme: { accent: '#ff4d6d', accent2: '#ffb3c1' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const t = mk('text', { props: { text: 'EFFORT', ts: { size: 150, font: 'Russo One', weight: 400, color: '@accent', role: 'accent' } } }, { in: 'left' });
      place(t, 0, 0, M, M);
      const hr = mk('stat', { props: { metric: 'avgHr', layout: 'iconInline', icon: 'heart', iconColor: '@accent', valueTS: { size: 100, font: 'Russo One', weight: 400 }, unitTS: { size: 36 } } }, { in: 'left' });
      place(hr, 0, 0, M, t.y + t.h + 30 * u);
      const z = mk('zones', { skin: 'glass', props: { design: 'donut', showTitle: false } }, { w: (W - 2 * M) / u, h: 520, in: 'zoom' });
      place(z, 0, 0, M, hr.y + hr.h + 50 * u);
      const cw = (W - 2 * M - 30 * u) / 2;
      const gauge = mk('gauge', { skin: 'glass', props: { metric: 'hr', design: 'arc', label: 'Avg HR' }, style: { padX: 20, padY: 20 } }, { w: cw / u, h: 300, in: 'pop' });
      place(gauge, 0, 0, M, z.y + z.h + 30 * u);
      const grid = mk('statgrid', { skin: 'glass', props: { cols: 1, layout: 'inline', cellGapY: 26, items: [{ m: 'maxHr', on: true }, { m: 'calories', on: true }, { m: 'time', on: true }], valueTS: { size: 44 }, unitTS: { size: 20 }, labelTS: { size: 16 } }, style: { padX: 28, padY: 26 } }, { in: 'pop' });
      k.fitW(grid, cw); place(grid, 1, 0, W - M, gauge.y);
      if (grid.h < gauge.h) grid.y = gauge.y + (gauge.h - grid.h) / 2;
    },
  },
  {
    id: 'gradtype', name: 'Gradient Type', desc: 'Gradient-filled headline numbers',
    bg: { type: 'solid', color: '#000000' }, theme: { accent: '#f72585', accent2: '#4cc9f0' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const gt = { fill: 'gradient', color: '@accent', color2: '@accent2' };
      const d = mk('stat', { props: { metric: 'distance', layout: 'stackUnit', valueTS: { size: 300, font: 'Unbounded', weight: 800, ...gt }, unitTS: { size: 60, font: 'Unbounded', weight: 700 }, labelTS: { size: 26 } } }, { in: 'pop' });
      k.fitW(d, W - 2 * M); place(d, 0, 0, M, M + 120 * u);
      const p = mk('stat', { props: { metric: 'avgPace', layout: 'classic', valueTS: { size: 130, font: 'Unbounded', weight: 700, ...gt }, unitTS: { size: 40, font: 'Unbounded' } } }, { in: 'up' });
      k.fitW(p, W - 2 * M); place(p, 0, 0, M, d.y + d.h + 60 * u);
      const t = mk('stat', { props: { metric: 'time', layout: 'classic', valueTS: { size: 130, font: 'Unbounded', weight: 700, ...gt }, unitTS: { size: 40 } } }, { in: 'up' });
      k.fitW(t, W - 2 * M); place(t, 0, 0, M, p.y + p.h + 50 * u);
      const g = mk('graph', { props: { metric: 'pace', design: 'heat', colorMode: 'ramp', ramp: 'sunset', showTitle: false, showY: false, showX: false, grid: false, showAvg: false, lineW: 7 } }, { w: (W - 2 * M) / u, h: 240, in: 'wipe' });
      place(g, 0.5, 1, W / 2, H - M - 70 * u);
      const n = mk('text', { props: { text: '{name} — {date}', ts: { size: 28, font: 'Unbounded', weight: 500, color: '@muted', role: 'muted' } } });
      k.fitW(n, W - 2 * M); place(n, 0, 1, M, H - M);
    },
  },
  {
    id: 'trackvid', name: 'Progress Track (video)', desc: 'Runner on a track, live clock and live pace',
    build(k) {
      const { W, H, M, mk, place, u } = k;
      k.setDelay(0);
      const clock = mk('stat', { skin: 'pill', props: { metric: 'time', layout: 'iconInline', icon: 'timer', valueTS: { size: 70, font: 'Chakra Petch', weight: 700 } } }, { in: 'down' });
      place(clock, 0.5, 0, W / 2, M);
      const prog = mk('progress', { skin: 'glass', props: { design: 'track', thickness: 14, showLabels: true } }, { w: (W - 2 * M) / u, h: 150, in: 'up' });
      place(prog, 0.5, 1, W / 2, H - M);
      const cw = (W - 2 * M - 24 * u) / 2;
      const pace = mk('stat', { skin: 'glass', props: { metric: 'pace', layout: 'iconLeft', label: 'Pace', valueTS: { size: 64, font: 'Chakra Petch', weight: 700 } } }, { in: 'left' });
      const hr = mk('stat', { skin: 'glass', props: { metric: 'hr', layout: 'iconLeft', iconColor: '#ff5470', valueTS: { size: 64, font: 'Chakra Petch', weight: 700 } } }, { in: 'right' });
      k.fitW(pace, cw); k.fitW(hr, cw);
      place(pace, 0, 1, M, prog.y - 24 * u); place(hr, 1, 1, W - M, prog.y - 24 * u);
      const dist = mk('stat', { skin: 'glass', props: { metric: 'distance', layout: 'iconLeft', valueTS: { size: 64, font: 'Chakra Petch', weight: 700 } } }, { in: 'left' });
      k.fitW(dist, cw); place(dist, 0, 1, M, pace.y - 24 * u);
      const map = mk('map', { skin: 'glass', props: { line: 'casing', width: 7, dot: 'runner', remaining: 'ghost', start: 'dot', end: 'none' }, style: { padX: 14, padY: 14 } }, { w: 300, h: 300, in: 'zoom' });
      place(map, 1, 1, W - M, hr.y - 24 * u);
    },
  },
];

export const MORE_MULTI = [
  {
    id: 'heatcal', name: 'Heat Calendar', desc: 'Heat squares, totals and longest run',
    bg: { type: 'gradient', color: '#1f1147', color2: '#0b0618', angle: 170 }, theme: { accent: '#f97316', accent2: '#facc15' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const t = mk('text', { props: { text: '{title}', ts: { size: 96, font: 'Kanit', weight: 800 } } }, { in: 'left' });
      k.fitW(t, W - 2 * M); place(t, 0, 0, M, M + 20 * u);
      const r = mk('text', { props: { text: '{range}', ts: { size: 32, weight: 600, color: '@accent', role: 'accent' } } }, { in: 'left' });
      place(r, 0, 0, M, t.y + t.h + 16 * u);
      const cal = mk('mcal', { props: { design: 'heat' } }, { w: (W - 2 * M) / u, h: 260, in: 'up' });
      place(cal, 0, 0, M, r.y + r.h + 60 * u);
      const big = mk('stat', { props: { metric: 'distance', layout: 'stackUnit', valueTS: { size: 260, font: 'Kanit', weight: 800 }, unitTS: { size: 60, font: 'Kanit' } } }, { in: 'pop' });
      k.fitW(big, W - 2 * M); place(big, 0, 0, M, cal.y + cal.h + 80 * u);
      const grid = mk('statgrid', { skin: 'glass', props: { cols: 2, layout: 'iconLeft', cellGapX: 40, cellGapY: 30, items: [{ m: 'runs', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }, { m: 'longest', on: true }], valueTS: { size: 50, font: 'Kanit', weight: 700 }, unitTS: { size: 22 }, labelTS: { size: 16 } }, style: { padX: 36, padY: 30 } }, { in: 'up' });
      k.fitW(grid, W - 2 * M); place(grid, 0, 0, M, big.y + big.h + 60 * u);
      const area = mk('mbars', { props: { design: 'area', color: '@accent', showValues: true } }, { w: (W - 2 * M) / u, h: Math.max(200, (H - M - (grid.y + grid.h + 60 * u)) / u), in: 'wipe' });
      place(area, 0.5, 1, W / 2, H - M);
    },
  },
  {
    id: 'weekreceipt', name: 'Week Receipt', desc: 'Monospace receipt of every run',
    bg: { type: 'solid', color: '#e9e5dc' }, theme: { text: '#111111', muted: '#111111aa', accent: '#111111', accent2: '#b91c1c' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const mono = { font: 'JetBrains Mono' };
      const paper = mk('shape', { name: 'Paper', props: { shape: 'rect', color: '#ffffff', radius: 6 } }, { w: (W - 2 * M) / u, h: (H - 2 * M) / u, in: 'up' });
      place(paper, 0.5, 0.5, W / 2, H / 2);
      const P = M + 60 * u;
      const t = mk('text', { props: { text: '*** {title} ***', align: 'center', ts: { size: 44, weight: 800, transform: 'upper', ...mono } } }, { in: 'fade' });
      k.fitW(t, W - 2 * P); place(t, 0.5, 0, W / 2, paper.y + 70 * u);
      const r = mk('text', { props: { text: '{range}', align: 'center', ts: { size: 28, weight: 500, ...mono } } }, { in: 'fade' });
      place(r, 0.5, 0, W / 2, t.y + t.h + 24 * u);
      const list = mk('mlist', { props: { design: 'lines', lineColor: '#11111133', rowScale: 1.8, colGap: 56, columns: [{ k: 'day', on: true }, { k: 'name', on: false }, { k: 'dist', on: true }, { k: 'time', on: true }, { k: 'pace', on: true }, { k: 'hr', on: false }], cellTS: { size: 40, ...mono, weight: 500 }, headerTS: { size: 22, ...mono }, dayTS: { size: 36, ...mono, color: '#111111' }, nameTS: { ...mono } } }, { in: 'fade' });
      k.fitW(list, W - 2 * P); place(list, 0.5, 0, W / 2, r.y + r.h + 50 * u);
      const grid = mk('statgrid', { props: { cols: 1, layout: 'inline', cellGapY: 16, items: [{ m: 'runs', on: true }, { m: 'distance', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }], valueTS: { size: 48, ...mono }, unitTS: { size: 24, ...mono }, labelTS: { size: 22, ...mono } } }, { in: 'fade' });
      k.fitW(grid, W - 2 * P); place(grid, 0.5, 1, W / 2, paper.y + paper.h - 150 * u);
      const thx = mk('text', { props: { text: 'TOTAL PAID IN SWEAT', align: 'center', ts: { size: 24, weight: 700, ...mono } } }, { in: 'fade' });
      place(thx, 0.5, 1, W / 2, paper.y + paper.h - 60 * u);
    },
  },
  {
    id: 'neonweek', name: 'Neon Week', desc: 'Glowing lollipop chart and neon totals',
    bg: { type: 'solid', color: '#05060a' }, theme: { accent: '#00f0ff', accent2: '#ff2bd6' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const t = mk('text', { props: { text: 'WEEK {week}', align: 'center', ts: { size: 110, font: 'Orbitron', weight: 800, color: '@accent', shadow: true, shadowColor: '@accent', shadowBlur: 30, shadowX: 0, shadowY: 0 } } }, { in: 'blur' });
      k.fitW(t, W - 2 * M); place(t, 0.5, 0, W / 2, M + 30 * u);
      const r = mk('text', { props: { text: '{range}', align: 'center', ts: { size: 30, weight: 600, font: 'Orbitron', color: '@accent2' } } }, { in: 'fade' });
      place(r, 0.5, 0, W / 2, t.y + t.h + 20 * u);
      const bars = mk('mbars', { skin: 'neon', props: { design: 'lollipop', color: '@accent2' } }, { w: (W - 2 * M) / u, h: 520, in: 'wipe' });
      place(bars, 0, 0, M, r.y + r.h + 70 * u);
      const stats = ['distance', 'runs', 'time'].map((m) => mk('stat', { skin: 'neon', props: { metric: m, layout: 'reverse', align: 'center', valueTS: { size: 58, font: 'Orbitron' }, unitTS: { size: 22 }, labelTS: { size: 16 } }, style: { padX: 24, padY: 22 } }, { in: 'pop' }));
      const gap = 22 * u, cw = (W - 2 * M - gap * 2) / 3;
      stats.forEach((s) => k.fitW(s, cw));
      let x = M; const y = bars.y + bars.h + 60 * u;
      stats.forEach((s) => { place(s, 0, 0, x + (cw - s.w) / 2, y); x += cw + gap; });
      const ch = mk('mchart', { props: { metric: 'avgPace', design: 'dots', color: '@accent' } }, { w: (W - 2 * M) / u, h: 300, in: 'wipe' });
      place(ch, 0.5, 1, W / 2, H - M);
    },
  },
  {
    id: 'minweek', name: 'Minimal Totals', desc: 'One clean stat strip, perfect over a photo',
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const grid = mk('statgrid', { props: { cols: 4, dividers: true, dividerColor: '#ffffff55', cellGapX: 50, layout: 'reverse', items: [{ m: 'runs', on: true }, { m: 'distance', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }], valueTS: { size: 56, weight: 800, font: 'Inter', ...SH }, unitTS: { size: 22, ...SH }, labelTS: { size: 18, ...SH } } }, { in: 'up' });
      k.fitW(grid, W - 2 * M); place(grid, 0.5, 1, W / 2, H - M * 1.4);
      const line = mk('shape', { props: { shape: 'line', color: '@accent', strokeW: 4 } }, { w: (W - 2 * M) / u, h: 8, in: 'wipe' });
      place(line, 0.5, 1, W / 2, grid.y - 34 * u);
      const t = mk('text', { props: { text: '{title}', ts: { size: 48, weight: 800, ...SH } } }, { in: 'up' });
      place(t, 0, 1, M, line.y - 22 * u);
      const r = mk('text', { align: 'right', props: { text: '{range}', align: 'right', ts: { size: 28, weight: 600, color: '@muted', role: 'muted', ...SH } } }, { in: 'up' });
      place(r, 1, 1, W - M, line.y - 26 * u);
    },
  },
  {
    id: 'magweek', name: 'Weekly Journal', desc: 'Serif headline with a minimal run list',
    bg: { type: 'solid', color: '#faf7f2' }, theme: { text: '#1c1917', muted: '#1c1917aa', accent: '#b45309', accent2: '#0f766e' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const t = mk('text', { props: { text: 'The\nWeek in\nRunning', ts: { size: 150, font: 'DM Serif Display', weight: 400, lineHeight: 0.95 } } }, { in: 'up' });
      k.fitW(t, W - 2 * M); place(t, 0, 0, M, M + 30 * u);
      const r = mk('text', { props: { text: '{range} — {runs} runs, {distance} {unit}', ts: { size: 32, font: 'Playfair Display', weight: 400, italic: true, color: '@accent', role: 'accent' } } }, { in: 'up' });
      k.fitW(r, W - 2 * M); place(r, 0, 0, M, t.y + t.h + 30 * u);
      const rule = mk('shape', { props: { shape: 'line', color: '#1c1917', strokeW: 2 } }, { w: (W - 2 * M) / u, h: 6, in: 'wipe' });
      place(rule, 0, 0, M, r.y + r.h + 40 * u);
      const list = mk('mlist', { props: { design: 'minimal', columns: [{ k: 'day', on: true }, { k: 'name', on: true }, { k: 'dist', on: true }, { k: 'pace', on: true }], rowScale: 2.2, colGap: 44, cellTS: { size: 40, font: 'Playfair Display', weight: 400 }, nameTS: { size: 40, font: 'Playfair Display', weight: 700 }, dayTS: { size: 30, font: 'Inter', weight: 800 }, headerTS: { size: 22, font: 'Inter' } } }, { in: 'fade' });
      k.fitW(list, W - 2 * M); place(list, 0, 0, M, rule.y + rule.h + 40 * u);
      const grid = mk('statgrid', { props: { cols: 3, layout: 'reverse', cellGapX: 50, dividers: true, dividerColor: '#1c191733', items: [{ m: 'time', on: true }, { m: 'avgPace', on: true }, { m: 'ascent', on: true }], valueTS: { size: 56, font: 'DM Serif Display', weight: 400 }, unitTS: { size: 24, font: 'Playfair Display' }, labelTS: { size: 16 } } }, { in: 'up' });
      k.fitW(grid, W - 2 * M); place(grid, 0, 1, M, H - M);
    },
  },
  {
    id: 'routewall', name: 'Route Wall', desc: 'Glowing route grid with the big total',
    bg: { type: 'solid', color: '#07080c' }, theme: { accent: '#c6ff3d', accent2: '#00e0ff' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const big = mk('stat', { props: { metric: 'distance', layout: 'inline', label: 'This week', valueTS: { size: 150, font: 'Bebas Neue', weight: 400, color: '@accent' }, unitTS: { size: 50, font: 'Bebas Neue', weight: 400 }, labelTS: { size: 26 } } }, { in: 'left' });
      k.fitW(big, W - 2 * M); place(big, 0, 0, M, M + 20 * u);
      const g = mk('mroutes', { props: { design: 'grid', cols: 3, palette: true, glow: 18, label: 'day' } }, { w: (W - 2 * M) / u, h: 1100, in: 'fade' });
      place(g, 0, 0, M, big.y + big.h + 50 * u);
      const grid = mk('statgrid', { props: { cols: 3, layout: 'reverse', align: 'center', cellGapX: 40, items: [{ m: 'runs', on: true }, { m: 'time', on: true }, { m: 'avgPace', on: true }], valueTS: { size: 54, font: 'Bebas Neue', weight: 400 }, unitTS: { size: 24 }, labelTS: { size: 16 } } }, { in: 'up' });
      k.fitW(grid, W - 2 * M); place(grid, 0.5, 1, W / 2, H - M);
    },
  },
  {
    id: 'pillsweek', name: 'Daily Pills', desc: 'Pill chart per day with pace bars',
    bg: { type: 'gradient', color: '#0f172a', color2: '#1e1b4b', angle: 160 }, theme: { accent: '#a78bfa', accent2: '#f472b6' },
    build(k) {
      const { W, H, M, mk, place, u } = k;
      const t = mk('text', { props: { text: '{title}', ts: { size: 84, font: 'Lexend', weight: 800 } } }, { in: 'down' });
      k.fitW(t, W - 2 * M); place(t, 0, 0, M, M + 20 * u);
      const r = mk('text', { props: { text: '{range}', ts: { size: 30, font: 'Lexend', weight: 500, color: '@muted', role: 'muted' } } }, { in: 'down' });
      place(r, 0, 0, M, t.y + t.h + 14 * u);
      const grid = mk('statgrid', { skin: 'frost', props: { cols: 3, layout: 'reverse', align: 'center', cellGapX: 40, items: [{ m: 'distance', on: true }, { m: 'time', on: true }, { m: 'runs', on: true }], valueTS: { size: 56, font: 'Lexend', weight: 700 }, unitTS: { size: 22 } }, style: { padX: 36, padY: 28 } }, { in: 'up' });
      k.fitW(grid, W - 2 * M); place(grid, 0.5, 0, W / 2, r.y + r.h + 50 * u);
      const bars = mk('mbars', { skin: 'glass', props: { design: 'pills', gradient: true } }, { w: (W - 2 * M) / u, h: 600, in: 'wipe' });
      place(bars, 0, 0, M, grid.y + grid.h + 40 * u);
      const ch = mk('mchart', { skin: 'glass', props: { metric: 'avgPace', design: 'hbars', ramp: true } }, { w: (W - 2 * M) / u, h: 460, in: 'wipe' });
      place(ch, 0.5, 1, W / 2, H - M);
    },
  },
];
