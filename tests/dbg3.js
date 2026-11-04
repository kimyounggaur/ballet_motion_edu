globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
const def = C.MOVES.find(m=>m.id===process.argv[2]);
const Cm = C.compileMove(def, 70);
const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
const t0=+process.argv[3], t1=+process.argv[4], n=+(process.argv[5]||10);
let prev=null;
for(let i=0;i<=n;i++){
  const t=t0+(t1-t0)*i/n;
  const P=C.evalParams(Cm,t);
  const p=C.solvePose(P,prev); prev=C.V3(p.pp.x,0,p.pp.z);
  for (const s of ['R','L']) { const l=p.legs[s];
  console.log(t.toFixed(3),s,l.mode,'el',(l.el||0).toFixed(2),'A',f(l.A),'ball',f(l.ballJ),'tip',f(l.tipPt),'toe',l.toe.toFixed(1),'rel', l.pl? (l.pl.rel||0).toFixed(1):'', 's', (l.s||0).toFixed(2), 'a', P.legs[s].fk? P.legs[s].fk.a.toFixed(1):'');}
}
