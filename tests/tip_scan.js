// flag tip/ankle second-difference spikes over a window with a fine step: node tip_scan.js MOVE t0 t1 dt [side] ; env POLISH, THR(mm)
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require('../src/core.js');
const C = globalThis.BalletCore;
const id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], dt = +process.argv[5], side = process.argv[6] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
const rows = []; let prev = null;
if (!process.env.NOWARM) for (let t = Math.max(0, t0 - 0.5); t < t0; t += 0.0133) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
for (let t = t0; t <= t1 + 1e-9; t += dt) { const pose = C.solvePose(C.evalParams(Cm, t, opt), prev); prev = pose.warm; const l = pose.legs[side]; rows.push({ t, A: l.A.clone(), tip: l.tipPt.clone(), toe: l.toe, mode: l.mode, br: l.dbg ? l.dbg.br : -1, a: l.a }); }
const thr = +(process.env.THR || 1);
for (let i = 1; i < rows.length - 1; i++) {
  const d2a = rows[i + 1].A.clone().sub(rows[i].A).sub(rows[i].A.clone().sub(rows[i - 1].A)).length() * 1000;
  const d2t = rows[i + 1].tip.clone().sub(rows[i].tip).sub(rows[i].tip.clone().sub(rows[i - 1].tip)).length() * 1000;
  if (Math.max(d2a, d2t) > thr) console.log(rows[i].t.toFixed(5), rows[i].mode, 'd2A', d2a.toFixed(2), 'd2Tip', d2t.toFixed(2), 'toe', rows[i - 1].toe.toFixed(2), rows[i].toe.toFixed(2), rows[i + 1].toe.toFixed(2), 'a', (rows[i].a ?? 0).toFixed(2), 'br', rows[i].br);
}
