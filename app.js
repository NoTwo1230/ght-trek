
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
  if (sec && sec.regionZh) return sec.regionZh + '营地';
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAP INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  I18N (中文 / English)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let currentLang = (function(){ try { return localStorage.getItem('ght_lang') || 'zh'; } catch(e){ return 'zh'; } })();
const I18N = {
  zh: {
    'nav.dashboard': '仪表盘', 'nav.sections': '路段', 'nav.itinerary': '行程', 'nav.datamgmt': '数据管理',
    'nav.itinerary.full': '行程对比', 'nav.sections.full': '路段', 'nav.journal.full': '日志',
    'nav.itinerary.title': '计划 vs 实际 · 行程对比', 'nav.sections.title': '路段进度 · 按 已完成/进行中/未完成 分组', 'nav.journal.title': '远征日志 · 按路段分组',
    'brand.sub': '大喜马拉雅高线',
    'pos.prefix': '📍 当前位置:',
    'basemap.terrain': '户外图 (Esri 地形 · 默认)', 'basemap.topo': '地形图 (等高线)', 'basemap.dark': '暗色图 (OpenStreetMap)',
    'prog.done': '已完成 km', 'prog.total': '总计 km',
    'st.camp': '当前营地', 'st.area': '所在区域', 'st.elev': '当前海拔', 'st.pass': '下一垭口', 'st.eta': '预计抵达',
    'today.dist': '距离', 'today.gain': '爬升', 'today.loss': '下降', 'today.move': '移动时间', 'today.speed': '均速 km/h', 'today.max': '最高海拔',
    'today.dateLbl': '数据日期：', 'today.nodata': '暂无今日 GPS 数据',
    'ei.from': '出发地', 'ei.total': '总距离', 'ei.recorded': '已记录', 'ei.gain': '累计爬升', 'ei.max': '最高点', 'ei.passes': '垭口 / 营地', 'ei.end': '预计结束',
    'pass.none': '暂无垭口数据', 'pass.soon': '近日', 'pass.seg': '段', 'pass.all': '查看全部路段 →',
    'up.btn': '📤 上传GPS轨迹', 'up.hint': '支持批量多文件 (.gpx/.kml)<br>PeakVisor / Strava / Garmin 均可', 'up.date': '出发日期：', 'up.reset': '🗑️ 重置数据',
    'view.empty': '暂无内容',
    'dm.title': '数据管理', 'dm.pwdHint': '请输入主人密码以管理轨迹数据', 'dm.unlock': '解锁', 'dm.pwdErr': '密码错误', 'dm.connErr': '无法连接服务器（后端未启动？）'
  },
  en: {
    'nav.dashboard': 'Dashboard', 'nav.sections': 'Sections', 'nav.itinerary': 'Itinerary', 'nav.datamgmt': 'Data',
    'nav.itinerary.full': 'Itinerary', 'nav.sections.full': 'Sections', 'nav.journal.full': 'Journal',
    'nav.itinerary.title': 'Planned vs actual · itinerary', 'nav.sections.title': 'Section progress · grouped by done/in-progress/todo', 'nav.journal.title': 'Expedition journal · grouped by section',
    'brand.sub': 'GREAT HIMALAYA TRAIL',
    'pos.prefix': '📍 Current location:',
    'basemap.terrain': 'Terrain (Esri Topo · default)', 'basemap.topo': 'Topographic (Contours)', 'basemap.dark': 'Dark (OpenStreetMap)',
    'prog.done': 'Done km', 'prog.left': 'Left km', 'prog.total': 'Total km',
    'st.camp': 'Current camp', 'st.area': 'Region', 'st.elev': 'Elevation', 'st.pass': 'Next pass', 'st.eta': 'ETA',
    'today.dist': 'Distance', 'today.gain': 'Ascent', 'today.loss': 'Descent', 'today.move': 'Moving time', 'today.speed': 'Avg km/h', 'today.max': 'Max elev',
    'today.dateLbl': 'Data date: ', 'today.nodata': 'No GPS data today',
    'ei.from': 'Start', 'ei.total': 'Total dist', 'ei.recorded': 'Recorded', 'ei.gain': 'Total ascent', 'ei.max': 'Highest point', 'ei.passes': 'Passes / Camps', 'ei.end': 'Est. finish',
    'pass.none': 'No pass data', 'pass.soon': 'Soon', 'pass.seg': 'seg', 'pass.all': 'All sections →',
    'up.btn': '📤 Upload GPS track', 'up.hint': 'Batch upload (.gpx/.kml)<br>PeakVisor / Strava / Garmin supported', 'up.date': 'Start date: ', 'up.reset': '🗑️ Reset data',
    'view.empty': 'No content',
    'dm.title': 'Data Management', 'dm.pwdHint': 'Enter owner password to manage track data', 'dm.unlock': 'Unlock', 'dm.pwdErr': 'Wrong password', 'dm.connErr': 'Cannot reach server (backend down?)'
  }
};
function t(k, def) {
  const tbl = I18N[currentLang];
  if (tbl && tbl[k] != null) return tbl[k];
  if (I18N.zh[k] != null) return I18N.zh[k];
  return def != null ? def : k;
}
function getProvEN(pid) {
  const m = { koshi: 'Koshi', bagmati: 'Bagmati', gandaki: 'Gandaki', lumbini: 'Lumbini', karnali: 'Karnali', sudurpashchim: 'Sudurpashchim' };
  return m[pid] || pid || '—';
}
function getProv(pid) { return currentLang === 'en' ? getProvEN(pid) : getProvZH(pid); }
function applyLang() {
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  const lb = document.querySelector('.lang-btn');
  if (lb) lb.textContent = 'Language ▾';
  document.querySelectorAll('.tn-tab').forEach(el => { el.textContent = t('nav.' + el.dataset.view); });
  const sub = document.querySelector('.brand .sub'); if (sub) sub.textContent = t('brand.sub');
  document.querySelectorAll('.basemap-btn').forEach((el, i) => { el.title = t(['basemap.terrain', 'basemap.topo', 'basemap.dark'][i]); });
  const dm = document.getElementById('btnDataMgmt'); if (dm) dm.textContent = '🔧 ' + t('nav.datamgmt');
  // 顶栏三个外链（行程对比 / 路段 / 日志）此前硬编码中文、未进翻译循环 → 补上 i18n
  const ni = document.getElementById('navItinerary');
  if (ni) { ni.textContent = '📅 ' + t('nav.itinerary.full') + ' ↗'; ni.title = t('nav.itinerary.title'); }
  const ns = document.getElementById('navSections');
  if (ns) { ns.textContent = '🏔️ ' + t('nav.sections.full') + ' ↗'; ns.title = t('nav.sections.title'); }
  const nj = document.getElementById('navJournal');
  if (nj) { nj.textContent = '📝 ' + t('nav.journal.full') + ' ↗'; nj.title = t('nav.journal.title'); }
  const dmt = document.getElementById('dmTitle'); if (dmt) dmt.textContent = t('dm.title');
  const dph = document.getElementById('dmPwdHint'); if (dph) dph.textContent = t('dm.pwdHint');
  const du = document.getElementById('dmUnlock'); if (du) du.textContent = t('dm.unlock');
  const de = document.getElementById('dmPwdErr'); if (de) de.textContent = t('dm.pwdErr');
}
const DELAY_ICON = { weather: '☁️', injured: '🩹', tired: '😴', other: '⚠️' };
function delayLabel(reason) { return t('it.delay.' + (reason || 'other')); }
const _langBtn = document.querySelector('.lang-btn');
if (_langBtn) _langBtn.addEventListener('click', function () {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem('ght_lang', currentLang); } catch(e) {}
  applyLang();
  const active = document.querySelector('.tn-tab.active');
  if (active) showView(active.dataset.view);
});
applyLang();

const map = L.map('map', {
  center: [28.5, 84.0],
  zoom: 7,
  minZoom: 6,
  maxZoom: 16,
  zoomControl: false,
  attributionControl: true
});

// ━━ Basemap layers ━━
const basemaps = {
  topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 13
  }),
  terrain: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri',
    maxZoom: 13
  }),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abcd',
    maxZoom: 13
  })
};
const currentBasemap = { layer: basemaps.terrain };

basemaps.terrain.addTo(map);
currentBasemap.layer = basemaps.terrain;
L.control.zoom({ position: 'bottomleft' }).addTo(map);

// ━━ Fit-to-route control (between zoom and basemap, bottom-left) ━━
const FitViewControl = L.Control.extend({
  options: { position: 'bottomleft' },
  onAdd: function() {
    const div = L.DomUtil.create('div', 'fitview-control');
    const btn = L.DomUtil.create('button', 'fitview-btn', div);
    btn.innerHTML = '🎯';
    btn.title = '全览路线 (Fit to route)';
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.on(btn, 'click', function(e) {
      L.DomEvent.stop(e);
      if (typeof fitRoute === 'function') fitRoute();
    });
    return div;
  }
});
new FitViewControl().addTo(map);

// ━━ Basemap switcher control (top-left, below zoom) ━━
const BasemapSwitcher = L.Control.extend({
  options: { position: 'bottomleft' },
  onAdd: function() {
    const div = L.DomUtil.create('div', 'basemap-switcher');
    const btns = [
      { key: 'terrain', icon: '🗺️', title: t('basemap.terrain') },
      { key: 'topo',    icon: '🥾', title: t('basemap.topo') },
      { key: 'dark',    icon: '🌙', title: t('basemap.dark') }
    ];
    btns.forEach((b, i) => {
      const btn = L.DomUtil.create('button', 'basemap-btn' + (i === 0 ? ' active' : ''), div);
      btn.innerHTML = b.icon;
      btn.title = b.title;
      L.DomEvent.on(btn, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        const newLayer = basemaps[b.key];
        if (currentBasemap.layer === newLayer) return;
        const prevLayer = currentBasemap.layer;
        // 先叠新层于旧层之上；仅当新层真正加载出瓦片后才撤掉旧层。
        // 若新源（如 OpenTopoMap）在网络中拉取失败，会继续显示上一张可用底图而非黑屏。
        map.addLayer(newLayer);
        const onFirstTile = function () {
          if (prevLayer && prevLayer !== newLayer) map.removeLayer(prevLayer);
          newLayer.off('tileload', onFirstTile);
        };
        newLayer.on('tileload', onFirstTile);
        currentBasemap.layer = newLayer;
        // Update active state
        div.querySelectorAll('.basemap-btn').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    return div;
  }
});
new BasemapSwitcher().addTo(map);

L.control.scale({ metric: true, imperial: false, position: 'bottomright', maxWidth: 120 }).addTo(map);

// 13-region territory layer group (prototype style)
const regionLayerGroup = L.layerGroup().addTo(map);
const uploadedTrackGroup = L.layerGroup().addTo(map);
// 标注点图层：默认不加入地图；点开某路段详情时才按需显示该段的标注点
const waypointLayer = L.layerGroup();

// ── 13-region territory layer (prototype style) ──
// 依赖 ght-region-map.js → window.GHT_REGION_MAP { districtToRegion, regions }
(function buildRegionTerritories() {
  const RM = window.GHT_REGION_MAP;
  if (!RM) { console.warn('[region] GHT_REGION_MAP 未加载'); return; }
  const { districtToRegion, regions } = RM;

  function distNameOf(f) {
    const p = f.properties || {};
    return p.DIST_EN || p.DISTRICT || p.district || p.NAME || p.name || '';
  }
  function computeCentroid(geom) {
    let coords = [];
    if (geom.type === 'Polygon') coords = geom.coordinates[0];
    else if (geom.type === 'MultiPolygon') {
      let lg = geom.coordinates[0];
      for (const p of geom.coordinates) { if (p[0].length > lg[0].length) lg = p; }
      coords = lg[0];
    }
    let lat = 0, lon = 0;
    for (const c of coords) { lat += c[1]; lon += c[0]; }
    return [lat / coords.length, lon / coords.length];
  }

  const regionLayers = {};
  const regionDistricts = {};
  for (let i = 1; i <= 13; i++) regionDistricts[i] = { features: [], names: [] };
  const uncolored = [];

  function render(data) {
    (data.features || []).forEach(f => {
      const dname = distNameOf(f);
      const rid = districtToRegion[dname];
      if (rid) {
        f.properties._rid = rid;
        regionDistricts[rid].features.push(f);
        if (dname && regionDistricts[rid].names.indexOf(dname) < 0) regionDistricts[rid].names.push(dname);
      } else {
        f.properties._rid = 0;
        uncolored.push(f);
      }
    });

    // 其余尼泊尔行政区（灰色上下文底）
    if (uncolored.length) {
      L.geoJSON({ type: 'FeatureCollection', features: uncolored }, {
        style: () => ({ color: '#B4B2A9', weight: 0.5, fillColor: '#D3D1C7', fillOpacity: 0.18 })
      }).addTo(regionLayerGroup);
    }

    for (let i = 1; i <= 13; i++) {
      const r = regions[i];
      const rd = regionDistricts[i];
      if (!r || !rd.features.length) continue;
      const layer = L.geoJSON({ type: 'FeatureCollection', features: rd.features }, {
        style: () => ({ color: r.stroke, weight: 1, fillColor: r.color, fillOpacity: 0.5 }),
        onEachFeature: (f, lyr) => {
          const dname = distNameOf(f);
          lyr.bindTooltip(
            i + '. ' + r.zh + ' (' + r.en + ')\n' + r.park + '\n' + r.days + ' · ' + r.dist + 'km\n行政区: ' + dname,
            { sticky: true, className: 'region-tooltip' }
          );
          lyr.on('mouseover', () => showRegionInfo(i));
          lyr.on('mouseout', hideRegionInfo);
        }
      }).addTo(regionLayerGroup);
      regionLayers[i] = layer;
    }
  }

  function showRegionInfo(i) {
    const r = regions[i];
    const panel = document.getElementById('regionInfo');
    if (!r || !panel) return;
    panel.hidden = false;
    const names = (regionDistricts[i].names || []).join(', ');
    panel.innerHTML =
      '<div class="ri-name">' + i + '. ' + r.zh + ' <span>' + r.en + '</span></div>' +
      '<div class="ri-park">' + r.park + '</div>' +
      '<div class="ri-meta">' + r.days + ' · ' + r.dist + 'km</div>' +
      '<div class="ri-dlist">含行政区: ' + names + '</div>';
  }
  function hideRegionInfo() {
    const panel = document.getElementById('regionInfo');
    if (panel) panel.hidden = true;
  }

  function loadGeo() {
    const local = 'assets/nepal-districts.geojson';
    const cdn = 'https://cdn.jsdelivr.net/gh/mesaugat/geoJSON-Nepal@master/nepal-districts-new.geojson';
    fetch(local).then(res => { if (!res.ok) throw new Error('local ' + res.status); return res.json(); })
      .then(render)
      .catch(() => fetch(cdn).then(res => { if (!res.ok) throw new Error('cdn ' + res.status); return res.json(); }).then(render))
      .catch(err => console.warn('[region] 行政区 GeoJSON 加载失败:', err));
  }
  loadGeo();
})();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PANEL NAVIGATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOP NAVIGATION (NO TWO style)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function setCard(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BACKEND API  (EdgeOne Pages Node Functions + KV：国内可达、免卡、不休眠)
//  密码只存在于边缘函数环境变量（ADMIN_PWD），前端仅持有登录后下发的 token
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const API = (function () {
  const TOKEN_KEY = 'ght_token';
  function metaVal(name) {
    const m = document.querySelector('meta[name="' + name + '"]');
    return (m && m.getAttribute('content') || '').trim();
  }
  // 后端地址：读 <meta name="ght-api">；为空则回退到当前域名（EdgeOne 同域部署）
  function apiBase() { const v = metaVal('ght-api').replace(/\/+$/, ''); return v || location.origin; }
  function hasBackend() { return !!metaVal('ght-api') || !!location.origin; }
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function authHeader() { const t = getToken(); return t ? { 'Authorization': 'Bearer ' + t } : {}; }
  async function req(method, path, opts) {
    opts = opts || {};
    const headers = Object.assign({}, authHeader(), opts.headers || {});
    const res = await fetch(apiBase() + path, { method, headers, body: opts.body });
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    return { ok: res.ok, status: res.status, data };
  }
  function noBackend() { return { ok: false, status: 0, data: null }; }
  return {
    getToken, setToken, clearToken, authHeader,
    login: async (pwd) => {
      if (!hasBackend()) return noBackend();
      return req('POST', '/api/login?_t=' + Date.now(), { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
    },
    getConfig: async () => {
      if (!hasBackend()) return { ok: true, status: 200, data: {} };
      const r = await req('GET', '/api/config');
      if (r.status === 404) return { ok: true, status: 200, data: {} }; // 尚未配置
      return r;
    },
    putConfig: async (obj) => {
      if (!hasBackend()) return noBackend();
      return req('PUT', '/api/config', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj || {}) });
    },
    upload: async (fileList) => {
      if (!hasBackend()) return noBackend();
      try {
        const files = [];
        for (const f of Array.from(fileList)) {
          const content = await f.text();           // File/Blob.text() → 原始 GPX 文本
          files.push({ name: f.name, content });
        }
        return req('POST', '/api/upload', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files }) });
      } catch (e) {
        console.warn('[ght] 读取文件失败', e);
        return noBackend();
      }
    },
    listTracks: async () => {
      if (!hasBackend()) return noBackend();
      return req('GET', '/api/tracks');             // 需鉴权，200 即 token 有效（续期校验）
    },
    getShare: async () => {
      if (!hasBackend()) return { ok: true, status: 200, data: null };
      return req('GET', '/api/share');
    },
    putShare: async (bundle) => {
      if (!hasBackend()) return noBackend();
      try {
        return req('PUT', '/api/share', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bundle) });
      } catch (e) { return noBackend(); }
    }
  };
})();

