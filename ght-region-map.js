// GHT 13-region territory map (prototype style)
// ── district (DIST_EN) → region number (1..13, 与 GHT_SECTIONS.num / 原型 东→西 一致) ──
// ── 每区域补充事实（park / days / dist / anchor / stroke），颜色取自 GHT_SECTIONS.color（已统一为原型调色板） ──
window.GHT_REGION_MAP = (function () {
  const districtToRegion = {
    'Taplejung': 1, 'Sankhuwasabha': 2, 'Solukhumbu': 3, 'Dolakha': 4,
    'Ramechhap': 4, 'Sindhupalchok': 5, 'Rasuwa': 5, 'Dhading': 6,
    'Gorkha': 7, 'Manang': 8, 'Mustang': 8,
    'Dolpa': 9, 'Mugu': 10, 'Humla': 11, 'Bajhang': 12, 'Darchula': 13
  };
  const regions = {
    1:  { zh:'干城章嘉段',   en:'Kanchenjunga',     anchor:[27.55,87.78],     park:'干城章嘉保护区',         days:'14-18天', dist:180, color:'#5DCAA5', stroke:'#0F6E56' },
    2:  { zh:'马卡鲁-巴润段', en:'Makalu-Barun',    anchor:[27.72,87.12],     park:'马卡鲁-巴润国家公园',     days:'12-16天', dist:160, color:'#85B7EB', stroke:'#185FA5' },
    3:  { zh:'珠峰-昆布段',   en:'Everest-Khumbu',  anchor:[27.82,86.52],     park:'萨加玛塔国家公园',       days:'12-18天', dist:150, color:'#AFA9EC', stroke:'#534AB7' },
    4:  { zh:'若瓦岭段',     en:'Rolwaling',       anchor:[27.7983,86.1402], park:'高里山卡保护区',         days:'10-14天', dist:130, color:'#F0997B', stroke:'#993C1D' },
    5:  { zh:'郎当-戈赛昆达段', en:'Langtang',      anchor:[28.0427,85.7134], park:'郎当国家公园',           days:'12-15天', dist:140, color:'#97C459', stroke:'#3B6D11' },
    6:  { zh:'象神段',       en:'Ganesh',          anchor:[28.1635,85.3370], park:'高里山卡保护区（西）',   days:'8-12天',  dist:100, color:'#FAC775', stroke:'#854F0B' },
    7:  { zh:'马纳斯鲁-楚姆段', en:'Manaslu',       anchor:[28.1969,84.8222], park:'马纳斯鲁保护区',         days:'14-18天', dist:160, color:'#ED93B1', stroke:'#993556' },
    8:  { zh:'安纳普尔纳段',   en:'Annapurna',      anchor:[28.6341,84.4710], park:'安纳普尔纳保护区',       days:'14-20天', dist:170, color:'#5DCAA5', stroke:'#0F6E56' },
    9:  { zh:'多尔普段',       en:'Dolpo',          anchor:[28.8161,83.8638], park:'谢伊-佛克松多国家公园',   days:'18-25天', dist:200, color:'#85B7EB', stroke:'#185FA5' },
    10: { zh:'木古段',       en:'Mugu',            anchor:[29.1871,83.2979], park:'拉拉国家公园',           days:'8-12天',  dist:90,  color:'#AFA9EC', stroke:'#534AB7' },
    11: { zh:'胡姆拉段',       en:'Humla',          anchor:[29.5197,82.8649], park:'阿皮·南巴保护区（东）',  days:'10-14天', dist:120, color:'#F0997B', stroke:'#993C1D' },
    12: { zh:'巴章段',       en:'Bajhang',         anchor:[29.7114,82.0920], park:'阿皮·南巴保护区（中）',  days:'6-10天',  dist:80,  color:'#97C459', stroke:'#3B6D11' },
    13: { zh:'达尔丘拉段',     en:'Darchula',       anchor:[29.7959,81.0048], park:'阿皮·南巴保护区（西）',  days:'8-12天',  dist:100, color:'#FAC775', stroke:'#854F0B' }
  };
  return { districtToRegion, regions };
})();
