globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js'); const C = globalThis.BalletCore;
const R2D = 180 / Math.PI;
for (const def of C.MOVES) {
  const Cm = C.compileMove(def, 70); let prev = null;
  const r = { ey: [1e9, -1e9], ep: [1e9, -1e9], hy: [1e9, -1e9], hp: [1e9, -1e9], hp0: [1e9, -1e9] }; let bad = 0;
  const up = (a, v) => { a[0] = Math.min(a[0], v); a[1] = Math.max(a[1], v); };
  for (let t = 0; t <= Cm.total + 1e-9; t += 0.05) {
    const P = C.evalParams(Cm, t, { polish: true }), pose = C.solvePose(P, prev); prev = pose.warm;
    const q = pose.Rt.clone().invert().multiply(pose.Rh), e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    if (![pose.eyes.yaw, pose.eyes.pitch, e.x, e.y].every(Number.isFinite)) bad++;
    up(r.ey, pose.eyes.yaw); up(r.ep, pose.eyes.pitch); up(r.hy, e.y * R2D); up(r.hp, e.x * R2D); up(r.hp0, P.head[1]);
  }
  const f = a => a.map(v => v.toFixed(1)).join('…');
  console.log(def.id.padEnd(11), 'eyes yaw', f(r.ey).padEnd(12), 'pitch', f(r.ep).padEnd(12), '| head yaw', f(r.hy).padEnd(12), 'pitch', f(r.hp).padEnd(12), '(keyed pitch', f(r.hp0) + ')', bad ? 'NaN×' + bad : '');
}