// 暴露到全局，供 admin.html 等独立页面复用
if (typeof window !== 'undefined') window.API = API;

// 应用服务端配置到 APP（语言 / 出发日期 / 默认底图 / 基础信息）
async function applyServerConfig() {
  try {
    const r = await API.getConfig();
    if (!r.ok || !r.data) return;
    const c = r.data;
    if (c.language && c.language !== currentLang) {
      currentLang = c.language;
      applyLang();
    }
    if (c.itineraryStartDate != null) APP.itineraryStartDate = c.itineraryStartDate;
    if (c.expeditionName) APP.expeditionName = c.expeditionName;
    if (c.startPlaceName) APP.startPlaceName = c.startPlaceName;
    if (c.totalDistance) APP.totalDistance = c.totalDistance;
  } catch (e) { /* 离线 / 网络错误，忽略，沿用本地配置 */ }
}

// 恢复登录态：若 sessionStorage 仍有有效 token，则静默续期（无需重新输密码）
async function restoreSession() {
  if (!API.getToken()) return;
  try {
    const r = await API.listTracks();   // 该接口需鉴权，200 即 token 有效
    if (r.ok) {
      APP.isOwner = true;
      await applyServerConfig();
    } else {
      API.clearToken();                 // token 失效，清掉
    }
  } catch (e) {
    // 后端未启动 / 网络错误：忽略，沿用本地配置（访客态）
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DATA MANAGEMENT MODAL (password-gated upload)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openDataModal() {
  const m = document.getElementById('dataModal');
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  const gate = document.getElementById('pwdGate');
  const area = document.getElementById('uploadArea');
  const err = document.getElementById('dmPwdErr');
  if (err) err.hidden = true;
  if (APP.isOwner) {
    if (gate) gate.hidden = true;
    if (area) { area.hidden = false; area.innerHTML = uploadHTML(); }
  } else {
    if (gate) gate.hidden = false;
    if (area) area.hidden = true;
    const pi = document.getElementById('pwdInput'); if (pi) pi.value = '';
  }
  setTimeout(function () { const pi = document.getElementById('pwdInput'); if (pi) pi.focus(); }, 60);
}
function closeDataModal() {
  const m = document.getElementById('dataModal');
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}
async function unlockData() {
  const pi = document.getElementById('pwdInput');
  if (!pi) return;
  const pwd = pi.value;
  if (!pwd) return;
  const err = document.getElementById('dmPwdErr');
  if (err) err.hidden = true;
  try {
    const r = await API.login(pwd);
    // 以服务端返回的 data.ok 为准（不再仅看 data.token），并透传服务端错误（含 SECRET 缺失）
    if (r.data && r.data.ok && r.data.token) {
      API.setToken(r.data.token);
      APP.isOwner = true;
      const gate = document.getElementById('pwdGate');
      const area = document.getElementById('uploadArea');
      if (gate) gate.hidden = true;
      if (area) { area.hidden = false; area.innerHTML = uploadHTML(); }
      await applyServerConfig();   // 同步出发日期等配置到表单
      if (typeof applyLang === 'function') applyLang();
      if (typeof showView === 'function') showView(APP.activeView || 'dashboard');
    } else {
      const msg = (r.data && r.data.message) ? r.data.message : t('dm.pwdErr');
      if (err) { err.hidden = false; err.textContent = msg; }
    }
  } catch (e) {
    // 网络错误（后端未启动等）
    if (err) { err.hidden = false; err.textContent = t('dm.connErr'); }
  }
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDataModal(); });
(function () {
  const m = document.getElementById('dataModal');
  if (m) m.addEventListener('click', function (e) { if (e.target === m) closeDataModal(); });
})();


function fitRoute() {
  if (typeof map === 'undefined') return;
  let pts = [];
  if (APP.presetTrack && APP.presetTrack.trackPoints && APP.presetTrack.trackPoints.length) {
    pts = APP.presetTrack.trackPoints.map(p => [p.lat, p.lon]);
  } else if (typeof ghtSections !== 'undefined' && ghtSections.length) {
    // fallback: fit the whole GHT corridor from static section trail data
    ghtSections.forEach(s => { if (s.trail) s.trail.forEach(c => pts.push([c[0], c[1]])); });
  }
  if (pts.length) {
    try {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 12 });
    } catch(e) {}
  }
}

const VIEW_TITLES = {
  sections: ['🏔️ 路段探索器', 'SECTION EXPLORER'],
  itinerary: ['📅 行程安排', 'ITINERARY'],
  about: ['ℹ️ 关于本程', 'ABOUT']
};

