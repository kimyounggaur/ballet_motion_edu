globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require('../src/core.js');
const C = globalThis.BalletCore;
const id = process.argv[2], tc = +process.argv[3], side = process.argv[4] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = 0; t <= tc + 0.01; t += 0.002) {
  const pose = C.solvePose(C.evalParams(Cm, t, opt), prev); prev = pose.warm;
  if (Math.abs(t - tc) < 0.007) { const l = pose.legs[side], g = l.dbg; console.log(t.toFixed(5), 'br', g.br, 'r0', g.r0.toFixed(5), 'r', g.r.toFixed(5), 'a0', g.a0.toFixed(3), 'a', g.a.toFixed(3), 'by', (g.by * 1000).toFixed(3), 'ty', (g.ty * 1000).toFixed(3), 'tyH', (g.tyH * 1000).toFixed(3), 'Hy', l.H.y.toFixed(5), 'A', l.A.x.toFixed(4), l.A.y.toFixed(4), l.A.z.toFixed(4)); }
}
