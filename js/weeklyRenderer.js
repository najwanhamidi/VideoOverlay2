/**



 * RunOverlay Weekly & Batch Recap Visualizer (v2.0 Pro Studio)



 * Features 12 distinct, highly customizable weekly overlay templates:



 * 1. cards-grid: Weekly Digest & Run Cards (KPIs + Day Volume + Mini Routes)



 * 2. routes-matrix: Multi-Route Matrix (Neon Silhouettes & Glass Cards)



 * 3. mileage-pillar: Athletic Mileage Pillar HUD (Total Dist + Day Pillars + Telemetry)



 * 4. training-log: Marathon Training Log Sheet (Structured Ledger & Targets)



 * 5. unified-map: All Routes Unified GPS Map (All Routes on 1 Global Map)



 * 6. minimal-editorial: Minimalist Editorial Weekly (High-Fashion Serif & Session List)



 * 7. cyber-neon-hud: Cyber Neon HUD (Futuristic Telemetry Console & Circuit Gauges)



 * 8. magazine-cover: Bold Magazine Cover (Editorial Masthead & Big Hero Cutout)



 * 9. split-comparison: Split & Session Comparison (Pace Curves & Head-to-Head)



 * 10. calendar-heat: Calendar Training Heatmap (7-Day Matrix & Volume Staircase)



 * 11. polar-radar: Polar Radar Telemetry (Athletic Balance Spider Chart & Arcs)



 * 12. monolith-stat: Swiss Brutalist Monolith (Monumental Tabular Typography & Division)



 *



 * Supports comprehensive individual text customization:



 * custom text override, font family, size scale, color, XY axes offsets, shadow, and outline.



 */



import { computeWeeklyStats } from './weeklyBatchManager.js';



export const WEEKLY_TEMPLATES = [



  { id: 'cards-grid', name: 'Weekly Digest & Run Cards', icon: '🗂️' },



  { id: 'routes-matrix', name: 'Multi-Route Matrix', icon: '🗺️' },



  { id: 'mileage-pillar', name: 'Athletic Mileage Pillar HUD', icon: '🏛️' },



  { id: 'training-log', name: 'Marathon Training Log Sheet', icon: '📋' },



  { id: 'unified-map', name: 'All Routes Unified GPS Map', icon: '🌐' },



  { id: 'minimal-editorial', name: 'Minimalist Editorial Weekly', icon: '📰' },



  { id: 'cyber-neon-hud', name: 'Cyber Neon HUD', icon: '⚡' },



  { id: 'magazine-cover', name: 'Bold Magazine Cover', icon: '📰' },



  { id: 'split-comparison', name: 'Split & Session Comparison', icon: '⚡' },



  { id: 'calendar-heat', name: 'Calendar Training Heatmap', icon: '📅' },



  { id: 'polar-radar', name: 'Polar Radar Telemetry', icon: '🕸️' },



  { id: 'monolith-stat', name: 'Swiss Brutalist Monolith', icon: '🏛️' }



];



export function getFriendlyWeeklyLabel(key, fallbackKey) {



  if (!key) return 'Text Element';



  const dayMatch = key.match(/(dailyDayValue|dailyDayLabel|pillarValue|pillarLabel|calendarDayValue|calendarDayLabel|hudEqLabel)_([A-Za-z]+)/);



  if (dayMatch) {



    const type = dayMatch[1];



    const day = dayMatch[2];



    if (type.includes('Value')) return `${day} Bar Distance`;



    return `${day} Day Label`;



  }



  const runMatch = key.match(/(runCardTitle|runCardDate|runCardDateNum|runCardStats|ledgerTitle|ledgerDate|ledgerDist|ledgerTime|ledgerPace|matrixTitle|matrixDate|matrixDist|monoTitle|monoDate|monoDist|hudRunTitle|hudRunStats|editorialTitle|editorialDate|editorialDist|splitCardTitle|splitCardDate|splitCardDist|splitCardPace|radarChipTitle|radarChipDate|radarChipStats|mapLegTitle|mapLegDist)_(\d+)/);



  if (runMatch) {



    const type = runMatch[1];



    const idx = parseInt(runMatch[2], 10) + 1;



    if (type.includes('Title')) return `Run ${idx} Title`;



    if (type.includes('DateNum')) return `Run ${idx} Date Number`;



    if (type.includes('Date')) return `Run ${idx} Date`;



    if (type.includes('Stats')) return `Run ${idx} Stats`;



    if (type.includes('Dist')) return `Run ${idx} Distance`;



    if (type.includes('Time')) return `Run ${idx} Duration`;



    if (type.includes('Pace')) return `Run ${idx} Pace`;



  }



  const known = {



    weeklyTitle: 'Overlay Main Title',



    weeklyTag: 'Top Badge / Tag',



    weeklySubtitle: 'Date Range / Subtitle',



    goalText: 'Weekly Target Goal Pill',



    distLabel: 'Total Distance Label',



    distValue: 'Total Distance Value',



    distUnit: 'Distance Unit (KM/MI)',



    timeLabel: 'Duration Label',



    timeValue: 'Duration Value',



    paceLabel: 'Avg Pace Label',



    paceValue: 'Avg Pace Value',



    hrLabel: 'Heart Rate Label',



    hrValue: 'Heart Rate Value',



    elevLabel: 'Total Elevation Label',



    elevValue: 'Total Elevation Value',



    calLabel: 'Total Calories Label',



    calValue: 'Total Calories Value',



    countLabel: 'Sessions Count Label',



    countValue: 'Sessions Count Value',



    dailyBarsTitle: 'Volume Section Header',



    dailyScaleCeiling: 'Scale Ceiling Ref Text',



    dailyDayValues: 'Day Bar Values (All)',



    dailyDayLabels: 'Day Labels (All)',



    runCardTitle: 'Run Card Titles (All)',



    runCardDate: 'Run Card Dates (All)',



    runCardStats: 'Run Card Stats (All)',



    runListTitle: 'Run List Section Header'



  };



  return known[key] || (fallbackKey ? known[fallbackKey] : null) || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();



}



/**



 * Universal text drawing helper for Weekly Recap with full styling, font, size, color,



 * XY nudge offsets, text shadow, and text outline support.



 */



export function drawWeeklyText(ctx, renderer, weeklyData, textKey, defaultText, defaultX, defaultY, options = {}) {



  const fallbackKey = options.fallbackKey;



  const primaryStyles = (weeklyData && weeklyData.textStyles && weeklyData.textStyles[textKey]) || {};



  const fallbackStyles = (fallbackKey && weeklyData && weeklyData.textStyles && weeklyData.textStyles[fallbackKey]) || {};



  const styles = { ...fallbackStyles, ...primaryStyles };



  // Custom text override



  let text = (styles.text !== undefined && styles.text !== null && styles.text !== '')



    ? styles.text



    : defaultText;



  if (text === null || text === undefined || text === '') return { drawX: defaultX, drawY: defaultY, text: '', size: 0 };



  let str = String(text);



  // Text Transform: none, uppercase, lowercase, capitalize



  const transform = styles.textTransform || options.textTransform || 'none';



  if (transform === 'uppercase') {



    str = str.toUpperCase();



  } else if (transform === 'lowercase') {



    str = str.toLowerCase();



  } else if (transform === 'capitalize') {



    str = str.replace(/\b\w/g, (c) => c.toUpperCase());



  }



  // XY offsets



  const offX = typeof styles.offsetX === 'number' ? styles.offsetX : (options.offsetX || 0);



  const offY = typeof styles.offsetY === 'number' ? styles.offsetY : (options.offsetY || 0);



  const drawX = defaultX + offX;



  const drawY = defaultY + offY;



  // Font resolution



  const baseFont = options.font || renderer.getFontFamily();



  const fontFam = (styles.fontFamily && styles.fontFamily !== 'default')



    ? renderer.getFontFamily(styles.fontFamily)



    : baseFont;



  const weight = styles.fontWeight || options.weight || 'bold';



  const baseSize = options.size || 16;



  const scale = typeof styles.sizeScale === 'number' ? styles.sizeScale : 1;



  const finalSize = Math.max(8, Math.round(baseSize * scale));



  const fontSpec = `${weight} ${finalSize}px ${fontFam}`;



  // Alignment and baseline



  const align = styles.align || options.align || 'left';



  const baseline = options.baseline || 'alphabetic';



  // Color



  const color = styles.color || options.color || '#ffffff';



  ctx.save();



  ctx.font = fontSpec;



  ctx.textAlign = align;



  ctx.textBaseline = baseline;



  // Opacity



  const opacity = (typeof styles.opacity === 'number') ? styles.opacity : (typeof options.opacity === 'number' ? options.opacity : 1);



  if (opacity < 1) {



    ctx.globalAlpha *= Math.max(0.05, Math.min(1, opacity));



  }



  // Letter Spacing (modern Canvas 2D)



  const letterSpacing = (typeof styles.letterSpacing === 'number') ? styles.letterSpacing : (options.letterSpacing || 0);



  if (letterSpacing && 'letterSpacing' in ctx) {



    ctx.letterSpacing = `${letterSpacing}px`;



  }



  // Text rotation



  const rotation = typeof styles.rotation === 'number' ? styles.rotation : (options.rotation || 0);



  if (rotation !== 0) {



    ctx.translate(drawX, drawY);



    ctx.rotate((rotation * Math.PI) / 180);



  }



  const renderX = rotation !== 0 ? 0 : drawX;



  const renderY = rotation !== 0 ? 0 : drawY;



  // Measure text dimensions for bounding box and optional background badge



  const metrics = ctx.measureText(str);



  const textW = Math.max(8, metrics.width);



  const textH = Math.max(8, finalSize * 1.18);



  let localBoxX = renderX;



  if (align === 'center') localBoxX = renderX - textW / 2;



  else if (align === 'right') localBoxX = renderX - textW;



  let localBoxY = renderY;



  if (baseline === 'top') localBoxY = renderY;



  else if (baseline === 'middle') localBoxY = renderY - textH / 2;



  else if (baseline === 'bottom') localBoxY = renderY - textH;



  else localBoxY = renderY - textH * 0.82;



  // Optional background badge / pill



  const badgeEnabled = (styles.badge && styles.badge.enabled !== undefined)



    ? !!styles.badge.enabled



    : (styles.badgeEnabled !== undefined ? !!styles.badgeEnabled : !!options.badgeEnabled);



  if (badgeEnabled) {



    const bColor = (styles.badge && styles.badge.color) || styles.badgeColor || options.badgeColor || '#000000';



    const bAlpha = (styles.badge && typeof styles.badge.opacity === 'number') ? styles.badge.opacity : ((typeof styles.badgeOpacity === 'number') ? styles.badgeOpacity : (options.badgeOpacity !== undefined ? options.badgeOpacity : 0.65));



    const bPad = (styles.badge && typeof styles.badge.padding === 'number') ? styles.badge.padding : ((typeof styles.badgePadding === 'number') ? styles.badgePadding : (options.badgePadding || 6));



    const bRad = (styles.badge && typeof styles.badge.radius === 'number') ? styles.badge.radius : ((typeof styles.badgeRadius === 'number') ? styles.badgeRadius : (options.badgeRadius || 4));



    ctx.save();



    ctx.fillStyle = bColor;



    ctx.globalAlpha *= bAlpha;



    renderer.drawRoundedRect(ctx, localBoxX - bPad, localBoxY - bPad / 2, textW + bPad * 2, textH + bPad, bRad);



    ctx.fill();



    ctx.restore();



  }



    // Badge border stroke

    const bBorderEnabled = (styles.badge && styles.badge.borderEnabled !== undefined)

      ? !!styles.badge.borderEnabled

      : (styles.badgeBorderEnabled !== undefined ? !!styles.badgeBorderEnabled : !!options.badgeBorderEnabled);

    const bBorderWidth = (styles.badge && typeof styles.badge.borderWidth === 'number')

      ? styles.badge.borderWidth

      : (typeof styles.badgeBorderWidth === 'number' ? styles.badgeBorderWidth : (options.badgeBorderWidth !== undefined ? options.badgeBorderWidth : (bBorderEnabled ? 1.5 : 0)));

    const bBorderColor = (styles.badge && styles.badge.borderColor) || styles.badgeBorderColor || options.badgeBorderColor || '#ffffff';



    if (bBorderWidth > 0 && bBorderEnabled !== false) {

      ctx.save();

      ctx.lineWidth = bBorderWidth;

      ctx.strokeStyle = bBorderColor;

      renderer.drawRoundedRect(ctx, localBoxX - bPad, localBoxY - bPad / 2, textW + bPad * 2, textH + bPad, bRad);

      ctx.stroke();

      ctx.restore();

    }



  // Outline handling



  const outlineEnabled = (styles.outline && styles.outline.enabled !== undefined)



    ? !!styles.outline.enabled



    : (styles.outlineEnabled !== undefined ? !!styles.outlineEnabled : !!options.outlineEnabled);



  if (outlineEnabled) {



    const outlineColor = (styles.outline && styles.outline.color) || styles.outlineColor || options.outlineColor || '#000000';



    const outlineWidth = (styles.outline && styles.outline.width) || styles.outlineWidth || options.outlineWidth || 3;



    ctx.lineWidth = outlineWidth * 2;



    ctx.strokeStyle = outlineColor;



    ctx.lineJoin = 'round';



    ctx.miterLimit = 2;



    ctx.strokeText(str, renderX, renderY);



  }



  // Shadow handling



  const shadowEnabled = (styles.shadow && styles.shadow.enabled !== undefined)



    ? !!styles.shadow.enabled



    : (styles.shadowEnabled !== undefined ? !!styles.shadowEnabled : !!options.shadowEnabled);



  if (shadowEnabled) {



    ctx.shadowColor = (styles.shadow && styles.shadow.color) || styles.shadowColor || options.shadowColor || 'rgba(0, 0, 0, 0.85)';



    ctx.shadowBlur = (styles.shadow && styles.shadow.blur !== undefined) ? styles.shadow.blur : (styles.shadowBlur !== undefined ? styles.shadowBlur : 8);



    ctx.shadowOffsetX = (styles.shadow && styles.shadow.offsetX !== undefined) ? styles.shadow.offsetX : (styles.shadowOffsetX !== undefined ? styles.shadowOffsetX : 0);



    ctx.shadowOffsetY = (styles.shadow && styles.shadow.offsetY !== undefined) ? styles.shadow.offsetY : (styles.shadowOffsetY !== undefined ? styles.shadowOffsetY : 3);



  }



  // Fill text



  ctx.fillStyle = color;



  ctx.fillText(str, renderX, renderY);



  ctx.restore();



  // Record bounding box for cursor hit-testing, selection, and on-canvas dragging



  if (renderer) {



    renderer.weeklyTextBounds = renderer.weeklyTextBounds || {};



    let globalBoxX = drawX;



    if (align === 'center') globalBoxX = drawX - textW / 2;



    else if (align === 'right') globalBoxX = drawX - textW;



    let globalBoxY = drawY;



    if (baseline === 'top') globalBoxY = drawY;



    else if (baseline === 'middle') globalBoxY = drawY - textH / 2;



    else if (baseline === 'bottom') globalBoxY = drawY - textH;



    else globalBoxY = drawY - textH * 0.82;



    renderer.weeklyTextBounds[textKey] = {



      key: textKey,



      fallbackKey: fallbackKey || null,



      label: options.label || getFriendlyWeeklyLabel(textKey, fallbackKey),



      text: str,



      x: globalBoxX,



      y: globalBoxY,



      w: textW,



      h: textH,



      drawX,



      drawY,



      align,



      baseline,



      rotation



    };



  }



  return { drawX, drawY, text: str, font: fontSpec, size: finalSize };



}



export function formatWeeklySessionStats(run, stats, metrics) {

  if (!run || !metrics) return [];

  const parts = [];

  const distStr = `${run.distanceMain || (run.distance / 1000).toFixed(1)} ${run.distanceUnit || (stats && stats.unit) || 'km'}`;

  if (metrics.showSessionDist !== false) parts.push(distStr);

  if (metrics.showSessionTime !== false && run.durationFormatted) parts.push(run.durationFormatted);

  if (metrics.showSessionPace !== false && run.avgPaceFormatted) parts.push(run.avgPaceFormatted);

  if (metrics.showSessionHr !== false && run.avgHr > 0) parts.push(`${run.avgHr} bpm`);

  if (metrics.showSessionElevation !== false && run.elevationGain > 0) parts.push(`▲${run.elevationGain}m`);

  return parts;

}



