// Frame-rate (60 fps) second difference of ankle/tip + hover, for several smooth-min widths.
// usage: node frame_d2.js CORE.js MOVE [side]    env SMIN_K, POLISH
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const id = process.argv[3], side = process.argv[4] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), opt = { polish: !!process.env.POLISH };
const dtf = 60 / 70 / 60;   // one 60 fps frame in counts at 70 bpm
let worst = { a: 0, t: 0, tip: 0, tt: 0, hover: 0, hv: 0 };
for (const phase of [0, 0.25, 0.5, 0.75]) {
  const rows = []; let prev = null;
  for (let t = phase * dtf; t <= Cm.total; t += dtf) { const pose = C.solvePose(C.evalParams(Cm, t, opt), prev); prev = pose.warm; const l = pose.legs[side]; rows.push({ t, A: l.A.clone(), tip: l.tipPt.clone(), y: Math.min(l.heelPt.y, l.ballPt.y, l.tipPt.y), mode: l.mode }); }
  for (let i = 1; i < rows.length - 1; i++) {
    if (rows[i].mode !== 'slide' && rows[i - 1].mode !== 'slide' && rows[i + 1].mode !== 'slide') continue;
    const d2a = rows[i + 1].A.clone().sub(rows[i].A).sub(rows[i].A.clone().sub(rows[i - 1].A)).length() * 1000;
    const d2t = rows[i + 1].tip.clone().sub(rows[i].tip).sub(rows[i].tip.clone().sub(rows[i - 1].tip)).length() * 1000;
    if (d2a > worst.a) { worst.a = d2a; worst.t = rows[i].t; }
    if (d2t > worst.tip) { worst.tip = d2t; worst.tt = rows[i].t; }
    if (rows[i].mode === 'slide' && Math.abs(rows[i].y) * 1000 > Math.abs(worst.hover)) { worst.hover = rows[i].y * 1000; worst.hv = rows[i].t; }
  }
}
console.log(`${id} pol=${!!process.env.POLISH} K=${process.env.SMIN_K ?? 'default'}: frame-D2 ankle ${worst.a.toFixed(2)}mm@${worst.t.toFixed(2)} tip ${worst.tip.toFixed(2)}mm@${worst.tt.toFixed(2)}  worst foot-floor gap ${worst.hover.toFixed(2)}mm@${worst.hv.toFixed(2)}`);
