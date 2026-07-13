const { JSDOM } = require('jsdom');
const fs = require('fs');

// Universal chainable Leaflet stub — every method returns a chainable proxy,
// every constructor returns one too. Real DOM ops (getElementById/innerHTML) hit jsdom.
function makeL() {
  const fn = function () {};
  return new Proxy(fn, {
    get(t, prop) {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toPrimitive) return () => '';
      return makeL();
    },
    apply() { return makeL(); },
    construct() { return makeL(); },
    set() { return true; }
  });
}

function smoke(file) {
  const html = fs.readFileSync(file, 'utf-8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const appJs = scripts[scripts.length - 1];
  // Province data is defined in a separate local script; combine so `const` is in scope.
  let dataJs = '';
  const provPath = require('path').join(require('path').dirname(file), 'nepal-provinces.js');
  if (fs.existsSync(provPath)) dataJs = fs.readFileSync(provPath, 'utf-8') + '\n';
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.L = makeL();
  window.requestAnimationFrame = cb => setTimeout(cb, 0);
  let err = null;
  try {
    window.eval(dataJs + appJs);
  } catch (e) {
    err = e;
    console.log('  STACK:', (e.stack ? e.stack : String(e)).split('\n').slice(0, 8).join('\n         '));
  }
  const checks = [];
  if (file.includes('notwo')) {
    const c = window.document.getElementById('cardProgress');
    checks.push(['dashboard progress card rendered', !!c && c.innerHTML.length > 50]);
    const st = window.document.querySelector('.statusbar');
    checks.push(['statusbar does NOT load hiking-route layer (no Waymarked Trails)', !!st && !/Waymarked Trails/.test(st.textContent)]);
    checks.push(['statusbar credits basemap source (OpenStreetMap)', !!st && /OpenStreetMap/.test(st.textContent)]);
  } else {
    const c = window.document.getElementById('sidebarContent');
    checks.push(['sidebar progress rendered', !!c && c.innerHTML.length > 50]);
  }
  return { file, err, checks };
}

let allOk = true;
for (const f of ['index.html', 'index-notwo.html']) {
  const r = smoke(f);
  console.log('\n=== ' + f + ' ===');
  if (r.err) { allOk = false; console.log('  RUNTIME ERROR:', r.err.message); }
  else console.log('  init: no runtime error');
  for (const [name, ok] of r.checks) {
    if (!ok) allOk = false;
    console.log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + name);
  }
}
console.log('\n' + (allOk ? '✅ ALL SMOKE CHECKS PASSED' : '❌ SOME CHECKS FAILED'));
process.exit(allOk ? 0 : 1);