export function renderWeeklyRecapLayout(renderer, ctx, w, h, weeklyData, config, theme, accent) {



  if (renderer) {



    renderer.weeklyTextBounds = {};

    renderer.weeklyCardBounds = {};



  }



  const runs = weeklyData.runs || [];



  const targetDist = weeklyData.targetDistance || config.weeklyTargetDistance || 0;



  const stats = weeklyData.stats || computeWeeklyStats(runs, config.isImperial, targetDist);



    const metrics = weeklyData.metrics || config.weeklyMetrics || {

    showTitle: true,

    showSubtitle: true,

    showTag: true,

    showDistance: true,

    showTime: true,

    showPace: true,

    showHr: true,

    showElevation: true,

    showCalories: true,

    showRunCount: true,

    showDailyBars: true,

    showSessionDist: true,

    showSessionTime: true,

    showSessionPace: true,

    showSessionHr: true,

    showSessionElevation: true,

    showRouteMaps: true,

    showRunList: true,

  };



  const tmpl = weeklyData.template || config.weeklyTemplate || 'cards-grid';



  if (!runs || runs.length === 0 || stats.count === 0) {



    ctx.save();



    ctx.textAlign = 'center';



    ctx.textBaseline = 'middle';



    const font = renderer.getFontFamily(config.fontFamily);



    renderer.drawRoundedRect(ctx, w * 0.1, h * 0.35, w * 0.8, h * 0.28, 20);



    ctx.fillStyle = 'rgba(18, 20, 29, 0.85)';



    ctx.fill();



    ctx.strokeStyle = accent;



    ctx.lineWidth = 1.5;



    ctx.stroke();



    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', 'WEEKLY RUN RECAP', w / 2, h * 0.42, {



      font, size: Math.round(w * 0.052), weight: 'bold', align: 'center', color: accent



    });



    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', 'No activities loaded yet', w / 2, h * 0.49, {



      font, size: 16, weight: '600', align: 'center', color: '#ffffff'



    });



    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'Drop a ZIP of .FIT files or click Load Demo Week', w / 2, h * 0.55, {



      font, size: 14, weight: 'normal', align: 'center', color: 'rgba(255, 255, 255, 0.6)'



    });



    ctx.restore();



    return;



  }



  ctx.save();



  switch (tmpl) {



    case 'routes-matrix':



      renderWeeklyRoutesMatrixLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'mileage-pillar':



      renderWeeklyMileagePillarLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'training-log':



      renderWeeklyTrainingLogLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'unified-map':



      renderWeeklyUnifiedMapLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'minimal-editorial':



      renderWeeklyMinimalEditorialLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'cyber-neon-hud':



      renderWeeklyCyberNeonHudLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'magazine-cover':



      renderWeeklyMagazineCoverLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'split-comparison':



      renderWeeklySplitComparisonLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'calendar-heat':



      renderWeeklyCalendarHeatLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'polar-radar':



      renderWeeklyPolarRadarLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'monolith-stat':



      renderWeeklyMonolithStatLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



    case 'cards-grid':



    default:



      renderWeeklyCardsGridLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent);



      break;



  }



  ctx.restore();  // 1. Draw Marquee Drag Selection Box if active
  if (renderer && renderer.weeklyMarqueeBox) {
    const mb = renderer.weeklyMarqueeBox;
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(mb.x, mb.y, mb.w, mb.h);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect(mb.x, mb.y, mb.w, mb.h);
    ctx.restore();
  }

  // 2. Draw Interactive Selection Gizmos (Single & Bulk Selection)
  const selTextKeys = (weeklyData && Array.isArray(weeklyData.selectedTextKeys) && weeklyData.selectedTextKeys.length > 0)
    ? weeklyData.selectedTextKeys
    : (weeklyData && weeklyData.selectedTextKey ? [weeklyData.selectedTextKey] : []);

  const selCardKeys = (weeklyData && Array.isArray(weeklyData.selectedCardKeys) && weeklyData.selectedCardKeys.length > 0)
    ? weeklyData.selectedCardKeys
    : (weeklyData && weeklyData.selectedCardKey ? [weeklyData.selectedCardKey] : []);

  const totalSelectedCount = selTextKeys.length + selCardKeys.length;

  // Render bounding box for each selected text element
  if (renderer && renderer.weeklyTextBounds) {
    selTextKeys.forEach(tKey => {
      const sel = renderer.weeklyTextBounds[tKey];
      if (sel && sel.w > 0 && sel.h > 0) {
        ctx.save();
        const padGizmo = 4;
        const gx = sel.x - padGizmo;
        const gy = sel.y - padGizmo;
        const gw = sel.w + padGizmo * 2;
        const gh = sel.h + padGizmo * 2;

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(gx, gy, gw, gh);

        ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.fillRect(gx, gy, gw, gh);

        // If only 1 item selected total, draw corner handles and pill badge
        if (totalSelectedCount === 1) {
          ctx.setLineDash([]);
          ctx.fillStyle = '#00f0ff';
          const hs = 6;
          ctx.fillRect(gx - hs / 2, gy - hs / 2, hs, hs);
          ctx.fillRect(gx + gw - hs / 2, gy - hs / 2, hs, hs);
          ctx.fillRect(gx - hs / 2, gy + gh - hs / 2, hs, hs);
          ctx.fillRect(gx + gw - hs / 2, gy + gh - hs / 2, hs, hs);

          ctx.font = 'bold 10px sans-serif';
          const labelText = `✏️ ${sel.label || sel.key}`;
          const badgeW = ctx.measureText(labelText).width + 14;
          const badgeH = 18;
          const badgeY = gy - badgeH - 3 >= 0 ? gy - badgeH - 3 : gy + gh + 4;
          renderer.drawRoundedRect(ctx, gx, badgeY, badgeW, badgeH, 4);
          ctx.fillStyle = 'rgba(0, 240, 255, 0.95)';
          ctx.fill();
          ctx.fillStyle = '#0a0d14';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, gx + 6, badgeY + badgeH / 2);
        }
        ctx.restore();
      }
    });
  }

  // Render bounding box for each selected card element
  if (renderer && renderer.weeklyCardBounds) {
    selCardKeys.forEach(cKey => {
      const selCard = renderer.weeklyCardBounds[cKey];
      if (selCard && selCard.w > 0 && selCard.h > 0) {
        ctx.save();
        const padGizmo = 3;
        const gx = selCard.x - padGizmo;
        const gy = selCard.y - padGizmo;
        const gw = selCard.w + padGizmo * 2;
        const gh = selCard.h + padGizmo * 2;

        ctx.strokeStyle = '#ccff00';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 5]);
        ctx.strokeRect(gx, gy, gw, gh);

        ctx.fillStyle = 'rgba(204, 255, 0, 0.08)';
        ctx.fillRect(gx, gy, gw, gh);

        // If only 1 item selected total, draw 8 resize handles and info pills
        if (totalSelectedCount === 1) {
          ctx.setLineDash([]);
          const hs = 9;
          const handleCoords = [
            { name: 'nw', x: gx, y: gy },
            { name: 'n',  x: gx + gw / 2, y: gy },
            { name: 'ne', x: gx + gw, y: gy },
            { name: 'e',  x: gx + gw, y: gy + gh / 2 },
            { name: 'se', x: gx + gw, y: gy + gh },
            { name: 's',  x: gx + gw / 2, y: gy + gh },
            { name: 'sw', x: gx, y: gy + gh },
            { name: 'w',  x: gx, y: gy + gh / 2 },
          ];

          handleCoords.forEach(h => {
            ctx.fillStyle = '#ccff00';
            ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
            ctx.strokeStyle = '#0a0d14';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
          });

          const seH = 13;
          ctx.fillStyle = '#ccff00';
          ctx.fillRect(gx + gw - seH / 2, gy + gh - seH / 2, seH, seH);
          ctx.strokeStyle = '#0a0d14';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(gx + gw - seH / 2, gy + gh - seH / 2, seH, seH);

          ctx.font = 'bold 11px sans-serif';
          const labelText = `📦 ${selCard.label || selCard.key} (Drag to Move)`;
          const badgeW = ctx.measureText(labelText).width + 16;
          const badgeH = 20;
          const badgeY = gy - badgeH - 4 >= 0 ? gy - badgeH - 4 : gy + gh + 4;
          renderer.drawRoundedRect(ctx, gx, badgeY, badgeW, badgeH, 4);
          ctx.fillStyle = 'rgba(204, 255, 0, 0.95)';
          ctx.fill();
          ctx.fillStyle = '#0a0d14';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, gx + 8, badgeY + badgeH / 2);

          const offX = selCard.offsetX || 0;
          const offY = selCard.offsetY || 0;
          const bW = selCard.borderWidth || 1;
          const cardW = Math.round(selCard.w);
          const cardH = Math.round(selCard.h);
          const wD = selCard.widthDelta || 0;
          const hD = selCard.heightDelta || 0;
          const sizeStr = `${cardW}×${cardH}px${wD !== 0 || hD !== 0 ? ` (${wD >= 0 ? '+' : ''}${wD}, ${hD >= 0 ? '+' : ''}${hD})` : ''}`;
          const infoText = `Size: ${sizeStr}  X: ${offX >= 0 ? '+' : ''}${offX}px  Y: ${offY >= 0 ? '+' : ''}${offY}px  Border: ${bW}px`;
          const infoW = ctx.measureText(infoText).width + 14;
          renderer.drawRoundedRect(ctx, gx + badgeW + 6, badgeY, infoW, badgeH, 4);
          ctx.fillStyle = 'rgba(15, 17, 26, 0.88)';
          ctx.fill();
          ctx.strokeStyle = '#ccff00';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#ccff00';
          ctx.fillText(infoText, gx + badgeW + 13, badgeY + badgeH / 2);
        }
        ctx.restore();
      }
    });
  }

  // 3. Render Combined Group Gizmo when multiple elements are selected (> 1)
  if (totalSelectedCount > 1 && renderer) {
    let minGX = Infinity, minGY = Infinity, maxGX = -Infinity, maxGY = -Infinity;

    selTextKeys.forEach(tKey => {
      const b = renderer.weeklyTextBounds && renderer.weeklyTextBounds[tKey];
      if (b && b.w > 0 && b.h > 0) {
        minGX = Math.min(minGX, b.x);
        minGY = Math.min(minGY, b.y);
        maxGX = Math.max(maxGX, b.x + b.w);
        maxGY = Math.max(maxGY, b.y + b.h);
      }
    });

    selCardKeys.forEach(cKey => {
      const cb = renderer.weeklyCardBounds && renderer.weeklyCardBounds[cKey];
      if (cb && cb.w > 0 && cb.h > 0) {
        minGX = Math.min(minGX, cb.x);
        minGY = Math.min(minGY, cb.y);
        maxGX = Math.max(maxGX, cb.x + cb.w);
        maxGY = Math.max(maxGY, cb.y + cb.h);
      }
    });

    if (minGX !== Infinity && maxGX > minGX && maxGY > minGY) {
      ctx.save();
      const padGroup = 8;
      const groupX = minGX - padGroup;
      const groupY = minGY - padGroup;
      const groupW = (maxGX - minGX) + padGroup * 2;
      const groupH = (maxGY - minGY) + padGroup * 2;

      ctx.strokeStyle = '#ccff00';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(groupX, groupY, groupW, groupH);

      ctx.fillStyle = 'rgba(204, 255, 0, 0.05)';
      ctx.fillRect(groupX, groupY, groupW, groupH);

      // Group Badge Label
      ctx.font = 'bold 11px sans-serif';
      const groupLabel = `📦 Group: ${totalSelectedCount} Elements Selected (Drag Any to Move All)`;
      const badgeW = ctx.measureText(groupLabel).width + 18;
      const badgeH = 22;
      const badgeY = groupY - badgeH - 4 >= 0 ? groupY - badgeH - 4 : groupY + groupH + 4;

      renderer.drawRoundedRect(ctx, groupX, badgeY, badgeW, badgeH, 4);
      ctx.fillStyle = 'rgba(204, 255, 0, 0.95)';
      ctx.fill();
      ctx.fillStyle = '#0a0d14';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(groupLabel, groupX + 8, badgeY + badgeH / 2);
      ctx.restore();
    }
  }

}



/**



 * TEMPLATE 1: WEEKLY CARDS GRID (Digest & Run Cards)



 */



function renderWeeklyCardsGridLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.055;

  const cardW = w - pad * 2;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';

  const userBarColor = (weeklyData && weeklyData.barColor) || accent;

  const userBarColorEnd = (weeklyData && weeklyData.barColorEnd) || userBarColor;



  let curY = h * 0.045;



  // 1. Top Header Banner

  if (metrics.showTag !== false) {

    const headerTag = `⚡ WEEKLY RECAP // ${stats.count} SESSIONS`;

    ctx.font = `bold 12px ${font}`;

    const tagW = ctx.measureText(headerTag).width + 18;

    renderer.drawRoundedRect(ctx, pad, curY, tagW, 22, 11);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';

    ctx.fill();

    ctx.strokeStyle = accent;

    ctx.lineWidth = 1;

    ctx.stroke();



    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', headerTag, pad + 9, curY + 15, {

      font, size: 12, weight: 'bold', align: 'left', color: accent

    });

    curY += 32;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.055), {

      font, size: Math.round(w * 0.065), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.075);

  }



  if (metrics.showSubtitle !== false) {

    const subTitle = weeklyData.subtitle || stats.dateRangeStr;

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', subTitle, pad, curY + 12, {

      font, size: 15, weight: '500', align: 'left', color: textMuted

    });

    curY += 26;

  }



  // 2. Hero Weekly Summary KPI Card

  const secList = [];

  if (metrics.showTime !== false) secList.push({ key: 'time', label: 'DURATION', val: stats.durationFormatted });

  if (metrics.showPace !== false) secList.push({ key: 'pace', label: 'AVG PACE', val: `${stats.avgPaceFormatted}` });

  if (metrics.showHr !== false && stats.avgHr > 0) secList.push({ key: 'hr', label: 'AVG HR', val: `${stats.avgHr} bpm` });

  if (metrics.showElevation !== false && stats.totalEleGain > 0) secList.push({ key: 'elev', label: 'ELEVATION', val: `+${stats.totalEleGain}m` });

  if (metrics.showCalories !== false && stats.totalCalories > 0) secList.push({ key: 'cal', label: 'CALORIES', val: `${stats.totalCalories} kcal` });

  if (metrics.showRunCount !== false && stats.count > 0) secList.push({ key: 'count', label: 'SESSIONS', val: `${stats.count}` });



  const hasHeroMetrics = (metrics.showDistance !== false) || (secList.length > 0);

  if (hasHeroMetrics) {

    const heroCardH = h * (metrics.showDailyBars !== false ? 0.17 : 0.21);

    const heroCard = drawGlassCard(renderer, ctx, pad, curY, cardW, heroCardH, config, theme, 'heroCard', weeklyData, 'Hero KPI Card');

    const innerPad = 20;

    let heroX = heroCard.x + innerPad;

    let heroY = heroCard.y + innerPad;



    if (metrics.showDistance !== false) {

      drawWeeklyText(ctx, renderer, weeklyData, 'distLabel', 'TOTAL DISTANCE', heroX, heroY + 12, {

        font, size: 12, weight: 'bold', align: 'left', color: accent

      });



      const distNum = stats.distFormatted;

      const resDist = drawWeeklyText(ctx, renderer, weeklyData, 'distValue', distNum, heroX, heroY + Math.round(w * 0.10) + 8, {

        font, size: Math.round(w * 0.11), weight: '900', align: 'left', color: textCol

      });

      ctx.font = resDist.font;

      const numW = ctx.measureText(resDist.text).width;



      drawWeeklyText(ctx, renderer, weeklyData, 'distUnit', stats.unit.toUpperCase(), heroX + numW + 8, heroY + Math.round(w * 0.10) + 4, {

        font, size: 18, weight: 'bold', align: 'left', color: accent

      });



      if (stats.goalProgress !== null) {

        const goalPill = `${stats.goalProgress}% of ${stats.goalDist}${stats.unit}`;

        ctx.font = `bold 11px ${font}`;

        const gW = ctx.measureText(goalPill).width + 14;

        renderer.drawRoundedRect(ctx, heroX, heroY + Math.round(w * 0.10) + 16, gW, 18, 9);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';

        ctx.fill();

        ctx.strokeStyle = '#10b981';

        ctx.lineWidth = 1;

        ctx.stroke();



        drawWeeklyText(ctx, renderer, weeklyData, 'goalText', goalPill, heroX + 7, heroY + Math.round(w * 0.10) + 29, {

          font, size: 11, weight: 'bold', align: 'left', color: '#10b981'

        });

      }

    }



    if (secList.length > 0) {

      const secX = (metrics.showDistance !== false) ? (heroCard.x + cardW * 0.52) : (heroCard.x + innerPad);

      const availableSecW = (metrics.showDistance !== false) ? (cardW * 0.44) : (cardW - innerPad * 2);

      const colCount = Math.min(secList.length, 3);

      const itemW = availableSecW / colCount;



      secList.slice(0, 3).forEach((m, idx) => {

        const ix = secX + idx * itemW;

        drawWeeklyText(ctx, renderer, weeklyData, m.key + 'Label', m.label, ix, heroY + 12, {

          font, size: 10, weight: 'bold', align: 'left', color: textMuted

        });



        drawWeeklyText(ctx, renderer, weeklyData, m.key + 'Value', m.val, ix, heroY + 34, {

          font, size: 14, weight: 'bold', align: 'left', color: textCol

        });

      });



      if (secList.length > 3) {

        secList.slice(3, 6).forEach((m, idx) => {

          const ix = secX + idx * itemW;

          drawWeeklyText(ctx, renderer, weeklyData, m.key + 'Label', m.label, ix, heroY + 56, {

            font, size: 10, weight: 'bold', align: 'left', color: textMuted

          });



          drawWeeklyText(ctx, renderer, weeklyData, m.key + 'Value', m.val, ix, heroY + 76, {

            font, size: 13, weight: 'bold', align: 'left', color: textCol

          });

        });

      }

    }



    curY += heroCardH + 16;

  }



  // 3. Mon-Sun Daily Volume Bars

  if (metrics.showDailyBars !== false) {

    const barsCardH = h * 0.14;

    const barsBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, barsCardH, config, theme, 'barsCard', weeklyData, 'Daily Volume Bars Card');

    const barsX = barsBounds.x;

    const barsY = barsBounds.y;



    drawWeeklyText(ctx, renderer, weeklyData, 'dailyBarsTitle', 'DAILY VOLUME BREAKDOWN (MON – SUN)', barsX + 16, barsY + 18, {

      font, size: 10, weight: 'bold', align: 'left', color: textMuted

    });



    const barAreaY = barsY + 32;

    const barAreaW = barsBounds.w - 32;

    const barAreaH = barsBounds.h - 58;

    const dayCols = stats.dayDistribution || [];

    const colW = barAreaW / 7;

    const barStyle = (weeklyData && weeklyData.barStyle) || 'gradient';

    const actualMax = Math.max(0.1, ...dayCols.map((d) => d.distanceRaw || 0));

    const scaleCeiling = Math.max(5, Math.ceil(actualMax / 5) * 5);



    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';

    ctx.lineWidth = 1;

    ctx.setLineDash([3, 3]);

    ctx.beginPath();

    ctx.moveTo(barsX + 16, barAreaY);

    ctx.lineTo(barsX + barsBounds.w - 16, barAreaY);

    ctx.moveTo(barsX + 16, barAreaY + barAreaH / 2);

    ctx.lineTo(barsX + cardW - 16, barAreaY + barAreaH / 2);

    ctx.stroke();

    ctx.setLineDash([]);

    ctx.restore();



    drawWeeklyText(ctx, renderer, weeklyData, 'dailyScaleCeiling', `REF MAX: ${scaleCeiling} ${stats.unit}`, barsX + barsBounds.w - 18, barsY + 18, {

      font, size: 8.5, weight: '600', align: 'right', color: 'rgba(255, 255, 255, 0.4)'

    });



    dayCols.forEach((d, dIdx) => {

      const bx = barsX + 16 + dIdx * colW + colW * 0.18;

      const bw = colW * 0.64;

      const rawDist = d.distanceRaw || 0;

      const bh = rawDist > 0 ? Math.max(3, Math.round(barAreaH * Math.min(1.0, rawDist / scaleCeiling))) : 0;

      const by = barAreaY + barAreaH - bh;



      renderer.drawRoundedRect(ctx, bx, barAreaY, bw, barAreaH, 4);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';

      ctx.fill();



      if (rawDist > 0) {

        renderer.drawRoundedRect(ctx, bx, by, bw, bh, 4);

        if (barStyle === 'solid') {

          ctx.fillStyle = userBarColor;

        } else if (barStyle === 'outline') {

          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';

          ctx.fill();

          renderer.drawRoundedRect(ctx, bx, by, bw, bh, 4);

          ctx.strokeStyle = userBarColor;

          ctx.lineWidth = 1.8;

          ctx.stroke();

        } else {

          const barGrad = ctx.createLinearGradient(0, by, 0, by + bh);

          barGrad.addColorStop(0, userBarColor);

          barGrad.addColorStop(1, userBarColorEnd);

          ctx.fillStyle = barGrad;

        }

        ctx.fill();



        drawWeeklyText(ctx, renderer, weeklyData, `dailyDayValue_${d.day}`, d.distanceMain, bx + bw / 2, by - 4, {

          fallbackKey: 'dailyDayValues',

          label: `${d.day} Bar Distance`,

          font, size: 9, weight: 'bold', align: 'center', color: '#ffffff'

        });

      }



      drawWeeklyText(ctx, renderer, weeklyData, `dailyDayLabel_${d.day}`, d.day, bx + bw / 2, barAreaY + barAreaH + 16, {

        fallbackKey: 'dailyDayLabels',

        label: `${d.day} Day Label`,

        font, size: 10, weight: '600', align: 'center', color: rawDist > 0 ? userBarColor : textMuted

      });

    });



    curY += barsCardH + 16;

  }



  // 4. Individual Run Cards

  if (metrics.showRunList !== false && stats.activeRuns.length > 0) {

    const remainingH = h - curY - h * 0.045;

    const displayRuns = stats.activeRuns.slice(0, 6);

    const runCardH = Math.min(84, Math.max(54, Math.floor((remainingH - (displayRuns.length - 1) * 10) / displayRuns.length)));



    displayRuns.forEach((run, rIdx) => {

      const ry = curY + rIdx * (runCardH + 10);

      const elemKey = `runCard_${rIdx}`;

      const cardBounds = drawGlassCard(renderer, ctx, pad, ry, cardW, runCardH, config, theme, elemKey, weeklyData, `Run Card ${rIdx + 1} (${run.name || 'Run'})`);

      const cardX = cardBounds.x;

      const cardY = cardBounds.y;



      const rPad = 14;

      const rDate = run.date instanceof Date ? run.date : new Date(run.date || Date.now());

      const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

      const dateNum = rDate.getDate();



      renderer.drawRoundedRect(ctx, pad + rPad, ry + runCardH / 2 - 19, 38, 38, 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';

      ctx.fill();

      ctx.strokeStyle = accent;

      ctx.lineWidth = 1;

      ctx.stroke();



      drawWeeklyText(ctx, renderer, weeklyData, `runCardDate_${rIdx}`, dayStr, pad + rPad + 19, ry + runCardH / 2 - 5, {

        fallbackKey: 'runCardDate',

        label: `Run ${rIdx + 1} Day`,

        font, size: 10, weight: 'bold', align: 'center', color: accent

      });



      drawWeeklyText(ctx, renderer, weeklyData, `runCardDateNum_${rIdx}`, `${dateNum}`, pad + rPad + 19, ry + runCardH / 2 + 12, {

        fallbackKey: 'runCardDate',

        label: `Run ${rIdx + 1} Date Number`,

        font, size: 14, weight: '900', align: 'center', color: '#ffffff'

      });



      // Name & Stats

      const textLeft = pad + rPad + 50;

      const runTitle = run.customName || run.title || `Session ${rIdx + 1}`;

      drawWeeklyText(ctx, renderer, weeklyData, `runCardTitle_${rIdx}`, runTitle, textLeft, ry + runCardH / 2 - 6, {

        fallbackKey: 'runCardTitle',

        label: `Run ${rIdx + 1} Title`,

        font, size: Math.max(12, Math.min(15, Math.round(runCardH * 0.24))), weight: 'bold', align: 'left', color: textCol

      });



      const sessParts = formatWeeklySessionStats(run, stats, metrics);

      const statsStr = sessParts.join('   •   ');

      if (statsStr) {

        drawWeeklyText(ctx, renderer, weeklyData, `runCardStats_${rIdx}`, statsStr, textLeft, ry + runCardH / 2 + 11, {

          fallbackKey: 'runCardStats',

          label: `Run ${rIdx + 1} Stats`,

          font, size: 11, weight: '500', align: 'left', color: textMuted

        });

      }



      if (metrics.showSessionDist !== false) {

        const maxRunDist = Math.max(0.1, ...stats.activeRuns.map((r) => parseFloat(r.distanceMain) || (r.distance / 1000) || 0));

        const rDist = parseFloat(run.distanceMain) || (run.distance / 1000) || 0;

        const rRatio = Math.min(1.0, Math.max(0, rDist / maxRunDist));

        const pBarW = Math.min(160, cardW * 0.30);

        const pBarX = textLeft;

        const pBarY = ry + runCardH - 7;

        renderer.drawRoundedRect(ctx, pBarX, pBarY, pBarW, 2.5, 1.25);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';

        ctx.fill();

        if (rRatio > 0) {

          renderer.drawRoundedRect(ctx, pBarX, pBarY, Math.max(3, pBarW * rRatio), 2.5, 1.25);

          ctx.fillStyle = userBarColor;

          ctx.fill();

        }

      }



      // Mini Route Silhouette on Right

      if (metrics.showRouteMaps !== false && run.trackpoints && run.trackpoints.length > 2) {

        const miniW = 68;

        const miniH = runCardH - 12;

        const miniX = pad + cardW - rPad - miniW;

        const miniY = ry + 6;

        drawMiniRouteSilhouette(ctx, miniX, miniY, miniW, miniH, run.trackpoints, run.bounds, accent);

      }

    });

  }

}



/**

 * TEMPLATE 2: MULTI-ROUTE MATRIX

 */

function renderWeeklyRoutesMatrixLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.05;



  if (metrics.showTag !== false) {

    const tagText = (metrics.showRunCount !== false && stats.count > 0) ? `GPS ROUTE MATRIX  •  ${stats.count} RUNS` : 'GPS ROUTE MATRIX';

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', tagText, pad, curY + 12, {

      font, size: 11, weight: 'bold', align: 'left', color: accent

    });

    curY += 28;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font, size: Math.round(w * 0.068), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.068) + 12;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, pad, curY + 10, {

      font, size: 14, weight: '500', align: 'left', color: textMuted

    });

    curY += 28;

  }



  // Mini KPI Ribbon

  const ribbonW = w - pad * 2;

  const metricsArr = [];

  if (metrics.showDistance !== false) metricsArr.push({ key: 'dist', val: `${stats.distFormatted} ${stats.unit.toUpperCase()}` });

  if (metrics.showTime !== false) metricsArr.push({ key: 'time', val: stats.durationFormatted });

  if (metrics.showPace !== false) metricsArr.push({ key: 'pace', val: `${stats.avgPaceFormatted}` });

  if (metrics.showHr !== false && stats.avgHr > 0) metricsArr.push({ key: 'hr', val: `${stats.avgHr} BPM` });

  if (metrics.showElevation !== false && stats.totalEleGain > 0) metricsArr.push({ key: 'elev', val: `+${stats.totalEleGain}M` });

  if (metrics.showCalories !== false && stats.totalCalories > 0) metricsArr.push({ key: 'cal', val: `${stats.totalCalories} KCAL` });

  if (metrics.showRunCount !== false && stats.count > 0) metricsArr.push({ key: 'count', val: `${stats.count} RUNS` });



  if (metricsArr.length > 0) {

    renderer.drawRoundedRect(ctx, pad, curY, ribbonW, 46, 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';

    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

    ctx.lineWidth = 1;

    ctx.stroke();



    const segW = ribbonW / metricsArr.length;

    metricsArr.forEach((m, idx) => {

      drawWeeklyText(ctx, renderer, weeklyData, `matrixMetric_${idx}`, m.val, pad + idx * segW + segW / 2, curY + 27, {

        fallbackKey: `${m.key}Value`,

        label: `Ribbon Metric ${idx + 1}`,

        font, size: 13, weight: 'bold', align: 'center', color: idx === 0 ? accent : textCol

      });

    });

    curY += 60;

  }



  // Multi-route Tiles Matrix

  if (metrics.showRunList !== false) {

    const activeRuns = stats.activeRuns || [];

    const maxRoutes = 6;

    const tileRuns = activeRuns.slice(0, maxRoutes);

    if (tileRuns.length > 0) {

      const cols = tileRuns.length > 2 ? 2 : 1;

      const rows = Math.ceil(tileRuns.length / cols);

      const gap = 12;

      const tileW = (w - pad * 2 - (cols - 1) * gap) / cols;

      const availableH = h - curY - h * 0.05;

      const tileH = Math.min(180, Math.max(110, (availableH - (rows - 1) * gap) / rows));

      const neonColors = [accent, '#00f0ff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];



      tileRuns.forEach((run, idx) => {

        const c = idx % cols;

        const r = Math.floor(idx / cols);

        const tx = pad + c * (tileW + gap);

        const ty = curY + r * (tileH + gap);

        const runColor = neonColors[idx % neonColors.length];



        const elemKey = `matrixTile_${idx}`;

        const cardBounds = drawGlassCard(renderer, ctx, tx, ty, tileW, tileH, config, theme, elemKey, weeklyData, `Matrix Tile ${idx + 1} (${run.name || 'Run'})`);

        const tileX = cardBounds.x;

        const tileY = cardBounds.y;



        const routeBoxH = tileH * 0.65;

        if (metrics.showRouteMaps !== false && run.trackpoints && run.trackpoints.length > 2) {

          drawMiniRouteSilhouette(ctx, tileX + 10, tileY + 8, tileW - 20, routeBoxH, run.trackpoints, run.bounds, runColor, 2.8);

        }



        const footerY = tileY + routeBoxH + 14;

        const rDate = run.date instanceof Date ? run.date : new Date(run.date || Date.now());

        const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

        const dateNum = rDate.getDate();



        drawWeeklyText(ctx, renderer, weeklyData, `matrixDate_${idx}`, `${dayStr} ${dateNum}`, tileX + 12, footerY, {

          fallbackKey: 'runCardDate',

          label: `Run ${idx + 1} Date`,

          font, size: 11, weight: 'bold', align: 'left', color: runColor

        });



        drawWeeklyText(ctx, renderer, weeklyData, `matrixTitle_${idx}`, run.customName || run.title || `Run ${idx + 1}`, tileX + 12, footerY + 14, {

          fallbackKey: 'runCardTitle',

          label: `Run ${idx + 1} Title`,

          font, size: 12, weight: 'bold', align: 'left', color: textCol

        });



        if (metrics.showSessionDist !== false) {

          const distStr = `${run.distanceMain || (run.distance / 1000).toFixed(1)} ${run.distanceUnit || stats.unit}`;

          drawWeeklyText(ctx, renderer, weeklyData, `matrixDist_${idx}`, distStr, tileX + tileW - 12, footerY + 6, {

            fallbackKey: 'distValue',

            label: `Run ${idx + 1} Distance`,

            font, size: 13, weight: '900', align: 'right', color: textCol

          });

        }



        const sessParts = formatWeeklySessionStats(run, stats, metrics).filter(p => !p.includes(stats.unit));

        if (sessParts.length > 0) {

          drawWeeklyText(ctx, renderer, weeklyData, `matrixStats_${idx}`, sessParts.join('  •  '), tx + 12, footerY + 28, {

            fallbackKey: 'runCardStats',

            label: `Run ${idx + 1} Stats`,

            font, size: 9.5, weight: '500', align: 'left', color: textMuted

          });

        }

      });

    }

  }

}



/**

 * TEMPLATE 3: ATHLETIC MILEAGE PILLAR HUD

 */

function renderWeeklyMileagePillarLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.07;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.055;



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'ATHLETIC TRAINING LOG // VOL. 07', pad, curY + 10, {

      font, size: 11, weight: '800', align: 'left', color: accent

    });

    curY += 28;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font, size: Math.round(w * 0.065), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.065) + 10;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, pad, curY + 12, {

      font, size: 14, weight: '500', align: 'left', color: textMuted

    });

    curY += 32;

  }



  // Monumental Distance Hero Number

  if (metrics.showDistance !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'distLabel', 'ACCUMULATED MILEAGE', pad, curY + 12, {

      font, size: 12, weight: '900', align: 'left', color: accent

    });



    const distNum = stats.distFormatted;

    drawWeeklyText(ctx, renderer, weeklyData, 'distValue', distNum, pad, curY + Math.round(w * 0.17), {

      font, size: Math.round(w * 0.19), weight: '900', align: 'left', color: textCol

    });



    ctx.font = `900 ${Math.round(w * 0.19)}px ${font}`;

    const nW = ctx.measureText(distNum).width;

    drawWeeklyText(ctx, renderer, weeklyData, 'distUnit', stats.unit.toUpperCase(), pad + nW + 12, curY + Math.round(w * 0.16) - 10, {

      font, size: 28, weight: '900', align: 'left', color: accent

    });



    curY += Math.round(w * 0.19) + 16;

  }



  // 7 Tall Athletic Pillars (Mon-Sun)

  if (metrics.showDailyBars !== false) {

    const pillarAreaW = w - pad * 2;

    const pillarAreaH = h * 0.24;

    const pBounds = drawGlassCard(renderer, ctx, pad, curY, pillarAreaW, pillarAreaH, config, theme, 'pillarCard', weeklyData, 'Mileage Volume Pillar Card');

    const pillarX = pBounds.x;

    const pillarY = pBounds.y;



    drawWeeklyText(ctx, renderer, weeklyData, 'dailyBarsTitle', 'MON–SUN VOLUME PILLARS', pillarX + 18, pillarY + 20, {

      font, size: 11, weight: 'bold', align: 'left', color: textMuted

    });



    const bY = curY + 40;

    const bH = pillarAreaH - 74;

    const dayCols = stats.dayDistribution || [];

    const colW = (pillarAreaW - 36) / 7;

    const userBarColor = (weeklyData && weeklyData.barColor) || accent;

    const userBarColorEnd = (weeklyData && weeklyData.barColorEnd) || userBarColor;

    const barStyle = (weeklyData && weeklyData.barStyle) || 'gradient';

    const actualMax = Math.max(0.1, ...dayCols.map((d) => d.distanceRaw || 0));

    const scaleCeiling = Math.max(5, Math.ceil(actualMax / 5) * 5);



    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';

    ctx.lineWidth = 1;

    ctx.setLineDash([3, 3]);

    ctx.beginPath();

    ctx.moveTo(pad + 18, bY);

    ctx.lineTo(pad + pillarAreaW - 18, bY);

    ctx.moveTo(pad + 18, bY + bH / 2);

    ctx.lineTo(pad + pillarAreaW - 18, bY + bH / 2);

    ctx.stroke();

    ctx.setLineDash([]);

    ctx.restore();



    dayCols.forEach((d, idx) => {

      const cx = pad + 18 + idx * colW + colW / 2;

      const barW = Math.max(14, colW * 0.58);

      const bx = cx - barW / 2;



      renderer.drawRoundedRect(ctx, bx, bY, barW, bH, barW / 2);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';

      ctx.fill();



      const rawDist = d.distanceRaw || 0;

      if (rawDist > 0) {

        const fillH = Math.max(4, Math.round(bH * Math.min(1.0, rawDist / scaleCeiling)));

        const fillY = bY + bH - fillH;

        const rad = Math.min(fillH / 2, barW / 2);

        renderer.drawRoundedRect(ctx, bx, fillY, barW, fillH, rad);



        if (barStyle === 'solid') {

          ctx.fillStyle = userBarColor;

        } else if (barStyle === 'outline') {

          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';

          ctx.fill();

          renderer.drawRoundedRect(ctx, bx, fillY, barW, fillH, rad);

          ctx.strokeStyle = userBarColor;

          ctx.lineWidth = 2;

          ctx.stroke();

        } else {

          const grad = ctx.createLinearGradient(0, fillY, 0, fillY + fillH);

          grad.addColorStop(0, userBarColor);

          grad.addColorStop(1, userBarColorEnd);

          ctx.fillStyle = grad;

        }

        ctx.fill();



        drawWeeklyText(ctx, renderer, weeklyData, `pillarValue_${d.day}`, d.distanceMain, cx, fillY - 6, {

          fallbackKey: 'dailyDayValues',

          label: `${d.day} Pillar Value`,

          font, size: 10, weight: '900', align: 'center', color: '#ffffff'

        });

      }



      drawWeeklyText(ctx, renderer, weeklyData, `pillarLabel_${d.day}`, d.day, cx, bY + bH + 18, {

        fallbackKey: 'dailyDayLabels',

        label: `${d.day} Pillar Label`,

        font, size: 11, weight: '700', align: 'center', color: rawDist > 0 ? userBarColor : textMuted

      });

    });



    curY += pillarAreaH + 18;

  }



  // Bottom Telemetry Strip

  const stripW = w - pad * 2;

  const stripItems = [];

  if (metrics.showTime !== false) stripItems.push({ k: 'time', l: 'DURATION', v: stats.durationFormatted });

  if (metrics.showPace !== false) stripItems.push({ k: 'pace', l: 'PACE', v: `${stats.avgPaceFormatted}` });

  if (metrics.showHr !== false && stats.avgHr > 0) stripItems.push({ k: 'hr', l: 'HEART', v: `${stats.avgHr} bpm` });

  if (metrics.showElevation !== false && stats.totalEleGain > 0) stripItems.push({ k: 'elev', l: 'ELEV', v: `+${stats.totalEleGain}m` });

  if (metrics.showCalories !== false && stats.totalCalories > 0) stripItems.push({ k: 'cal', l: 'CALORIES', v: `${stats.totalCalories} kcal` });

  if (metrics.showRunCount !== false && stats.count > 0) stripItems.push({ k: 'count', l: 'SESSIONS', v: `${stats.count}` });



  if (stripItems.length > 0) {

    const sItemW = stripW / stripItems.length;

    renderer.drawRoundedRect(ctx, pad, curY, stripW, 60, 14);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';

    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';

    ctx.lineWidth = 1;

    ctx.stroke();



    stripItems.forEach((it, idx) => {

      const ix = pad + idx * sItemW + sItemW / 2;

      drawWeeklyText(ctx, renderer, weeklyData, `pillarStripLabel_${it.k}`, it.l, ix, curY + 20, {

        fallbackKey: `${it.k}Label`,

        label: `${it.l} Label`,

        font, size: 10, weight: 'bold', align: 'center', color: textMuted

      });



      drawWeeklyText(ctx, renderer, weeklyData, `pillarStripValue_${it.k}`, it.v, ix, curY + 44, {

        fallbackKey: `${it.k}Value`,

        label: `${it.l} Value`,

        font, size: 15, weight: '900', align: 'center', color: textCol

      });

    });

    curY += 76;

  }



  // Individual Workout Sessions ticker if enabled

  if (metrics.showRunList !== false && stats.activeRuns.length > 0) {

    const runsList = stats.activeRuns.slice(0, 4);

    const runH = 34;

    runsList.forEach((r, idx) => {

      const ry = curY + idx * (runH + 6);

      if (ry + runH > h - h * 0.03) return;

      renderer.drawRoundedRect(ctx, pad, ry, stripW, runH, 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';

      ctx.fill();



      const rDate = r.date instanceof Date ? r.date : new Date(r.date || Date.now());

      const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

      drawWeeklyText(ctx, renderer, weeklyData, `pillarRunDate_${idx}`, dayStr, pad + 12, ry + runH / 2 + 4, {

        fallbackKey: 'runCardDate',

        label: `Run ${idx + 1} Day`,

        font, size: 10, weight: 'bold', align: 'left', color: accent

      });



      const title = r.customName || r.title || `Workout ${idx + 1}`;

      drawWeeklyText(ctx, renderer, weeklyData, `pillarRunTitle_${idx}`, title, pad + 55, ry + runH / 2 + 4, {

        fallbackKey: 'runCardTitle',

        label: `Run ${idx + 1} Title`,

        font, size: 11, weight: 'bold', align: 'left', color: textCol

      });



      const sessParts = formatWeeklySessionStats(r, stats, metrics);

      if (sessParts.length > 0) {

        drawWeeklyText(ctx, renderer, weeklyData, `pillarRunStats_${idx}`, sessParts.join('  •  '), pad + stripW - 12, ry + runH / 2 + 4, {

          fallbackKey: 'runCardStats',

          label: `Run ${idx + 1} Stats`,

          font, size: 10, weight: '600', align: 'right', color: textMuted

        });

      }

    });

  }

}



/**

 * TEMPLATE 4: MARATHON TRAINING LOG SHEET

 */

function renderWeeklyTrainingLogLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.045;



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'OFFICIAL WORKOUT LEDGER', pad, curY + 12, {

      font, size: 11, weight: 'bold', align: 'left', color: accent

    });

    curY += 26;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font, size: Math.round(w * 0.062), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.062) + 8;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, pad, curY + 12, {

      font, size: 14, weight: '500', align: 'left', color: textMuted

    });

    curY += 28;

  }



  // Header Summary KPI Grid

  const cardW = w - pad * 2;

  const kpis = [];

  if (metrics.showDistance !== false) kpis.push({ k: 'dist', l: 'TOTAL DISTANCE', v: `${stats.distFormatted} ${stats.unit}` });

  if (metrics.showTime !== false) kpis.push({ k: 'time', l: 'TOTAL TIME', v: stats.durationFormatted });

  if (metrics.showPace !== false) kpis.push({ k: 'pace', l: 'AVG PACE', v: `${stats.avgPaceFormatted}` });

  if (metrics.showRunCount !== false) kpis.push({ k: 'count', l: 'SESSIONS', v: `${stats.count} RUNS` });

  if (metrics.showHr !== false && stats.avgHr > 0) kpis.push({ k: 'hr', l: 'AVG HR', v: `${stats.avgHr} bpm` });

  if (metrics.showElevation !== false && stats.totalEleGain > 0) kpis.push({ k: 'elev', l: 'ELEVATION', v: `+${stats.totalEleGain}m` });

  if (metrics.showCalories !== false && stats.totalCalories > 0) kpis.push({ k: 'cal', l: 'CALORIES', v: `${stats.totalCalories} kcal` });



  if (kpis.length > 0) {

    const kpiH = 74;

    const kBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, kpiH, config, theme, 'kpiCard', weeklyData, 'Consolidated KPI Bar');

    const kpiX = kBounds.x;

    const kpiY = kBounds.y;

    const kpiColW = cardW / kpis.length;

    kpis.forEach((kp, idx) => {

      const kx = pad + idx * kpiColW + 16;

      drawWeeklyText(ctx, renderer, weeklyData, `ledgerKpiLabel_${kp.k}`, kp.l, kx, curY + 24, {

        fallbackKey: `${kp.k}Label`,

        label: `${kp.l} Label`,

        font, size: 10, weight: 'bold', align: 'left', color: textMuted

      });

      drawWeeklyText(ctx, renderer, weeklyData, `ledgerKpiValue_${kp.k}`, kp.v, kx, curY + 52, {

        fallbackKey: `${kp.k}Value`,

        label: `${kp.l} Value`,

        font, size: 15, weight: '900', align: 'left', color: idx === 0 ? accent : textCol

      });

    });

    curY += kpiH + 18;

  }



  // Ledger Table Rows

  if (metrics.showRunList !== false) {

    const tableH = h - curY - h * 0.05;

    const tBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, tableH, config, theme, 'tableCard', weeklyData, 'Running Log Table Card');

    const tableX = tBounds.x;

    const tableY = tBounds.y;



    // Dynamic Columns based on enabled session metrics

    const cols = [];

    if (metrics.showSessionDist !== false) cols.push({ key: 'dist', label: 'DIST', valFn: r => `${r.distanceMain || (r.distance / 1000).toFixed(1)} ${r.distanceUnit || stats.unit}` });

    if (metrics.showSessionTime !== false) cols.push({ key: 'time', label: 'TIME', valFn: r => r.durationFormatted || '--:--' });

    if (metrics.showSessionPace !== false) cols.push({ key: 'pace', label: 'PACE', valFn: r => `${r.avgPaceFormatted || '--:--'}` });

    if (metrics.showSessionHr !== false) cols.push({ key: 'hr', label: 'HR', valFn: r => r.avgHr > 0 ? `${r.avgHr} bpm` : '--' });

    if (metrics.showSessionElevation !== false) cols.push({ key: 'elev', label: 'ELEV', valFn: r => r.elevationGain > 0 ? `+${r.elevationGain}m` : '--' });



    // Table header bar

    renderer.drawRoundedRect(ctx, pad, curY, cardW, 36, 12);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';

    ctx.fill();



    drawWeeklyText(ctx, renderer, weeklyData, 'runListTitle', 'DATE / SESSION', pad + 16, curY + 22, {

      font, size: 10, weight: 'bold', align: 'left', color: textMuted

    });



    const colRightEdge = pad + cardW - 16;

    const colSpacing = 72;

    cols.forEach((col, cIdx) => {

      const colX = colRightEdge - (cols.length - 1 - cIdx) * colSpacing;

      drawWeeklyText(ctx, renderer, weeklyData, `${col.key}Label`, col.label, colX, curY + 22, {

        font, size: 10, weight: 'bold', align: 'right', color: textMuted

      });

    });



    const rowStartY = curY + 44;

    const displayRuns = (stats.activeRuns || []).slice(0, 8);

    const rowH = Math.min(54, (tableH - 52) / (displayRuns.length || 1));



    displayRuns.forEach((run, rIdx) => {

      const ry = rowStartY + rIdx * rowH;

      if (rIdx % 2 === 1) {

        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';

        ctx.fillRect(pad + 6, ry - 8, cardW - 12, rowH);

      }



      const rDate = run.date instanceof Date ? run.date : new Date(run.date || Date.now());

      const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

      const dateNum = rDate.getDate();



      drawWeeklyText(ctx, renderer, weeklyData, `ledgerDate_${rIdx}`, `${dayStr} ${dateNum}`, pad + 16, ry + rowH * 0.35, {

        fallbackKey: 'runCardDate',

        label: `Row ${rIdx + 1} Date`,

        font, size: 11, weight: 'bold', align: 'left', color: accent

      });



      drawWeeklyText(ctx, renderer, weeklyData, `ledgerTitle_${rIdx}`, run.customName || run.title || `Workout ${rIdx + 1}`, pad + 16, ry + rowH * 0.75, {

        fallbackKey: 'runCardTitle',

        label: `Row ${rIdx + 1} Title`,

        font, size: 12, weight: 'bold', align: 'left', color: textCol

      });



      cols.forEach((col, cIdx) => {

        const colX = colRightEdge - (cols.length - 1 - cIdx) * colSpacing;

        drawWeeklyText(ctx, renderer, weeklyData, `ledger_${col.key}_${rIdx}`, col.valFn(run), colX, ry + rowH * 0.55, {

          fallbackKey: `${col.key}Value`,

          label: `Row ${rIdx + 1} ${col.label}`,

          font, size: 12, weight: col.key === 'pace' || col.key === 'dist' ? '900' : 'bold', align: 'right', color: col.key === 'pace' ? accent : textCol

        });

      });

    });

  }

}



/**

 * TEMPLATE 5: ALL ROUTES UNIFIED GPS MAP

 */

function renderWeeklyUnifiedMapLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.045;



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'GLOBAL GPS ROUTE MOSAIC', pad, curY + 12, {

      font, size: 11, weight: 'bold', align: 'left', color: accent

    });

    curY += 26;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font, size: Math.round(w * 0.065), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.065) + 8;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, pad, curY + 12, {

      font, size: 14, weight: '500', align: 'left', color: textMuted

    });

    curY += 26;

  }



  // Unified Multi-Route Canvas

  const mapW = w - pad * 2;

  const mapH = h * 0.54;

  const mBounds = drawGlassCard(renderer, ctx, pad, curY, mapW, mapH, config, theme, 'mapCard', weeklyData, 'Unified Route Map Card');

  const mapX = mBounds.x;

  const mapY = mBounds.y;



  const activeRuns = stats.activeRuns || [];

  if (metrics.showRouteMaps !== false) {

    drawUnifiedMultiRouteMap(ctx, pad, curY, mapW, mapH, activeRuns, accent);

  }

  curY += mapH + 16;



  // Consolidated Telemetry Card below map

  const cardW = w - pad * 2;

  const metricsArr = [];

  if (metrics.showDistance !== false) metricsArr.push({ k: 'dist', l: 'TOTAL DISTANCE', v: `${stats.distFormatted} ${stats.unit}` });

  if (metrics.showTime !== false) metricsArr.push({ k: 'time', l: 'TOTAL TIME', v: stats.durationFormatted });

  if (metrics.showPace !== false) metricsArr.push({ k: 'pace', l: 'AVERAGE PACE', v: `${stats.avgPaceFormatted}` });

  if (metrics.showElevation !== false && stats.totalEleGain > 0) metricsArr.push({ k: 'elev', l: 'TOTAL CLIMB', v: `+${stats.totalEleGain}m` });

  if (metrics.showHr !== false && stats.avgHr > 0) metricsArr.push({ k: 'hr', l: 'AVG HR', v: `${stats.avgHr} bpm` });

  if (metrics.showCalories !== false && stats.totalCalories > 0) metricsArr.push({ k: 'cal', l: 'CALORIES', v: `${stats.totalCalories} kcal` });

  if (metrics.showRunCount !== false && stats.count > 0) metricsArr.push({ k: 'count', l: 'SESSIONS', v: `${stats.count}` });



  if (metricsArr.length > 0) {

    const kpiH = 68;

    const kBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, kpiH, config, theme, 'kpiCard', weeklyData, 'Summary KPI Card');

    const kpiX = kBounds.x;

    const kpiY = kBounds.y;

    const colW = cardW / metricsArr.length;

    metricsArr.forEach((m, idx) => {

      const mx = pad + idx * colW + colW / 2;

      drawWeeklyText(ctx, renderer, weeklyData, m.k + 'Label', m.l, mx, curY + 22, {

        font, size: 10, weight: 'bold', align: 'center', color: textMuted

      });

      drawWeeklyText(ctx, renderer, weeklyData, m.k + 'Value', m.v, mx, curY + 48, {

        font, size: 15, weight: '900', align: 'center', color: idx === 0 ? accent : textCol

      });

    });

    curY += kpiH + 14;

  }



  // Legend of workouts

  if (metrics.showRunList !== false && activeRuns.length > 0) {

    drawWeeklyText(ctx, renderer, weeklyData, 'runListTitle', 'ROUTES KEY // RUNS OVERLAYED', pad, curY + 12, {

      font, size: 10, weight: 'bold', align: 'left', color: textMuted

    });

    curY += 22;



    const colors = ['#00f0ff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

    const legRuns = activeRuns.slice(0, 6);

    const legCols = 2;

    const legW = (w - pad * 2) / legCols;



    legRuns.forEach((r, idx) => {

      const colIdx = idx % legCols;

      const rowIdx = Math.floor(idx / legCols);

      const lx = pad + colIdx * legW;

      const ly = curY + rowIdx * 20;

      const c = colors[idx % colors.length];



      ctx.fillStyle = c;

      ctx.beginPath();

      ctx.arc(lx + 5, ly + 4, 4, 0, Math.PI * 2);

      ctx.fill();



      const rName = r.customName || r.title || `Run ${idx + 1}`;

      drawWeeklyText(ctx, renderer, weeklyData, `mapLegTitle_${idx}`, rName, lx + 16, ly + 8, {

        fallbackKey: 'runCardTitle',

        label: `Route ${idx + 1} Title`,

        font, size: 11, weight: 'bold', align: 'left', color: textCol

      });



      if (metrics.showSessionDist !== false) {

        drawWeeklyText(ctx, renderer, weeklyData, `mapLegDist_${idx}`, `${r.distanceMain} ${r.distanceUnit}`, lx + legW - 12, ly + 8, {

          fallbackKey: 'distValue',

          label: `Route ${idx + 1} Distance`,

          font, size: 11, weight: 'normal', align: 'right', color: c

        });

      }

    });

  }

}



/**

 * TEMPLATE 6: MINIMALIST EDITORIAL WEEKLY

 */

function renderWeeklyMinimalEditorialLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.08;

  const serifFont = "'Playfair Display', Georgia, serif";

  const sansFont = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.06;



  // Thin top architectural rule

  if (metrics.showTag !== false || metrics.showTitle !== false || metrics.showSubtitle !== false) {

    ctx.strokeStyle = accent;

    ctx.lineWidth = 1.5;

    ctx.beginPath();

    ctx.moveTo(pad, curY);

    ctx.lineTo(w - pad, curY);

    ctx.stroke();

    curY += 26;

  }



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'THE WEEKLY RUNNING DISPATCH', pad, curY, {

      font: sansFont, size: 10, weight: '800', align: 'left', color: accent

    });

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, w - pad, curY, {

      font: sansFont, size: 10, weight: '600', align: 'right', color: textMuted

    });

  }



  if (metrics.showTag !== false || metrics.showSubtitle !== false) {

    curY += 34;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = weeklyData.title || 'Weekly Volume';

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.065), {

      font: serifFont, size: Math.round(w * 0.08), weight: 'normal', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.08) + 24;

  }



  // Monumental Serif Mileage

  if (metrics.showDistance !== false) {

    const distStr = `${stats.distFormatted} ${stats.unit.toLowerCase()}`;

    drawWeeklyText(ctx, renderer, weeklyData, 'distValue', distStr, pad, curY + Math.round(w * 0.15), {

      font: serifFont, size: Math.round(w * 0.16), weight: 'bold', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.16) + 16;

  }



  // Key stats line

  const metaArr = [];

  if (metrics.showTime !== false) metaArr.push(`${stats.durationFormatted} Time`);

  if (metrics.showPace !== false) metaArr.push(`${stats.avgPaceFormatted} Avg`);

  if (metrics.showHr !== false && stats.avgHr > 0) metaArr.push(`${stats.avgHr} bpm`);

  if (metrics.showElevation !== false && stats.totalEleGain > 0) metaArr.push(`+${stats.totalEleGain}m`);

  if (metrics.showCalories !== false && stats.totalCalories > 0) metaArr.push(`${stats.totalCalories} kcal`);

  if (metrics.showRunCount !== false) metaArr.push(`${stats.count} Sessions`);



  if (metaArr.length > 0) {

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(pad, curY);

    ctx.lineTo(w - pad, curY);

    ctx.stroke();

    curY += 24;



    drawWeeklyText(ctx, renderer, weeklyData, 'timeValue', metaArr.join('   /   '), pad, curY + 6, {

      font: sansFont, size: 12, weight: '500', align: 'left', color: textMuted

    });

    curY += 36;

  }



  // Minimalist Workout Rows

  if (metrics.showRunList !== false) {

    const displayRuns = (stats.activeRuns || []).slice(0, 5);

    displayRuns.forEach((r, idx) => {

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';

      ctx.lineWidth = 0.8;

      ctx.beginPath();

      ctx.moveTo(pad, curY + 34);

      ctx.lineTo(w - pad, curY + 34);

      ctx.stroke();



      const rDate = r.date instanceof Date ? r.date : new Date(r.date || Date.now());

      const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'long' });



      drawWeeklyText(ctx, renderer, weeklyData, `editorialDate_${idx}`, dayStr, pad, curY + 14, {

        fallbackKey: 'runCardDate',

        label: `Run ${idx + 1} Day`,

        font: serifFont, size: 16, weight: 'normal', align: 'left', color: textCol

      });



      drawWeeklyText(ctx, renderer, weeklyData, `editorialTitle_${idx}`, r.customName || r.title || `Workout ${idx + 1}`, pad + 140, curY + 14, {

        fallbackKey: 'runCardTitle',

        label: `Run ${idx + 1} Title`,

        font: sansFont, size: 13, weight: 'bold', align: 'left', color: textMuted

      });



      if (metrics.showSessionDist !== false) {

        drawWeeklyText(ctx, renderer, weeklyData, `editorialDist_${idx}`, `${r.distanceMain} ${r.distanceUnit}`, w - pad, curY + 14, {

          fallbackKey: 'distValue',

          label: `Run ${idx + 1} Distance`,

          font: sansFont, size: 14, weight: 'bold', align: 'right', color: accent

        });

      }



      const sessParts = formatWeeklySessionStats(r, stats, metrics).filter(p => !p.includes(stats.unit));

      if (sessParts.length > 0) {

        drawWeeklyText(ctx, renderer, weeklyData, `editorialStats_${idx}`, sessParts.join('  •  '), pad + 140, curY + 28, {

          fallbackKey: 'runCardStats',

          label: `Run ${idx + 1} Stats`,

          font: sansFont, size: 10, weight: 'normal', align: 'left', color: textMuted

        });

      }



      curY += 46;

    });

  }

}



/**

 * TEMPLATE 7: CYBER NEON HUD (Futuristic Telemetry Console)

 */

function renderWeeklyCyberNeonHudLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const cardW = w - pad * 2;

  const cyberFont = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(0, 240, 255, 0.65)';

  const cyanAccent = '#00f0ff';



  let curY = h * 0.045;



  if (metrics.showTag !== false || metrics.showTitle !== false) {

    ctx.save();

    ctx.strokeStyle = cyanAccent;

    ctx.lineWidth = 1.5;

    ctx.beginPath();

    ctx.moveTo(pad - 10, curY + 20);

    ctx.lineTo(pad - 10, curY - 5);

    ctx.lineTo(pad + 15, curY - 5);

    ctx.stroke();



    ctx.beginPath();

    ctx.moveTo(w - pad + 10, curY + 20);

    ctx.lineTo(w - pad + 10, curY - 5);

    ctx.lineTo(w - pad - 15, curY - 5);

    ctx.stroke();

    ctx.restore();

  }



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', `// SYSTEM TELEMETRY // PROTOCOL 07`, pad, curY + 12, {

      font: cyberFont, size: 11, weight: 'bold', align: 'left', color: cyanAccent

    });

    curY += 28;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN MATRIX').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font: cyberFont, size: Math.round(w * 0.065), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.065) + 10;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || `GRID COORDINATES // ${stats.dateRangeStr}`, pad, curY + 12, {

      font: cyberFont, size: 12, weight: '600', align: 'left', color: textMuted

    });

    curY += 28;

  }



  // Central Cyber Hex Shield KPI

  const shieldItems = [];

  if (metrics.showTime !== false) shieldItems.push(`DUR: ${stats.durationFormatted}`);

  if (metrics.showPace !== false) shieldItems.push(`PACE: ${stats.avgPaceFormatted}`);

  if (metrics.showHr !== false && stats.avgHr > 0) shieldItems.push(`CARDIAC: ${stats.avgHr} BPM`);

  if (metrics.showElevation !== false && stats.totalEleGain > 0) shieldItems.push(`ELEV: +${stats.totalEleGain}M`);

  if (metrics.showCalories !== false && stats.totalCalories > 0) shieldItems.push(`ENERGY: ${stats.totalCalories} KCAL`);

  if (metrics.showRunCount !== false && stats.count > 0) shieldItems.push(`RUNS: ${stats.count}`);



  const hasShield = (metrics.showDistance !== false) || (shieldItems.length > 0);

  if (hasShield) {

    const shieldH = h * 0.18;

    const hBounds = drawCyberCard(ctx, pad, curY, cardW, shieldH, cyanAccent, 'heroCard', weeklyData, 'Cyber Shield Hero Card', renderer);

    const heroX = hBounds.x + 24;

    const heroY = hBounds.y + 24;



    if (metrics.showDistance !== false) {

      drawWeeklyText(ctx, renderer, weeklyData, 'distLabel', 'CUMULATIVE MILEAGE CORE', heroX, heroY + 10, {

        font: cyberFont, size: 11, weight: 'bold', align: 'left', color: cyanAccent

      });



      const distStr = stats.distFormatted;

      drawWeeklyText(ctx, renderer, weeklyData, 'distValue', distStr, heroX, heroY + Math.round(w * 0.11), {

        font: cyberFont, size: Math.round(w * 0.13), weight: '900', align: 'left', color: textCol

      });



      ctx.font = `900 ${Math.round(w * 0.13)}px ${cyberFont}`;

      const dW = ctx.measureText(distStr).width;

      drawWeeklyText(ctx, renderer, weeklyData, 'distUnit', stats.unit.toUpperCase(), heroX + dW + 8, heroY + Math.round(w * 0.10) - 6, {

        font: cyberFont, size: 20, weight: '900', align: 'left', color: accent

      });

    }



    const rightX = pad + cardW - 24;

    shieldItems.slice(0, 4).forEach((itemText, idx) => {

      drawWeeklyText(ctx, renderer, weeklyData, `hudTelemetry_${idx}`, itemText, rightX, heroY + 16 + idx * 20, {

        fallbackKey: idx === 0 ? 'timeValue' : (idx === 1 ? 'paceValue' : 'hrValue'),

        label: `Telemetry ${idx + 1}`,

        font: cyberFont, size: 12.5, weight: 'bold', align: 'right', color: idx === 1 ? accent : (idx === 2 ? '#ec4899' : textCol)

      });

    });



    curY += shieldH + 16;

  }



  // Cyber Equalizer Energy Bars

  if (metrics.showDailyBars !== false) {

    const eqH = h * 0.14;

    const eqBounds = drawCyberCard(ctx, pad, curY, cardW, eqH, 'rgba(0, 240, 255, 0.4)', 'barsCard', weeklyData, 'Cyber Equalizer Bars Card', renderer);

    const eqX = eqBounds.x;

    const eqY = eqBounds.y;



    drawWeeklyText(ctx, renderer, weeklyData, 'dailyBarsTitle', 'MON–SUN EQUALIZER POWER CELLS', pad + 16, curY + 18, {

      font: cyberFont, size: 10, weight: 'bold', align: 'left', color: cyanAccent

    });



    const bY = curY + 34;

    const bH = eqH - 58;

    const dayCols = stats.dayDistribution || [];

    const colW = (cardW - 32) / 7;

    const userBarColor = (weeklyData && weeklyData.barColor) || cyanAccent;

    const actualMax = Math.max(0.1, ...dayCols.map((d) => d.distanceRaw || 0));

    const scaleCeiling = Math.max(5, Math.ceil(actualMax / 5) * 5);



    dayCols.forEach((d, idx) => {

      const bx = pad + 16 + idx * colW + colW * 0.15;

      const bw = colW * 0.7;

      const numSegments = 8;

      const segH = (bH - (numSegments - 1) * 3) / numSegments;

      const rawDist = d.distanceRaw || 0;

      const activeSegs = rawDist > 0 ? Math.max(1, Math.round(Math.min(1.0, rawDist / scaleCeiling) * numSegments)) : 0;



      for (let s = 0; s < numSegments; s++) {

        const sy = bY + bH - (s + 1) * (segH + 3);

        const isActive = s < activeSegs;

        ctx.fillStyle = isActive ? userBarColor : 'rgba(255, 255, 255, 0.05)';

        ctx.fillRect(bx, sy, bw, segH);

      }



      drawWeeklyText(ctx, renderer, weeklyData, `hudEqLabel_${d.day}`, d.day, bx + bw / 2, bY + bH + 14, {

        fallbackKey: 'dailyDayLabels',

        label: `${d.day} Equalizer Label`,

        font: cyberFont, size: 10, weight: 'bold', align: 'center', color: rawDist > 0 ? userBarColor : 'rgba(255, 255, 255, 0.4)'

      });

    });



    curY += eqH + 16;

  }



  // Futuristic Session Cards with Mini Routes

  if (metrics.showRunList !== false) {

    const remainingH = h - curY - h * 0.04;

    const runsList = (stats.activeRuns || []).slice(0, 4);

    if (runsList.length > 0) {

      const rowH = Math.min(72, (remainingH - (runsList.length - 1) * 10) / (runsList.length || 1));



      runsList.forEach((run, idx) => {

        const ry = curY + idx * (rowH + 10);

        const elemKey = `runCard_${idx}`;

        const rBounds = drawCyberCard(ctx, pad, ry, cardW, rowH, 'rgba(255, 255, 255, 0.12)', elemKey, weeklyData, `Cyber Run Card ${idx + 1}`, renderer);

        const rowX = rBounds.x;

        const rowY = rBounds.y;



        ctx.fillStyle = idx % 2 === 0 ? cyanAccent : accent;

        ctx.beginPath();

        ctx.arc(pad + 18, ry + rowH / 2, 4, 0, Math.PI * 2);

        ctx.fill();



        const runTitle = run.customName || run.title || `NODE // RUN ${idx + 1}`;

        drawWeeklyText(ctx, renderer, weeklyData, `hudRunTitle_${idx}`, runTitle, pad + 32, ry + rowH / 2 - 4, {

          fallbackKey: 'runCardTitle',

          label: `Node ${idx + 1} Title`,

          font: cyberFont, size: 13, weight: 'bold', align: 'left', color: textCol

        });



        const sessParts = formatWeeklySessionStats(run, stats, metrics);

        const sub = sessParts.join('   •   ');

        if (sub) {

          drawWeeklyText(ctx, renderer, weeklyData, `hudRunStats_${idx}`, sub, pad + 32, ry + rowH / 2 + 14, {

            fallbackKey: 'runCardStats',

            label: `Node ${idx + 1} Stats`,

            font: cyberFont, size: 10, weight: 'normal', align: 'left', color: '#00f0ff'

          });

        }



        if (metrics.showRouteMaps !== false && run.trackpoints && run.trackpoints.length > 2) {

          drawMiniRouteSilhouette(ctx, pad + cardW - 74, ry + 6, 60, rowH - 12, run.trackpoints, run.bounds, cyanAccent, 2.2);

        }

      });

    }

  }

}



