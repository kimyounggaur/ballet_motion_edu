// toe & foot angle through a stroke, sampled.  usage: K='{...}' node s5_toecmp.js move t0 t1 every
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], every = +(process.argv[5] || 3);
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
let prev = null, k = 0; const out = [];
for (let i = 0; i <= n; i++) { const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish: true }), prev); prev = pose.warm; const l = pose.legs.R;
  if (t >= t0 && t <= t1 && l.mode === 'slide' && (k++ % every) === 0) out.push(`${t.toFixed(2)} a ${l.a.toFixed(0).padStart(3)} toe ${l.toe.toFixed(0).padStart(4)} ankle(${(l.A.x*1000).toFixed(0)},${(l.A.y*1000).toFixed(0)},${(l.A.z*1000).toFixed(0)}) tip ${(l.tipPt.y*1000).toFixed(1)}`); }
console.log(out.join('\n'));
