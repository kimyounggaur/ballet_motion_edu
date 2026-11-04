globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
const def = C.MOVES.find(m=>m.id==='positions');
const Cm = C.compileMove(def, 70);
const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
Cm.poses.forEach((p,i)=>{
  const P=Cm.keyParams[i];
  console.log(i, 't='+Cm.ts[i], 'w='+P.w, 'pp='+f(p.pp), 'com='+f(p.com), 'tgt='+f(p.target), 'modes', P.legs.R.mode, P.legs.L.mode,
   'R.A', f(p.legs.R.A), 'reachErr', (p.legs.R.reachErr||0).toFixed(3), (p.legs.L.reachErr||0).toFixed(3));
});
console.log(JSON.stringify(Cm.POS, (k,v)=>typeof v==='number'?+v.toFixed(3):v));
