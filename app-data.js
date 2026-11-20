
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DATA: Nepal Provinces (real GeoJSON from OSM, Douglas-Peucker simplified)
//  Loaded from nepal-provinces.js → nepalProvinceData
//  Data source: github.com/Acesmndr/nepal-geojson (MIT License)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const nepalProvinces = nepalProvinceData;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DATA: GHT Sections (10 sections, East → West)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 13-region entry anchors (GHT corridor, east → west) ──
// Each anchor = where the track CROSSES INTO that region from the previous one.
// Calibrated against region-maps/*_detail.png territorial boundaries so each
// segment captures a visually distinct portion of the route.
// Anchors recomputed from the REAL 80-day GPS track (47,479 pts / 1,602 km).
// Each value is a point DEEP INSIDE that region's territory (the first track point of
// the region's MID-day), NOT a boundary. Reason: the old "entry-day" anchors sat on
// boundary points that the looping Kanchenjunga trail revisits — e.g. the K→M boundary
// [27.66,87.9359] is visited both at the start of Day 7 AND Day 12 (the trail returns to
// the exact same spot), so a global "nearest track point" snapped Makalu to Day 1 and
// pushed Kanchenjunga downstream — putting Makalu BEFORE Kanchenjunga. Center anchors
// are never revisited, so the per-point Voronoi assignment (see calculateSectionRanges)
// resolves every region correctly. Verified order on real GPS:
//   kanchenjunga(d1) → makalu(d12) → everest(d18) → rolwaling(d30) → langtang(d38)
//   → ganesh(d46) → manaslu(d48) → annapurna(d58) → dolpo(d63) → mugu(d68)
//   → humla(d72) → bajhang(d77) → darchula(d86)
const REGION_ENTRIES = {
  'kanchenjunga': [27.55, 87.78],      // GHT路径中点(Tamor河谷/Taplejung走廊), 参考KCA公园中心[27.72,87.93]
  'makalu':       [27.72, 87.12],      // GHT路径中点(Barun河谷, Makalu BC≈[27.89,87.09])
  'everest':      [27.82, 86.52],      // GHT路径质心(西移使makalu-everest界落到~86.82°E=Amphu Laptsa西侧, 三垭口全归马卡鲁)
  'rolwaling':    [27.7983, 86.1402],   // center of Rolwaling
  'langtang':     [28.0427, 85.7134],   // center of Langtang
  'ganesh':       [28.1635, 85.3370],   // center of Ganesh
  'manaslu':      [28.1969, 84.8222],   // center of Manaslu
  'annapurna':    [28.6341, 84.4710],   // center of Annapurna
  'dolpo':        [28.8161, 83.8638],   // center of Dolpo
  'mugu':         [29.1871, 83.2979],   // center of Mugu
  'humla':        [29.5197, 82.8649],   // center of Humla
  'bajhang':      [29.7114, 82.0920],   // center of Bajhang
  'darchula':     [29.7959, 81.0048]    // center of Darchula
};
(window.GHT_SECTIONS || []).forEach(r => { if (!r.entry && REGION_ENTRIES[r.id]) r.entry = REGION_ENTRIES[r.id]; });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 13-region territory polygons (simplified, [lat, lon]) ──
// Used to draw semi-transparent "territory" fills on the homepage map so the
// track's colored line segments sit inside recognizable region areas — matching
// the 2D territory depiction of the sections page index images. Coordinates are
// geographically approximate outlines of each trekking region (east → west).
const ghtSections = [
  {
    id: 1, name: '干城章嘉段', nameEn: 'Kanchenjunga', province: 'koshi',
    days: '14-18天', distance: 180, maxElev: 5140,
    mainPass: { name: 'Mirgin La', elev: 5140 },
    startPoint: 'Taplejung (1,820m)',
    highlights: ['干城章嘉峰南北大本营', '杜鹃花森林', '林布族村庄'],
    trail: [[27.35,87.95],[27.45,87.85],[27.55,87.75],[27.6,87.7],[27.7,87.65],[27.8,87.6]]
  },
  {
    id: 2, name: '马卡鲁-巴润段', nameEn: 'Makalu-Barun', province: 'koshi',
    days: '12-16天', distance: 160, maxElev: 4850,
    mainPass: { name: 'Tutu La', elev: 4850 },
    startPoint: 'Num (1,560m)',
    highlights: ['马卡鲁-巴润国家公园', '阿润河谷', '世界级生物多样性'],
    trail: [[27.6,87.7],[27.65,87.45],[27.7,87.25],[27.75,87.05],[27.8,86.85],[27.85,86.7]]
  },
  {
    id: 3, name: '珠峰-昆布段', nameEn: 'Everest-Khumbu', province: 'koshi',
    days: '12-18天', distance: 150, maxElev: 5535,
    mainPass: { name: 'Kongma La', elev: 5535 },
    startPoint: 'Lukla (2,860m)',
    highlights: ['三垭口穿越', '珠峰大本营支线', '昆布冰川'],
    trail: [[27.85,86.7],[27.9,86.55],[27.95,86.4],[28.0,86.3]]
  },
  {
    id: 4, name: '若瓦岭段', nameEn: 'Rolwaling', province: 'bagmati',
    days: '10-14天', distance: 130, maxElev: 5755,
    mainPass: { name: 'Tashi Lapcha', elev: 5755 },
    startPoint: 'Beding (3,690m)',
    highlights: ['Tashi Lapcha垭口', '若瓦岭秘境山谷', '冰川穿越'],
    trail: [[28.0,86.3],[28.05,86.2],[28.1,86.1],[28.1,86.0],[28.15,85.85]]
  },
  {
    id: 5, name: '郎当-戈赛昆达段', nameEn: 'Langtang-Gosaikunda', province: 'bagmati',
    days: '12-15天', distance: 140, maxElev: 5122,
    mainPass: { name: 'Tserko Ri', elev: 5122 },
    startPoint: 'Syabrubesi (1,460m)',
    highlights: ['戈赛昆达圣湖群', '塔芒文化遗产步道', '郎当国家公园'],
    trail: [[28.15,85.85],[28.2,85.6],[28.25,85.4],[28.3,85.15]]
  },
  {
    id: 6, name: '马纳斯鲁-楚姆段', nameEn: 'Manaslu-Tsum', province: 'gandaki',
    days: '14-18天', distance: 160, maxElev: 5160,
    mainPass: { name: 'Larkya La', elev: 5160 },
    startPoint: 'Arughat (570m)',
    highlights: ['马纳斯鲁峰环绕', '楚姆山谷藏传佛教', 'Larkya La垭口'],
    trail: [[28.3,85.15],[28.35,84.9],[28.4,84.7]]
  },
  {
    id: 7, name: '安纳普尔纳段', nameEn: 'Annapurna', province: 'gandaki',
    days: '14-20天', distance: 170, maxElev: 5416,
    mainPass: { name: 'Thorong La', elev: 5416 },
    startPoint: 'Besisahar (820m)',
    highlights: ['Thorong La垭口', '木斯塘边境', '马南高海拔荒漠'],
    trail: [[28.4,84.7],[28.5,84.5],[28.6,84.3],[28.7,84.1]]
  },
  {
    id: 8, name: '道拉吉里-多尔普东段', nameEn: 'Dhaulagiri-Dolpo East', province: 'gandaki',
    days: '15-20天', distance: 170, maxElev: 5860,
    mainPass: { name: 'Jungben La', elev: 5860 },
    startPoint: 'Marpha (2,670m)',
    highlights: ['道拉吉里峰群', 'Jungben La垭口', '偏远露营路段'],
    trail: [[28.7,84.1],[28.8,83.9],[28.9,83.7],[29.0,83.5]]
  },
  {
    id: 9, name: '多尔普-胡姆拉段', nameEn: 'Dolpo-Humla West', province: 'karnali',
    days: '18-25天', distance: 200, maxElev: 6146,
    mainPass: { name: 'Kagmara La', elev: 6146 },
    startPoint: 'Dunai (2,140m)',
    highlights: ['全路线最高垭口 Kagmara La', '多尔普秘境', '最极端路段'],
    trail: [[29.0,83.5],[29.2,83.2],[29.4,82.9],[29.6,82.6],[29.8,82.2]]
  },
  {
    id: 10, name: '胡姆拉-西米科特段', nameEn: 'Humla-Simikot', province: 'sudurpashchim',
    days: '10-14天', distance: 120, maxElev: 4620,
    mainPass: { name: 'Nara La', elev: 4620 },
    startPoint: 'Simikot (2,910m)',
    highlights: ['Nara La垭口', '苯教传统文化', '远西秘境'],
    trail: [[29.8,82.2],[29.9,81.9],[29.95,81.6],[30.0,81.3]]
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  KEY POINTS OF INTEREST
//  说明：住宿点(营地)/垭口等标注点不再硬编码写死，
//  全部来自「导入的预设轨迹 GPX」中的 wpt 标注（见 renderAllTracks / renderSections）。
//  重置数据后可被彻底清空，不会出现残留的写死数据点。
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BUILD ITINERARY FROM SEGMENTED GPX
//  Each uploaded day-segment GPX writes its own schedule row
//  (distance / gain / loss from track points, camp names from waypoints)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function fmtCoordLabel(pt) {
  if (!pt) return '—';
  const la = pt.lat >= 0 ? pt.lat.toFixed(2) + '°N' : (-pt.lat).toFixed(2) + '°S';
  const lo = pt.lon >= 0 ? pt.lon.toFixed(2) + '°E' : (-pt.lon).toFixed(2) + '°W';
  return la + ', ' + lo;
}

// Nearest waypoint label to a point (within maxDist meters). Prefers camps.
// 改进：① 跳过「无名标注」(空 desc/name)，避免最近的标注却无名、被当成未匹配而回退到坐标泄露；
//       ② 软回退：略超 maxDist(≤2×) 仍取最近命名点，覆盖某些营地标注略偏远的场景。
function nearestWaypointLabel(waypoints, pt, maxDist) {
  if (!waypoints || !waypoints.length || !pt) return null;
  let best = null, bestD = Infinity, bestCamp = null, bestCampD = Infinity;
  waypoints.forEach(w => {
    const nm = (w.desc || w.name || '').trim();
    if (!nm) return;                        // 跳过无名标注，杜绝「最近却无名」触发坐标泄露
    const d = haversine(pt.lat, pt.lon, w.lat, w.lon);
    if (d < bestD) { bestD = d; best = w; }
    if (w._type === 'camp' && d < bestCampD) { bestCampD = d; bestCamp = w; }
  });
  const chosen = bestCamp || best;
  if (!chosen) return null;
  const chosenD = bestCamp ? bestCampD : bestD;
  const label = (chosen.desc || chosen.name || '').trim();
  if (chosenD <= maxDist) return label;
  if (chosenD <= maxDist * 2) return label;   // 软回退：略超出阈值也取最近命名点
  return null;
}

// 坐标泄露防护：某点附近无命名标注时，回退到「区域名+营地」而非裸坐标
// （如 27.86°N 86.92°E 这类裸坐标出现在行程/实际轨迹面板，既不美观也无信息量）。
function friendlyPointLabel(pt) {
  if (!pt) return '—';
  const sec = sectionForPoint(pt);
  if (sec && sec.regionZh) return (currentLang === 'en' ? (sec.regionEn || sec.regionZh) : sec.regionZh) + (currentLang === 'en' ? ' Camp' : '营地');
  return fmtCoordLabel(pt);                 // 仅极端无预设场景才退回裸坐标
}

// Which 13-region a point is closest to (by entry anchor)
function findParkIndexForPoint(lat, lon) {
  let best = -1, bestD = Infinity;
  (window.GHT_SECTIONS || []).forEach((p, i) => {
    if (!p.entry) return;
    const d = haversine(lat, lon, p.entry[0], p.entry[1]);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// 行程/日志的路段归属：与地图保持一致 —— 按预设轨迹几何(东→西强制顺序)判定，
// 而非「起点离哪个锚点最近」(那种方式在路段边界会把第一天错判成马卡鲁)。
// 做法：在预设轨迹上找离该点最近的点索引，定位其所属 sectionRange 后返回该 range。
// 若无预设轨迹则退回旧的最近锚点逻辑(此时行程本就无从生成，影响极小)。
function sectionForPoint(pt) {
  if (!pt) return null;
  const ranges = (APP.sectionRanges && APP.sectionRanges.length)
    ? APP.sectionRanges
    : (APP.presetTrack ? calculateSectionRanges(APP.presetTrack) : []);
  if (!ranges.length) {
    const fi = findParkIndexForPoint(pt.lat, pt.lon);
    return fi >= 0 && window.GHT_SECTIONS[fi]
      ? { sectionId: fi + 1, regionZh: window.GHT_SECTIONS[fi].zh, regionId: window.GHT_SECTIONS[fi].id }
      : null;
  }
  const pts = APP.presetTrack ? APP.presetTrack.trackPoints : null;
  if (pts && pts.length) {
    let best = Infinity, bi = -1;
    const step = Math.max(1, Math.floor(pts.length / 500));
    for (let i = 0; i < pts.length; i += step) {
      const d = haversine(pt.lat, pt.lon, pts[i].lat, pts[i].lon);
      if (d < best) { best = d; bi = i; }
    }
    if (bi >= 0) {
      for (const r of ranges) {
        if (bi >= r.startIndex && bi <= r.endIndex) return r;
      }
      // 落在区间缝隙：在 bi 附近窗口扫描「真实轨迹点」，取地理最近者所属 range。
      // 旧逻辑用 range 中点回退，会把紧邻东段缝隙的点误判到最东区域；窗口最近点可正确归属到相邻段。
      let bestI = bi, bestD = best;
      const lo = Math.max(0, bi - 40), hi = Math.min(pts.length - 1, bi + 40);
      for (let i = lo; i <= hi; i++) {
        const d = haversine(pt.lat, pt.lon, pts[i].lat, pts[i].lon);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      for (const r of ranges) {
        if (bestI >= r.startIndex && bestI <= r.endIndex) return r;
      }
      // 极端情况仍不在任何 range：退回最近锚点（与无预设轨迹分支一致）
      const fi = findParkIndexForPoint(pt.lat, pt.lon);
      if (fi >= 0 && window.GHT_SECTIONS[fi]) {
        return { sectionId: fi + 1, regionZh: window.GHT_SECTIONS[fi].zh, regionId: window.GHT_SECTIONS[fi].id };
      }
      return ranges[0];
    }
  }
  return null;
}

// 判断标注点是否靠近某段轨迹（用于把相邻文件中的营地/垭口正确归属到那一天）
function ptNearSegment(wpt, pts, radius) {
  if (!wpt || !pts || !pts.length) return false;
  const step = Math.max(1, Math.floor(pts.length / 60));
  for (let i = 0; i < pts.length; i += step) {
    if (haversine(wpt.lat, wpt.lon, pts[i].lat, pts[i].lon) <= radius) return true;
  }
  return false;
}

// 标注点到某段轨迹的最小距离（米）——用于「垭口只归属离它最近的那天」
function minDistToSegment(wpt, pts) {
  if (!wpt || !pts || !pts.length) return Infinity;
  const step = Math.max(1, Math.floor(pts.length / 60));
  let min = Infinity;
  for (let i = 0; i < pts.length; i += step) {
    const d = haversine(wpt.lat, wpt.lon, pts[i].lat, pts[i].lon);
    if (d < min) min = d;
  }
  return min;
}

// Build itinerary array from parsed day-segments
function buildItineraryFromSegments(valid, restDays) {
  const days = [];

  // 全局标注点池：合并所有分段的 waypoint。
  // 某些天的营地/垭口标注可能存放在相邻日文件中（如 day9 的营地在 day7/day10 文件里，
  // 而 day9 自身文件无 waypoint），仅用当天文件内的 waypoint 会导致落脚点/垭口名称缺失。
  // 因此统一从全局池匹配，让每个落脚点都能正确归属到对应的一天。
  const allWpts = [];
  valid.forEach(seg => { (seg.waypoints || []).forEach(w => allWpts.push(w)); });
  APP.allWpts = allWpts;   // 全局标注点池：实际轨迹起点/终点映射到最近地名时使用

  let firstDayNum = Infinity;
  valid.forEach(seg => {
    if (seg.dayNum != null && seg.dayNum < firstDayNum) firstDayNum = seg.dayNum;
  });

  const dayTracks = [];  // 收集每天的轨迹，用于垭口的「最近日」精确归属
  valid.forEach(seg => {
    const pts = seg.trackPoints || [];
    if (!pts || pts.length < 2) return;
    // 刷新后分段为抽稀存储，优先用预存 stats 保证距离/爬升精确
    const stats = seg.stats || calculateGPXStats({ trackPoints: pts });

    const startPt = seg.startPt || pts[0];
    const endPt = seg.endPt || pts[pts.length - 1];
    const isFirstDay = (seg.dayNum != null && seg.dayNum === firstDayNum);
    const fromName = isFirstDay
      ? (APP.startPlaceName || '起点')
      : (nearestWaypointLabel(allWpts, startPt, 6000) || friendlyPointLabel(startPt));
    const toName = nearestWaypointLabel(allWpts, endPt, 6000)
      || friendlyPointLabel(endPt);

    const sec = sectionForPoint(startPt);

    days.push({
      day: seg.dayNum,
      sectionId: sec ? sec.sectionId : 0,
      sectionName: sec ? sec.regionZh : '',
      from: fromName,
      to: toName,
      fromLat: startPt ? startPt.lat : null,
      fromLon: startPt ? startPt.lon : null,
      // 独立的「当天真实起点坐标」：天际衔接逻辑(line 1618+)会覆盖 fromLat/Lon，
      // 但区域归类必须永远基于当天自己的真实起点，故用 origStart* 隔离存储，不被污染。
      origStartLat: startPt ? startPt.lat : null,
      origStartLon: startPt ? startPt.lon : null,
      toLat: endPt ? endPt.lat : null,
      toLon: endPt ? endPt.lon : null,
      plannedDistance: Math.round(stats.distance * 100) / 100,
      plannedHours: Math.max(3, Math.round((stats.distance / 2.2) * 10) / 10),
      plannedElevGain: stats.elevGain,
      plannedElevLoss: stats.elevLoss,
      maxElev: stats.maxElev,
      minElev: stats.minElev,
      passes: [],   // 垭口在下方统一按「最近日」精确归属后回填
      // 预设轨迹只作为「计划路线」写入行程安排；actual 不在此写入。
      // 真正的「已记录 / 已完成」只在用户上传实际徒步轨迹（addActualTrack）后，
      // 由 matchItineraryToActuals() 同步填充。
      actual: null
    });
    dayTracks.push({ dayNum: seg.dayNum, pts });
  });

  // 垭口精确归属：每个垭口只挂到「轨迹离它最近的那一天」（取最小距离，
  // 而非「3km 内全要」），并按名称去重——避免密集垭口区同一垭口在相邻多天重复显示，
  // 也避免 GPX 中同名重复标注点（如英文+尼泊尔文）造成重复。
  const allPasses = allWpts.filter(w => w._type === 'pass');
  const passByDay = {};
  allPasses.forEach(pass => {
    let bestDay = null, bestD = Infinity;
    dayTracks.forEach(dt => {
      const d = minDistToSegment(pass, dt.pts);
      if (d < bestD) { bestD = d; bestDay = dt.dayNum; }
    });
    if (bestDay != null && bestD <= 8000) {
      (passByDay[bestDay] = passByDay[bestDay] || new Set());
      const nm = (pass.desc || pass.name || '').trim();
      if (nm) passByDay[bestDay].add(nm);
    }
  });
  days.forEach(d => { if (passByDay[d.day]) d.passes = Array.from(passByDay[d.day]); });

  // Rest days (missing day numbers) — no walking
  (restDays || []).forEach(rd => {
    days.push({
      day: rd,
      sectionId: 0,
      sectionName: '',
      from: '🏕️ 休息日',
      to: '🏕️ 休息日',
      // 休息日无当天轨迹起点，origStart 回退到衔接后的 fromLat/Lon（即停留地坐标），归类仍正确
      origStartLat: null,
      origStartLon: null,
      plannedDistance: 0,
      plannedHours: 0,
      plannedElevGain: 0,
      plannedElevLoss: 0,
      passes: [],
      isRestDay: true,
      actual: null
    });
  });

  days.sort((a, b) => a.day - b.day);

  // 链路衔接：每天的起点 = 上一天的终点（连续徒步，营地依次衔接）
  // 休息日：停留于「休息的前一天」的终点（起点数据追溯到休息的前一天）
  let prevEnd = null;
  let prevEndLat = null, prevEndLon = null;
  let prevDayNum = null;
  days.forEach(d => {
    if (d.isRestDay) {
      // 休息日起点 = 上一天（即休息的前一天）的终点
      if (prevEnd != null) {
        d.from = prevEnd;
        d.to = prevEnd;
        d._linked = true;
        d._traceFromDay = prevDayNum;   // 记录追溯到第几天，用于界面显式标注
        d.fromLat = d.toLat = prevEndLat;
        d.fromLon = d.toLon = prevEndLon;
      }
      // prevEnd 保持不变（仍在原地休整）
    } else {
      if (prevEnd != null) { d.from = prevEnd; d._linked = true; d.fromLat = prevEndLat; d.fromLon = prevEndLon; }  // 当天起点 = 上一天终点
      prevEnd = d.to;                                         // 记录当天终点供下一天衔接
      prevEndLat = d.toLat; prevEndLon = d.toLon;
      prevDayNum = d.day;
    }
  });

  return days;
}

// Apply segmented itinerary (only for batch preset upload)
function applySegmentItinerary(valid, restDays) {
  const it = buildItineraryFromSegments(valid, restDays);
  if (it.length) {
    APP.itinerary = it;
    saveItinerary();
    return true;
  }
  return false;
}

// 时区安全的 YYYY-MM-DD（按本地日历，避免 toISOString 的 UTC 偏移导致跨天错位）
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// 尼泊尔时区固定 UTC+5:45。GPX 时间戳为 UTC（手机在尼泊尔记录后存成 UTC），
// 徒步实际发生的「当天」应按尼泊尔当地日历判定，与「在哪里打开网页」无关。
// 做法：把 UTC 瞬时推到尼泊尔时区（+5:45）后读其 UTC 分量 = 尼泊尔当地日历日期。
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
function fmtNepalDate(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  const nepal = new Date(dt.getTime() + NEPAL_OFFSET_MS);
  const y = nepal.getUTCFullYear();
  const m = String(nepal.getUTCMonth() + 1).padStart(2, '0');
  const day = String(nepal.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getItineraryDate(dayNum) {
  const day = APP.itinerary.find(d => d.day === dayNum);
  if (day && day.date) return day.date;
  return getPlannedDate(dayNum);
}

// 计划日期 = 出发日 + (天数-1)。
// 注意：不再因天气延误 / 休息而整体顺延后续计划日 —— 补走路线由 matchItineraryToActuals
// 的「路线槽映射」体现（补走落在原日历天，显示日 ≠ 原计划日时打「补走」标签）。
function getPlannedDate(dayNum) {
  if (!APP.itineraryStartDate) return null;
  const d = new Date(APP.itineraryStartDate + 'T00:00:00');
  d.setDate(d.getDate() + dayNum - 1);
  return fmtDate(d);
}

// 已上传实际轨迹的累计爬升总和（各条 elevGain 求和，与上传顺序无关）
function getCumulativeElevGain() {
  let g = 0;
  (APP.actualTracks || []).forEach(t => { if (t.elevGain) g += t.elevGain; });
  return g;
}

// 两个 YYYY-MM-DD 相差天数（a - b）
function dayDiff(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function matchItineraryToActuals() {
  if (!APP.itinerary.length) return;

  // 仅在存在独立实际轨迹时重置 actual；
  // 若没有（批量导入的分段本身即已记录），保留 buildItineraryFromSegments 内嵌的 actual
  if (APP.actualTracks.length) {
    APP.itinerary.forEach(day => { day.actual = null; day.date = null; });
  }

  // 实际轨迹按「文件名 dayNum」字面定位到对应计划日；实际栏如实显示，不做任何补走/超前/拆分猜测。
  const sortedTracks = [...APP.actualTracks].sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    return (a.dayNum || 0) - (b.dayNum || 0);
  });

  // ── 实际轨迹按文件名 dayNum 字面挂回对应计划日；实际栏如实显示，不做任何补走/超前/拆分猜测 ──
  const wpts = APP.allWpts || [];
  const dayByNum = {};
  APP.itinerary.forEach(d => { dayByNum[d.day] = d; });

  const offsets = [];
  const unmatched = [];
  sortedTracks.forEach((track) => {
    if (!track.distance) return;
    const day = track.dayNum != null ? dayByNum[track.dayNum] : null;
    if (!day) { unmatched.push(track); return; }   // 文件名无法对应计划日：保留原样，不强行猜测

    // 实际轨迹真实起点/终点（按导入 GPS 点推导，映射到最近地名；无地名则显示坐标）
    const pts = track.trackPoints || [];
    const startPt = pts[0] || null;
    const endPt = pts.length ? pts[pts.length - 1] : null;
    const actFrom = startPt ? (nearestWaypointLabel(wpts, startPt, 6000) || friendlyPointLabel(startPt)) : '—';
    const actTo = endPt ? (nearestWaypointLabel(wpts, endPt, 6000) || friendlyPointLabel(endPt)) : '—';

    day.actual = {
      distance: track.distance,
      elevGain: track.elevGain,
      elevLoss: track.elevLoss,
      durationStr: track.durationStr,
      avgSpeed: track.avgSpeed,
      startTime: track.startTime,
      endTime: track.endTime,
      date: track.date || null,
      actFrom, actTo,
      actStartLat: startPt ? startPt.lat : null,
      actStartLon: startPt ? startPt.lon : null,
      actEndLat: endPt ? endPt.lat : null,
      actEndLon: endPt ? endPt.lon : null,
      file: track.name || ('day' + (track.dayNum != null ? String(track.dayNum).padStart(2, '0') : '?')),
      onTrack: null
    };

    if (track.date) {
      const planned = getPlannedDate(day.day);
      if (planned) {
        const dd = dayDiff(track.date, planned);
        day.actual.onTrack = dd < 0 ? 'ahead' : dd > 0 ? 'behind' : 'on-track';
        offsets.push(dd);
      }
    }
  });

  // ── 整体滑移（众数偏移）→ 顶部「整体晚/快 N 天」汇总 ──
  APP._overallSlip = 0;
  if (offsets.length) {
    const freq = {};
    offsets.forEach(o => freq[o] = (freq[o] || 0) + 1);
    let best = 0, bestF = 0;
    Object.keys(freq).forEach(k => {
      const v = +k;
      if (freq[k] > bestF || (freq[k] === bestF && Math.abs(v) > Math.abs(best))) { best = v; bestF = freq[k]; }
    });
    APP._overallSlip = best;
  }
  APP._unmatchedActual = unmatched;

  // 注：day.date 在此保持为 null（或初始值），由 getItineraryDate() 统一 fallback 到
  // 计划日（getPlannedDate）。实际 GPS 日期仅在卡片内以 day.actual.date 对照显示，
  // 用于「晚/快 N 天」判定，不污染「计划行程」的日期列。
}

// 将分日轨迹文件作为「已记录的每日 GPS」载入，
// 使行程安排的「已记录 / 已完成」能反映上传的分日文件（而非仅为计划路线）。
function getItinerarySummary() {
  if (!APP.itinerary.length) return null;

  const totalDays = APP.itinerary.length;
  const daysWithData = APP.itinerary.filter(d => d.actual).length;
  const plannedTotal = APP.itinerary.reduce((s, d) => s + d.plannedDistance, 0);
  let actualTotal = 0, elevGainTotal = 0;
  APP.itinerary.forEach(d => {
    if (d.actual) { actualTotal += d.actual.distance; elevGainTotal += d.actual.elevGain; }
  });

  const delayedDays = APP.itinerary.filter(d => d.delayed).length;
  const aheadDays = APP.itinerary.filter(d => d.actual && !d.delayed && d.actual.onTrack === 'ahead').length;
  const behindDays = APP.itinerary.filter(d => (d.actual && !d.delayed && d.actual.onTrack === 'behind') || d.delayed).length;
  const onTrackDays = APP.itinerary.filter(d => d.actual && !d.delayed && d.actual.onTrack === 'on-track').length;

  // Find today（按轨迹自动推算的日期判断，无需手动设定出发日）
  let todayIdx = -1;
  const today = fmtNepalDate(new Date());
  for (let i = 0; i < APP.itinerary.length; i++) {
    if (APP.itinerary[i].date === today) { todayIdx = i; break; }
  }

  return { totalDays, daysWithData, plannedTotal: Math.round(plannedTotal), actualTotal: Math.round(actualTotal * 10) / 10, elevGainTotal, aheadDays, behindDays, onTrackDays, todayIdx };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  APP STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const APP = {
  currentSection: 1,
  activeTab: 'progress',
  isOwner: false,
  presetTrack: null,
  presetRestDays: [],
  actualTracks: [],
  currentPosition: null,
  totalDistance: 1580,
  completedDistance: 0,
  progressPercentage: 0,
  progressPct: 0,
  sectionRanges: null,
  hikingPersonMarker: null,
  logEntries: [],
  itinerary: [],
  itineraryStartDate: null,
  startPlaceName: 'Phungling',
  gpxResultHTML: '',
  gpxDistance: 0,
  gpxElevGain: 0,
  gpxElevLoss: 0,
  lastGPXData: null,
  loaderTimeout: null,
};

