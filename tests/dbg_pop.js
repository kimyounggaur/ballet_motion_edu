globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
const id = process.argv[2] || 'tendu', t0 = +process.argv[3], t1 = +process.argv[4], dt = +(process.argv[5] || 0.01);
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
let prev = null, pa = null;
// warm up solver state from the start so the warm-start matches the app
for (let t = 0; t < t0; t += 0.0133) { const P = C.evalParams(Cm, t, { polish: !!process.env.POLISH }); prev = C.solvePose(P, prev).warm; }
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, { polish: !!process.env.POLISH }), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs.R, A = l.A, jump = pa ? A.distanceTo(pa) : 0; pa = A.clone();
  console.log(t.toFixed(3), l.mode.padEnd(6), 'A', A.x.toFixed(3), A.y.toFixed(3), A.z.toFixed(3), 'jump', (jump * 1000).toFixed(1) + 'mm', 'toe', l.toe.toFixed(1), 'a', (l.a ?? NaN).toFixed ? (l.a || 0).toFixed(1) : '', 'pel', pose.pp.x.toFixed(3), pose.pp.y.toFixed(3), pose.pp.z.toFixed(3), 'roll', pose.autoRoll.toFixed(2));
}
