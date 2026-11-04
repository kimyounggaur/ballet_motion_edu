// does the solved pose depend on the warm start? compare cold solve vs chained solve at the same t
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const id = process.argv[3]; const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
const opt = { polish: !!process.env.POLISH };
const times = process.argv.slice(4).map(Number);
for (const t of times) {
  const P = C.evalParams(Cm, t, opt);
  const cold = C.solvePose(P, null);
  // chained from a coarse 16 ms sequence ending at t
  let prev = null; for (let u = Math.max(0, t - 3); u < t - 1e-9; u += 0.0194) prev = C.solvePose(C.evalParams(Cm, u, opt), prev).warm;
  const chained = C.solvePose(P, prev);
  // chained from an earlier far time (as when scrubbing)
  let prev2 = null; for (let u = 0; u < t - 1e-9; u += 0.0194) prev2 = C.solvePose(C.evalParams(Cm, u, opt), prev2).warm;
  const full = C.solvePose(P, prev2);
  const d = (a, b) => ['R', 'L'].map(s => (a.legs[s].A.distanceTo(b.legs[s].A) * 1000).toFixed(2)).join('/');
  console.log(id, t, 'mode R', cold.legs.R.mode, '| ankle R/L cold-vs-chained(3s)', d(cold, chained), ' cold-vs-fullchain', d(cold, full), ' pelvis', (cold.pp.distanceTo(chained.pp) * 1000).toFixed(2), (cold.pp.distanceTo(full.pp) * 1000).toFixed(2));
}