function showView(view) {
  APP.activeView = view;
  document.querySelectorAll('.tn-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'dashboard') { renderDashboard(); fitRoute(); return; }
  const card = document.getElementById('cardPasses');
  if (!card) return;
  let html = '';
  if (view === 'sections') html = renderSections();
  else if (view === 'itinerary') html = renderItinerary();
  const title = VIEW_TITLES[view] || ['视图', 'VIEW'];
  card.innerHTML = '<div class="card-h"><span>' + title[0] + '</span><span class="en">' + title[1] + '</span></div><div class="card-b">' +
    (html || '<div style="color:var(--text-dim);font-size:11px;padding:8px;">' + t('view.empty') + '</div>') + '</div>';
}

// Top nav clicks
document.querySelectorAll('.tn-tab').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

// 向后兼容：旧处理函数中的 openPanel/closePanel 调用统一映射到 Dashboard 重渲染
function openPanel(tab) { if (tab) APP.activeTab = tab; renderDashboard(); }
function closePanel() { /* 新版无侧栏抽屉，no-op */ }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ELEVATION PROFILE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function drawElevationProfile() {
  const container = document.getElementById('elevationBody');
  if (!container || !APP.presetTrack) return;

  const points = APP.presetTrack.trackPoints;
  if (points.length < 2) return;

  const w = container.clientWidth || 800;
  const h = container.clientHeight || 80;
  const pad = { top: 8, right: 10, bottom: 18, left: 40 };
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
  if (APP.sectionRanges && APP.sectionRanges.length > 0) {
    APP.sectionRanges.forEach((range, idx) => {
      const midIdx = Math.floor((range.startIndex + range.endIndex) / 2);
      const frac = midIdx / (points.length - 1);
      const x = pad.left + frac * pw;
      const color = range.regionColor || sectionColors[idx] || '#888';
      sectionLabels += `<text x="${x.toFixed(1)}" y="${h - 2}" text-anchor="middle" font-size="8" fill="${color}" opacity="0.85">${range.regionZh || (idx+1)}</text>`;
    });
  }

  // Build section dividers — very faint dashed vertical lines between the 13 sections.
  // Drawn at each section's startIndex (skip the first, which sits at the left edge).
  let sectionDividers = '';
  if (APP.sectionRanges && APP.sectionRanges.length > 1) {
    for (let i = 1; i < APP.sectionRanges.length; i++) {
      const bi = APP.sectionRanges[i].startIndex;
      if (bi == null || bi <= 0) continue;
      const x = pad.left + (bi / (points.length - 1)) * pw;
      sectionDividers += `<line x1="${x.toFixed(1)}" y1="${pad.top}" x2="${x.toFixed(1)}" y2="${pad.top + ph}" stroke="rgba(255,255,255,0.16)" stroke-width="0.7" stroke-dasharray="2,5"/>`;
    }
  }

  // Current position line
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
      posLine = `<line x1="${cx.toFixed(1)}" y1="${pad.top}" x2="${cx.toFixed(1)}" y2="${pad.top+ph}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3,3" opacity="0.8"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="#fff" stroke="var(--accent)" stroke-width="2"/>`;
    }
  }

  // Elevation grid lines
  let gridLines = '';
  const gridStep = Math.ceil(range / 500) * 500 || 500;
  for (let e = Math.ceil(minE / 500) * 500; e <= maxE; e += gridStep) {
    const gy = pad.top + ph - ((e - minE) / range) * ph;
    gridLines += `<line x1="${pad.left}" y1="${gy.toFixed(1)}" x2="${pad.left+pw}" y2="${gy.toFixed(1)}" stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>`;
    gridLines += `<text x="${pad.left - 4}" y="${gy.toFixed(1) + 3}" text-anchor="end" font-size="8" fill="var(--text-dim)">${e}</text>`;
  }

  const fmtM = v => Math.round(v).toLocaleString() + 'm';
  document.getElementById('elevLabel').textContent =
    '最高 ' + fmtM(trueMax) + ' · 最低 ' + fmtM(trueMin) + ' · 累计爬升 ' + fmtM(climb);

  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none">
    <rect width="${w}" height="${h}" fill="transparent"/>
    ${gridLines}
    ${sectionDividers}
    <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.6"/>
    <path d="${pathD}" fill="url(#elevGrad)" stroke="none" opacity="0.15"/>
    ${posLine}
    ${sectionLabels}
    <defs>
      <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
  </svg>`;
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
    detail.textContent = completedCount + '✅ ' + (inProgressCount > 0 ? '+' + inProgressCount + '🔵 ' : '') + '/ ' + APP.sectionRanges.length + ' 段';
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
// 未出发（无实时 GPS）：固定返回起点段（sectionRanges[0] = 干城章嘉），避免「0% 却显示下一段」的歧义。
// 实时追踪中：按当前 GPS 位置最近的轨迹点定位到所属路段。
// 面板「当前状态」与地图徽标「当前位置」统一调用此函数 → 二者永不矛盾。
function getCurrentSectionRange() {
  if (APP.sectionRanges && APP.sectionRanges.length) {
    const hasLive = APP.currentPosition && APP.actualTracks && APP.actualTracks.length;
    if (!hasLive) return APP.sectionRanges[0];           // 未出发 → 起点段
    // 有实时位置：找包含当前 GPS 最近轨迹点的路段
    if (APP.presetTrack && APP.presetTrack.trackPoints.length) {
      const pts = APP.presetTrack.trackPoints;
      let best = -1, bd = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const d = haversine(APP.currentPosition.lat, APP.currentPosition.lon, pts[i].lat, pts[i].lon);
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
  let curIdx = -1;
  if (APP.currentPosition) { let best = Infinity; for (let i = 0; i < pts.length; i++) { const d = haversine(APP.currentPosition.lat, APP.currentPosition.lon, pts[i].lat, pts[i].lon); if (d < best) { best = d; curIdx = i; } } }
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

// 当前海拔显示值：仅实时追踪时取 GPS 当前点海拔；未出发/无轨迹时改用预设起点海拔
// （更接近「当前营地海拔」），避免陈旧 localStorage ght_current_pos(上次 GPS 终点) 被误当成「当前海拔」。
function getDisplayElev() {
  const hasLive = APP.currentPosition && APP.actualTracks && APP.actualTracks.length;
  if (hasLive && APP.currentPosition.elev != null) return Math.round(APP.currentPosition.elev);
  const tp = APP.presetTrack && APP.presetTrack.trackPoints;
  if (tp && tp.length && tp[0].elev != null) return Math.round(tp[0].elev);
  return null;
}
function getDisplayElevStr() {
  const e = getDisplayElev();
  return e != null ? ' · ⛰️ ' + e.toLocaleString() + 'm' : '';
}

// ── A. 征途总进度 ──
function progressCardHTML() {
  const pct = APP.progressPercentage || APP.progressPct || 0;
  const totalKm = APP.totalDistance || 0;
  const doneKm = (APP.completedDistance / 1000) || 0;
  const days = APP.itinerary || [];
  const totalDays = days.length;
  const doneDays = days.filter(d => d.actual).length;
  // 累积爬升：从预设轨迹读取（预设=目标路线，与 GPX 预设统计保持一致，不再依赖实际轨迹）
  const gain = (APP.presetTrack && APP.presetTrack.stats && APP.presetTrack.stats.elevGain)
    ? APP.presetTrack.stats.elevGain : 0;
  return '<div class="card-h"><span>征途总进度</span><span class="en">EXPEDITION PROGRESS</span></div>' +
    '<div class="card-b">' +
    '<div class="pc-pct">' + pct.toFixed(1) + '<small>%</small></div>' +
    '<div class="pc-day">Day <b>' + doneDays + '</b> / ' + totalDays + '</div>' +
    '<div class="pc-bar"><i style="width:' + Math.min(100, pct) + '%"></i></div>' +
    '<div class="pc-stats">' +
    '<div class="pc-stat"><div class="v">' + fmtNum(doneKm, 0) + '</div><div class="l">' + t('prog.done') + '</div></div>' +
    '<div class="pc-stat"><div class="v">' + (gain ? fmtNum(gain) : '—') + '</div><div class="l">累计爬升</div></div>' +
    '<div class="pc-stat"><div class="v">' + fmtNum(totalKm, 0) + '</div><div class="l">' + t('prog.total') + '</div></div>' +
    '</div></div>';
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
  const nextDay = (APP.itinerary || []).find(d => !d.actual);
  let eta = '—';
  if (nextDay) {
    if (nextDay.date) eta = nextDay.date;
    else if (APP.itineraryStartDate) {
      const base = new Date(APP.itineraryStartDate + 'T00:00:00');
      base.setDate(base.getDate() + (nextDay.day - 1));
      eta = base.toISOString().slice(0, 10);
    }
  }

  // 当前营地：实时追踪→最近标注点；未出发→起点营地（明确标注「未出发」，避免误显下一段）
  const hasLive = APP.currentPosition && APP.actualTracks && APP.actualTracks.length;
  let campVal, campSub;
  if (hasLive && APP.allWpts && APP.allWpts.length) {
    const lbl = nearestWaypointLabel(APP.allWpts, APP.currentPosition, 6000);
    campVal = lbl || (sec.nameEn || sec.name || '—');
    campSub = sec.name || '';
  } else {
    const startCamp = (APP.itinerary && APP.itinerary[0] && APP.itinerary[0].from) || APP.startPlaceName || '起点';
    campVal = '🚩 ' + esc(startCamp);
    campSub = (sec.name || '起点') + ' · 未出发';
  }

  const row = (ico, k, v, sub) => '<div class="st-row"><span class="st-ico">' + ico + '</span><span class="st-k">' + k + '</span><span class="st-v">' + v + (sub ? '<small>' + sub + '</small>' : '') + '</span></div>';
  return '<div class="card-h"><span>当前状态</span><span class="en">CURRENT STATUS</span></div>' +
    '<div class="card-b">' +
    row('🏕️', t('st.camp'), campVal, campSub) +
    row('🗺️', t('st.area'), prov, '') +
    row('🔺', t('st.elev'), elev != null ? fmtNum(elev) + 'm' : '—', '') +
    row('⛰️', t('st.pass'), np ? esc(np.name || np.desc || '未命名') : '—', np && np.elev != null ? fmtNum(np.elev) + 'm' : '') +
    row('⏱️', t('st.eta'), eta, '') +
    '</div>';
}

// ── C. 今日摘要 ──
function todaySummaryHTML() {
  const last = [...(APP.actualTracks || [])].reverse().find(t => t.stats);
  const s = last ? last.stats : null;
  const cell = (v, l) => '<div class="tg-cell"><div class="v">' + (v == null ? '—' : v) + '</div><div class="l">' + l + '</div></div>';
  return '<div class="card-h"><span>今日摘要</span><span class="en">TODAY\'S SUMMARY</span></div>' +
    '<div class="card-b"><div class="tg">' +
    cell(s ? fmtNum(s.distance, 1) + 'km' : '—', t('today.dist')) +
    cell(s ? '+' + fmtNum(s.elevGain) + 'm' : '—', t('today.gain')) +
    cell(s ? fmtNum(s.elevLoss) + 'm' : '—', t('today.loss')) +
    cell(s && s.durationStr ? s.durationStr : '—', t('today.move')) +
    cell(s && s.avgSpeed ? s.avgSpeed + '' : '—', t('today.speed')) +
    cell(s ? fmtNum(s.maxElev) + 'm' : '—', t('today.max')) +
    '</div>' +
    (!s ? '<div style="font-size:10px;color:var(--text-dim);margin-top:8px;text-align:center;">' + t('today.nodata') + '</div>'
        : (last.date ? '<div style="font-size:10px;color:var(--text-dim);margin-top:8px;text-align:center;">' + t('today.dateLbl') + last.date + (last.dayNum ? ' · Day ' + last.dayNum : '') + '</div>'
                     : (last.dayNum ? '<div style="font-size:10px;color:var(--text-dim);margin-top:8px;text-align:center;">Day ' + last.dayNum + '</div>' : ''))) +
    '</div>';
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
      const cls = 'pass-row' + (p.done ? ' done' : '');
      const mark = p.done ? '<span class="pass-check">✓</span>' : '<span class="pass-dot"></span>';
      const elev = p.elev != null ? fmtNum(p.elev) + 'm' : '';
      return '<div class="' + cls + '">' + mark +
        '<span class="pass-name">' + esc(p.nm || '未命名') + '</span>' +
        (elev ? '<span class="pass-elev">' + elev + '</span>' : '') + '</div>';
    }).join('');
  }
  const summary = total ? '<div class="pass-summary"><span class="pass-summary-num">⛰️ ' + done + ' / ' + total + '</span>' +
    '<div class="pass-summary-bar"><i style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></i></div></div>' : '';
  return '<div class="card-h"><span>垭口清单</span><span class="en">PASS CHECKLIST</span></div>' +
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
    (APP.isOwner ? '<div style="margin-top:10px;text-align:center;"><button class="btn-reset visible" id="btnReset" onclick="clearAllData()" style="font-size:11px;">' + t('up.reset') + '</button><button class="btn-reset visible" id="btnClearCloud" onclick="clearCloudShare()" style="font-size:11px;margin-left:8px;">清空云端</button><button class="btn-reset visible" id="btnRepublish" onclick="republishShare()" style="font-size:11px;margin-left:8px;">🔄 重新发布共享</button></div>' : '') +
    '</div>';
}

function updateLiveStatus() {
  const el = document.getElementById('liveDot');
  if (!el) return;
  const hasLive = APP.currentPosition && APP.actualTracks && APP.actualTracks.length;
  if (hasLive) {
    el.className = 'live-dot';
    el.innerHTML = '🟢 Live Tracking Active · 实时追踪中';
  } else {
    el.className = 'live-dot offline';
    el.innerHTML = '⚪ 计划中 · 尚未出发';
  }
}

function renderDashboard() {
  setCard('cardProgress', progressCardHTML());
  setCard('cardStatus', currentStatusHTML());
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

  // 下一阶段（第一条没有 actual 的计划日）
  let nextHTML;
  const nextDay = days.find(d => !d.actual);
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
  let html = '<div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:12px;">🏔️ 路段探索器</div>';

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
    pushShare();   // 日程变更同步到共享包
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

function renderDonate() {
  return `
    <div class="donate-section">
      <h3 style="font-size:14px;color:var(--accent);">❤️ 支持我的 GHT 徒步</h3>
      <p style="font-size:12px;color:var(--text-dim);margin-top:8px;line-height:1.6;">
        如果您喜欢这次探险记录，欢迎赞助支持！<br>
        所有赞助将用于沿途向导费和装备补给。<br>
        目前暂未开通支付渠道。敬请期待！
      </p>
      <div class="qr-box">微信支付<br>即将开通</div>
      <p style="font-size:11px;color:var(--text-dim);">感谢每一位支持者！🙏</p>
    </div>
  `;
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GPX PARSER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 抽稀轨迹点：保留首尾 + 近似等间距采样，避免 localStorage 5MB 配额溢出
// （GPS 全量点可达数万，序列化后超 5MB 会被浏览器静默丢弃，导致刷新后轨迹丢失）。
// 运行时距离/爬升使用已算好的 stats，不依赖抽稀后的点数重新计算，因此不影响精度。
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Douglas-Peucker 轨迹简化（替代均匀采样）
//  保留弯曲路段细节（如马纳斯鲁环线），剔除直线段的冗余点。
//  输入：trackPoints 数组 + 容差(°) → 输出：简化后的子集（首尾必保）。
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function perpendicularDistance(lat, lon, lat1, lon1, lat2, lon2) {
  const dx = lon2 - lon1, dy = lat2 - lat1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(lat - lat1, lon - lon1);
  const t = ((lon - lon1) * dx + (lat - lat1) * dy) / lenSq;
  const clat = lat1 + t * dy, clon = lon1 + t * dx;
  return Math.hypot(lat - clat, lon - clon);
}

function douglasPeucker(points, startIndex, endIndex, tolerance, keep) {
  let maxDist = 0, maxIdx = startIndex;
  for (let i = startIndex + 1; i < endIndex; i++) {
    const d = perpendicularDistance(
      points[i].lat, points[i].lon,
      points[startIndex].lat, points[startIndex].lon,
      points[endIndex].lat, points[endIndex].lon
    );
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    keep[maxIdx] = true;
    douglasPeucker(points, startIndex, maxIdx, tolerance, keep);
    douglasPeucker(points, maxIdx, endIndex, tolerance, keep);
  }
}

function simplifyPointsDP(points, tolerance) {
  if (!points || points.length <= 2) return points;
  const n = points.length;
  const keep = new Array(n).fill(false);
  keep[0] = true; keep[n - 1] = true;
  douglasPeucker(points, 0, n - 1, tolerance, keep);
  return points.filter((_, i) => keep[i]);
}

function decimateTrack(points, max) {
  if (!points || !points.length) return [];
  if (points.length <= max) return points;
  // 先用 Douglas-Peucker 简化，再在超限时均匀截断
  const simplified = simplifyPointsDP(points, 0.0004);  // ≈44m 容差
  if (simplified.length <= max) return simplified;
  const step = simplified.length / max;
  const out = [];
  for (let i = 0; i < max; i++) out.push(simplified[Math.floor(i * step)]);
  const last = simplified[simplified.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

// 抽稀预设轨迹：trackPoints 与平行数组 distances 必须同步抽稀，
// 否则 sectionRanges 的索引/距离会错位（重载后轨迹绘制空白、进度计算归零）。
function decimatePresetTrack(preset, max) {
  if (!preset || !preset.trackPoints || preset.trackPoints.length <= max) return preset;
  const pts = preset.trackPoints;
  const dist = Array.isArray(preset.distances) ? preset.distances : null;

  // Douglas-Peucker 简化（保留弯道细节），同步 distances
  const simplified = simplifyPointsDP(pts, 0.0004);

  if (simplified.length <= max) {
    // 无需二次降级：直接用 DP 结果构建同步 distances
    const np = { ...preset, trackPoints: simplified };
    if (dist) {
      // 通过坐标匹配重建 distances（DP 子集是原数组的真子集）
      const distMap = new Map();
      pts.forEach((p, i) => distMap.set(p.lat + ',' + p.lon, dist[i]));
      np.distances = simplified.map(p => distMap.get(p.lat + ',' + p.lon) || 0);
    }
    return np;
  }

  // DP 后仍超限（极端情况）：均匀降级到 max
  const step = simplified.length / max;
  const outPts = [], outDist = dist ? [] : null;
  for (let i = 0; i < max; i++) {
    const idx = Math.floor(i * step);
    outPts.push(simplified[idx]);
    if (outDist) {
      // distances 需要从原始数组中查找
      const p = simplified[idx];
      const origIdx = pts.findIndex(op => op.lat === p.lat && op.lon === p.lon);
      outDist.push(origIdx >= 0 ? dist[origIdx] : 0);
    }
  }
  const last = simplified[simplified.length - 1];
  if (outPts[outPts.length - 1] !== last) {
    outPts.push(last);
    if (outDist) {
      const origIdx = pts.findIndex(op => op.lat === last.lat && op.lon === last.lon);
      outDist.push(origIdx >= 0 ? dist[origIdx] : 0);
    }
  }
  const np = { ...preset, trackPoints: outPts };
  if (outDist) np.distances = outDist;
  return np;
}

function parseElementChildren(el) {
  const fields = {};
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    const key = child.tagName.replace(/^.*:/, '');
    if (child.children.length > 0) {
      fields[key] = parseElementChildren(child);
    } else {
      fields[key] = child.textContent;
    }
  }
  return fields;
}

function flattenFields(fields, prefix) {
  const result = {};
  for (const [k, v] of Object.entries(fields)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null) {
      Object.assign(result, flattenFields(v, fullKey));
    } else {
      result[fullKey] = v;
    }
  }
  return result;
}

function parseGPX(xmlText) {
  // Strip PeakVisor #gpx header
  let cleanText = xmlText.replace(/^#gpx\s+\S+\s*\n/, '').trim();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(cleanText, 'text/xml');

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML解析失败: ' + parseError.textContent.substring(0, 100));
  }

  const trackPoints = [];
  const waypoints = [];

  // Parse track points by <trkseg> to avoid跨 segment 强制连线
  const trksegs = xmlDoc.getElementsByTagName('trkseg');
  let prevPt = null;
  for (let s = 0; s < trksegs.length; s++) {
    const segPts = trksegs[s].getElementsByTagName('trkpt');
    for (let i = 0; i < segPts.length; i++) {
      const pt = segPts[i];
      const lat = parseFloat(pt.getAttribute('lat'));
      const lon = parseFloat(pt.getAttribute('lon'));
      if (isNaN(lat) || isNaN(lon)) continue;

      const point = { lat, lon };

      // Elevation
      const eleEls = pt.getElementsByTagName('ele');
      if (eleEls.length > 0) {
        point.elev = parseFloat(eleEls[0].textContent);
      }

      // Time
      const timeEls = pt.getElementsByTagName('time');
      if (timeEls.length > 0) {
        point.time = timeEls[0].textContent;
      }

      // Detect real discontinuities (>1km) — 100m is too aggressive for mountain GPS drift
      if (prevPt) {
        const jump = haversine(prevPt.lat, prevPt.lon, lat, lon);
        if (jump > 1000) {
          point._break = true;
          point._jumpDistance = Math.round(jump);
        }
      }

      trackPoints.push(point);
      prevPt = point;
    }
  }

  // Fallback: parse all trkpt if no trkseg wrapper (some apps export flat trkpt)
  if (trackPoints.length === 0) {
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    for (let i = 0; i < trkpts.length; i++) {
      const pt = trkpts[i];
      const lat = parseFloat(pt.getAttribute('lat'));
      const lon = parseFloat(pt.getAttribute('lon'));
      if (isNaN(lat) || isNaN(lon)) continue;
      const point = { lat, lon };
      const eleEls = pt.getElementsByTagName('ele');
      if (eleEls.length > 0) point.elev = parseFloat(eleEls[0].textContent);
      const timeEls = pt.getElementsByTagName('time');
      if (timeEls.length > 0) point.time = timeEls[0].textContent;
      trackPoints.push(point);
    }
  }

  // Parse route points (rtept) only if no track points exist
  if (trackPoints.length === 0) {
    const rtepts = xmlDoc.getElementsByTagName('rtept');
    for (let i = 0; i < rtepts.length; i++) {
      const pt = rtepts[i];
      const lat = parseFloat(pt.getAttribute('lat'));
      const lon = parseFloat(pt.getAttribute('lon'));
      if (isNaN(lat) || isNaN(lon)) continue;
      const point = { lat, lon };
      const eleEls = pt.getElementsByTagName('ele');
      if (eleEls.length > 0) point.elev = parseFloat(eleEls[0].textContent);
      trackPoints.push(point);
    }
  }

  // Parse waypoints (wpt) — namespace-safe: try qualified-name, then wildcard NS
  let wpts = xmlDoc.getElementsByTagName('wpt');
  if (wpts.length === 0 && xmlDoc.getElementsByTagNameNS) {
    wpts = xmlDoc.getElementsByTagNameNS('*', 'wpt');
  }
  for (let i = 0; i < wpts.length; i++) {
    const wp = wpts[i];
    const lat = parseFloat(wp.getAttribute('lat'));
    const lon = parseFloat(wp.getAttribute('lon'));
    if (isNaN(lat) || isNaN(lon)) continue;

    const wpt = { lat, lon };

    const nameEls = wp.getElementsByTagName('name');
    if (nameEls.length > 0) wpt.name = nameEls[0].textContent;

    const descEls = wp.getElementsByTagName('desc');
    if (descEls.length > 0) wpt.desc = descEls[0].textContent;

    const eleEls = wp.getElementsByTagName('ele');
    if (eleEls.length > 0) wpt.elev = parseFloat(eleEls[0].textContent);

    const cmtEls = wp.getElementsByTagName('cmt');
    if (cmtEls.length > 0) wpt.comment = cmtEls[0].textContent;

    const symEls = wp.getElementsByTagName('sym');
    if (symEls.length > 0) wpt.sym = symEls[0].textContent;

    const typeEls = wp.getElementsByTagName('type');
    if (typeEls.length > 0) wpt.gpxType = typeEls[0].textContent;

    const srcEls = wp.getElementsByTagName('src');
    if (srcEls.length > 0) wpt.src = srcEls[0].textContent;

    const timeEls = wp.getElementsByTagName('time');
    if (timeEls.length > 0) wpt.time = timeEls[0].textContent;

    const linkEls = wp.getElementsByTagName('link');
    wpt.links = [];
    for (let j = 0; j < linkEls.length; j++) {
      wpt.links.push({
        href: linkEls[j].getAttribute('href') || '',
        text: linkEls[j].textContent || ''
      });
    }

    // Parse extensions recursively
    const extEls = wp.getElementsByTagName('extensions');
    if (extEls.length > 0) {
      const extFields = parseElementChildren(extEls[0]);
      const allFieldsFlat = flattenFields(extFields, '');
      wpt.allFieldsFlat = allFieldsFlat;

      if (allFieldsFlat['DisplayColor']) wpt.displayColor = allFieldsFlat['DisplayColor'];
    }

    // Classify waypoint
    const descLower = (wpt.desc || '').toLowerCase();
    const nameLower = (wpt.name || '').toLowerCase();
    const symLower = (wpt.sym || '').toLowerCase();
    const typeLower = (wpt.gpxType || '').toLowerCase();
    // PeakVisor tagId（key 可能是 'tagId' 或 'pv:tagId'），含 natural:saddle / mountain_pass 等
    const tagIdVal = (wpt.allFieldsFlat &&
      (wpt.allFieldsFlat['tagId'] || wpt.allFieldsFlat['pv:tagId'] || '')) + '';
    const tagIdLow = tagIdVal.toLowerCase();

    // 垭口/山口判定 —— 覆盖：英文(la/pass/bhanjyang…)、藏语转写、PeakVisor tagId(saddle/pass/col)、
    // Garmin/OSM 的 sym/type 字段、以及中文(垭口/山口/达坂/鞍部)。
    const isPass = descLower.match(/\b(la|pass|bhanjyang|labtsa|lapcha|lekh|col)\b/i) ||
                   nameLower.match(/\b(la|pass|bhanjyang|labtsa|lapcha|lekh|col)\b/i) ||
                   (wpt.desc || '').includes('La ') || (wpt.desc || '').includes(' Pass') ||
                   (wpt.name || '').includes('La ') || (wpt.name || '').includes(' Pass') ||
                   tagIdLow.includes('saddle') || tagIdLow.includes('mountain_pass') ||
                   tagIdLow.includes('pass') || tagIdLow.includes('col') ||
                   symLower.includes('saddle') || symLower.includes('pass') || symLower.includes('col') ||
                   typeLower.includes('saddle') || typeLower.includes('pass') ||
                   /[垭山]口|达坂|鞍部/.test((wpt.name || '') + ' ' + (wpt.desc || ''));

    // Hut / camp detection — PeakVisor uses name "Hut / Shelter", sym "Pin, Green",
    // type "TechNote", and tagId "logistics:hut" (key may be 'tagId' or 'pv:tagId' depending on parser)
    const isHut = tagIdLow.includes('hut') ||
                  nameLower.includes('hut') || nameLower.includes('shelter') ||
                  nameLower.includes('camp') || symLower.includes('green') ||
                  typeLower.includes('camp');

    if (isPass) {
      wpt._type = 'pass';
    } else if (isHut) {
      wpt._type = 'camp';
    } else if (symLower.includes('summit') || tagIdLow.includes('peak') ||
               tagIdLow.includes('summit') || nameLower.includes('peak') ||
               typeLower.includes('peak')) {
      wpt._type = 'peak';
    } else {
      wpt._type = 'other';
    }

    // ── 规范显示名 ──
    // PeakVisor 把「分类」写进 <name>（如 "Hut / Shelter"、"Info / Other"），
    // 真实地名在 <desc>。把 wpt.name 统一规范为真实地名，供行程/地图/探索器一致显示。
    const rawName = (wpt.name || '').trim();
    const rawDesc = (wpt.desc || '').trim();
    const CATEGORY_HINT = /\s\/\s/; // PeakVisor 类别形如 "Hut / Shelter"
    const KNOWN_CATS = ['info / other','hut / shelter','summit','pass','viewpoint','drinking water','campground','spring','food','restaurant','hotel','lodge','peak','col','saddle','info','other','water','shop','fuel','gate','cave','memorial','monument','ruins','temple','shrine','bridge','tunnel','dam','mine','quarry','checkpoint','border','customs','police','hospital','clinic','toilet','shower','picnic','camp','shelter','hut'];
    const nameIsCategory = CATEGORY_HINT.test(rawName) || KNOWN_CATS.includes(rawName.toLowerCase());
    wpt.category = rawName;                              // 保留原始类别标签备用
    wpt.name = nameIsCategory ? (rawDesc || rawName)      // 类别标签 → 真实地名取 <desc>
                              : (rawName || rawDesc);     // 否则 <name> 本就是真实地名

    waypoints.push(wpt);
  }

  return { trackPoints, waypoints };
}

function calculateGPXStats(gpxData) {
  const trackPoints = gpxData.trackPoints;
  if (trackPoints.length < 2) {
    return {
      distance: 0, elevGain: 0, elevLoss: 0,
      maxElev: 0, minElev: 0, pointCount: trackPoints.length
    };
  }

  let distance = 0, elevGain = 0, elevLoss = 0;
  let maxElev = -Infinity, minElev = Infinity;

  for (let i = 1; i < trackPoints.length; i++) {
    const p1 = trackPoints[i - 1];
    const p2 = trackPoints[i];

    // 预设=计划路线：端到端计入全程距离与爬升，不再跨断点跳过（与连续绘制一致）
    distance += haversine(p1.lat, p1.lon, p2.lat, p2.lon);

    if (p1.elev != null && p2.elev != null && !isNaN(p1.elev) && !isNaN(p2.elev)) {
      const diff = p2.elev - p1.elev;
      if (diff > 0) elevGain += diff;
      else elevLoss += -diff;
      if (p2.elev > maxElev) maxElev = p2.elev;
      if (p2.elev < minElev) minElev = p2.elev;
    }
  }

  if (maxElev === -Infinity) maxElev = 0;
  if (minElev === Infinity) minElev = 0;

  return {
    distance: distance / 1000,
    elevGain: Math.round(elevGain),
    elevLoss: Math.round(elevLoss),
    maxElev: Math.round(maxElev),
    minElev: Math.round(minElev),
    pointCount: trackPoints.length
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DAILY STATS FROM TIMESTAMPED TRACKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h > 0) return h + 'h' + (m > 0 ? m + 'min' : '');
  return m + 'min';
}

function calculateDailyStats(trackPoints) {
  if (!trackPoints || trackPoints.length < 2) return null;

  let hasTime = false;
  for (let i = 0; i < trackPoints.length; i++) {
    if (trackPoints[i].time) { hasTime = true; break; }
  }
  if (!hasTime) return null;

  let distance = 0, elevGain = 0, elevLoss = 0;
  let maxElev = -Infinity, minElev = Infinity;
  let startTime = null, endTime = null;

  for (let i = 0; i < trackPoints.length; i++) {
    const p = trackPoints[i];
    if (p.time) {
      const t = new Date(p.time);
      if (!isNaN(t.getTime())) {
        if (!startTime || t < startTime) startTime = t;
        if (!endTime || t > endTime) endTime = t;
      }
    }
    if (i > 0) {
      const p1 = trackPoints[i - 1], p2 = trackPoints[i];
      distance += haversine(p1.lat, p1.lon, p2.lat, p2.lon);
      if (p1.elev != null && p2.elev != null) {
        const d = p2.elev - p1.elev;
        if (d > 0) elevGain += d; else elevLoss += -d;
        if (p2.elev > maxElev) maxElev = p2.elev;
        if (p2.elev < minElev) minElev = p2.elev;
      }
    }
  }

  const dateStr = startTime ? fmtNepalDate(startTime) : null;
  if (maxElev === -Infinity) maxElev = 0;
  if (minElev === Infinity) minElev = 0;

  let durationMin = null, durationStr = null, avgSpeed = null;
  if (startTime && endTime) {
    durationMin = (endTime - startTime) / 60000;
    durationStr = formatDuration(durationMin);
    if (distance > 0 && durationMin > 0) {
      avgSpeed = parseFloat(((distance / 1000) / (durationMin / 60)).toFixed(1));
    }
  }

  return {
    date: dateStr,
    distance: distance / 1000,
    elevGain: Math.round(elevGain),
    elevLoss: Math.round(elevLoss),
    maxElev: Math.round(maxElev),
    minElev: Math.round(minElev),
    startTime: startTime ? startTime.toISOString() : null,
    endTime: endTime ? endTime.toISOString() : null,
    durationMin: durationMin ? Math.round(durationMin) : null,
    durationStr,
    avgSpeed,
    pointCount: trackPoints.length
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TRACK DISTANCE & SECTION RANGE CALCULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function calculateTrackDistances(trackPoints) {
  const distances = [0];
  for (let i = 1; i < trackPoints.length; i++) {
    const p1 = trackPoints[i - 1], p2 = trackPoints[i];
    // 不再跨断点跳过：保持与 calculateGPXStats / 连续绘制一致
    const d = haversine(p1.lat, p1.lon, p2.lat, p2.lon);
    distances.push(distances[distances.length - 1] + d);
  }
  return distances;
}

function findClosestDistanceIndex(distances, targetDist) {
  let lo = 0, hi = distances.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (distances[mid] < targetDist) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(distances[lo - 1] - targetDist) < Math.abs(distances[lo] - targetDist)) return lo - 1;
  return lo;
}

function calculateSectionRanges(presetTrack) {
  if (!presetTrack || !presetTrack.distances || presetTrack.distances.length === 0) return [];

  const regions = (window.GHT_SECTIONS || []).filter(r => r.entry && r.entry.length === 2);
  if (!regions.length) return [];

  const pts = presetTrack.trackPoints;
  const dists = presetTrack.distances;
  const n = pts.length;
  if (!n) return [];

  // 1) Voronoi assignment: every track point → nearest region anchor.
  //    Anchors are region CENTERS (never on a revisited boundary), so a looping
  //    trail can't hijack a region's segment the way the old "nearest entry point"
  //    logic did (that put Makalu before Kanchenjunga).
  const assign = new Array(n);
  for (let i = 0; i < n; i++) {
    let best = Infinity, bi = 0;
    for (let r = 0; r < regions.length; r++) {
      const e = regions[r].entry;
      const d = haversine(pts[i].lat, pts[i].lon, e[0], e[1]);
      if (d < best) { best = d; bi = r; }
    }
    assign[i] = bi;
  }

  // 2) Longest contiguous run per region (loops occasionally create short spurious runs).
  const bestRun = {};
  let cur = assign[0], s = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || assign[i] !== cur) {
      const len = (i - 1) - s + 1;
      if (!bestRun[cur] || len > bestRun[cur].len) bestRun[cur] = { start: s, end: i - 1, len };
      if (i < n) { cur = assign[i]; s = i; }
    }
  }

  // 3) Build 13 ordered segments. The trek ALWAYS starts at Kanchenjunga (Phungling),
  //    so region 0 is pinned to index 0; each subsequent region starts right after the
  //    previous run ends. This guarantees correct east→west order and no gaps/overlaps.
  const sectionRanges = [];
  let prevEnd = -1;
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const run = bestRun[i] || { start: prevEnd + 1, end: prevEnd, len: 0 };
    const startIndex = (i === 0) ? 0 : prevEnd + 1;
    let endIndex = run.end;
    if (endIndex <= startIndex) endIndex = startIndex;
    if (i === regions.length - 1) endIndex = n - 1; // last region runs to trail end
    const startDist = dists[startIndex] || 0;
    const endDist = dists[endIndex] || 0;

    sectionRanges.push({
      sectionId: i + 1,
      regionId: region.id,
      regionZh: region.zh,
      regionEn: region.en,
      regionColor: region.color,
      regionHighlights: region.scenery ? [region.scenery] : [],
      startIndex, endIndex,
      startDist, endDist,
      sectionActualDist: (endDist - startDist) / 1000,
      status: 'upcoming'
    });
    prevEnd = endIndex;
  }

  return sectionRanges;
}

function persistRegionMeasured() {
  // 把首页算好的「每段完成状态」持久化为 ght_region_measured（与 sectionRanges 的 13 区域一一对应）。
  // 该键以 ght_ 开头，会被 clearAllData() 一并清除 → 重置后 sections 页面自动回到「计划」。
  try {
    const rm = {};
    (window.GHT_SECTIONS || []).forEach(r => { rm[r.id] = false; });
    if (APP.sectionRanges && APP.actualTracks && APP.actualTracks.length) {
      APP.sectionRanges.forEach(r => {
        if (r.regionId && rm.hasOwnProperty(r.regionId) && (r.status === 'completed' || r.status === 'in-progress')) rm[r.regionId] = true;
      });
    }
    localStorage.setItem('ght_region_measured', JSON.stringify(rm));
  } catch (e) {}
}

function checkAllSectionsCompletion() {
  if (!APP.sectionRanges || !APP.actualTracks.length) { persistRegionMeasured(); return; }

  APP.sectionRanges.forEach(range => {
    let totalCovered = 0;
    const sectionLen = range.endDist - range.startDist;

    const sampleCount = 100;
    for (let i = 0; i < sampleCount; i++) {
      const t = i / (sampleCount - 1);
      const sampleDist = range.startDist + t * sectionLen;
      const idx = findClosestDistanceIndex(APP.presetTrack.distances, sampleDist);
      const samplePt = APP.presetTrack.trackPoints[Math.min(idx, APP.presetTrack.trackPoints.length - 1)];

      let covered = false;
      for (let j = 0; j < APP.actualTracks.length; j++) {
        const tp = APP.actualTracks[j].trackPoints;
        for (let k = 0; k < tp.length; k++) {
          const d = haversine(tp[k].lat, tp[k].lon, samplePt.lat, samplePt.lon);
          if (d < 250) { covered = true; break; }
        }
        if (covered) break;
      }
      if (covered) totalCovered++;
    }

    const coverage = totalCovered / sampleCount;
    range.coverage = coverage;

    if (coverage >= 0.75) {
      range.status = 'completed';
    } else if (coverage > 0) {
      range.status = 'in-progress';
    } else {
      range.status = 'upcoming';
    }
  });
  persistRegionMeasured();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  NATIONAL PARKS — track segmentation by protected areas
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Entry points: where the GHT route enters each national park / conservation area
// Track is split at these coordinates into color-coded sections
const nationalParks = [
  { name: '干城章嘉保护区', nameEn: 'Kanchenjunga CA', color: '#FF6B6B',
    entryLat: 27.370, entryLon: 87.750,
    highlights: ['干城章嘉峰南北大本营', '杜鹃花森林', '林布族村庄'] },
  { name: '马卡鲁-巴润国家公园', nameEn: 'Makalu Barun NP', color: '#FFA94D',
    entryLat: 27.680, entryLon: 87.780,
    highlights: ['马卡鲁峰', '阿润河谷', '世界级生物多样性'] },
  { name: '萨加玛塔国家公园', nameEn: 'Sagarmatha NP', color: '#FFD43B',
    entryLat: 27.860, entryLon: 86.920,
    highlights: ['珠峰大本营', '三垭口穿越', '昆布冰川'] },
  { name: '高里香卡保护区', nameEn: 'Gaurishankar CA', color: '#69DB7C',
    entryLat: 27.830, entryLon: 86.650,
    highlights: ['若瓦岭秘境山谷', 'Tashi Lapcha垭口', '冰川穿越'] },
  { name: '郎当国家公园', nameEn: 'Langtang NP', color: '#38D9A9',
    entryLat: 27.870, entryLon: 86.100,
    highlights: ['戈赛昆达圣湖群', '塔芒文化遗产步道', 'Panch Pokhari'] },
  { name: '马纳斯鲁保护区', nameEn: 'Manaslu CA', color: '#4DABF7',
    entryLat: 28.300, entryLon: 85.150,
    highlights: ['马纳斯鲁峰环绕', '楚姆山谷', 'Larkya La垭口'] },
  { name: '安纳普尔纳保护区', nameEn: 'Annapurna CA', color: '#748FFC',
    entryLat: 28.400, entryLon: 84.700,
    highlights: ['Thorong La垭口', '木斯塘边境', '马南高海拔荒漠'] },
  { name: '道拉吉里-多尔普东', nameEn: 'Dhorpatan HR', color: '#DA77F2',
    entryLat: 28.700, entryLon: 83.800,
    highlights: ['道拉吉里峰群', 'Dhorpatan狩猎保护区', '偏远露营路段'] },
  { name: '谢伊-佛克松多国家公园', nameEn: 'Shey Phoksundo NP', color: '#F783AC',
    entryLat: 29.000, entryLon: 83.200,
    highlights: ['Kagmara La垭口', '佛克松多湖', '多尔普秘境'] },
  { name: '拉拉国家公园', nameEn: 'Rara NP', color: '#63E6BE',
    entryLat: 29.600, entryLon: 82.400,
    highlights: ['Nara La垭口', '拉拉湖', '远西秘境'] },
];

const sectionColors = (window.GHT_SECTIONS || []).map(r => r.color);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  轨迹着色规范（UI 设计决策, 2026-07-15 修订）
//   · 实际徒步轨迹 = 一整条青色实线（醒目、连续）
//   · 预设轨迹（未走部分）= 原区域色实线描边（保持原色，无金色填充、无虚线）
//   · 预设已被实际轨迹覆盖的部分不再单独绘制，由青色实际轨迹表达
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ACTUAL_TRACK_COLOR = '#3fb950';   // 实际徒步轨迹：实心绿色

// 将一条经纬度折线沿垂直方向偏移 dist 米，返回新折线（用于绘制双平行虚线）。
function offsetPolyline(coords, dist) {
  const R = 111320;
  const out = [];
  for (let i = 0; i < coords.length; i++) {
    const lat = coords[i][0], lng = coords[i][1];
    const prev = coords[Math.max(0, i - 1)];
    const next = coords[Math.min(coords.length - 1, i + 1)];
    const dLat = next[0] - prev[0];
    const dLng = next[1] - prev[1];
    if (dLat === 0 && dLng === 0) { out.push([lat, lng]); continue; }
    const dy = dLat * R;
    const dx = dLng * R * Math.cos(lat * Math.PI / 180);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    out.push([
      lat + (ny / R) * dist,
      lng + (nx / (R * Math.cos(lat * Math.PI / 180))) * dist
    ]);
  }
  return out;
}

// 根据当前地图缩放级别，返回指定纬度处「1 像素 = ? 米」。
function metersPerPixelAt(lat) {
  const zoom = map.getZoom();
  return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
}

// 画「计划轨迹」：两条平行白色细虚线（效果 ≈ ═══）。
function drawPlannedDoubleDashed(coords, layerGroup, popupHtml, weight, opacity) {
  if (!coords || coords.length < 2) return;
  const mid = coords[Math.floor(coords.length / 2)];
  const scale = metersPerPixelAt(mid[0]);
  // 两线中心间距固定为 4 像素，总宽度比绿色实际线稍宽一点点
  const GAP_PX = 4;
  const OFFSET = (GAP_PX * scale) / 2;
  const opts = {
    color: '#ffffff', weight: weight || 2, opacity: (opacity == null ? 0.95 : opacity),
    dashArray: '4,6', lineCap: 'round', lineJoin: 'round'
  };
  L.polyline(offsetPolyline(coords, OFFSET), opts).addTo(layerGroup);
  const r = L.polyline(offsetPolyline(coords, -OFFSET), opts).addTo(layerGroup);
  if (popupHtml) r.bindPopup(popupHtml);
}

// Split a point array into continuous segments at break markers (cross-segment jumps)
function splitByBreaks(points) {
  if (!points || points.length === 0) return [];
  const segments = [];
  let current = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (points[i]._break) {
      if (current.length >= 2) segments.push(current);
      current = [points[i]];
    } else {
      current.push(points[i]);
    }
  }
  if (current.length >= 2) segments.push(current);
  return segments;
}

// 预设轨迹：作为「目标计划线」整条连续绘制（两条平行白色细虚线，效果 ≈ ═══）。
// 不按 _walked 切分，绝不会断开；实际走过的部分由上方绿色实际轨迹叠加表达（预设在下、实际在上）。
function drawPresetFidelity(points, color, layerGroup, popupHtml) {
  const coords = points.map(p => [p.lat, p.lon]);
  drawPlannedDoubleDashed(coords, layerGroup, popupHtml, 1.6, 0.95);
}

// 每段名称标签已按用户要求移除（地图上不再显示区域名标签）。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RENDER ALL TRACKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderAllTracks() {
  uploadedTrackGroup.clearLayers();

  // 1. Draw preset track sections — 未走部分用原区域色实线（已走部分交给青色实际轨迹）
  if (APP.presetTrack && APP.presetTrack.trackPoints.length >= 2) {
    // 兜底连续底线：先画一整条贯穿全程的细浅色线，桥接各区域段端点之间的物理缝隙，
    // 避免「段与段独立 polyline」在端点间距较大时产生视觉「断开」。彩色分段线叠在其上。
    const _baseCoords = APP.presetTrack.trackPoints.map(p => [p.lat, p.lon]);
    drawPlannedDoubleDashed(_baseCoords, uploadedTrackGroup, null, 1.6, 0.5);

    if (APP.sectionRanges && APP.sectionRanges.length > 0) {
      // Draw by national park sections (each with its own color)
      APP.sectionRanges.forEach((range, idx) => {
        const slice = APP.presetTrack.trackPoints.slice(range.startIndex, range.endIndex + 1);
        if (slice.length < 2) return;
        const popupHtml = '<b>📍 ' + (range.regionEn || ('Section ' + (idx + 1))) + '</b><br>' +
          (range.regionZh ? '<span style="font-size:11px;color:#888">' + range.regionZh + '</span><br>' : '') +
          '状态: ' + (range.status === 'completed' ? '✅ 已完成' : range.status === 'in-progress' ? '🔵 进行中' : '⚪ 未开始') +
          (range.coverage ? '<br>覆盖: ' + (range.coverage * 100).toFixed(0) + '%' : '') +
          '<br>距离: ~' + Math.round((range.endDist - range.startDist) / 1000) + 'km';
        drawPresetFidelity(slice, range.regionColor || '#888', uploadedTrackGroup, popupHtml);
      });

      // Draw prefix segment: track points BEFORE the first section's startIndex
      // (e.g., Phungling → Kanchenjunga entry). 作为未走预设的一部分，用首个区域原色实线。
      const firstStartIdx = APP.sectionRanges[0].startIndex;
      if (firstStartIdx > 1) {
        const prefix = APP.presetTrack.trackPoints.slice(0, firstStartIdx);
        if (prefix.length >= 2) {
          const coords = prefix.map(p => [p.lat, p.lon]);
          drawPlannedDoubleDashed(coords, uploadedTrackGroup, '<b>📍 起始段</b><br>起点 → 第一个区域入口<br>距离: ~' +
            Math.round((APP.presetTrack.distances[firstStartIdx] || 0) / 1000) + 'km', 1.6, 0.9);
        }
      }

      // 每段名称标签已按用户要求移除（地图上不再显示区域名标签）
    } else {
      // Fallback: no section ranges (e.g. single-day track not near any park entry)
      // Draw as one continuous line with default color
      const segs = splitByBreaks(APP.presetTrack.trackPoints);
      segs.forEach(seg => {
        const coords = seg.map(p => [p.lat, p.lon]);
        drawPlannedDoubleDashed(coords, uploadedTrackGroup, '<b>📐 预设轨迹</b><br>距离: ~' + (APP.totalDistance || '—') + 'km', 1.6, 0.9);
      });
    }

    // Preset start & end markers — neutral pin style (light fill, dark ring) so they
    // read as waypoints, never as a "section color" that could be confused with Kanchenjunga red.
    const start = APP.presetTrack.trackPoints[0];
    const end = APP.presetTrack.trackPoints[APP.presetTrack.trackPoints.length - 1];
    L.circleMarker([start.lat, start.lon], { radius: 6, color: '#0d1219', fillColor: '#e6edf3', fillOpacity: 1, weight: 2 })
      .bindPopup('<b>🚩 预设起点</b>').addTo(uploadedTrackGroup);
    L.circleMarker([end.lat, end.lon], { radius: 6, color: '#0d1219', fillColor: '#e6edf3', fillOpacity: 1, weight: 2 })
      .bindPopup('<b>🏁 预设终点</b>').addTo(uploadedTrackGroup);

    // 标注点默认不加载到地图——点开某路段详情时由 showSectionWaypoints() 按需显示该段标注点
    computeWaypointSections();
  }

  // 2. 实际徒步轨迹 —— 作为细而克制的「真实 GPS 路径」叠加在计划路线之上。
  //    进度已由下方计划段的协调色填充表达，这里只保留精确的已走路径痕迹，不抢轮廓与进度填充的风头。
  APP.actualTracks.forEach((track, idx) => {
    if (track.trackPoints.length < 2) return;

    // 匹配该轨迹所属区域（仅用于起点圆点的配色）
    let sectionColor = '#3fb950';
    if (APP.sectionRanges && APP.sectionRanges.length > 0 && APP.presetTrack) {
      const midPt = track.trackPoints[Math.floor(track.trackPoints.length / 2)];
      let bestIdx = 0, bestDist = Infinity;
      APP.sectionRanges.forEach((range, si) => {
        const midIdx = Math.floor((range.startIndex + range.endIndex) / 2);
        const rp = APP.presetTrack.trackPoints[Math.min(midIdx, APP.presetTrack.trackPoints.length - 1)];
        const d = haversine(midPt.lat, midPt.lon, rp.lat, rp.lon);
        if (d < bestDist) { bestDist = d; bestIdx = si; }
      });
      sectionColor = APP.sectionRanges[bestIdx].regionColor || '#3fb950';
    }

    // 实际轨迹「整条连续青线」：一整条画完，不按段切分。
    // 深底描边提升在彩色地形上的对比度。
    const acoords = track.trackPoints.map(p => [p.lat, p.lon]);
    L.polyline(acoords, { color: '#0d1219', weight: 6, opacity: 0.5, lineCap: 'round', lineJoin: 'round' }).addTo(uploadedTrackGroup);
    L.polyline(acoords, { color: ACTUAL_TRACK_COLOR, weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(uploadedTrackGroup);

    const s = track.trackPoints[0], e = track.trackPoints[track.trackPoints.length - 1];
    L.circleMarker([s.lat, s.lon], { radius: 4, color: '#fff', fillColor: sectionColor, fillOpacity: 1, weight: 2 })
      .bindPopup('<b>📍 实际轨迹 ' + (idx + 1) + ' 起点</b>').addTo(uploadedTrackGroup);
    L.circleMarker([e.lat, e.lon], { radius: 4, color: '#fff', fillColor: '#f85149', fillOpacity: 1, weight: 2 })
      .bindPopup('<b>🏁 实际轨迹 ' + (idx + 1) + ' 终点</b>').addTo(uploadedTrackGroup);
  });

  // 3. Current position
  if (APP.actualTracks.length > 0) {
    const lastTrack = APP.actualTracks[APP.actualTracks.length - 1];
    if (lastTrack.trackPoints.length > 0) {
      const last = lastTrack.trackPoints[lastTrack.trackPoints.length - 1];
      APP.currentPosition = last;
      saveCurrentPosition();
    }
  }

  // 4. Draw hiking person
  drawHikingPerson();

  // 5. Update progress
  updateProgress();

  // 6. Update elevation profile
  drawElevationProfile();

}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HIKING PERSON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 标注点：创建 / 预计算归属 / 按需显示 ──
function createWaypointMarker(wp) {
  const desc = wp.desc || wp.name || '';
  const tooltip = '<div style="min-width:140px;line-height:1.5">' +
    '<b>' + desc + '</b>' +
    (wp.name && wp.name !== desc ? '<br><span style="color:#aaa;font-size:11px">' + wp.name + '</span>' : '') +
    (wp.elev != null ? '<br><span style="color:#8b949e">&#x2191; ' + Math.round(wp.elev) + 'm</span>' : '') +
    (wp.comment ? '<br><span style="font-size:11px;color:#777">' + wp.comment + '</span>' : '') +
    '</div>';

  let svgIcon, iconSize, iconAnchor;
  switch (wp._type) {
    case 'camp':
      iconSize = [20, 20]; iconAnchor = [10, 10];
      svgIcon = '<svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="10" fill="#3fb950"/><path d="M5,15 L10,6 L15,15 Z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><line x1="10" y1="6" x2="10" y2="15" stroke="#fff" stroke-width="1.2"/></svg>';
      break;
    case 'pass':
      iconSize = [20, 20]; iconAnchor = [10, 10];
      svgIcon = '<svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="10" fill="#1a1a1a"/><path d="M4,15 L8,8 L10,11 L13,5 L16,15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      break;
    case 'peak':
      iconSize = [18, 18]; iconAnchor = [9, 9];
      svgIcon = '<svg viewBox="0 0 18 18" width="18" height="18"><polygon points="9,2 2,15 16,15" fill="#F85149" stroke="#fff" stroke-width="0.8"/></svg>';
      break;
    default:
      iconSize = [18, 18]; iconAnchor = [9, 9];
      svgIcon = '<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="4" fill="#58a6ff" stroke="#fff" stroke-width="1"/></svg>';
  }

  const icon = L.divIcon({
    html: '<div style="line-height:1;text-align:center;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.5))">' + svgIcon + '</div>',
    iconSize: iconSize, iconAnchor: iconAnchor, className: ''
  });

  return L.marker([wp.lat, wp.lon], { icon })
    .bindTooltip(tooltip, { direction: 'top', offset: [0, -12], opacity: 0.95, className: 'wpt-tooltip' });
}

// 预计算每个标注点归属哪一段（依据其与预设轨迹最近点落入的 sectionRange）
function computeWaypointSections() {
  if (!APP.presetTrack || !APP.presetTrack.waypoints || !APP.presetTrack.trackPoints) return;
  const tp = APP.presetTrack.trackPoints;
  if (!tp.length) return;
  const ranges = APP.sectionRanges || [];
  const step = Math.max(1, Math.floor(tp.length / 2000));
  APP.presetTrack.waypoints.forEach(wp => {
    let bestIdx = 0, bestD = Infinity;
    for (let i = 0; i < tp.length; i += step) {
      const d = haversine(wp.lat, wp.lon, tp[i].lat, tp[i].lon);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    let sid = 0;
    for (let r = 0; r < ranges.length; r++) {
      if (bestIdx >= ranges[r].startIndex && bestIdx <= ranges[r].endIndex) { sid = r + 1; break; }
    }
    wp._sectionId = sid;
  });
}

// 点开某路段时，只显示该段的标注点（切换路段自动清除上一组）
function showSectionWaypoints(secId) {
  waypointLayer.clearLayers();
  if (!APP.presetTrack || !APP.presetTrack.waypoints) return;
  const inThis = APP.presetTrack.waypoints.filter(wp => wp._sectionId === secId);
  inThis.forEach(wp => { createWaypointMarker(wp).addTo(waypointLayer); });
  if (inThis.length > 0 && !map.hasLayer(waypointLayer)) waypointLayer.addTo(map);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = lat1 * Math.PI / 180, phi2 = lat2 * Math.PI / 180;
  const dLam = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  return Math.atan2(y, x) * 180 / Math.PI;
}

function drawHikingPerson() {
  if (APP.hikingPersonMarker) {
    uploadedTrackGroup.removeLayer(APP.hikingPersonMarker);
    APP.hikingPersonMarker = null;
  }

  if (!APP.currentPosition) return;
  const pos = APP.currentPosition;
  let bearing = 0;

  if (APP.presetTrack && APP.presetTrack.trackPoints.length > 1) {
    const pts = APP.presetTrack.trackPoints;
    let closestI = -1, closestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = haversine(pos.lat, pos.lon, pts[i].lat, pts[i].lon);
      if (d < closestD) { closestD = d; closestI = i; }
    }
    if (closestI >= 0 && closestI < pts.length - 1) {
      bearing = calculateBearing(pts[closestI].lat, pts[closestI].lon, pts[closestI + 1].lat, pts[closestI + 1].lon);
    }
  }

  const ele = pos.elev != null ? Math.round(pos.elev) + 'm' : '?';

  const icon = L.divIcon({
    html: `<div style="position:relative;width:44px;height:44px;">
      <div style="position:absolute;top:50%;left:50%;width:10px;height:10px;border-radius:50%;background:rgba(248,81,73,0.4);transform:translate(-50%,-50%);animation:location-pulse 2s ease-out infinite;"></div>
      <div style="position:absolute;top:50%;left:50%;width:10px;height:10px;border-radius:50%;background:rgba(248,81,73,0.25);transform:translate(-50%,-50%);animation:location-pulse2 2s ease-out infinite 0.6s;"></div>
      <svg width="44" height="44" viewBox="0 0 44 44" style="position:absolute;top:0;left:0;transform:rotate(${bearing}deg);">
        <line x1="22" y1="28" x2="22" y2="6" stroke="#F85149" stroke-width="3" stroke-linecap="round"/>
        <polygon points="22,2 18,8 26,8" fill="#F85149"/>
        <circle cx="22" cy="22" r="8" fill="#F85149"/>
        <circle cx="22" cy="22" r="4" fill="#fff"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });

  APP.hikingPersonMarker = L.marker([pos.lat, pos.lon], { icon })
    .bindPopup('<b>📍 当前位置</b><br>⛰️ 海拔: ' + ele + (APP.currentSection ? '<br>🏔️ 第' + APP.currentSection + '段' : ''))
    .addTo(uploadedTrackGroup);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UPDATE PROGRESS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateProgress() {
  if (APP.sectionRanges && APP.sectionRanges.length > 0) {
    checkAllSectionsCompletion();
    let completedDist = 0, totalDist = 0;

    APP.sectionRanges.forEach(range => {
      const sectionDist = (range.endDist - range.startDist) / 1000;
      totalDist += sectionDist;
      if (range.status === 'completed') {
        completedDist += sectionDist;
      } else if (range.status === 'in-progress') {
        completedDist += sectionDist * (range.coverage || 0);
      }
    });

    APP.completedDistance = completedDist * 1000;
    APP.progressPercentage = parseFloat(((completedDist / totalDist) * 100).toFixed(1));
    APP.progressPct = APP.progressPercentage;
    return;
  }

  if (!APP.presetTrack || !APP.currentPosition) return;

  const presetPoints = APP.presetTrack.trackPoints;
  let minDist = Infinity, closestIdx = -1;
  for (let i = 0; i < presetPoints.length; i++) {
    const d = haversine(APP.currentPosition.lat, APP.currentPosition.lon, presetPoints[i].lat, presetPoints[i].lon);
    if (d < minDist) { minDist = d; closestIdx = i; }
  }

  APP.progressPercentage = (closestIdx / (presetPoints.length - 1)) * 100;
  APP.progressPct = Math.round(APP.progressPercentage);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GPX UPLOAD HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Merge multiple GPX segments into one continuous track
// segments: [{ trackPoints, waypoints, fileName }]
function mergeGPXSegments(segments) {
  const mergedTrackPoints = [];
  const mergedWaypoints = [];

  segments.forEach(seg => {
    // Append all track points (preserve order)
    mergedTrackPoints.push(...seg.trackPoints);
    // Append waypoints (去重统一在末尾 dedupeWaypoints 处理)
    seg.waypoints.forEach(wp => mergedWaypoints.push(wp));
  });

  return { trackPoints: mergedTrackPoints, waypoints: dedupeWaypoints(mergedWaypoints) };
}

// 标注点去重：同名 + 同海拔 + 坐标在 ~100m 内 视为同一点（吸收 GPX 重复导出 / 浮点噪声）。
// 命名点：名称|海拔(5m分桶，吸收1m量测误差)|坐标(2位≈1.1km) 去重；
// 无名点退化为纯坐标(3位≈111m)。避免「垭口清单」/ 地图出现重名且落差≤1m 的重复项。
function dedupeWaypoints(wps) {
  if (!wps || !wps.length) return wps || [];
  const out = [];
  for (const w of wps) {
    const name = (w.desc || w.name || '').trim();
    let merged = false;
    if (name) {
      // 同名垭口：坐标 500m 内视为同一座（覆盖 GPX 重复打点 / 精度误差）。
      // 仅按坐标距离判定，避免把「同名且同海拔但相距甚远」的真实垭口（如双 Renjo La）误并。
      for (const o of out) {
        if ((o.desc || o.name || '').trim() !== name) continue;
        if (o.lat != null && w.lat != null) {
          if (haversine(o.lat, o.lon, w.lat, w.lon) <= 500) { merged = true; break; }
        } else if (o.elev != null && w.elev != null && Math.abs(o.elev - w.elev) <= 20) {
          merged = true; break; // 无坐标时退化为海拔近似(≤20m)
        }
      }
    } else {
      // 无名点：维持原坐标容差(3 位小数 ≈ 111m)
      const key = w.lat.toFixed(3) + ',' + w.lon.toFixed(3);
      if (out.some(o => (o.lat.toFixed(3) + ',' + o.lon.toFixed(3)) === key)) merged = true;
    }
    if (!merged) out.push(w);
  }
  return out;
}

// Read a single File object as text (Promise wrapper)
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('读取失败: ' + file.name));
    reader.readAsText(file, 'UTF-8');
  });
}

