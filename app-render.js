// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ELEVATION PROFILE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 海拔剖面范围：'full' = 全程预设轨迹；'region' = 仅当前所在段。
let ELEV_SCOPE = 'full';
function setElevScope(s) {
  ELEV_SCOPE = (s === 'region') ? 'region' : 'full';
  updateElevScopeUI();
  drawElevationProfile();
}
function updateElevScopeUI() {
  const btns = document.querySelectorAll('#elevScope button');
  btns.forEach(b => b.classList.toggle('on', b.dataset.scope === ELEV_SCOPE));
  const nm = document.getElementById('elevScopeName');
  if (nm) nm.textContent = (ELEV_SCOPE === 'region') ? t('elev.scopeRegion') : t('elev.scopePreset');
}
function drawElevationProfile() {
  const container = document.getElementById('elevationBody');
  if (!container || !APP.presetTrack) return;

  let points = APP.presetTrack.trackPoints;
  if (points.length < 2) return;

  // ── 当前区域模式：只取当前所在段的轨迹切片（与地图段一致，startIndex/endIndex 已对齐 trackPoints）──
  let scopeRegion = null, scopeNote = '';
  if (ELEV_SCOPE === 'region' && APP.sectionRanges && APP.sectionRanges.length) {
    scopeRegion = getCurrentSectionRange() || APP.sectionRanges[0];
    const si = scopeRegion.startIndex || 0;
    const ei = (scopeRegion.endIndex != null ? scopeRegion.endIndex : points.length - 1);
    const sliced = points.slice(si, ei + 1);
    if (sliced.length >= 2) {
      points = sliced;
      scopeNote = scopeRegion.regionZh || '';
      if (!getEffectivePosition()) scopeNote += (scopeNote ? ' · ' : '') + '未出发';
    } else {
      scopeRegion = null;   // 切片过小，退回全程
    }
  }

  const w = container.clientWidth || 800;
  const h = container.clientHeight || 80;
  const pad = { top: 40, right: 10, bottom: 18, left: 40 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;

  // Find elevation range
  let minE = Infinity, maxE = -Infinity;
  points.forEach(p => {
    if (p.elev != null) {
      if (p.elev < minE) minE = p.elev;
      if (p.elev > maxE) maxE = p.elev;
    }
  });
  if (minE === Infinity) { container.innerHTML = ''; return; }
  const range = maxE - minE || 1;
  const trueMin = minE, trueMax = maxE;   // 真实海拔上下限（minE 稍后被向下取整用于绘图网格）
  // 累计爬升：沿轨迹累加所有「上升段」的正高差
  let climb = 0, prevE = null;
  for (let i = 0; i < points.length; i++) {
    const e = points[i].elev;
    if (e == null) continue;
    if (prevE != null && e > prevE) climb += (e - prevE);
    prevE = e;
  }
  minE = Math.floor(minE / 500) * 500;

  // Build elevation path
  let pathD = '';
  const step = Math.max(1, Math.floor(points.length / pw));
  let first = true;
  for (let i = 0; i < points.length; i += step) {
    const x = pad.left + (i / (points.length - 1)) * pw;
    const y = pad.top + ph - ((Math.max(minE, (points[i].elev || minE)) - minE) / range) * ph;
    pathD += (first ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    first = false;
  }

  // Build section labels (中文路段名，替换原 1-13 段号)
  let sectionLabels = '';
  if (ELEV_SCOPE === 'region' && scopeRegion) {
    // 区域模式：只标当前段名（居中）
    const color = scopeRegion.regionColor || '#888';
    sectionLabels = `<text x="${(pad.left + pw / 2).toFixed(1)}" y="${h - 2}" text-anchor="middle" font-size="9" fill="${color}" opacity="0.95">${currentLang === 'en' ? (scopeRegion.regionEn || scopeRegion.regionZh) : (scopeRegion.regionZh || t('elev.scopeRegion'))}</text>`;
  } else if (APP.sectionRanges && APP.sectionRanges.length > 0) {
    APP.sectionRanges.forEach((range, idx) => {
      const midIdx = Math.floor((range.startIndex + range.endIndex) / 2);
      const frac = midIdx / (points.length - 1);
      const x = pad.left + frac * pw;
      const color = range.regionColor || sectionColors[idx] || '#888';
      sectionLabels += `<text x="${x.toFixed(1)}" y="${h - 2}" text-anchor="middle" font-size="8" fill="${color}" opacity="0.85">${currentLang === 'en' ? (range.regionEn || range.regionZh || (idx+1)) : (range.regionZh || (idx+1))}</text>`;
    });
  }

  // Build section dividers — very faint dashed vertical lines between the 13 sections.
  // Drawn at each section's startIndex (skip the first, which sits at the left edge).
  // 区域模式下只有一段，不画分隔线。
  let sectionDividers = '';
  if (ELEV_SCOPE !== 'region' && APP.sectionRanges && APP.sectionRanges.length > 1) {
    for (let i = 1; i < APP.sectionRanges.length; i++) {
      const bi = APP.sectionRanges[i].startIndex;
      if (bi == null || bi <= 0) continue;
      const x = pad.left + (bi / (points.length - 1)) * pw;
      sectionDividers += `<line x1="${x.toFixed(1)}" y1="${pad.top}" x2="${x.toFixed(1)}" y2="${pad.top + ph}" stroke="rgba(255,255,255,0.16)" stroke-width="0.7" stroke-dasharray="2,5"/>`;
    }
  }

  // Current position line (脉冲点 + 虚线 + 浮动「当前 Xm」标签)
  let posLine = '';
  if (APP.currentPosition && APP.presetTrack) {
    let closestI = -1, closestD = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = haversine(APP.currentPosition.lat, APP.currentPosition.lon, points[i].lat, points[i].lon);
      if (d < closestD) { closestD = d; closestI = i; }
    }
    if (closestI >= 0) {
      const cx = pad.left + (closestI / (points.length - 1)) * pw;
      const ce = APP.currentPosition.elev || 0;
      const cy = pad.top + ph - ((Math.max(minE, ce) - minE) / range) * ph;
      const lbl = t('elev.current') + ' ' + Math.round(ce).toLocaleString() + 'm';
      const lw = lbl.length * 6 + 16;
      const lx = Math.max(pad.left, Math.min(cx - lw / 2, pad.left + pw - lw));
      posLine = '<g class="elev-cur">' +
        '<line x1="' + cx.toFixed(1) + '" y1="' + pad.top + '" x2="' + cx.toFixed(1) + '" y2="' + (pad.top + ph) + '" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3,3" opacity="0.85"/>' +
        '<circle class="elev-pulse" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5" fill="var(--accent)"/>' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="#fff" stroke="var(--accent)" stroke-width="2"/>' +
        '<g transform="translate(' + lx.toFixed(1) + ',' + pad.top + ')">' +
          '<rect x="0" y="-17" width="' + lw.toFixed(0) + '" height="16" rx="8" fill="var(--accent)"/>' +
          '<text x="' + (lw / 2).toFixed(0) + '" y="-5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">' + lbl + '</text>' +
        '</g>' +
      '</g>';
    }
  }

  // Elevation grid lines
  let gridLines = '';
  const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const n = (raw || 1) / p; const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10; return m * p; };
  const gridStep = niceStep(range / 5) || 500;
  let e0 = Math.ceil(minE / gridStep) * gridStep;
  if (e0 < minE) e0 = minE;
  for (let e = e0; e <= maxE + 1; e += gridStep) {
    const gy = pad.top + ph - ((e - minE) / range) * ph;
    // 标签 y 夹紧在绘图区内，避免顶部/底部刻度数字被 SVG 顶边裁切（如 6000m 显示不全）
    const ly = Math.max(pad.top + 6, Math.min(gy + 3, h - pad.bottom - 1));
    gridLines += `<line x1="${pad.left}" y1="${gy.toFixed(1)}" x2="${pad.left+pw}" y2="${gy.toFixed(1)}" stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>`;
    gridLines += `<text x="${pad.left - 4}" y="${ly.toFixed(1)}" text-anchor="end" font-size="8" fill="var(--text-dim)">${e}</text>`;
  }

  // 头部统计：全程模式取预设轨迹的 authoritative stats，区域模式用切片自身 min/max/climb
  const st = (APP.presetTrack && APP.presetTrack.stats) || {};
  const useRegion = (ELEV_SCOPE === 'region' && scopeRegion);
  const dispMax = useRegion ? trueMax : (st.maxElev != null ? st.maxElev : trueMax);
  const dispMin = useRegion ? trueMin : (st.minElev != null ? st.minElev : trueMin);
  const dispClimb = useRegion ? climb : (st.elevGain != null ? st.elevGain : climb);
  const fmtM = v => Math.round(v).toLocaleString() + 'm';
  const statsEl = document.getElementById('elevStats');
  if (statsEl) statsEl.innerHTML =
    '<span class="ev-stat"><i>' + t('elev.highest') + '</i>' + fmtM(dispMax) + '</span>' +
    '<span class="ev-stat"><i>' + t('elev.lowest') + '</i>' + fmtM(dispMin) + '</span>' +
    '<span class="ev-stat"><i>' + t('elev.climbLabel') + '</i>' + fmtM(dispClimb) + '</span>';

  // 路段色标行（移出图表）：passed / current / upcoming 三态着色
  const ranges = APP.sectionRanges || [];
  const curR = getCurrentSectionRange();
  const curRi = ranges.indexOf(curR);
  let placebar = '';
  if (ELEV_SCOPE === 'region' && scopeRegion) {
    placebar = '<span class="pl-item current"><i class="pl-dot"></i>' + (currentLang === 'en' ? (scopeRegion.regionEn || scopeRegion.regionZh) : (scopeRegion.regionZh || t('elev.scopeRegion'))) + '</span>';
  } else if (ranges.length) {
    ranges.forEach((r, i) => {
      const cls = (curRi >= 0 && i < curRi) ? 'passed' : (i === curRi ? 'current' : 'upcoming');
      placebar += '<span class="pl-item ' + cls + '"><i class="pl-dot"></i>' + (currentLang === 'en' ? (r.regionEn || r.regionZh || (i + 1)) : (r.regionZh || (i + 1))) + '</span>';
    });
  }
  const pbEl = document.getElementById('elevPlacebar');
  if (pbEl) pbEl.innerHTML = placebar;

  container.innerHTML = '<div class="elev-chart"><svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%" preserveAspectRatio="none">' +
    '<rect width="' + w + '" height="' + h + '" fill="transparent"/>' +
    gridLines +
    sectionDividers +
    '<path d="' + pathD + '" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.6"/>' +
    '<path d="' + pathD + '" fill="url(#elevGrad)" stroke="none" opacity="0.15"/>' +
    posLine +
    '<defs><linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' +
    '</svg></div>';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UPDATE CURRENT POSITION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── 13-region dataset (sections-data.js → window.GHT_SECTIONS) ──
  const SECTION_TO_REGION13 = {
    'kanchenjunga': 'kanchenjunga',
    'makalu-barun': 'makalu',
    'everest-khumbu': 'everest',
    'rolwaling': 'rolwaling',
    'langtang-gosaikunda': 'langtang',
    'manaslu-tsum': 'manaslu',
    'annapurna': 'annapurna',
    'dhaulagiri-dolpo east': 'dolpo',
    'dolpo-humla west': 'dolpo',
    'humla-simikot': 'humla'
  };
  function currentRegion13() {
    if (!window.GHT_SECTIONS || !window.GHT_SECTIONS.length) return null;
    const r = getCurrentSectionRange();
    if (!r) return null;
    const cands = [r.regionEn, r.regionZh].filter(Boolean);
    for (const c of cands) {
      const key = c.toLowerCase().replace(/\s+/g, '-');
      if (SECTION_TO_REGION13[key]) return window.GHT_SECTIONS.find(reg => reg.id === SECTION_TO_REGION13[key]) || null;
    }
    const hay = cands.join(' ').toLowerCase();
    return window.GHT_SECTIONS.find(reg => hay.includes(reg.id.toLowerCase())) || null;
  }

  function updateCurrentPosition() {
  // Try to find current section from sectionRanges (national park based)
  let sectionName = '', sectionNameEn = '';

  if (APP.sectionRanges && APP.sectionRanges.length > 0) {
    // Find the in-progress section, or the last completed one
    const inProg = APP.sectionRanges.findIndex(r => r.status === 'in-progress');
    if (inProg >= 0) {
      sectionName = APP.sectionRanges[inProg].regionZh || '';
      sectionNameEn = APP.sectionRanges[inProg].regionEn || '';
    } else {
      const completed = APP.sectionRanges.filter(r => r.status === 'completed').length;
      const idx = Math.min(completed, APP.sectionRanges.length - 1);
      sectionName = APP.sectionRanges[idx].regionZh || '';
      sectionNameEn = APP.sectionRanges[idx].regionEn || '';
    }
  } else {
    const section = ghtSections[APP.currentSection - 1];
    if (section) { sectionName = section.name; sectionNameEn = section.nameEn; }
  }

  const elevStr = getDisplayElevStr();

  const region13 = currentRegion13();
  const locName = region13 ? region13.zh : (sectionNameEn || sectionName || '—');
  document.getElementById('currentPosBadge').innerHTML =
    t('pos.prefix') + ' <span class="prov-name">' + locName + '</span><span class="prov-elev">' + elevStr + '</span>';
  // NOTE: 不在此处写 APP.progressPct —— 总进度只由 updateProgress()(已记录距离/总距离) 驱动，
  // 否则未上传轨迹时会被误算成「当前段序号/总段数」(1/10=10%)。
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PROGRESS DOM UPDATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateProgressDOM() {
  const bar = document.getElementById('progressBar');
  const pct = document.getElementById('progressPct');
  const detail = document.getElementById('progressDetail');
  if (bar) bar.style.width = APP.progressPct + '%';
  if (pct) pct.textContent = APP.progressPct.toFixed(1) + '%';
  if (detail && APP.sectionRanges) {
    const completedCount = APP.sectionRanges.filter(r => r.status === 'completed').length;
    const inProgressCount = APP.sectionRanges.filter(r => r.status === 'in-progress').length;
    detail.textContent = completedCount + '✅ ' + (inProgressCount > 0 ? '+' + inProgressCount + '🔵 ' : '') + '/ ' + APP.sectionRanges.length + ' ' + t('pass.seg');
  }
  renderDashboard();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RENDER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 地图下方信息栏：进度% + Day 计数 + 整体滑移 + 关键指标 + 最近记录 + 下一阶段
// ════════════════════════════════════════════════════
//  NO TWO DASHBOARD — 三栏模块渲染
// ════════════════════════════════════════════════════
function getProvZH(pid) {
  const m = { koshi: 'Koshi 省', bagmati: '巴格马蒂省', gandaki: '甘达基省', lumbini: '蓝毗尼省', karnali: '格尔纳利省', sudurpashchim: '远西省' };
  return m[pid] || pid || '—';
}

// ── 唯一真相源：当前所在路段 ──
// 有位置（实时 GPS 或最新上传轨迹终点）：按最近轨迹点定位到所属路段；
// 没有任何位置/轨迹时：返回起点段（sectionRanges[0] = 干城章嘉），避免「0% 却显示下一段」的歧义。
// 面板「当前状态」与地图徽标「当前位置」统一调用此函数 → 二者永不矛盾。
function getCurrentSectionRange() {
  if (APP.sectionRanges && APP.sectionRanges.length) {
    const pos = getEffectivePosition();
    if (!pos) return APP.sectionRanges[0];                // 无位置/无轨迹 → 起点段
    // 有位置：找包含「有效当前位置」最近轨迹点的路段
    if (APP.presetTrack && APP.presetTrack.trackPoints.length) {
      const pts = APP.presetTrack.trackPoints;
      let best = -1, bd = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const d = haversine(pos.lat, pos.lon, pts[i].lat, pts[i].lon);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0) {
        const hit = APP.sectionRanges.find(r => best >= r.startIndex && best <= r.endIndex);
        if (hit) return hit;
      }
    }
    const inProg = APP.sectionRanges.findIndex(r => r.status === 'in-progress');
    if (inProg >= 0) return APP.sectionRanges[inProg];
    const c = APP.sectionRanges.filter(r => r.status === 'completed').length;
    return APP.sectionRanges[Math.min(c, APP.sectionRanges.length - 1)];
  }
  return null;
}

function currentSectionInfo() {
  const r = getCurrentSectionRange();
  if (r) return { name: r.regionZh || '', nameEn: r.regionEn || '' };
  if (ghtSections[APP.currentSection - 1]) return { name: ghtSections[APP.currentSection - 1].name, nameEn: ghtSections[APP.currentSection - 1].nameEn };
  return { name: '', nameEn: '' };
}

function currentSectionIdx() {
  const r = getCurrentSectionRange();
  if (r) return APP.sectionRanges.indexOf(r);
  return APP.currentSection - 1;
}

function getNextPass() {
  if (!APP.presetTrack || !APP.presetTrack.waypoints || !APP.presetTrack.waypoints.length) return null;
  const pts = APP.presetTrack.trackPoints; if (!pts || !pts.length) return null;
  const pos = getEffectivePosition();
  let curIdx = -1;
  if (pos) { let best = Infinity; for (let i = 0; i < pts.length; i++) { const d = haversine(pos.lat, pos.lon, pts[i].lat, pts[i].lon); if (d < best) { best = d; curIdx = i; } } }
  const passes = APP.presetTrack.waypoints.filter(w => w._type === 'pass' || w._type === 'peak');
  let bestPass = null, bestIdx = Infinity;
  passes.forEach(w => {
    let bi = -1, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = haversine(pts[i].lat, pts[i].lon, w.lat, w.lon); if (d < bd) { bd = d; bi = i; } }
    if (bi > curIdx && bi < bestIdx) { bestIdx = bi; bestPass = w; }
  });
  return bestPass;
}

function fmtNum(n, d) { return (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d == null ? 0 : d }); }

