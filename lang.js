/* ════════════════════════════════════════════════════════════
   GHT 共享多语言引擎（中文 / English）
   - 任何页面只需 <script src="lang.js"></script> 并在导航里放一个
     <button class="lang-btn">Language ▾</button>，即可获得中/英切换。
   - 静态文案：在元素上加 data-i18n="key"（文本）/ data-i18n-ph / data-i18n-title。
   - 动态渲染的文案：在页面脚本里用 window.GHTI18N.t('key')，
     并定义 window.onLangChange = fn 以便在切换语言时重渲染。
   - 选择持久化到 localStorage('ght_lang')，跨页面保持一致。
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  let currentLang = 'zh';
  try { currentLang = localStorage.getItem('ght_lang') || 'zh'; } catch (e) {}
  // 后台（admin.html）只用中文：强制 zh，忽略 localStorage，并禁用切换
  if (window.GHT_FORCE_ZH) currentLang = 'zh';

  const I18N = {
    zh: {
      'brand.sub': '大喜马拉雅高线',
      'back.home': '← 返回首页',
      'lang.btn': 'Language ▾',

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
      'it.sum.gainPlan': '⬆️ 累计爬升',
      'it.sum.gainDone': '🥾 已经爬升',
      'it.sum.lossPlan': '⬇️ 累计下降',
      'it.sum.avgElev': '⛰ 平均海拔',
      'it.sum.groupProgress': '进度',
      'it.sum.groupElev': '里程与海拔',
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
      /* itinerary.html 动态渲染补充 */
      'it.cal.ym': '{y} 年 {m} 月', 'it.wd': ['一','二','三','四','五','六','日'], 'it.today': '今日',
      'it.warn': '⚠️ 未设置出发日期（或格式无效）。日历按「今天」起算的<b>临时排期</b>显示 {n} 天；请到 <a href="index.html">地图追踪页</a> 设置真实出发日，以获得准确日历与「超前/落后」判定。',
      'it.foot.temp': '（未设置出发日期 · 临时排期）',

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
      'jo.empty': '暂无日志。<br>主人可在此页面发布随笔。',
      'jo.unlock.label': '🔒 主人解锁后可发布日志（输入与主页相同的主人密码）',
      'jo.unlock.pwd': '密码',
      'jo.unlock.btn': '解锁',
      'jo.unlock.err': '密码错误',
      'jo.composer.ph': '记点什么…（山里信号不稳，先记着）',
      'jo.composer.btn': '发布',
      'jo.del.btn': '删除',
      'jo.del.title': '确认删除这条日志？',
      'jo.del.desc': '此操作不可撤销。请输入主人密码以确认删除。',
      'jo.del.pwd': '主人密码',
      'jo.del.confirm': '确认删除',
      'jo.del.cancel': '取消',
      'jo.del.err': '密码错误，删除未执行',
      'jo.unit.pcs': '篇', 'jo.unit.secs': '段',
      'jo.gpx.dist': '距离', 'jo.gpx.asc': '爬升', 'jo.gpx.desc': '下降', 'jo.gpx.dur': '用时', 'jo.gpx.avg': '均速', 'jo.gpx.max': '最高',
      'jo.badge.auto': '📡 自动记录', 'jo.badge.upload': '🥾 轨迹上传', 'jo.badge.preset': '🗺️ 预设上传',
      'jo.republish': '🔄 重新发布共享', 'jo.republish.ok': '✅ 已将本机日志重新发布到云端',

      /* track.html 全屏轨迹页 */
      'tk.title': 'GHT 轨迹同步地图',
      'tk.back': '返回首页',
      'tk.waiting': '等待定位数据',
      'tk.traveler': '行者信息',
      'tk.project': '项目', 'tk.project.val': 'GHT 大喜马拉雅高线',
      'tk.device': '记录设备', 'tk.device.val': '手表 / 手机 GPX',
      'tk.location': '当前位置', 'tk.weather': '天气', 'tk.weather.val': '山区无实时气象站',
      'tk.points': '轨迹点数', 'tk.enroute': '行进中', 'tk.ptUnit': '点',
      'tk.sync': 'GPX 轨迹同步',
      'tk.lat': '当前纬度 (LAT)', 'tk.lon': '当前经度 (LON)', 'tk.alt': '当前海拔 (ALT)', 'tk.spd': '即时速度 (SPD)',
      'tk.distance': '累计徒步里程', 'tk.lastts': '最后同步点（尼泊尔时间）',
      'tk.locate': '定位行者坐标', 'tk.mapview': '地图视图', 'tk.fit': '全览路线',
      'tk.reports': '同步记录', 'tk.demo': '演示数据', 'tk.gpxsync': 'GPX 同步', 'tk.manual': '手动上报',
      'tk.demo.banner': '当前显示演示轨迹，尚未同步真实 GPX 定位',
      'tk.close': '收起', 'tk.fullroute': 'GHT 全线 · 最后同步位置',
      'tk.base.terrain': '地形', 'tk.base.topo': '等高线', 'tk.base.satellite': '卫星',
      'tk.sub.terrain': '底图：Esri World Topo · 与总览页一致',
      'tk.sub.topo': '底图：OpenTopoMap · 与总览页一致',
      'tk.sub.satellite': '底图：Esri 全球影像 · 卫星俯瞰，喜马拉雅山区清晰',
      'tk.legend.plan': '计划路线 · 目标', 'tk.legend.actual': '实际徒步轨迹', 'tk.legend.live': 'GPX 同步轨迹（最后一段）'
    },
    en: {
      'brand.sub': 'GREAT HIMALAYA TRAIL',
      'back.home': '← Back to home',
      'lang.btn': 'Language ▾',

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
      'it.sum.gainPlan': '⬆️ Total ascent',
      'it.sum.gainDone': '🥾 Ascent done',
      'it.sum.lossPlan': '⬇️ Total descent',
      'it.sum.avgElev': '⛰ Avg elevation',
      'it.sum.groupProgress': 'Progress',
      'it.sum.groupElev': 'Distance & elevation',
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

      /* itinerary.html dynamic additions */
      'it.cal.ym': '{y} / {m}', 'it.wd': ['Mo','Tu','We','Th','Fr','Sa','Su'], 'it.today': 'Today',
      'it.warn': '⚠️ No start date set (or invalid format). Calendar shows <b>temporary schedule</b> of {n} days counted from "today"; please set the real start date on the <a href="index.html">map tracking page</a> for accurate calendar and ahead/behind judgement.',
      'it.foot.temp': '(No start date set · temporary schedule)',

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
      'jo.empty': 'No logs yet.<br>Owner can publish notes on this page.',
      'jo.unlock.label': '🔒 Unlock as owner to publish (use the same master password as the home page)',
      'jo.unlock.pwd': 'Password',
      'jo.unlock.btn': 'Unlock',
      'jo.unlock.err': 'Wrong password',
      'jo.composer.ph': 'Jot something… (signal is unstable in the mountains, save it for now)',
      'jo.composer.btn': 'Publish',
      'jo.del.btn': 'Delete',
      'jo.del.title': 'Delete this journal entry?',
      'jo.del.desc': 'This cannot be undone. Enter the master password to confirm deletion.',
      'jo.del.pwd': 'Master password',
      'jo.del.confirm': 'Delete',
      'jo.del.cancel': 'Cancel',
      'jo.del.err': 'Wrong password — entry not deleted',
      'jo.unit.pcs': '', 'jo.unit.secs': '',
      'jo.gpx.dist': 'Dist', 'jo.gpx.asc': 'Ascent', 'jo.gpx.desc': 'Descent', 'jo.gpx.dur': 'Time', 'jo.gpx.avg': 'Avg', 'jo.gpx.max': 'Max',
      'jo.badge.auto': '📡 Auto logged', 'jo.badge.upload': '🥾 Track uploaded', 'jo.badge.preset': '🗺️ Preset uploaded',
      'jo.republish': '🔄 Republish share', 'jo.republish.ok': '✅ Local journal republished to cloud',

      /* track.html full-screen track page */
      'tk.title': 'GHT Track Sync Map',
      'tk.back': 'Back to home',
      'tk.waiting': 'Waiting for position data',
      'tk.traveler': 'Traveler info',
      'tk.project': 'Project', 'tk.project.val': 'Great Himalaya Trail',
      'tk.device': 'Device', 'tk.device.val': 'Watch / Phone GPX',
      'tk.location': 'Current location', 'tk.weather': 'Weather', 'tk.weather.val': 'No live weather station in mountains',
      'tk.points': 'Track points', 'tk.enroute': 'En route', 'tk.ptUnit': 'pts',
      'tk.sync': 'GPX track sync',
      'tk.lat': 'Latitude (LAT)', 'tk.lon': 'Longitude (LON)', 'tk.alt': 'Altitude (ALT)', 'tk.spd': 'Speed (SPD)',
      'tk.distance': 'Total distance', 'tk.lastts': 'Last sync (Nepal time)',
      'tk.locate': 'Locate traveler', 'tk.mapview': 'Map view', 'tk.fit': 'Fit whole route',
      'tk.reports': 'Sync reports', 'tk.demo': 'Demo data', 'tk.gpxsync': 'GPX sync', 'tk.manual': 'Manual report',
      'tk.demo.banner': 'Showing demo track — real GPX position not synced yet',
      'tk.close': 'Close', 'tk.fullroute': 'GHT Full Route · Last synced position',
      'tk.base.terrain': 'Terrain', 'tk.base.topo': 'Contours', 'tk.base.satellite': 'Satellite',
      'tk.sub.terrain': 'Basemap: Esri World Topo · same as overview',
      'tk.sub.topo': 'Basemap: OpenTopoMap · same as overview',
      'tk.sub.satellite': 'Basemap: Esri World Imagery · clear Himalaya overview',
      'tk.legend.plan': 'Planned route · target', 'tk.legend.actual': 'Actual track', 'tk.legend.live': 'GPX sync track (last segment)'
    }
  };

  /* 首页 / 后台原 app.js 内置词库，已并入本文件，全站只保留这一份翻译引擎 */
  const APP_I18N = {
    zh: {
      'nav.dashboard': '仪表盘', 'nav.sections': '路段', 'nav.itinerary': '行程', 'nav.datamgmt': '数据管理',
      'nav.itinerary.full': '行程对比', 'nav.sections.full': '路段', 'nav.journal.full': '日志', 'nav.track': '实时轨迹',
      'nav.itinerary.title': '计划 vs 实际 · 行程对比', 'nav.sections.title': '路段进度 · 按 已完成/进行中/未完成 分组', 'nav.journal.title': '远征日志 · 按路段分组',
      'brand.sub': '大喜马拉雅高线',
      'pos.prefix': '📍 当前位置:',
      'basemap.terrain': '户外图 (Esri 地形 · 默认)', 'basemap.topo': '地形图 (等高线)',
      'prog.done': '已完成 km', 'prog.total': '总计 km',
      'st.camp': '当前营地', 'st.area': '所在区域', 'st.elev': '当前海拔', 'st.pass': '下一垭口', 'st.eta': '预计抵达',
      'today.dist': '距离', 'today.gain': '爬升', 'today.loss': '下降', 'today.move': '移动时间', 'today.speed': '均速 km/h', 'today.max': '最高海拔',
      'today.dateLbl': '数据日期：', 'today.nodata': '暂无今日 GPS 数据',
      'ei.from': '出发地', 'ei.total': '总距离', 'ei.recorded': '已记录', 'ei.gain': '累计爬升', 'ei.max': '最高点', 'ei.passes': '垭口 / 营地', 'ei.end': '预计结束',
      'pass.none': '暂无垭口数据', 'pass.soon': '近日', 'pass.seg': '段', 'pass.all': '查看全部路段 →',
      'up.btn': '📤 上传GPS轨迹', 'up.hint': '支持批量多文件 (.gpx/.kml)<br>PeakVisor / Strava / Garmin 均可', 'up.date': '出发日期：', 'up.reset': '🗑️ 重置本机数据',
      'view.empty': '暂无内容',
      'dm.title': '数据管理', 'dm.pwdHint': '请输入主人密码以管理轨迹数据', 'dm.unlock': '解锁', 'dm.pwdErr': '密码错误', 'dm.connErr': '无法连接服务器（后端未启动？）',
      'prog.title': '整体进度', 'prog.doneKm': '已完成里程', 'prog.totalGain': '累计爬升', 'prog.goal': '目标约',
      'prog.curElev': '当前海拔', 'prog.nextPass': '下一垭口', 'prog.ringDay': '远征第 {d} 天',
      'prog.ringCap': '全程进度', 'prog.ringDone': '已完成', 'prog.ringDayUnit': '日',
      'today.title': '今日摘要', 'st.title': '当前状态', 'pass.title': '垭口清单',
      'st.start': '起点', 'st.notStarted': '未出发', 'st.unnamed': '未命名',
      'map.title': '交互地图', 'leg.actual': '实际徒步轨迹', 'leg.plan': '计划路线 · 目标',
      'elev.title': '海拔剖面', 'elev.scopeFull': '全程', 'elev.scopeRegion': '当前区域',
      'elev.scopePreset': '预设轨迹', 'elev.highest': '最高', 'elev.lowest': '最低',
      'elev.climbLabel': '累计爬升', 'elev.current': '当前',
      'hdr.live': '定位中', 'hdr.idle': '等待定位数据',
      'brand.title': 'GHT 大喜马拉雅高线徒步追踪', 'brand.sub': '远征追踪面板',
      'footer.copyright': '© 2026 GHT 高线追踪', 'footer.dataSrc': '数据来源: GPX',
      'loading.parse': '正在解析 GPX 轨迹...'
    },
    en: {
      'nav.dashboard': 'Dashboard', 'nav.sections': 'Sections', 'nav.itinerary': 'Itinerary', 'nav.datamgmt': 'Data',
      'nav.itinerary.full': 'Itinerary', 'nav.sections.full': 'Sections', 'nav.journal.full': 'Journal', 'nav.track': 'Live Track',
      'nav.itinerary.title': 'Planned vs actual · itinerary', 'nav.sections.title': 'Section progress · grouped by done/in-progress/todo', 'nav.journal.title': 'Expedition journal · grouped by section',
      'brand.sub': 'GREAT HIMALAYA TRAIL',
      'pos.prefix': '📍 Current location:',
      'basemap.terrain': 'Terrain (Esri Topo · default)', 'basemap.topo': 'Topographic (Contours)',
      'prog.done': 'Done km', 'prog.left': 'Left km', 'prog.total': 'Total km',
      'st.camp': 'Current camp', 'st.area': 'Region', 'st.elev': 'Elevation', 'st.pass': 'Next pass', 'st.eta': 'ETA',
      'today.dist': 'Distance', 'today.gain': 'Ascent', 'today.loss': 'Descent', 'today.move': 'Moving time', 'today.speed': 'Avg km/h', 'today.max': 'Max elev',
      'today.dateLbl': 'Data date: ', 'today.nodata': 'No GPS data today',
      'ei.from': 'Start', 'ei.total': 'Total dist', 'ei.recorded': 'Recorded', 'ei.gain': 'Total ascent', 'ei.max': 'Highest point', 'ei.passes': 'Passes / Camps', 'ei.end': 'Est. finish',
      'pass.none': 'No pass data', 'pass.soon': 'Soon', 'pass.seg': 'seg', 'pass.all': 'All sections →',
      'up.btn': '📤 Upload GPS track', 'up.hint': 'Batch upload (.gpx/.kml)<br>PeakVisor / Strava / Garmin supported', 'up.date': 'Start date: ', 'up.reset': '🗑️ Reset data',
      'view.empty': 'No content',
      'dm.title': 'Data Management', 'dm.pwdHint': 'Enter owner password to manage track data', 'dm.unlock': 'Unlock', 'dm.pwdErr': 'Wrong password', 'dm.connErr': 'Cannot reach server (backend down?)',
      'prog.title': 'Overall Progress', 'prog.doneKm': 'Distance done', 'prog.totalGain': 'Total ascent', 'prog.goal': 'Goal ~',
      'prog.curElev': 'Current elev', 'prog.nextPass': 'Next pass', 'prog.ringDay': 'Expedition Day {d}',
      'prog.ringCap': 'Progress', 'prog.ringDone': 'done', 'prog.ringDayUnit': 'days',
      'today.title': "Today's Summary", 'st.title': 'Current Status', 'pass.title': 'Pass Checklist',
      'st.start': 'Start', 'st.notStarted': 'Not started', 'st.unnamed': 'Unnamed',
      'map.title': 'Interactive Map', 'leg.actual': 'Actual track', 'leg.plan': 'Planned route · target',
      'elev.title': 'Elevation Profile', 'elev.scopeFull': 'Full Route', 'elev.scopeRegion': 'Current Region',
      'elev.scopePreset': 'Preset Track', 'elev.highest': 'Highest', 'elev.lowest': 'Lowest',
      'elev.climbLabel': 'Total climb', 'elev.current': 'Current',
      'hdr.live': 'Locating', 'hdr.idle': 'Waiting for position',
      'brand.title': 'GHT Great Himalaya Trail', 'brand.sub': 'Expedition Tracker',
      'footer.copyright': '© 2026 GHT Tracker', 'footer.dataSrc': 'Data source: GPX',
      'loading.parse': 'Parsing GPX track...'
    }
  };
  Object.keys(APP_I18N.zh).forEach(function (k) { I18N.zh[k] = APP_I18N.zh[k]; });
  Object.keys(APP_I18N.en).forEach(function (k) { I18N.en[k] = APP_I18N.en[k]; });

  const listeners = [];
  function onChange(fn) { if (typeof fn === 'function' && listeners.indexOf(fn) < 0) listeners.push(fn); }

  function t(k, def) {
    const tbl = I18N[currentLang];
    if (tbl && tbl[k] != null) return tbl[k];
    if (I18N.zh[k] != null) return I18N.zh[k];
    return def != null ? def : k;
  }

  function get(lang, k, def) {
    const tbl = I18N[lang];
    if (tbl && tbl[k] != null) return tbl[k];
    return def != null ? def : k;
  }

  function applyLang() {
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('.lang-btn, .tk-lang-btn').forEach(b => { b.textContent = t('lang.btn'); });
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n);
      if (v !== el.dataset.i18n) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
    document.querySelectorAll('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
    listeners.forEach(function (fn) { try { fn(currentLang); } catch (e) {} });
    if (typeof window.onLangChange === 'function') { try { window.onLangChange(currentLang); } catch (e) {} }
  }

  function toggleLang() {
    if (window.GHT_FORCE_ZH) return;
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('ght_lang', currentLang); } catch (e) {}
    applyLang();
  }

  function setLang(lang) {
    if (window.GHT_FORCE_ZH) return;
    const next = /^en/i.test(lang) ? 'en' : 'zh';
    if (next === currentLang) return;
    currentLang = next;
    try { localStorage.setItem('ght_lang', currentLang); } catch (e) {}
    applyLang();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lang-btn, .tk-lang-btn').forEach(b => b.addEventListener('click', toggleLang));
    applyLang();
  });

  window.GHTI18N = {
    t: t, get: get, applyLang: applyLang, toggleLang: toggleLang, setLang: setLang,
    onChange: onChange,
    getLang: function () { return currentLang; }
  };
})();
