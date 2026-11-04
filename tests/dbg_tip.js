globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
const id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], dt = +(process.argv[5] || 0.01), side = process.argv[6] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
let prev = null, pa = null;
for (let t = 0; t < t0; t += 0.0133) { prev = C.solvePose(C.evalParams(Cm, t, { polish: !!process.env.POLISH }), prev).warm; }
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, { polish: !!process.env.POLISH }), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs[side], pts = { A: l.A, ball: l.ballJ, tip: l.tipPt, heel: l.heelPt };
  const row = Object.entries(pts).map(([k, v]) => `${k}${pa ? (v.distanceTo(pa[k]) * 1000).toFixed(1) : '0.0'}`).join(' ');
  pa = Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, v.clone()]));
  console.log(t.toFixed(3), l.mode.padEnd(6), row, '| toe', l.toe.toFixed(1), 'a', (l.a ?? 0).toFixed(1), 'tipY', l.tipPt.y.toFixed(4), 'fk.s', (l.s ?? 0).toFixed(2));
}
