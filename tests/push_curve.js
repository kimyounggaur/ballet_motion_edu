// rollPush(roll) at the converged (x,z) of a pose: node push_curve.js T [move]  (env POLISH)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve('./_core_dbg.js'));
const C = globalThis.BalletCore, { V3 } = C;
const T = +process.argv[2], id = process.argv[3] || 'positions';
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = Math.max(0, T - 1.0); t < T - 1e-9; t += 0.0167) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
const P = C.evalParams(Cm, T, opt), pose = C.solvePose(P, prev);
const x = pose.pp.x, z = pose.pp.z;
console.log('modes', P.legs.R.mode, P.legs.L.mode, 'w', P.w.toFixed(3), 'roll', pose.autoRoll.toFixed(4), 'state', pose.warm.roll.toFixed(4), 'omega', P.legs.R.omega, P.legs.L.omega);
const tw = C.closedTwin(P);
for (let r = -2.5; r <= 2.5001; r += 0.25) {
  const Pr = C.rolled(P, r);
  console.log(`roll ${r.toFixed(2).padStart(6)}  push ${C.rollPush(P, x, z, r).toFixed(5).padStart(9)}` + (tw ? `   twin push ${C.rollPush(tw.Q, x, z, r).toFixed(5).padStart(9)}` : '') + `  ceilings y=${(C.pelvisY(Pr, x, z) * 1000).toFixed(3)}`);
}
console.log('solveRoll(P,x,z,0) =', C.solveRoll(P, x, z, 0), ' from state:', C.solveRoll(P, x, z, pose.warm.roll));
if (tw) console.log('solveRoll(twin) =', C.solveRoll(tw.Q, x, z, 0), 'om', tw.om);
