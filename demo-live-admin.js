/* 后台实时上报表单：本地预览写 localStorage；部署后写 /api/live */
(function () {
  'use strict';

  var KEY = 'ght_live_demo_points';
  var msg = document.getElementById('liveMsg');
  if (!msg) return;

  function say(text, ok) {
    msg.textContent = text;
    msg.style.color = ok ? '#00A86B' : '#BA7517';
  }

  function lastGpsPoint() {
    var tracks = (window.APP && APP.actualTracks) || [];
    if (!tracks.length) return null;
    var pts = tracks[tracks.length - 1].trackPoints || [];
    return pts.length ? pts[pts.length - 1] : null;
  }

  function setVal(id, v) {
    var el = document.getElementById(id);
    if (el && v != null) el.value = v;
  }

  function collect() {
    function num(id) {
      var v = document.getElementById(id).value.trim();
      return v === '' ? null : Number(v);
    }
    var p = {
      lat: num('liveLat'), lon: num('liveLon'), elev: num('liveElev'),
      speed: num('liveSpeed'),
      device: (document.getElementById('liveDevice').value || '').trim(),
      note: '', ts: Date.now(), source: 'admin'
    };
    return p;
  }

  function saveLocal(p) {
    var points = [];
    try { points = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    if (!Array.isArray(points)) points = [];
    points.push(p);
    if (points.length > 60) points = points.slice(-60);
    localStorage.setItem(KEY, JSON.stringify(points));
  }

  // 后台提示：与前台共用同一套时间差判定，运算符/访客看到的状态一致
  function lastLiveTs() {
    var pts = [];
    try { pts = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    if (Array.isArray(pts) && pts.length) {
      var t = pts[pts.length - 1].ts;
      if (t) return Number(t);
    }
    var g = lastGpsPoint();
    return g && g.time ? Number(g.time) : null;
  }

  function renderStatus() {
    var strip = document.getElementById('liveStatusStrip');
    if (!strip) return;
    var ts = lastLiveTs();
    var title = document.getElementById('lssTitle');
    var sub = document.getElementById('lssSub');
    if (!ts) {
      strip.className = 'live-status-strip';
      if (title) title.textContent = '最后定位 · 等待数据';
      if (sub) sub.textContent = '导入实际轨迹或手动补录后，这里显示定位时间距今多久';
      return;
    }
    var f = window.GpxLive ? GpxLive.freshness(ts) : null;
    var npTime = window.GpxLive ? GpxLive.formatNepal(ts) : new Date(ts).toLocaleString('zh-CN', { hour12: false });
    strip.className = 'live-status-strip' + (f && f.level !== 'fresh' ? ' is-' + f.level : '');
    if (title) title.textContent = '最后定位 · ' + (f ? f.phrase : new Date(ts).toLocaleString('zh-CN'));
    if (sub) sub.textContent = '定位时间 ' + npTime + '（尼泊尔时间）' + (f && f.advise ? ' · ' + f.advise : '');
  }

  renderStatus();
  setInterval(renderStatus, 60000);
  if (window.GpxLive) {
    window.addEventListener(GpxLive.EVENT, renderStatus);
  }

  document.getElementById('liveFill').addEventListener('click', function () {
    var p = lastGpsPoint();
    if (!p) { say('没有可用的最后 GPS 点，请先导入实际轨迹。', false); return; }
    setVal('liveLat', p.lat != null ? p.lat.toFixed(5) : '');
    setVal('liveLon', p.lon != null ? p.lon.toFixed(5) : '');
    setVal('liveElev', p.elev != null ? Math.round(p.elev) : '');
    setVal('liveSpeed', '');
    say('已填入最后一条实际轨迹终点，可修改后提交。', true);
  });

  document.getElementById('liveSubmit').addEventListener('click', async function () {
    var p = collect();
    if (!isFinite(p.lat) || !isFinite(p.lon) || !p.lat || !p.lon) {
      say('请填写有效纬度和经度。', false);
      return;
    }
    if (location.protocol === 'file:') {
      saveLocal(p);
      renderStatus();
      say('已写入本地演示数据，刷新首页即可看到新点。', true);
      return;
    }
    if (!window.API || typeof API.postLive !== 'function') {
      say('后端接口脚本未加载。', false);
      return;
    }
    try {
      var r = await API.postLive(p);
      if (r && r.ok) { renderStatus(); say('上报成功，首页实时图层将自动更新。', true); }
      else if (r && r.status === 401) say('未登录或 token 过期，请先在后台解锁。', false);
      else say('上报失败，请检查后端与 KV 绑定。', false);
    } catch (e) {
      say('网络异常：' + (e && e.message ? e.message : '未知错误'), false);
    }
  });
})();
