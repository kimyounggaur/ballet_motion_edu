// Stage 5 analysis: per-frame (60 fps) dump of the sliding R foot's authored inputs, the contact band and what v6 renders.
// usage: node s5_dump.js move t0 t1 [polish=1]   env CORE (default core_x5.js)
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = true;
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], polish = (process.argv[5] || '1') !== '0';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
let prev = null, last = null; const f = (v, w = 6, d = 1) => (v === undefined ? '-' : v.toFixed(d)).padStart(w);
console.log('   t     br  r0   r_v6  |  a_auth  a_v6 |  L0    U0  | rpen  rtouch | s     Hy   Ay   |dA|');
for (let i = 0; i <= n; i++) {
  const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm;
  const l = pose.legs.R, g = l.dbg || {};
  if (t >= t0 && t <= t1 && l.mode === 'slide') {
    const sp = last ? l.A.distanceTo(last) * 1000 : 0;
    console.log(`${t.toFixed(3)} ${String(g.br).padStart(3)} ${f(g.r0 * 1000, 6)} ${f(g.r * 1000, 6)} | ${f(g.a0, 6)} ${f(g.a, 6)} | ${f(g.L0, 5)} ${f(g.U0, 5)} | ${f(g.rpen * 1000, 6)} ${f(g.rtouch * 1000, 6)} | ${f(g.s, 5, 2)} ${f(g.Hy * 1000, 6)} ${f(l.A.y * 1000, 5)} ${f(sp, 5)}`);
  }
  last = l.A.clone();
}
