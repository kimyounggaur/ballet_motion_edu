// Scan a move at a very fine step and flag single-sample ankle/tip jumps ("pops").
// usage: node pop_scan.js MOVE [dt=0.002] [side=R] [t0] [t1]    env POLISH=1 for the polish path
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require(require('path').resolve(process.env.CORE||'../src/core.js'));
const C = globalThis.BalletCore;
const id = process.argv[2] || 'tendu', dt = +(process.argv[3] || 0.002), side = process.argv[4] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
const T = Cm.total;
const t0 = +(process.argv[5] ?? 0), t1 = +(process.argv[6] ?? T);
const rows = [];
let prev = null;
for (let t = t0; t <= t1 + 1e-9; t += dt) {
  const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs[side];
  rows.push({ t, A: l.A.clone(), tip: l.tipPt.clone(), K: l.K.clone(), mode: l.mode, dbg: l.dbg, a: l.a, toe: l.toe });
}
// step sizes in mm; second difference measures a "kink" relative to local trend
const n = rows.length, out = [];
const stepOf = (i, key) => rows[i][key].distanceTo(rows[i - 1][key]) * 1000;
for (let i = 2; i < n - 2; i++) {
  const w = [];
  for (let k = -4; k <= 4; k++) { const j = i + k; if (j >= 1 && j < n) w.push(stepOf(j, 'A')); }
  w.sort((x, y) => x - y);
  const med = w[w.length >> 1];
  const s = stepOf(i, 'A'), st = stepOf(i, 'tip');
  // deviation of the position from the line through neighbours (second difference)
  const d2 = rows[i + 1].A.clone().sub(rows[i].A).sub(rows[i].A.clone().sub(rows[i - 1].A)).length() * 1000;
  out.push({ i, t: rows[i].t, s, st, med, d2, mode: rows[i].mode, br: rows[i].dbg ? rows[i].dbg.br : -1, r: rows[i].dbg ? rows[i].dbg.r : NaN, r0: rows[i].dbg ? rows[i].dbg.r0 : NaN });
}
const thr = +(process.env.THR || 1.0);
const flagged = out.filter(o => o.d2 > thr);
console.log(`${id} ${side} polish=${!!process.env.POLISH} dt=${dt} samples=${n}; maxStep=${Math.max(...out.map(o => o.s)).toFixed(2)}mm  maxD2=${Math.max(...out.map(o => o.d2)).toFixed(2)}mm`);
console.log('flagged (d2 > ' + thr + 'mm):', flagged.length);
for (const o of flagged.slice(0, +(process.env.MAXP || 60))) console.log(o.t.toFixed(3), o.mode.padEnd(5), 'step', o.s.toFixed(2), 'tipStep', o.st.toFixed(2), 'med', o.med.toFixed(2), 'd2', o.d2.toFixed(2), 'br', o.br, 'r0', o.r0.toFixed(4), 'r', o.r.toFixed(4));