// Extract day number from filename like "ght-day01.gpx", "ght_day_5.gpx", "Day03.gpx"
function extractDayNumber(fileName) {
  const m = fileName.match(/day[-_]?(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

// Check for gaps between consecutive segments (>500m gap = potential missing file)
function checkSegmentGaps(segments, restDays) {
  const gaps = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const curr = segments[i];
    const next = segments[i + 1];
    const lastPt = curr.trackPoints[curr.trackPoints.length - 1];
    const firstPt = next.trackPoints[0];
    const dist = haversine(lastPt.lat, lastPt.lon, firstPt.lat, firstPt.lon) / 1000; // haversine 返回米，转 km 与阈值/显示一致

    // If there's a rest day between them, skip gap check (staying at camp)
    if (curr.dayNum && next.dayNum) {
      const between = Math.abs(next.dayNum - curr.dayNum);
      if (between > 1) {
        // Days between are rest days — expect small gap
        if (dist > 0.5) {
          gaps.push({ fromDay: curr.dayNum, toDay: next.dayNum, dist });
        }
        continue;
      }
    }

    // Normal consecutive days: >500m gap is suspicious
    if (dist > 0.5) {
      gaps.push({ fromDay: curr.dayNum || (i + 1), toDay: next.dayNum || (i + 2), dist });
    }
  }
  return gaps;
}

// Check for duplicate segments (same points = duplicate file)
function checkDuplicateSegments(segments) {
  const dups = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i];
      const b = segments[j];
      // Same filename = definitely duplicate
      if (a.fileName.toLowerCase() === b.fileName.toLowerCase()) {
        dups.push({ type: '同名文件', fileA: a.fileName, fileB: b.fileName });
        continue;
      }
      // Same point count + same first point (~11m) = likely duplicate
      if (a.trackPoints.length === b.trackPoints.length) {
        const fa = a.trackPoints[0], fb = b.trackPoints[0];
        if (Math.abs(fa.lat - fb.lat) < 0.0001 && Math.abs(fa.lon - fb.lon) < 0.0001) {
          dups.push({ type: '轨迹相同', fileA: a.fileName, fileB: b.fileName });
        }
      }
    }
  }
  return dups;
}

