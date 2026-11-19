/* GHT GPX 同步模块 —— 备份副本专用，原项目未改动
   职责：解析手表/手机导出的标准 GPX，取末尾轨迹点喂给实时图层。
   - 点自身的 <time> 是 GPS 记录时刻（UTC），作为"最后知道你在哪"的时间基准
   - 文件被导入的时刻不写入点，避免用本地时钟污染 GPX 原始时间 */
(function () {
  'use strict';

  var KEY = 'ght_live_demo_points';
  var EVENT = 'ght-live-updated';
  var MAX = 60;
  var NEPAL_OFFSET = (5 * 60 + 45) * 60000; // UTC+5:45
  var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;

  // 定位时间距现在多久 —— 前台状态栏与后台提示共用同一套判定
  // 表达的是"最后知道你在哪"距今多旧，不是设备在线离线
  function isEn() {
    try { return localStorage.getItem('ght_lang') === 'en'; } catch (e) { return false; }
  }

  function freshness(ts) {
    var age = ts ? Math.max(0, Date.now() - Number(ts)) : Infinity;
    var level = age < DAY ? 'fresh' : (age < 3 * DAY ? 'aging' : 'stale');
    var label = ageText(age);
    var en = isEn();
    var just = en ? 'Just now' : '刚刚';
    return {
      age: age,
      level: level,                       // fresh / aging / stale
      label: label,                       // 刚刚 / 3 小时前 / 2 天前
      phrase: label === (en ? 'Just now' : '刚刚')
        ? (en ? 'Located just now' : '刚刚定位')
        : ((en ? 'Located ' : '定位于 ') + label),
      advise: level === 'fresh' ? '' : (level === 'aging'
        ? (en ? 'Position getting old — please re-upload track' : '定位已较旧，建议回传轨迹')
        : (en ? 'Position stale — please re-upload track soon' : '定位已久未更新，请尽快回传轨迹'))
    };
  }

  function ageText(age) {
    var en = isEn();
    if (!isFinite(age)) return en ? 'Never located' : '尚未定位';
    if (age < MINUTE) return en ? 'Just now' : '刚刚';
    if (age < HOUR) return Math.round(age / MINUTE) + (en ? ' min ago' : ' 分钟前');
    if (age < DAY) return Math.round(age / HOUR) + (en ? ' h ago' : ' 小时前');
    return Math.round(age / DAY) + (en ? ' d ago' : ' 天前');
  }

  function parse(text) {
    var clean = String(text || '').replace(/^#gpx\s+\S+\s*\n/, '').trim();
    var doc;
    try {
      doc = new DOMParser().parseFromString(clean, 'text/xml');
    } catch (e) {
      throw new Error('无法解析文件，请确认是 GPX 格式');
    }
    if (doc.querySelector('parsererror')) throw new Error('GPX XML 解析失败，请确认文件完整');

    var nodes = doc.getElementsByTagName('trkpt');
    if (!nodes.length) nodes = doc.getElementsByTagName('rtept');
    if (!nodes.length) throw new Error('GPX 中没有找到轨迹点（trkpt/rtept）');

    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var lat = parseFloat(n.getAttribute('lat'));
      var lon = parseFloat(n.getAttribute('lon'));
      if (!isFinite(lat) || !isFinite(lon)) continue;

      var ele = n.getElementsByTagName('ele')[0];
      var tm = n.getElementsByTagName('time')[0];
      var t = tm ? Date.parse(tm.textContent) : NaN;

      out.push({
        lat: lat,
        lon: lon,
        elev: ele && isFinite(parseFloat(ele.textContent)) ? parseFloat(ele.textContent) : null,
        time: isFinite(t) ? t : null
      });
    }
    if (!out.length) throw new Error('GPX 轨迹点坐标无效');
    return out;
  }

  function lastTime(points) {
    for (var i = points.length - 1; i >= 0; i--) {
      if (points[i].time != null) return points[i].time;
    }
    return null;
  }

  // 把 GPX 点转成 live 点：ts 优先用 GPS 时间；缺时间的点按 45 秒回推补齐
  function toLivePoints(points, n) {
    if (!points || !points.length) return [];
    var tail = points.slice(-(n || MAX));
    var endT = lastTime(points) || Date.now();
    return tail.map(function (p, i) {
      var ts = p.time != null ? p.time : (endT - (tail.length - 1 - i) * 45000);
      return {
        lat: p.lat, lon: p.lon, elev: p.elev,
        ts: ts, time: p.time, source: 'gpx'
      };
    });
  }

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLon = (b.lon - a.lon) * Math.PI / 180;
    var la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function speedKmh(a, b) {
    if (!a.time || !b.time || b.time <= a.time) return null;
    var hours = (b.time - a.time) / 3600000;
    if (hours <= 0) return null;
    return haversineKm(a, b) / hours;
  }

  function currentSpeed(livePts) {
    if (!livePts || livePts.length < 2) return null;
    return speedKmh(livePts[livePts.length - 2], livePts[livePts.length - 1]);
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  function write(livePts) {
    try { localStorage.setItem(KEY, JSON.stringify(livePts.slice(-MAX))); } catch (e) {}
  }

  function saveAndBroadcast(livePts) {
    write(livePts);
    try { window.dispatchEvent(new CustomEvent(EVENT, { detail: livePts })); } catch (e) {}
  }

  function formatNepal(ts) {
    if (!ts) return '—';
    var d = new Date(ts + NEPAL_OFFSET);
    var p2 = function (v) { return ('0' + v).slice(-2); };
    return p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + ' ' +
           p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
  }

  window.GpxLive = {
    KEY: KEY, EVENT: EVENT, MAX: MAX,
    parse: parse,
    lastTime: lastTime,
    toLivePoints: toLivePoints,
    haversineKm: haversineKm,
    speedKmh: speedKmh,
    currentSpeed: currentSpeed,
    read: read,
    write: write,
    saveAndBroadcast: saveAndBroadcast,
    formatNepal: formatNepal,
    freshness: freshness,
    ageText: ageText
  };
})();
