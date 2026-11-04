globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js'); const B = globalThis.BalletCore;
let worst = 0, wt = '';
for (const def of B.MOVES) {
  const C = B.compileMove(def, 70); let pa = null, pb = null;
  for (let k = 0; k < C.ts.length; k++) {
    const t = C.ts[k];
    const sa = B.solvePose(B.evalParams(C, t), pa), sb = B.solvePose(B.evalParams(C, t, { polish: true }), pb); pa = sa.warm; pb = sb.warm;
    const arms = ['R','L'].map(s => sa.arms[s].W.distanceTo(sb.arms[s].W));
    const legs = ['R','L'].map(s => sa.legs[s].A.distanceTo(sb.legs[s].A) + sa.legs[s].K.distanceTo(sb.legs[s].K));
    const m = Math.max(sa.pp.distanceTo(sb.pp), ...legs, ...arms);
    if (m > worst) { worst = m; wt = def.id + '@' + t; }
  }
}
console.log('polish vs classic at key times: max wrist/ankle/knee/pelvis difference', worst.toExponential(2), wt);
