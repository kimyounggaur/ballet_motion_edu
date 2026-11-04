// scrub determinism: cold solve (no history) vs playback-chained solve at the same t; max differences over a move.
// usage: node cold_vs_warm.js CORE.js move [step=0.1]   (env POLISH=1)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore, id = process.argv[3], stp = +(process.argv[4] || 0.1), opt = { polish: !!process.env.POLISH };
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
let prev = null, worst = { pp: 0, K: 0, A: 0, roll: 0 }, at = {}; const dt = (def.bpm / 60) / 60; let nxt = 0;
for (let t = 0; t <= Cm.total + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, opt), chained = C.solvePose(P, prev); prev = chained.warm;
  if (t >= nxt - 1e-9) {
    nxt += stp; const cold = C.solvePose(C.evalParams(Cm, t, opt), null);
    const d = { pp: chained.pp.distanceTo(cold.pp) * 1000, roll: Math.abs((chained.autoRoll || 0) - (cold.autoRoll || 0)), K: 0, A: 0 };
    for (const s of ['R', 'L']) { d.K = Math.max(d.K, chained.legs[s].K.distanceTo(cold.legs[s].K) * 1000); d.A = Math.max(d.A, chained.legs[s].A.distanceTo(cold.legs[s].A) * 1000); }
    for (const k in d) if (d[k] > worst[k]) { worst[k] = d[k]; at[k] = t; }
  }
}
console.log(`${id.padEnd(10)} p${+!!process.env.POLISH}: cold-vs-playback max  pelvis ${worst.pp.toFixed(2)}mm@${(at.pp||0).toFixed(1)}  knee ${worst.K.toFixed(2)}mm@${(at.K||0).toFixed(1)}  ankle ${worst.A.toFixed(2)}mm@${(at.A||0).toFixed(1)}  roll ${worst.roll.toFixed(3)}°@${(at.roll||0).toFixed(1)}`);
