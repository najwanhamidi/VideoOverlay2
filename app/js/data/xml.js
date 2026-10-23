// TCX and GPX parsers (browser DOMParser), namespace-agnostic.
const kids = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
const first = (node, name) => { const e = node.getElementsByTagNameNS('*', name)[0]; return e || null; };
const num = (node, name) => { const e = first(node, name); if (!e) return null; const v = parseFloat(e.textContent); return isFinite(v) ? v : null; };
const directChild = (node, name) => Array.from(node.children).find((c) => c.localName === name) || null;
const directNum = (node, name) => { const e = directChild(node, name); if (!e) return null; const v = parseFloat(e.textContent); return isFinite(v) ? v : null; };
const tsOf = (s) => (s ? Date.parse(s.trim()) / 1000 : null);

function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid XML file');
  return doc;
}

export function tcxToRaw(text) {
  const doc = parseXml(text);
  const act = first(doc, 'Activity');
  const sportAttr = act?.getAttribute('Sport') || 'Running';
  const sport = /bik/i.test(sportAttr) ? 'cycling' : /run/i.test(sportAttr) ? 'running' : 'running';
  const records = [], laps = [];
  let name = null;
  const notes = act && first(act, 'Notes'); if (notes) name = notes.textContent.trim() || null;
  for (const lap of kids(doc, 'Lap')) {
    const start = tsOf(lap.getAttribute('StartTime'));
    const timer = directNum(lap, 'TotalTimeSeconds');
    const avgHrE = directChild(lap, 'AverageHeartRateBpm'), maxHrE = directChild(lap, 'MaximumHeartRateBpm');
    laps.push({
      start, timer, elapsed: timer, dist: directNum(lap, 'DistanceMeters'),
      avgHr: avgHrE ? num(avgHrE, 'Value') : null, maxHr: maxHrE ? num(maxHrE, 'Value') : null,
      cal: directNum(lap, 'Calories'), cad: directNum(lap, 'Cadence'),
    });
    for (const tp of kids(lap, 'Trackpoint')) {
      const ts = tsOf(first(tp, 'Time')?.textContent);
      if (ts == null || isNaN(ts)) continue;
      const hrE = first(tp, 'HeartRateBpm');
      let cad = num(tp, 'RunCadence'); if (cad == null) cad = directNum(tp, 'Cadence');
      if (cad != null && sport === 'running') cad *= 2;
      records.push({
        ts, lat: num(tp, 'LatitudeDegrees'), lon: num(tp, 'LongitudeDegrees'), ele: num(tp, 'AltitudeMeters'),
        dist: directNum(tp, 'DistanceMeters'), hr: hrE ? num(hrE, 'Value') : null, cad,
        spd: num(tp, 'Speed'), pwr: num(tp, 'Watts'),
      });
    }
  }
  return { sport, records, laps, timer: [], summary: {}, name };
}

export function gpxToRaw(text) {
  const doc = parseXml(text);
  const trk = first(doc, 'trk');
  const name = (trk && directChild(trk, 'name')?.textContent.trim()) || first(doc, 'name')?.textContent.trim() || null;
  const type = trk && directChild(trk, 'type')?.textContent || '';
  const sport = /bik|cycl|ride/i.test(type) ? 'cycling' : /walk/i.test(type) ? 'walking' : /hik/i.test(type) ? 'hiking' : 'running';
  let pts = kids(doc, 'trkpt');
  if (!pts.length) pts = kids(doc, 'rtept');
  const records = [];
  for (const p of pts) {
    const ts = tsOf(directChild(p, 'time')?.textContent);
    let hr = null, cad = null, pwr = null, temp = null;
    for (const e of p.getElementsByTagName('*')) {
      const n = e.localName.toLowerCase();
      if (n === 'hr' || n === 'heartrate') hr = parseFloat(e.textContent);
      else if (n === 'cad' || n === 'cadence') cad = parseFloat(e.textContent);
      else if (n === 'power') pwr = parseFloat(e.textContent);
      else if (n === 'atemp' || n === 'temp') temp = parseFloat(e.textContent);
    }
    if (cad != null && sport === 'running' && cad < 120) cad *= 2;
    records.push({
      ts: ts ?? null, lat: parseFloat(p.getAttribute('lat')), lon: parseFloat(p.getAttribute('lon')),
      ele: directNum(p, 'ele'), hr: isFinite(hr) ? hr : null, cad: isFinite(cad) ? cad : null, pwr: isFinite(pwr) ? pwr : null, temp: isFinite(temp) ? temp : null,
      dist: null, spd: null,
    });
  }
  // GPX without timestamps: synthesize 1 point every ~3 s so it can still be drawn.
  if (records.length && records.every((r) => r.ts == null)) {
    const t0 = Date.now() / 1000; records.forEach((r, i) => (r.ts = t0 + i * 3)); records.noTime = true;
  }
  return { sport, records: records.filter((r) => r.ts != null), laps: [], timer: [], summary: {}, name };
}
