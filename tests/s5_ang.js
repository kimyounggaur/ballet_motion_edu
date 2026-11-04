// list frames where the rendered foot angle has a large second difference (knobs via env K).  node s5_ang.js move [thr=1.5] [polish=1]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], thr = +(process.argv[3] || 1.5), polish = (process.argv[4] || '1') !== '0';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
let prev = null; const R = [];
for (let i = 0; i <= n; i++) { const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; const l = pose.legs.R, g = l.dbg || {}; R.push({ t, mode: l.mode, a: l.a || 0, g, A: l.A.clone() }); }
for (let i = 1; i < R.length - 1; i++) {
  const m = R[i]; if (!(R[i - 1].mode === 'slide' && m.mode === 'slide' && R[i + 1].mode === 'slide')) continue;
  const d2 = R[i + 1].a - 2 * m.a + R[i - 1].a;
  if (Math.abs(d2) > thr) console.log(`${m.t.toFixed(3)} br${String(m.g.br).padStart(2)} a ${R[i-1].a.toFixed(1)} ${m.a.toFixed(1)} ${R[i+1].a.toFixed(1)}  d2 ${d2.toFixed(1)}  r0 ${(m.g.r0*1000).toFixed(1)} s ${m.g.s.toFixed(2)}`);
}
