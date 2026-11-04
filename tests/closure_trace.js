// roll blend around a closing foot: node closure_trace.js t0 t1 [dt=0.05] [move=positions]
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || './_core_dbg.js'));
const C = globalThis.BalletCore, { V3 } = C;
const t0 = +process.argv[2], t1 = +process.argv[3], dt = +(process.argv[4] || 0.05), id = process.argv[5] || 'positions';
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = Math.max(0, t0 - 1.0); t < t0 - 1e-9; t += 0.0167) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev);
  const sl = ['R', 'L'].map(s => P.legs[s]).find(L => L.mode === 'slide');
  const x = pose.pp.x, z = pose.pp.z;
  const pushes = [0, 1].map(() => 0);
  console.log(`t=${t.toFixed(3)} ${P.legs.R.mode.padEnd(5)} om=${sl ? sl.omega.toFixed(3) : '  - '} rc=${sl ? sl.rollClosed.toFixed(3) : '  - '} st(prev)=${prev.roll.toFixed(3)} -> st=${pose.warm.roll.toFixed(3)} out=${pose.autoRoll.toFixed(3)} push@out=${C.rollPush(P, x, z, pose.autoRoll).toFixed(4)} push@rc=${sl ? C.rollPush(P, x, z, sl.rollClosed).toFixed(4) : '-'} pp.y=${(pose.pp.y*1000).toFixed(2)} Ray=${(pose.legs.R.A.y*1000).toFixed(2)} Rax=${(pose.legs.R.A.x*1000).toFixed(1)} Raz=${(pose.legs.R.A.z*1000).toFixed(1)} pp=(${(x*1000).toFixed(1)},${(z*1000).toFixed(1)})`);
  prev = pose.warm;
}
