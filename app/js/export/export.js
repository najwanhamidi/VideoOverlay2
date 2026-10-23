// Image & video export.
import { App, makeEnv, videoLength, layoutAll } from '../editor/state.js';
import { renderScene } from '../widgets/core.js';
import { el, clamp } from '../util.js';
import { modal, button, row, select, seg, toggle, toast, range } from '../editor/ui.js';
import { saveBlob, canShare, shareBlob } from '../platform.js';
import { zipSync } from '../../vendor/fflate.js';

function fileBase() {
  const d = App.doc;
  const n = d.mode === 'multi' ? (d.title || 'weekly') : (App.act?.name || 'run');
  return ('lari-' + n).replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').toLowerCase();
}
export function renderFrame(doc, scale, time, bgOverride, canvas) {
  const W = Math.round(doc.w * scale / 2) * 2, H = Math.round(doc.h * scale / 2) * 2;
  const c = canvas || document.createElement('canvas');
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const ctx = c.getContext('2d', { alpha: true });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.setTransform(W / doc.w, 0, 0, H / doc.h, 0, 0);
  const env = makeEnv(doc, { time });
  renderScene(ctx, doc, env, { override: bgOverride });
  return c;
}
const toBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));

export function openExport(kind = 'image') {
  layoutAll();
  const d = App.doc;
  const body = el('div', { class: 'export' });
  const st = { kind, scale: 1, fmt: 'png', vfmt: 'mp4', fps: d.video.fps, bg: 'doc', quality: 'high' };
  const tabs = seg(kind, [['image', 'Image'], ['video', 'Video']], (v) => { st.kind = v; draw(); });
  const opts = el('div');
  const info = el('div', { class: 'help' });
  const prog = el('div', { class: 'prog hidden' }, el('div', { class: 'bar' }), el('span', {}));
  const out = el('div', { class: 'out' });
  body.append(tabs, opts, info, prog, out);
  const go = button('Export', () => run(), 'primary');
  const m = modal('Export', body, [go]);
  let cancel = false;
  function draw() {
    opts.innerHTML = ''; out.innerHTML = '';
    const bgOpts = [['doc', `Canvas background (${d.bg.type})`], ['transparent', 'Transparent']];
    if (st.kind === 'image') {
      opts.append(row('Format', seg(st.fmt, [['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WebP']], (v) => { st.fmt = v; draw(); })));
      opts.append(row('Resolution', seg(String(st.scale), [['0.5', '0.5×'], ['1', '1×'], ['2', '2×'], ['3', '3×']], (v) => { st.scale = +v; draw(); })));
      if (st.fmt === 'png' || st.fmt === 'webp') opts.append(row('Background', select(st.bg, bgOpts, (v) => { st.bg = v; })));
      info.textContent = `${Math.round(d.w * st.scale)} × ${Math.round(d.h * st.scale)} px. Tip: use Transparent PNG to place the overlay on any photo in Instagram, CapCut, etc.`;
    } else {
      const sup = typeof VideoEncoder !== 'undefined';
      opts.append(row('Format', select(st.vfmt, [['mp4', 'MP4 (H.264) — best for social'], ['webm', 'WebM (VP9)'], ['webm-alpha', 'WebM with transparency'], ['png', 'PNG frame sequence (.zip, transparent)']], (v) => { st.vfmt = v; draw(); })));
      opts.append(row('Resolution', seg(String(st.scale), [['0.5', '0.5×'], ['0.75', '0.75×'], ['1', '1×']], (v) => { st.scale = +v; draw(); })));
      opts.append(row('Frame rate', seg(String(st.fps), [['24', '24'], ['30', '30'], ['60', '60']], (v) => { st.fps = +v; draw(); })));
      opts.append(row('Quality', seg(st.quality, [['normal', 'Normal'], ['high', 'High'], ['max', 'Max']], (v) => { st.quality = v; })));
      if (st.vfmt !== 'mp4') opts.append(row('Background', select(st.bg, bgOpts, (v) => { st.bg = v; })));
      const len = videoLength(d);
      info.innerHTML = '';
      info.append(`${len.toFixed(1)} s · ${Math.ceil(len * st.fps)} frames · ${Math.round(d.w * st.scale)}×${Math.round(d.h * st.scale)}. Change timing under Canvas → Video timing. `);
      if (st.vfmt === 'mp4' && d.bg.type === 'transparent') info.append(el('b', {}, 'MP4 cannot be transparent — the background will be black. Use WebM with transparency or PNG frames for overlays. '));
      if (!sup && st.vfmt !== 'png') info.append(el('b', {}, 'This browser lacks WebCodecs; a real-time recorder will be used instead.'));
    }
  }
  draw();
  async function run() {
    go.disabled = true; cancel = false; out.innerHTML = '';
    prog.classList.remove('hidden');
    const setP = (f, msg) => { prog.firstChild.style.width = clamp(f, 0, 1) * 100 + '%'; prog.lastChild.textContent = msg || Math.round(f * 100) + '%'; };
    const stop = button('Cancel', () => { cancel = true; }, 'small ghost'); out.append(stop);
    try {
      let blob, name;
      if (st.kind === 'image') {
        setP(0.3, 'Rendering…');
        await document.fonts.ready;
        const c = renderFrame(d, st.scale, null, st.bg === 'transparent' && st.fmt !== 'jpeg' ? { type: 'transparent' } : (st.fmt === 'jpeg' && d.bg.type === 'transparent' ? { type: 'solid', color: '#000000' } : null));
        blob = await toBlob(c, 'image/' + st.fmt, 0.95);
        name = `${fileBase()}.${st.fmt === 'jpeg' ? 'jpg' : st.fmt}`;
      } else {
        const bg = st.bg === 'transparent' && st.vfmt !== 'mp4' ? { type: 'transparent' } : (st.vfmt === 'mp4' && d.bg.type === 'transparent' ? { type: 'solid', color: '#000000' } : null);
        const res = await exportVideo(d, { ...st, bg }, setP, () => cancel);
        if (!res) { setP(0, 'Cancelled'); return; }
        blob = res.blob; name = `${fileBase()}.${res.ext}`;
      }
      stop.remove();
      setP(1, `Done · ${(blob.size / 1048576).toFixed(1)} MB`);
      const url = URL.createObjectURL(blob);
      if (st.kind === 'image') out.append(el('img', { src: url, class: 'preview' }));
      else if (/^video/.test(blob.type)) out.append(el('video', { src: url, class: 'preview', controls: true, loop: true, muted: true, autoplay: true, playsinline: true }));
      out.append(el('div', { class: 'btnrow' }, button('Save file', () => saveBlob(blob, name), 'primary'), canShare(blob, name) ? button('Share…', () => shareBlob(blob, name), '') : null));
      await saveBlob(blob, name);
    } catch (e) {
      console.error(e); toast('Export failed: ' + e.message, 'err'); setP(0, 'Failed: ' + e.message);
    } finally { go.disabled = false; }
  }
  return m;
}

