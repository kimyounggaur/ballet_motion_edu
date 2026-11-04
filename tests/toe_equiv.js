// Compare toe angle / ankle between two core versions over every move: node toe_equiv.js OLD.js NEW.js [dt]
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
const path = require('path');
function load(p) { delete globalThis.BalletCore; delete require.cache[path.resolve(p)]; require(path.resolve(p)); return globalThis.BalletCore; }
const A = load(process.argv[2]), B = load(process.argv[3]);
const dt = +(process.argv[4] || 0.01);
for (const pol of [0, 1]) for (const def of A.MOVES) {
  const ca = A.compileMove(def, 70), cb = B.compileMove(B.MOVES.find(m => m.id === def.id), 70);
  const o = { polish: !!pol };
  let pa = null, pb = null; const st = {};
  for (let t = 0; t <= ca.total + 1e-9; t += dt) {
    const Pa = A.evalParams(ca, t, o), Pb = B.evalParams(cb, t, o);
    const a = A.solvePose(Pa, pa), b = B.solvePose(Pb, pb); pa = a.warm; pb = b.warm;
    for (const s of ['R', 'L']) {
      const la = a.legs[s], lb = b.legs[s], k = la.mode + '/' + lb.mode;
      const e = st[k] || (st[k] = { n: 0, dToe: 0, dA: 0, toeAt: 0, big: 0 });
      e.n++; const dtoe = Math.abs(la.toe - lb.toe), dA = la.A.distanceTo(lb.A) * 1000;
      if (dtoe > e.dToe) { e.dToe = dtoe; e.toeAt = t; } e.dA = Math.max(e.dA, dA); if (dtoe > 0.01) e.big++;
    }
  }
  console.log(`pol=${pol} ${def.id.padEnd(12)}`, Object.entries(st).map(([k, e]) => `${k}: n=${e.n} maxΔtoe=${e.dToe.toFixed(2)}°@${e.toeAt.toFixed(2)} (>0.01°:${e.big}) maxΔA=${e.dA.toFixed(2)}mm`).join(' | '));
}
