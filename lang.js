/* ════════════════════════════════════════════════════════════
   GHT 共享多语言引擎（中文 / English）
   - 任何页面只需 <script src="lang.js"></script> 并在导航里放一个
     <button class="lang-btn">中文 ▾</button>，即可获得中/英切换。
   - 静态文案：在元素上加 data-i18n="key"（文本）/ data-i18n-ph / data-i18n-title。
   - 动态渲染的文案：在页面脚本里用 window.GHTI18N.t('key')，
     并定义 window.onLangChange = fn 以便在切换语言时重渲染。
   - 选择持久化到 localStorage('ght_lang')，跨页面保持一致。
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  let currentLang = 'zh';
  try { currentLang = localStorage.getItem('ght_lang') || 'zh'; } catch (e) {}

  const I18N = {
    zh: {
      'brand.sub': '大喜马拉雅高线',
      'back.map': '🗺️ 返回地图',
      'back.home': '← 回主页',
      'back.main': '← 返回主站',
      'lang.btn': '中文 ▾',

      /* itinerary.html */
      'it.title': '行程日历',
      'it.sub': '计划 vs 实际徒步对比',
      'it.basis': '位置基准',
      'it.plan': '📋 计划日期',
      'it.actual': '📡 实际日期',
      'it.filter': '筛选',
      'it.all': '全部',
      'it.done': '已记录',
      'it.todo': '未记录',
      'it.prev': '上一月',
      'it.next': '下一月',
      'it.help': '请先在地图追踪页导入预设轨迹，或上传实际徒步 GPS 文件。',
      'it.legend.plan': '按计划',
      'it.legend.ahead': '超前',
      'it.legend.behind': '落后',
      'it.legend.wait': '等待 GPS',
      'it.legend.rest': '休息日',
      'it.legend.delay': '延误',
      'it.delay.weather': '☁️ 天气延误', 'it.delay.injured': '🩹 受伤', 'it.delay.tired': '😴 疲惫', 'it.delay.other': '⚠️ 延误',
      'it.legend.bar': '左条色 = 所属 13 区域',
      'st.ontrack': '按计划',
      'st.ahead': '超前',
      'st.behind': '落后',
      'st.wait': '等待 GPS',
      'st.rest': '休息',
      'st.delay': '延误',
      'it.sum.total': '📅 总行程(天)',
      'it.sum.recorded': '📡 已记录轨迹',
      'it.sum.planned': '📏 计划总距离',
      'it.sum.actual': '✅ 实际已完成',
      'it.sum.ahead': '🟢 超前天数',
      'it.sum.ontrack': '🔵 按计划',
      'it.sum.behind': '🔴 落后天数',
      'it.slip.late': '⚠️ 行程整体晚 {n} 天（实际 GPS 日期相对计划日期的整体偏移）',
      'it.slip.early': '⚠️ 行程整体快 {n} 天（实际 GPS 日期相对计划日期的整体偏移）',
      'it.drawer.plan': '📋 计划',
      'it.drawer.route': '路线',
      'it.drawer.dist': '距离',
      'it.drawer.asc': '爬升',
      'it.drawer.desc': '下降',
      'it.drawer.passes': '⛰ 垭口：',
      'it.drawer.rest': '🏕️ 休息日',
      'it.drawer.delay': '☁️ 延误',
      'it.drawer.actual': '📡 实际',
      'it.drawer.date': '日期',
      'it.drawer.from': '出发',
      'it.drawer.to': '到达',
      'it.drawer.dist2': '距离',
      'it.drawer.asc2': '爬升',
      'it.drawer.desc2': '下降',
      'it.drawer.dur': '移动',
      'it.drawer.speed': '均速',
      'it.drawer.file': '文件',
      'it.count': '本页显示 {v} 天 · 共 {t} 天',
      'it.span': '行程跨度：{f} → {l}',
      'it.pending.rest': '🏕️ 休息 · 未行进',
      'it.pending.delay': '☁️ 延误 · 未行进',
      'it.pending.wait': '⏳ 等待 GPS 轨迹上传',
      'it.cmp.lbl': '距离对比（计划 vs 实际）',
      'it.cmp.plan': '计划',
      'it.cmp.actual': '实际',
      'it.mismatch': '⚠️ 实际终点≠计划终点（只走了一部分/路线有偏差）',
      'it.empty.h': '尚未生成行程安排',
      'it.empty.p': '行程会根据真实的预设轨迹（GPX 分段）自动生成。请先在地图追踪页导入预设轨迹，或上传实际徒步 GPS 文件。本页读取与地图页相同的本地数据，不会凭空生成占位计划。',
      'it.foot': '数据来源：本浏览器本地存储（与地图页共享）。{date} 在地图页上传/编辑后，刷新本页即可同步。',
      'it.foot.date': ' 出发日期：{d}。',
      'it.foot.nodate': ' 未设置出发日期（日程日期显示为「—」）。',

      /* sections.html */
      'sec.title': 'GHT 路段全景',
      'sec.sub': '13 段区域徒步指南',
      'sec.banner': 'GHT 大喜马拉雅高线 · 13 段 区域徒步',
      'sec.banner2': '从东端的干城章嘉到西陲的达尔楚拉，整条高线穿越 13 个尼泊尔区域。横屏滑动浏览每段区域地图与名称，悬停即可居中放大，点击「查看大图」进入含全部徒步数据的详情页。',
      'sec.filter.all': '全部 13',
      'sec.filter.meas': '完成',
      'sec.filter.plan': '计划',
      'sec.legend.meas': '完成 · 来自轨迹',
      'sec.legend.plan': '计划 · 参考里程',
      'sec.cover': '🗺️ 路段全景',
      'sec.cover2': '悬停切换 · 点击「查看大图」看完整数据',
      'sec.view': '查看大图 ↗',
      'sec.detail.dist': '距离',
      'sec.detail.asc': '累计爬升',
      'sec.detail.desc': '累计下降',
      'sec.detail.max': '最高海拔',
      'sec.detail.min': '最低海拔',
      'sec.detail.passes': '🏔️ 主要垭口 / 山峰',
      'sec.detail.legend': '📜 区域传说',
      'sec.detail.scenery': '🌄 招牌景色',
      'sec.detail.hint': '点击左侧地图可放大查看原图',
      'sec.status.meas': '完成 · 来自轨迹',
      'sec.status.plan': '计划 · 参考里程',
      'sec.badge.meas': '完成',
      'sec.badge.plan': '计划',
      'sec.ref': ' · 参考',
      'sec.nopass': '暂无高垭口',
      'sec.note.loading': '数据说明：加载中…',
      'sec.note.all': '数据说明：全部 <b>{n} 段</b>的距离 / 爬升 / 下降 / 垭口均来自已导入的<b>预设路线</b>（计划 / 参考里程，约 {km} km）。实际徒步轨迹将在 11 月出发后逐段上传，届时自动更新为实测值。',
      'sec.note.part': '数据说明：已实测 <b>{m} 段</b>（约 {mk} km）的距离 / 爬升 / 下降 / 垭口来自<b>已上传的实测轨迹</b>；其余 <b>{p} 段</b>为 <b>计划 / 参考</b>里程（约 {pk} km），待轨迹上传后将自动更新为实测值。',

      /* journal.html */
      'jo.title': '📝 远征日志',
      'jo.en': 'JOURNAL · 时间线 · 最新在前',
      'jo.sub': '从 Phungling 到 Darchula 的全程纪实。沿途随笔按时间倒序排列，最新发布在最上方。山里信号不稳，只发文字、不传照片。',
      'jo.total': '总日志',
      'jo.dist': '已记录里程',
      'jo.gain': '累计爬升',
      'jo.sec': '覆盖路段',
      'jo.f.all': '全部',
      'jo.f.text': '✍️ 手写随笔',
      'jo.f.newest': '最新在前',
      'jo.back': '← 回主页',
      'jo.empty': '暂无日志。<br>主人可在此页面发布随笔。',
      'jo.unlock.label': '🔒 主人解锁后可发布日志（输入与主页相同的主人密码）',
      'jo.unlock.pwd': '密码',
      'jo.unlock.btn': '解锁',
      'jo.unlock.err': '密码错误',
      'jo.composer.ph': '记点什么…（山里信号不稳，先记着）',
      'jo.composer.btn': '发布'
    },
    en: {
      'brand.sub': 'GREAT HIMALAYA TRAIL',
      'back.map': '🗺️ Back to map',
      'back.home': '← Back home',
      'back.main': '← Back to main site',
      'lang.btn': 'EN ▾',

      'it.title': 'Itinerary Calendar',
      'it.sub': 'Planned vs actual trek',
      'it.basis': 'Reference basis',
      'it.plan': '📋 Planned dates',
      'it.actual': '📡 Actual dates',
      'it.filter': 'Filter',
      'it.all': 'All',
      'it.done': 'Recorded',
      'it.todo': 'Not recorded',
      'it.prev': 'Prev month',
      'it.next': 'Next month',
      'it.help': 'Please import the preset track on the map tracking page first, or upload actual GPS track files.',
      'it.legend.plan': 'On plan',
      'it.legend.ahead': 'Ahead',
      'it.legend.behind': 'Behind',
      'it.legend.wait': 'Waiting GPS',
      'it.legend.rest': 'Rest day',
      'it.legend.delay': 'Delayed',
      'it.delay.weather': '☁️ Weather delay', 'it.delay.injured': '🩹 Injury', 'it.delay.tired': '😴 Fatigue', 'it.delay.other': '⚠️ Delayed',
      'it.legend.bar': 'Left bar = 13 regions',
      'st.ontrack': 'On plan',
      'st.ahead': 'Ahead',
      'st.behind': 'Behind',
      'st.wait': 'Waiting GPS',
      'st.rest': 'Rest',
      'st.delay': 'Delay',
      'it.sum.total': '📅 Total days',
      'it.sum.recorded': '📡 Tracked',
      'it.sum.planned': '📏 Planned dist',
      'it.sum.actual': '✅ Completed',
      'it.sum.ahead': '🟢 Ahead days',
      'it.sum.ontrack': '🔵 On plan',
      'it.sum.behind': '🔴 Behind days',
      'it.slip.late': '⚠️ Trip is {n} days behind overall (offset of actual GPS dates vs planned dates)',
      'it.slip.early': '⚠️ Trip is {n} days ahead overall (offset of actual GPS dates vs planned dates)',
      'it.drawer.plan': '📋 Plan',
      'it.drawer.route': 'Route',
      'it.drawer.dist': 'Distance',
      'it.drawer.asc': 'Ascent',
      'it.drawer.desc': 'Descent',
      'it.drawer.passes': '⛰ Passes: ',
      'it.drawer.rest': '🏕️ Rest day',
      'it.drawer.delay': '☁️ Delayed',
      'it.drawer.actual': '📡 Actual',
      'it.drawer.date': 'Date',
      'it.drawer.from': 'From',
      'it.drawer.to': 'To',
      'it.drawer.dist2': 'Dist',
      'it.drawer.asc2': 'Ascent',
      'it.drawer.desc2': 'Descent',
      'it.drawer.dur': 'Moving',
      'it.drawer.speed': 'Avg',
      'it.drawer.file': 'File',
      'it.count': 'Showing {v} days · total {t} days',
      'it.span': 'Trip span: {f} → {l}',
      'it.pending.rest': '🏕️ Rest · no progress',
      'it.pending.delay': '☁️ Delayed · no progress',
      'it.pending.wait': '⏳ Waiting for GPS track upload',
      'it.cmp.lbl': 'Distance comparison (plan vs actual)',
      'it.cmp.plan': 'Plan',
      'it.cmp.actual': 'Actual',
      'it.mismatch': '⚠️ Actual end ≠ planned end (partial route / deviation)',
      'it.empty.h': 'No itinerary yet',
      'it.empty.p': 'The itinerary is auto-generated from the real preset track (GPX segments). Please import the preset track on the map tracking page first, or upload actual GPS track files. This page reads the same local data as the map page and does not fabricate placeholder plans.',
      'it.foot': 'Data source: this browser’s local storage (shared with the map page).{date} After uploading/editing on the map page, refresh to sync.',
      'it.foot.date': ' Start date: {d}.',
      'it.foot.nodate': ' No start date set (dates show “—”).',

      'sec.title': 'GHT Section Panorama',
      'sec.sub': '13 regional trekking guides',
      'sec.banner': 'GHT Great Himalaya Trail · 13 regional treks',
      'sec.banner2': 'From Kanchenjunga in the east to Darchula in the far west, the trail crosses 13 Nepali regions. Swipe sideways to browse each region map and name; hover to zoom, click "View large" for the full data detail page.',
      'sec.filter.all': 'All 13',
      'sec.filter.meas': 'Done',
      'sec.filter.plan': 'Plan',
      'sec.legend.meas': 'Done · from track',
      'sec.legend.plan': 'Plan · reference',
      'sec.cover': '🗺️ Section panorama',
      'sec.cover2': 'Hover to switch · click "View large" for full data',
      'sec.view': 'View large ↗',
      'sec.detail.dist': 'Distance',
      'sec.detail.asc': 'Total ascent',
      'sec.detail.desc': 'Total descent',
      'sec.detail.max': 'Max elev',
      'sec.detail.min': 'Min elev',
      'sec.detail.passes': '🏔️ Main passes / peaks',
      'sec.detail.legend': '📜 Region legend',
      'sec.detail.scenery': '🌄 Signature scenery',
      'sec.detail.hint': 'Click the map on the left to zoom in',
      'sec.status.meas': 'Done · from track',
      'sec.status.plan': 'Plan · reference',
      'sec.badge.meas': 'Done',
      'sec.badge.plan': 'Plan',
      'sec.ref': ' · est.',
      'sec.nopass': 'No high passes',
      'sec.note.loading': 'Data note: loading…',
      'sec.note.all': 'Data note: all <b>{n}</b> sections’ distance / ascent / descent / passes come from the imported <b>preset route</b> (planned / reference, ~{km} km). Actual GPS tracks will be uploaded section by section after the November departure and auto-updated to measured values.',
      'sec.note.part': 'Data note: <b>{m}</b> sections (~{mk} km) have measured distance / ascent / descent / passes from <b>uploaded GPS tracks</b>; the other <b>{p}</b> sections remain <b>plan / reference</b> (~{pk} km) and will auto-update once tracks are uploaded.',

      'jo.title': '📝 Expedition Journal',
      'jo.en': 'JOURNAL · Timeline · Newest first',
      'jo.sub': 'A full record from Phungling to Darchula. Notes are listed newest-first. Signal is unstable in the mountains — text only, no photos.',
      'jo.total': 'Total logs',
      'jo.dist': 'Distance logged',
      'jo.gain': 'Total ascent',
      'jo.sec': 'Sections covered',
      'jo.f.all': 'All',
      'jo.f.text': '✍️ Journal notes',
      'jo.f.newest': 'Newest first',
      'jo.back': '← Back home',
      'jo.empty': 'No logs yet.<br>Owner can publish notes on this page.',
      'jo.unlock.label': '🔒 Unlock as owner to publish (use the same master password as the home page)',
      'jo.unlock.pwd': 'Password',
      'jo.unlock.btn': 'Unlock',
      'jo.unlock.err': 'Wrong password',
      'jo.composer.ph': 'Jot something… (signal is unstable in the mountains, save it for now)',
      'jo.composer.btn': 'Publish'
    }
  };

  function t(k, def) {
    const tbl = I18N[currentLang];
    if (tbl && tbl[k] != null) return tbl[k];
    if (I18N.zh[k] != null) return I18N.zh[k];
    return def != null ? def : k;
  }

  function applyLang() {
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('.lang-btn').forEach(b => { b.textContent = t('lang.btn'); });
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n);
      if (v !== el.dataset.i18n) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
    document.querySelectorAll('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
    if (typeof window.onLangChange === 'function') window.onLangChange(currentLang);
  }

  function toggleLang() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('ght_lang', currentLang); } catch (e) {}
    applyLang();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', toggleLang));
    applyLang();
  });

  window.GHTI18N = { t: t, applyLang: applyLang, toggleLang: toggleLang, getLang: function () { return currentLang; } };
})();
