const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('/Users/nt/.workbuddy/binaries/node/workspace/node_modules/jsdom');

const BASE = '/Users/nt/WorkBuddy/2026-07-01-10-23-33/ght-trek/';
const html = fs.readFileSync(BASE + 'index.html', 'utf8');

// 提取所有脚本：无 src 的内联 + 本地 src 文件（CDN 的 leaflet 用桩替代）
const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
let js = '';
for (const tag of scriptTags) {
  const attrs = tag[1];
  const body = tag[2];
  const srcMatch = attrs.match(/src=["']([^"']+)["']/);
  if (srcMatch) {
    const src = srcMatch[1];
    if (/^https?:/i.test(src)) continue; // 外部 CDN（leaflet）用桩替代
    const p = path.join(BASE, src);
    try { js += fs.readFileSync(p, 'utf8') + '\n'; } catch (e) { /* 找不到就跳过 */ }
  } else {
    js += body + '\n';
  }
}

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost/',
  pretendToBeVisual: true
});
const { window } = dom;

// 内存版 localStorage
const mem = {};
window.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
  clear: () => { for (const k in mem) delete mem[k]; },
  key: i => Object.keys(mem)[i] || null,
  get length() { return Object.keys(mem).length; }
};

const alerts = [];
let confirmQueue = [];
window.alert = m => alerts.push(String(m));
window.confirm = () => confirmQueue.shift();
window.setTimeout = setTimeout;
window.Promise = Promise;

// Leaflet 万能桩：吸收一切调用，layerGroup 实例可记录 addTo
function makeAny() {
  const t = function () { return makeAny(); };
  const p = new Proxy(t, {
    get(o, prop) {
      if (prop === '_addedTo') return o._addedTo;
      if (prop === '__isLayerGroup') return o.__isLayerGroup;
      if (prop === 'addTo') return () => { o._addedTo = true; return p; };
      if (prop === 'hasLayer') return () => false; // 默认视为未加入
      if (prop === 'getCenter' || prop === 'getBounds' || prop === 'getNorthEast' ||
          prop === 'getSouthWest' || prop === 'getLatLng') return () => p;
      if (prop === 'isValid') return () => true;
      if (prop === 'lat' || prop === 'lng' || prop === 'alt') return 0;
      if (prop === 'length') return 0;
      if (prop === Symbol.toPrimitive) return () => 0;
      return (...a) => p;
    },
    set(o, prop, val) {
      if (prop === '_addedTo') o._addedTo = val;
      if (prop === '__isLayerGroup') o.__isLayerGroup = val;
      return true;
    }
  });
  return p;
}
// Leaflet「类桩」：可 new、可 .extend，调用/实例化均返回吸收型对象
function makeLeafletClass() {
  const cls = function () { return makeAny(); };
  return new Proxy(cls, {
    get(o, prop) {
      if (prop === 'extend') return () => makeLeafletClass();
      if (prop === 'hasLayer') return () => false; // 默认视为未加入图层
      return makeAny();
    }
  });
}
function makeL() {
  return new Proxy(function () {}, {
    get(o, prop) {
      if (prop === 'layerGroup') return () => { const l = makeAny(); l.__isLayerGroup = true; return l; };
      if (prop === 'version') return '1.9';
      return makeLeafletClass();
    }
  });
}
window.L = makeL();

// 暴露内部符号供测试断言
js += '\n;window.__exp={APP,handleGPXUpload,showSectionWaypoints,waypointLayer,uploadedTrackGroup,getItineraryDate,matchItineraryToActuals,applySegmentItinerary,setItineraryStartDate,renderItinerary};';

const ctx = dom.getInternalVMContext();
vm.runInContext(js, ctx, { filename: 'ght-inline.js' });

const exp = window.__exp;
const APP = exp.APP;

function gpx(name) { return fs.readFileSync(BASE + name, 'utf8'); }
function makeFile(content, name) { return new window.File([content], name, { type: 'application/gpx+xml' }); }
function upload(files, confs) {
  confirmQueue = confs.slice();
  const event = { target: { files, value: '' } };
  exp.handleGPXUpload(event);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const results = [];
  const check = (name, cond, extra) => results.push((cond ? 'PASS' : 'FAIL') + ' · ' + name + (extra ? '  [' + extra + ']' : ''));

  // ── 复现场景：批量导入每日预设(生成日程) → 上传实际轨迹 → 设置出发日期 ──
  const DLD = '/Users/nt/Downloads/';
  const presetFiles = fs.readdirSync(DLD).filter(f => /^ghtday\d+-\d+\.gpx$/.test(f)).map(f => makeFile(fs.readFileSync(DLD + f, 'utf8'), f));
  console.log('预设文件数:', presetFiles.length);
  upload(presetFiles, [true]);
  await wait(6000);

  check('批量预设导入生成日程', APP.itinerary.length > 0, 'days=' + APP.itinerary.length);

  // 上传 2 个实际轨迹（单文件 → addActualTrack）
  upload([makeFile(fs.readFileSync(BASE + 'test-actual/actual-day01.gpx', 'utf8'), 'actual-day01.gpx')], [true]);
  await wait(1500);
  upload([makeFile(fs.readFileSync(BASE + 'test-actual/actual-day06.gpx', 'utf8'), 'actual-day06.gpx')], [true]);
  await wait(1500);

  check('实际轨迹已记录(2条)', APP.actualTracks.length === 2, 'actualTracks=' + APP.actualTracks.length);
  const d1pre = APP.itinerary.find(d => d.day === 1);
  const d6pre = APP.itinerary.find(d => d.day === 6);
  check('【前置】Day1 实际统计已显示', !!(d1pre && d1pre.actual), 'day1.actual=' + (d1pre && !!d1pre.actual));
  check('【前置】Day6 实际统计已显示', !!(d6pre && d6pre.actual), 'day6.actual=' + (d6pre && !!d6pre.actual));

  // ── 用户操作：设置出发日期（关键：停在「行程安排」面板，才会触发 renderItinerary → matchItineraryToActuals 重算）──
  APP.activeTab = 'itinerary';
  exp.setItineraryStartDate('2026-11-01');
  await wait(300);

  const d1post = APP.itinerary.find(d => d.day === 1);
  const d6post = APP.itinerary.find(d => d.day === 6);
  check('【Bug】Day1 设置日期后实际统计仍存在', !!(d1post && d1post.actual), 'day1.actual=' + (d1post && !!d1post.actual));
  check('【Bug】Day6 设置日期后实际统计仍存在', !!(d6post && d6post.actual), 'day6.actual=' + (d6post && !!d6post.actual));

  const htmlStr = exp.renderItinerary();
  const cmpCount = (htmlStr.match(/📡 GPS记录对比/g) || []).length;
  check('行程 HTML 含实际对比块(应≥2)', cmpCount >= 2, 'blocks=' + cmpCount);

  console.log('\n===== GHT 端到端上传流程测试结果 =====');
  results.forEach(r => console.log(r));
  const failed = results.filter(r => r.startsWith('FAIL'));
  console.log('\n' + (failed.length ? ('❌ ' + failed.length + '/' + results.length + ' 项失败') : ('✅ 全部 ' + results.length + ' 项通过')));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('测试运行异常:', e); process.exit(2); });
