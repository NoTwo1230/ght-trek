const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m,i=0,bad=0;
while((m=re.exec(html)){
  const code=m[1];
  if(!code.trim())continue;
  i++;
  try{ new Function(code); }
  catch(e){ bad++; console.log('SCRIPT #'+i+' SYNTAX ERROR: '+e.message); }
}
console.log('inline scripts checked: '+i+', errors: '+bad);
