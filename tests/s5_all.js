// d2 (mm/frame^2 @60fps) over ALL frames (any leg mode, incl. air<->slide switches) of ankle/knee/heel/ball/tip + toe-angle d2, both legs, per move.
//   node s5_all.js CORE.js [moves] [polish=1]   env T=70
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore, polish = (process.argv[4] || '1') !== '0', only = (process.argv[3] || 'positions,demi-plie,grand-plie,releve,tendu,arabesque').split(',');
for (const id of only) {
  const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, +(process.env.T || 70)), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
  let prev = null; const R = [];
  for (let i = 0; i <= n; i++) { const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; const o = { t };
    for (const s of ['R', 'L']) { const l = pose.legs[s]; o[s] = { A: l.A.clone(), K: l.K.clone(), H: l.heelPt.clone(), B: l.ballPt.clone(), T: l.tipPt.clone(), toe: l.toe || 0 }; } R.push(o); }
  const worst = {}; const names = { A: 'ankle', K: 'knee', H: 'heel', B: 'ball', T: 'tip' };
  for (const s of ['R', 'L']) for (const k in names) { let m = 0, mt = 0, c3 = 0; for (let i = 1; i < R.length - 1; i++) { const f = r => r[s][k]; const d = f(R[i + 1]).clone().sub(f(R[i])).sub(f(R[i]).clone().sub(f(R[i - 1]))).length() * 1000; if (d > m) { m = d; mt = R[i].t; } if (d > 3) c3++; }
    const key = names[k]; if (!worst[key] || m > worst[key].m) worst[key] = { m, mt, s, c3: (worst[key] ? worst[key].c3 : 0) + c3 }; else worst[key].c3 += c3; }
  let tm = 0, tt = 0; for (const s of ['R', 'L']) for (let i = 1; i < R.length - 1; i++) { const d = Math.abs(R[i + 1][s].toe - 2 * R[i][s].toe + R[i - 1][s].toe); if (d > tm) { tm = d; tt = R[i].t; } }
  console.log(id.padEnd(10) + Object.keys(worst).map(k => `${k} ${worst[k].m.toFixed(2)}@${worst[k].mt.toFixed(2)}(n>3:${worst[k].c3})`).join(' | ') + ` | toe d2 ${tm.toFixed(1)}°@${tt.toFixed(2)}`);
}