const BITRATE = { normal: 0.08, high: 0.16, max: 0.3 }; // bits per pixel per frame
async function pickCodec(kind, w, h, fps, bitrate, alpha) {
  if (typeof VideoEncoder === 'undefined') return null;
  const cands = kind === 'avc' ? ['avc1.640028', 'avc1.64002A', 'avc1.640033', 'avc1.4D4028', 'avc1.42E028', 'avc1.640034'] : ['vp09.00.10.08', 'vp09.00.40.08', 'vp8'];
  for (const codec of cands) {
    const cfg = { codec, width: w, height: h, bitrate, framerate: fps, latencyMode: 'quality' };
    if (alpha) cfg.alpha = 'keep';
    if (kind === 'avc') cfg.avc = { format: 'avc' };
    try { const s = await VideoEncoder.isConfigSupported(cfg); if (s.supported) return s.config; } catch (e) { /* next */ }
  }
  return null;
}
export async function exportVideo(doc, st, onP, isCancelled) {
  const fps = st.fps, len = videoLength(doc), N = Math.max(1, Math.ceil(len * fps));
  const W = Math.round(doc.w * st.scale / 2) * 2, H = Math.round(doc.h * st.scale / 2) * 2;
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  if (st.vfmt === 'png') {
    const files = {};
    for (let i = 0; i < N; i++) {
      if (isCancelled()) return null;
      renderFrame(doc, st.scale, i / fps, st.bg, canvas);
      const b = await toBlob(canvas, 'image/png');
      files[`frame_${String(i).padStart(5, '0')}.png`] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }];
      onP(i / N, `Frame ${i + 1} / ${N}`);
    }
    onP(0.99, 'Zipping…');
    return { blob: new Blob([zipSync(files)], { type: 'application/zip' }), ext: 'zip' };
  }
  const isMp4 = st.vfmt === 'mp4', alpha = st.vfmt === 'webm-alpha';
  const bitrate = Math.round(W * H * fps * (BITRATE[st.quality] || 0.16));
  const cfg = await pickCodec(isMp4 ? 'avc' : 'vp9', W, H, fps, bitrate, alpha);
  if (!cfg) {
    if (alpha) { toast('Transparent WebM not supported here — exporting PNG frames instead'); return exportVideo(doc, { ...st, vfmt: 'png' }, onP, isCancelled); }
    return recordRealtime(doc, st, W, H, onP, isCancelled);
  }
  let muxer, target;
  if (isMp4) {
    const M = await import('../../vendor/mp4-muxer.js');
    target = new M.ArrayBufferTarget();
    muxer = new M.Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  } else {
    const M = await import('../../vendor/webm-muxer.js');
    target = new M.ArrayBufferTarget();
    muxer = new M.Muxer({ target, video: { codec: cfg.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width: W, height: H, frameRate: fps, alpha }, firstTimestampBehavior: 'offset' });
  }
  let err = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { err = e; } });
  enc.configure(cfg);
  for (let i = 0; i < N; i++) {
    if (isCancelled()) { try { enc.close(); } catch (e) { /* */ } return null; }
    if (err) throw err;
    renderFrame(doc, st.scale, i / fps, st.bg, canvas);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps), alpha: alpha ? 'keep' : 'discard' });
    enc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
    if (i % 3 === 0) { onP(i / N, `Encoding frame ${i + 1} / ${N}`); await new Promise((r) => setTimeout(r, 0)); }
  }
  await enc.flush();
  if (err) throw err;
  muxer.finalize();
  enc.close();
  return { blob: new Blob([target.buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' }), ext: isMp4 ? 'mp4' : 'webm' };
}
// Fallback: real-time MediaRecorder
async function recordRealtime(doc, st, W, H, onP, isCancelled) {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const stream = canvas.captureStream(st.fps);
  const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!mime) throw new Error('Video recording is not supported in this browser');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(W * H * st.fps * 0.12) });
  const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const len = videoLength(doc);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start(250);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (isCancelled() || t > len) { resolve(); return; }
      renderFrame(doc, st.scale, t, st.bg, canvas); onP(t / len, `Recording ${t.toFixed(1)} / ${len.toFixed(1)} s`);
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop(); await done;
  if (isCancelled()) return null;
  const type = mime.split(';')[0];
  return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm' };
}
