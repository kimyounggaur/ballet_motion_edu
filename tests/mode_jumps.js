// ankle/tip jump across leg-mode switches: node mode_jumps.js CORE.js [dt]
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore; const dt = +(process.argv[3] || 0.001);
for (const pol of [0, 1]) for (const def of C.MOVES) {
  const Cm = C.compileMove(def, 70), opt = { polish: !!pol };
  let prev = null, last = null; const out = [];
  for (let t = 0; t <= Cm.total + 1e-9; t += dt) {
    const pose = C.solvePose(C.evalParams(Cm, t, opt), prev); prev = pose.warm;
    const cur = {};
    for (const s of ['R', 'L']) { const l = pose.legs[s]; cur[s] = { m: l.mode, A: l.A.clone(), tip: l.tipPt.clone(), K: l.K.clone(), toe: l.toe, a: l.a }; }
    if (last) for (const s of ['R', 'L']) if (cur[s].m !== last[s].m) {
      const ref = (o, k) => o[k];
      out.push(`${s}@${t.toFixed(3)} ${last[s].m}->${cur[s].m} ankle ${(cur[s].A.distanceTo(last[s].A) * 1000).toFixed(2)}mm tip ${(cur[s].tip.distanceTo(last[s].tip) * 1000).toFixed(2)}mm knee ${(cur[s].K.distanceTo(last[s].K) * 1000).toFixed(2)}mm toe ${Math.abs(cur[s].toe - last[s].toe).toFixed(1)}°`);
    }
    last = cur;
  }
  console.log(`pol=${pol} ${def.id.padEnd(11)}`, out.length ? '\n    ' + out.join('\n    ') : '(no switches)');
}
