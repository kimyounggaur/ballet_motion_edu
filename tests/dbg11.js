globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
const def = C.MOVES.find(m=>m.id===process.argv[2]); const Cm = C.compileMove(def, 70);
const t0=+process.argv[3], t1=+process.argv[4], n=+process.argv[5];
let prev=null, pv=null;
for(let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; const P=C.evalParams(Cm,t); const p=C.solvePose(P,prev); prev=C.V3(p.pp.x,0,p.pp.z);
 const R=p.legs.R; const pts=[R.A,R.ballJ,R.tipPt,R.K];
 const st = pv? pts.map((q,j)=>(q.distanceTo(pv[j])*1000).toFixed(0)).join('/') : '';
 console.log(t.toFixed(3),'A',f(R.A),'ball',f(R.ballJ),'tip',f(R.tipPt),'a',(R.a||0).toFixed(1),'toe',R.toe.toFixed(1),'steps(mm A/ball/tip/K)',st);
 pv=pts.map(q=>q.clone());}
