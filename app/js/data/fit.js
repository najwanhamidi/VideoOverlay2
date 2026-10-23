// Minimal, dependency-free FIT decoder focused on activity files.
// Handles chained files, compressed timestamps, developer fields, arrays, both endians.
const FIT_EPOCH = 631065600; // seconds between 1970-01-01 and 1989-12-31

const BASE = {
  0: [1, 'u8', 0xff], 1: [1, 's8', 0x7f], 2: [1, 'u8', 0xff], 3: [2, 's16', 0x7fff], 4: [2, 'u16', 0xffff],
  5: [4, 's32', 0x7fffffff], 6: [4, 'u32', 0xffffffff], 7: [1, 'str', null], 8: [4, 'f32', null], 9: [8, 'f64', null],
  10: [1, 'u8', 0], 11: [2, 'u16', 0], 12: [4, 'u32', 0], 13: [1, 'u8', 0xff], 14: [8, 's64', null], 15: [8, 'u64', null], 16: [8, 'u64', 0],
};

function readOne(dv, p, kind, little) {
  switch (kind) {
    case 'u8': return dv.getUint8(p);
    case 's8': return dv.getInt8(p);
    case 'u16': return dv.getUint16(p, little);
    case 's16': return dv.getInt16(p, little);
    case 'u32': return dv.getUint32(p, little);
    case 's32': return dv.getInt32(p, little);
    case 'f32': return dv.getFloat32(p, little);
    case 'f64': return dv.getFloat64(p, little);
    case 's64': return Number(dv.getBigInt64(p, little));
    case 'u64': return Number(dv.getBigUint64(p, little));
  }
  return null;
}

export function decodeFit(input) {
  const buf = input instanceof ArrayBuffer ? input : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  const dv = new DataView(buf);
  const out = { file_id: [], record: [], lap: [], session: [], event: [], activity: [], sport: [] };
  const NAMES = { 0: 'file_id', 18: 'session', 19: 'lap', 20: 'record', 21: 'event', 34: 'activity', 12: 'sport' };
  let pos = 0;
  let any = false;
  while (pos + 12 <= dv.byteLength) {
    const hsize = dv.getUint8(pos);
    if (hsize < 12) break;
    const dataSize = dv.getUint32(pos + 4, true);
    const sig = String.fromCharCode(dv.getUint8(pos + 8), dv.getUint8(pos + 9), dv.getUint8(pos + 10), dv.getUint8(pos + 11));
    if (sig !== '.FIT') { if (!any) throw new Error('Not a FIT file'); break; }
    any = true;
    let p = pos + hsize;
    const end = Math.min(p + dataSize, dv.byteLength);
    const defs = {};
    let lastTs = 0;
    while (p < end) {
      const h = dv.getUint8(p++);
      let def, ts = null;
      if (h & 0x80) {
        const local = (h >> 5) & 3, off = h & 0x1f;
        ts = (lastTs & ~0x1f) + off;
        if (off < (lastTs & 0x1f)) ts += 0x20;
        lastTs = ts;
        def = defs[local];
      } else if (h & 0x40) {
        const local = h & 0x0f, hasDev = h & 0x20;
        p++; // reserved
        const little = dv.getUint8(p++) === 0;
        const gnum = dv.getUint16(p, little); p += 2;
        const nf = dv.getUint8(p++);
        const fields = [];
        for (let i = 0; i < nf; i++) { fields.push([dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2) & 0x1f]); p += 3; }
        let devSize = 0;
        if (hasDev) { const nd = dv.getUint8(p++); for (let i = 0; i < nd; i++) { devSize += dv.getUint8(p + 1); p += 3; } }
        defs[local] = { gnum, little, fields, devSize, name: NAMES[gnum] };
        continue;
      } else {
        def = defs[h & 0x0f];
      }
      if (!def) throw new Error('Corrupt FIT: missing definition');
      const obj = def.name ? {} : null;
      for (const [num, size, bt] of def.fields) {
        if (obj) {
          const [bs, kind, inv] = BASE[bt] || [1, 'u8', null];
          let v;
          if (kind === 'str') {
            let s = '';
            for (let i = 0; i < size; i++) { const c = dv.getUint8(p + i); if (!c) break; s += String.fromCharCode(c); }
            try { s = decodeURIComponent(escape(s)); } catch (e) { /* keep raw */ }
            v = s || null;
          } else if (size > bs && size % bs === 0) {
            v = [];
            for (let i = 0; i < size; i += bs) { const x = readOne(dv, p + i, kind, def.little); v.push(x === inv ? null : x); }
          } else if (size === bs) {
            v = readOne(dv, p, kind, def.little);
            if (v === inv || (kind[0] === 'f' && !isFinite(v))) v = null;
          } else v = null;
          if (v !== null) obj[num] = v;
          if (num === 253 && typeof v === 'number') lastTs = v;
        } else if (num === 253 && size === 4) {
          lastTs = dv.getUint32(p, def.little);
        }
        p += size;
      }
      p += def.devSize;
      if (obj) { if (ts !== null && obj[253] == null) obj[253] = ts; out[def.name].push(obj); }
    }
    pos = end + 2;
  }
  return out;
}

