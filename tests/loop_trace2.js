globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve('./_core_dbg.js'));
const C = globalThis.BalletCore, { V3 } = C;
const T = +process.argv[2], id = process.argv[3] || 'positions';
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = Math.max(0, T - 1.0); t < T - 1e-9; t += 0.0167) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
const P = C.evalParams(Cm, T, opt);
console.log('prev warm', JSON.stringify(prev));
// replicate
let x = prev.x, z = prev.z, st = prev.roll, roll = st, dy = 0;
const tw = C.closedTwin(P);
for (let it = 0; it < 14; it++) {
  const Pr = C.rolled(P, roll);
  const pose = C.buildPose(Pr, V3(x, C.pelvisY(Pr, x, z) + dy, z));
  const tg = C.balanceTarget(Pr, pose);
  const dx = tg.x - pose.com.x, dz = tg.z - pose.com.z, e2 = dx * dx + dz * dz;
  let line = `it${it} x=${(x*1000).toFixed(3)} z=${(z*1000).toFixed(3)} roll=${roll.toFixed(4)} e=${(Math.sqrt(e2)*1000).toFixed(4)}mm push@roll=${C.rollPush(P,x,z,roll).toFixed(5)}`;
  if (e2 < 4e-4) { const r1 = C.solveRoll(P, x, z, st); line += ` r1=${r1.toFixed(5)} pushAtR1=${C.rollPush(P,x,z,r1).toExponential(2)}`; st = r1; roll = r1; }
  console.log(line);
  x += dx * 1.15; z += dz * 1.15;
}
