# Lari Studio — running overlays

Make Instagram/TikTok-ready running overlays and animated videos from your own activity files, in the style of RunCut / RunStory. Everything runs on your device; files are never uploaded anywhere.

- **Web app** (`app/`): works on phone and desktop browsers, installable as an app (PWA), works offline. Host it free on GitHub Pages.
- **Desktop app**: a standalone Windows `.exe` (plus macOS/Linux builds) of the same app, built with Neutralino.

## What it does

**Two workspaces (tabs at the top)**
- **Activity**: one run from a `.fit`, `.tcx`, `.gpx` (also `.fit.gz` / `.zip`).
- **Multi-run**: drop a ZIP of a week's (or any period's) runs → weekly stats overlay. Rename each run, include/exclude runs, set the period title.

**Widgets** (each with many layouts × 21 backdrop styles)
- Stats: distance, moving/elapsed time, avg pace, avg/max HR, elevation, calories, cadence, power, speed, steps, best 1K/mile/5K/10K, fastest split, date, start time, plus *live* pace/HR/elevation/clock that change during the video. 17 layouts (classic, inline, ticker, tag, ring, badge, digital, side label…).
- Stat grid: pick which stats show (toggle avg pace, avg HR, distance, time…), rename, reorder.
- Splits & laps: per-km/mile, **device laps** from the file, or **manual laps** (every X km, every X minutes, or custom marks like `1, 3, 5, 8.5`). Used by the splits table (11 designs, column toggles/rename/reorder), split pace/HR bar charts, split highlight (fastest/slowest/any/current), split progress.
- Graphs: pace, heart rate (with HR-zone colours), elevation, cadence, speed, power — 12 designs (area, gradient, neon, heat, bars, split bars, steps, dots…).
- Route map (9 line styles incl. heat-by-pace/HR, start/finish markers, km markers, moving runner dot), HR zones (5 designs), gauge, progress bar/track, best efforts.
- Multi-run: totals, run list (toggle day/date/name/distance/time/pace/HR/elev/cadence columns), daily chart, week strip, per-run chart, routes gallery.
- Text (with data tokens like `{distance}`, `{avgPace}`, `{name}`), images, icon/emoji/badge stickers, shapes.

**Editing**
- **Edit any single text inside a widget:** tap/click a widget to select it, then tap any text in it (value, label, unit, a table cell, a graph title…) to select just that text. Change its words and its style (font, size, colour, outline, shadow…) on its own. Tap it again, double-click it, or press Enter to type straight on the canvas. *Reset to data* brings back the original value.
- Drag to move, handles to resize and rotate — single items, multi-selection (Shift/Ctrl-click or drag a box) or groups (Ctrl+G).
- Arrow keys nudge (Shift = 10 px, or grid size when snapping). Snap to grid with adjustable size, plus smart alignment guides.
- Every text part (value, label, unit, headers…) can be styled individually: font (32 built in + upload your own), weight, size, colour/gradient, letter spacing, line height, case, outline, shadow/glow, opacity. Or edit all text of a widget, a selection or the whole canvas at once.
- Every widget: backdrop (none/solid/gradient), opacity, corner radius, padding, border (style/sides), drop shadow, blend mode, flip, rotation.
- Zoom (buttons, Ctrl+wheel, pinch), undo/redo, duplicate, copy/paste, layers panel (reorder, hide, lock, rename), Trash with restore.
- Theme colours: elements using theme swatches recolour together.
- Templates: 24 for single runs, 13 for multi-run; save your own designs as templates.

**Numbers** are always rounded down (10.299 km shows 10.29, a 5:33.9 pace shows 5:33), never up.

**Export**
- Image: PNG / JPG / WebP at 0.5×–3×, background = transparent, solid, gradient or your photo (with fit, zoom, darken, blur).
- Video: MP4 (H.264), WebM, transparent WebM, or transparent PNG frame sequence. Data counts up and graphs/maps/splits draw in with the run's progress; each element has an entrance animation (fade, slide, pop, wipe, typewriter…), delay and easing. Timing is set under *Canvas → Video timing*. Preview with the ▶ button.
- On phones a *Share…* button sends the file straight to Instagram etc.

## Put it on GitHub Pages

1. Create a new repository on GitHub (for example `lari-studio`).
2. Upload the contents of this folder (everything except `Desktop App/`, which `.gitignore` already skips). With git:
   ```
   git init && git add . && git commit -m "Lari Studio"
   git branch -M main
   git remote add origin https://github.com/<you>/lari-studio.git
   git push -u origin main
   ```
3. **Rename the folder `_github` to `.github`** before pushing (it holds the automatic deploy workflows; it's named with an underscore only because it couldn't be written as a hidden folder).
4. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. The included workflow (`.github/workflows/pages.yml`) publishes `app/` on every push. Your app will be at `https://<you>.github.io/lari-studio/`.
6. On your phone open that link and choose **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android: ⋮ → Install app). Desktop Chrome/Edge can also install it from the address bar.

## Versions
- **v1.1** – edit individual text inside widgets, round-down numbers, 19 new templates.
- **v1.0** – first release. Kept on the `v1` branch.

## Desktop app

`Desktop App/LariStudio-win_x64.exe` is a single portable file — double-click to run, no install. It uses Microsoft Edge WebView2, which is built into Windows 10/11. (Windows SmartScreen may warn because the file isn't code-signed: click *More info → Run anyway*.)

To rebuild it after changing the code (needs Node.js): `npm run desktop` → files appear in `dist/LariStudio/` (Windows, macOS and Linux). Or push a tag such as `v1.0.1` and the `.github/workflows/desktop.yml` workflow builds them and attaches them to a GitHub Release.

## Run locally

`npm start` then open http://localhost:8080 (or any static web server pointed at `app/`). Opening `index.html` directly from disk won't work because browsers block ES modules on `file://`.

## Getting your files
- **Garmin Connect** (web): open an activity → ⚙ → *Export Original* (`.fit` inside a zip — just drop the zip in).
- **Strava**: activity → ⋯ → *Export Original*; or Settings → My Account → *Download your data* (`.fit.gz` files are supported).
- **COROS / Suunto / Polar / Apple Health exporters**: `.fit`, `.tcx` or `.gpx` all work.

## Project layout
```
app/                 the whole web app (static files, no build step)
  index.html, css/, fonts/ (offline fonts), icons/, vendor/ (fflate, mp4/webm muxers)
  js/data/           FIT/TCX/GPX/ZIP parsing, splits/laps, stats, multi-run aggregation
  js/widgets/        every overlay widget (rendering + editable options)
  js/editor/         canvas editor, panels, layers, history, storage
  js/templates/      quick-start templates
  js/export/         image and video export
tools/build-sw.mjs   refreshes the offline cache list (run after editing app files)
neutralino.config.json  desktop build config
```

## Credits
Icons: Lucide (ISC). Fonts: Fontsource / Google Fonts (SIL OFL). ZIP: fflate (MIT). Video muxing: mp4-muxer & webm-muxer (MIT). Desktop shell: Neutralinojs (MIT).

**Simplest alternative (no Actions):** Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`, then open `https://<you>.github.io/lari-studio/app/`.
