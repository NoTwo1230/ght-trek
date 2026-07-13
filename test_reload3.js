const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('/Users/nt/.workbuddy/binaries/node/workspace/node_modules/jsdom');

const BASE = '/Users/nt/WorkBuddy/2026-07-01-10-23-33/ght-trek/';
const DLD = '/Users/nt/Downloads/';
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
    if (/^https?:/i.test(src)) continue;
    const p = path.join(BASE, src);
    try { js += fs.readFileSync(p, 'utf8') + '\n'; } catch (e) {}
  } else {
    js += body + '\n';
  }
}

const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;

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

function makeAny() {
  const t = function () { return makeAny(); };
  const p = new Proxy(t, {
    get(o, prop) {
      if (prop === '_addedTo') return o._addedTo;
      if (prop === '__isLayerGroup') return o.__isLayerGroup;
      if (prop === 'addTo') return () => { o._addedTo = true; return p; };
      if (prop === 'hasLayer') return () => false;
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
function makeLeafletClass() {
  const cls = function () { return makeAny(); };
  return new Proxy(cls, {
    get(o, prop) {
      if (prop === 'extend') return () => makeLeafletClass();
      if (prop === 'hasLayer') return () => false;
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
js += '\n;window.__exp={APP,handleGPXUpload,renderItinerary,renderProgress,matchItineraryToActuals,buildItineraryFromSegments,saveItinerary,renderAllTracks,updateProgress,setItineraryStartDate,calculateSectionRanges};';

const ctx = dom.getInternalVMContext();
vm.runInContext(js, ctx, { filename: 'ght-inline.js' });

const exp = window.__exp;
const APP = exp.APP;

function gpx(name) { return fs.readFileSync(name, 'utf8'); }
function makeFile(content, name) { return new window.File([content], name, { type: 'application/gpx+xml' }); }
function upload(files, confs) {
  confirmQueue = confs.slice();
  const event = { target: { files, value: '' } };
  exp.handleGPXUpload(event);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── 模拟「浏览器刷新」：清空内存态 APP，按 init 顺序从 localStorage 重建 ──
function simulateReload() {
  const ls = window.localStorage;
  APP.itinerary = ls.getItem('ght_itinerary') ? JSON.parse(ls.getItem('ght_itinerary')) : [];
  APP.itineraryStartDate = ls.getItem('ght_itinerary_start') || null;
  APP.startPlaceName = ls.getItem('ght_start_place') || null;
  APP.presetTrack = ls.getItem('ght_preset') ? JSON.parse(ls.getItem('ght_preset')) : null;
  APP.presetRestDays = ls.getItem('ght_rest_days') ? JSON.parse(ls.getItem('ght_rest_days')) : [];
  APP.presetSegments = ls.getItem('ght_preset_segments') ? JSON.parse(ls.getItem('ght_preset_segments')) : null;
  APP.actualTracks = ls.getItem('ght_actual') ? JSON.parse(ls.getItem('ght_actual')) : [];
  if (APP.presetSegments && APP.presetSegments.length) {
    try {
      const rebuilt = exp.buildItineraryFromSegments(APP.presetSegments, APP.presetRestDays || []);
      if (rebuilt.length) { APP.itinerary = rebuilt; exp.saveItinerary(); }
    } catch (e) { console.warn('重建失败', e); }
  }
  try { exp.matchItineraryToActuals(); } catch (e) {}
  APP.currentPosition = ls.getItem('ght_current_pos') ? JSON.parse(ls.getItem('ght_current_pos')) : null;
  APP.totalDistance = ls.getItem('ght_total_distance') ? parseInt(ls.getItem('ght_total_distance')) : 0;
  if (!APP.presetTrack && (!APP.actualTracks || !APP.actualTracks.length)) APP.totalDistance = 0;
  APP.sectionRanges = ls.getItem('ght_sections') ? JSON.parse(ls.getItem('ght_sections')) : null;
  // 镜像真实 init：存在 presetTrack 时按当前（可能已抽稀的）轨迹重新计算路段范围，
  // 保证 startIndex/endIndex 与预设 trackPoints 对齐。
  if (APP.presetTrack) { try { APP.sectionRanges = exp.calculateSectionRanges(APP.presetTrack); } catch (e) {} }
  if (APP.itinerary.length && APP.actualTracks.length) { exp.matchItineraryToActuals(); exp.saveItinerary(); }
  exp.renderAllTracks(); // init 第3512行：重算进度/已完成距离/累计爬升
}

(async () => {
  const results = [];
  const check = (name, cond, extra) => results.push((cond ? 'PASS' : 'FAIL') + ' · ' + name + (extra ? '  [' + extra + ']' : ''));

  // ───── 场景 A：批量预设 → 单文件实际上传 → 设置日期 ─────
  const presetFiles = fs.readdirSync(DLD).filter(f => /^ghtday\d+-\d+\.gpx$/.test(f)).map(f => makeFile(gpx(DLD + f), f));
  console.log('场景A 预设文件数:', presetFiles.length);
  upload(presetFiles, [true]);
  await wait(6000);
  check('A·批量预设生成日程', APP.itinerary.length > 0, 'days=' + APP.itinerary.length);

  const actualA = ['actual-day01.gpx', 'actual-day06.gpx'];
  for (const f of actualA) {
    upload([makeFile(gpx(BASE + 'test-actual/' + f), f)], [true]);
    await wait(1200);
  }
  check('A·实际轨迹已记录', APP.actualTracks.length === 2, 'n=' + APP.actualTracks.length);
  const dayNums = APP.actualTracks.map(t => t.dayNum);
  check('A·实际轨迹含 dayNum', dayNums.includes(1) && dayNums.includes(6), JSON.stringify(dayNums));

  APP.activeTab = 'itinerary';
  exp.setItineraryStartDate('2026-11-01');
  await wait(300);

  let d1 = APP.itinerary.find(d => d.day === 1);
  let d6 = APP.itinerary.find(d => d.day === 6);
  check('A·【设置日期后·会话内】Day1 实际仍在', !!(d1 && d1.actual));
  check('A·【设置日期后·会话内】Day6 实际仍在', !!(d6 && d6.actual));
  let cmpHtml = exp.renderItinerary();
  check('A·行程HTML含GPS对比块(≥2)', (cmpHtml.match(/📡 实际/g) || []).length >= 2,
    'blocks=' + (cmpHtml.match(/📡 实际/g) || []).length);

  // ───── 场景 A 续：刷新后重新加载 ─────
  simulateReload();
  d1 = APP.itinerary.find(d => d.day === 1);
  d6 = APP.itinerary.find(d => d.day === 6);
  check('A·【刷新后】Day1 实际重新关联', !!(d1 && d1.actual), 'day1=' + (d1 && JSON.stringify(d1.actual && d1.actual.distance)));
  check('A·【刷新后】Day6 实际重新关联', !!(d6 && d6.actual), 'day6=' + (d6 && JSON.stringify(d6.actual && d6.actual.distance)));
  check('A·【刷新后】actualTracks 未丢失', APP.actualTracks.length === 2, 'n=' + APP.actualTracks.length);
  const progHtmlA = exp.renderProgress();
  check('A·【刷新后】进度面板渲染正常(含累计爬升)', progHtmlA && progHtmlA.includes('累计爬升'));
  check('A·【刷新后】已完成距离已重算', APP.completedDistance > 0, 'cd=' + (APP.completedDistance / 1000).toFixed(1) + 'km');

  // ───── 场景 B：批量预设 → 批量实际上传 → 设置日期 → 刷新 ─────
  for (const k in mem) delete mem[k];
  // 重置内存态
  Object.assign(APP, { presetTrack: null, presetSegments: null, actualTracks: [], itinerary: [], itineraryStartDate: null, presetRestDays: [] });
  upload(presetFiles, [true]);
  await wait(6000);
  const actualB = ['actual-day01.gpx', 'actual-day02.gpx', 'actual-day05.gpx', 'actual-day06.gpx'];
  upload(actualB.map(f => makeFile(gpx(BASE + 'test-actual/' + f), f)), [true]);
  await wait(1500);
  check('B·批量实际已记录(4)', APP.actualTracks.length === 4, 'n=' + APP.actualTracks.length);
  APP.activeTab = 'itinerary';
  exp.setItineraryStartDate('2026-11-01');
  await wait(300);
  check('B·【会话内】4天实际均在', [1, 2, 5, 6].every(n => APP.itinerary.find(d => d.day === n && d.actual)),
    JSON.stringify([1, 2, 5, 6].map(n => !!(APP.itinerary.find(d => d.day === n) || {}).actual)));

  simulateReload();
  check('B·【刷新后】4天实际重新关联', [1, 2, 5, 6].every(n => APP.itinerary.find(d => d.day === n && d.actual)),
    JSON.stringify([1, 2, 5, 6].map(n => !!(APP.itinerary.find(d => d.day === n) || {}).actual)));
  check('B·【刷新后】actualTracks 未丢失', APP.actualTracks.length === 4, 'n=' + APP.actualTracks.length);

  console.log('\n===== GHT「设置日期后实际统计」回归测试 =====');
  results.forEach(r => console.log(r));
  const failed = results.filter(r => r.startsWith('FAIL'));
  console.log('\n' + (failed.length ? ('❌ ' + failed.length + '/' + results.length + ' 项失败') : ('✅ 全部 ' + results.length + ' 项通过')));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('测试运行异常:', e); process.exit(2); });
