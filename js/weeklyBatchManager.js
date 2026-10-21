/**
 * Weekly & Batch Activities Manager
 * Handles multi-activity ingestion (ZIP archive or multiple .FIT / .TCX / .GPX files),
 * aggregate weekly stat calculations, run renaming, metric toggles, and demo batch generation.
 */

import { parseActivityFile, normalizeActivity } from './parsers/dataNormalizer.js';
import { formatTime, formatPace } from './splitCalculator.js';

/**
 * Parses a ZIP file or multiple files into an array of normalized activities.
 * @param {FileList|Array<File>} files - Input files from file input or drag & drop
 * @param {boolean} isImperial - Whether imperial units are active
 * @returns {Promise<Array<Object>>} Parsed activities sorted by date
 */
export async function parseWeeklyFiles(files, isImperial = false) {
  const fileArray = Array.from(files);
  const activities = [];

  for (const file of fileArray) {
    const nameLower = file.name.toLowerCase();

    if (nameLower.endsWith('.zip')) {
      // Unpack ZIP archive
      const zipActivities = await parseZipFile(file, isImperial);
      activities.push(...zipActivities);
    } else if (nameLower.endsWith('.fit') || nameLower.endsWith('.tcx') || nameLower.endsWith('.gpx') || nameLower.endsWith('.json')) {
      try {
        const act = await parseActivityFile(file, isImperial);
        if (act && act.distance > 0) {
          act.id = 'run_' + Math.random().toString(36).substr(2, 9);
          act.fileName = file.name;
          act.enabled = true;
          act.date = act.date || act.startDate || act.startTime || new Date();
          activities.push(act);
        }
      } catch (err) {
        console.warn(`Failed to parse file: ${file.name}`, err);
      }
    }
  }

  // Sort activities chronologically (earliest to latest)
  activities.sort((a, b) => {
    const da = a.date instanceof Date ? a.date.getTime() : new Date(a.date || 0).getTime();
    const db = b.date instanceof Date ? b.date.getTime() : new Date(b.date || 0).getTime();
    return da - db;
  });

  // Assign clean initial run names based on day and distance
  activities.forEach((act, idx) => {
    if (!act.customName) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const d = act.date instanceof Date ? act.date : new Date(act.date || Date.now());
      const dayStr = dayNames[d.getDay()] || `Run ${idx + 1}`;
      const distStr = `${act.distanceMain || (act.distance / 1000).toFixed(1)} ${act.distanceUnit || 'km'}`;
      act.customName = `${dayStr} Run (${distStr})`;
    }
  });

  return activities;
}

/**
 * Extracts and parses all activity files within a ZIP archive.
 */
async function parseZipFile(zipFile, isImperial = false) {
  const activities = [];

  if (typeof window !== 'undefined' && window.JSZip) {
    try {
      const zip = await window.JSZip.loadAsync(zipFile);
      const entries = [];

      zip.forEach((relativePath, zipEntry) => {
        const lower = zipEntry.name.toLowerCase();
        if (!zipEntry.dir && (lower.endsWith('.fit') || lower.endsWith('.tcx') || lower.endsWith('.gpx') || lower.endsWith('.json'))) {
          // Avoid macOS __MACOSX metadata
          if (!lower.includes('__macosx')) {
            entries.push(zipEntry);
          }
        }
      });

      for (const entry of entries) {
        try {
          const lower = entry.name.toLowerCase();
          let parsed;
          if (lower.endsWith('.fit')) {
            const buf = await entry.async('arraybuffer');
            parsed = await parseActivityFile({
              name: entry.name,
              arrayBuffer: async () => buf,
              text: async () => ''
            }, isImperial);
          } else {
            const txt = await entry.async('string');
            parsed = await parseActivityFile({
              name: entry.name,
              arrayBuffer: async () => new ArrayBuffer(0),
              text: async () => txt
            }, isImperial);
          }

          if (parsed && parsed.distance > 0) {
            parsed.id = 'run_' + Math.random().toString(36).substr(2, 9);
            parsed.fileName = entry.name;
            parsed.enabled = true;
            parsed.date = parsed.date || parsed.startDate || parsed.startTime || new Date();
            activities.push(parsed);
          }
        } catch (err) {
          console.warn(`Error parsing ZIP entry ${entry.name}:`, err);
        }
      }
    } catch (zipErr) {
      console.error('JSZip failed to read archive:', zipErr);
    }
  }

  return activities;
}

