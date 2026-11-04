// detailed per-sample print around a time window: node pop_detail.js MOVE t0 t1 dt [side]
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require('../src/core.js');
const C = globalThis.BalletCore;
const id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], dt = +(process.argv[5] || 0.0005), side = process.argv[6] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
let prev = null, pa = null, pt = null;
for (let t = Math.max(0, t0 - 0.5); t < t0; t += 0.0133) { prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm; }
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs[side], A = l.A, d = pa ? A.clone().sub(pa).multiplyScalar(1000) : A.clone().multiplyScalar(0);
  pa = A.clone();
  const dg = l.dbg || {};
  const H = l.H;
  const hr = Math.hypot(A.x - H.x, A.z - H.z);
  console.log(t.toFixed(4), 'dA', d.x.toFixed(2).padStart(6), d.y.toFixed(2).padStart(6), d.z.toFixed(2).padStart(6), '| A.y', A.y.toFixed(4), 'r0', (dg.r0 ?? 0).toFixed(4), 'r', (dg.r ?? 0).toFixed(4), 'hr', hr.toFixed(4), 'br', dg.br, 'a0', (dg.a0 ?? 0).toFixed(2), 'a', (dg.a ?? 0).toFixed(2), 'toe', l.toe.toFixed(1), 'by', ((dg.by??0)*1000).toFixed(2), 'ty', ((dg.ty??0)*1000).toFixed(2), 'tyH', ((dg.tyH??0)*1000).toFixed(2), 'tFlex', (dg.tFlex??0).toFixed(1), 's', (dg.s??0).toFixed(3));
}