// 有效当前位置：有实时 GPS 时用实时位置；否则回退到「最近上传的实际轨迹终点」
// （按日期/天序最靠后），使未开实时追踪时，当前营地/所在区域/下一垭口/预计抵达
// 仍随实际上传进度自动更新，而不是一直停在起点。
function getEffectivePosition() {
  if (APP.currentPosition && APP.actualTracks && APP.actualTracks.length) return APP.currentPosition;
  if (APP.actualTracks && APP.actualTracks.length) {
    const last = [...APP.actualTracks]
      .filter(t => t.trackPoints && t.trackPoints.length && (t.date || t.dayNum != null))
      .sort((a, b) => {
        if (a.date && b.date) return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
        return (b.dayNum || 0) - (a.dayNum || 0);
      })[0];
    if (last) {
      const pts = last.trackPoints;
      const end = pts[pts.length - 1];
      const start = pts[0];
      return {
        lat: end.lat, lon: end.lon,
        elev: (end.elev != null ? end.elev : (start.elev != null ? start.elev : null)),
        _virtual: true, _dayNum: last.dayNum
      };
    }
  }
  return null;
}

// 下一阶段/下一徒步日：最后实际轨迹日的下一天（跳过空缺，反映最新进度）。
function getNextHikeDay() {
  const days = APP.itinerary || [];
  if (!days.length) return null;
  const actualDays = days.filter(d => d.actual);
  if (!actualDays.length) return days[0];
  const lastActual = actualDays.reduce((m, d) => d.day > m.day ? d : m, actualDays[0]);
  return days.find(d => d.day > lastActual.day) || null;
}

