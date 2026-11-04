// state of the R leg and the pelvis on both sides of a slide->plant switch: node pos_switch.js T [dt=0.001] [n=3]  (env CORE=path, POLISH=1)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore, { V3 } = C;
const T = +process.argv[2], dt = +(process.argv[3] || 0.001), n = +(process.argv[4] || 3);
const def = C.MOVES.find(m => m.id === (process.env.MOVE || 'positions')), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = Math.max(0, T - 1.5); t < T - n * dt - 1e-9; t += 0.01) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
const f = (v) => v.toArray().map(x => (x * 1000).toFixed(2)).join(', ');
for (let i = -n; i <= n; i++) {
  const t = T + i * dt, P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs.R, L = pose.legs.L;
  console.log(`t=${t.toFixed(4)} R:${l.mode.padEnd(5)} w=${P.w.toFixed(3)} pp[${f(pose.pp)}] H[${f(l.H)}] K[${f(l.K)}] A[${f(l.A)}] heelY ${(l.heelPt.y*1000).toFixed(2)} ballY ${(l.ballPt.y*1000).toFixed(2)} tipY ${(l.tipPt.y*1000).toFixed(2)} toe ${l.toe.toFixed(2)} | Lmode ${L.mode} LA[${f(L.A)}] LK[${f(L.K)}]`);
}
