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
  // 该键以 ght_ 开头，会被 resetLocalData() 一并清除 → 重置后 sections 页面自动回到「计划」。
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
//  轨迹着色规范（UI 设计决策, 2026-07-30 修订）
//  与行程日历页统一语义：计划 = 靛蓝(--route-plan)，实际/已完成 = 绿(--route-done)
//   · 实际徒步轨迹 = 绿色实线（var(--route-done)，醒目、连续，叠在计划线之上）
//   · 计划路线（目标）= 靛蓝虚线（var(--route-plan) / dashArray '6,8'，基准参考线）
//   · 预设已被实际轨迹覆盖的部分不再单独绘制，由绿色实际轨迹表达
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 颜色从 CSS 设计令牌读取（与全站语义色统一），取不到时回退硬编码值。
function _cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (e) { return fallback; }
}
const ACTUAL_TRACK_COLOR = _cssVar('--route-done', '#00A86B');   // 实际徒步轨迹：绿色实线
const PLANNED_TRACK_COLOR = _cssVar('--route-plan', '#635BFF');  // 计划路线：靛蓝虚线

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

// 画「计划轨迹」：靛蓝虚线（dashArray '6,8'，与图例及行程页一致）。
function drawPlannedDoubleDashed(coords, layerGroup, popupHtml, weight, opacity) {
  if (!coords || coords.length < 2) return;
  const opts = {
    color: PLANNED_TRACK_COLOR, weight: weight || 1.8, opacity: (opacity == null ? 0.75 : opacity),
    dashArray: '6,8', lineCap: 'round', lineJoin: 'round'
  };
  const r = L.polyline(coords, opts).addTo(layerGroup);
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
    let sectionColor = ACTUAL_TRACK_COLOR;
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

    // 实际轨迹「整条连续绿实线」：一整条画完，不按段切分。
    // 深底描边提升在彩色地形上的对比度。
    const acoords = track.trackPoints.map(p => [p.lat, p.lon]);
    L.polyline(acoords, { color: '#0d1219', weight: 6, opacity: 0.3, lineCap: 'round', lineJoin: 'round' }).addTo(uploadedTrackGroup);
    L.polyline(acoords, { color: ACTUAL_TRACK_COLOR, weight: 3, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(uploadedTrackGroup);

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

