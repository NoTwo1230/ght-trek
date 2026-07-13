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
js += '\n;window.__exp={APP,handleGPXUpload,showSectionWaypoints,waypointLayer,uploadedTrackGroup,getItineraryDate,matchItineraryToActuals,applySegmentItinerary};';

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

  check('初始无预设轨迹', APP.presetTrack === null);

  // ── 场景 A：先导入 GHT-merged 作为预设（含 78 个标注点）──
  upload([makeFile(gpx('GHT-merged.gpx'), 'GHT-merged.gpx')], [true]);
  await wait(1200);

  const preset = {
    sections: APP.sectionRanges ? APP.sectionRanges.length : 0,
    total: APP.totalDistance,
    wp: APP.presetTrack ? APP.presetTrack.waypoints.length : 0
  };
  check('预设导入成功(路线+分段+标注点)', !!APP.presetTrack && preset.sections > 0 && preset.total > 0 && preset.wp > 0,
        'sections=' + preset.sections + ' total=' + preset.total + ' waypoints=' + preset.wp);
  // Bug3: 标注点默认不加载
  check('Bug3·标注点默认不加载(waypointLayer 未 addTo)', exp.waypointLayer._addedTo === undefined || exp.waypointLayer._addedTo === null,
        'wpLayer._addedTo=' + exp.waypointLayer._addedTo);
  // 对照: 轨迹层默认加载
  check('对照·轨迹层默认加载(uploadedTrackGroup 已 addTo)', exp.uploadedTrackGroup._addedTo === true,
        'upLayer._addedTo=' + exp.uploadedTrackGroup._addedTo);

  // ── 场景 A：再导入 actual-day06 作为实际轨迹（尼泊尔 2026-11-07）──
  upload([makeFile(gpx('test-actual/actual-day06.gpx'), 'actual-day06.gpx')], [true]);
  await wait(800);

  check('实际轨迹已记录', APP.actualTracks.length === 1, 'actualTracks=' + APP.actualTracks.length);
  // Bug1: 分段数不被实际覆盖（路段详情依赖它）
  check('Bug1·路段分段数未被实际覆盖', APP.sectionRanges.length === preset.sections,
        'before=' + preset.sections + ' after=' + APP.sectionRanges.length);
  // Bug1: 总距离不被实际覆盖
  check('Bug1·总距离未被实际覆盖', APP.totalDistance === preset.total,
        'before=' + preset.total + ' after=' + APP.totalDistance);
  // Bug1: 标注点数量(来自预设)不被实际覆盖
  check('Bug1·标注点数据未被实际覆盖', APP.presetTrack.waypoints.length === preset.wp,
        'before=' + preset.wp + ' after=' + APP.presetTrack.waypoints.length);
  // Bug3: 上传实际后仍不自动加载标注点
  check('Bug3·上传实际后标注点仍未自动加载', exp.waypointLayer._addedTo === undefined || exp.waypointLayer._addedTo === null,
        'wpLayer._addedTo=' + exp.waypointLayer._addedTo);
  // 实际轨迹的 GPS 日期被正确保留（用于对比，而非覆盖计划）
  const a0 = APP.actualTracks[0];
  check('实际轨迹尼泊尔GPS日期保留(=2026-11-07)', a0.date === '2026-11-07', 'date=' + a0.date);

  // ── 路段详情交互：点开某路段才显示该段标注点 ──
  let targetSec = null, targetCount = 0;
  if (APP.presetTrack && APP.presetTrack.waypoints) {
    const cnt = {};
    APP.presetTrack.waypoints.forEach(w => { if (w._sectionId) cnt[w._sectionId] = (cnt[w._sectionId] || 0) + 1; });
    let best = null, bc = 0;
    for (const k in cnt) if (cnt[k] > bc) { bc = cnt[k]; best = Number(k); }
    targetSec = best; targetCount = bc;
  }
  check('存在带标注点的路段(用于详情测试)', !!targetSec, 'sec=' + targetSec + ' count=' + targetCount);
  if (targetSec) {
    const sampleWp = APP.presetTrack.waypoints.find(w => w._sectionId !== undefined && w._sectionId !== 0);
    const matchCount = APP.presetTrack.waypoints.filter(w => w._sectionId === targetSec).length;
    console.log('DEBUG targetSec=', targetSec, 'typeof=', typeof targetSec,
                '| sample._sectionId=', sampleWp && sampleWp._sectionId, 'typeof=', typeof (sampleWp && sampleWp._sectionId),
                '| matchCount=', matchCount,
                '| wpLayer._addedTo BEFORE=', exp.waypointLayer._addedTo);
    let threw = false;
    try { exp.showSectionWaypoints(targetSec); } catch (e) { threw = true; results.push('FAIL · 路段详情交互抛错 [' + e.message + ']'); }
    console.log('DEBUG wpLayer._addedTo AFTER=', exp.waypointLayer._addedTo);
    check('路段详情交互不崩溃', !threw);
    check('Bug3·点开路段后标注点层才 addTo', exp.waypointLayer._addedTo === true,
          'before=未加载 after=' + exp.waypointLayer._addedTo);
  }

  console.log('\n===== GHT 端到端上传流程测试结果 =====');
  results.forEach(r => console.log(r));
  const failed = results.filter(r => r.startsWith('FAIL'));
  console.log('\n' + (failed.length ? ('❌ ' + failed.length + '/' + results.length + ' 项失败') : ('✅ 全部 ' + results.length + ' 项通过')));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('测试运行异常:', e); process.exit(2); });
