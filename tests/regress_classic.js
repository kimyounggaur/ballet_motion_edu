// The classic path (no polish) must reproduce the v3 solver output exactly, except where the working foot slides on the floor
// (the contact solver was reworked in stage 3: smooth ball->toe contact, no thresholds, continuous toe).
globalThis.THREE = require('../vendor/three.min.js');
require('../backup_v3/core.js'); const A = globalThis.BalletCore; delete globalThis.BalletCore;
require('../src/core.js'); const B = globalThis.BalletCore;
let worst = 0, n = 0, wt = '', worstNS = 0, nNS = 0, wtNS = '', worstS = 0, wtS = '';
for (const def of B.MOVES) {
  const Ca = A.compileMove(def, 70), Cb = B.compileMove(def, 70);
  let pa = null, pb = null;
  for (let t = 0; t <= Cb.total + 1e-9; t += 0.05) {
    const Pa = A.evalParams(Ca, t), Pb = B.evalParams(Cb, t);
    const sa = A.solvePose(Pa, pa), sb = B.solvePose(Pb, pb); pa = sa.warm; pb = sb.warm;
    const pts = [['pp'], ['HJ'], ['com']].map(([k]) => sa[k].distanceTo(sb[k]));
    for (const s of ['R', 'L']) { pts.push(sa.legs[s].A.distanceTo(sb.legs[s].A), sa.arms[s].W.distanceTo(sb.arms[s].W), sa.legs[s].K.distanceTo(sb.legs[s].K)); }
    const m = Math.max(...pts); n++;
    if (m > worst) { worst = m; wt = def.id + '@' + t.toFixed(2); }
    const slide = sb.legs.R.mode === 'slide' || sb.legs.L.mode === 'slide' || sa.legs.R.mode === 'slide' || sa.legs.L.mode === 'slide';
    if (!slide) { nNS++; if (m > worstNS) { worstNS = m; wtNS = def.id + '@' + t.toFixed(2); } } else if (m > worstS) { worstS = m; wtS = def.id + '@' + t.toFixed(2); }
  }
}
console.log('classic path vs v3: samples', n, 'max point difference', worst.toExponential(2), 'at', wt);
console.log('  without sliding foot: samples', nNS, 'max', worstNS.toExponential(2), 'at', wtNS, '| with sliding foot: max', worstS.toExponential(2), 'at', wtS);
