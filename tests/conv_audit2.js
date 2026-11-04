// solver convergence audit over all moves (uses pose.iters/pose.resid): node conv_audit2.js [dt=1/60] (env POLISH, CORE)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore;
const dt = +(process.argv[2] || 1 / 60), opt = { polish: !!process.env.POLISH };
let tot = 0, totT = 0;
for (const m of C.MOVES) {
  const Cm = C.compileMove(m, 70);
  let prev = null, n = 0, bad = 0, worst = 0, worstT = 0, sumIt = 0, maxIt = 0;
  const t0 = Date.now();
  for (let t = 0; t <= Cm.total + 1e-9; t += dt) {
    const pose = C.solvePose(C.evalParams(Cm, t, opt), prev); prev = pose.warm;
    n++; sumIt += pose.iters; maxIt = Math.max(maxIt, pose.iters);
    if (pose.iters >= 40 || pose.resid > 1e-5) { bad++; if (pose.resid > worst) { worst = pose.resid; worstT = t; } }
  }
  const ms = Date.now() - t0; tot += n; totT += ms;
  console.log(`${m.id.padEnd(14)} frames ${String(n).padStart(5)}  unconverged ${String(bad).padStart(4)} (${(100 * bad / n).toFixed(1)}%)  iters mean ${(sumIt / n).toFixed(1)} max ${maxIt}  worst resid ${(worst * 1000).toFixed(4)} mm @ ${worstT.toFixed(2)}   ${(ms / n).toFixed(3)} ms/frame`);
}
console.log(`all: ${(totT / tot).toFixed(3)} ms/frame`);
