/* =============================================================
   GHT 双主题切换控件 (theme-toggle.js)
   -------------------------------------------------------------
   - 默认：站点原有暗色(无 data-theme 属性)。
   - 切换为浅色(Stripe)：html[data-theme="light"]。
   - 选择写入 localStorage('ght-theme')，刷新保持。
   - 派发 document 事件 'ght:themechange'，供 app.js 切换地图瓦片。
   - 控件自动挂载：优先 .topnav-right(主站) / .admin-top(后台)，
     否则固定悬浮右上角，保证全站可见。
   ============================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'ght-theme';

  function getTheme() {
    try {
      var t = localStorage.getItem(STORE_KEY);
      return t === 'light' ? 'light' : 'light';
    } catch (e) { return 'dark'; }
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }

  function setTheme(theme) {
    applyTheme(theme);
    try { localStorage.setItem(STORE_KEY, theme); } catch (e) {}
    // 更新控件高亮
    var btns = document.querySelectorAll('.ght-theme-toggle button');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme-value') === theme);
    });
    // 通知地图等监听者
    var ev;
    try { ev = new CustomEvent('ght:themechange', { detail: { theme: theme } }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('ght:themechange', true, true, { theme: theme }); }
    document.dispatchEvent(ev);
  }

  function buildControl() {
    var wrap = document.createElement('div');
    wrap.className = 'ght-theme-toggle';

    var bLight = document.createElement('button');
    bLight.setAttribute('data-theme-value', 'light');
    bLight.textContent = 'A · Stripe';
    bLight.title = '浅色 · Stripe 风格';

    var bDark = document.createElement('button');
    bDark.setAttribute('data-theme-value', 'dark');
    bDark.textContent = 'B · 暗色';
    bDark.title = '暗色 · 远征遥测';

    bLight.addEventListener('click', function () { setTheme('light'); });
    bDark.addEventListener('click', function () { setTheme('dark'); });

    wrap.appendChild(bLight);
    wrap.appendChild(bDark);

    // 挂载点
    var mount = document.querySelector('.topnav-right') ||
                document.querySelector('.admin-top');
    if (mount) {
      wrap.classList.add('in-header');
      mount.appendChild(wrap);
    } else {
      document.body.appendChild(wrap);
    }

    // 初始高亮
    var cur = getTheme();
    (cur === 'light' ? bLight : bDark).classList.add('active');
  }

  function init() {
    // 先按存储应用主题（head 内联脚本可能已提前设置，这里兜底）
    applyTheme(getTheme());
    buildControl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