// 当前海拔显示值：实时追踪时取 GPS 当前点海拔；回退到最新实际轨迹终点海拔；
// 最后兜底预设起点海拔。避免陈旧 localStorage ght_current_pos 被误当成「当前海拔」。
function getDisplayElev() {
  const live = APP.currentPosition && APP.actualTracks && APP.actualTracks.length;
  if (live && APP.currentPosition.elev != null) return Math.round(APP.currentPosition.elev);
  const vpos = getEffectivePosition();
  if (vpos && vpos.elev != null) return Math.round(vpos.elev);
  const tp = APP.presetTrack && APP.presetTrack.trackPoints;
  if (tp && tp.length && tp[0].elev != null) return Math.round(tp[0].elev);
  return null;
}
function getDisplayElevStr() {
  const e = getDisplayElev();
  return e != null ? ' · ⛰️ ' + e.toLocaleString() + 'm' : '';
}

// ── 更新 header 实时追踪状态（独立抽出，进度模块不再依赖顶部 KPI 条）──
function updateHeaderLive() {
  var hdrLive = document.getElementById('hdrLive');
  if (hdrLive) {
    var isLive = !!(APP.lastGPSTime && (Date.now() - APP.lastGPSTime < 36e5));
    hdrLive.innerHTML = (isLive ? '<span class="dot"></span>' : '<span class="dot idle"></span>') +
      (isLive ? t('hdr.live') : t('hdr.idle'));
    hdrLive.className = isLive ? 'live' : 'live live-idle';
  }
}

// ── A. 整体进度模块 = 大圆环 + 4 个 KPI（与「今日摘要」同款 .tg/.tg-cell 样式）──
function progressModuleHTML() {
  const totalKm = APP.totalDistance || 0;
  const doneKm = (APP.completedDistance / 1000) || 0;
  const days = APP.itinerary || [];
  const doneDays = days.filter(d => d.actual).length;
  const totalDays = days.length;
  const pct = APP.progressPercentage || APP.progressPct || 0;
  const gain = (APP.presetTrack && APP.presetTrack.stats && APP.presetTrack.stats.elevGain)
    ? APP.presetTrack.stats.elevGain : 0;
  const elev = getDisplayElev();
  const np = getNextPass();
  const goalGain = gain ? Math.round(gain * 1.12) : 0;
  const kcell = (v, l, s, cls) => '<div class="tg-cell' + (cls ? ' ' + cls : '') + '"><div class="l">' + l + '</div><div class="v">' + (v == null ? '—' : v) + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  const ringIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/><path d="M12 12l4-2"/></svg>';
  return '<div class="card-h"><span class="ch-ico">' + ringIcon + '</span>' + cardTitle('prog.title', 'OVERALL PROGRESS', '<span class="ch-cap">' + t('prog.ringCap') + ' <b>' + pct.toFixed(1) + '%</b> · ' + t('prog.ringDone') + ' ' + doneDays + ' / ' + totalDays + ' ' + t('prog.ringDayUnit') + '</span>') + '</div>' +
    '<div class="card-b prog-mod">' +
      statusRingHTML() +
      '<div class="tg progress-kpi">' +
        kcell(fmtNum(doneKm, 0) + 'km', t('prog.doneKm'), 'Total ' + fmtNum(totalKm, 0) + 'km') +
        kcell(gain ? fmtNum(gain) + 'm' : '—', t('prog.totalGain'), t('prog.goal') + ' ' + fmtNum(goalGain) + 'm', 'k-green') +
        kcell(elev != null ? fmtNum(elev) + 'm' : '—', t('prog.curElev'), 'Day ' + doneDays, 'k-indigo') +
        kcell((np && np.elev != null) ? fmtNum(np.elev) + 'm' : '—', t('prog.nextPass'), (np && np.name ? esc(np.name) : '—'), 'k-pass') +
      '</div>' +
    '</div>';
}

// ── A2. 大圆环（Day 置于圆环中心；r=88 / viewBox 200，直径约 210px）──
function statusRingHTML() {
  const pct = APP.progressPercentage || APP.progressPct || 0;
  const days = APP.itinerary || [];
  const totalDays = days.length;
  const doneDays = days.filter(d => d.actual).length;
  const RC = 2 * Math.PI * 88;            // r=88 → 周长 ≈ 552.92
  const ringOffset = RC * (1 - pct / 100);
  return '<div class="big-ring">' +
    '<svg viewBox="0 0 200 200" width="160" height="160" role="img" aria-label="' + t('prog.title') + ' ' + pct.toFixed(1) + '%">' +
      '<circle class="ring-track-lg" cx="100" cy="100" r="88" fill="none" stroke-width="15"/>' +
      '<circle class="ring-val-lg" cx="100" cy="100" r="88" fill="none" stroke-width="15" stroke-linecap="round" ' +
        'stroke-dasharray="' + RC.toFixed(2) + '" stroke-dashoffset="' + ringOffset.toFixed(2) + '" transform="rotate(-90 100 100)"/>' +
      '<text class="ring-day-num" x="100" y="94" text-anchor="middle">Day ' + doneDays + '<tspan class="ring-day-tot" dx="2"> / ' + totalDays + '</tspan></text>' +
      '<text class="ring-day-sub" x="100" y="122" text-anchor="middle">' + t('prog.ringDay').replace('{d}', doneDays) + '</text>' +
    '</svg>' +
  '</div>';
}

