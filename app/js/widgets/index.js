// Loads all widgets and defines the "Add" library per mode.
import './stat.js';
import './media.js';
import './graph.js';
import './map.js';
import './splits.js';
import './multi.js';
export { REG } from './core.js';

const T = (text, size, extra = {}) => ({ type: 'text', over: { props: { text, ts: { size, ...extra } } } });
const S = (metric, extra = {}) => ({ type: 'stat', over: { props: { metric, ...extra } } });

export const LIBRARY = {
  single: [
    { cat: 'Text', items: [
      { label: 'Heading', icon: 'hash', ...T('MORNING MILES', 130, { font: 'Bebas Neue', weight: 400, spacing: 2 }) },
      { label: 'Run name', icon: 'signpost', ...T('{name}', 72, { font: 'Montserrat', weight: 900 }) },
      { label: 'Date', icon: 'calendar', ...T('{date}', 34, { weight: 600, role: 'muted', color: '@muted' }) },
      { label: 'Data sentence', icon: 'sparkles', ...T('{distance} {unit} in {time}', 48, { weight: 700 }) },
      { label: 'Paragraph', icon: 'hash', type: 'text', over: { props: { text: 'Write something about\nyour run here', wrap: 0, ts: { size: 36, weight: 400, lineHeight: 1.35 } } } },
      { label: 'Highlight text', icon: 'sparkles', type: 'text', over: { props: { text: 'NEW PB!', hl: true, ts: { size: 64, color: '#0d0f14', font: 'Archivo Black', weight: 400 } } } },
    ] },
    { cat: 'Stats', items: [
      { label: 'Distance', icon: 'route', ...S('distance') }, { label: 'Moving time', icon: 'timer', ...S('time') },
      { label: 'Avg pace', icon: 'gauge', ...S('avgPace') }, { label: 'Avg heart rate', icon: 'heart', ...S('avgHr') },
      { label: 'Max heart rate', icon: 'heart-pulse', ...S('maxHr') }, { label: 'Elevation gain', icon: 'mountain', ...S('ascent') },
      { label: 'Calories', icon: 'flame', ...S('calories') }, { label: 'Cadence', icon: 'footprints', ...S('avgCad') },
      { label: 'Elapsed time', icon: 'clock', ...S('elapsed') }, { label: 'Avg speed', icon: 'zap', ...S('avgSpeed') },
      { label: 'Live pace', icon: 'gauge', ...S('pace') }, { label: 'Live heart rate', icon: 'heart-pulse', ...S('hr') },
      { label: 'Live elevation', icon: 'mountain-snow', ...S('ele') }, { label: 'Time of day', icon: 'clock-3', ...S('clock') },
      { label: 'Best 5K', icon: 'medal', ...S('best5k') }, { label: 'Fastest split', icon: 'trophy', ...S('fastestSplit') },
      { label: 'Steps', icon: 'footprints', ...S('steps') }, { label: 'Power', icon: 'bolt', ...S('avgPwr') },
      { label: 'Stat grid', icon: 'chart-no-axes-column', type: 'statgrid' },
    ] },
    { cat: 'Splits & laps', items: [
      { label: 'Km splits table', icon: 'flag', type: 'splits' },
      { label: 'Device laps table', icon: 'flag-triangle-right', type: 'splits', over: { props: { splits: { mode: 'laps' } } } },
      { label: 'Custom laps table', icon: 'repeat', type: 'splits', over: { props: { splits: { mode: 'dist', every: 2 } } } },
      { label: 'Split pace bars', icon: 'chart-column', type: 'graph', over: { props: { design: 'splitBars', metric: 'pace', title: 'Split pace' } } },
      { label: 'Split HR bars', icon: 'chart-column', type: 'graph', over: { props: { design: 'splitBars', metric: 'hr', title: 'Split HR', colorMode: 'zones' } } },
      { label: 'Split highlight', icon: 'trophy', type: 'splitcard' },
      { label: 'Split progress', icon: 'milestone', type: 'progress', over: { props: { design: 'segments' } } },
    ] },
    { cat: 'Graphs', items: [
      { label: 'Pace graph', icon: 'chart-line', type: 'graph', over: { props: { metric: 'pace' } } },
      { label: 'Heart rate graph', icon: 'activity', type: 'graph', over: { props: { metric: 'hr', colorMode: 'zones', design: 'area', lineColor: '#ff5470', fillColor: '#ff5470' } } },
      { label: 'Elevation profile', icon: 'mountain', type: 'graph', over: { props: { metric: 'ele', design: 'gradArea', fillColor: '#ffffff', lineColor: '#ffffff', showAvg: false } } },
      { label: 'Cadence graph', icon: 'footprints', type: 'graph', over: { props: { metric: 'cad', design: 'dots', bars: 50 } } },
      { label: 'Speed graph', icon: 'zap', type: 'graph', over: { props: { metric: 'speed', design: 'neon' } } },
      { label: 'HR zones', icon: 'heart', type: 'zones' },
      { label: 'Gauge', icon: 'circle-gauge', type: 'gauge' },
    ] },
    { cat: 'Route', items: [
      { label: 'Route map', icon: 'map', type: 'map' },
      { label: 'Heat route', icon: 'map', type: 'map', over: { props: { line: 'heat', width: 12 } } },
      { label: 'Progress bar', icon: 'chevrons-right', type: 'progress' },
      { label: 'Runner track', icon: 'footprints', type: 'progress', over: { props: { design: 'track' } } },
      { label: 'Best efforts', icon: 'medal', type: 'best' },
    ] },
  ],
  multi: [
    { cat: 'Text', items: [
      { label: 'Title', icon: 'hash', ...T('WEEKLY RECAP', 130, { font: 'Bebas Neue', weight: 400, spacing: 3 }) },
      { label: 'Period dates', icon: 'calendar', ...T('{range}', 36, { weight: 600, color: '@muted', role: 'muted' }) },
      { label: 'Week number', icon: 'calendar-days', ...T('WEEK {week}', 48, { font: 'Oswald', weight: 700 }) },
      { label: 'Data sentence', icon: 'sparkles', ...T('{runs} runs · {distance} {unit}', 48, { weight: 700 }) },
      { label: 'Paragraph', icon: 'hash', type: 'text', over: { props: { text: 'Notes about the week', ts: { size: 36, weight: 400 } } } },
    ] },
    { cat: 'Totals', items: [
      { label: 'Total distance', icon: 'route', ...S('distance', { decimals: 1 }) }, { label: 'Total time', icon: 'timer', ...S('time') },
      { label: 'Runs', icon: 'footprints', ...S('runs') }, { label: 'Avg pace', icon: 'gauge', ...S('avgPace') },
      { label: 'Avg heart rate', icon: 'heart', ...S('avgHr') }, { label: 'Elevation', icon: 'mountain', ...S('ascent') },
      { label: 'Longest run', icon: 'trophy', ...S('longest') }, { label: 'Fastest pace', icon: 'zap', ...S('fastest') },
      { label: 'Calories', icon: 'flame', ...S('calories') }, { label: 'Active days', icon: 'calendar-days', ...S('activeDays') },
      { label: 'Stat grid', icon: 'chart-no-axes-column', type: 'statgrid' },
    ] },
    { cat: 'Runs', items: [
      { label: 'Run list', icon: 'flag', type: 'mlist' }, { label: 'Daily chart', icon: 'chart-column', type: 'mbars' },
      { label: 'Week strip', icon: 'calendar-days', type: 'mcal' }, { label: 'Per-run chart', icon: 'chart-no-axes-column', type: 'mchart' },
      { label: 'Routes', icon: 'map', type: 'mroutes' },
    ] },
  ],
  media: { cat: 'Media & shapes', items: [
    { label: 'Image', icon: 'camera', type: 'image' },
    { label: 'Icon sticker', icon: 'star', type: 'sticker' },
    { label: 'Emoji', icon: 'smile', type: 'sticker', over: { props: { kind: 'emoji' } } },
    { label: 'Badge', icon: 'award', type: 'sticker', over: { props: { kind: 'badge' }, w: 260, h: 260 } },
    { label: 'Rectangle', icon: 'badge-check', type: 'shape', over: { w: 500, h: 300 } },
    { label: 'Circle', icon: 'target', type: 'shape', over: { props: { shape: 'ellipse' } } },
    { label: 'Line', icon: 'ruler', type: 'shape', over: { props: { shape: 'line', strokeW: 6, color: '#ffffff' }, w: 600, h: 20 } },
    { label: 'Star', icon: 'star', type: 'shape', over: { props: { shape: 'star' } } },
  ] },
};
