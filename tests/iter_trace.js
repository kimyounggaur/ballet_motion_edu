// per-iteration trace of solvePose at time T of a move (replicates the loop); node iter_trace.js T [move] [warmBackSteps]
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || './_core_dbg.js'));
const C = globalThis.BalletCore, { V3, clamp } = C;
const T = +process.argv[2], id = process.argv[3] || 'positions';
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), opt = { polish: !!process.env.POLISH };
let prev = null;
for (let t = Math.max(0, T - 1.0); t < T - 1e-9; t += 0.0167) prev = C.solvePose(C.evalParams(Cm, t, opt), prev).warm;
const P = C.evalParams(Cm, T, opt);
let x = prev.x, z = prev.z, roll = prev.roll || 0, pose;
const base = P.pelvis[1];
const withRoll = () => { const Q = Object.assign({}, P); Q.pelvis = [P.pelvis[0], base + roll, P.pelvis[2]]; return Q; };
console.log('start', JSON.stringify({ x, z, roll }), 'w', P.w.toFixed(3), 'modes', P.legs.R.mode, P.legs.L.mode, 'knee', P.knee);
for (let it = 0; it < 28; it++) {
  const Pr = withRoll();
  const yy = C.pelvisY(Pr, x, z);
  pose = C.buildPose(Pr, V3(x, yy, z));
  const tg = C.balanceTarget(Pr, pose);
  const dx = tg.x - pose.com.x, dz = tg.z - pose.com.z, e2 = dx * dx + dz * dz;
  let dr = 0; const fh = C.freeHipRoll(Pr, pose);
  if (e2 < 4e-4) { dr = 0.6 * fh; roll = clamp(roll + dr, -2.5, 2.5); }
  console.log(`it${String(it).padStart(2)} x=${(x*1000).toFixed(3)} z=${(z*1000).toFixed(3)} y=${(yy*1000).toFixed(4)} roll=${roll.toFixed(4)} dx=${(dx*1000).toFixed(4)} dz=${(dz*1000).toFixed(4)} fh=${fh.toFixed(5)} KR=${(pose.legs.R.K.x*1000).toFixed(2)},${(pose.legs.R.K.z*1000).toFixed(2)} KL=${(pose.legs.L.K.x*1000).toFixed(2)},${(pose.legs.L.K.z*1000).toFixed(2)} dR=${(pose.legs.R.H.distanceTo(pose.legs.R.A)*1000).toFixed(4)} dL=${(pose.legs.L.H.distanceTo(pose.legs.L.A)*1000).toFixed(4)}`);
  if (e2 < 1e-10 && Math.abs(dr) < 2e-3) { console.log('break'); break; }
  x += dx * 1.15; z += dz * 1.15;
}