// 与子页面(sections.html 等)同款 HTML 转义，防自由文本注入 innerHTML（自 XSS 加固）
function esc(s) { return String(s == null ? '' : s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ── B. 当前状态 ──
function currentStatusHTML() {
  const sec = currentSectionInfo();
  const idx = currentSectionIdx();
  const prov = getProv(ghtSections[idx] ? ghtSections[idx].province : '');
  const elev = getDisplayElev();
  const np = getNextPass();
  // 预计抵达：基于「最后实际徒步日 + 1」的计划日（叠加整体滑移），反映最新进度，
  // 而非首个空缺日（避免“最后已走到 8/9，ETA 却显示 8/6”的过期问题）。
  const nextHike = getNextHikeDay();
  let eta = '—';
  if (nextHike) {
    const planned = getPlannedDate(nextHike.day);
    if (planned) {
      const slip = APP._overallSlip || 0;
      const dt = new Date(planned + 'T00:00:00');
      dt.setDate(dt.getDate() + slip);
      eta = dt.toISOString().slice(0, 10);
    }
  } else if (APP.itineraryStartDate) {
    eta = APP.itineraryStartDate;
  }

  // 当前营地：有位置（实时 GPS 或最新上传轨迹终点）→最近标注点；
  // 否则→起点营地（明确标注「未出发」）。
  const pos = getEffectivePosition();
  const hasPos = !!(pos && APP.allWpts && APP.allWpts.length);
  let campVal, campSub;
  if (hasPos) {
    const lbl = nearestWaypointLabel(APP.allWpts, pos, 6000);
    campVal = lbl || (sec.nameEn || sec.name || '—');
    campSub = (currentLang === 'en' ? (sec.nameEn || sec.name) : sec.name) || '';
  } else {
    const startCamp = (APP.itinerary && APP.itinerary[0] && APP.itinerary[0].from) || APP.startPlaceName || t('st.start');
    campVal = '🚩 ' + esc(startCamp);
    campSub = ((currentLang === 'en' ? (sec.nameEn || sec.name) : sec.name) || t('st.start')) + ' · ' + t('st.notStarted');
  }

  const ic = {
    camp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z"/><path d="M9 3v16M15 5v16"/></svg>',
    elev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18L14 7l-4 6-2-3z"/></svg>',
    pass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l6-9 4 5 3-4 5 8z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  };
  const row = (ico, k, v, sub) => '<div class="st-row"><span class="st-ico">' + ico + '</span><span class="st-k">' + k + '</span><span class="st-v">' + v + (sub ? '<small>' + sub + '</small>' : '') + '</span></div>';
  return '<div class="card-h"><span class="ch-ico">' + ic.camp + '</span>' + cardTitle('st.title', 'CURRENT STATUS') + '</div>' +
    '<div class="card-b">' +
    row(ic.camp, t('st.camp'), campVal, campSub) +
    row(ic.area, t('st.area'), prov, '') +
    row(ic.elev, t('st.elev'), elev != null ? fmtNum(elev) + 'm' : '—', '') +
    row(ic.pass, t('st.pass'), np ? esc(np.name || np.desc || t('st.unnamed')) : '—', np && np.elev != null ? fmtNum(np.elev) + 'm' : '') +
    row(ic.clock, t('st.eta'), eta, '') +
    '</div>';
}

// ── C. 今日摘要 ──
function todaySummaryHTML() {
  const last = [...(APP.actualTracks || [])].reverse().find(t => t.stats);
  const s = last ? last.stats : null;
  const cell = (v, l, cls) => '<div class="tg-cell"><div class="l">' + l + '</div><div class="v' + (cls ? ' ' + cls : '') + '">' + (v == null ? '—' : v) + '</div></div>';
  // Build Day badge for header
  let dayBadge = '';
  if (s && last.dayNum) { dayBadge = '<b>Day ' + last.dayNum + '</b>' + (last.date ? ' · ' + last.date : ''); }
  else if (!s) { dayBadge = ''; }
  return '<div class="card-h">' + cardTitle('today.title', "TODAY'S SUMMARY", dayBadge ? '<span class="ch-cap">' + dayBadge + '</span>' : '') + '</div>' +
    '<div class="card-b"><div class="tg">' +
    cell(s ? fmtNum(s.distance, 1) + 'km' : '—', t('today.dist')) +
    cell(s ? '+' + fmtNum(s.elevGain) + 'm' : '—', t('today.gain'), 'up') +
    cell(s ? fmtNum(s.elevLoss) + 'm' : '—', t('today.loss'), 'down') +
    cell(s && s.durationStr ? s.durationStr : '—', t('today.move')) +
    cell(s && s.avgSpeed ? s.avgSpeed + '' : '—', t('today.speed')) +
    cell(s ? fmtNum(s.maxElev) + 'm' : '—', t('today.max')) +
    '</div></div>';
}

// ── 垭口覆盖判定：实际轨迹(任一段,半径内)经过即算翻越 ──
function passCovered(wpt, R) {
  if (!wpt) return false;
  return (APP.actualTracks || []).some(t => ptNearSegment(wpt, t.trackPoints || [], R));
}
// 主人手动「已翻越」记录（localStorage 持久化，用于 GPS 信号弱未覆盖时补记）
// ── 垭口翻越列表（与预设轨迹实时同步）──
function computePassList() {
  const wps = (APP.presetTrack && APP.presetTrack.waypoints) || [];
  let passes = dedupeWaypoints(wps.filter(w => w._type === 'pass' || w._type === 'peak'));
  if (!passes.length) {
    const reason = wps.length ? 'unrecognized' : (APP.presetTrack ? 'noWpt' : 'noPreset');
    return { passes: [], done: 0, total: 0, wpCount: wps.length, reason };
  }
  const presetPts = (APP.presetTrack && APP.presetTrack.trackPoints) || [];
  const R = 500;
  passes = passes.map(w => {
    const nm = (w.desc || w.name || '').trim();
    const auto = passCovered(w, R);
    const done = auto;
    let idx = Infinity;
    if (presetPts.length) {
      let best = Infinity, bi = -1;
      const step = Math.max(1, Math.floor(presetPts.length / 400));
      for (let i = 0; i < presetPts.length; i += step) {
        const d = haversine(w.lat, w.lon, presetPts[i].lat, presetPts[i].lon);
        if (d < best) { best = d; bi = i; }
      }
      idx = bi;
    }
    return { nm, done, auto, elev: w.elev, idx };
  }).sort((a, b) => a.idx - b.idx);
  const done = passes.filter(p => p.done).length;
  return { passes, done, total: passes.length };
}

// ── F. 垭口清单（与预设轨迹实时同步）──
function passesHTML() {
  const { passes, done, total, reason, wpCount } = computePassList();
  let rows = '';
  if (!total) {
    let msg = t('pass.none');
    if (reason === 'unrecognized') msg = '预设含 ' + wpCount + ' 个标注点，但均未识别为垭口/山峰（pass/peak）。请检查 GPX 标注的分类字段（如 PeakVisor tagId、sym、中文"垭口/山口"）。';
    else if (reason === 'noWpt') msg = '预设轨迹未包含任何标注点（wpt）。请在 GPX 中保留垭口/住宿点的 waypoint 再导入。';
    rows = '<div style="font-size:11px;color:#d29922;padding:8px 0;line-height:1.5;">' + msg + '</div>';
  } else {
    rows = passes.map(p => {
      const cls = 'pass-row' + (p.done ? ' done' : '') + (p.elev != null && p.elev >= 5500 ? ' danger' : '');
      const mark = p.done ? '<span class="pass-check">✓</span>' : '<span class="pass-dot"></span>';
      const elev = p.elev != null ? fmtNum(p.elev) + 'm' : '';
      return '<div class="' + cls + '">' + mark +
        '<span class="pass-name">' + esc(p.nm || t('st.unnamed')) + '</span>' +
        (elev ? '<span class="pass-elev">' + elev + '</span>' : '') + '</div>';
    }).join('');
  }
  const summary = total ? '<div class="pass-summary"><span class="pass-summary-num">' + done + ' / ' + total + '</span>' +
    '<div class="pass-summary-bar"><i style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></i></div></div>' : '';
  return '<div class="card-h"><span class="ch-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l6-9 4 5 3-4 5 8z"/></svg></span>' + cardTitle('pass.title', 'PASS CHECKLIST') + '</div>' +
    summary +
    '<div class="card-b pass-list">' + rows + (total ? '<a class="more-link" href="sections.html" target="_blank" rel="noopener">' + t('pass.all') + '</a>' : '') + '</div>';
}

// ── I. 上传 / 管理 ──
function uploadHTML() {
  return '<div class="upload-zone">' +
    '<input type="file" id="gpxUpload" accept=".gpx,.kml,.geojson" multiple onchange="handleGPXUpload(event)">' +
    '<button class="btn primary" style="width:100%;" onclick="document.getElementById(\'gpxUpload\').click()">' + t('up.btn') + '</button>' +
    '<div class="upload-hint">' + t('up.hint') + '</div>' +
    '<div class="date-row">' + t('up.date') + '<input type="date" value="' + (APP.itineraryStartDate || '') + '" onchange="setItineraryStartDate(this.value)"></div>' +
    (APP.isOwner ? '<div style="margin-top:10px;text-align:center;"><button class="btn-reset visible" id="btnReset" onclick="resetLocalData()" style="font-size:11px;">' + t('up.reset') + '</button><button class="btn-reset visible" id="btnClearCloud" onclick="clearCloudShare()" style="font-size:11px;margin-left:8px;">清空云端</button><button class="btn-reset visible" id="btnRepublish" onclick="republishShare()" style="font-size:11px;margin-left:8px;">🔄 重新发布共享</button></div>' : '') +
    '</div>';
}

function updateLiveStatus() {
  const el = document.getElementById('liveDot');
  if (!el) return;
  const hasLive = APP.currentPosition && APP.actualTracks && APP.actualTracks.length;
  if (hasLive) {
    el.className = 'live-dot';
    el.innerHTML = '<span class="ld-dot"></span> ' + t('hdr.live');
  } else {
    el.className = 'live-dot offline';
    el.innerHTML = '<span class="ld-dot offline"></span> ' + t('hdr.idle');
  }
}

function renderDashboard() {
  updateHeaderLive();
  setCard('cardStatus', progressModuleHTML());
  setCard('cardToday', todaySummaryHTML());
  setCard('cardPasses', passesHTML());
  updateLiveStatus();
  if (typeof bindSectionClickHandlers === 'function') { try { bindSectionClickHandlers(); } catch (e) {} }
}

function renderInfoBar() {
  const el = document.getElementById('infoBar');
  if (!el) return;

  const days = APP.itinerary || [];
  const totalDays = days.length;
  const doneDays = days.filter(d => d.actual).length;
  const slip = APP._overallSlip || 0;

  // 最近记录（按 day 倒序找第一条有 actual 的）
  let todayHTML;
  const lastActual = [...days].reverse().find(d => d.actual);
  if (lastActual && lastActual.actual) {
    const a = lastActual.actual;
    const arrow = a.actFrom && a.actTo ? `${esc(a.actFrom)} → ${esc(a.actTo)}` : '—';
    todayHTML = `<div class="info-sub">
      <div class="t">📍 最近记录 · Day ${lastActual.day}</div>
      <div class="v">${arrow} <span class="dim">${a.distance != null ? a.distance.toFixed(1) : '?'}km · ${a.date || '?'}</span></div>
    </div>`;
  } else {
    todayHTML = `<div class="info-sub empty"><div class="t">📍 最近记录</div><div class="v">等待 GPS 数据</div></div>`;
  }

  // 下一阶段（最后实际徒步日的下一天，反映最新进度而非首个空缺日）
  let nextHTML;
  const nextDay = getNextHikeDay();
  if (nextDay) {
    const restCls = nextDay.isRestDay ? ' rest' : '';
    const passTxt = (nextDay.passes && nextDay.passes.length) ? ' · ⛰️ ' + nextDay.passes.map(esc).join('/') : '';
    const fromTxt = esc(nextDay.from || '—'), toTxt = esc(nextDay.to || '—');
    nextHTML = `<div class="info-sub${restCls}">
      <div class="t">🗺️ 下一阶段 · Day ${nextDay.day}</div>
      <div class="v">${fromTxt} → ${toTxt}${passTxt} <span class="dim">${nextDay.plannedDistance || '?'}km</span></div>
    </div>`;
  } else {
    nextHTML = `<div class="info-sub empty"><div class="t">🗺️ 下一阶段</div><div class="v">已全部走完 🎉</div></div>`;
  }

  // 整体滑移标签
  let slipHTML = '';
  if (slip > 0) slipHTML = `<span class="info-slip behind">整体晚 ${slip} 天</span>`;
  else if (slip < 0) slipHTML = `<span class="info-slip ahead">整体快 ${Math.abs(slip)} 天</span>`;
  else if (totalDays) slipHTML = `<span class="info-slip on">按计划</span>`;

  const elevGain = getCumulativeElevGain ? Math.round(getCumulativeElevGain()) : 0;
  const maxElev = getDisplayElev() || 0;

  el.innerHTML = `
    <div class="info-progress-row">
      <div class="info-pct">${APP.progressPct || 0}<small>%</small></div>
      <div class="info-daycount">Day <b>${doneDays}</b> / ${totalDays}</div>
      ${slipHTML}
      <div class="info-chips">
        <div class="info-chip">总距离<b>${APP.totalDistance || 0}km</b></div>
        <div class="info-chip">累计爬升<b>${elevGain ? elevGain.toLocaleString() : '—'}m</b></div>
        <div class="info-chip">当前海拔<b>${maxElev ? maxElev.toLocaleString() : '—'}m</b></div>
      </div>
    </div>
    <div class="info-today-next">
      ${todayHTML}
      ${nextHTML}
    </div>`;
}

function renderProgress() {
  let sec = '';
  if (APP.sectionRanges && APP.sectionRanges.length > 0) {
    sec = APP.sectionRanges.map((range, idx) => {
      const status = range.status || 'upcoming';
      const cssStatus = status === 'completed' ? 'done' : status === 'in-progress' ? 'current' : 'upcoming';
      const label = status === 'completed' ? '✅' : status === 'in-progress' ? '🔵' : '⚪';
      const coverageText = range.coverage ? ` (${(range.coverage * 100).toFixed(0)}%)` : '';
      const secDist = range.sectionActualDist ? Math.round(range.sectionActualDist) : '?';
      const parkName = range.regionEn || ('Section ' + (idx + 1));
      const parkNameZh = range.regionZh || '';
      return `<div class="section-item ${cssStatus === 'current' ? 'active' : ''} ${cssStatus === 'done' ? 'completed' : ''}" data-section="${idx + 1}">
        <div class="section-indicator ${cssStatus}" style="background:${range.regionColor || '#888'}"></div>
        <div class="section-info">
          <div class="name">${label} ${parkName} <span style="font-size:10px;color:var(--text-dim)">${parkNameZh}</span>${coverageText}</div>
          <div class="detail">📏 ${secDist}km${range.regionHighlights && range.regionHighlights.length ? ' · ' + range.regionHighlights[0] : ''}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    sec = (window.GHT_SECTIONS || []).map((p, idx) => {
      return `<div class="section-item" data-section="${idx + 1}">
        <div class="section-indicator upcoming" style="background:${p.color}"></div>
        <div class="section-info">
          <div class="name">⚪ ${p.en} <span style="font-size:10px;color:var(--text-dim)">${p.zh}</span></div>
          <div class="detail">📌 ${p.scenery || ''}</div>
        </div>
      </div>`;
    }).join('');
  }

  APP.progressPct = Math.round(APP.progressPercentage || 0);
  const completedCount = APP.sectionRanges ? APP.sectionRanges.filter(r => r.status === 'completed').length : (APP.currentSection - 1);
  const inProgressCount = APP.sectionRanges ? APP.sectionRanges.filter(r => r.status === 'in-progress').length : 0;

  const autoShiftNote = APP._overallSlip
    ? `<div style="background:rgba(255,169,77,0.14);border:1px solid rgba(255,169,77,0.4);color:#FFA94D;padding:8px 12px;border-radius:8px;font-size:12px;margin:4px 0 12px;line-height:1.6;">⚠️ 行程整体${APP._overallSlip > 0 ? '晚 ' + APP._overallSlip : '快 ' + Math.abs(APP._overallSlip)} 天（实际 GPS 日期相对计划日期的整体偏移）</div>`
    : '';

  return `
    <div class="dashboard-hero">
      <div class="big-pct">${APP.progressPct}%</div>
      <div class="pct-sub">
        ${(APP.completedDistance/1000).toFixed(1)} / ${APP.totalDistance} km
        ${getDisplayElevStr()}
      </div>
    </div>

    <div class="progress-bar-outer">
      <div class="progress-bar-inner" id="progressBar" style="width:${APP.progressPct}%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:12px;">
      <span id="progressPct">${APP.progressPct.toFixed(1)}%</span>
      <span id="progressDetail">${completedCount}✅ ${inProgressCount > 0 ? '+' + inProgressCount + '🔵' : ''} / ${(APP.sectionRanges ? APP.sectionRanges.length : (window.GHT_SECTIONS || []).length)} 段</span>
    </div>

    ${autoShiftNote}

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">📏 总距离</div>
        <div class="value">${APP.totalDistance}<span class="unit"> km</span></div>
      </div>
      <div class="stat-card">
        <div class="label">⛰️ 已完成</div>
        <div class="value">${(APP.completedDistance / 1000).toFixed(1)}<span class="unit"> km</span></div>
      </div>
      <div class="stat-card">
        <div class="label">📊 进度</div>
        <div class="value">${APP.progressPct}<span class="unit">%</span></div>
      </div>
      <div class="stat-card">
        <div class="label">📈 累计爬升</div>
        <div class="value">${getCumulativeElevGain() > 0 ? Math.round(getCumulativeElevGain()).toLocaleString() : '?'}<span class="unit"> m</span></div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:600;color:var(--accent);margin:16px 0 8px;">🗺️ 路段列表</div>
    <div>${sec}</div>

    ${APP.gpxResultHTML || ''}
    ${APP.isOwner ? `
    <div style="margin-top:12px;padding:12px;background:var(--bg);border:1px dashed var(--border);border-radius:8px;text-align:center;">
      <input type="file" id="gpxUpload" accept=".gpx,.kml,.geojson" multiple style="display:none" onchange="handleGPXUpload(event)">
      <button class="btn primary" onclick="document.getElementById('gpxUpload').click()" style="width:100%;">
        📤 上传GPS轨迹 (.gpx/.kml)
      </button>
      <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">
        支持批量多文件导入（按文件名排序合并）<br>
        PeakVisor / Strava / Garmin GPX 均可
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--text-dim);text-align:left;padding-top:8px;border-top:1px dashed var(--border);">
        📅 出发日期（选填）：
        <input type="date" id="startDateInput" value="${APP.itineraryStartDate || ''}" onchange="setItineraryStartDate(this.value)"
          style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:5px;font-family:inherit;font-size:11px;margin-left:4px;">
        <div style="margin-top:4px;">设置后自动推算每日日程日期（告别「日期待定」），并用于「快/慢/按计划」判定</div>
      </div>
    </div>
    ` : ''}
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  路段探索器（方案 C）：每段高程剖面 + 营地/垭口 + 点击聚焦地图
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 由某段的轨迹点生成 SVG 高程迷你剖面
function sectionElevSVG(range) {
  if (!APP.presetTrack || !APP.presetTrack.trackPoints) return '';
  const pts = APP.presetTrack.trackPoints;
  const seg = pts.slice(range.startIndex, range.endIndex + 1)
    .filter(p => p.elev != null && !isNaN(p.elev));
  if (seg.length < 2) return '';
  // 抽稀到约 60 个点，控制 SVG 体积
  const step = Math.max(1, Math.floor(seg.length / 60));
  const sampled = [];
  for (let i = 0; i < seg.length; i += step) sampled.push(seg[i]);
  if (sampled[sampled.length - 1] !== seg[seg.length - 1]) sampled.push(seg[seg.length - 1]);

  const W = 320, H = 56, pad = 4;
  let min = Infinity, max = -Infinity;
  sampled.forEach(p => { if (p.elev < min) min = p.elev; if (p.elev > max) max = p.elev; });
  const span = (max - min) || 1;
  const ptsStr = sampled.map((p, i) => {
    const x = pad + (W - 2 * pad) * i / (sampled.length - 1);
    const y = H - pad - (H - 2 * pad) * (p.elev - min) / span;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const area = pad + ',' + (H - pad) + ' ' + ptsStr + ' ' + (W - pad) + ',' + (H - pad);
  const color = range.regionColor || '#888';
  return `<div class="elev-box">
      <div class="cap">📈 高程剖面</div>
      <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block">
        <polygon points="${area}" fill="${color}22"/>
        <polyline points="${ptsStr}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">最高 ${Math.round(max).toLocaleString()}m · 最低 ${Math.round(min).toLocaleString()}m</div>
    </div>`;
}

// 取出属于某段的营地/垭口标注点（来自预设轨迹 wpt，按最近轨迹点归属到段）
function sectionWaypoints(range) {
  if (range._wps) return range._wps;
  const pts = APP.presetTrack ? APP.presetTrack.trackPoints : [];
  if (!pts.length) { range._wps = []; return range._wps; }
  // 一次性算出每个 wpt 最近的轨迹点索引，缓存避免重复扫描
  if (!range._allWpNear) {
    range._allWpNear = (APP.presetTrack.waypoints || []).map(w => {
      let best = Infinity, bi = -1;
      for (let i = 0; i < pts.length; i++) {
        const d = haversine(pts[i].lat, pts[i].lon, w.lat, w.lon);
        if (d < best) { best = d; bi = i; }
      }
      return { w, bi };
    });
  }
  const wps = range._allWpNear
    .filter(o => o.bi >= range.startIndex && o.bi <= range.endIndex)
    .map(o => o.w)
    .sort((a, b) => (b.elev || 0) - (a.elev || 0));
  range._wps = wps;
  return wps;
}

// 点击路段卡片：在地图聚焦该段轨迹
function focusSection(idx) {
  const range = APP.sectionRanges && APP.sectionRanges[idx];
  if (!range) return;
  document.querySelectorAll('.sec-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector('.sec-card[data-idx="' + idx + '"]');
  if (card) card.classList.add('active');
  if (APP.presetTrack && APP.presetTrack.trackPoints && typeof map !== 'undefined') {
    const pts = APP.presetTrack.trackPoints.slice(range.startIndex, range.endIndex + 1);
    if (pts.length) {
      const bounds = L.latLngBounds(pts.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }
}

// 无数据回退：点击区域聚焦其入口坐标
function focusRegion(idx) {
  const p = (window.GHT_SECTIONS || [])[idx];
  if (p && p.entry && typeof map !== 'undefined') {
    document.querySelectorAll('.sec-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector('.sec-card[data-idx="' + idx + '"]');
    if (card) card.classList.add('active');
    map.setView([p.entry[0], p.entry[1]], 10);
  }
}

function renderSections() {
  let html = '<div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:12px;">路段进度</div>';

  if (APP.sectionRanges && APP.sectionRanges.length > 0) {
    APP.sectionRanges.forEach((range, idx) => {
      const status = range.status || 'upcoming';
      const statusIcon = status === 'completed' ? '✅' : status === 'in-progress' ? '🔵' : '⚪';
      const color = range.regionColor || '#888';
      const plannedKm = range.sectionActualDist ? Math.round(range.sectionActualDist) : 0;
      const cov = range.coverage || 0;
      const actualKm = Math.round(plannedKm * cov);
      const highlights = range.regionHighlights || [];

      const wps = (APP.presetTrack ? sectionWaypoints(range) : []);
      const wpRows = wps.length ? wps.map(w => {
        const isPass = w._type === 'pass' || w._type === 'peak';
        return `<div class="wp-row">
          <div class="wp-ico">${isPass ? '⛰️' : '🏕️'}</div>
          <div class="wp-name">${w.name || w.desc || '未命名'}</div>
          <div class="wp-elev">${w.elev != null ? Math.round(w.elev).toLocaleString() + 'm' : ''}</div>
        </div>`;
      }).join('') : '<div style="font-size:11px;color:var(--text-dim);padding:6px 0;">本段暂无标注点</div>';

      html += `<div class="sec-card" data-idx="${idx}" style="border-left-color:${color}" onclick="focusSection(${idx})">
        <div class="sec-head">
          <div class="sec-title">${statusIcon} ${range.regionEn || ('Section ' + (idx + 1))}
            <small>${range.regionZh || ''}</small></div>
          <div class="sec-meta">计划 ${plannedKm}km<br>已走 ${actualKm}km</div>
        </div>
        <div class="sec-bar"><i style="width:${Math.round(cov * 100)}%;background:${color}"></i></div>
        <div class="sec-detail">
          ${sectionElevSVG(range)}
          ${wpRows}
          ${highlights.length ? '<div style="font-size:11px;color:var(--text-dim);margin-top:6px;">📌 ' + highlights.join(' · ') + '</div>' : ''}
        </div>
        <div class="sec-hint">👆 点击在地图聚焦本段</div>
      </div>`;
    });
  } else {
    // 无数据：静态保护区列表（可点击聚焦入口坐标）
    (window.GHT_SECTIONS || []).forEach((p, idx) => {
      html += `<div class="sec-card" data-idx="${idx}" style="border-left-color:${p.color};opacity:.6;" onclick="focusRegion(${idx})">
        <div class="sec-head">
          <div class="sec-title">⚪ ${p.en} <small>${p.zh}</small></div>
        </div>
        <div class="sec-detail" style="max-height:none;padding-bottom:12px;">
          <div style="font-size:11px;color:var(--text-dim);line-height:1.7;">📌 ${p.scenery || ''}</div>
        </div>
      </div>`;
    });
  }

  return html;
}

// 检测「行程途中」缺少 GPS 轨迹的天（之后已有记录，但这一天空缺 → 疑似休息/天气）
function getMissingDays() {
  if (!APP.itinerary.length) return [];
  const hasActual = APP.itinerary.some(d => d.actual);
  if (!hasActual) return [];
  return APP.itinerary.filter(d =>
    !d.actual && !d.isRestDay && !d.delayed &&
    APP.itinerary.some(x => x.actual && x.day > d.day)
  ).map(d => d.day);
}

// 手动将某天标记为「计划内休息」（或取消）
function markDayAsRest(dayNum) {
  const d = APP.itinerary.find(x => x.day === dayNum);
  if (!d) return;
  d.isRestDay = !d.isRestDay;
  if (d.isRestDay) { d.actual = null; }
  saveItinerary();
  openPanel('itinerary');
}

function renderItinerary() {
  // Re-match actuals（空行程时内部直接返回，不会凭空生成数据）
  matchItineraryToActuals();

  const summary = getItinerarySummary();
  const today = fmtNepalDate(new Date());

  // ── Summary Bar ──
  let summaryHTML = '';
  if (summary) {
    const pctDone = summary.totalDays > 0 ? Math.round(summary.daysWithData / summary.totalDays * 100) : 0;
    summaryHTML = `
    <div class="schedule-summary">
      <div class="summary-row">
        <span>📅 总行程: ${summary.totalDays}天</span>
        <span>📡 已记录: ${summary.daysWithData}天 (${pctDone}%)</span>
      </div>
      <div class="summary-row">
        <span>📏 计划总距离: ${summary.plannedTotal}km</span>
        <span>✅ 已完成: ${summary.actualTotal}km</span>
      </div>
      <div class="summary-row" style="color:var(--green);">
        <span>🟢 超计划: ${summary.aheadDays}天</span>
        <span style="color:var(--accent);">🔵 按计划: ${summary.onTrackDays}天</span>
        <span style="color:var(--red);">🔴 未达标: ${summary.behindDays}天</span>
      </div>
      ${APP._overallSlip ? `<div style="background:rgba(255,169,77,0.14);border:1px solid rgba(255,169,77,0.4);color:#FFA94D;padding:7px 10px;border-radius:6px;font-size:11px;margin-top:6px;line-height:1.5;">⚠️ 行程整体${APP._overallSlip > 0 ? '晚 ' + APP._overallSlip : '快 ' + Math.abs(APP._overallSlip)} 天（实际 GPS 日期相对计划日期的整体偏移）</div>` : ''}
    </div>`;
  }

  // ── 缺日提示（行程途中出现空缺 → 询问是否休息/天气）──
  const missing = getMissingDays();
  const missingWarnHTML = missing.length ? `
    <div style="background:rgba(255,169,77,0.14);border:1px solid rgba(255,169,77,0.4);color:#FFA94D;padding:8px 12px;border-radius:8px;font-size:12px;margin:4px 0 12px;line-height:1.8;">
      ⚠️ 行程途中缺少 GPS 轨迹：${missing.map(d => 'Day ' + d).join('、')}。是否为休息 / 天气延误？
      <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
        ${missing.map(d => `<button onclick="toggleDelay(${d},'weather')" style="background:rgba(255,169,77,0.18);border:1px solid rgba(255,169,77,0.5);color:#FFA94D;padding:3px 9px;border-radius:6px;cursor:pointer;font-size:11px;">☁️ Day${d} 天气延误</button><button onclick="markDayAsRest(${d})" style="background:rgba(63,185,80,0.16);border:1px solid rgba(63,185,80,0.5);color:var(--green);padding:3px 9px;border-radius:6px;cursor:pointer;font-size:11px;">🏕️ Day${d} 休息</button>`).join('')}
      </div>
    </div>` : '';
  summaryHTML += missingWarnHTML;

  // ── 出发日期（批量推算全部日程日期，与进度面板共用同一逻辑）──
  const startDateBar = `
    <div style="display:flex;align-items:center;gap:8px;margin:10px 0 14px;flex-wrap:wrap;">
      <span style="font-size:12px;color:var(--text-dim);">📅 出发日期（选填）：</span>
      <input type="date" id="startDateInputIt" value="${APP.itineraryStartDate || ''}" onchange="setItineraryStartDate(this.value)"
             style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:5px 9px;border-radius:6px;font-family:inherit;font-size:12px;">
      <span style="font-size:11px;color:var(--text-dim);">设置后自动推算每日日期（告别「日期待定」），并用于「快/慢/按计划」判定</span>
    </div>`;

  // ── Toolbar（行程由预设轨迹自动生成，无需手动模板/导入/重新生成）──
  const toolbarHTML = '';

  // ── Empty State（无真实数据时不显示占位行程，避免凭空出现 156 天 / 1579km）──
  if (!APP.itinerary.length) {
    return summaryHTML + startDateBar + toolbarHTML + `
    <div class="empty-state" style="padding:36px 18px;text-align:center;color:var(--text-dim);">
      <div style="font-size:34px;margin-bottom:12px;">🗺️</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:8px;">尚未生成行程安排</div>
      <div style="font-size:11px;line-height:1.7;">
        行程会根据<b>真实的预设轨迹（GPX 分段）</b>自动生成。<br>
        请在「进度」面板导入预设轨迹，或使用上方「📥 导入」日程 CSV。<br>
        <span style="color:var(--text-dim);">（不会自动生成占位计划）</span>
      </div>
    </div>`;
  }

  // ── Day List (倒序：Day 42 在最上，Day 1 在最下) ──
  let daysHTML = '';
  [...APP.itinerary].reverse().forEach((day) => {
    const plannedDate = getPlannedDate(day.day);
    const plannedShort = plannedDate ? plannedDate.slice(5) : '—';
    const isToday = plannedDate === today;
    const cssClass = isToday ? 'today' : (day.actual ? day.actual.onTrack : '');
    const sectionColor = sectionColors[day.sectionId - 1] || '#888';

    // ── 计划栏（固定，永不随实际改动）──
    const planCol = `
      <div class="col">
        <div class="col-title plan-t">📋 计划</div>
        <div class="stat-row"><span class="plan">📅 日期</span><span>${plannedShort}</span></div>
        <div class="stat-row"><span class="plan">📍 起点</span><span>${day.from}</span></div>
        <div class="stat-row"><span class="plan">📍 终点</span><span>${day.to}</span></div>
        <div class="stat-row"><span class="plan">📏 距离</span><span>${day.plannedDistance}km</span></div>
        <div class="stat-row"><span class="plan">⬆️ 爬升</span><span>${day.plannedElevGain}m</span></div>
        ${day.passes && day.passes.length ? `<div class="route" style="margin-top:5px;">⛰ ${day.passes.join('、')}</div>` : ''}
      </div>`;

    // ── 实际栏（按导入 GPS 如实显示，独立记录当天起点/终点）──
    let actCol;
    if (!day.actual) {
      if (day.isRestDay) {
        actCol = `<div class="col"><div class="col-title act-t">📡 实际</div>
          <div style="margin-top:6px;color:var(--green);font-size:12px;">🏕️ 休息 · 未行进</div></div>`;
      } else if (day.delayed) {
        actCol = `<div class="col"><div class="col-title act-t">📡 实际</div>
          <div style="margin-top:6px;color:#FFA94D;font-size:12px;">${delayLabel(day.delayReason)} · ${currentLang === 'en' ? 'no progress' : '未行进'}</div></div>`;
      } else {
        actCol = `<div class="col"><div class="col-title act-t">📡 实际</div>
          <div class="route" style="margin-top:6px;">⏳ 等待 GPS</div></div>`;
      }
    } else {
      const a = day.actual;
      const endMismatch = a.actTo && day.to && a.actTo !== day.to;
      const dateShort = a.date ? a.date.slice(5) : '—';
      actCol = `
        <div class="col">
          <div class="col-title act-t">📡 实际</div>
          <div class="stat-row"><span class="plan">📅 日期</span><span class="actual">${dateShort}</span></div>
          <div class="stat-row"><span class="plan">📍 起点</span><span class="actual">${esc(a.actFrom || '—')}</span></div>
          <div class="stat-row"><span class="plan">📍 终点</span><span class="actual" ${endMismatch ? 'style="color:var(--red);"' : ''}>${esc(a.actTo || '—')}</span></div>
          <div class="stat-row"><span class="plan">📏 距离</span><span class="actual">${a.distance.toFixed(1)}km</span></div>
          <div class="stat-row"><span class="plan">⬆️ 爬升</span><span class="actual">${a.elevGain}m</span></div>
          <div class="stat-row"><span class="plan">📁 文件</span><span>${esc(a.file)}</span></div>
          ${endMismatch ? `<div class="warn">⚠️ 实际终点≠计划终点（只走了一部分 / 路线有偏差）</div>` : ''}
        </div>`;
    }

    // ── 状态 chip ──
    let statusChip = '';
    if (day.actual) {
      statusChip = day.actual.onTrack === 'ahead' ? '<span class="chip ahead">🟢 超前</span>'
        : day.actual.onTrack === 'behind' ? '<span class="chip behind">🔴 落后</span>'
        : '<span class="chip ontime">🔵 按计划</span>';
    }

    daysHTML += `
    <div class="itinerary-day ${cssClass}" data-day="${day.day}" id="it-day-${day.day}">
      <div class="day-row">
        <div>
          <span class="day-num" style="color:${sectionColor}">Day ${day.day}</span>
          ${day.isRestDay ? '<span class="chip rest">🏕️ 休息</span>' : ''}
          ${day.delayed ? '<span class="chip delay">' + delayLabel(day.delayReason) + '</span>' : ''}
          ${isToday ? '<span class="chip today">今天</span>' : ''}
          ${statusChip}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${APP.isOwner ? '<button class="btn-edit-day" onclick="event.stopPropagation();editItineraryDay(' + day.day + ')" title="编辑行程" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:13px;padding:2px 4px;">✏️</button>' : ''}
          ${APP.isOwner ? (day.delayed
            ? '<span class="delay-pick">' + ['weather','injured','tired','other'].map(r => '<button class="dp-btn' + (day.delayReason === r ? ' on' : '') + '" onclick="event.stopPropagation();toggleDelay(' + day.day + ",'" + r + '\')" title="' + delayLabel(r) + '" style="background:' + (day.delayReason === r ? 'rgba(255,169,77,.3)' : 'none') + ';border:1px solid rgba(255,169,77,.4);color:#FFA94D;cursor:pointer;font-size:13px;padding:2px 4px;line-height:1;border-radius:5px;">' + DELAY_ICON[r] + '</button>').join('') + '</span>'
            : '<button class="btn-edit-day" onclick="event.stopPropagation();toggleDelay(' + day.day + ')" title="标记延误（天气 / 受伤 / 疲惫 / 其他）" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:13px;padding:2px 4px;">☁️</button>'
          ) : ''}
          <span style="font-size:10px;color:var(--text-dim);">${plannedShort}</span>
        </div>
      </div>
      <div class="cols">${planCol}<div class="divider"></div>${actCol}</div>
    </div>`;
  });

  return summaryHTML + startDateBar + toolbarHTML + daysHTML;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ITINERARY ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function editItineraryDay(dayNum) {
  if (!APP.isOwner) return;
  const idx = APP.itinerary.findIndex(d => d.day === dayNum);
  if (idx < 0) return;
  const day = APP.itinerary[idx];
  const sectionColor = sectionColors[day.sectionId - 1] || '#888';

  const card = document.getElementById('it-day-' + dayNum);
  if (!card) return;

  card.innerHTML = `
    <div class="day-row">
      <div>
        <span class="day-num" style="color:${sectionColor}">Day ${day.day}</span>
        <span style="font-size:10px;color:var(--accent);margin-left:6px;">✏️ 编辑中</span>
      </div>
    </div>
    <div class="itineray-edit-form" style="border:none;padding:0;margin-top:6px;">
      <div class="form-row">
        <input type="text" id="edit-from-${dayNum}" value="${day.from.replace(/"/g, '&quot;')}" placeholder="出发地">
        <input type="text" id="edit-to-${dayNum}" value="${day.to.replace(/"/g, '&quot;')}" placeholder="目的地">
      </div>
      <div class="form-row">
        <input type="number" id="edit-dist-${dayNum}" value="${day.plannedDistance}" step="0.1" min="0" placeholder="计划距离(km)">
        <input type="number" id="edit-elevg-${dayNum}" value="${day.plannedElevGain}" step="10" min="0" placeholder="爬升(m)">
      </div>
      <div class="form-row">
        <input type="number" id="edit-elevl-${dayNum}" value="${day.plannedElevLoss}" step="10" min="0" placeholder="下降(m)">
        <input type="number" id="edit-hours-${dayNum}" value="${day.plannedHours}" step="0.5" min="1" placeholder="预计用时(h)">
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="btn-sm" style="background:rgba(63,185,80,0.15);border-color:rgba(63,185,80,0.3);flex:1;" onclick="event.stopPropagation();saveItineraryDay(${dayNum})">💾 保存</button>
        <button class="btn-sm" style="flex:1;" onclick="event.stopPropagation();cancelEditDay(${dayNum})">✕ 取消</button>
      </div>
    </div>`;
}

function saveItineraryDay(dayNum) {
  if (!APP.isOwner) return;
  const idx = APP.itinerary.findIndex(d => d.day === dayNum);
  if (idx < 0) return;

  const day = APP.itinerary[idx];
  const fromEl = document.getElementById('edit-from-' + dayNum);
  const toEl = document.getElementById('edit-to-' + dayNum);
  const distEl = document.getElementById('edit-dist-' + dayNum);
  const elevGEl = document.getElementById('edit-elevg-' + dayNum);
  const elevLEl = document.getElementById('edit-elevl-' + dayNum);
  const hoursEl = document.getElementById('edit-hours-' + dayNum);

  day.from = (fromEl?.value?.trim() || day.from);
  day.to = (toEl?.value?.trim() || day.to);
  day.plannedDistance = parseFloat(distEl?.value) || day.plannedDistance;
  day.plannedElevGain = parseInt(elevGEl?.value) || day.plannedElevGain;
  day.plannedElevLoss = parseInt(elevLEl?.value) || day.plannedElevLoss;
  day.plannedHours = parseFloat(hoursEl?.value) || day.plannedHours;

  saveItinerary();
  if (APP.activeTab === 'itinerary') openPanel('itinerary');
}

function cancelEditDay(dayNum) {
  // Just re-render the panel
  if (APP.activeTab === 'itinerary') openPanel('itinerary');
}

// 手动标记某天为「延误」（原因：天气/受伤/疲惫/其他）。计划日不变（不顺延后续）；
// 延误那天计入「落后」统计。reason 指定则从该原因切换（已是该原因则取消），不指定则 toggle 默认 'other'。
function toggleDelay(dayNum, reason) {
  if (!APP.isOwner) return;
  const day = APP.itinerary.find(d => d.day === dayNum);
  if (!day) return;
  if (reason) {
    day.delayed = !(day.delayed && day.delayReason === reason);
    if (day.delayed) day.delayReason = reason;
  } else {
    day.delayed = !day.delayed;
    if (day.delayed && !day.delayReason) day.delayReason = 'other';
  }
  saveItinerary();
  if (APP.activeTab === 'itinerary') openPanel('itinerary');
}

  function saveItinerary() {
    try {
      localStorage.setItem('ght_itinerary', JSON.stringify(APP.itinerary));
      localStorage.setItem('ght_itinerary_start', APP.itineraryStartDate || '');
    } catch(e) {}
    scheduleShare();   // 日程变更同步到共享包（防抖）
  }

// 设置出发日期：自动推算每日计划日程，并用于「快/慢/按计划」判定
function setItineraryStartDate(v) {
  APP.itineraryStartDate = v || null;
  saveItinerary();
  // 主人态：同步出发日期到服务端配置
  if (APP.isOwner) {
    API.putConfig({ itineraryStartDate: APP.itineraryStartDate }).catch(() => {});
  }
  // 重渲染当前面板以刷新日期显示（renderItinerary 会重跑 matchItineraryToActuals）
  openPanel(APP.activeTab || 'progress');
}

// Persist parsed day-segments (lightweight) so 重新生成 can rebuild itinerary
// 抽稀轨迹点：保留首/尾点，中间按步长均匀采样，单日上限 maxPts，兼顾地图渲染与存储体积
function slimTrackPoints(points, maxPts) {
  if (!points || points.length <= maxPts) return points;
  const stride = Math.ceil(points.length / maxPts);
  const out = [];
  for (let i = 0; i < points.length; i += stride) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function persistPresetSegments(valid) {
  const build = (segs, maxPts) => segs.map(s => {
    const stats = calculateGPXStats({ trackPoints: s.trackPoints }) || {};
    const tp = s.trackPoints || [];
    return {
      dayNum: s.dayNum,
      stats: { distance: stats.distance, elevGain: stats.elevGain, elevLoss: stats.elevLoss, maxElev: stats.maxElev, minElev: stats.minElev },
      startPt: tp[0] || null,
      endPt: tp[tp.length - 1] || null,
      trackPoints: slimTrackPoints(tp, maxPts),
      waypoints: (s.waypoints || []).map(w => ({ lat: w.lat, lon: w.lon, name: w.name, desc: w.desc, _type: w._type }))
    };
  });
  try {
    localStorage.setItem('ght_preset_segments', JSON.stringify(build(valid, 200)));
  } catch(e) {
    // 配额超限：进一步抽稀轨迹点后重试，确保路线与标注点池不丢失
    try { localStorage.setItem('ght_preset_segments', JSON.stringify(build(valid, 60))); }
    catch(e2) {}
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION CLICK HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function bindSectionClickHandlers() {
  document.querySelectorAll('.section-item').forEach(el => {
    el.addEventListener('click', () => {
      const secId = parseInt(el.dataset.section);
      if (secId !== APP.currentSection) {
        APP.currentSection = secId;
        updateCurrentPosition();
        if (APP.presetTrack && APP.sectionRanges && APP.sectionRanges[secId - 1]) {
          const range = APP.sectionRanges[secId - 1];
          const tp = APP.presetTrack.trackPoints;
          if (tp && tp[range.startIndex]) {
            map.flyTo([tp[range.startIndex].lat, tp[range.startIndex].lon], 10, { duration: 1.5 });
          }
        } else if (ghtSections[secId - 1]) {
          const sec = ghtSections[secId - 1];
          map.flyTo([sec.trail[0][0], sec.trail[0][1]], 10, { duration: 1.5 });
        }
        const content = document.getElementById('sidebarContent');
        if (APP.activeTab === 'progress') content.innerHTML = renderProgress();
        updateProgressDOM();
        // 显示该路段的标注点（默认不显示，按需加载）
        showSectionWaypoints(secId);
        bindSectionClickHandlers();
      }
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HAVERSINE DISTANCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLam = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam/2) * Math.sin(dLam/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

