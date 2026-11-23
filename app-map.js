// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAP INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  I18N (统一由 lang.js / window.GHTI18N 提供)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const t = window.GHTI18N.t;
let currentLang = window.GHTI18N.getLang();
function cardTitle(i18nKey, enText, extraHtml) {
  const zh = window.GHTI18N.get('zh', i18nKey, i18nKey);
  const en = enText || window.GHTI18N.get('en', i18nKey, t(i18nKey));
  return '<span>' + zh + '</span><span class="en">' + en + '</span>' + (extraHtml || '');
}
function getProvEN(pid) {
  const m = { koshi: 'Koshi', bagmati: 'Bagmati', gandaki: 'Gandaki', lumbini: 'Lumbini', karnali: 'Karnali', sudurpashchim: 'Sudurpashchim' };
  return m[pid] || pid || '—';
}
function getProv(pid) { return currentLang === 'en' ? getProvEN(pid) : getProvZH(pid); }
function applyLang() {
  currentLang = window.GHTI18N.getLang();
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  const lb = document.querySelector('.lang-btn');
  if (lb) lb.textContent = 'Language ▾';
  document.querySelectorAll('.tn-tab').forEach(el => { el.textContent = t('nav.' + el.dataset.view); });
  const sub = document.querySelector('.brand .sub'); if (sub) sub.textContent = t('brand.sub');
  document.querySelectorAll('.basemap-btn').forEach((el, i) => { el.title = t(['basemap.terrain', 'basemap.topo'][i]); });
  const dm = document.getElementById('btnDataMgmt'); if (dm) dm.textContent = '🔧 ' + t('nav.datamgmt');
  // 顶栏三个外链统一 4 字命名（行程对比 / 路段进度 / 远征日志），无符号无箭头
  const ni = document.getElementById('navItinerary');
  if (ni) { ni.textContent = t('nav.itinerary.full'); ni.title = t('nav.itinerary.title'); }
  const ns = document.getElementById('navSections');
  if (ns) { ns.textContent = t('nav.sections.full'); ns.title = t('nav.sections.title'); }
  const nj = document.getElementById('navJournal');
  if (nj) { nj.textContent = t('nav.journal.full'); nj.title = t('nav.journal.title'); }
  const nt = document.getElementById('navTrack');
  if (nt) nt.textContent = t('nav.track');
  // 底图版权行前缀（© 前的「底图:」↔「Basemap:」），双向切换
  document.querySelectorAll('span').forEach(function (s) {
    if (s.childNodes.length === 1 && s.textContent.indexOf('OpenStreetMap') >= 0 && /^(底图[:：]|Basemap:)/.test(s.textContent)) {
      s.textContent = s.textContent.replace(/^(底图[:：]|Basemap:)\s*/, currentLang === 'en' ? 'Basemap: ' : '底图: ');
    }
  });
  const dmt = document.getElementById('dmTitle'); if (dmt) dmt.textContent = t('dm.title');
  const dph = document.getElementById('dmPwdHint'); if (dph) dph.textContent = t('dm.pwdHint');
  const du = document.getElementById('dmUnlock'); if (du) du.textContent = t('dm.unlock');
  const de = document.getElementById('dmPwdErr'); if (de) de.textContent = t('dm.pwdErr');
  // ── 首页静态元素 i18n（index.html 中非 JS 渲染的硬编码中文）──
  // 后台（GHT_FORCE_ZH）保留自身标题，不被首页标题覆盖
  if (!window.GHT_FORCE_ZH) document.title = currentLang === 'en' ? 'GHT Great Himalaya Trail · Live Tracker' : 'GHT 大喜马拉雅高线徒步追踪';
  const brandH1 = document.querySelector('.brand-text h1'); if (brandH1) brandH1.textContent = t('brand.title');
  const brandP = document.querySelector('.brand-text p'); if (brandP) brandP.textContent = 'Great Himalaya Trail · ' + t('brand.sub');
  // 地图卡片标题
  const mapTitle = document.querySelector('.map-card .card-h'); if (mapTitle) { const sps = mapTitle.querySelectorAll('span'); if (sps[1]) sps[1].textContent = t('map.title'); }
  // 位置徽章标签
  const posBadge = document.getElementById('currentPosBadge'); if (posBadge) { const txt = posBadge.childNodes; for (let i = 0; i < txt.length; i++) { if (txt[i].nodeType === 3 && /当前位置|Current location/.test(txt[i].nodeValue)) { txt[i].nodeValue = t('pos.prefix'); break; } } }
  // 图例
  const legendRows = document.querySelectorAll('.map-legend .lg-row');
  if (legendRows.length >= 2) { legendRows[0].lastChild.textContent = t('leg.actual'); legendRows[1].lastChild.textContent = t('leg.plan'); }
  // 海拔面板
  const evTitle = document.querySelector('.ev-title'); if (evTitle) evTitle.textContent = t('elev.title');
  // 每次语言切换都同步 scope 名称（原先 dataset.translated 一次性标记会导致切回时停留在旧语言）
  const evScopeName = document.getElementById('elevScopeName'); if (evScopeName) evScopeName.textContent = t('elev.scopePreset');
  const scopeBtns = document.querySelectorAll('#elevScope button');
  if (scopeBtns.length >= 2) { scopeBtns[0].textContent = t('elev.scopeFull'); scopeBtns[1].textContent = t('elev.scopeRegion'); }
  // 页脚
  const footerCopy = document.querySelector('.statusbar span:first-child'); if (footerCopy && /GHT/.test(footerCopy.textContent)) footerCopy.textContent = t('footer.copyright');
  const footerData = document.querySelector('.statusbar span[data-i18n="dataSrc"]') || Array.from(document.querySelectorAll('.statusbar span')).find(s => /数据来源|Data source/.test(s.textContent));
  if (footerData) footerData.textContent = t('footer.dataSrc');
  // 加载遮罩
  const loadingTxt = document.querySelector('.loading-card div:last-child'); if (loadingTxt && /解析|Parsing/.test(loadingTxt.textContent)) loadingTxt.textContent = t('loading.parse');
}
const DELAY_ICON = { weather: '☁️', injured: '🩹', tired: '😴', other: '⚠️' };
function delayLabel(reason) { return t('it.delay.' + (reason || 'other')); }
function onHomeLangChange() {
  currentLang = window.GHTI18N.getLang();
  applyLang();
  // 重渲染卡片，使 ch-cap 徽章等「按渲染时 currentLang 生成」的动态文案同步到新语言
  if (typeof renderDashboard === 'function') renderDashboard();
  // 海拔剖面的统计行/区域图例/位置标注由 drawElevationProfile() 渲染，切换语言后必须重绘
  if (typeof updateElevScopeUI === 'function') updateElevScopeUI();
  if (typeof drawElevationProfile === 'function') drawElevationProfile();
  const active = document.querySelector('.tn-tab.active');
  if (active) showView(active.dataset.view);
}
window.GHTI18N.onChange(onHomeLangChange);
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
  })
};
const currentBasemap = { layer: basemaps.terrain };

