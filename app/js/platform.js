// Platform helpers: saving files on web, mobile share sheet, and the desktop (Neutralino) build.
export const isDesktop = () => typeof window.Neutralino !== 'undefined' && typeof window.NL_OS !== 'undefined';

export async function saveBlob(blob, name) {
  if (isDesktop()) {
    try {
      const ext = name.split('.').pop();
      const path = await Neutralino.os.showSaveDialog('Save ' + name, { defaultPath: name, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
      if (!path) return false;
      await Neutralino.filesystem.writeBinaryFile(path, await blob.arrayBuffer());
      return true;
    } catch (e) { console.warn('desktop save failed, falling back', e); }
  }
  if (window.showSaveFilePicker && !/Mobi|Android/i.test(navigator.userAgent)) {
    try {
      const ext = '.' + name.split('.').pop();
      const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: ext.slice(1).toUpperCase() + ' file', accept: { [blob.type || 'application/octet-stream']: [ext] } }] });
      const w = await h.createWritable(); await w.write(blob); await w.close();
      return true;
    } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}
export function canShare(blob, name) {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: blob.type })] })); } catch (e) { return false; }
}
export async function shareBlob(blob, name) {
  try { await navigator.share({ files: [new File([blob], name, { type: blob.type })], title: name }); } catch (e) { /* user cancelled */ }
}
export async function initDesktop() {
  if (!isDesktop()) return;
  try {
    Neutralino.init();
    Neutralino.events.on('windowClose', () => Neutralino.app.exit());
    document.documentElement.classList.add('desktop');
  } catch (e) { console.warn(e); }
}
