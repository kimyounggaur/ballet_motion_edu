globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
const def = C.MOVES.find(m=>m.id==='arabesque'); const Cm = C.compileMove(def, 70);
Cm.poses.forEach((p,i)=>{ const R=p.legs.R; console.log(i,'t='+Cm.ts[i],R.mode,'el',(R.el||0).toFixed(1),'A',f(R.A),'heel',R.heelPt.y.toFixed(3),'ball',R.ballPt.y.toFixed(3),'tip',R.tipPt.y.toFixed(3),'pp',f(p.pp), 'a', Cm.fks[i].R.a.toFixed(1));});