// Show loading overlay with a safety timeout so it never gets stuck forever
function showLoader() {
  const loader = document.getElementById('loadingOverlay');
  if (loader) loader.classList.add('active');
  if (APP.loaderTimeout) clearTimeout(APP.loaderTimeout);
  APP.loaderTimeout = setTimeout(() => {
    if (loader) loader.classList.remove('active');
    console.warn('Loading overlay auto-hidden after 12s safety timeout');
  }, 12000);
}

function hideLoader() {
  const loader = document.getElementById('loadingOverlay');
  if (loader) loader.classList.remove('active');
  if (APP.loaderTimeout) { clearTimeout(APP.loaderTimeout); APP.loaderTimeout = null; }
}

// 把原始 GPX 文件备份到服务器（仅主人态、且持有有效 token 时）
function uploadRawFiles(files) {
  if (!APP.isOwner || !API.getToken()) return;
  API.upload(files).catch(e => {
    console.warn('[ght] 服务器轨迹备份失败（不影响本地使用）', e);
  });
}

function handleGPXUpload(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // 主人态：把原始 GPX 备份到服务器（不影响本地解析流程，失败静默）
  uploadRawFiles(files);

  showLoader();

  // Sort files by name for consistent ordering
  files.sort((a, b) => a.name.localeCompare(b.name, 'zh', { numeric: true }));

  // Parse all files in parallel (with a tiny delay so the loader can paint first)
  new Promise(resolve => setTimeout(resolve, 50)).then(() =>
    Promise.all(files.map(f => readFileAsText(f).then(text => {
      const gpxData = parseGPX(text);
      gpxData.fileName = f.name;
      gpxData.dayNum = extractDayNumber(f.name);
      return gpxData;
    })))
  ).then(allParsed => {

    hideLoader();

    // Filter out files with too few track points
    const valid = allParsed.filter(d => d.trackPoints.length >= 2);
    const skipped = allParsed.length - valid.length;

    if (valid.length === 0) {
      alert('⚠️ 没有找到有效的轨迹文件。\n请确认文件包含 trkpt 字段的标准 GPX。');
      return;
    }

    if (skipped > 0) {
      console.warn(`跳过 ${skipped} 个无效文件（轨迹点不足）`);
    }

    // Single file — original flow
    if (valid.length === 1) {
      const gpxData = valid[0];
      const stats = calculateGPXStats(gpxData);
      APP.lastGPXData = gpxData;
      handleSingleUpload(gpxData, stats);
      return;
    }

    // Multiple files — sort by day number if available, else by filename
    const hasDayNums = valid.every(d => d.dayNum !== null);
    if (hasDayNums) {
      valid.sort((a, b) => a.dayNum - b.dayNum);
    }

    // Detect missing days (rest days) when day numbers are present
    let restDays = [];
    let dayRangeInfo = '';
    if (hasDayNums) {
      const dayNums = valid.map(d => d.dayNum);
      const minDay = Math.min(...dayNums);
      const maxDay = Math.max(...dayNums);
      for (let d = minDay; d <= maxDay; d++) {
        if (!dayNums.includes(d)) restDays.push(d);
      }
      if (restDays.length > 0) {
        dayRangeInfo = `\n📅 Day ${minDay} → Day ${maxDay}，缺号 ${restDays.length} 天（休息日）: Day ${restDays.join(', Day ')}\n`;
        // Store rest days for itinerary integration
        APP.presetRestDays = restDays;
      } else {
        dayRangeInfo = `\n📅 Day ${minDay} → Day ${maxDay}（连续 ${maxDay - minDay + 1} 天）\n`;
      }
    }

    // Validation: check for gaps and duplicates
    const gaps = checkSegmentGaps(valid, restDays);
    const dups = checkDuplicateSegments(valid);
    let warnings = '';
    let hasErrors = false;

    if (dups.length > 0) {
      hasErrors = true;
      warnings += `\n⚠️ 重复文件检测 (${dups.length}处):\n`;
      dups.forEach(d => {
        warnings += `  • ${d.type}: ${d.fileA} ↔ ${d.fileB}\n`;
      });
    }

    if (gaps.length > 0) {
      warnings += `\n⚠️ 轨迹断开检测 (${gaps.length}处，>500m):\n`;
      gaps.forEach(g => {
        warnings += `  • Day ${String(g.fromDay).padStart(2, '0')} 终点 ↔ Day ${String(g.toDay).padStart(2, '0')} 起点: ${g.dist.toFixed(1)}km\n`;
      });
      warnings += `\n可能原因: 缺失文件 / 路线不连续 / GPS 起点偏移\n`;
    }

    if (warnings) {
      warnings = '\n' + warnings;
    }

    // Merge
    const merged = mergeGPXSegments(valid);
    const stats = calculateGPXStats(merged);
    merged.fileName = `${valid.length}个文件合并`;
    merged.dayRange = hasDayNums ? { min: valid[0].dayNum, max: valid[valid.length - 1].dayNum, restDays } : null;
    APP.lastGPXData = merged;

    const fileNames = valid.map(d => `Day${d.dayNum !== null ? String(d.dayNum).padStart(2, '0') : '?'} ${d.fileName}`).join('\n  • ');
    const msg = `批量导入了 ${valid.length} 个文件（按日期排序合并）:\n  • ${fileNames}\n${dayRangeInfo}${warnings}` +
      `\n合并后: ${merged.trackPoints.length} 个轨迹点, ${stats.distance.toFixed(1)}km\n\n` +
      `设为「预设轨迹」吗？\n（预设轨迹作为完整路线参考，后续上传的实际轨迹将与之对比）`;

    if (!APP.presetTrack) {
      // No preset yet
      if (confirm(msg)) {
        setAsPreset(merged, stats);
        APP.presetSegments = valid;
        persistPresetSegments(valid);
        pushShare();   // 计划路线 + 分段同步到共享包
        applySegmentItinerary(valid, restDays);
        // 预设轨迹只作为「计划路线」写入行程安排（actual 仍为 null）。
        // 真正的「已记录 / 已完成」要等用户上传实际徒步轨迹后才会同步填充。
        matchItineraryToActuals();
        saveItinerary();
        alert('✅ 已将 ' + valid.length + ' 段分日预设轨迹写入行程安排（含 ' + restDays.length + ' 个休息日）。\n行程为「计划」状态，上传实际轨迹后自动同步进度。');
        renderAllTracks();
        updateProgressDOM();
        openPanel(APP.activeTab || 'progress');
      }
    } else {
      const choice = confirm(`已加载预设轨迹。\n\n批量导入 ${valid.length} 个文件（已合并）。\n${dayRangeInfo}\n` +
        `点击「确定」→ 添加为实际行程段（同时用分段数据更新日程）\n` +
        `点击「取消」→ 替换为新的预设轨迹（同时用分段数据更新日程）`);
      if (choice) {
        // 仅作为「实际徒步轨迹」追加：保留预设路线、分段、总距离、日程 from/to 不变，
        // 由 matchItineraryToActuals 按 dayNum 精确同步到对应日程并与计划对比。
        valid.forEach(seg => {
          const segStats = seg.stats || calculateGPXStats(seg);
          const segDaily = calculateDailyStats(seg.trackPoints);
          APP.actualTracks.push({
            ...seg,
            waypoints: [],          // 实际轨迹不含标注点
            stats: segStats,
            distance: segStats.distance,
            elevGain: segStats.elevGain,
            elevLoss: segStats.elevLoss,
            durationStr: segDaily ? segDaily.durationStr : null,
            avgSpeed: segDaily ? segDaily.avgSpeed : null,
            startTime: segDaily ? segDaily.startTime : null,
            endTime: segDaily ? segDaily.endTime : null,
            date: segDaily ? segDaily.date : null,
            uploadedAt: new Date().toISOString()
          });
        });
        try {
          const dec = APP.actualTracks.map(t => ({ ...t, trackPoints: decimateTrack(t.trackPoints, 700) }));
          localStorage.setItem('ght_actual', JSON.stringify(dec));
        } catch(e) {
          try {
            const dec = APP.actualTracks.map(t => ({ ...t, trackPoints: decimateTrack(t.trackPoints, 250) }));
            localStorage.setItem('ght_actual', JSON.stringify(dec));
          } catch(e2) {}
        }
        matchItineraryToActuals();
        pushShare();   // 已记录轨迹变更同步到共享包
        renderAllTracks();
        updateProgressDOM();
        openPanel(APP.activeTab || 'progress');
        alert('✅ 已添加 ' + valid.length + ' 段实际徒步轨迹。\n预设路线与计划日程保持不变，已按轨迹尼泊尔 GPS 日期自动对比进度。');
      } else {
        // 替换为新的预设轨迹（重算路线、分段、日程）
        setAsPreset(merged, stats);
        APP.presetSegments = valid;
        persistPresetSegments(valid);
        pushShare();   // 计划路线 + 分段同步到共享包
        const ok = applySegmentItinerary(valid, restDays);
        matchItineraryToActuals();
        if (ok) saveItinerary();
        renderAllTracks();
        updateProgressDOM();
        openPanel(APP.activeTab || 'progress');
        alert('✅ 已将 ' + valid.length + ' 段分日预设轨迹写入行程安排（含 ' + restDays.length + ' 个休息日）。');
      }
    }

  }).catch(err => {
    hideLoader();
    console.error('GPX 批量解析失败:', err);
    alert('❌ GPX 解析失败: ' + (err && err.message ? err.message : String(err)));
  });

  event.target.value = '';
}

