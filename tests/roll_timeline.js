// pelvis y / roll / modes along a move (continuous chain): node roll_timeline.js [move=positions] [step=0.25]  (env CORE, POLISH)
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore;
const id = process.argv[2] || 'positions', step = +(process.argv[3] || 0.25), fine = 1 / 60;
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null, next = 0;
for (let t = 0; t <= Cm.total + 1e-9; t += fine) {
  const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
  if (t + 1e-9 >= next) {
    next += step;
    console.log(`t=${t.toFixed(2).padStart(6)} R:${P.legs.R.mode.padEnd(5)} L:${P.legs.L.mode.padEnd(5)} w=${P.w.toFixed(2)} roll=${pose.autoRoll.toFixed(3).padStart(7)} pp=(${(pose.pp.x*1000).toFixed(1).padStart(7)},${(pose.pp.y*1000).toFixed(2).padStart(8)},${(pose.pp.z*1000).toFixed(1).padStart(7)})  Rankle.y=${(pose.legs.R.A.y*1000).toFixed(1).padStart(6)} dR=${(pose.legs.R.H.distanceTo(pose.legs.R.A)*1000).toFixed(3)} dL=${(pose.legs.L.H.distanceTo(pose.legs.L.A)*1000).toFixed(3)}`);
  }
}
