// Preview playback / scrubbing of the animation.
import { App, on, emit, videoLength } from './state.js';
import { requestRender } from './stage.js';

let playBtn, scrub, label, staticBtn, last = 0;
export function initTimeline() {
  playBtn = document.querySelector('#tl-play'); scrub = document.querySelector('#tl-scrub'); label = document.querySelector('#tl-time'); staticBtn = document.querySelector('#tl-static');
  playBtn.onclick = () => (App.playing ? pause() : play());
  staticBtn.onclick = () => { pause(); App.time = null; sync(); emit('time'); requestRender(); };
  scrub.addEventListener('input', () => { pause(); App.time = +scrub.value; sync(); requestRender(); });
  on((w) => { if (w === 'doc' || w === 'mode') sync(); });
  sync();
}
export function play() {
  const len = videoLength(App.doc);
  if (App.time == null || App.time >= len - 0.01) App.time = 0;
  App.playing = true; last = performance.now();
  document.body.classList.add('playing');
  const tick = (now) => {
    if (!App.playing) return;
    App.time += (now - last) / 1000; last = now;
    if (App.time >= len) App.time = 0;
    sync(); requestRender();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  sync(); emit('time');
}
export function pause() { App.playing = false; document.body.classList.remove('playing'); sync(); requestRender(); }
export function togglePlay() { App.playing ? pause() : play(); }
function sync() {
  const len = videoLength(App.doc);
  scrub.max = len.toFixed(2); scrub.step = 0.01;
  scrub.value = App.time == null ? len : App.time;
  label.textContent = App.time == null ? `Still · ${len.toFixed(1)}s video` : `${App.time.toFixed(1)} / ${len.toFixed(1)} s`;
  playBtn.innerHTML = App.playing ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
  staticBtn.classList.toggle('on', App.time == null);
}