// Handle single file upload (extracted from original flow)
function handleSingleUpload(gpxData, stats) {
  if (!APP.presetTrack) {
    if (confirm('这是您第一次上传轨迹！\n\n设为「预设轨迹」吗？\n\n预设轨迹将作为完整的 GHT 路线参考，后续上传的实际轨迹将与之对比以计算进度。')) {
      setAsPreset(gpxData, stats);
      return;
    }
  }

  const choice = confirm('已加载预设轨迹。\n\n点击「确定」将此文件添加为实际行程段\n点击「取消」将此文件设为新的预设轨迹（替换当前预设）');
  if (choice) {
    addActualTrack(gpxData, stats);
  } else {
    setAsPreset(gpxData, stats);
  }

  APP.gpxDistance = stats.distance;
  APP.gpxElevGain = stats.elevGain;
  APP.gpxElevLoss = stats.elevLoss;

  if (APP.activeTab === 'progress') openPanel('progress');
  else openPanel(APP.activeTab);
}

// Add a track as actual (walked) segment
function addActualTrack(gpxData, stats) {
  // 实际徒步轨迹不含标注点：强制清空 waypoints，避免污染地图/标注列表。
  // 同时把距离/爬升等暴露为顶层字段，供 matchItineraryToActuals 直接读取。
  const dailyStats = calculateDailyStats(gpxData.trackPoints);
  const actualObj = {
    ...gpxData,
    waypoints: [],
    stats,
    distance: stats.distance,
    elevGain: stats.elevGain,
    elevLoss: stats.elevLoss,
    durationStr: dailyStats ? dailyStats.durationStr : null,
    avgSpeed: dailyStats ? dailyStats.avgSpeed : null,
    startTime: dailyStats ? dailyStats.startTime : null,
    endTime: dailyStats ? dailyStats.endTime : null,
    date: dailyStats ? dailyStats.date : null,
    uploadedAt: new Date().toISOString()
  };
  APP.actualTracks.push(actualObj);
  checkAllSectionsCompletion();
  try {
    const dec = APP.actualTracks.map(t => ({ ...t, trackPoints: decimateTrack(t.trackPoints, 700) }));
    localStorage.setItem('ght_actual', JSON.stringify(dec));
    localStorage.setItem('ght_sections', JSON.stringify(APP.sectionRanges));
  } catch(e) {
    try {
      const dec = APP.actualTracks.map(t => ({ ...t, trackPoints: decimateTrack(t.trackPoints, 250) }));
      localStorage.setItem('ght_actual', JSON.stringify(dec));
    } catch(e2) {}
  }
  pushShare();   // 单段实际轨迹变更同步到共享包

  if (dailyStats && dailyStats.date) {
    // 自动归类到对应路段：与地图一致，按预设轨迹几何顺序判定
    // （不再用单锚点最近距离，否则东端起点会被错判成马卡鲁等相邻路段）。
    let logSectionId = null;
    try {
      const sp = gpxData.trackPoints && gpxData.trackPoints[0];
      if (sp) {
        const r = sectionForPoint(sp);
        if (r && r.sectionId) logSectionId = r.sectionId;
      }
    } catch (e) {}
    APP.logEntries = APP.logEntries.filter(e => e.date !== dailyStats.date);
    const entry = {
      date: dailyStats.date,
      text: '📡 GPS自动记录: ' + dailyStats.distance.toFixed(1) + 'km, ' + dailyStats.elevGain.toLocaleString() + 'm爬升',
      dailyStats
    };
    if (logSectionId) entry.sectionId = logSectionId;
    APP.logEntries.push(entry);
    saveLogEntries();
  }

  // 无论轨迹是否带时间戳，都同步「行程安排」与「总轨迹进度」
  if (APP.itinerary.length) {
    matchItineraryToActuals();
    saveItinerary();
  }

  showGPXUploadResult(gpxData, stats);
  renderAllTracks();      // 内部会调用 updateProgress() 刷新总距离 / 进度百分比
  updateProgressDOM();
  openPanel(APP.activeTab || 'progress');  // 刷新当前面板，使行程/进度即时同步
}

