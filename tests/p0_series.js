// p0 (toe-through-floor depth that the glide-out removes) and the correction, at 60 fps.  usage: node p0_series.js move t0 t1 [polish=1]  env CORE EPS
globalThis.THREE = require('../vendor/three.min.js'); if (process.env.EPS !== undefined) globalThis.__EPS = +process.env.EPS;
require(require('path').resolve(process.env.CORE || 'core_x.js'));
const C = globalThis.BalletCore, id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], polish = (process.argv[5] || '1') !== '0';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
let prev = null, last = null;
for (let i = 0; i <= n; i++) {
  const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm;
  const l = pose.legs.R, g = l.dbg || {};
  if (t >= t0 && t <= t1) {
    const sp = last ? l.A.distanceTo(last) * 1000 : 0;
    console.log(`t=${t.toFixed(3)} br=${String(g.br).padStart(2)} r0=${(g.r0 * 1000).toFixed(1)} r-r0=${((g.r - g.r0) * 1000).toFixed(1).padStart(6)} p0=${g.p0 === undefined ? '  -  ' : (g.p0 * 1000).toFixed(2).padStart(6)} full=${g.dRfull === undefined ? '  -  ' : (g.dRfull * 1000).toFixed(1).padStart(6)} w=${g.wgt === undefined ? '-' : g.wgt.toFixed(2)} a0=${g.a0 === undefined ? '-' : g.a0.toFixed(1)} a=${g.a === undefined ? '-' : g.a.toFixed(1)} |dA|=${sp.toFixed(2)}`);
  }
  last = l.A.clone();
}