const ts2date = (v) => (v == null ? null : (v + FIT_EPOCH));
const sc = (v, s, o = 0) => (v == null ? null : v / s - o);
const semi = (v) => (v == null ? null : v * (180 / 2147483648));
const SPORTS = { 0: 'generic', 1: 'running', 2: 'cycling', 5: 'swimming', 11: 'walking', 17: 'hiking', 10: 'training', 15: 'rowing' };

// Convert decoded FIT to the app's raw activity format.
export function fitToRaw(buf) {
  const f = decodeFit(buf);
  const sess = f.session[0] || {};
  const sportNum = sess[5] ?? (f.sport[0] || {})[0];
  const sport = SPORTS[sportNum] || 'running';
  const cadMul = sport === 'running' || sport === 'walking' || sport === 'hiking' ? 2 : 1;
  const records = f.record.filter((r) => r[253] != null).map((r) => {
    const ele = r[78] != null ? sc(r[78], 5, 500) : r[2] != null ? sc(r[2], 5, 500) : null;
    const spd = r[73] != null ? r[73] / 1000 : r[6] != null ? r[6] / 1000 : null;
    let cad = r[4] != null ? r[4] : null;
    if (cad != null && r[53] != null) cad += r[53] / 128;
    return {
      ts: ts2date(r[253]), lat: semi(r[0]), lon: semi(r[1]), ele,
      hr: r[3] ?? null, cad: cad != null ? cad * cadMul : null, dist: r[5] != null ? r[5] / 100 : null,
      spd, pwr: r[7] ?? null, temp: r[13] ?? null,
    };
  });
  const laps = f.lap.map((l) => ({
    start: ts2date(l[2] ?? null), end: ts2date(l[253] ?? null),
    elapsed: sc(l[7], 1000), timer: sc(l[8], 1000), dist: sc(l[9], 100),
    avgHr: l[15] ?? null, maxHr: l[16] ?? null,
    avgSpd: l[110] != null ? l[110] / 1000 : l[13] != null ? l[13] / 1000 : null,
    cad: l[17] != null ? l[17] * cadMul : null, ascent: l[21] ?? null, descent: l[22] ?? null, cal: l[11] ?? null,
    trigger: l[24] ?? null,
  }));
  const timer = [];
  for (const e of f.event) {
    if (e[0] !== 0 || e[253] == null) continue; // timer events only
    const t = e[1];
    if (t === 0) timer.push({ ts: ts2date(e[253]), on: true });
    else if (t === 1 || t === 4 || t === 8 || t === 9) timer.push({ ts: ts2date(e[253]), on: false });
  }
  const summary = {
    start: ts2date(sess[2] ?? (f.file_id[0] || {})[4] ?? null),
    elapsed: sc(sess[7], 1000), timer: sc(sess[8], 1000), dist: sc(sess[9], 100),
    avgHr: sess[16] ?? null, maxHr: sess[17] ?? null,
    avgSpd: sess[124] != null ? sess[124] / 1000 : sess[14] != null ? sess[14] / 1000 : null,
    cad: sess[18] != null ? sess[18] * cadMul : null, maxCad: sess[19] != null ? sess[19] * cadMul : null,
    pwr: sess[20] ?? null, maxPwr: sess[21] ?? null,
    ascent: sess[22] ?? null, descent: sess[23] ?? null, cal: sess[11] ?? null,
  };
  return { sport, records, laps, timer, summary };
}
