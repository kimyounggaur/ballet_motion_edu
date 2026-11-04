// d2 (mm/frame^2 @60fps) of ankle/heel/ball/tip/knee + toe angle d2 for the sliding R leg.  usage: K='{...}' node s5_foot.js [moves] [polish]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = false; globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, FPS = 60, polish = (process.argv[3] || '1') !== '0', only = (process.argv[2] || 'tendu,arabesque,positions').split(',');
for (const id of only) {
  const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, +(process.env.T || 70)), step = (def.bpm / 60) / FPS, n = Math.floor(Cm.total / step + 1e-9);
  let prev = null; const R = [];
  for (let i = 0; i <= n; i++) { const t = i * step, PP = C.evalParams(Cm, t, { polish }), pose = C.solvePose(PP, prev); prev = pose.warm; const l = pose.legs.R;
    R.push({ sa: (PP.legs.R.fk && PP.legs.R.fk.s) || 0, t, mode: l.mode, A: l.A.clone(), K: l.K.clone(), H: l.heelPt.clone(), B: l.ballPt.clone(), T: l.tipPt.clone(), toe: l.toe || 0, a: l.a || 0 }); }
  const keys = { ankle: r => r.A, knee: r => r.K, heel: r => r.H, ball: r => r.B, tip: r => r.T }, out = {};
  for (const k in keys) out[k] = { v: 0, t: 0, n: 0 }; let toeD = { v: 0, t: 0 }, aKey = 999, toeKey = 999, nKey = 0;
  for (const r of R) if (r.mode === 'slide' && r.sa >= 0.95) { aKey = Math.min(aKey, r.a); toeKey = Math.min(toeKey, r.toe); nKey++; }
  for (let i = 1; i < R.length - 1; i++) { if (!(R[i - 1].mode === 'slide' && R[i].mode === 'slide' && R[i + 1].mode === 'slide')) continue;
    for (const k in keys) { const f = keys[k], d = f(R[i + 1]).clone().sub(f(R[i])).sub(f(R[i]).clone().sub(f(R[i - 1]))).length() * 1000; if (d > out[k].v) { out[k].v = d; out[k].t = R[i].t; } if (d > 3) out[k].n++; }
    const dt = Math.abs(R[i + 1].toe - 2 * R[i].toe + R[i - 1].toe); if (dt > toeD.v) toeD = { v: dt, t: R[i].t }; }
  console.log(id.padEnd(10) + Object.keys(keys).map(k => `${k} ${out[k].v.toFixed(2)}@${out[k].t.toFixed(2)}(n>3:${out[k].n})`).join(' | ') + ` | toe-angle d2 ${toeD.v.toFixed(1)}°@${toeD.t.toFixed(2)} | key(s>=.95, n=${nKey}): a min ${aKey.toFixed(1)} toe min ${toeKey.toFixed(1)}`);
}
