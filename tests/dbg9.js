globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
const def = C.MOVES.find(m=>m.id===process.argv[2]); const Cm = C.compileMove(def, 70);
const t0=+process.argv[3], t1=+process.argv[4], n=+process.argv[5];
let prev=null;
for(let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; const P=C.evalParams(Cm,t); const p=C.solvePose(P,prev); prev=C.V3(p.pp.x,0,p.pp.z);
 const R=p.legs.R; const fz=new T3.Vector3(0,0,1).applyQuaternion(R.qFoot);
 console.log(t.toFixed(3), R.mode, 'A',f(R.A),'a',(R.a||0).toFixed(1),'auth',P.legs.R.fk?P.legs.R.fk.a.toFixed(1):'', 's', (R.s||0).toFixed(2),'toe',R.toe.toFixed(1),'footZ',f(fz),'heel',R.heelPt.y.toFixed(3),'ball',R.ballPt.y.toFixed(3),'tip',R.tipPt.y.toFixed(3));}
