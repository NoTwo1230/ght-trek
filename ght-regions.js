// ght-regions.js — shared region assignment for GHT track / passes
// Extracted from index.html so sections.html can show REAL GPX-named passes
// assigned to the correct region, using the SAME route-geometry (sectionRanges)
// the homepage map uses to color the track. This keeps the pass panel perfectly
// consistent with the map: a pass sits in whatever region segment it is on.
//
// Anchors calibrated to the GHT actual route (see project memory 2026-07-16):
// the makalu↔everest divide sits ~86.82°E (Amphu Laptsa 西侧), so Sherpani Col /
// West Col / Honku belong to Makalu and Everest begins west of Amphu Laptsa.
(function () {
  const REGION_ENTRIES = {
    'kanchenjunga': [27.55, 87.78],
    'makalu':       [27.72, 87.12],
    'everest':      [27.82, 86.52],
    'rolwaling':    [27.7983, 86.1402],
    'langtang':     [28.0427, 85.7134],
    'ganesh':       [28.1635, 85.3370],
    'manaslu':      [28.1969, 84.8222],
    'annapurna':    [28.6341, 84.4710],
    'dolpo':        [28.8161, 83.8638],
    'mugu':         [29.1871, 83.2979],
    'humla':        [29.5197, 82.8649],
    'bajhang':      [29.7114, 82.0920],
    'darchula':     [29.7959, 81.0048]
  };

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function anchorOf(region) {
    const e = region.entry || REGION_ENTRIES[region.id];
    return (e && e.length === 2) ? e : null;
  }

  // Replicates index.html calculateSectionRanges: Voronoi-assign every track
  // point to nearest anchor, take longest run per region, pin east→west order.
  function calculateSectionRanges(preset) {
    const regions = (window.GHT_SECTIONS || []).filter(r => anchorOf(r));
    if (!regions.length) return [];
    const pts = preset.trackPoints;
    if (!pts || !pts.length) return [];
    const n = pts.length;

    const assign = new Array(n);
    for (let i = 0; i < n; i++) {
      let best = Infinity, bi = 0;
      for (let r = 0; r < regions.length; r++) {
        const e = anchorOf(regions[r]);
        const d = haversine(pts[i].lat, pts[i].lon, e[0], e[1]);
        if (d < best) { best = d; bi = r; }
      }
      assign[i] = bi;
    }

    const bestRun = {};
    let cur = assign[0], s = 0;
    for (let i = 1; i <= n; i++) {
      if (i === n || assign[i] !== cur) {
        const len = (i - 1) - s + 1;
        if (!bestRun[cur] || len > bestRun[cur].len) bestRun[cur] = { start: s, end: i - 1, len };
        if (i < n) { cur = assign[i]; s = i; }
      }
    }

    const ranges = [];
    let prevEnd = -1;
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const run = bestRun[i] || { start: prevEnd + 1, end: prevEnd, len: 0 };
      const startIndex = (i === 0) ? 0 : prevEnd + 1;
      let endIndex = run.end;
      if (endIndex <= startIndex) endIndex = startIndex;
      if (i === regions.length - 1) endIndex = n - 1;
      ranges.push({ regionId: region.id, startIndex, endIndex });
      prevEnd = endIndex;
    }
    return ranges;
  }

  // nearest track-point index for a lat/lon
  function nearestTrackIndex(lat, lon, pts) {
    let bi = -1, bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = haversine(lat, lon, pts[i].lat, pts[i].lon);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  }

  function regionIdForPoint(lat, lon) {
    let best = null, bestD = Infinity;
    (window.GHT_SECTIONS || []).forEach(p => {
      const e = anchorOf(p);
      if (!e) return;
      const d = haversine(lat, lon, e[0], e[1]);
      if (d < bestD) { bestD = d; best = p.id; }
    });
    return best;
  }

  // Pull real passes/peaks from the imported preset GPX (localStorage ght_preset),
  // grouped by REGION (the route segment each pass sits on). Returns
  // { regionId: [{name, ele, type}] } or null. Falls back to nearest-anchor when
  // no track geometry is available. The preset waypoints already carry _type
  // (classified at import) + coords.
  function getRegionPasses() {
    let raw;
    try { raw = localStorage.getItem('ght_preset'); } catch (e) { return null; }
    if (!raw) return null;
    let preset;
    try { preset = JSON.parse(raw); } catch (e) { return null; }
    const wps = (preset && preset.waypoints) || [];
    if (!wps.length) return null;

    let ranges = null;
    if (preset.trackPoints && preset.trackPoints.length) {
      try { ranges = calculateSectionRanges(preset); } catch (e) { ranges = null; }
    }

    const out = {};
    wps.forEach(w => {
      if (w._type !== 'pass' && w._type !== 'peak') return;
      const lat = +w.lat, lon = +w.lon;
      if (isNaN(lat) || isNaN(lon)) return;

      let rid = null;
      if (ranges && ranges.length && preset.trackPoints) {
        const bi = nearestTrackIndex(lat, lon, preset.trackPoints);
        if (bi >= 0) {
          for (const rng of ranges) {
            if (bi >= rng.startIndex && bi <= rng.endIndex) { rid = rng.regionId; break; }
          }
          if (!rid) rid = regionIdForPoint(lat, lon);
        }
      } else {
        rid = regionIdForPoint(lat, lon);
      }
      if (!rid) return;

      const name = (w.desc || w.name || (w._type === 'peak' ? '山峰' : '垭口')).trim();
      const ele = (typeof w.elev === 'number' && isFinite(w.elev)) ? Math.round(w.elev) : null;
      (out[rid] = out[rid] || []).push({ name, ele, type: w._type });
    });
    return out;
  }

  window.GHT_REGIONS = {
    entries: REGION_ENTRIES,
    regionIdForPoint,
    getRegionPasses,
    calculateSectionRanges
  };
})();
