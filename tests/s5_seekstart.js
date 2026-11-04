// "Seek then play": cold solver start at ts (no history), play on for W beats; R-ankle second difference (mm/frame^2), first 4 frames skipped.
// Reports per move the worst value over all start times (every 0.5 beat) and the reference (play from 0) worst, for comparison.
// usage: node s5_seekstart.js CORE.js move [W=6] [turnout=70]
globalThis.THREE = require('../vendor/three.min.js'); require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore, id = process.argv[3], W = +(process.argv[4] || 6), T = +(process.argv[5] || 70), polish = true;
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, T), dt = (def.bpm / 60) / 60;
function d2s(t0, t1) {   // ankle d2 along a chain started cold at t0, returns [{t,d2}] for frames after the 4th
  let prev = null; const A = [], ts = [];
  for (let t = t0; t <= t1 + 1e-9; t += dt) { const pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; A.push(pose.legs.R.A.clone().multiplyScalar(1000)); ts.push(t); }
  const out = []; for (let i = 4; i < A.length - 1; i++) out.push({ t: ts[i], d2: A[i + 1].clone().sub(A[i].clone().multiplyScalar(2)).add(A[i - 1]).length() }); return out;
}
const ref = d2s(0, Cm.total); let refMax = 0, refAt = 0, over3 = 0; for (const r of ref) { if (r.d2 > refMax) { refMax = r.d2; refAt = r.t; } if (r.d2 > 3) over3++; }
let worst = 0, wAt = 0, wStart = 0, cnt = 0, n3 = 0;
for (let ts0 = 0; ts0 + W <= Cm.total + 1e-9; ts0 += 0.5) for (const r of d2s(ts0, ts0 + W)) { cnt++; if (r.d2 > 3) n3++; if (r.d2 > worst) { worst = r.d2; wAt = r.t; wStart = ts0; } }
console.log(`${id.padEnd(10)} ref(from 0): max ${refMax.toFixed(2)}@${refAt.toFixed(2)} frames>3: ${over3} | seek-start (W=${W}): worst ${worst.toFixed(2)}@${wAt.toFixed(2)} (start ${wStart.toFixed(1)}) share of frames>3: ${(100 * n3 / cnt).toFixed(2)}%`);