/**

 * TEMPLATE 8: BOLD MAGAZINE COVER (Editorial Masthead & Big Hero Cutout)

 */

function renderWeeklyMagazineCoverLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const mastFont = "'Anton', 'Bebas Neue', sans-serif";

  const bodyFont = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';



  let curY = h * 0.045;



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'SPECIAL ATHLETICS ISSUE  •  VOL. 42  •  $4.99', pad, curY + 12, {

      font: bodyFont, size: 11, weight: 'bold', align: 'left', color: accent

    });

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, w - pad, curY + 12, {

      font: bodyFont, size: 11, weight: 'bold', align: 'right', color: 'rgba(255, 255, 255, 0.65)'

    });

  }



  if (metrics.showTag !== false || metrics.showSubtitle !== false) {

    curY += 26;

  }



  if (metrics.showTitle !== false) {

    const mastheadText = (weeklyData.title || 'RUNNER').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mastheadText, w / 2, curY + Math.round(w * 0.18), {

      font: mastFont, size: Math.round(w * 0.22), weight: '900', align: 'center', color: textCol

    });

    curY += Math.round(w * 0.22) + 12;



    ctx.fillStyle = accent;

    ctx.fillRect(pad, curY, w - pad * 2, 4);

    curY += 20;

  }



  if (metrics.showDistance !== false) {

    const distNum = stats.distFormatted;

    drawWeeklyText(ctx, renderer, weeklyData, 'distValue', distNum, pad, curY + Math.round(w * 0.16), {

      font: mastFont, size: Math.round(w * 0.20), weight: '900', align: 'left', color: textCol

    });



    ctx.font = `900 ${Math.round(w * 0.20)}px ${mastFont}`;

    const dW = ctx.measureText(distNum).width;

    drawWeeklyText(ctx, renderer, weeklyData, 'distUnit', stats.unit.toUpperCase(), pad + dW + 10, curY + Math.round(w * 0.16) - 15, {

      font: mastFont, size: 36, weight: '900', align: 'left', color: accent

    });

    curY += Math.round(w * 0.20) + 16;

  }



  // Cover Story Blurbs

  if (metrics.showRunList !== false) {

    const blurbBoxW = w - pad * 2;

    const blurbH = 88;

    renderer.drawRoundedRect(ctx, pad, curY, blurbBoxW, blurbH, 14);

    ctx.fillStyle = 'rgba(20, 20, 28, 0.78)';

    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';

    ctx.lineWidth = 1;

    ctx.stroke();



    drawWeeklyText(ctx, renderer, weeklyData, 'runListTitle', 'COVER STORY: THE LONG RUN BREAKTHROUGH', pad + 16, curY + 24, {

      font: bodyFont, size: 12, weight: 'bold', align: 'left', color: accent

    });



    const storyParts = [];

    if (metrics.showRunCount !== false) storyParts.push(`${stats.count} sessions completed`);

    if (metrics.showTime !== false) storyParts.push(`in ${stats.durationFormatted}`);

    if (metrics.showPace !== false) storyParts.push(`at an average pace of ${stats.avgPaceFormatted}`);

    if (metrics.showHr !== false && stats.avgHr > 0) storyParts.push(`peak intensity reached ${stats.avgHr} bpm`);

    if (metrics.showElevation !== false && stats.totalEleGain > 0) storyParts.push(`climbing +${stats.totalEleGain}m`);



    const storyLine = storyParts.length > 0 ? (storyParts.join(', ') + '.') : 'Athletic volume logged and verified for this training block.';

    drawWeeklyText(ctx, renderer, weeklyData, 'runCardStats', storyLine, pad + 16, curY + 50, {

      font: bodyFont, size: 12, weight: 'normal', align: 'left', color: 'rgba(255, 255, 255, 0.8)'

    });

    curY += blurbH + 18;

  }



  // Bottom Magazine Barcode & Highlights

  const barcodeY = h - h * 0.08;

  ctx.fillStyle = '#ffffff';

  for (let bx = pad; bx < pad + 110; bx += 3 + (bx % 4)) {

    ctx.fillRect(bx, barcodeY - 24, 2, 28);

  }

  ctx.font = `10px ${bodyFont}`;

  ctx.fillText('9 780201 379624', pad, barcodeY + 12);



  // Bottom Right Telemetry Pills

  if (metrics.showRunCount !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'countValue', `${stats.count} SESSIONS VERIFIED`, w - pad, barcodeY - 14, {

      font: bodyFont, size: 13, weight: 'bold', align: 'right', color: accent

    });

  }

  if (metrics.showPace !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'paceValue', `AVG PACE ${stats.avgPaceFormatted} /KM`, w - pad, barcodeY + 4, {

      font: bodyFont, size: 12, weight: 'bold', align: 'right', color: textCol

    });

  }

  if (metrics.showTime !== false && metrics.showPace === false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'timeValue', `TOTAL TIME ${stats.durationFormatted}`, w - pad, barcodeY + 4, {

      font: bodyFont, size: 12, weight: 'bold', align: 'right', color: textCol

    });

  }

}



/**

 * TEMPLATE 9: MULTI-SESSION SPLIT COMPARISON (Pace Curves & Head-to-Head)

 */

function renderWeeklySplitComparisonLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const cardW = w - pad * 2;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.045;



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'HEAD-TO-HEAD PERFORMANCE & PACING', pad, curY + 12, {

      font, size: 11, weight: 'bold', align: 'left', color: accent

    });

    curY += 28;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font, size: Math.round(w * 0.065), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.065) + 10;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, pad, curY + 12, {

      font, size: 14, weight: '500', align: 'left', color: textMuted

    });

    curY += 28;

  }



  // Header summary pills if distance / time / hr are enabled

  const sumPills = [];

  if (metrics.showDistance !== false) sumPills.push(`${stats.distFormatted} ${stats.unit.toUpperCase()}`);

  if (metrics.showTime !== false) sumPills.push(stats.durationFormatted);

  if (metrics.showHr !== false && stats.avgHr > 0) sumPills.push(`${stats.avgHr} BPM`);

  if (metrics.showElevation !== false && stats.totalEleGain > 0) sumPills.push(`+${stats.totalEleGain}M`);

  if (sumPills.length > 0) {

    drawWeeklyText(ctx, renderer, weeklyData, 'distLabel', sumPills.join('   //   '), pad, curY + 6, {

      font, size: 11, weight: 'bold', align: 'left', color: accent

    });

    curY += 22;

  }



  // Pace Progression Curve Graph

  const activeRuns = stats.activeRuns || [];

  if (metrics.showPace !== false && activeRuns.length >= 2) {

    const graphH = h * 0.25;

    const gBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, graphH, config, theme, 'splitGraphCard', weeklyData, 'Split Trajectory Graph Card');

    const graphX = gBounds.x;

    const graphY = gBounds.y;



    drawWeeklyText(ctx, renderer, weeklyData, 'paceLabel', 'PACE PROGRESSION ACROSS SESSIONS (/KM)', pad + 18, curY + 22, {

      font, size: 11, weight: 'bold', align: 'left', color: textMuted

    });



    const chartX = pad + 32;

    const chartY = curY + 45;

    const chartW = cardW - 64;

    const chartH = graphH - 75;



    const paces = activeRuns.map(r => r.avgPace || 300);

    const minPace = Math.min(...paces) - 15;

    const maxPace = Math.max(...paces) + 15;

    const paceRange = maxPace - minPace || 30;



    const avgY = chartY + chartH - ((stats.avgPaceSec - minPace) / paceRange) * chartH;

    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';

    ctx.lineWidth = 1;

    ctx.setLineDash([4, 4]);

    ctx.beginPath();

    ctx.moveTo(chartX, avgY);

    ctx.lineTo(chartX + chartW, avgY);

    ctx.stroke();

    ctx.restore();



    drawWeeklyText(ctx, renderer, weeklyData, 'paceValue', `AVG ${stats.avgPaceFormatted}`, chartX + chartW, avgY - 6, {

      font, size: 10, weight: 'bold', align: 'right', color: accent

    });



    const stepX = chartW / (activeRuns.length - 1);

    const points = activeRuns.map((r, i) => {

      const px = chartX + i * stepX;

      const py = chartY + chartH - (((r.avgPace || stats.avgPaceSec) - minPace) / paceRange) * chartH;

      return [px, py, r];

    });



    ctx.save();

    ctx.beginPath();

    points.forEach(([px, py], i) => {

      if (i === 0) ctx.moveTo(px, py);

      else ctx.lineTo(px, py);

    });

    ctx.strokeStyle = accent;

    ctx.lineWidth = 3;

    ctx.lineCap = 'round';

    ctx.lineJoin = 'round';

    ctx.stroke();



    ctx.lineTo(chartX + chartW, chartY + chartH);

    ctx.lineTo(chartX, chartY + chartH);

    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);

    areaGrad.addColorStop(0, 'rgba(204, 255, 0, 0.25)');

    areaGrad.addColorStop(1, 'rgba(204, 255, 0, 0.0)');

    ctx.fillStyle = areaGrad;

    ctx.fill();



    points.forEach(([px, py, r], i) => {

      ctx.fillStyle = '#ffffff';

      ctx.beginPath();

      ctx.arc(px, py, 5, 0, Math.PI * 2);

      ctx.fill();

      ctx.strokeStyle = accent;

      ctx.lineWidth = 2;

      ctx.stroke();



      const rDate = r.date instanceof Date ? r.date : new Date(r.date || Date.now());

      const dayShort = rDate.toLocaleDateString('en-US', { weekday: 'short' });

      drawWeeklyText(ctx, renderer, weeklyData, `splitGraphDate_${i}`, dayShort, px, chartY + chartH + 16, {

        fallbackKey: 'runCardDate',

        label: `Graph Run ${i + 1} Day`,

        font, size: 10, weight: 'bold', align: 'center', color: textMuted

      });



      drawWeeklyText(ctx, renderer, weeklyData, `splitGraphPace_${i}`, r.avgPaceFormatted || '', px, py - 10, {

        fallbackKey: 'paceValue',

        label: `Graph Run ${i + 1} Pace`,

        font, size: 10, weight: '900', align: 'center', color: '#ffffff'

      });

    });

    ctx.restore();



    curY += graphH + 16;

  }



  // Session Comparison Rows

  if (metrics.showRunList !== false) {

    const remainingH = h - curY - h * 0.04;

    const runsList = activeRuns.slice(0, 4);

    if (runsList.length > 0) {

      const rowH = Math.min(68, (remainingH - (runsList.length - 1) * 10) / (runsList.length || 1));



      runsList.forEach((run, idx) => {

        const ry = curY + idx * (rowH + 10);

        const elemKey = `splitCard_${idx}`;

        const sBounds = drawGlassCard(renderer, ctx, pad, ry, cardW, rowH, config, theme, elemKey, weeklyData, `Split Card ${idx + 1}`);

        const cardX = sBounds.x;

        const cardY = sBounds.y;



        const rDate = run.date instanceof Date ? run.date : new Date(run.date || Date.now());

        const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

        const dateNum = rDate.getDate();



        drawWeeklyText(ctx, renderer, weeklyData, `splitCardDate_${idx}`, `${dayStr} ${dateNum}`, pad + 16, ry + rowH / 2 - 4, {

          fallbackKey: 'runCardDate',

          label: `Card ${idx + 1} Date`,

          font, size: 12, weight: 'bold', align: 'left', color: accent

        });



        drawWeeklyText(ctx, renderer, weeklyData, `splitCardTitle_${idx}`, run.customName || run.title || `Workout ${idx + 1}`, pad + 16, ry + rowH / 2 + 14, {

          fallbackKey: 'runCardTitle',

          label: `Card ${idx + 1} Title`,

          font, size: 12, weight: 'bold', align: 'left', color: textCol

        });



        if (metrics.showSessionDist !== false) {

          const distStr = `${run.distanceMain} ${run.distanceUnit}`;

          drawWeeklyText(ctx, renderer, weeklyData, `splitCardDist_${idx}`, distStr, pad + cardW * 0.58, ry + rowH / 2 + 4, {

            fallbackKey: 'distValue',

            label: `Card ${idx + 1} Distance`,

            font, size: 14, weight: '900', align: 'right', color: textCol

          });

        }



        if (metrics.showSessionPace !== false) {

          const paceDiff = (run.avgPace || 0) - stats.avgPaceSec;

          const diffSign = paceDiff <= 0 ? '⚡ -' : '+';

          const diffStr = `${diffSign}${Math.abs(Math.round(paceDiff))}s/km`;

          drawWeeklyText(ctx, renderer, weeklyData, `splitCardPace_${idx}`, `${run.avgPaceFormatted} (${diffStr})`, pad + cardW - 16, ry + rowH / 2 + 4, {

            fallbackKey: 'paceValue',

            label: `Card ${idx + 1} Pace Diff`,

            font, size: 13, weight: 'bold', align: 'right', color: paceDiff <= 0 ? '#10b981' : '#f59e0b'

          });

        }

      });

    }

  }

}



/**

 * TEMPLATE 10: CALENDAR TRAINING HEATMAP (7-Day Matrix & Volume Staircase)

 */

function renderWeeklyCalendarHeatLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const cardW = w - pad * 2;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.045;



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', `TRAINING DENSITY MATRIX  •  ${stats.count} ACTIVE DAYS`, pad, curY + 12, {

      font, size: 11, weight: 'bold', align: 'left', color: accent

    });

    curY += 28;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font, size: Math.round(w * 0.065), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.065) + 10;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, pad, curY + 12, {

      font, size: 14, weight: '500', align: 'left', color: textMuted

    });

    curY += 28;

  }



  // 7-Day Heatmap Grid

  if (metrics.showDailyBars !== false) {

    const days = stats.dayDistribution || [];

    const heatCols = 7;

    const colGap = 6;

    const colW = (cardW - (heatCols - 1) * colGap) / heatCols;

    const heatCardH = h * 0.16;

    const actualMax = Math.max(0.1, ...days.map((d) => d.distanceRaw || 0));



    days.forEach((d, idx) => {

      const hx = pad + idx * (colW + colGap);

      const hy = curY;

      const hasRun = d.distanceRaw > 0;

      const ratio = actualMax > 0 ? Math.min(1.0, (d.distanceRaw || 0) / actualMax) : 0;



      renderer.drawRoundedRect(ctx, hx, hy, colW, heatCardH, 10);

      if (hasRun) {

        const alpha = 0.18 + ratio * 0.45;

        ctx.fillStyle = `rgba(204, 255, 0, ${alpha})`;

        ctx.fill();

        ctx.strokeStyle = accent;

        ctx.lineWidth = 1.5;

        ctx.stroke();

      } else {

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';

        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';

        ctx.lineWidth = 1;

        ctx.stroke();

      }



      drawWeeklyText(ctx, renderer, weeklyData, `calendarDayLabel_${d.day}`, d.day, hx + colW / 2, hy + 20, {

        fallbackKey: 'dailyDayLabels',

        label: `${d.day} Calendar Label`,

        font, size: 11, weight: 'bold', align: 'center', color: hasRun ? '#ffffff' : textMuted

      });



      if (hasRun) {

        drawWeeklyText(ctx, renderer, weeklyData, `calendarDayValue_${d.day}`, d.distanceMain, hx + colW / 2, hy + heatCardH / 2 + 6, {

          fallbackKey: 'dailyDayValues',

          label: `${d.day} Calendar Value`,

          font, size: 13, weight: '900', align: 'center', color: '#ffffff'

        });

        drawWeeklyText(ctx, renderer, weeklyData, `calendarDayUnit_${d.day}`, stats.unit, hx + colW / 2, hy + heatCardH - 12, {

          fallbackKey: 'distUnit',

          label: `${d.day} Unit`,

          font, size: 9, weight: 'bold', align: 'center', color: accent

        });

      } else {

        drawWeeklyText(ctx, renderer, weeklyData, `calendarDayRest_${d.day}`, 'REST', hx + colW / 2, hy + heatCardH / 2 + 4, {

          fallbackKey: 'runCardTitle',

          label: `${d.day} Rest Pill`,

          font, size: 10, weight: 'bold', align: 'center', color: textMuted

        });

      }

    });

    curY += heatCardH + 18;

  }



  // Cumulative Staircase Progression

  if (metrics.showDistance !== false) {

    const stairH = h * 0.22;

    const hBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, stairH, config, theme, 'heatCard', weeklyData, 'Calendar Heatmap Card');

    const heatX = hBounds.x;

    const heatY = hBounds.y;



    drawWeeklyText(ctx, renderer, weeklyData, 'distLabel', 'CUMULATIVE MILEAGE PROGRESSION', pad + 18, curY + 20, {

      font, size: 11, weight: 'bold', align: 'left', color: textMuted

    });



    const cum = stats.cumulativeProgression || [];

    if (cum.length > 0) {

      const sX = pad + 24;

      const sY = curY + 40;

      const sW = cardW - 48;

      const sH = stairH - 64;

      const maxCum = Math.max(stats.distVal, stats.goalDist || 0, 10);



      ctx.save();

      ctx.beginPath();

      ctx.moveTo(sX, sY + sH);

      cum.forEach((pt, i) => {

        const px = sX + (i / (cum.length - 1)) * sW;

        const py = sY + sH - (pt.cumulative / maxCum) * sH;

        ctx.lineTo(px, py);

      });

      ctx.lineTo(sX + sW, sY + sH);

      ctx.closePath();

      const grad = ctx.createLinearGradient(0, sY, 0, sY + sH);

      grad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');

      grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      ctx.fillStyle = grad;

      ctx.fill();



      ctx.beginPath();

      cum.forEach((pt, i) => {

        const px = sX + (i / (cum.length - 1)) * sW;

        const py = sY + sH - (pt.cumulative / maxCum) * sH;

        if (i === 0) ctx.moveTo(px, py);

        else ctx.lineTo(px, py);

      });

      ctx.strokeStyle = '#00f0ff';

      ctx.lineWidth = 2.5;

      ctx.stroke();

      ctx.restore();



      drawWeeklyText(ctx, renderer, weeklyData, 'distValue', `${stats.distFormatted} ${stats.unit}`, sX + sW, sY + 12, {

        font, size: 14, weight: '900', align: 'right', color: '#00f0ff'

      });

    }

    curY += stairH + 16;

  }



  // Summary Metrics Banner

  const items = [];

  if (metrics.showTime !== false) items.push({ k: 'time', l: 'DURATION', v: stats.durationFormatted });

  if (metrics.showPace !== false) items.push({ k: 'pace', l: 'AVG PACE', v: `${stats.avgPaceFormatted}` });

  if (metrics.showHr !== false && stats.avgHr > 0) items.push({ k: 'hr', l: 'AVG HR', v: `${stats.avgHr} BPM` });

  if (metrics.showElevation !== false && stats.totalEleGain > 0) items.push({ k: 'elev', l: 'CLIMB', v: `+${stats.totalEleGain}m` });

  if (metrics.showCalories !== false && stats.totalCalories > 0) items.push({ k: 'cal', l: 'CALORIES', v: `${stats.totalCalories} kcal` });

  if (metrics.showRunCount !== false && stats.count > 0) items.push({ k: 'count', l: 'SESSIONS', v: `${stats.count}` });



  if (items.length > 0) {

    const sumH = 64;

    const sumBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, sumH, config, theme, 'summaryCard', weeklyData, 'Summary Chips Card');

    const sumX = sumBounds.x;

    const sumY = sumBounds.y;

    const iW = cardW / items.length;

    items.forEach((it, i) => {

      const ix = pad + i * iW + iW / 2;

      drawWeeklyText(ctx, renderer, weeklyData, it.k + 'Label', it.l, ix, curY + 20, {

        font, size: 10, weight: 'bold', align: 'center', color: textMuted

      });

      drawWeeklyText(ctx, renderer, weeklyData, it.k + 'Value', it.v, ix, curY + 44, {

        font, size: 14, weight: '900', align: 'center', color: textCol

      });

    });

    curY += sumH + 16;

  }



  // Compact sessions list if enabled

  if (metrics.showRunList !== false && stats.activeRuns.length > 0) {

    const listRuns = stats.activeRuns.slice(0, 3);

    const rH = 32;

    listRuns.forEach((r, idx) => {

      const ry = curY + idx * (rH + 6);

      if (ry + rH > h - h * 0.03) return;

      renderer.drawRoundedRect(ctx, pad, ry, cardW, rH, 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';

      ctx.fill();



      const rDate = r.date instanceof Date ? r.date : new Date(r.date || Date.now());

      const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

      drawWeeklyText(ctx, renderer, weeklyData, `calRunDate_${idx}`, dayStr, pad + 12, ry + rH / 2 + 4, {

        fallbackKey: 'runCardDate',

        label: `Run ${idx + 1} Day`,

        font, size: 10, weight: 'bold', align: 'left', color: accent

      });



      drawWeeklyText(ctx, renderer, weeklyData, `calRunTitle_${idx}`, r.customName || r.title || `Workout ${idx + 1}`, pad + 52, ry + rH / 2 + 4, {

        fallbackKey: 'runCardTitle',

        label: `Run ${idx + 1} Title`,

        font, size: 11, weight: 'bold', align: 'left', color: textCol

      });



      const sessParts = formatWeeklySessionStats(r, stats, metrics);

      if (sessParts.length > 0) {

        drawWeeklyText(ctx, renderer, weeklyData, `calRunStats_${idx}`, sessParts.join('  •  '), pad + cardW - 12, ry + rH / 2 + 4, {

          fallbackKey: 'runCardStats',

          label: `Run ${idx + 1} Stats`,

          font, size: 10, weight: '500', align: 'right', color: textMuted

        });

      }

    });

  }

}



/**

 * TEMPLATE 11: POLAR RADAR TELEMETRY (Athletic Spider Chart & Arcs)

 */

function renderWeeklyPolarRadarLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.06;

  const cardW = w - pad * 2;

  const font = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';

  const textMuted = 'rgba(255, 255, 255, 0.65)';



  let curY = h * 0.045;



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'ATHLETIC BALANCE SPIDER HUD', pad, curY + 12, {

      font, size: 11, weight: 'bold', align: 'left', color: accent

    });

    curY += 28;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RUN RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.05), {

      font, size: Math.round(w * 0.065), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.065) + 10;

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, pad, curY + 12, {

      font, size: 14, weight: '500', align: 'left', color: textMuted

    });

    curY += 28;

  }



  // Circular Spider Chart

  const radarH = h * 0.40;

  const radBounds = drawGlassCard(renderer, ctx, pad, curY, cardW, radarH, config, theme, 'radarCard', weeklyData, 'Performance Radar Card');

  const radarX = radBounds.x;

  const radarY = radBounds.y;



  const cx = pad + cardW / 2;

  const cy = curY + radarH / 2;

  const radius = Math.min(cardW * 0.36, radarH * 0.36);



  const radMetrics = stats.radarMetrics || {

    distance: 0.8, duration: 0.75, speed: 0.7, elevation: 0.6, effort: 0.8, frequency: 0.7

  };



  const rawAxes = [

    { key: 'dist', show: metrics.showDistance !== false, label: 'VOLUME', val: radMetrics.distance, txt: `${stats.distFormatted}${stats.unit}` },

    { key: 'time', show: metrics.showTime !== false, label: 'TIME', val: radMetrics.duration, txt: stats.durationFormatted },

    { key: 'pace', show: metrics.showPace !== false, label: 'SPEED', val: radMetrics.speed, txt: stats.avgPaceFormatted },

    { key: 'elev', show: metrics.showElevation !== false, label: 'ELEV', val: radMetrics.elevation, txt: `+${stats.totalEleGain}m` },

    { key: 'hr', show: metrics.showHr !== false, label: 'EFFORT', val: radMetrics.effort, txt: `${stats.avgHr}bpm` },

    { key: 'count', show: metrics.showRunCount !== false, label: 'FREQ', val: radMetrics.frequency, txt: `${stats.count} Runs` }

  ];



  const axes = rawAxes.filter(a => a.show);

  const displayAxes = axes.length >= 3 ? axes : rawAxes;



  // Concentric polygon rings

  const rings = [0.25, 0.5, 0.75, 1.0];

  ctx.save();

  rings.forEach((ring) => {

    ctx.strokeStyle = ring === 1.0 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)';

    ctx.lineWidth = 1;

    ctx.beginPath();

    displayAxes.forEach((_, i) => {

      const angle = (i * 2 * Math.PI) / displayAxes.length - Math.PI / 2;

      const rx = cx + Math.cos(angle) * radius * ring;

      const ry = cy + Math.sin(angle) * radius * ring;

      if (i === 0) ctx.moveTo(rx, ry);

      else ctx.lineTo(rx, ry);

    });

    ctx.closePath();

    ctx.stroke();

  });



  // Spokes & Labels

  displayAxes.forEach((ax, i) => {

    const angle = (i * 2 * Math.PI) / displayAxes.length - Math.PI / 2;

    const rx = cx + Math.cos(angle) * radius;

    const ry = cy + Math.sin(angle) * radius;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

    ctx.beginPath();

    ctx.moveTo(cx, cy);

    ctx.lineTo(rx, ry);

    ctx.stroke();



    const lx = cx + Math.cos(angle) * (radius + 24);

    const ly = cy + Math.sin(angle) * (radius + 24);

    drawWeeklyText(ctx, renderer, weeklyData, `radarAxisTitle_${i}`, ax.label, lx, ly - 4, {

      fallbackKey: 'runCardTitle',

      label: `Radar Axis ${i + 1} Title`,

      font, size: 10, weight: 'bold', align: 'center', color: accent

    });



    drawWeeklyText(ctx, renderer, weeklyData, `radarAxisVal_${i}`, ax.txt, lx, ly + 10, {

      fallbackKey: 'distValue',

      label: `Radar Axis ${i + 1} Value`,

      font, size: 9, weight: '600', align: 'center', color: textCol

    });

  });



  // Filled Radar Polygon

  ctx.beginPath();

  displayAxes.forEach((ax, i) => {

    const angle = (i * 2 * Math.PI) / displayAxes.length - Math.PI / 2;

    const rVal = Math.max(0.15, Math.min(1.0, ax.val));

    const px = cx + Math.cos(angle) * radius * rVal;

    const py = cy + Math.sin(angle) * radius * rVal;

    if (i === 0) ctx.moveTo(px, py);

    else ctx.lineTo(px, py);

  });

  ctx.closePath();

  ctx.fillStyle = 'rgba(204, 255, 0, 0.28)';

  ctx.fill();

  ctx.strokeStyle = accent;

  ctx.lineWidth = 2.5;

  ctx.stroke();

  ctx.restore();



  curY += radarH + 16;



  // Bottom Session Chips List

  if (metrics.showRunList !== false) {

    const remainingH = h - curY - h * 0.04;

    const chipRuns = (stats.activeRuns || []).slice(0, 4);

    if (chipRuns.length > 0) {

      const chipH = Math.min(58, (remainingH - (chipRuns.length - 1) * 8) / (chipRuns.length || 1));



      chipRuns.forEach((run, i) => {

        const cyy = curY + i * (chipH + 8);

        const elemKey = `runCard_${i}`;

        const rcBounds = drawGlassCard(renderer, ctx, pad, cyy, cardW, chipH, config, theme, elemKey, weeklyData, `Run Card ${i + 1}`);

        const rcX = rcBounds.x;

        const rcY = rcBounds.y;



        const rDate = run.date instanceof Date ? run.date : new Date(run.date || Date.now());

        const dayStr = rDate.toLocaleDateString('en-US', { weekday: 'short' });



        drawWeeklyText(ctx, renderer, weeklyData, `radarChipDate_${i}`, dayStr, pad + 16, cyy + chipH / 2 + 5, {

          fallbackKey: 'runCardDate',

          label: `Chip ${i + 1} Date`,

          font, size: 13, weight: 'bold', align: 'left', color: accent

        });



        drawWeeklyText(ctx, renderer, weeklyData, `radarChipTitle_${i}`, run.customName || run.title || `Workout ${i + 1}`, pad + 65, cyy + chipH / 2 + 5, {

          fallbackKey: 'runCardTitle',

          label: `Chip ${i + 1} Title`,

          font, size: 12, weight: 'bold', align: 'left', color: textCol

        });



        const chipStats = formatWeeklySessionStats(run, stats, metrics).join('   •   ');

        if (chipStats) {

          drawWeeklyText(ctx, renderer, weeklyData, `radarChipStats_${i}`, chipStats, pad + cardW - 16, cyy + chipH / 2 + 5, {

            fallbackKey: 'runCardStats',

            label: `Run ${i + 1} Stats`,

            font, size: 10, weight: '500', align: 'right', color: textMuted

          });

        }

      });

    }

  }

}



/**

 * TEMPLATE 12: SWISS BRUTALIST MONOLITH (Monumental Tabular Typography & Division)

 */

