globalThis.THREE = require('../vendor/three.min.js'); globalThis.window = globalThis;
require('../src/core.js'); window.BalletCore = globalThis.BalletCore; window.THREE = THREE;
require('../src/figure.js'); require('../src/tutu.js');
const C = globalThis.BalletCore, TU = window.BalletTutu, { V3, RL } = C;
const scene = new THREE.Scene(); const tutu = TU.build(scene);
const def = C.MOVES.find(m => m.id === (process.argv[2] || 'demi-plie'));
const Cm = C.compileMove(def, 70);
const t = +(process.argv[3] || 0.72);
let prev = null, pose;
for (let tt = 0; tt <= t + 1e-9; tt += 0.025) { pose = C.solvePose(C.evalParams(Cm, tt, {}), prev); prev = V3(pose.pp.x, 0, pose.pp.z); }
tutu.update(pose, false, 1);
const f = v => `(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
console.log('pp', f(pose.pp));
for (const s of RL) {
  console.log(s, 'H', f(pose.legs[s].H), 'K', f(pose.legs[s].K), 'A', f(pose.legs[s].A), ' S', f(pose.arms[s].S), 'E', f(pose.arms[s].E), 'W', f(pose.arms[s].W));
}
// worst vertex
let worst = null;
tutu.layers.forEach((ly, k) => {
  for (let v = TU.NA * 3; v < ly.pos.length; v += 3) {
    const x = ly.pos[v], y = ly.pos[v + 1], z = ly.pos[v + 2];
    tutu.caps.forEach((c, n) => {
      const qx = x - c.ax, qy = y - c.ay, qz = z - c.az;
      let tt = Math.max(0, Math.min(1, (qx * c.dx + qy * c.dy + qz * c.dz) * c.inv));
      const wx = qx - c.dx * tt, wy = qy - c.dy * tt, wz = qz - c.dz * tt;
      const s = Math.hypot(wx, wy, wz) - (c.ra + (c.rb - c.ra) * tt);
      if (!worst || s < worst.s) worst = { s, k, v: v / 3, n, x, y, z, i: (v / 3) % TU.NA, j: Math.floor(v / 3 / TU.NA) };
    });
  }
});
console.log('worst', worst, 'cap names: 0 R thigh,1 R shin,2 R upper,3 R fore,4 R hand,5 L thigh,...');
const c = tutu.caps[worst.n]; console.log('cap', JSON.stringify(c));
