// per-sample trace of toe angle / tip position: node tip_detail.js MOVE t0 t1 dt [side]
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require('../src/core.js');
const C = globalThis.BalletCore;
const id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], dt = +(process.argv[5] || 0.001), side = process.argv[6] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
let prev = null, pt = null, pa = null;
for (let t = Math.max(0, t0 - 0.5); t < t0; t += 0.0133) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs[side], tip = l.tipPt, dT = pt ? tip.clone().sub(pt).multiplyScalar(1000) : tip.clone().multiplyScalar(0);
  const dA = pa ? l.A.clone().sub(pa).multiplyScalar(1000) : l.A.clone().multiplyScalar(0);
  pt = tip.clone(); pa = l.A.clone();
  const g = l.dbg || {};
  console.log(t.toFixed(4), l.mode, 'dTip', dT.x.toFixed(2).padStart(6), dT.y.toFixed(2).padStart(6), dT.z.toFixed(2).padStart(6), '| dA', dA.x.toFixed(2).padStart(6), dA.y.toFixed(2).padStart(6), dA.z.toFixed(2).padStart(6), '| toe', l.toe.toFixed(2), 'a', (l.a ?? 0).toFixed(2), 'tFlex', (g.tFlex ?? 0).toFixed(1), 'tipY', (tip.y * 1000).toFixed(2), 'br', g.br, 's', (g.s ?? 0).toFixed(3));
}
