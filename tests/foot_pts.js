globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const id = process.argv[3], t0 = +process.argv[4], t1 = +process.argv[5], dt = +process.argv[6], side = process.argv[7] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = Math.max(0, t0 - 0.5); t < t0; t += 0.0133) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
for (let t = t0; t <= t1 + 1e-9; t += dt) { const pose = C.solvePose(C.evalParams(Cm, t, opt), prev); prev = pose.warm; const l = pose.legs[side]; const g = l.dbg || {};
  console.log(t.toFixed(3), l.mode, 'heel', (l.heelPt.y * 1000).toFixed(2), 'ball', (l.ballPt.y * 1000).toFixed(2), 'tip', (l.tipPt.y * 1000).toFixed(2), '| toe', l.toe.toFixed(1), 'a', (l.a ?? 0).toFixed(1), 'tFlex', (g.tFlex ?? 0).toFixed(1), 'br', g.br, 'r0', (g.r0 ?? 0).toFixed(3), 'r', (g.r ?? 0).toFixed(3)); }
