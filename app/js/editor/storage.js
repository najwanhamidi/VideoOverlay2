// Persistence: IndexedDB autosave, user templates, project files.
const DB = 'lari-studio', VER = 1;
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('tpl')) d.createObjectStore('tpl', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return dbp;
}
async function tx(store, mode, fn) {
  try {
    const d = await db();
    return await new Promise((res, rej) => { const t = d.transaction(store, mode); const s = t.objectStore(store); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
  } catch (e) { console.warn('storage', e); return null; }
}
export const kvSet = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
export const kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k));
export const saveUserTemplate = (t) => tx('tpl', 'readwrite', (s) => s.put(t));
export const deleteUserTemplate = (id) => tx('tpl', 'readwrite', (s) => s.delete(id));
export async function listUserTemplates(mode) { const all = (await tx('tpl', 'readonly', (s) => s.getAll())) || []; return all.filter((t) => t.mode === mode); }

// Activities without caches (structured-clone friendly)
export function packAct(a) { if (!a) return null; const { _cache, ...rest } = a; return rest; }
export function unpackAct(a) { if (!a) return null; a._cache = {}; a.start = new Date(a.start); return a; }
// JSON-friendly activity (typed arrays -> arrays)
export function actToJSON(a) {
  const o = packAct(a);
  const C = {}, P = {};
  for (const k in o.C) C[k] = Array.from(o.C[k], (v) => (Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null));
  for (const k in o.P) P[k] = Array.from(o.P[k], (v) => Math.round(v * 1000) / 1000);
  return { ...o, C, P, eleS: Array.from(o.eleS, (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null)), start: o.start.toISOString() };
}
export function actFromJSON(o) {
  const C = {}, P = {};
  for (const k in o.C) C[k] = Float64Array.from(o.C[k], (v) => (v == null ? NaN : v));
  for (const k in o.P) P[k] = Float64Array.from(o.P[k]);
  return { ...o, C, P, eleS: Float64Array.from(o.eleS, (v) => (v == null ? NaN : v)), start: new Date(o.start), _cache: {} };
}