/**
 * Computes consolidated stats across all enabled runs in the batch.
 * @param {Array<Object>} runs - List of activity objects
 * @param {boolean} isImperial - Whether imperial units are active
 * @param {number} targetDistance - Optional weekly goal distance (in km or mi)
 * @returns {Object} Consolidated weekly metrics
 */
export function computeWeeklyStats(runs = [], isImperial = false, targetDistance = 0) {
  const activeRuns = runs.filter((r) => r.enabled !== false);
  const count = activeRuns.length;

  let totalDistMeters = 0;
  let totalDurationSec = 0;
  let totalEleGain = 0;
  let totalCalories = 0;
  let hrWeightedSum = 0;
  let hrWeightedDuration = 0;
  let maxHrObserved = 0;
  let fastestPace = Infinity;
  let longestDist = 0;
  let fastestRun = null;
  let longestRun = null;

  // Day of week distribution [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayBuckets = dayNames.map((day) => ({ day, distanceMeters: 0, count: 0, durationSec: 0 }));

  activeRuns.forEach((run) => {
    const dist = run.distance || 0;
    const dur = run.duration || 0;
    const ele = run.elevationGain || 0;
    const cal = run.calories || 0;
    const hr = run.avgHr || 0;
    const pace = run.avgPace || 0;

    totalDistMeters += dist;
    totalDurationSec += dur;
    totalEleGain += ele;
    totalCalories += cal;

    if (hr > 0 && dur > 0) {
      hrWeightedSum += hr * dur;
      hrWeightedDuration += dur;
    }
    if (run.maxHr && run.maxHr > maxHrObserved) {
      maxHrObserved = run.maxHr;
    }

    if (pace > 0 && pace < fastestPace) {
      fastestPace = pace;
      fastestRun = run;
    }
    if (dist > longestDist) {
      longestDist = dist;
      longestRun = run;
    }

    // Map to day of week (Monday=0 ... Sunday=6)
    const rawDate = run.date || run.startDate || run.startTime;
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate || Date.now());
    const jsDay = d.getDay(); // 0 is Sunday, 1 is Monday...
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Sun=6
    if (dayBuckets[dayIdx]) {
      dayBuckets[dayIdx].distanceMeters += dist;
      dayBuckets[dayIdx].count += 1;
      dayBuckets[dayIdx].durationSec += dur;
    }
  });

  const totalDistKm = totalDistMeters / 1000;
  const totalDistMi = totalDistMeters / 1609.34;
  const unit = isImperial ? 'mi' : 'km';
  const paceUnit = isImperial ? '/mi' : '/km';
  const distVal = isImperial ? totalDistMi : totalDistKm;
  const distFormatted = distVal.toFixed(2);

  const avgPaceSec = distVal > 0 ? totalDurationSec / distVal : 0;
  const avgPaceFormatted = formatPace(avgPaceSec, isImperial);

  const avgHr = hrWeightedDuration > 0 ? Math.round(hrWeightedSum / hrWeightedDuration) : null;

  // Format Total Duration: e.g. "3h 48m" or "48m 20s"
  let durationFormatted = '0m';
  if (totalDurationSec > 0) {
    const hrs = Math.floor(totalDurationSec / 3600);
    const mins = Math.floor((totalDurationSec % 3600) / 60);
    const secs = Math.floor(totalDurationSec % 60);
    if (hrs > 0) {
      durationFormatted = `${hrs}h ${mins}m`;
    } else {
      durationFormatted = `${mins}m ${secs}s`;
    }
  }

  // Date range string: e.g. "Oct 13 - Oct 19, 2026"
  let dateRangeStr = 'Weekly Session';
  if (activeRuns.length > 0) {
    const dates = activeRuns
      .map((r) => {
        const rawDate = r.date || r.startDate || r.startTime;
        return rawDate instanceof Date ? rawDate : new Date(rawDate || Date.now());
      })
      .filter((d) => !isNaN(d.getTime()));

    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      const first = dates[0];
      const last = dates[dates.length - 1];
      const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fMonth = mNames[first.getMonth()];
      const lMonth = mNames[last.getMonth()];
      const year = last.getFullYear();

      if (fMonth === lMonth) {
        dateRangeStr = `${fMonth} ${first.getDate()} – ${last.getDate()}, ${year}`;
      } else {
        dateRangeStr = `${fMonth} ${first.getDate()} – ${lMonth} ${last.getDate()}, ${year}`;
      }
    }
  }

  // Day distribution normalized distances
  const dayDistribution = dayBuckets.map((b) => ({
    day: b.day,
    count: b.count,
    distanceMain: isImperial ? (b.distanceMeters / 1609.34).toFixed(1) : (b.distanceMeters / 1000).toFixed(1),
    distanceRaw: isImperial ? b.distanceMeters / 1609.34 : b.distanceMeters / 1000
  }));

  // Max day distance for bar scaling with mathematically true rounded ceiling
  const maxDayDist = Math.max(0.1, ...dayDistribution.map((d) => d.distanceRaw));
  // Round up ceiling to clean interval (5, 10, 15, 20, 25, 30, 35, 40...)
  const scaleCeiling = Math.max(5, Math.ceil(maxDayDist / 5) * 5);
  dayDistribution.forEach((d) => {
    d.heightRatio = d.distanceRaw > 0 ? d.distanceRaw / scaleCeiling : 0;
  });

  // Goal calculation
  const goalDist = Number(targetDistance) || 0;
  const goalProgress = goalDist > 0 ? Math.min(100, Math.round((distVal / goalDist) * 100)) : null;

  // Cumulative progression
  let runningCum = 0;
  const cumulativeProgression = dayDistribution.map((d) => {
    runningCum += d.distanceRaw;
    return {
      day: d.day,
      daily: d.distanceRaw,
      cumulative: parseFloat(runningCum.toFixed(2))
    };
  });

  // Radar metrics (normalized 0.1 to 1.0)
  const radarMetrics = {
    distance: Math.min(1.0, Math.max(0.15, distVal / (isImperial ? 50 : 70))),
    duration: Math.min(1.0, Math.max(0.15, totalDurationSec / (5 * 3600))),
    speed: avgPaceSec > 0 ? Math.min(1.0, Math.max(0.15, (450 - (avgPaceSec - 240)) / 300)) : 0.6,
    elevation: Math.min(1.0, Math.max(0.15, totalEleGain / 500)),
    effort: avgHr > 0 ? Math.min(1.0, Math.max(0.15, (avgHr - 110) / 70)) : 0.6,
    frequency: Math.min(1.0, Math.max(0.15, count / 7))
  };

  return {
    cumulativeProgression,
    radarMetrics,
    maxDayDist,
    scaleCeiling,
    count,
    activeRuns,
    totalDistMeters,
    totalDistKm,
    totalDistMi,
    distVal,
    distFormatted,
    unit,
    paceUnit,
    totalDurationSec,
    durationFormatted,
    avgPaceSec,
    avgPaceFormatted,
    avgHr,
    maxHr: maxHrObserved,
    totalEleGain: Math.round(totalEleGain),
    totalCalories: Math.round(totalCalories),
    longestRun,
    fastestRun,
    dayDistribution,
    dateRangeStr,
    goalDist,
    goalProgress
  };
}

