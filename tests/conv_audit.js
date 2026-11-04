// solver convergence audit over all moves: how often does the 28-iteration pelvis solve end unconverged?   node conv_audit.js [dt=0.0167] (env POLISH, CORE)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || './_core_dbg.js'));
const C = globalThis.BalletCore, { V3, clamp } = C;
const dt = +(process.argv[2] || 1 / 60), opt = { polish: !!process.env.POLISH };
function solveTrace(P, init) {
  let x = init ? init.x : 0, z = init ? init.z : 0, roll = init && init.roll ? init.roll : 0, last = null, it;
  const base = P.pelvis[1];
  const withRoll = () => { if (!roll) return P; const Q = Object.assign({}, P); Q.pelvis = [P.pelvis[0], base + roll, P.pelvis[2]]; return Q; };
  let e2 = 0, dr = 0;
  for (it = 0; it < 28; it++) {
    const Pr = withRoll();
    const pose = C.buildPose(Pr, V3(x, C.pelvisY(Pr, x, z), z));
    const tg = C.balanceTarget(Pr, pose);
    const dx = tg.x - pose.com.x, dz = tg.z - pose.com.z; e2 = dx * dx + dz * dz; dr = 0;
    if (e2 < 4e-4) { dr = 0.6 * C.freeHipRoll(Pr, pose); roll = clamp(roll + dr, -2.5, 2.5); }
    if (e2 < 1e-10 && Math.abs(dr) < 2e-3) break;
    x += dx * 1.15; z += dz * 1.15;
  }
  return { it, e2, dr, roll, x, z };
}
for (const m of C.MOVES) {
  const Cm = C.compileMove(m, 70);
  let prev = null, n = 0, bad = 0, worst = 0, worstT = 0, sumIt = 0;
  for (let t = 0; t <= Cm.total + 1e-9; t += dt) {
    const P = C.evalParams(Cm, t, opt);
    const r = solveTrace(P, prev); prev = { x: r.x, z: r.z, roll: r.roll };
    n++; sumIt += r.it;
    if (r.it >= 28) { bad++; const e = Math.sqrt(r.e2) * 1000 + Math.abs(r.dr); if (e > worst) { worst = e; worstT = t; } }
  }
  console.log(`${m.id.padEnd(14)} frames ${String(n).padStart(5)}  unconverged ${String(bad).padStart(5)} (${(100 * bad / n).toFixed(1)}%)  mean it ${(sumIt / n).toFixed(1)}  worst ${worst.toFixed(3)} @ ${worstT.toFixed(2)}`);
}