function setAsPreset(gpxData, stats) {
  gpxData.distances = calculateTrackDistances(gpxData.trackPoints);
  gpxData.waypoints = dedupeWaypoints(gpxData.waypoints); // 去除 GPX 重复标注点（同名同海拔）
  gpxData.stats = stats;                                  // 把统计(距离/爬升/最高点)挂到预设轨迹，供征途总进度卡读取
  APP.presetTrack = gpxData;
  // Sync rest days from dayRange (batch import) or clear (single file)
  APP.presetRestDays = (gpxData.dayRange && gpxData.dayRange.restDays) ? gpxData.dayRange.restDays : [];
  APP.presetSegments = null; // single-file preset has no day segments; batch flow sets this after
  APP.actualTracks = [];
  APP.totalDistance = Math.round(stats.distance);

  APP.sectionRanges = calculateSectionRanges(APP.presetTrack);

  try {
    const p = decimatePresetTrack(APP.presetTrack, 4000);
    localStorage.setItem('ght_preset', JSON.stringify(p));
  } catch(e) {
    try {
      const p = decimatePresetTrack(APP.presetTrack, 1500);
      localStorage.setItem('ght_preset', JSON.stringify(p));
    } catch(e2) {}
  }
  try { localStorage.setItem('ght_actual', JSON.stringify([])); } catch(e) {}
  try { localStorage.setItem('ght_sections', JSON.stringify(APP.sectionRanges)); } catch(e) {}
  try { localStorage.setItem('ght_total_distance', String(APP.totalDistance)); } catch(e) {}
  try { localStorage.setItem('ght_rest_days', JSON.stringify(APP.presetRestDays || [])); } catch(e) {}

  showGPXUploadResult(gpxData, stats);
  renderAllTracks();

  drawElevationProfile();
  pushShare();   // 计划路线（含休息日/分段/总距离）同步到共享包
}