function renderWeeklyMonolithStatLayout(renderer, ctx, w, h, weeklyData, stats, metrics, config, theme, accent) {

  const pad = w * 0.07;

  const monoFont = renderer.getFontFamily(config.fontFamily);

  const textCol = '#ffffff';



  let curY = h * 0.05;



  if (metrics.showTag !== false || metrics.showTitle !== false || metrics.showSubtitle !== false) {

    ctx.fillStyle = textCol;

    ctx.fillRect(pad, curY, w - pad * 2, 4);

    curY += 24;

  }



  if (metrics.showTag !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTag', 'ATHLETIC MONOLITH // VERIFIED TRAINING LOG', pad, curY, {

      font: monoFont, size: 11, weight: '900', align: 'left', color: textCol

    });

  }



  if (metrics.showSubtitle !== false) {

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklySubtitle', weeklyData.subtitle || stats.dateRangeStr, w - pad, curY, {

      font: monoFont, size: 11, weight: '900', align: 'right', color: accent

    });

  }



  if (metrics.showTag !== false || metrics.showSubtitle !== false) {

    curY += 28;

  }



  if (metrics.showTitle !== false) {

    const mainTitle = (weeklyData.title || 'WEEKLY RECAP').toUpperCase();

    drawWeeklyText(ctx, renderer, weeklyData, 'weeklyTitle', mainTitle, pad, curY + Math.round(w * 0.08), {

      font: monoFont, size: Math.round(w * 0.095), weight: '900', align: 'left', color: textCol

    });

    curY += Math.round(w * 0.095) + 20;

  }



  if (metrics.showDistance !== false) {

    const distStr = stats.distFormatted;

    drawWeeklyText(ctx, renderer, weeklyData, 'distValue', distStr, pad, curY + Math.round(w * 0.22), {

      font: monoFont, size: Math.round(w * 0.25), weight: '900', align: 'left', color: textCol

    });



    ctx.font = `900 ${Math.round(w * 0.25)}px ${monoFont}`;

    const dW = ctx.measureText(distStr).width;

    drawWeeklyText(ctx, renderer, weeklyData, 'distUnit', stats.unit.toUpperCase(), pad + dW + 12, curY + Math.round(w * 0.22) - 20, {

      font: monoFont, size: 40, weight: '900', align: 'left', color: accent

    });

    curY += Math.round(w * 0.25) + 20;

  }



  // Telemetry row for other metrics

  const monoStats = [];

  if (metrics.showTime !== false) monoStats.push(`TIME: ${stats.durationFormatted}`);

  if (metrics.showPace !== false) monoStats.push(`PACE: ${stats.avgPaceFormatted}`);

  if (metrics.showHr !== false && stats.avgHr > 0) monoStats.push(`HR: ${stats.avgHr} BPM`);

  if (metrics.showElevation !== false && stats.totalEleGain > 0) monoStats.push(`ELEV: +${stats.totalEleGain}M`);

  if (metrics.showCalories !== false && stats.totalCalories > 0) monoStats.push(`CAL: ${stats.totalCalories}`);

  if (metrics.showRunCount !== false && stats.count > 0) monoStats.push(`RUNS: ${stats.count}`);



  if (monoStats.length > 0) {

    drawWeeklyText(ctx, renderer, weeklyData, 'monoStatsLine', monoStats.join('   /   '), pad, curY + 6, {

      font: monoFont, size: 11, weight: '800', align: 'left', color: 'rgba(255, 255, 255, 0.7)'

    });

    curY += 26;

  }



  ctx.fillStyle = accent;

  ctx.fillRect(pad, curY, w - pad * 2, 4);

  curY += 26;



  // Tabular Workout Ledger

  if (metrics.showRunList !== false) {

    const ledgerRuns = (stats.activeRuns || []).slice(0, 6);

    ledgerRuns.forEach((r, idx) => {

      const rDate = r.date instanceof Date ? r.date : new Date(r.date || Date.now());

      const isoDate = rDate.toISOString().slice(0, 10);



      drawWeeklyText(ctx, renderer, weeklyData, `monoDate_${idx}`, isoDate, pad, curY + 16, {

        fallbackKey: 'runCardDate',

        label: `Ledger ${idx + 1} Date`,

        font: monoFont, size: 13, weight: 'bold', align: 'left', color: accent

      });



      drawWeeklyText(ctx, renderer, weeklyData, `monoTitle_${idx}`, (r.customName || r.title || `RUN_${idx+1}`).toUpperCase(), pad + 130, curY + 16, {

        fallbackKey: 'runCardTitle',

        label: `Ledger ${idx + 1} Title`,

        font: monoFont, size: 13, weight: '900', align: 'left', color: textCol

      });



      if (metrics.showSessionDist !== false) {

        drawWeeklyText(ctx, renderer, weeklyData, `monoDist_${idx}`, `${r.distanceMain} ${r.distanceUnit}`, w - pad, curY + 16, {

          fallbackKey: 'distValue',

          label: `Ledger ${idx + 1} Distance`,

          font: monoFont, size: 14, weight: '900', align: 'right', color: textCol

        });

      }



      const sessParts = formatWeeklySessionStats(r, stats, metrics).filter(p => !p.includes(stats.unit));

      if (sessParts.length > 0) {

        drawWeeklyText(ctx, renderer, weeklyData, `monoStats_${idx}`, sessParts.join('  /  '), pad + 130, curY + 30, {

          fallbackKey: 'runCardStats',

          label: `Ledger ${idx + 1} Stats`,

          font: monoFont, size: 10, weight: '700', align: 'left', color: 'rgba(255, 255, 255, 0.5)'

        });

      }



      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';

      ctx.fillRect(pad, curY + 38, w - pad * 2, 1);

      curY += 46;

    });

  }

}



function getWeeklyCardStyle(weeklyData, elementKey) {

  if (!weeklyData || !weeklyData.cardStyles) return {};

  const globalStyle = weeklyData.cardStyles['allCards'] || {};

  const specificStyle = (elementKey && weeklyData.cardStyles[elementKey]) || {};

  return { ...globalStyle, ...specificStyle };

}



function drawGlassCard(renderer, ctx, x, y, width, height, config, theme, elementKey, weeklyData, cardLabel) {

  const cardStyle = getWeeklyCardStyle(weeklyData, elementKey);

  const offsetX = typeof cardStyle.offsetX === 'number' ? cardStyle.offsetX : 0;

  const offsetY = typeof cardStyle.offsetY === 'number' ? cardStyle.offsetY : 0;

  const drawX = x + offsetX;

  const drawY = y + offsetY;

  const widthDelta = typeof cardStyle.widthDelta === 'number' ? cardStyle.widthDelta : 0;

  const heightDelta = typeof cardStyle.heightDelta === 'number' ? cardStyle.heightDelta : 0;

  const drawW = Math.max(60, typeof cardStyle.width === 'number' ? cardStyle.width : (width + widthDelta));

  const drawH = Math.max(40, typeof cardStyle.height === 'number' ? cardStyle.height : (height + heightDelta));

  const radius = typeof cardStyle.radius === 'number' ? cardStyle.radius : (config.cardRadius || 14);



  const style = config.cardStyle || 'glass';

  let defaultBorderW = style === 'outline' ? 1.5 : 1;

  let defaultBorderCol = style === 'outline' ? 'rgba(255, 255, 255, 0.25)' : (style === 'solid' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.12)');



  const showBorder = cardStyle.showBorder !== false;

  const borderWidth = typeof cardStyle.borderWidth === 'number' ? cardStyle.borderWidth : defaultBorderW;

  const borderColor = cardStyle.borderColor || defaultBorderCol;

  const showBg = cardStyle.showBg !== false;



  ctx.save();

  renderer.drawRoundedRect(ctx, drawX, drawY, drawW, drawH, radius);



  if (showBg) {

    if (cardStyle.fillColor) {

      ctx.save();

      ctx.fillStyle = cardStyle.fillColor;

      if (typeof cardStyle.bgOpacity === 'number') {

        ctx.globalAlpha *= cardStyle.bgOpacity;

      }

      ctx.fill();

      ctx.restore();

    } else {

      if (style === 'solid') {

        ctx.fillStyle = 'rgba(15, 17, 23, 0.94)';

        ctx.fill();

      } else if (style === 'outline') {

        // Outline mode has no fill by default

      } else if (style === 'minimal') {

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';

        ctx.fill();

      } else {

        // Glass default

        ctx.fillStyle = 'rgba(15, 17, 26, 0.72)';

        ctx.fill();

      }

    }

  }



  if (showBorder && borderWidth > 0) {

    renderer.drawRoundedRect(ctx, drawX, drawY, drawW, drawH, radius);

    ctx.strokeStyle = borderColor;

    ctx.lineWidth = borderWidth;

    ctx.stroke();

  }



  ctx.restore();



  // Record bounding box for hit-testing, selection gizmo, and interactive resizing

  if (elementKey && renderer) {

    renderer.weeklyCardBounds = renderer.weeklyCardBounds || {};

    renderer.weeklyCardBounds[elementKey] = {

      key: elementKey,

      label: cardLabel || elementKey,

      x: drawX,

      y: drawY,

      w: drawW,

      h: drawH,

      baseW: width,

      baseH: height,

      widthDelta,

      heightDelta,

      offsetX,

      offsetY,

      borderWidth,

      borderColor,

      radius

    };

  }



  return {

    x: drawX,

    y: drawY,

    w: drawW,

    h: drawH,

    baseW: width,

    baseH: height,

    widthDelta,

    heightDelta,

    offsetX,

    offsetY,

    borderWidth,

    borderColor

  };

}



/**

 * Helper: Draws a cyber-styled card with angled corner clips.

 */

function drawCyberCard(ctx, x, y, w, h, defaultBorderColor, elementKey, weeklyData, cardLabel, renderer) {

  const cardStyle = getWeeklyCardStyle(weeklyData, elementKey);

  const offsetX = typeof cardStyle.offsetX === 'number' ? cardStyle.offsetX : 0;

  const offsetY = typeof cardStyle.offsetY === 'number' ? cardStyle.offsetY : 0;

  const drawX = x + offsetX;

  const drawY = y + offsetY;

  const widthDelta = typeof cardStyle.widthDelta === 'number' ? cardStyle.widthDelta : 0;

  const heightDelta = typeof cardStyle.heightDelta === 'number' ? cardStyle.heightDelta : 0;

  const drawW = Math.max(60, typeof cardStyle.width === 'number' ? cardStyle.width : (w + widthDelta));

  const drawH = Math.max(40, typeof cardStyle.height === 'number' ? cardStyle.height : (h + heightDelta));



  const showBorder = cardStyle.showBorder !== false;

  const borderWidth = typeof cardStyle.borderWidth === 'number' ? cardStyle.borderWidth : 1.2;

  const borderColor = cardStyle.borderColor || defaultBorderColor || 'rgba(0, 240, 255, 0.45)';

  const showBg = cardStyle.showBg !== false;



  ctx.save();

  const clip = typeof cardStyle.radius === 'number' ? Math.min(24, Math.max(4, cardStyle.radius)) : 10;

  ctx.beginPath();

  ctx.moveTo(drawX + clip, drawY);

  ctx.lineTo(drawX + drawW, drawY);

  ctx.lineTo(drawX + drawW, drawY + drawH - clip);

  ctx.lineTo(drawX + drawW - clip, drawY + drawH);

  ctx.lineTo(drawX, drawY + drawH);

  ctx.lineTo(drawX, drawY + clip);

  ctx.closePath();



  if (showBg) {

    if (cardStyle.fillColor) {

      ctx.fillStyle = cardStyle.fillColor;

    } else {

      ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';

    }

    if (typeof cardStyle.bgOpacity === 'number') {

      ctx.globalAlpha *= cardStyle.bgOpacity;

    }

    ctx.fill();

  }



  if (showBorder && borderWidth > 0) {

    ctx.strokeStyle = borderColor;

    ctx.lineWidth = borderWidth;

    ctx.stroke();

  }



  ctx.restore();



  if (elementKey && renderer) {

    renderer.weeklyCardBounds = renderer.weeklyCardBounds || {};

    renderer.weeklyCardBounds[elementKey] = {

      key: elementKey,

      label: cardLabel || elementKey,

      x: drawX,

      y: drawY,

      w: drawW,

      h: drawH,

      baseW: w,

      baseH: h,

      widthDelta,

      heightDelta,

      offsetX,

      offsetY,

      borderWidth,

      borderColor

    };

  }



  return {

    x: drawX,

    y: drawY,

    w: drawW,

    h: drawH,

    baseW: w,

    baseH: h,

    widthDelta,

    heightDelta,

    offsetX,

    offsetY,

    borderWidth,

    borderColor

  };

}



/**



 * Helper: Renders an individual run's GPS track silhouette inside a box.



 */



function drawMiniRouteSilhouette(ctx, x, y, width, height, trackpoints, bounds, color, lineWidth = 2.5) {



  if (!trackpoints || trackpoints.length < 2) return;



  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;



  if (bounds && bounds.minLat !== 90) {



    minLat = bounds.minLat;



    maxLat = bounds.maxLat;



    minLon = bounds.minLon;



    maxLon = bounds.maxLon;



  } else {



    trackpoints.forEach((p) => {



      if (p.lat < minLat) minLat = p.lat;



      if (p.lat > maxLat) maxLat = p.lat;



      if (p.lon < minLon) minLon = p.lon;



      if (p.lon > maxLon) maxLon = p.lon;



    });



  }



  const dLat = maxLat - minLat || 0.0001;



  const dLon = maxLon - minLon || 0.0001;



  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);



  const lonScale = Math.cos(midLatRad);



  const geoW = dLon * lonScale;



  const geoH = dLat;



  const pad = 6;



  const usableW = width - pad * 2;



  const usableH = height - pad * 2;



  const scale = Math.min(usableW / geoW, usableH / geoH);



  const offsetX = x + pad + (usableW - geoW * scale) / 2;



  const offsetY = y + pad + (usableH - geoH * scale) / 2;



  const project = (lat, lon) => [



    offsetX + (lon - minLon) * lonScale * scale,



    offsetY + (maxLat - lat) * scale



  ];



  ctx.save();



  ctx.beginPath();



  trackpoints.forEach((p, idx) => {



    const [px, py] = project(p.lat, p.lon);



    if (idx === 0) ctx.moveTo(px, py);



    else ctx.lineTo(px, py);



  });



  ctx.strokeStyle = color;



  ctx.lineWidth = lineWidth;



  ctx.lineCap = 'round';



  ctx.lineJoin = 'round';



  ctx.shadowColor = color;



  ctx.shadowBlur = 8;



  ctx.stroke();



  // Start dot (Green)



  const [sX, sY] = project(trackpoints[0].lat, trackpoints[0].lon);



  ctx.fillStyle = '#10b981';



  ctx.beginPath();



  ctx.arc(sX, sY, 3, 0, Math.PI * 2);



  ctx.fill();



  // End dot (Red)



  const [eX, eY] = project(trackpoints[trackpoints.length - 1].lat, trackpoints[trackpoints.length - 1].lon);



  ctx.fillStyle = '#ef4444';



  ctx.beginPath();



  ctx.arc(eX, eY, 3, 0, Math.PI * 2);



  ctx.fill();



  ctx.restore();



}



/**



 * Helper: Renders all active runs' GPS routes together on a single shared map.



 */



function drawUnifiedMultiRouteMap(ctx, x, y, width, height, runs, defaultAccent) {



  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;



  runs.forEach((r) => {



    if (r.bounds && r.bounds.minLat !== 90) {



      if (r.bounds.minLat < minLat) minLat = r.bounds.minLat;



      if (r.bounds.maxLat > maxLat) maxLat = r.bounds.maxLat;



      if (r.bounds.minLon < minLon) minLon = r.bounds.minLon;



      if (r.bounds.maxLon > maxLon) maxLon = r.bounds.maxLon;



    }



  });



  if (minLat === 90) return;



  const dLat = maxLat - minLat || 0.0001;



  const dLon = maxLon - minLon || 0.0001;



  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);



  const lonScale = Math.cos(midLatRad);



  const geoW = dLon * lonScale;



  const geoH = dLat;



  const pad = 16;



  const usableW = width - pad * 2;



  const usableH = height - pad * 2;



  const scale = Math.min(usableW / geoW, usableH / geoH);



  const offsetX = x + pad + (usableW - geoW * scale) / 2;



  const offsetY = y + pad + (usableH - geoH * scale) / 2;



  const project = (lat, lon) => [



    offsetX + (lon - minLon) * lonScale * scale,



    offsetY + (maxLat - lat) * scale



  ];



  const colors = ['#00f0ff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];



  ctx.save();



  // Draw subtle radar concentric rings in background



  const cx = x + width / 2;



  const cy = y + height / 2;



  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';



  ctx.lineWidth = 1;



  [40, 80, 130, 190].forEach((r) => {



    ctx.beginPath();



    ctx.arc(cx, cy, r, 0, Math.PI * 2);



    ctx.stroke();



  });



  // Draw each route



  runs.forEach((run, rIdx) => {



    if (!run.trackpoints || run.trackpoints.length < 2) return;



    const col = colors[rIdx % colors.length];



    ctx.beginPath();



    run.trackpoints.forEach((p, idx) => {



      const [px, py] = project(p.lat, p.lon);



      if (idx === 0) ctx.moveTo(px, py);



      else ctx.lineTo(px, py);



    });



    ctx.strokeStyle = col;



    ctx.lineWidth = 3;



    ctx.lineCap = 'round';



    ctx.lineJoin = 'round';



    ctx.shadowColor = col;



    ctx.shadowBlur = 10;



    ctx.stroke();



    // Start / End pips



    const [sX, sY] = project(run.trackpoints[0].lat, run.trackpoints[0].lon);



    ctx.fillStyle = '#ffffff';



    ctx.beginPath();



    ctx.arc(sX, sY, 3.5, 0, Math.PI * 2);



    ctx.fill();



  });



  ctx.restore();



}