/**
 * Generates 5 realistic sample running activities for testing weekly recap overlay.
 * @param {boolean} isImperial - Whether imperial units are active
 * @returns {Array<Object>} 5 realistic demo runs spanning Mon-Sun
 */
export function getDemoWeeklyActivities(isImperial = false) {
  const centerLat = 40.785091; // Central Park NYC
  const centerLon = -73.968285;
  const now = new Date();

  // Find Monday of current week
  const dayOfWeek = now.getDay();
  const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diffToMon));
  monday.setHours(7, 30, 0, 0);

  const demoSpecs = [
    {
      name: 'Monday Recovery Run',
      dayOffset: 0,
      radiusKm: 0.8,
      numPoints: 120,
      durationSec: 1530, // 25:30
      distMeters: 5020,
      avgHr: 142,
      maxHr: 156,
      elevationGain: 38,
      calories: 345,
    },
    {
      name: 'Wednesday Speed Intervals',
      dayOffset: 2,
      radiusKm: 1.25,
      numPoints: 160,
      durationSec: 2280, // 38:00
      distMeters: 8200,
      avgHr: 168,
      maxHr: 184,
      elevationGain: 65,
      calories: 590,
    },
    {
      name: 'Thursday Aerobic Base',
      dayOffset: 3,
      radiusKm: 0.95,
      numPoints: 130,
      durationSec: 1840, // 30:40
      distMeters: 6150,
      avgHr: 149,
      maxHr: 162,
      elevationGain: 42,
      calories: 420,
    },
    {
      name: 'Saturday Fast Tempo',
      dayOffset: 5,
      radiusKm: 1.5,
      numPoints: 180,
      durationSec: 2790, // 46:30
      distMeters: 10100,
      avgHr: 162,
      maxHr: 177,
      elevationGain: 88,
      calories: 740,
    },
    {
      name: 'Sunday Marathon Long Run',
      dayOffset: 6,
      radiusKm: 2.2,
      numPoints: 240,
      durationSec: 5460, // 1h 31m
      distMeters: 18050,
      avgHr: 154,
      maxHr: 169,
      elevationGain: 155,
      calories: 1290,
    },
  ];

  const activities = demoSpecs.map((spec, idx) => {
    const runDate = new Date(monday.getTime() + spec.dayOffset * 86400000);
    const pts = [];
    const ptsCount = spec.numPoints;
    let cumDist = 0;
    let prevLat = null;
    let prevLon = null;

    for (let i = 0; i < ptsCount; i++) {
      const frac = i / (ptsCount - 1);
      const angle = frac * Math.PI * 2;
      const r = spec.radiusKm * (1 + 0.3 * Math.sin(2 * angle + idx) + 0.15 * Math.cos(4 * angle));
      const lat = centerLat + (r * Math.sin(angle)) / 111.32;
      const lon = centerLon + (r * Math.cos(angle)) / (111.32 * Math.cos((centerLat * Math.PI) / 180));
      const ele = 45 + Math.sin(angle * 3) * (spec.elevationGain * 0.4);
      const hr = Math.round(spec.avgHr + Math.sin(angle * 2) * 8 + (Math.random() * 2 - 1));

      if (prevLat !== null && prevLon !== null) {
        const dLatRad = ((lat - prevLat) * Math.PI) / 180;
        const dLonRad = ((lon - prevLon) * Math.PI) / 180;
        const a =
          Math.sin(dLatRad / 2) ** 2 +
          Math.cos((prevLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLonRad / 2) ** 2;
        const d = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        cumDist += d;
      }
      prevLat = lat;
      prevLon = lon;

      pts.push({
        lat,
        lon,
        ele: Math.round(ele * 10) / 10,
        hr,
        dist: cumDist,
        time: new Date(runDate.getTime() + (spec.durationSec * frac) * 1000)
      });
    }

    // Scale distances to exact spec
    const scale = cumDist > 0 ? spec.distMeters / cumDist : 1;
    pts.forEach((p) => { p.dist = Math.round(p.dist * scale); });

    const distKm = spec.distMeters / 1000;
    const distMi = spec.distMeters / 1609.34;
    const distanceMain = isImperial ? distMi.toFixed(2) : distKm.toFixed(2);
    const distanceUnit = isImperial ? 'mi' : 'km';
    const distNum = isImperial ? distMi : distKm;
    const paceSec = distNum > 0 ? spec.durationSec / distNum : 0;

    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    pts.forEach((pt) => {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lon < minLon) minLon = pt.lon;
      if (pt.lon > maxLon) maxLon = pt.lon;
    });

    return {
      id: `demo_run_${idx + 1}`,
      customName: spec.name,
      fileName: `${spec.name.toLowerCase().replace(/\s+/g, '_')}.fit`,
      date: runDate,
      dateFormatted: runDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      distance: spec.distMeters,
      distanceMain,
      distanceUnit,
      duration: spec.durationSec,
      durationFormatted: formatTime(spec.durationSec),
      avgPace: paceSec,
      avgPaceFormatted: formatPace(paceSec, isImperial),
      avgHr: spec.avgHr,
      maxHr: spec.maxHr,
      elevationGain: spec.elevationGain,
      calories: spec.calories,
      trackpoints: pts,
      bounds: { minLat, maxLat, minLon, maxLon },
      hasRoute: true,
      enabled: true
    };
  });

  return activities;
}
