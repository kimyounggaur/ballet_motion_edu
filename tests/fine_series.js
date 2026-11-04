// fine series of one move around t: node fine_series.js T0 T1 dt [move=positions]  (env CORE, POLISH)  -- prints pelvis, roll, R ankle, d2s
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore;
const t0 = +process.argv[2], t1 = +process.argv[3], dt = +process.argv[4], id = process.argv[5] || 'positions';
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null; for (let t = Math.max(0, t0 - 1.0); t < t0 - 1e-9; t += 0.0167) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
const rows = [];
for (let t = t0; t <= t1 + 1e-9; t += dt) { const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm; const sl = P.legs.R; rows.push({ t, om: sl.omega || 0, roll: pose.autoRoll, st: pose.warm.roll, pp: pose.pp.clone(), A: pose.legs.R.A.clone(), K: pose.legs.R.K.clone(), a: pose.legs.R.a }); }
for (let i = 0; i < rows.length; i++) {
  const r = rows[i]; let d2A = NaN, d2p = NaN;
  if (i > 0 && i < rows.length - 1) { d2A = rows[i + 1].A.clone().sub(r.A).sub(r.A.clone().sub(rows[i - 1].A)).length() * 1000; d2p = rows[i + 1].pp.clone().sub(r.pp).sub(r.pp.clone().sub(rows[i - 1].pp)).length() * 1000; }
  console.log(`t=${r.t.toFixed(3)} om=${r.om.toFixed(3)} roll=${r.roll.toFixed(4)} st=${r.st.toFixed(4)} pp=(${(r.pp.x*1000).toFixed(2)},${(r.pp.y*1000).toFixed(3)},${(r.pp.z*1000).toFixed(2)}) A=(${(r.A.x*1000).toFixed(2)},${(r.A.y*1000).toFixed(3)},${(r.A.z*1000).toFixed(2)}) a=${r.a === undefined ? '-' : r.a.toFixed(2)} d2A=${d2A.toFixed(3)} d2pp=${d2p.toFixed(3)}`);
}
