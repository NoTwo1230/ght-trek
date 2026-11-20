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

    // ── 后台「预设/实际」模式：跳过确认，直接按模式写入 ──
    if (APP._uploadMode === 'preset') {
      APP.presetSegments = valid; persistPresetSegments(valid);   // 先置段，setAsPreset 才能捕获真实段数
      setAsPreset(merged, stats);
      scheduleShare();
      applySegmentItinerary(valid, restDays);
      matchItineraryToActuals();
      if (typeof saveItinerary === 'function') saveItinerary();
      renderAllTracks(); updateProgressDOM(); openPanel(APP.activeTab || 'progress');
      event.target.value = '';
      alert('✅ 已将 ' + valid.length + ' 段分日预设轨迹写入行程安排（含 ' + restDays.length + ' 个休息日）。\n行程为「计划」状态，上传实际轨迹后自动同步进度。');
      return;
    }
    if (APP._uploadMode === 'actual') {
      valid.forEach(function (seg) {
        var segStats = seg.stats || calculateGPXStats(seg);
        addActualTrack(seg, segStats);
      });
      matchItineraryToActuals();
      renderAllTracks(); updateProgressDOM(); openPanel(APP.activeTab || 'progress');
      event.target.value = '';
      alert('✅ 已添加 ' + valid.length + ' 段实际徒步轨迹。\n预设路线与计划日程保持不变，已按轨迹尼泊尔 GPS 日期自动对比进度。');
      return;
    }
    if (!APP.presetTrack) {
      // No preset yet
      if (confirm(msg)) {
        APP.presetSegments = valid;
        persistPresetSegments(valid);
        setAsPreset(merged, stats);
        scheduleShare();   // 计划路线 + 分段同步到共享包（防抖）
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
        scheduleShare();   // 已记录轨迹变更同步到共享包（防抖）
        renderAllTracks();
        updateProgressDOM();
        openPanel(APP.activeTab || 'progress');
        alert('✅ 已添加 ' + valid.length + ' 段实际徒步轨迹。\n预设路线与计划日程保持不变，已按轨迹尼泊尔 GPS 日期自动对比进度。');
      } else {
        // 替换为新的预设轨迹（重算路线、分段、日程）
        APP.presetSegments = valid;
        persistPresetSegments(valid);
        setAsPreset(merged, stats);
        scheduleShare();   // 计划路线 + 分段同步到共享包（防抖）
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
  const mode = APP._uploadMode;
  if (mode === 'preset') { setAsPreset(gpxData, stats); return; }
  if (mode === 'actual') { addActualTrack(gpxData, stats); return; }
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
  // 同文件名轨迹：重传时替换旧记录，避免重复。
  // 典型场景：首次上传缺 <time> 导致 date=null；补打时间标签后重传，
  // 若直接 push 会与旧 null-date 记录并存，污染行程日历/统计。
  if (actualObj.fileName) {
    APP.actualTracks = (APP.actualTracks || []).filter(t => t.fileName !== actualObj.fileName);
  }
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
  scheduleShare();   // 单段实际轨迹变更同步到共享包（防抖）

  // ── 每次实际轨迹上传 → 发布一条「上传记录」到日志（取代原先仅带时间戳才记的 📡自动记录）──
  // 归类到对应路段：与地图一致，按预设轨迹几何顺序判定，避免东端起点被错判成相邻路段。
  let logSectionId = null;
  try {
    const sp = gpxData.trackPoints && gpxData.trackPoints[0];
    if (sp) {
      const r = sectionForPoint(sp);
      if (r && r.sectionId) logSectionId = r.sectionId;
    }
  } catch (e) {}
  const dn = (gpxData.dayNum != null) ? gpxData.dayNum
    : (dailyStats && dailyStats.dayNum != null ? dailyStats.dayNum : null);
  let timeRange = '';
  if (dailyStats && dailyStats.startTime) {
    const s = new Date(dailyStats.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const e = dailyStats.endTime ? new Date(dailyStats.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '—';
    timeRange = ' · ' + s + ' → ' + e;
  }
  const dayTag = (dn != null) ? '（Day ' + String(dn).padStart(2, '0') + '）' : '';
  recordUploadLog('actual-upload', {
    text: '🥾 上传实际轨迹' + dayTag + '：' + stats.distance.toFixed(1) + ' km，'
      + Math.round(stats.elevGain).toLocaleString() + ' m 爬升' + timeRange,
    distance: stats.distance,
    elevGain: stats.elevGain,
    dayNum: dn,
    fileName: gpxData.fileName || null,
    sectionId: logSectionId,
    dailyStats: dailyStats || null
  });

  // 无论轨迹是否带时间戳，都同步「行程安排」与「总轨迹进度」
  if (APP.itinerary.length) {
    matchItineraryToActuals();
    saveItinerary();
  }

  showGPXUploadResult(gpxData, stats);
  renderAllTracks();      // 内部会调用 updateProgress() 刷新总距离 / 进度百分比
  updateProgressDOM();
  openPanel(APP.activeTab || 'progress');  // 刷新当前面板，使行程/进度即时同步

  // ── 合并点：实际轨迹上传后，直接取刚解析的末尾点同步到 live 图层 ──
  // 复用同一份 gpxData，不再二次解析文件；实时点只进 live 键，不进 actualTracks 统计。
  try {
    if (window.GpxLive && gpxData.trackPoints && gpxData.trackPoints.length) {
      var tail = gpxData.trackPoints.slice(-window.GpxLive.MAX).map(function (p) {
        return {
          lat: p.lat, lon: p.lon,
          elev: p.elev != null ? p.elev : null,
          time: p.time ? Date.parse(p.time) : null
        };
      });
      var livePts = window.GpxLive.toLivePoints(tail, window.GpxLive.MAX);
      if (livePts.length) {
        if (location.protocol === 'file:') {
          window.GpxLive.saveAndBroadcast(livePts);   // 本地预览：写 store + 广播，首页/全屏页自动刷新
        } else if (window.API && typeof API.postLive === 'function') {
          var _last = livePts[livePts.length - 1];
          API.postLive({
            lat: _last.lat, lon: _last.lon, elev: _last.elev,
            ts: _last.ts, source: 'gpx', note: '实际轨迹末尾点'
          }).catch(function () {});
        }
      }
    }
  } catch (e) { console.warn('[ght] live sync skipped', e); }
}

function setAsPreset(gpxData, stats) {
  // 记录上传时间（供 admin 状态徽标「已上传 · 时间」展示）
  if (!gpxData.uploadedAt) gpxData.uploadedAt = new Date().toISOString();
  // 在 APP.presetSegments 被置空前捕获段数：批量上传的调用方会在 setAsPreset 之后回填，
  // 因此这里取「当前」值；若调用方已在其前置为 valid 段数组则能拿到真实段数。
  const _presetSegCount = (APP.presetSegments && APP.presetSegments.length) ? APP.presetSegments.length : null;
  gpxData.distances = calculateTrackDistances(gpxData.trackPoints);
  gpxData.waypoints = dedupeWaypoints(gpxData.waypoints); // 去除 GPX 重复标注点（同名同海拔）
  gpxData.stats = stats;                                  // 把统计(距离/爬升/最高点)挂到预设轨迹，供征途总进度卡读取
  APP.presetTrack = gpxData;
  // Sync rest days from dayRange (batch import) or clear (single file)
  APP.presetRestDays = (gpxData.dayRange && gpxData.dayRange.restDays) ? gpxData.dayRange.restDays : [];
  APP.presetSegments = null; // single-file preset has no day segments; batch flow sets this after
  APP.totalDistance = Math.round(stats.distance);

  APP.sectionRanges = calculateSectionRanges(APP.presetTrack);
  // 重新上传预设路线时务必保留已上传的实际徒步轨迹：它们是独立的 GPS 记录，
  // 不应被清空——旧逻辑置空后立刻 scheduleShare 会把空包推上云、覆盖掉已上传的实际轨迹。
  // 改为按新预设几何重新匹配路段/行程关联，再统一落云。
  if (APP.actualTracks && APP.actualTracks.length) {
    try { matchItineraryToActuals(); } catch (e) {}
    if (APP.itinerary && APP.itinerary.length) { try { saveItinerary(); } catch (e) {} }
  }

  try {
    const p = decimatePresetTrack(APP.presetTrack, 4000);
    localStorage.setItem('ght_preset', JSON.stringify(p));
  } catch(e) {
    try {
      const p = decimatePresetTrack(APP.presetTrack, 1500);
      localStorage.setItem('ght_preset', JSON.stringify(p));
    } catch(e2) {}
  }
  // 保留实际轨迹到本地存储（不再清空；仅在确实没有时才置空）
  if (APP.actualTracks && APP.actualTracks.length) {
    try {
      const dec = APP.actualTracks.map(t => ({ ...t, trackPoints: decimateTrack(t.trackPoints, 700) }));
      localStorage.setItem('ght_actual', JSON.stringify(dec));
    } catch (e) {
      try {
        const dec = APP.actualTracks.map(t => ({ ...t, trackPoints: decimateTrack(t.trackPoints, 250) }));
        localStorage.setItem('ght_actual', JSON.stringify(dec));
      } catch (e2) {}
    }
  } else {
    try { localStorage.setItem('ght_actual', JSON.stringify([])); } catch (e) {}
  }
  try { localStorage.setItem('ght_sections', JSON.stringify(APP.sectionRanges)); } catch(e) {}
  try { localStorage.setItem('ght_total_distance', String(APP.totalDistance)); } catch(e) {}
  try { localStorage.setItem('ght_rest_days', JSON.stringify(APP.presetRestDays || [])); } catch(e) {}

  // 发布「预设轨迹已上传」记录到日志（每次重传都会追加一条）
  const segCount = _presetSegCount || 1;
  recordUploadLog('preset-upload', {
    text: '🗺️ 上传预设轨迹（计划路线）' + (segCount > 1 ? '：' + segCount + ' 段' : '') + '，总计 ' + APP.totalDistance + ' km',
    distance: APP.totalDistance,
    dayNum: null,
    fileName: gpxData.fileName || null
  });

  showGPXUploadResult(gpxData, stats);
  renderAllTracks();

  drawElevationProfile();
  scheduleShare();   // 计划路线（含休息日/分段/总距离）同步到共享包（防抖）
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

