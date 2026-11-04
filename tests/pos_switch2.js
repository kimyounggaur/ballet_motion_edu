// pelvis solve internals around a switch: node pos_switch2.js T [dt] [n]   (env MOVE, POLISH, CORE)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || './_core_dbg.js'));
const C = globalThis.BalletCore, { V3 } = C;
const T = +process.argv[2], dt = +(process.argv[3] || 0.001), n = +(process.argv[4] || 2);
const def = C.MOVES.find(m => m.id === (process.env.MOVE || 'positions')), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = Math.max(0, T - 1.5); t < T - n * dt - 1e-9; t += 0.01) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
for (let i = -n; i <= n; i++) {
  const t = T + i * dt, P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
  const x = pose.pp.x, z = pose.pp.z;
  // each plant leg's own ceiling for the pelvis, at the solved x,z (roll included in P via autoRoll)
  const Pr = Object.assign({}, P); Pr.pelvis = [P.pelvis[0], P.pelvis[1] + pose.autoRoll, P.pelvis[2]];
  const only = {}; for (const s of ['R', 'L']) { const Q = Object.assign({}, Pr); Q.legs = { R: Pr.legs.R, L: Pr.legs.L }; const o = s === 'R' ? 'L' : 'R'; Q.legs[o] = Object.assign({}, Pr.legs[o], { mode: 'air' }); only[s] = P.legs[s].mode === 'plant' ? C.pelvisY(Q, x, z) : NaN; }
  console.log(`t=${t.toFixed(4)} Rmode ${P.legs.R.mode} Lmode ${P.legs.L.mode} w=${P.w.toFixed(3)} knee=${P.knee.toFixed(3)} autoRoll=${pose.autoRoll.toFixed(3)}° pp.y=${(pose.pp.y*1000).toFixed(2)} ceil[R]=${(only.R*1000).toFixed(2)} ceil[L]=${(only.L*1000).toFixed(2)} pelvis[1]=${P.pelvis[1].toFixed(3)} freeHipRoll=${C.freeHipRoll(Pr, pose).toFixed(3)}`);
}
