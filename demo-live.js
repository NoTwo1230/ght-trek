/* GHT 实时图层 Demo —— 在备份副本上运行，不改动原项目 */
(function () {
  'use strict';

  if (!window.L || !window.APP || !document.getElementById('map')) return;

  var MINUTE = 60 * 1000;
  var HOUR = 60 * MINUTE;
  var DAY = 24 * HOUR;
  var G = window.GpxLive;
  var POINTS_KEY = G ? G.KEY : 'ght_live_demo_points';
  var MAX_POINTS = 60;

  var state = {
    points: [],
    path: [],
    cursor: 0,
    dir: 1,
    mode: 'online',
    paused: false,
    timer: null,
    backend: false
  };
  window.GHT_LIVE_STATE = state;

  // ── 初始点：取实际轨迹尾段，重打演示时间戳 ──
  function sourcePoints() {
    var tracks = APP.actualTracks || [];
    if (!tracks.length) return [];
    var last = tracks[tracks.length - 1];
    return (last.trackPoints || []).slice(-40);
  }

  function initPoints() {
    var src = sourcePoints();
    if (src.length < 2) return;
    state.path = src;
    state.cursor = Math.max(0, src.length - 14);
    state.dir = 1;

    var now = Date.now();
    var tail = src.slice(Math.max(0, src.length - 12));
    state.points = tail.map(function (p, i) {
      return {
        lat: p.lat,
        lon: p.lon,
        elev: p.elev != null ? p.elev : null,
        time: null,
        ts: now - (tail.length - 1 - i) * 45 * 1000,
        source: 'demo'
      };
    });
    state.mode = 'online';
    state.paused = false;
  }

  function nextPoint() {
    if (!state.path.length) return null;
    var idx = state.cursor + state.dir;
    if (idx >= state.path.length) { state.dir = -1; idx = Math.max(0, state.path.length - 2); }
    if (idx < 0) { state.dir = 1; idx = Math.min(1, state.path.length - 1); }
    state.cursor = idx;
    var q = state.path[idx];
    return {
      lat: q.lat,
      lon: q.lon,
      elev: q.elev != null ? q.elev : null,
      time: null,
      ts: Date.now(),
      source: 'demo'
    };
  }

  // ── 独立图层：不写入 APP.actualTracks，进度/行程/日志完全不受影响 ──
  var liveLayer = L.layerGroup().addTo(map);

  function renderLiveLayer() {
    liveLayer.clearLayers();
    var pts = state.points;
    if (pts.length < 2) return;
    var coords = pts.map(function (p) { return [p.lat, p.lon]; });
    L.polyline(coords, { color: '#ffffff', weight: 8, opacity: 0.65, lineCap: 'round', lineJoin: 'round' }).addTo(liveLayer);
    L.polyline(coords, { color: '#F85149', weight: 3, opacity: 0.95, dashArray: '7 6', lineCap: 'round', lineJoin: 'round' })
      .bindPopup('<b>实时上报轨迹（演示）</b><br>独立图层 · 不计入实际轨迹统计')
      .addTo(liveLayer);
    pts.slice(0, -1).forEach(function (p) {
      L.circleMarker([p.lat, p.lon], { radius: 2.5, color: '#fff', fillColor: '#F85149', fillOpacity: 1, weight: 1 }).addTo(liveLayer);
    });
  }

  function lastTs() {
    var p = state.points[state.points.length - 1];
    return p ? (p.ts || Date.now()) : Date.now();
  }

  function freshness() {
    return G ? G.freshness(lastTs()) : {
      age: Math.max(0, Date.now() - lastTs()),
      level: 'fresh', label: '刚刚', phrase: '刚刚定位', advise: ''
    };
  }

  function fmtCoord(v, pos, neg) { return Math.abs(v).toFixed(4) + '°' + (v >= 0 ? pos : neg); }

  function applyLivePosition() {
    var p = state.points[state.points.length - 1];
    if (!p) return;
    APP.currentPosition = {
      lat: p.lat, lon: p.lon,
      elev: p.elev != null ? p.elev : (APP.currentPosition && APP.currentPosition.elev),
      ts: p.ts
    };
    if (typeof drawHikingPerson === 'function') drawHikingPerson();
    updateStatusUI();
  }

  function updateStatusUI() {
    var f = freshness();
    var p = state.points[state.points.length - 1];
    if (!p) return;
    var isGpx = p.source === 'gpx';
    var en = false; try { en = localStorage.getItem('ght_lang') === 'en'; } catch (e) {}
    var timeText = isGpx && G ? G.formatNepal(lastTs()) + (en ? ' (Nepal time)' : '（尼泊尔时间）')
      : new Date(lastTs()).toLocaleString(en ? 'en-US' : 'zh-CN', { hour12: false });
    var levelCls = f.level === 'fresh' ? '' : (' is-' + f.level);

    var hdr = document.getElementById('hdrLive');
    if (hdr) {
      hdr.className = 'live' + levelCls;
      hdr.innerHTML = '<span class="dot' + (f.level === 'fresh' ? '' : ' idle') + '"></span>' + f.phrase;
      hdr.title = (en ? 'Position time: ' : '定位时间：') + timeText;
    }
    var foot = document.getElementById('liveDot');
    if (foot) {
      foot.className = 'live-dot' + (f.level === 'stale' ? ' offline' : (f.level === 'aging' ? ' delayed' : ''));
      foot.innerHTML = '<span class="ld-dot"></span> ' + f.phrase;
    }
    var badge = document.getElementById('currentPosBadge');
    if (badge) {
      var n = badge.querySelector('.prov-name');
      var e = badge.querySelector('.prov-elev');
      if (n) n.textContent = fmtCoord(p.lat, 'N', 'S') + ' ' + fmtCoord(p.lon, 'E', 'W');
      if (e) e.textContent = (p.elev != null ? Math.round(p.elev) + 'm' : '—') + ' · ' + f.label;
    }

    var head = document.getElementById('demoLiveHead');
    if (head) head.className = 'demo-live-head' + levelCls;
    var st = document.getElementById('demoLiveStatus');
    if (st) st.textContent = f.label;
    var lat = document.getElementById('demoLiveLat');
    if (lat) lat.textContent = p.lat.toFixed(4);
    var lon = document.getElementById('demoLiveLon');
    if (lon) lon.textContent = p.lon.toFixed(4);
    var alt = document.getElementById('demoLiveAlt');
    if (alt) alt.textContent = p.elev != null ? Math.round(p.elev) + ' m' : '—';
    var spd = document.getElementById('demoLiveSpd');
    if (spd) {
      var curSpd = G ? G.currentSpeed(state.points) : null;
      spd.textContent = curSpd != null ? curSpd.toFixed(1) : '—';
    }
    var tsEl = document.getElementById('demoLiveTs');
    if (tsEl) tsEl.textContent = '定位时间 ' + timeText;
    var srcEl = document.getElementById('demoLiveSource');
    if (srcEl) {
      srcEl.textContent = state.backend ? '数据源：/api/live'
        : (isGpx ? '数据源：GPX 文件（本地解析）' : '数据源：本地模拟（未连接后端）');
    }
  }

  function tick() {
    if (state.paused || !state.path.length) { updateStatusUI(); return; }
    var np = nextPoint();
    if (!np) return;
    state.points.push(np);
    if (state.points.length > MAX_POINTS) state.points.shift();
    try { localStorage.setItem(POINTS_KEY, JSON.stringify(state.points)); } catch (e) {}
    renderLiveLayer();
    applyLivePosition();
  }

  function applyImportedPoints(livePts) {
    state.points = livePts.slice(-MAX_POINTS);
    state.paused = true;
    state.backend = false;
    try { localStorage.setItem(POINTS_KEY, JSON.stringify(state.points)); } catch (e) {}
    renderLiveLayer();
    applyLivePosition();
    var p = state.points[state.points.length - 1];
    if (p && typeof map !== 'undefined') map.flyTo([p.lat, p.lon], 12, { duration: 0.8 });
  }

  // 导入统一在后台完成；前台只接收后台写入后的同步事件与本地存储变化
  function wireSync() {
    if (!G) return;
    window.addEventListener(G.EVENT, function (e) {
      if (e.detail && e.detail.length) applyImportedPoints(e.detail);
    });
  }

  function wireButtons() {
    var locate = document.getElementById('demoBtnLocate');
    var reset = document.getElementById('demoBtnReset');
    if (locate) locate.onclick = function () {
      var p = state.points[state.points.length - 1];
      if (p) map.flyTo([p.lat, p.lon], 12, { duration: 0.8 });
    };
    if (reset) reset.onclick = function () {
      try { localStorage.removeItem(POINTS_KEY); } catch (e) {}
      if (window.GHT_DEMO_RESEED) window.GHT_DEMO_RESEED();
      location.reload();
    };
  }

  // 后端可用时读取真实上报点；本地 file:// 打开则保持模拟
  async function pollBackend() {
    if (location.protocol === 'file:') return;
    try {
      var r = await fetch('/api/live', { cache: 'no-store' });
      if (!r.ok) return;
      var j = await r.json();
      var d = j && j.data;
      if (!d || !d.latest) return;
      var pts = Array.isArray(d.points) && d.points.length ? d.points : [d.latest];
      // 兼容旧云端数据：后端早期版本未存 source，按 gpx 标记以保证尼泊尔时间格式/时间轴标签正确
      pts = pts.map(function (p) {
        var q = {}; for (var k in p) q[k] = p[k];
        if (!q.source) q.source = 'gpx';
        return q;
      });
      state.backend = true;
      state.points = pts.slice(-MAX_POINTS);
      state.paused = true;   // 后端有真实数据时停止模拟，只跟随上报更新
      renderLiveLayer();
      applyLivePosition();
    } catch (e) { /* 后端不可用时继续本地模拟 */ }
  }

  // ── 启动 ──
  // 本地预览若 localStorage 被禁用，直接用种子数据填充内存，保证地图有内容
  if (window.GHT_DEMO_SEED && !(APP.actualTracks || []).length && !(APP.presetTrack)) {
    var sd = window.GHT_DEMO_SEED;
    APP.actualTracks = sd.actual || [];
    APP.presetTrack = sd.preset || null;
    APP.sectionRanges = sd.sections || [];
    APP.itinerary = sd.itinerary || [];
    APP.totalDistance = sd.totalDistance || 0;
    if (typeof renderAllTracks === 'function') renderAllTracks();
  }

  initPoints();
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(POINTS_KEY) || 'null'); } catch (e) {}
  if (Array.isArray(saved) && saved.length > 1) state.points = saved.slice(-MAX_POINTS);

  wireButtons();
  wireSync();
  renderLiveLayer();
  applyLivePosition();
  pollBackend();
  setInterval(pollBackend, 30000);

  state.timer = setInterval(tick, 5000);

  // app.js 的 zoomend 会把 currentPosition 重置为最后一条 GPX 终点，这里在其后恢复实时点
  map.on('zoomend', function () { setTimeout(applyLivePosition, 0); });

  // 语言切换：gpx-live.js 的 freshness() 已按 localStorage 语言返回文案，这里触发重渲染
  window.onLangChange = function () {
    var en = false; try { en = localStorage.getItem('ght_lang') === 'en'; } catch (e) {}
    if (state.points && state.points.length) {
      updateStatusUI();
    } else {
      // 无实时点时，两处状态仍是静态初始文案，直接按语言重设
      var idle = en ? 'Waiting for position data' : '等待定位数据';
      var hdr = document.getElementById('hdrLive');
      if (hdr) hdr.innerHTML = '<span class="dot idle"></span>' + idle;
      var foot = document.getElementById('liveDot');
      if (foot) foot.innerHTML = '<span class="ld-dot"></span> ' + idle;
    }
  };
})();
