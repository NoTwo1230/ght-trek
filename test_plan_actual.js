const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('/Users/nt/.workbuddy/binaries/node/workspace/node_modules/jsdom');

const BASE = '/Users/nt/WorkBuddy/2026-07-01-10-23-33/ght-trek/';
const html = fs.readFileSync(BASE + 'index.html', 'utf8');
const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
let js = '';
for (const tag of scriptTags) {
  const attrs = tag[1]; const body = tag[2];
  const srcMatch = attrs.match(/src=["']([^"']+)["']/);
  if (srcMatch) {
    const src = srcMatch[1];
    if (/^https?:/i.test(src)) continue;
    try { js += fs.readFileSync(path.join(BASE, src), 'utf8') + '\n'; } catch (e) {}
  } else { js += body + '\n'; }
}
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
const mem = {};
window.localStorage = { getItem:k=>(k in mem?mem[k]:null), setItem:(k,v)=>{mem[k]=String(v);}, removeItem:k=>{delete mem[k];}, clear:()=>{for(const k in mem)delete mem[k];}, key:i=>Object.keys(mem)[i]||null, get length(){return Object.keys(mem).length;} };
window.alert = () => {}; window.confirm = () => true; window.setTimeout = setTimeout; window.Promise = Promise;
function makeAny(){const t=function(){return makeAny();};const p=new Proxy(t,{get(o,prop){if(prop==='_addedTo')return o._addedTo;if(prop==='__isLayerGroup')return o.__isLayerGroup;if(prop==='addTo')return()=>{o._addedTo=true;return p;};if(prop==='hasLayer')return()=>false;if(prop==='getCenter'||prop==='getBounds'||prop==='getNorthEast'||prop==='getSouthWest'||prop==='getLatLng')return()=>p;if(prop==='isValid')return()=>true;if(prop==='lat'||prop==='lng'||prop==='alt')return 0;if(prop==='length')return 0;if(prop===Symbol.toPrimitive)return()=>0;return(...a)=>p;},set(o,prop,val){if(prop==='_addedTo')o._addedTo=val;if(prop==='__isLayerGroup')o.__isLayerGroup=val;return true;}});return p;}
function makeLeafletClass(){return new Proxy(function(){return makeAny();},{get(o,prop){if(prop==='extend')return()=>makeLeafletClass();if(prop==='hasLayer')return()=>false;return makeAny();}});}
function makeL(){return new Proxy(function(){},{get(o,prop){if(prop==='layerGroup')return()=>{const l=makeAny();l.__isLayerGroup=true;return l;};if(prop==='version')return'1.9';return makeLeafletClass();}});}
window.L = makeL();
js += '\n;window.__exp={APP,renderItinerary,renderProgress,matchItineraryToActuals,getPlannedDate,nearestWaypointLabel,fmtCoordLabel,saveItinerary};';
const ctx = dom.getInternalVMContext();
vm.runInContext(js, ctx, { filename: 'ght-inline.js' });
const exp = window.__exp, APP = exp.APP;

// ── 构造与用户真实场景一致的数据：Day3 休息/天气 → 整体晚1天；Day3 只走了一部分 ──
const LAT = 27.0;
const P = {
  Phungling:[LAT,85.00], Kunjari:[LAT,85.10], Yamphudin:[LAT,85.20],
  Tortongdin:[LAT,85.30], Tseram:[LAT,85.40], Ramche:[LAT,85.50], Ghunsa:[LAT,85.60]
};
const wpt = (name,lon)=>({lat:LAT,lon,name,desc:name,_type:'camp'});
APP.allWpts = [
  wpt('Phungling',85.00), wpt('Kunjari',85.10), wpt('Yamphudin',85.20),
  wpt('Tortongdin',85.30), wpt('Tseram',85.40), wpt('Ramche',85.50), wpt('Ghunsa',85.60)
];
APP.itineraryStartDate = '2026-11-01';
const seg = (d, from, to, dist) => {
  const [fl, fon] = P[from], [tl, ton] = P[to];
  return { day:d, sectionId:1, sectionName:'测试段', from, to, fromLat:fl, fromLon:fon, toLat:tl, toLon:ton,
    plannedDistance: dist, plannedElevGain:1000, plannedElevLoss:800,
    plannedHours:5, passes:[], actual:null, isRestDay:false, weatherDelay:false };
};
APP.itinerary = [
  seg(1,'Phungling','Kunjari',10), seg(2,'Kunjari','Yamphudin',10), seg(3,'Yamphudin','Tortongdin',13),
  seg(4,'Tortongdin','Tseram',9), seg(5,'Tseram','Ramche',14), seg(6,'Ramche','Ghunsa',22)
];
const trk = (dayNum, from, to, date, endLon, dist) => {
  const [fl,fon]=P[from]; const el = endLon!=null ? endLon : P[to][1];
  return { name:'actual-day'+String(dayNum).padStart(2,'0')+'.gpx', dayNum, date,
    distance: dist, elevGain:1000, elevLoss:800,
    durationStr:'5h', avgSpeed:2, startTime:new Date(date+'T08:45').toISOString(), endTime:new Date(date+'T14:00').toISOString(),
    trackPoints:[{lat:fl,lon:fon,ele:1000},{lat:LAT,lon:el,ele:1200}] };
};
APP.actualTracks = [
  trk(1,'Phungling','Kunjari','2026-11-01',null,21),
  trk(2,'Kunjari','Yamphudin','2026-11-02',null,20),
  trk(3,'Yamphudin','Tortongdin','2026-11-04',85.22,4.5),  // 只走到 85.22(距Yamphudin近) → 终点映射Yamphudin≠Tortongdin
  trk(4,'Tortongdin','Tseram','2026-11-04',null,8.7),
  trk(5,'Tseram','Ramche','2026-11-06',null,14),
  trk(6,'Ramche','Ghunsa','2026-11-07',null,22)
];

exp.matchItineraryToActuals();
const itin = exp.renderItinerary();

// ── 断言 ──
const results = [];
const check = (name, cond) => results.push((cond?'PASS':'FAIL')+' · '+name);

check('渲染含「📋 计划」栏', itin.includes('📋 计划'));
check('渲染含「📡 实际」栏', itin.includes('📡 实际'));
check('渲染含「📍 起点」', itin.includes('📍 起点'));
check('渲染含「📍 终点」', itin.includes('📍 终点'));
check('实际起点映射到地名(Yamphudin)', itin.includes('Yamphudin'));
check('Day3 实际终点≠计划终点 → 红色提醒', itin.includes('实际终点≠计划终点'));
check('整体滑移 = 晚1天 (APP._overallSlip=1)', APP._overallSlip === 1);
check('Day3 onTrack=behind (11-04 vs 11-03)', APP.itinerary[2].actual && APP.itinerary[2].actual.onTrack === 'behind');
check('Day4 onTrack=on-track (11-04 vs 11-04)', APP.itinerary[3].actual && APP.itinerary[3].actual.onTrack === 'on-track');
check('未触发旧的补走/超前徽章(_makeup)', !itin.includes('补走'));
check('未触发旧的超前走完徽章(_overshoot)', !itin.includes('超前走完'));
const progress = exp.renderProgress();
check('进度面板无异常', typeof progress === 'string' && progress.length > 0);
check('进度面板含整体滑移提示', progress.includes('整体') && progress.includes('晚'));

const pass = results.filter(r=>r.startsWith('PASS')).length;
console.log(results.join('\n'));
console.log('\n结果: '+pass+'/'+results.length+' 通过');
process.exit(pass===results.length?0:1);
