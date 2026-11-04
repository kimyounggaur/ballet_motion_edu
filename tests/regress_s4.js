// Stage-4 solver vs Stage-3 solver: per move, how far do the main points differ (continuous 60 fps chains)?
//   node regress_s4.js [dt=0.0167]   (env POLISH=1)
globalThis.THREE = require('../vendor/three.min.js');
require('../backup_s3/core_before_stage4.js'); const A = globalThis.BalletCore; delete globalThis.BalletCore;
require('../src/core.js'); const B = globalThis.BalletCore;
const dt = +(process.argv[2] || 1 / 60), opt = { polish: !!process.env.POLISH };
for (const def of B.MOVES) {
  const Ca = A.compileMove(def, 70), Cb = B.compileMove(def, 70);
  let pa = null, pb = null; const w = {}; const bump = (k, v, t) => { if (!w[k] || v > w[k].v) w[k] = { v, t }; };
  for (let t = 0; t <= Cb.total + 1e-9; t += dt) {
    const sa = A.solvePose(A.evalParams(Ca, t, opt), pa), sb = B.solvePose(B.evalParams(Cb, t, opt), pb); pa = sa.warm; pb = sb.warm;
    bump('pp', sa.pp.distanceTo(sb.pp), t); bump('HJ', sa.HJ.distanceTo(sb.HJ), t); bump('com', sa.com.distanceTo(sb.com), t);
    bump('roll°', Math.abs(sa.autoRoll - sb.autoRoll), t);
    for (const s of ['R', 'L']) { bump('A' + s, sa.legs[s].A.distanceTo(sb.legs[s].A), t); bump('K' + s, sa.legs[s].K.distanceTo(sb.legs[s].K), t); bump('W' + s, sa.arms[s].W.distanceTo(sb.arms[s].W), t); }
  }
  console.log(def.id.padEnd(11) + Object.entries(w).map(([k, o]) => `${k} ${k === 'roll°' ? o.v.toFixed(3) : (o.v * 1000).toFixed(2) + 'mm'}@${o.t.toFixed(2)}`).join('  '));
}
