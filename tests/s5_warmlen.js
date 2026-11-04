// Ankle/pelvis at a probe time as a function of how long the solver was warmed up before (playback-like chain), arabesque touchdown.
// usage: node s5_warmlen.js CORE.js move tProbe
globalThis.THREE = require('../vendor/three.min.js'); require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore, id = process.argv[3], tp = +process.argv[4];
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), dt = (def.bpm / 60) / 60, polish = true;
function run(warmBeats) {   // chain from tp-warmBeats up to tp, return the pose at tp and the max ankle step over [tp-?..tp+0.3]
  let prev = null; const t0 = Math.max(0, tp - warmBeats), n0 = Math.round((tp - t0) / dt); const pts = [];
  for (let i = 0; i <= n0 + 20; i++) { const t = t0 + i * dt, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; pts.push({ t, A: pose.legs.R.A.clone().multiplyScalar(1000), pp: pose.pp.clone().multiplyScalar(1000), mode: pose.legs.R.mode }); }
  return pts;
}
const ref = run(1e9);
for (const w of [0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 1e9]) {
  const r = run(w); let maxA = 0, maxP = 0, d2max = 0, at = 0;
  for (const p of r) { const q = ref.find(x => Math.abs(x.t - p.t) < 1e-9); if (!q) continue; maxA = Math.max(maxA, p.A.distanceTo(q.A)); maxP = Math.max(maxP, p.pp.distanceTo(q.pp)); }
  for (let i = 1; i < r.length - 1; i++) { const d = r[i + 1].A.clone().sub(r[i].A.clone().multiplyScalar(2)).add(r[i - 1].A).length(); if (r[i].t > tp - 0.1 && d > d2max) { d2max = d; at = r[i].t; } }
  console.log(`warm ${String(w === 1e9 ? 'from 0' : w + ' beat').padEnd(9)} ankle-vs-ref max ${maxA.toFixed(2)} mm  pelvis-vs-ref max ${maxP.toFixed(2)} mm   ankle d2 max (t>=${(tp-0.1).toFixed(2)}) ${d2max.toFixed(2)} @ ${at.toFixed(3)}`);
}