basemaps.terrain.addTo(map);
currentBasemap.layer = basemaps.terrain;

// 主题切换已移除：地图默认使用浅色 terrain 瓦片（basemaps.terrain），全站仅 Stripe 浅色。
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
      { key: 'terrain', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z"/><path d="M9 3v16M15 5v16"/></svg>', title: t('basemap.terrain') },
      { key: 'topo',    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M3 20l6-9 4 5 3-4 5 8z"/></svg>', title: t('basemap.topo') }
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
    fetch(local).then(res => { if (!res.ok) throw new Error('local ' + res.status); return res.json(); })
      .then(render)
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
    // 实时上报：只读公开，写入若服务端配了 LIVE_TOKEN 则用独立令牌，否则回退 owner token
    getLive: async () => {
      if (!hasBackend()) return { ok: true, status: 200, data: null };
      return req('GET', '/api/live');
    },
    postLive: async (point) => {
      if (!hasBackend()) return noBackend();
      const headers = { 'Content-Type': 'application/json' };
      // 独立上报令牌（仅上报用，与管理员 token 分开）。后台「实时上报」区填写后存本机。
      try { const lt = localStorage.getItem('ght_live_token'); if (lt) headers['X-Live-Token'] = lt; } catch (e) {}
      return req('POST', '/api/live', { headers: headers, body: JSON.stringify(point || {}) });
    },
    putShare: async (bundle) => {
      if (!hasBackend()) return noBackend();
      try {
        return req('PUT', '/api/share', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bundle) });
      } catch (e) { return noBackend(); }
    },
    deleteTracks: async () => {
      if (!hasBackend()) return noBackend();
      try {
        return req('DELETE', '/api/tracks');
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
    if (c.language) {
      let lang = c.language;
      // 兼容历史脏值：后台旧版把"中文"存成 zh-CN，但代码判断用 zh，会导致语言按钮失效
      if (/^zh/i.test(lang)) lang = 'zh';
      if (lang !== currentLang) {
        window.GHTI18N.setLang(lang);
        currentLang = window.GHTI18N.getLang();
      }
    }
    if (c.itineraryStartDate != null) {
      APP.itineraryStartDate = c.itineraryStartDate;
      // 行程对比页(itinerary.html)只读 localStorage 的出发日期；admin 设置的日期落在服务端，
      // 不会自动写入本地，导致该页一直显示「未设置出发日」横幅。故在本地为空时，
      // 用服务端已配置的日期回填本地存储（不覆盖用户本地的不同值）。
      try {
        if (!localStorage.getItem('ght_itinerary_start')) {
          localStorage.setItem('ght_itinerary_start', c.itineraryStartDate);
        }
      } catch (e) {}
    }
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
function openDataModal(mode) {
  APP._uploadMode = mode || null;
  const dmTitle = document.getElementById('dmTitle');
  if (dmTitle) dmTitle.textContent = t('dm.title') + (mode === 'preset' ? ' · ' + t('elev.scopePreset') : mode === 'actual' ? ' · Actual' : '');
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
  APP._uploadMode = null;
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
  sections: ['路段进度', 'SECTION PROGRESS'],
  itinerary: ['行程对比', 'ITINERARY']
};
// 根据 currentLang 返回正确的标题 [中文, 英文]
function vt(key) { const v = VIEW_TITLES[key]; return v ? (currentLang === 'en' ? [v[1], v[1]] : v) : ['视图', 'VIEW']; }

function showView(view) {
  APP.activeView = view;
  document.querySelectorAll('.tn-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'dashboard') { renderDashboard(); fitRoute(); return; }
  const card = document.getElementById('cardPasses');
  if (!card) return;
  let html = '';
  if (view === 'sections') html = renderSections();
  else if (view === 'itinerary') html = renderItinerary();
  const title = vt(view);
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

