// File loading: detects format, unpacks ZIP / GZ, returns activities.
import { unzipSync, gunzipSync } from '../../vendor/fflate.js';
import { fitToRaw } from './fit.js';
import { tcxToRaw, gpxToRaw } from './xml.js';
import { buildActivity } from './activity.js';

const textDec = new TextDecoder();
function isFit(u8) { return u8.length > 12 && u8[8] === 0x2e && u8[9] === 0x46 && u8[10] === 0x49 && u8[11] === 0x54; }

function parseBytes(name, u8) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.gz') || (u8[0] === 0x1f && u8[1] === 0x8b)) {
    return parseBytes(name.replace(/\.gz$/i, ''), gunzipSync(u8));
  }
  if (isFit(u8) || lower.endsWith('.fit')) return fitToRaw(u8);
  const text = textDec.decode(u8);
  if (lower.endsWith('.tcx') || /<TrainingCenterDatabase/i.test(text.slice(0, 2000))) return tcxToRaw(text);
  if (lower.endsWith('.gpx') || /<gpx/i.test(text.slice(0, 2000))) return gpxToRaw(text);
  throw new Error('Unsupported file type');
}

const SUPPORTED = /\.(fit|tcx|gpx)(\.gz)?$/i;

// Returns { activities: [], errors: [] }
export async function loadFiles(files) {
  const activities = [], errors = [];
  const handle = (name, u8) => {
    try {
      const raw = parseBytes(name, u8);
      const base = name.split('/').pop().replace(/\.(fit|tcx|gpx)(\.gz)?$/i, '');
      activities.push(buildActivity(raw, { file: base }));
    } catch (e) { errors.push(`${name}: ${e.message}`); }
  };
  for (const f of files) {
    const u8 = new Uint8Array(await f.arrayBuffer());
    const name = f.name || 'file';
    if (/\.zip$/i.test(name) || (u8[0] === 0x50 && u8[1] === 0x4b)) {
      let entries;
      try { entries = unzipSync(u8, { filter: (fi) => SUPPORTED.test(fi.name) && !/__MACOSX/.test(fi.name) }); }
      catch (e) { errors.push(`${name}: could not open ZIP (${e.message})`); continue; }
      const names = Object.keys(entries);
      if (!names.length) errors.push(`${name}: no .fit/.tcx/.gpx files found inside`);
      for (const n of names) handle(n, entries[n]);
    } else handle(name, u8);
  }
  activities.sort((a, b) => a.start - b.start);
  return { activities, errors };
}
