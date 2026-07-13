/* sections.html 冒烟测试：注入模拟 localStorage，验证分组/当前位置/筛选/空状态 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'sections.html'), 'utf8');
let pass = 0, fail = 0;
function check(name, cond){ if(cond){ pass++; console.log('  [PASS] '+name); } else { fail++; console.log('  [FAIL] '+name); } }

function makeDom(store){
  return new JSDOM(html, {
    url: 'https://ght.local/',
    runScripts: 'dangerously',
    beforeParse(w){
      Object.keys(store).forEach(k => w.localStorage.setItem(k, store[k]));
    }
  });
}

/* ── 测试 A：空状态（无预设、无 sectionRanges）── */
console.log('=== A. 空状态 ===');
{
  const dom = makeDom({});
  const d = dom.window.document;
  const list = d.getElementById('list').textContent;
  check('空状态提示出现', /尚未生成路段分段/.test(list));
  check('无分组标题', d.querySelectorAll('.group-head').length === 0);
}

/* ── 测试 B：完整数据 + 分组 + 进行中当前位置 ── */
console.log('=== B. 完整数据 ===');
const ranges = [];
for(let i=1;i<=10;i++) ranges.push({ parkName:'P'+i, parkNameEn:'P'+i, parkColor:'#FF6B6B', startIndex:0, endIndex:1, status:'upcoming' });
ranges[0].status = 'in-progress';   // 段1 进行中
ranges[1].status = 'completed';      // 段2 已完成
ranges[2].status = 'completed';      // 段3 已完成
// 段4 upcoming（默认）；其余 upcoming
const preset = { trackPoints: [
  {lat:27.35,lon:87.95},{lat:27.5,lon:87.8},{lat:27.65,lon:87.7},{lat:27.8,lon:87.6}
]};
const curPos = JSON.stringify({ lat:27.7, lon:87.66, elev:4500 });
const actuals = JSON.stringify([{ name:'ght-day01.gpx', dayNum:1, distance:12, trackPoints:[{lat:27.35,lon:87.95},{lat:27.8,lon:87.6}] }]);

{
  const dom = makeDom({
    ght_sections: JSON.stringify(ranges),
    ght_preset: JSON.stringify(preset),
    ght_current_pos: curPos,
    ght_actual: actuals
  });
  const w = dom.window, d = w.document;

  // 摘要
  const sum = d.getElementById('summary').textContent;
  check('摘要总段数=10', /总段数/.test(sum) && /10/.test(sum));
  check('摘要已完成=2', /已完成/.test(sum) && /2/.test(sum));
  check('摘要进行中=1', /进行中/.test(sum) && /\b1\b/.test(sum));

  // 分组顺序：第一个 group-head 是「进行中」
  const heads = [...d.querySelectorAll('.group-head')];
  check('分组数=3（进行中/已完成/未完成）', heads.length === 3);
  check('首个分组为「进行中」', heads[0].textContent.includes('进行中'));
  check('次个分组为「已完成」', heads[1].textContent.includes('已完成'));
  check('末个分组为「未完成」', heads[2].textContent.includes('未完成'));
  check('进行中组计数=1', heads[0].textContent.includes('1 段'));
  check('已完成组计数=2', heads[1].textContent.includes('2 段'));

  // 卡片
  const cards = d.querySelectorAll('.day-card');
  check('卡片总数=10', cards.length === 10);
  const inprogCard = d.querySelector('.day-card.is-inprog');
  check('存在进行中高亮卡片', !!inprogCard);
  check('进行中卡片 data-status=in-progress', inprogCard && inprogCard.getAttribute('data-status')==='in-progress');
  check('进行中 chip 文案', /进行中/.test(inprogCard.textContent));

  // 进行中：当前位置面板 + 迷你轨迹 + 脉冲
  check('进行中卡片含「当前位置」面板', /当前位置/.test(inprogCard.textContent));
  check('进行中卡片含 mini-track SVG', !!inprogCard.querySelector('.mini-track'));
  check('进行中卡片含脉冲 circle(<animate>)', !!inprogCard.querySelector('.mini-track animate'));
  check('坐标显示当前 lat 27.700', /27\.700°N/.test(inprogCard.textContent));
  check('海拔显示 4,500m', /4,500m/.test(inprogCard.textContent));

  // 段色左边框
  check('卡片左边框为段色', inprogCard.getAttribute('style').includes('border-left-color'));

  // 已完成 chip
  const doneCard = [...cards].find(c=>c.getAttribute('data-status')==='completed');
  check('已完成 chip 文案', doneCard && /已完成/.test(doneCard.textContent));
  check('已完成卡片无当前位置面板', doneCard && !/当前位置/.test(doneCard.textContent));

  // 未完成 chip
  const waitCard = [...cards].find(c=>c.getAttribute('data-status')==='upcoming');
  check('未完成 chip 文案', waitCard && /未完成/.test(waitCard.textContent));

  // 状态筛选：completed
  const segStatus = d.getElementById('segStatus');
  const btnDone = [...segStatus.children].find(b=>b.dataset.status==='completed');
  btnDone.dispatchEvent(new w.Event('click', { bubbles:true }));
  const headsAfter = [...d.querySelectorAll('.group-head')];
  check('筛 completed → 仅「已完成」组', headsAfter.length===1 && headsAfter[0].textContent.includes('已完成'));
  check('筛 completed → 卡片数=2', d.querySelectorAll('.day-card').length===2);
  // 还原
  const btnAll = [...segStatus.children].find(b=>b.dataset.status==='all');
  btnAll.dispatchEvent(new w.Event('click', { bubbles:true }));

  // 省份筛选：sudurpashchim（仅段10，upcoming）
  const sel = d.getElementById('selProvince');
  sel.value = 'sudurpashchim';
  sel.dispatchEvent(new w.Event('change', { bubbles:true }));
  const headsProv = [...d.querySelectorAll('.group-head')];
  check('筛 sudurpashchim → 仅「未完成」组(段10)', headsProv.length===1 && headsProv[0].textContent.includes('未完成'));
  check('筛 sudurpashchim → 卡片数=1', d.querySelectorAll('.day-card').length===1);
}

/* ── 测试 C：当前位置回退（无 ght_current_pos，用 ght_actual 末点）── */
console.log('=== C. 当前位置回退 ===');
{
  const rangesC = JSON.parse(JSON.stringify(ranges));
  const actualsC = JSON.stringify([{ name:'ght-day01.gpx', dayNum:1, distance:12, trackPoints:[{lat:27.35,lon:87.95},{lat:28.1,lon:86.0}] }]);
  const dom = makeDom({
    ght_sections: JSON.stringify(rangesC),
    ght_preset: JSON.stringify(preset),
    ght_actual: actualsC   // 无 ght_current_pos
  });
  const d = dom.window.document;
  const inprog = d.querySelector('.day-card.is-inprog');
  check('无 current_pos 时回退到 actual 末点坐标', /28\.100°N/.test(inprog.textContent));
}

console.log(`\n${fail===0?'✅ ALL SMOKE CHECKS PASSED':'❌ SOME CHECKS FAILED'}  (pass=${pass}, fail=${fail})`);
process.exit(fail===0?0:1);
