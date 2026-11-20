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
function bootAutoShare() {
  // 启动安全网：主人本机有共享数据且云端为空（如首次导入后未手动发布）时，自动补推一次。
  // 但以下两种「已清空」情形绝不自动补推，否则会立刻把云端填回，与
  // 「清空云端后保持空白、直到显式点重新发布共享」的语义冲突：
  //   1) 本机处于同步暂停态（ght_cleared_self 标记，由本机清空云端/重置设置）；
  //   2) 云端共享包本身带 clearedAt（其他设备清空、或本机在旧缓存代码下清空漏设标记）。
  if (APP.isOwner && API.getToken() && hasLocalShareableData() && !localStorage.getItem('ght_cleared_self')) {
    if (sharedCache && sharedCache.clearedAt) return;   // 云端已清空 → 保持空白，等显式重新发布
    scheduleShare(1500);
  }
}
restoreSession().then(() => {
  renderDashboard();
  loadShared().then(bootAutoShare).catch(bootAutoShare);
}).catch(() => {
  loadShared().then(bootAutoShare).catch(bootAutoShare);
});
