/* 全屏 GPX 轨迹同步页 —— 备份副本专用，底图与原项目一致（另有卫星影像切换） */
(function () {
  'use strict';

  var seed = window.GHT_DEMO_SEED;
  if (!window.L || !seed) return;

  var G = window.GpxLive;
  var I = window.GHTI18N;
  function t(k, def) { return I ? I.t(k, def) : def; }
  var KEY = G ? G.KEY : 'ght_live_demo_points';
  var MAX = 60;
  var MINUTE = 60000, HOUR = 3600000, DAY = 24 * HOUR;

  // ── 地图：与 app.js 完全相同的瓦片配置 ──
  var map = L.map('map', {
    center: [28.5, 84.0], zoom: 7, minZoom: 6, maxZoom: 16,
    zoomControl: false, attributionControl: true
  });

  var basemaps = {
    terrain: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri', maxZoom: 13
    }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
      subdomains: 'abc', maxZoom: 13
    }),
    // 实测：尼泊尔境外高德影像模糊且有大量无数据灰块，改用 Esri 全球影像（清晰覆盖喜马拉雅山区）
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri', maxZoom: 18
    })
  };
  var currentBase = 'terrain';
  basemaps.terrain.addTo(map);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  L.control.scale({ metric: true, imperial: false, position: 'bottomright', maxWidth: 120 }).addTo(map);

  // 三个底图（Esri / OpenTopoMap）均为 WGS-84，轨迹坐标无需转换；
  // proj 保留为统一坐标入口，且影像叠加时标注仍显示原始 GPX 经纬度。
  function proj(p) {
    return [p.lat, p.lon];
  }

  var planLayer = L.layerGroup().addTo(map);
  var actualLayer = L.layerGroup().addTo(map);
  var liveLayer = L.layerGroup().addTo(map);

  // ── 13 区域色块（行政区填充多边形）──
  // 与主首页地图一致：ght-region-map.js 提供 districtToRegion + regions 调色板，
  // nepal-districts.geojson 提供行政区几何。独立 pane(z=350) 让色块始终在轨迹线之下。
  var regionLayer = L.layerGroup().addTo(map);
  map.createPane('regionBlocks');
  map.getPane('regionBlocks').style.zIndex = 350;
  map.getPane('regionBlocks').style.pointerEvents = 'auto';
  var regionGeo = null;

  function distNameOf(f) {
    var p = f.properties || {};
    return p.DIST_EN || p.DISTRICT || p.district || p.NAME || p.name || '';
  }

  function renderRegions() {
    regionLayer.clearLayers();
    var RM = window.GHT_REGION_MAP;
    if (!RM || !regionGeo) return;
    var districtToRegion = RM.districtToRegion || {};
    var regions = RM.regions || {};
    var isEn = I && I.getLang() === 'en';
    var uncolored = [];
    var byRegion = {};
    (regionGeo.features || []).forEach(function (f) {
      var dname = distNameOf(f);
      var rid = districtToRegion[dname];
      if (rid) { (byRegion[rid] = byRegion[rid] || []).push(f); }
      else { f.properties._dname = dname; uncolored.push(f); }
    });
    // 非 GHT 县：灰色上下文底。原始样式记录在 _ghtBase，供缩放切换时恢复。
    if (uncolored.length) {
      var grayLayer = L.geoJSON({ type: 'FeatureCollection', features: uncolored }, {
        pane: 'regionBlocks',
        style: function () { return { color: '#B4B2A9', weight: 0.5, fillColor: '#D3D1C7', fillOpacity: 0.18 }; }
      }).addTo(regionLayer);
      grayLayer._ghtBase = { color: '#B4B2A9', fillColor: '#D3D1C7', uncolored: true };
    }
    // GHT 13 区域：填充色块 + 悬浮信息
    Object.keys(byRegion).forEach(function (key) {
      var i = +key, r = regions[i];
      if (!r) return;
      var regionLyr = L.geoJSON({ type: 'FeatureCollection', features: byRegion[key] }, {
        pane: 'regionBlocks',
        style: function () { return { color: r.stroke, weight: 1, fillColor: r.color, fillOpacity: 0.5 }; },
        onEachFeature: function (f, lyr) {
          var dname = f.properties._dname || distNameOf(f);
          var label = i + '. ' + (isEn ? (r.en || r.zh) : (r.zh || r.en)) + '\n' +
            (r.park || '') + '\n' + (r.days || '') + ' · ' + (r.dist || '') + 'km' +
            (isEn ? (dname ? '\nDistrict: ' + dname : '') : (dname ? '\n行政区: ' + dname : ''));
          lyr.bindTooltip(label, { sticky: true, className: 'tk-region-tip' });
        }
      }).addTo(regionLayer);
      regionLyr._ghtBase = { color: r.stroke, fillColor: r.color, uncolored: false };
    });
    applyRegionZoomStyle();
  }

  // 概览时保留色块填充；放大到 10 级及以上只留边界，让出地形细节。
  // 定位按钮 flyTo(12)、全览 fitBounds(maxZoom 12)、手动滚轮缩放都会触发 zoomend。
  var REGION_OUTLINE_ZOOM = 10;
  function applyRegionZoomStyle() {
    var outlineOnly = map.getZoom() >= REGION_OUTLINE_ZOOM;
    regionLayer.eachLayer(function (lyr) {
      var b = lyr._ghtBase || { color: '#B4B2A9', fillColor: '#D3D1C7', uncolored: true };
      var style = {
        color: b.color,
        fillColor: b.fillColor,
        weight: b.uncolored ? 0.5 : 1,
        opacity: outlineOnly ? (b.uncolored ? 0.3 : 0.8) : 1,
        fillOpacity: outlineOnly ? 0 : (b.uncolored ? 0.18 : 0.5)
      };
      lyr.setStyle(style);
    });
  }
  map.on('zoomend', applyRegionZoomStyle);

  (function loadRegionGeo() {
    var local = 'assets/nepal-districts.geojson';
    fetch(local).then(function (res) { if (!res.ok) throw new Error('local ' + res.status); return res.json(); })
      .then(function (geo) { regionGeo = geo; renderRegions(); })
      .catch(function (err) { console.warn('[region] geojson load failed', err); });
  })();

  // ── 计划路线：整条蓝色虚线（与图例 .tk-lg-plan 一致）──
  // 视觉上用一条连续蓝虚线；每段的区域名/状态用透明交互线承载，点击仍可查看。
  var presetPts = (seed.preset && seed.preset.trackPoints) || [];
  var presetCoords = [];
  var PLAN_COLOR = '#635BFF';   // 与 track.css .tk-lg-plan 的 #635bff 保持一致
  function renderPlan() {
    planLayer.clearLayers();
    presetCoords = presetPts.map(proj);
    if (presetCoords.length < 2) return;
    // 浅色底线：让虚线在地形/卫星底图上都清晰
    L.polyline(presetCoords, { color: '#dfe5ee', weight: 5, opacity: 0.85, lineCap: 'round' }).addTo(planLayer);
    // 计划路线主视觉：蓝色虚线
    L.polyline(presetCoords, { color: PLAN_COLOR, weight: 2.8, opacity: 0.95, dashArray: '6 6', lineCap: 'round' }).addTo(planLayer);
    // 分段透明交互线：保留区域名 + 状态 popup，不改变蓝色虚线外观
    (seed.sections || []).forEach(function (r) {
      var slice = presetCoords.slice(r.startIndex, r.endIndex + 1);
      if (slice.length < 2) return;
      var isEn = I && I.getLang() === 'en';
      var st = r.status === 'completed'
        ? (isEn ? 'Done' : '已完成')
        : (r.status === 'in-progress' ? (isEn ? 'In progress' : '进行中') : (isEn ? 'Not started' : '未开始'));
      L.polyline(slice, { color: PLAN_COLOR, weight: 8, opacity: 0.01, lineCap: 'round' })
        .bindPopup('<b>' + (isEn ? (r.regionEn || r.regionZh) : (r.regionZh || r.regionEn) || '—') + '</b><br>' + (isEn ? 'Status: ' : '状态：') + st)
        .addTo(planLayer);
    });
  }

  // ── 实际轨迹：绿色实线 ──
  function renderActual() {
    actualLayer.clearLayers();
    (seed.actual || []).forEach(function (t) {
      var c = (t.trackPoints || []).map(proj);
      if (c.length < 2) return;
      L.polyline(c, { color: '#ffffff', weight: 6, opacity: 0.5, lineCap: 'round' }).addTo(actualLayer);
      var isEnA = I && I.getLang() === 'en';
      L.polyline(c, { color: '#00A86B', weight: 3, opacity: 0.95, lineCap: 'round' })
        .bindPopup('<b>' + (isEnA ? 'Actual track' : '实际轨迹') + ' · ' + (t.date || t.fileName || '') + '</b><br>' + (t.distance || 0).toFixed(1) + ' km')
        .addTo(actualLayer);
    });
  }
  renderPlan();
  renderActual();

  // ── 实时点 ──
  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function writeStore(pts) {
    try { localStorage.setItem(KEY, JSON.stringify(pts.slice(-MAX))); } catch (e) {}
  }
  function sourcePath() {
    var tracks = seed.actual || [];
    if (!tracks.length) return [];
    return (tracks[tracks.length - 1].trackPoints || []).slice(-40);
  }
  var path = sourcePath();
  var cursor = Math.max(0, path.length - 14);
  var dir = 1;

  function initialPoints() {
    var stored = readStore();
    if (Array.isArray(stored) && stored.length > 1) return stored.slice(-MAX);
    if (!path.length) return [];
    var now = Date.now();
    var tail = path.slice(-12);
    var pts = tail.map(function (p, i) {
      return { lat: p.lat, lon: p.lon, elev: p.elev, time: null, ts: now - (tail.length - 1 - i) * 45000, source: 'demo' };
    });
    writeStore(pts);
    return pts;
  }

  var points = initialPoints();
  var paused = false;
  var backendActive = false;   // 是否已切到 /api/live 云端数据（首次切换才 flyTo，后续静默更新）

  function nextPoint() {
    if (!path.length) return null;
    var idx = cursor + dir;
    if (idx >= path.length) { dir = -1; idx = Math.max(0, path.length - 2); }
    if (idx < 0) { dir = 1; idx = Math.min(1, path.length - 1); }
    cursor = idx;
    var p = path[idx];
    return { lat: p.lat, lon: p.lon, elev: p.elev, ts: Date.now(), source: 'demo' };
  }

  function lastTs() {
    var p = points[points.length - 1];
    return p ? (p.ts || Date.now()) : Date.now();
  }
  function freshness() {
    return G ? G.freshness(lastTs()) : {
      age: Math.max(0, Date.now() - lastTs()),
      level: 'fresh', label: '刚刚', phrase: '刚刚定位', advise: ''
    };
  }

  function personIcon() {
    return L.divIcon({
      html: '<div class="tk-person"><div class="tk-ring"></div>' +
        '<svg width="40" height="40" viewBox="0 0 40 40" style="position:absolute;top:0;left:0">' +
        '<circle cx="20" cy="20" r="8" fill="#F85149"/><circle cx="20" cy="20" r="3.5" fill="#fff"/>' +
        '<path d="M20 2 L24 9 L16 9 Z" fill="#F85149"/></svg></div>',
      className: '', iconSize: [40, 40], iconAnchor: [20, 20]
    });
  }

  function renderLive() {
    liveLayer.clearLayers();
    if (points.length < 2) return;
    var c = points.map(proj);
    L.polyline(c, { color: '#ffffff', weight: 8, opacity: 0.7, lineCap: 'round' }).addTo(liveLayer);
    L.polyline(c, { color: '#F85149', weight: 3, opacity: 0.95, dashArray: '7 6', lineCap: 'round' })
      .addTo(liveLayer);
    points.slice(0, -1).forEach(function (p) {
      L.circleMarker(proj(p), { radius: 2.5, color: '#fff', fillColor: '#F85149', fillOpacity: 1, weight: 1 }).addTo(liveLayer);
    });
    var last = points[points.length - 1];
    var isEnL = I && I.getLang() === 'en';
    L.marker(proj(last), { icon: personIcon() })
      .bindPopup('<b>' + (isEnL ? 'Last synced position · GPX' : '最后同步位置 · GPX') + '</b><br>' + Number(last.lat).toFixed(5) + ', ' + Number(last.lon).toFixed(5))
      .addTo(liveLayer);
  }

  function regionForPoint(p) {
    var best = null, bestD = Infinity;
    (seed.sections || []).forEach(function (r) {
      var mid = Math.floor(((r.startIndex || 0) + (r.endIndex || 0)) / 2);
      var q = presetPts[mid];
      if (!q) return;
      var d = (q.lat - p.lat) * (q.lat - p.lat) + (q.lon - p.lon) * (q.lon - p.lon);
      if (d < bestD) { bestD = d; best = r; }
    });
    if (!best) return '—';
    var isEn = I && I.getLang() === 'en';
    return isEn ? (best.regionEn || best.regionZh || '—') : (best.regionZh || best.regionEn || '—');
  }

  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  // 是否处于演示态：未连后端、且最后一个点仍是演示种子（source=demo 或无来源）。
  // 连上 /api/live 或收到后台广播后 backendActive=true，一律视为真实数据。
  function isDemoData() {
    var p = points[points.length - 1];
    if (!p) return true;
    if (backendActive) return false;
    return p.source === 'demo' || !p.source;
  }

  function updateUI() {
    var p = points[points.length - 1];
    if (!p) return;
    var f = freshness();
    var demo = isDemoData();
    // 演示态：不用假时间戳算出的"刚刚定位"误导关注者。状态栏与首页统一为"等待定位数据"，
    // 用灰色徽章 + banner 说明当前只是演示轨迹；一旦切到真实数据即恢复 freshness 状态。
    var statusCls = demo ? ' is-offline' : (f.level === 'fresh' ? '' : ' is-' + f.level);
    var status = document.getElementById('tkStatus');
    if (status) status.className = 'tk-status' + statusCls;
    setText('tkStatusText', demo ? t('tk.waiting', '等待定位数据') : f.phrase);

    var banner = document.getElementById('tkBanner');
    if (banner) banner.className = 'tk-live-banner' + statusCls;
    setText('tkBannerText', demo
      ? t('tk.demo.banner', '当前显示演示轨迹，尚未同步真实 GPX 定位')
      : (f.advise ? f.phrase + ' · ' + f.advise : f.phrase));

    setText('tkLat', Number(p.lat).toFixed(4) + '° N');
    setText('tkLon', Number(p.lon).toFixed(4) + '° E');
    setText('tkAlt', p.elev != null ? Math.round(p.elev).toLocaleString('en-US') + ' m' : '—');
    var spd = G ? G.currentSpeed(points) : null;
    setText('tkSpd', spd != null ? spd.toFixed(1) + ' km/h' : '—');
    var done = (seed.actual || []).reduce(function (s, t) { return s + (Number(t.distance) || 0); }, 0);
    setText('tkDistance', done.toFixed(2) + ' / ' + (seed.totalDistance || 1602) + ' km');
    setText('tkLastTs', G ? G.formatNepal(lastTs()) : new Date(lastTs()).toLocaleString('zh-CN', { hour12: false }));
    setText('tkRegion', regionForPoint(p) + ' · ' + t('tk.enroute', '行进中'));
    setText('tkBattery', points.length + ' ' + t('tk.ptUnit', '点'));

    var tl = document.getElementById('tkTimeline');
    if (tl) {
      tl.innerHTML = points.slice(-6).reverse().map(function (q) {
        var tm = q.source === 'gpx' ? (G ? G.formatNepal(q.ts) : new Date(q.ts).toLocaleTimeString('zh-CN', { hour12: false }))
          : new Date(q.ts || Date.now()).toLocaleTimeString('zh-CN', { hour12: false });
        var tag = q.source === 'gpx' ? t('tk.gpxsync', 'GPX 同步') : (q.source === 'admin' ? t('tk.manual', '手动上报') : t('tk.demo', '演示数据'));
        return '<div class="tk-tl-item"><div class="tk-tl-time">' + tm + ' · ' + tag + '</div>' +
          '<div class="tk-tl-text">' + Number(q.lat).toFixed(4) + '°N ' + Number(q.lon).toFixed(4) + '°E · ' +
          (q.elev != null ? Math.round(q.elev) + ' m' : '—') + '</div></div>';
      }).join('');
    }

  }

  function refresh() { renderLive(); updateUI(); }

  function tick() {
    var stored = readStore();
    if (stored && stored.length && stored[stored.length - 1].ts > lastTs()) {
      points = stored.slice(-MAX);
      refresh();
      return;
    }
    if (paused) { updateUI(); return; }
    var np = nextPoint();
    if (!np) return;
    points.push(np);
    writeStore(points);
    refresh();
  }

  function applyImportedPoints(livePts, sourceName) {
    points = livePts.slice(-MAX);
    paused = true;
    writeStore(points);
    refresh();
    var last = points[points.length - 1];
    if (last) map.flyTo(proj(last), 12, { duration: 0.9 });
  }

  // ── 后端轮询：访客打开轨迹页也能看到云端最新位置（首页 demo-live.js 已有同等逻辑）──
  // 本地 file:// 直接打开时跳过（无后端），继续用演示点；线上每 30 秒 GET /api/live。
  // 关键：只在云端最新点比本地更新时才切换，避免用户手动缩放/查看时被旧数据反复 flyTo 打断。
  function pollBackend() {
    if (location.protocol === 'file:') return;
    fetch('/api/live', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var d = j && j.data;
        if (!d || !d.latest) return;                       // 云端尚无上报点 → 保留本地演示
        var pts = (Array.isArray(d.points) && d.points.length) ? d.points : [d.latest];
        var cloudTs = pts[pts.length - 1].ts || 0;
        var localTs = points.length ? (points[points.length - 1].ts || 0) : 0;
        // 已连云端且云端无新点时不动作；首次连接（backendActive=false）无条件接管演示点
        if (backendActive && cloudTs <= localTs) return;
        // 归一化：后端若未存 source（旧数据），按云端点默认 gpx 处理，保证时间格式与时间轴标签正确
        pts = pts.map(function (p) {
          var q = { lat: p.lat, lon: p.lon, elev: p.elev, ts: p.ts,
                    source: p.source || 'gpx' };
          return q;
        });
        var wasDemo = !backendActive;
        backendActive = true;
        points = pts.slice(-MAX);
        paused = true;
        writeStore(points);
        refresh();
        // 仅首次从演示切到真实数据时飞到最新点，之后轮询不再移动地图
        if (wasDemo) {
          var last = points[points.length - 1];
          if (last) map.flyTo(proj(last), 12, { duration: 0.9 });
        }
      })
      .catch(function () { /* 后端不可用时继续本地演示，不打扰用户 */ });
  }

  // 导入统一在后台完成；前台只接收后台写入后的同步事件
  function wireSync() {
    if (!G) return;
    window.addEventListener(G.EVENT, function (e) {
      if (e.detail && e.detail.length) {
        backendActive = true;   // 本地广播也是最新数据源，避免随后轮询用更旧的云端点覆盖
        applyImportedPoints(e.detail, '后台同步');
      }
    });
  }

  function toggleLabel(open) {
    return (open ? '✕ ' + t('tk.close', '收起') : '☰ ' + t('tk.traveler', '行者信息'));
  }
  function wire() {
    // 窄屏抽屉：点按钮展开/收起信息面板；点地图区域自动收起
    var toggle = document.getElementById('tkPanelToggle');
    var shell = document.querySelector('.tk-shell');
    if (toggle && shell) {
      toggle.onclick = function (e) {
        e.stopPropagation();
        var open = shell.classList.toggle('panel-open');
        toggle.textContent = toggleLabel(open);
      };
      document.getElementById('map').addEventListener('click', function () {
        if (shell.classList.contains('panel-open')) {
          shell.classList.remove('panel-open');
          toggle.textContent = toggleLabel(false);
        }
      });
    }
    document.getElementById('tkLocate').onclick = function () {
      var p = points[points.length - 1];
      if (p) map.flyTo(proj(p), 12, { duration: 0.9 });
    };
    document.getElementById('tkFit').onclick = function () {
      if (presetCoords.length > 1) map.fitBounds(L.latLngBounds(presetCoords), { padding: [32, 32], maxZoom: 12 });
    };
    document.getElementById('tkBaseTerrain').onclick = function () { switchBase('terrain'); };
    document.getElementById('tkBaseTopo').onclick = function () { switchBase('topo'); };
    document.getElementById('tkBaseSatellite').onclick = function () { switchBase('satellite'); };
  }

  function baseSub(key) {
    return t('tk.sub.' + key, {
      terrain: '底图：Esri World Topo · 与总览页一致',
      topo: '底图：OpenTopoMap · 与总览页一致',
      satellite: '底图：Esri 全球影像 · 卫星俯瞰，喜马拉雅山区清晰'
    }[key]);
  }
  function switchBase(key) {
    if (key === currentBase) return;
    map.removeLayer(basemaps[currentBase]);
    basemaps[key].addTo(map);
    currentBase = key;
    // 重绘全部图层，保证轨迹样式与底图协调
    renderPlan();
    renderActual();
    renderLive();
    ['terrain', 'topo', 'satellite'].forEach(function (k) {
      var btn = document.getElementById('tkBase' + k.charAt(0).toUpperCase() + k.slice(1));
      if (btn) btn.classList.toggle('on', k === key);
    });
    setText('tkMapSub', baseSub(key));
  }

  // 语言切换：重绘带文案的图层标注 + 动态 UI + 底图副标题 + 抽屉按钮
  window.onLangChange = function () {
    renderRegions();
    renderPlan();
    renderActual();
    renderLive();
    setText('tkMapSub', baseSub(currentBase));
    var tgl = document.getElementById('tkPanelToggle');
    var sh = document.querySelector('.tk-shell');
    if (tgl && sh) tgl.textContent = toggleLabel(sh.classList.contains('panel-open'));
    updateUI();
  };

  wire();
  wireSync();
  refresh();
  pollBackend();                       // 立即拉一次云端最新点
  var pollTimer = setInterval(pollBackend, 30000);   // 每 30 秒同步，与首页一致
  if (presetCoords.length > 1) {
    map.fitBounds(L.latLngBounds(presetCoords), { padding: [32, 32], maxZoom: 12 });
  } else if (points.length) {
    map.setView(proj(points[points.length - 1]), 10);
  }
  setInterval(tick, 5000);
})();
