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
  const R=p.legs.R, L=p.legs.L;
  console.log(t.toFixed(3),'k',P.k,'u',P.u.toFixed(3),'w',P.w.toFixed(2),'pp',f(p.pp),'com',f(p.com),'tgt',f(p.target),
   'R',R.mode,(R.el||0).toFixed(1),'Ra',f(R.A),'Rtip',f(R.tipPt),'L',L.mode,'Lreach',(L.reachErr||0).toFixed(3),'Rd', P.legs.R.fk?f(P.legs.R.fk.d):'');
}
