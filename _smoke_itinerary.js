const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync(__dirname + '/itinerary.html', 'utf8');

const planned = [
  { day:1, sectionId:1, from:'Taplejung', to:'Sekathum', plannedDistance:14.2, plannedElevGain:820, plannedElevLoss:240, passes:['Sekathum 吊桥'] },
  { day:2, sectionId:1, from:'Sekathum', to:'Amjilosa', plannedDistance:16.5, plannedElevGain:1100, plannedElevLoss:300 },
  { day:3, sectionId:2, from:'Amjilosa', to:'Ghyapla', plannedDistance:12.0, plannedElevGain:950, plannedElevLoss:400, isRestDay:false },
  { day:4, sectionId:2, from:'Ghyapla', to:'Tseram', plannedDistance:18.3, plannedElevGain:1300, plannedElevLoss:500, weatherDelay:true },
];

const actuals = [
  { name:'ght-day01.gpx', dayNum:1, distance:14.9, elevGain:860, elevLoss:250, date:'2026-11-01',
    durationStr:'6h12m', avgSpeed:2.4, trackPoints:[{lat:27.37,lon:87.75},{lat:27.38,lon:87.76}] },
  { name:'ght-day03.gpx', dayNum:3, distance:11.1, elevGain:900, elevLoss:380, date:'2026-10-31',
    durationStr:'5h40m', avgSpeed:1.9, trackPoints:[{lat:27.68,lon:87.78},{lat:27.69,lon:87.79}] },
];

const preset = { waypoints:[
  { lat:27.370, lon:87.750, desc:'Taplejung 起点', _type:'camp' },
  { lat:27.380, lon:87.760, desc:'Sekathum 营地', _type:'camp' },
  { lat:27.690, lon:87.790, desc:'Ghyapla 营地', _type:'camp' },
]};

const store = {
  ght_itinerary: JSON.stringify(planned),
  ght_actual: JSON.stringify(actuals),
  ght_itinerary_start: '2026-11-01',
  ght_preset: JSON.stringify(preset),
};

const checks = [];
function check(name, cond){ checks.push([name, !!cond]); }

const dom = new JSDOM(html, {
  url: 'https://ght.local/',
  runScripts: 'dangerously',
  beforeParse(window){
    Object.keys(store).forEach(k => window.localStorage.setItem(k, store[k]));
  }
});

const w = dom.window, d = w.document;
const cards = d.querySelectorAll('.day-card');
check('渲染出 4 张日程卡片', cards.length === 4);
check('摘要条有统计块', d.querySelectorAll('.summary .stat').length >= 7);
check('Day 1 卡片存在', /Day 1/.test(d.body.textContent));
check('Day 4(天气延误) 显示延误 chip', /延误/.test(cards[3].textContent));
check('Day 1 实际=按计划(on-track, 同日期)', /按计划/.test(cards[0].textContent));
check('Day 3 实际超前(10-31 早于 11-03)', /超前/.test(cards[2].textContent));
check('有实际数据的卡片含对比条 cmp', cards[0].querySelector('.cmp') && cards[2].querySelector('.cmp'));
check('对比条含计划/实际双 bar', cards[0].querySelectorAll('.bar-fill').length === 2);
check('Day 4 无实际→无对比条', !cards[3].querySelector('.cmp'));
check('实际路线起点用最近营地标注(Taplejung)', /Taplejung/.test(cards[0].textContent));
check('显示差值标签', /差值/.test(d.body.textContent));
check('筛选/排序工具栏存在', d.getElementById('segSort') && d.getElementById('segFilter'));
check('顶部返回地图链接', /返回地图/.test(d.body.textContent));

// 测试空状态
const dom2 = new JSDOM(html, {
  url: 'https://ght.local/',
  runScripts: 'dangerously',
  beforeParse(window){ window.localStorage.setItem('ght_itinerary', JSON.stringify([])); }
});
check('空行程→显示空状态', /尚未生成行程安排/.test(dom2.window.document.body.textContent));

// 测试筛选交互：点击「已记录」
const segF = d.getElementById('segFilter');
const doneBtn = [...segF.children].find(b => b.dataset.filter === 'done');
doneBtn.dispatchEvent(new w.Event('click', { bubbles:true }));
const afterFilter = d.querySelectorAll('.day-card').length;
check('筛选「已记录」→ 只剩 2 张(day1,day3)', afterFilter === 2);

// 测试排序切换为降序（先复位筛选为「全部」）
const allBtn = [...segF.children].find(b => b.dataset.filter === 'all');
allBtn.dispatchEvent(new w.Event('click', { bubbles:true }));
const segS = d.getElementById('segSort');
const descBtn = [...segS.children].find(b => b.dataset.sort === 'desc');
descBtn.dispatchEvent(new w.Event('click', { bubbles:true }));
const firstCardDay = d.querySelector('.day-card').getAttribute('data-day');
check('筛选复位+排序降序→首张卡片为 Day 4', firstCardDay === '4');

let pass = 0;
checks.forEach(([n,ok]) => { console.log((ok?'✅':'❌') + ' ' + n); if(ok) pass++; });
console.log(`\n${pass}/${checks.length} passed`);
process.exit(pass === checks.length ? 0 : 1);
