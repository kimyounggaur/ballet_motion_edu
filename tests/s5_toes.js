// toe look at the key poses: per slide frame with s_auth>thr → t, s_auth, s_eff, toe angle, foot angle.  usage: K='{...}' node s5_toes.js move [thr] [polish]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = true; globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], thr = +(process.argv[3] || 0.3), polish = (process.argv[4] || '1') !== '0';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
let prev = null;
for (let i = 0; i <= n; i++) { const t = i * step, P = C.evalParams(Cm, t, { polish }), pose = C.solvePose(P, prev); prev = pose.warm; const l = pose.legs.R;
  if (l.mode !== 'slide') continue; const sa = P.legs.R.fk.s; if (sa < thr) continue;
  console.log(`${t.toFixed(3)} s_auth ${sa.toFixed(2)} s_eff ${l.s.toFixed(2)} toe ${l.toe.toFixed(1).padStart(6)} a ${l.a.toFixed(1).padStart(5)} tip ${(l.tipPt.y*1000).toFixed(1)}`); }
