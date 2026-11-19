/* 演示数据装载：必须在 app.js 之前执行，让首页直接显示真实轨迹形态 */
(function () {
  'use strict';
  var KEY = 'ght_demo_seeded';
  window.GHT_DEMO_RESET = function () {
    var keys = [
      'ght_preset', 'ght_actual', 'ght_sections', 'ght_itinerary',
      'ght_itinerary_start', 'ght_rest_days', 'ght_current_pos',
      'ght_total_distance', 'ght_log', 'ght_live_demo_points', KEY
    ];
    keys.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  };

  function seed(force) {
    var s = window.GHT_DEMO_SEED;
    if (!s) return;
    try { if (!force && localStorage.getItem(KEY)) return; } catch (e) {}
    var map = {
      ght_preset: s.preset,
      ght_actual: s.actual,
      ght_sections: s.sections,
      ght_itinerary: s.itinerary,
      ght_itinerary_start: s.itineraryStart,
      ght_rest_days: s.restDays,
      ght_current_pos: s.pos,
      ght_total_distance: s.totalDistance,
      ght_log: s.journal
    };
    Object.keys(map).forEach(function (k) {
      if (map[k] == null) return;
      try { localStorage.setItem(k, JSON.stringify(map[k])); } catch (e) {}
    });
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }

  seed(false);
  window.GHT_DEMO_RESEED = function () { window.GHT_DEMO_RESET(); seed(true); };
})();