function showGPXUploadResult(gpxData, stats) {
  const dailyStats = calculateDailyStats(gpxData.trackPoints);
  let timeRow = '';
  if (dailyStats && dailyStats.startTime) {
    const startStr = new Date(dailyStats.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const endStr = dailyStats.endTime ? new Date(dailyStats.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '—';
    timeRow = `
      <div style="display:flex;gap:12px;font-size:11px;color:var(--text-dim);margin-top:4px;">
        <span>🕐 ${startStr} → ${endStr}</span>
        ${dailyStats.durationStr ? '<span>⏱️ ' + dailyStats.durationStr + '</span>' : ''}
        ${dailyStats.avgSpeed ? '<span>🚶 ' + dailyStats.avgSpeed + ' km/h</span>' : ''}
      </div>`;
  }

  APP.gpxResultHTML = `
    <div style="padding:12px;background:var(--bg);border:1px solid var(--green);border-radius:8px;margin-bottom:12px;">
      <div style="font-size:13px;font-weight:600;color:var(--green);margin-bottom:8px;">✅ GPX轨迹已加载</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">📏 距离</div><div class="value">${stats.distance.toFixed(1)}<span class="unit"> km</span></div></div>
        <div class="stat-card"><div class="label">📍 轨迹点</div><div class="value">${stats.pointCount}<span class="unit"> 个</span></div></div>
        <div class="stat-card"><div class="label">🏕️ 标注点</div><div class="value">${(gpxData.waypoints ? gpxData.waypoints.length : 0)}<span class="unit"> 个</span></div></div>
        <div class="stat-card"><div class="label">⬆️ 累计爬升</div><div class="value">${stats.elevGain.toLocaleString()}<span class="unit"> m</span></div></div>
        <div class="stat-card"><div class="label">⬇️ 累计下降</div><div class="value">${stats.elevLoss.toLocaleString()}<span class="unit"> m</span></div></div>
      </div>
      <div style="display:flex;gap:12px;font-size:11px;color:var(--text-dim);margin-top:4px;">
        <span>⬆️ 最高点: ${stats.maxElev.toLocaleString()}m</span>
        <span>⬇️ 最低点: ${stats.minElev.toLocaleString()}m</span>
      </div>
      ${timeRow}
    </div>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SAVE / LOAD (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function saveCurrentPosition() {
    try { localStorage.setItem('ght_current_pos', JSON.stringify(APP.currentPosition)); } catch(e) {}
    pushShare();   // 实时位置变更同步到共享包
  }

  function saveLogEntries() {
    try { localStorage.setItem('ght_log', JSON.stringify(APP.logEntries)); } catch(e) {}
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  全量共享（服务端 share:all：主人写入 / 所有人读取）
  //  分片 ownership：本页负责 preset/actual/pos/itinerary/segments/restDays/sections，
  //  journal 由 journal.html 负责；两者都从 sharedCache 继承对方字段，合并写入，互不覆盖。
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let sharedCache = null;

  // 真正的空共享包（带 clearedAt 时间戳）：用于「清空云端 / 重置数据」，
  // 让其他设备以空为准抹掉本地共享数据，而非把本机内容误当作权威回推上云。
  function emptyShareBundle() {
    return {
      preset: null, actual: [], pos: null, itinerary: [], itineraryStart: null,
      segments: [], restDays: [], sections: [], totalDistance: 0,
      journal: [], deletedIds: [], clearedAt: Date.now()
    };
  }

  // 实际轨迹归并：以「稳定键」去重，updatedAt 最新者胜出。
  // ⚠️ 关键修复：不再强依赖 t.date —— 很多实际轨迹 GPX 不含 <time> 时间戳，
  //    导致 date=null 而被整条静默丢弃，进而主人重推把云端 actual 清成空。
  //    现改用兜底键（date → fileName → 首点坐标），缺时间戳的轨迹也能保留。
  function mergeActualTracks(local, remote) {
    const m = new Map();
    const keyOf = (t) => {
      if (t && t.date) return 'd:' + t.date;
      if (t && t.fileName) return 'f:' + t.fileName;
      if (t && t.trackPoints && t.trackPoints[0]) {
        const p = t.trackPoints[0];
        return 'p:' + (p.lat != null ? Number(p.lat).toFixed(5) : '?') + ',' + (p.lon != null ? Number(p.lon).toFixed(5) : '?');
      }
      return 'u:' + (t ? JSON.stringify(t).length : 'x');
    };
    (remote || []).forEach(t => { if (t) m.set(keyOf(t), t); });
    (local || []).forEach(t => {
      if (!t) return;
      if (!t.updatedAt) t.updatedAt = 0;
      const k = keyOf(t);
      const cur = m.get(k);
      if (!cur || t.updatedAt >= (cur.updatedAt || 0)) m.set(k, t);
    });
    return Array.from(m.values());
  }

  function pushShare() {
    if (!APP.isOwner || !API.getToken()) return;          // 仅主人可写
    const bundle = (sharedCache && typeof sharedCache === 'object') ? JSON.parse(JSON.stringify(sharedCache)) : {};
    // deletedIds（日志墓碑）随主包一起上云，绝不被清掉
    bundle.deletedIds = (sharedCache && Array.isArray(sharedCache.deletedIds)) ? sharedCache.deletedIds : [];
    try { bundle.preset = APP.presetTrack ? decimatePresetTrack(APP.presetTrack, 4000) : null; }
    catch (e) { bundle.preset = APP.presetTrack || null; }
    bundle.actual = (APP.actualTracks || []).map(t => ({ ...t, updatedAt: t.updatedAt || Date.now(), trackPoints: decimateTrack(t.trackPoints || [], 700) }));
    bundle.pos = APP.currentPosition || null;
    bundle.itinerary = APP.itinerary || [];
    bundle.itineraryStart = APP.itineraryStartDate || null;
    bundle.segments = APP.presetSegments || null;
    bundle.restDays = APP.presetRestDays || [];
    bundle.sections = APP.sectionRanges || null;
    bundle.totalDistance = APP.totalDistance || 0;
    delete bundle.clearedAt;   // 真实写入即摘掉「已清空」标记，恢复为正常 bundle
    sharedCache = bundle;
    try { localStorage.removeItem('ght_cleared_self'); } catch (e) {}  // 任何一次推送代表已恢复共享
    API.putShare(bundle).catch(e => console.warn('[ght] 共享推送失败（不影响本地使用）', e));
  }

  function hasLocalShareableData() {
    try {
      if (localStorage.getItem('ght_preset')) return true;
      if (localStorage.getItem('ght_actual')) return true;
      if (localStorage.getItem('ght_itinerary')) return true;
      if (localStorage.getItem('ght_current_pos')) return true;
      if (localStorage.getItem('ght_log')) return true;
    } catch (e) {}
    return false;
  }

  async function loadShared() {
    try {
      const r = await API.getShare();
      if (!r.ok) return;                                // 服务端错误：保留本地，不自动种入
      const b = (r.data && r.data.data) ? r.data.data : null;
      // 服务端收到「已清空」包：其他设备以空为准抹掉本地共享字段；发起方（ght_cleared_self）保留本机
      if (b && b.clearedAt) {
        if (!localStorage.getItem('ght_cleared_self')) {
          APP.presetTrack = null; APP.totalDistance = 0; APP.sectionRanges = null;
          APP.presetSegments = null; APP.presetRestDays = null; APP.actualTracks = [];
          APP.currentPosition = null; APP.itinerary = []; APP.itineraryStartDate = null;
          try { localStorage.removeItem('ght_log'); } catch (e) {}
        }
        sharedCache = b;
        renderDashboard(); renderAllTracks(); updateProgressDOM(); drawElevationProfile();
        return;                                         // 关键：不再走后面的 owner 回推分支
      }
      if (b) {                                          // 服务端有共享内容（正常 bundle）
        sharedCache = b;
        // 先按云端为准合并渲染（actual 按 date 归并、保留 updatedAt 最新者；其余字段维持主人本地优先语义）
        if (b.preset) APP.presetTrack = b.preset;
        if (b.totalDistance) APP.totalDistance = b.totalDistance;
        if (b.sections) APP.sectionRanges = b.sections;
        if (b.segments) APP.presetSegments = b.segments;
        if (b.restDays) APP.presetRestDays = b.restDays;
        if (b.actual && b.actual.length) APP.actualTracks = mergeActualTracks(APP.actualTracks, b.actual);
        if (b.pos) APP.currentPosition = b.pos;
        if (b.itinerary && b.itinerary.length) { APP.itinerary = b.itinerary; APP.itineraryStartDate = b.itineraryStart || null; }
        // 主人（已登录且本机有可共享数据）：合并云端后再把本地编辑回推上云（sharedCache 已是云端 bundle，journal/deletedIds 被继承）
        if (APP.isOwner && API.getToken() && hasLocalShareableData()) {
          pushShare();
        }
        renderDashboard(); renderAllTracks(); updateProgressDOM(); drawElevationProfile();
        return;
      }
      // 服务端无共享内容：主人且本机确有数据 → 自动种入 KV（无需手动保存一次）
      if (APP.isOwner && API.getToken() && hasLocalShareableData()) {
        pushShare();
      }
    } catch (e) { /* 共享加载失败不影响本地渲染 */ }
  }


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OWNER MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateOwnerUI() {
  // 主人模式由密码解锁控制（APP.isOwner），不再默认开启；重置/编辑按钮的可见性由各自渲染逻辑按 isOwner 决定
}

async function clearAllData() {
  if (!confirm('⚠️ 此操作将清除所有数据，不可恢复！\n\n包括:\n- 预设轨迹\n- 实际轨迹\n- 日志\n- 路段进度\n- 行程安排\n\n确定继续？')) return;
  // 统一清除所有以 ght 开头的本地存储键（避免遗漏新增键，例如 ght_start_place）；但保留 ght_token —— 重置=清数据，不是登出
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf('ght') === 0 && k !== 'ght_token') keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
  // 同时把内存中的关键计数清零，确保 reload 前已无残留
  APP.totalDistance = 0;
  APP.completedDistance = 0;
  APP.progressPercentage = 0;
  APP.progressPct = 0;
  // 重置 = 清数据，同时以「已清空」包清空云端共享（主人唯一编辑者模型）；其他设备会同步抹掉本地共享。非主人/无 token/无后端则跳过，不影响本地重置
  if (APP.isOwner && API.getToken()) {
    try { await API.putShare(emptyShareBundle()); } catch (e) { console.warn('[ght] 云端共享清空失败（不影响本地重置）', e); }
  }
  location.reload();
}

// 主人专用：仅清空云端共享（KV），不影响本机数据。用于临时下架共享 / 清掉云端误写数据。
  async function clearCloudShare() {
    if (!APP.isOwner || !API.getToken()) { alert('仅主人且已登录时可清空云端共享'); return; }
    if (!confirm('⚠️ 此操作将清空云端共享数据，所有访客将暂时看不到轨迹。\n恢复需重新导入真实轨迹并刷新页面。\n\n确定继续？')) return;
    try {
      try { localStorage.setItem('ght_cleared_self', '1'); } catch (e) {}  // 标记「我是发起方」，保留本机数据
      await API.putShare(emptyShareBundle());
      alert('云端共享已清空。所有设备将显示为空；本机数据已保留，可点「重新发布共享」恢复上云。');
      location.reload();
    } catch (e) {
      alert('云端清空失败：' + (e && e.message ? e.message : e));
    }
  }

  // 主人专用：把本机共享数据重新发布到云端（清掉「已清空」标记与发起方标记）
  async function republishShare() {
    if (!APP.isOwner || !API.getToken()) { alert('仅主人且已登录时可重新发布'); return; }
    try { const r = await API.getShare(); if (r && r.ok && r.data && r.data.data) sharedCache = r.data.data; } catch (e) {}  // 以云端最新包为基底，保留 journal 分片
    pushShare();   // 内部会 delete clearedAt + removeItem('ght_cleared_self')
    alert('✅ 已将本机共享数据重新发布到云端');
  }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Load log entries
try {
  const savedLog = localStorage.getItem('ght_log');
  if (savedLog) APP.logEntries = JSON.parse(savedLog);
} catch(e) {}

// Load itinerary
try {
  const savedIt = localStorage.getItem('ght_itinerary');
  if (savedIt) APP.itinerary = JSON.parse(savedIt);
} catch(e) {}
try {
  const savedItStart = localStorage.getItem('ght_itinerary_start');
  if (savedItStart) APP.itineraryStartDate = savedItStart;
  const savedStartPlace = localStorage.getItem('ght_start_place');
  if (savedStartPlace) APP.startPlaceName = savedStartPlace;
} catch(e) {}
if (!APP.itinerary.length) {
  // 重置/首次打开：不自动生成「占位」行程（否则会凭空显示 156天 / 1579km，
  // 看起来像没清干净的数据）。导入预设轨迹或点击「🔄 重新生成」后才会有行程。
  APP.itinerary = [];
}

// Load preset track
try {
  const savedPreset = localStorage.getItem('ght_preset');
  if (savedPreset) APP.presetTrack = JSON.parse(savedPreset);

  const savedRestDays = localStorage.getItem('ght_rest_days');
  if (savedRestDays) APP.presetRestDays = JSON.parse(savedRestDays);

  const savedSegs = localStorage.getItem('ght_preset_segments');
  if (savedSegs) APP.presetSegments = JSON.parse(savedSegs);
} catch(e) {}

// 以分段轨迹为行程来源时，始终依据分段（含全局标注点池）重建行程，
// 确保营地/垭口正确归属到对应的一天（如 day9 的营地标注存放在 day7/day10 文件中）。
if (APP.presetSegments && APP.presetSegments.length) {
  try {
    const rebuilt = buildItineraryFromSegments(APP.presetSegments, APP.presetRestDays || []);
    if (rebuilt.length) {
      APP.itinerary = rebuilt;
      saveItinerary();
    }
  } catch(e) { console.warn('分段行程自动重建失败:', e); }
}

// Load actual tracks
try {
  const savedActual = localStorage.getItem('ght_actual');
  if (savedActual) APP.actualTracks = JSON.parse(savedActual);
} catch(e) {}
// 注意：预设轨迹（presetSegments）只作为「计划路线」加载，不会自动变成「已记录」。
// 「已记录 / 已完成」只在用户上传实际徒步轨迹（ght_actual 有数据）后才会同步填充。
// 刷新后行程已用分段重建，需将已记录的 GPS 重新关联到行程日

// 迁移：修复前旧行程可能把第一天错判成相邻路段(如马卡鲁)。
// 这里用新逻辑(与地图一致的轨迹几何顺序)按每天起点重算 sectionId/sectionName，
// 使已存 localStorage 的行程在无重新上传的情况下也能自动纠正。
if (APP.itinerary.length && (APP.sectionRanges && APP.sectionRanges.length || APP.presetTrack)) {
  try {
    let changed = false;
    APP.itinerary.forEach(d => {
      // 区域归类永远基于「当天真实起点」(origStart*，天际衔接不会覆盖它)；
      // 旧数据无该字段时回退到 fromLat/Lon。这修复了 D20 等因衔接坐标污染被错判成最东段的问题。
      const lat = (d.origStartLat != null) ? d.origStartLat : d.fromLat;
      const lon = (d.origStartLon != null) ? d.origStartLon : d.fromLon;
      if (lat != null && lon != null) {
        const r = sectionForPoint({ lat: lat, lon: lon });
        if (r && r.sectionId && r.sectionId !== d.sectionId) {
          d.sectionId = r.sectionId;
          if (r.regionZh) d.sectionName = r.regionZh;
          changed = true;
        }
      }
    });
    if (changed) saveItinerary();
  } catch (e) {}
}

try { matchItineraryToActuals(); } catch(e) {}

// Load current position
try {
  const savedPos = localStorage.getItem('ght_current_pos');
  // 仅当存在实际轨迹时才恢复「当前位置」；否则陈旧 GPS 终点会误显示为当前海拔/地图标记。
  if (savedPos && APP.actualTracks && APP.actualTracks.length) APP.currentPosition = JSON.parse(savedPos);
} catch(e) {}

// Load total distance
try {
  const savedTotalDist = localStorage.getItem('ght_total_distance');
  if (savedTotalDist) APP.totalDistance = parseInt(savedTotalDist);
} catch(e) {}
// 防御：若既没有预设轨迹也没有实际轨迹，总距离无意义，强制归零，
// 避免残留的旧 ght_total_distance（例如 1580km）在重置后/无数据时被错误显示。
if (!APP.presetTrack && (!APP.actualTracks || !APP.actualTracks.length)) {
  APP.totalDistance = 0;
}

// 路段范围：必须基于当前 presetTrack（可能已抽稀）重新计算，
// 保证 startIndex/endIndex 与 presetTrack.trackPoints 对齐（否则重载后轨迹绘制空白）。
try {
  if (APP.presetTrack) {
    APP.sectionRanges = calculateSectionRanges(APP.presetTrack);
  } else {
    const savedSections = localStorage.getItem('ght_sections');
    if (savedSections) APP.sectionRanges = JSON.parse(savedSections);
  }
} catch(e) {
  if (APP.presetTrack) { try { APP.sectionRanges = calculateSectionRanges(APP.presetTrack); } catch(e2) {} }
}

updateOwnerUI();
updateCurrentPosition();

// Match itinerary to loaded actual tracks
if (APP.itinerary.length && APP.actualTracks.length) {
  matchItineraryToActuals();
  saveItinerary();
}

// 先用本地默认配置同步渲染首页
renderDashboard();
renderAllTracks();

// 缩放时重绘轨迹，使双线虚线的像素间距保持恒定（始终比绿色实际线稍宽一点）。
map.on('zoomend', () => {
  renderAllTracks();
});

// 后台静默恢复登录态并同步服务端配置；语言/日期若有变化则局部重渲染。
// 顺序很重要：loadShared 依赖 restoreSession 设好的 isOwner —— 只有主人(kv为空且本机有数据)才会自动种入共享包。
restoreSession().then(() => {
  renderDashboard();
  loadShared().catch(() => {});
}).catch(() => {
  loadShared().catch(() => {});
});
