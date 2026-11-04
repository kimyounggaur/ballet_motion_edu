globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
const id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], dt = +(process.argv[5] || 0.01), side = process.argv[6] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
let prev = null, pa = null;
for (let t = 0; t < t0; t += 0.0133) { prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm; }
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs[side], A = l.A, d = pa ? A.clone().sub(pa).multiplyScalar(1000) : A.clone().multiplyScalar(0);
  pa = A.clone();
  const fk = P.legs[side].fk || {};
  console.log(t.toFixed(3), l.mode.padEnd(5), 'dA[mm]', d.x.toFixed(1).padStart(6), d.y.toFixed(1).padStart(6), d.z.toFixed(1).padStart(6), '| A.y', A.y.toFixed(4), '| toe', l.toe.toFixed(1), '| P.a', (fk.a ?? 0).toFixed(1), 'P.s', (fk.s ?? 0).toFixed(3), 'u', P.u.toFixed(3), 'tau', (fk.tau ?? 0).toFixed(1), 'knee', (fk.knee ?? 0).toFixed(2));
}
