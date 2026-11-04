// toe-angle and tip d2 over the arabesque's two air<->slide transitions for several TOE_OPEN values.  usage: node s5_air.js CORE.js [W_mm list]
globalThis.THREE = require('../vendor/three.min.js');
const Ws = (process.argv[3] || '4,8,12,16,24').split(',').map(Number);
for (const W of Ws) {
  globalThis.__TOE_OPEN = W / 1000; globalThis.__TOE_D1 = (+process.env.D1 || 1.5) / 1000; delete globalThis.BalletCore;
  const p = require('path').resolve(process.argv[2]); delete require.cache[p]; require(p);
  const C = globalThis.BalletCore, def = C.MOVES.find(m => m.id === 'arabesque'), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
  let prev = null; const R = [];
  for (let i = 0; i <= n; i++) { const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish: true }), prev); prev = pose.warm; const l = pose.legs.R; R.push({ t, m: l.mode, toe: l.toe, T: l.tipPt.clone(), B: l.ballPt.clone(), H: l.heelPt.clone(), A: l.A.clone() }); }
  let tmax = 0, tt = 0, pmax = 0, pt = 0, bmax = 0, nb = 0; const inWin = t => (t > 5.6 && t < 6.7) || (t > 10.3 && t < 11.12);
  for (let i = 1; i < R.length - 1; i++) {
    if (!inWin(R[i].t)) continue;
    const dt = Math.abs(R[i + 1].toe - 2 * R[i].toe + R[i - 1].toe); if (dt > tmax) { tmax = dt; tt = R[i].t; }
    for (const k of ['T', 'B', 'H']) { const d = R[i + 1][k].clone().sub(R[i][k]).sub(R[i][k].clone().sub(R[i - 1][k])).length() * 1000; if (d > pmax) { pmax = d; pt = R[i].t; } if (d > 3) nb++; }
  }
  console.log(`W=${String(W).padStart(2)}mm  toe-angle d2 max ${tmax.toFixed(1)}° @${tt.toFixed(2)} | foot-point d2 max ${pmax.toFixed(2)} @${pt.toFixed(2)} (n>3: ${nb})`);
}
