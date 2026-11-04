globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
for (const def of C.MOVES) {
  let t0=Date.now(); const Cm=C.compileMove(def,70); const tc=Date.now()-t0;
  const N=400; let prev=null; t0=process.hrtime.bigint();
  for(let i=0;i<N;i++){ const t=Cm.total*i/N; const P=C.evalParams(Cm,t); const p=C.solvePose(P,prev); prev=C.V3(p.pp.x,0,p.pp.z); C.measure(p,P);}
  const dt=Number(process.hrtime.bigint()-t0)/1e6/N;
  console.log(def.id.padEnd(12),'compile',tc+'ms','per-frame',dt.toFixed(2)+'ms');
}
