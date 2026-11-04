// Ported src/core.js vs experimental core_x5.js with the winning knobs: must be identical (all moves, turnouts, polish on/off).
//   node s5_equiv.js [T list] 
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = false;
globalThis.__K = {"sr":1,"s0":0.99,"dlo":0.022,"ft":0.0004,"scap":2,"d1":0.014};
require('./core_x5.js'); const A = globalThis.BalletCore; delete globalThis.BalletCore;
require('../src/core.js'); const B = globalThis.BalletCore;
const Ts = (process.argv[2] || '60,70,80').split(',').map(Number), dt = 1 / 60;
let worst = 0, cnt = 0;
for (const T of Ts) for (const polish of [true, false]) for (const def of B.MOVES) {
  const Ca = A.compileMove(def, T), Cb = B.compileMove(def, T); let pa = null, pb = null, w = 0, wt = 0;
  for (let t = 0; t <= Cb.total + 1e-9; t += dt) {
    const sa = A.solvePose(A.evalParams(Ca, t, { polish }), pa), sb = B.solvePose(B.evalParams(Cb, t, { polish }), pb); pa = sa.warm; pb = sb.warm;
    let m = Math.max(sa.pp.distanceTo(sb.pp), sa.HJ.distanceTo(sb.HJ), sa.com.distanceTo(sb.com)) * 1000;
    for (const s of ['R', 'L']) { const x = sa.legs[s], y = sb.legs[s];
      m = Math.max(m, x.A.distanceTo(y.A) * 1000, x.K.distanceTo(y.K) * 1000, x.heelPt.distanceTo(y.heelPt) * 1000, x.ballPt.distanceTo(y.ballPt) * 1000, x.tipPt.distanceTo(y.tipPt) * 1000, Math.abs((x.toe || 0) - (y.toe || 0)), Math.abs((x.a || 0) - (y.a || 0)));
      if (x.mode !== y.mode) m = Math.max(m, 999); }
    if (m > w) { w = m; wt = t; } cnt++;
  }
  worst = Math.max(worst, w);
  if (w > 1e-6) console.log(`T${T} polish${polish ? 1 : 0} ${def.id.padEnd(11)} max diff ${w.toExponential(2)} @${wt.toFixed(2)}`);
}
console.log('frames compared', cnt, '| worst diff (mm or deg):', worst.toExponential(3), worst < 1e-6 ? 'IDENTICAL' : 'DIFFERENT');
