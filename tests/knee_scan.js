// jitter of the pelvis, hips and knees across a whole move: node knee_scan.js [move=positions] [dt=0.002]  (env POLISH, CORE, THR=mm)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore;
const id = process.argv[2] || 'positions', dt = +(process.argv[3] || 0.002), THR = +(process.env.THR || 1.5);
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null; const rows = [];
for (let t = 0; t <= Cm.total + 1e-9; t += dt) {
  const pose = C.solvePose(C.evalParams(Cm, t, opt), prev); prev = pose.warm;
  rows.push({ t, pp: pose.pp.clone(), roll: pose.autoRoll, KR: pose.legs.R.K.clone(), KL: pose.legs.L.K.clone(), AR: pose.legs.R.A.clone(), mR: pose.legs.R.mode });
}
const d2 = (k, i) => rows[i + 1][k].clone().sub(rows[i][k]).sub(rows[i][k].clone().sub(rows[i - 1][k])).length() * 1000;
const keys = ['pp', 'KR', 'KL', 'AR'];
const worst = {}; for (const k of keys) worst[k] = { v: 0, t: 0 };
const ev = [];
for (let i = 1; i < rows.length - 1; i++) {
  let m = 0, who = '';
  for (const k of keys) { const v = d2(k, i); if (v > worst[k].v) worst[k] = { v, t: rows[i].t }; if (v > m) { m = v; who = k; } }
  if (m > THR) ev.push(`${rows[i].t.toFixed(3)} ${rows[i].mR.padEnd(5)} ${who} d2=${m.toFixed(2)}mm roll=${rows[i].roll.toFixed(3)}`);
}
console.log(`${id} polish=${!!opt.polish} dt=${dt}: worst d2 (mm) ` + keys.map(k => `${k} ${worst[k].v.toFixed(2)}@${worst[k].t.toFixed(3)}`).join('  '));
console.log('events > ' + THR + ' mm:', ev.length); console.log(ev.slice(0, +(process.env.MAXP || 50)).join('\n'));
