globalThis.THREE = require('../vendor/three.min.js'); if (process.env.MU !== undefined) globalThis.__MU = +process.env.MU; if (process.env.EPS !== undefined) globalThis.__EPS = +process.env.EPS;
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore;
const t0 = +process.argv[2], t1 = +process.argv[3], dt = +process.argv[4], id = process.argv[5] || 'positions';
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null; for (let t = Math.max(0, t0 - 1.0); t < t0 - 1e-9; t += 0.0167) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm; const l = pose.legs.R, g = l.dbg || {}, L = P.legs.R;
  const auth = L.ankle ? `auth=(${(L.ankle.x*1000).toFixed(2)},${(L.ankle.z*1000).toFixed(2)})` : '';
  console.log(`t=${t.toFixed(3)} ${l.mode} br=${g.br} r0=${g.r0 !== undefined ? (g.r0*1000).toFixed(2) : '-'} r=${g.r !== undefined ? (g.r*1000).toFixed(2) : '-'} a0=${g.a0 !== undefined ? g.a0.toFixed(2) : '-'} a=${g.a !== undefined ? g.a.toFixed(2) : '-'} A=(${(l.A.x*1000).toFixed(2)},${(l.A.y*1000).toFixed(2)},${(l.A.z*1000).toFixed(2)}) ${auth} s=${g.s !== undefined ? g.s.toFixed(3) : '-'}`);
}
