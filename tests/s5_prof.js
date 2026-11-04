// ball and tip heights vs foot angle at chosen radii (frame t of move), for toe stiffness s.   node s5_prof.js move t s r1,r2,...
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = true;
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], t = +process.argv[3], s = +process.argv[4], Rs = (process.argv[5] || '250,300,340,383').split(',').map(Number);
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
const step = (def.bpm / 60) / 60; let prevW = null, pose = null; for (let tt = Math.max(0, t - 1.2 * (def.bpm / 60) * 0 - 1.5); tt <= t + 1e-9; tt += step) { pose = C.solvePose(C.evalParams(Cm, tt, { polish: true }), prevW); prevW = pose.warm; }
const g = pose.legs.R.dbg, m = g.mk(s);
console.log(`t=${t} Hy=${(g.Hy*1000).toFixed(1)} s=${s} tHold=${m.th.toFixed(1)} tFlex=${m.tf.toFixed(1)}`);
for (const r of Rs) { const lg = g.legAt(r / 1000); console.log(`r=${r} h=${(lg.A.y*1000).toFixed(1)}`);
  let row = 'a     ', b = 'ball  ', th = 'tipH  ', tf = 'tipF  ';
  for (let a = 0; a <= 90; a += 5) { row += String(a).padStart(6); b += (g.ballY(lg, a) * 1000).toFixed(0).padStart(6); th += (g.tipY(lg, a, m.th) * 1000).toFixed(0).padStart(6); tf += (g.tipY(lg, a, m.tf) * 1000).toFixed(0).padStart(6); }
  console.log(row + '\n' + b + '\n' + th + '\n' + tf); }
