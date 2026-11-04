// Dump sampled motion (world positions) for every move so speed/accel curves can be plotted before/after.
// usage: node tests/motion_dump.js OUT.json [turnout]
const fs = require('fs');
globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore, { V3 } = C;
const out = {}, T = +(process.argv[3] || 70), dt = 0.02;   // T = turnout per foot (slider 140 → 70)
for (const def of C.MOVES) {
  const Cm = C.compileMove(def, T), N = Math.round(Cm.total / dt);
  const s = { bpm: def.bpm, total: Cm.total, t: [], wR: [], wL: [], hR: [], hL: [], aR: [], aL: [], pel: [], head: [], com: [], kneeR: [], eyeY: [] };
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const t = i * dt, P = C.evalParams(Cm, t, { polish: !!process.env.POLISH }), pose = C.solvePose(P, prev);
    prev = pose.warm;
    s.t.push(t);
    s.wR.push(pose.arms.R.W.toArray()); s.wL.push(pose.arms.L.W.toArray());
    const tip = a => a.W.clone().add(V3(0, -0.17, 0).applyQuaternion(a.qHand)).toArray();
    s.hR.push(tip(pose.arms.R)); s.hL.push(tip(pose.arms.L));
    s.aR.push(pose.legs.R.A.toArray()); s.aL.push(pose.legs.L.A.toArray());
    s.pel.push(pose.pp.toArray()); s.head.push(P.head.slice()); s.com.push(pose.com.toArray());
    s.kneeR.push(pose.legs.R.K.toArray());
  }
  out[def.id] = s;
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log('wrote', process.argv[2], Object.keys(out).join(','));
