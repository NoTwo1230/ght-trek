// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SAVE / LOAD (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function saveCurrentPosition() {
    try { localStorage.setItem('ght_current_pos', JSON.stringify(APP.currentPosition)); } catch(e) {}
    scheduleShare();   // 实时位置变更同步到共享包（防抖）
  }

  function saveLogEntries() {
    try { localStorage.setItem('ght_log', JSON.stringify(APP.logEntries)); } catch(e) {}
  }

  // 上传类日志按 (kind + 文件名) 去重：同一文件重复上传只保留最新一条，避免日志出现重复记录。
  // 管理操作日志（无 fileName）不受影响，多条同类操作都保留。
  function dedupeLogEntries() {
    if (!Array.isArray(APP.logEntries)) return;
    const best = new Map();
    const keep = [];
    for (const e of APP.logEntries) {
      const fn = e && e.meta && e.meta.fileName;
      if (!fn) { keep.push(e); continue; }              // 无文件名（管理操作）→ 原样保留
      const key = (e.kind || '') + '|' + fn;
      const prev = best.get(key);
      if (!prev || (e.updatedAt || 0) >= (prev.updatedAt || 0)) {
        if (prev) { const i = keep.indexOf(prev); if (i >= 0) keep.splice(i, 1); }
        best.set(key, e);
        keep.push(e);
      }
    }
    APP.logEntries = keep;
  }

  // 上传记录发布到日志：每次上传（预设/实际）生成一条 journal 条目，随共享包同步到日志页与他人设备。
  // kind: 'preset-upload' | 'actual-upload'；meta 携带距离/爬升/文件名/段号，便于前台展示与去重。
  function recordUploadLog(kind, info) {
    if (!APP.logEntries) APP.logEntries = [];
    const entry = {
      id: 'le_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: fmtNepalDate(new Date()),
      text: info.text || (kind === 'preset-upload' ? '🗺️ 上传预设轨迹' : '🥾 上传实际轨迹'),
      kind: kind,
      meta: {
        distance: (info.distance != null) ? info.distance : null,
        elevGain: (info.elevGain != null) ? info.elevGain : null,
        fileName: info.fileName || null,
        dayNum: (info.dayNum != null) ? info.dayNum : null,
        uploadedAt: info.uploadedAt || new Date().toISOString()
      },
      sectionId: info.sectionId || null,
      updatedAt: Date.now()
    };
    if (info.dailyStats) entry.dailyStats = info.dailyStats;
    APP.logEntries.push(entry);
    APP.logEntries.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    dedupeLogEntries();   // 同名文件重复上传只保留最新一条，避免日志重复
    saveLogEntries();
    scheduleShare();   // 上传记录即发云端日志（防抖）
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  全量共享（服务端 share:all：主人写入 / 所有人读取）

  // ── 管理操作审计日志（清空云端 / 重置本机 / 重新发布）──
  // 生成与管理操作对应的 journal 条目，复用上传日志的结构，便于统一展示与按 id 去重。
  function makeAdminLogEntry(text) {
    return {
      id: 'le_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: fmtNepalDate(new Date()),
      text: text,
      kind: 'admin-action',
      meta: { uploadedAt: new Date().toISOString() },
      updatedAt: Date.now()
    };
  }

  // 写入【本机】日志（ght_log）并触发云端同步（防抖）。
  function recordAdminLogLocal(entry) {
    if (!APP.logEntries) APP.logEntries = [];
    APP.logEntries.push(entry);
    APP.logEntries.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    saveLogEntries();
    scheduleShare();
  }

  // 直接写入【云端】journal（用于「本机即将被清空 / 云端需保留审计记录」的管理操作）。
  // 以云端当前包为基底合并 journal、不改动其它字段——即保留云端现有数据，仅追加审计条目。
  async function recordAdminLogCloud(entry) {
    try {
      const r = await API.getShare();
      const data = (r && r.ok && r.data && r.data.data) ? r.data.data : emptyShareBundle();
      const journal = Array.isArray(data.journal) ? data.journal.slice() : [];
      const ids = new Set(journal.map(j => j.id));
      if (!ids.has(entry.id)) journal.push(entry);
      const bundle = Object.assign({}, data, { journal: journal });
      if (data.clearedAt) bundle.clearedAt = data.clearedAt;
      await API.putShare(bundle);
      sharedCache = bundle;
    } catch (e) { /* 审计日志写入失败不影响主操作 */ }
  }

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
    // 同步暂停标记（ght_cleared_self）：本机重置 / 云端清空期间禁止自动回推，
    // 直到用户显式点「重新发布共享」清除该标记。避免「清空云端」被启动自动补推立即填回。
    try { if (localStorage.getItem('ght_cleared_self')) return; } catch (e) {}
    // 推送前先把实际轨迹挂回日程，确保共享包里的 itinerary 包含 day.actual，
    // 避免其他设备/无痕窗口从云端加载后出现「Day 0/88」「ETA=出发日」的问题。
    if (APP.itinerary && APP.itinerary.length && APP.actualTracks && APP.actualTracks.length) {
      try { matchItineraryToActuals(); } catch(e) {}
    }
    // 防御：内存态可能被 loadShared 的 clearedAt 分支清空（重置竞态：上传后 1s 防抖未触发即刷新页面）。
    // 若 localStorage 仍有几何数据，则补回内存，避免把空包推上云覆盖掉真实轨迹。
    try {
      if (!APP.presetTrack) { const sp = localStorage.getItem('ght_preset'); if (sp) APP.presetTrack = JSON.parse(sp); }
      if (!APP.actualTracks || !APP.actualTracks.length) { const sa = localStorage.getItem('ght_actual'); if (sa) { const a = JSON.parse(sa); if (Array.isArray(a) && a.length) APP.actualTracks = a; } }
    } catch (e) {}
    const bundle = (sharedCache && typeof sharedCache === 'object') ? JSON.parse(JSON.stringify(sharedCache)) : {};
    // deletedIds（日志墓碑）随主包一起上云，绝不被清掉
    bundle.deletedIds = (sharedCache && Array.isArray(sharedCache.deletedIds)) ? sharedCache.deletedIds : [];
    try { bundle.preset = APP.presetTrack ? decimatePresetTrack(APP.presetTrack, 4000) : null; }
    catch (e) { bundle.preset = APP.presetTrack || null; }
    // 实际轨迹：与 journal 同理，云端∪本机按 id（date→fileName→首点坐标）合并，保留 updatedAt 更新者。
    // 修复历史事故根因：此前是「本机 actual 整包覆盖云端」，在一台没有实际轨迹的机器点「重新发布共享」
    // 或触发自动回推，就会把云端已有的 actual 抹成空数组，导致其他设备行程页缺实际记录。
    // 合并语义下，空机器的 push 不会再冲掉云端 actual（republishShare 已先 getShare 刷新 sharedCache 为云端最新包）。
    const _localActual = (APP.actualTracks || []).map(t => ({ ...t, updatedAt: t.updatedAt || Date.now(), trackPoints: decimateTrack(t.trackPoints || [], 700) }));
    const _cloudActual = (sharedCache && Array.isArray(sharedCache.actual)) ? sharedCache.actual : [];
    bundle.actual = mergeActualTracks(_localActual, _cloudActual);
    bundle.pos = APP.currentPosition || null;
    bundle.itinerary = APP.itinerary || [];
    bundle.itineraryStart = APP.itineraryStartDate || null;
    bundle.segments = APP.presetSegments || null;
    bundle.restDays = APP.presetRestDays || [];
    bundle.sections = APP.sectionRanges || null;
    bundle.totalDistance = APP.totalDistance || 0;
    // 日志：合并「云端已有」与「本机」按 id 去重，避免本机 ght_log 在重置竞态被清空后，重推把云端日志冲掉。
    const cloudJournal = (sharedCache && Array.isArray(sharedCache.journal)) ? sharedCache.journal : [];
    const localJournal = APP.logEntries || [];
    dedupeLogEntries();   // 确保推上云前本机日志已按 (kind+文件名) 去重
    const jm = new Map();
    cloudJournal.forEach(e => { if (e && e.id) jm.set(e.id, e); });
    localJournal.forEach(e => { if (e && e.id) jm.set(e.id, e); });
    bundle.journal = Array.from(jm.values());
    delete bundle.clearedAt;   // 真实写入即摘掉「已清空」标记，恢复为正常 bundle
    sharedCache = bundle;
    try { localStorage.removeItem('ght_cleared_self'); } catch (e) {}  // 任何一次推送代表已恢复共享
    API.putShare(bundle).catch(e => console.warn('[ght] 共享推送失败（不影响本地使用）', e));
  }

  // 防抖版：合并短窗口内多次数据变更，只发一次 PUT，避免批量导入/批量轨迹时突发大量写请求。
  // 任何本地数据变更后调用它即可，无需手动点「重新发布共享」。
  let _shareTimer = null;
  function scheduleShare(delay) {
    if (_shareTimer) clearTimeout(_shareTimer);
    _shareTimer = setTimeout(function () {
      _shareTimer = null;
      pushShare();
    }, (delay != null) ? delay : 1000);
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
      // 本机已重置 / 云端已清空（ght_cleared_self 标记）期间，不拉取也不推送云端，
      // 保持本机当前状态，直到用户显式点「重新发布共享」解除标记。
      try { if (localStorage.getItem('ght_cleared_self')) return; } catch (e) {}
      const r = await API.getShare();
      if (!r.ok) return;                                // 服务端错误：保留本地，不自动种入
      const b = (r.data && r.data.data) ? r.data.data : null;
      // 服务端收到「已清空」包：其他设备以空为准抹掉本地共享字段；发起方（ght_cleared_self）保留本机
      if (b && b.clearedAt) {
        // 云端处于「已清空」状态。按用户意图（清空云端 = 云端保持空白，直到显式点「重新发布共享」），
        // 本机保留数据、绝不自动回推——这里移除原先的 scheduleShare(0) 自动重推，避免清空后立刻被填回。
        // 仅当本机不是主人 / 未登录 / 无任何可共享数据时，才接受清空、抹掉本机共享字段（访客态或空本机）。
        // 注意：不要在「观察到已清空」时自行设置 ght_cleared_self 标记——该标记只由本机主动清空/重置时设置，
        // 否则访客设备会卡在暂停态、永远拉不到主人后续重新发布的内容。
        if (!APP.isOwner || !API.getToken() || !hasLocalShareableData()) {
          APP.presetTrack = null; APP.totalDistance = 0; APP.sectionRanges = null;
          APP.presetSegments = null; APP.presetRestDays = null; APP.actualTracks = [];
          APP.currentPosition = null; APP.itinerary = []; APP.itineraryStartDate = null;
          try {
            localStorage.removeItem('ght_log');
            localStorage.removeItem('ght_itinerary');
            localStorage.removeItem('ght_itinerary_start');
            localStorage.removeItem('ght_start_place');
          } catch (e) {}
        }
        sharedCache = b;
        renderDashboard(); renderAllTracks(); updateProgressDOM(); drawElevationProfile();
        return;                                         // 关键：不再走后面的 owner 回推分支（也不会自动重推上云）
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
        if (b.itinerary && b.itinerary.length) {
          APP.itinerary = b.itinerary;
          // 出发日期以服务端 config 为权威（管理员设置，已与真实出发日/GPX Day1 对齐）；
          // 仅当本机/配置均未提供时才用共享包里的 itineraryStart 兜底，
          // 避免过期的 share.itineraryStart 覆盖 config 中正确的日期（如 2026-08-01 被 2026-11-01 顶掉）。
          if (b.itineraryStart && !APP.itineraryStartDate) {
            APP.itineraryStartDate = b.itineraryStart;
            try { localStorage.setItem('ght_itinerary_start', b.itineraryStart); } catch (e) {}
          }
          // 云端行程通常不带 day.actual（轻量共享），但 actualTracks 已合并。
          // 必须用 matchItineraryToActuals() 把实际轨迹重新挂回对应日程日，
          // 否则首页「Day 0/88」「预计抵达=出发日」等依赖 d.actual 的显示会全错。
          if (APP.actualTracks && APP.actualTracks.length) {
            try { matchItineraryToActuals(); } catch(e) {}
          }
          // 关键修复：把云端行程持久化到 localStorage['ght_itinerary']，
          // 否则独立行程对比页(itinerary.html，只读本地)在其他设备永远为空。
          saveItinerary();
        }
        // 合并共享日志（上传记录等）回本机，使 journal.html 跨设备可见；按 id 去重，避免重复
        APP.logEntries = APP.logEntries || [];
        // 关键：先把本机 localStorage 中 journal.html 新增的本地条目纳入（loadShared 在启动早期
        // 只加载了当时的快照，之后在 journal.html 手动加的条目不会出现在内存里，不补全会被云端覆盖丢失）
        try {
          const localLog = JSON.parse(localStorage.getItem('ght_log') || '[]');
          if (Array.isArray(localLog) && localLog.length) {
            const seenLocal = new Set(APP.logEntries.map(e => e.id));
            localLog.forEach(e => { if (e && e.id && !seenLocal.has(e.id)) { APP.logEntries.push(e); seenLocal.add(e.id); } });
          }
        } catch (e) {}
        if (b.journal && b.journal.length) {
          const seen = new Set(APP.logEntries.map(e => e.id));
          b.journal.forEach(e => { if (e && e.id && !seen.has(e.id)) { APP.logEntries.push(e); seen.add(e.id); } });
        }
        APP.logEntries.sort((a, x) => (x.date || '').localeCompare(a.date || ''));
        dedupeLogEntries();   // 按 (kind+文件名) 合并云端与本机时顺带去重，清掉历史残留的重复上传记录
        saveLogEntries();
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

// 彻底清空云端：把共享包置空（带 clearedAt）+ 删除所有原始 GPX 备份。
// 任一环节失败都抛出明确错误，交由调用方提示用户（不再静默吞）。
async function purgeCloudShare() {
  if (!APP.isOwner || !API.getToken()) throw new Error('未以主人身份登录（缺少有效 token）');
  // 1) 共享包置空：其他设备加载时看到 clearedAt 会同步抹掉本地共享数据
  const r1 = await API.putShare(emptyShareBundle());
  if (!r1 || !r1.ok) throw new Error('共享包清空失败（' + ((r1 && r1.data && r1.data.error) || ('HTTP ' + (r1 && r1.status))) + '）');
  // 2) 删除所有原始 GPX 备份（避免重置后云端仍残留轨迹原始文件）
  const r2 = await API.deleteTracks();
  if (!r2 || !r2.ok) throw new Error('GPX 备份删除失败（' + ((r2 && r2.data && r2.data.error) || ('HTTP ' + (r2 && r2.status))) + '）');
  return true;
}

async function resetLocalData() {
  if (!confirm('⚠️ 此操作将清除【本机】所有数据，不可恢复！\n\n包括：预设轨迹 / 实际轨迹 / 日志 / 行程 / 进度。\n云端数据不受影响。\n\n清空后若想让云端也同步为空白，请再点「☁️ 清空云端」。\n\n确定继续？')) return;
  // 审计：记录「重置本机数据」。先设同步暂停标记（避免随后的本地清空触发自动回推），
  // 再把审计条目写入本机日志并同步到云端 journal（本机日志随后会被清空，故云端留存一份便于排查）。
  const _entry = makeAdminLogEntry('🧹 重置本机数据（本地清空，云端未动）');
  try { localStorage.setItem('ght_cleared_self', '1'); } catch (e) {}
  recordAdminLogLocal(_entry);
  try { await recordAdminLogCloud(_entry); } catch (e) {}
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
  // 本机已重置：设同步暂停标记，防止启动自动补推(bootAutoShare)把云端旧数据种回本机
  try { localStorage.setItem('ght_cleared_self', '1'); } catch (e) {}
  // 内存态也一并清零，确保 reload 前无任何残留
  APP.presetTrack = null; APP.actualTracks = []; APP.itinerary = []; APP.itineraryStartDate = null;
  APP.currentPosition = null; APP.sectionRanges = null; APP.presetSegments = null; APP.presetRestDays = null;
  APP.logEntries = [];
  alert('✅ 已重置【本机】数据（云端未动）。刷新后将以空白启动。\n如需云端也同步为空白，请点「☁️ 清空云端」。');
  location.reload();
}

// 清空云端：仅清空云端共享包 + 删除原始 GPX 备份，不动本机数据。设 ght_cleared_self 标记 → 启动自动补推(bootAutoShare)与本地编辑的自动推送都被 pushShare 拦截，确保云端真正保持空白，直到用户显式点「重新发布共享」解除标记并重新上云。
  async function clearCloudShare() {
    if (!APP.isOwner || !API.getToken()) { alert('仅主人且已登录时可清空云端共享'); return; }
    if (!confirm('⚠️ 此操作将清空【云端】共享数据（含原始 GPX 备份），所有访客将暂时看不到轨迹。\n\n本机数据保留。\n清空后自动同步会暂停，直到你点「🔄 重新发布共享」才会重新上云。\n\n确定继续？')) return;
    try {
      try { localStorage.setItem('ght_cleared_self', '1'); } catch (e) {}  // 暂停自动回推，云端保持空白
      const _entry = makeAdminLogEntry('☁️ 清空云端共享（含 GPX 备份）');
      recordAdminLogLocal(_entry);  // 本机先可见
      // 置空共享包，但保留这条审计日志，使清空后仍能在 journal 看到「何时被清空」
      const bundle = emptyShareBundle();
      bundle.journal = [ _entry ];
      const r1 = await API.putShare(bundle);
      if (!r1 || !r1.ok) throw new Error('共享包清空失败（' + ((r1 && r1.data && r1.data.error) || ('HTTP ' + (r1 && r1.status))) + '）');
      const r2 = await API.deleteTracks();
      if (!r2 || !r2.ok) throw new Error('GPX 备份删除失败（' + ((r2 && r2.data && r2.data.error) || ('HTTP ' + (r2 && r2.status))) + '）');
      alert('✅ 云端共享已清空（含原始 GPX 备份）。所有访客将看到空白；本机数据已保留。\n自动同步已暂停——点「🔄 重新发布共享」可随时重新上云。');
      location.reload();
    } catch (e) {
      alert('⚠️ 云端清空失败：\n' + (e && e.message ? e.message : e) + '\n\n请检查网络后重试。');
    }
  }

  // 重新发布共享：把【本机】数据推送到云端，覆盖云端当前内容；并解除同步暂停标记，恢复自动推送。
  async function republishShare() {
    if (!APP.isOwner || !API.getToken()) { alert('仅主人且已登录时可重新发布'); return; }
    if (!confirm('🔄 将把【本机】数据完整推送到云端，覆盖云端当前内容。\n\n（此前若清空过云端 / 本机，会自动恢复自动同步。）\n\n确定继续？')) return;
    try { localStorage.removeItem('ght_cleared_self'); } catch (e) {}   // 解除同步暂停，恢复自动推送
    const _entry = makeAdminLogEntry('🔄 重新发布共享（本机→云端，恢复自动同步）');
    recordAdminLogLocal(_entry);   // 进入本机日志 + 随 pushShare 推上云
    try { const r = await API.getShare(); if (r && r.ok && r.data && r.data.data) sharedCache = r.data.data; } catch (e) {}  // 以云端最新包为基底，保留 journal 分片
    pushShare();   // 内部会 delete clearedAt；此后 bootAutoShare / 本地编辑都会正常自动上云
    alert('✅ 已将本机数据共享到云端（云端已与本机同步），自动同步已恢复。');
  }

