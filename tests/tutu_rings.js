// per-ring minimum clearance (signed distance to limb capsule surface; negative = vertex inside the limb) over all moves, legs vs arms
globalThis.THREE = require('../vendor/three.min.js'); globalThis.window = globalThis;
require('../src/core.js'); window.BalletCore = globalThis.BalletCore; window.THREE = THREE;
require('../src/figure.js'); require('../src/tutu.js');
const C = globalThis.BalletCore, TU = window.BalletTutu, { V3 } = C;
const scene = new THREE.Scene(), tutu = TU.build(scene);
const NR = TU.NR, NA = TU.NA;
const minLeg = Array.from({ length: NR + 1 }, () => 1e9), minArm = Array.from({ length: NR + 1 }, () => 1e9);
const atLeg = [], atArm = [];
const SPS = +(process.env.SPS || 20);
for (const def of C.MOVES) {
  const Cm = C.compileMove(def, 70), N = Math.round(Cm.total * SPS); let prevXZ = null;
  for (let i = 0; i <= N; i++) {
    const t = Cm.total * i / N, pose = C.solvePose(C.evalParams(Cm, t, { polish: !!process.env.POLISH }), prevXZ); prevXZ = V3(pose.pp.x, 0, pose.pp.z);
    tutu.update(pose, false, 1);
    tutu.layers.forEach((ly, k) => {
      const pos = ly.pos;
      for (let v = NA * 3, vi = NA; v < pos.length; v += 3, vi++) {
        const ring = Math.floor(vi / NA), x = pos[v], y = pos[v + 1], z = pos[v + 2];
        tutu.caps.forEach((c, ci) => {
          const qx = x - c.ax, qy = y - c.ay, qz = z - c.az;
          let tt = (qx * c.dx + qy * c.dy + qz * c.dz) * c.inv; tt = Math.max(0, Math.min(1, tt));
          const s = Math.hypot(qx - c.dx * tt, qy - c.dy * tt, qz - c.dz * tt) - (c.ra + (c.rb - c.ra) * tt) - ly.margin;
          const isLeg = (ci % 5) < 2;
          const arr = isLeg ? minLeg : minArm, at = isLeg ? atLeg : atArm;
          if (s < arr[ring]) { arr[ring] = s; at[ring] = `${def.id}@${t.toFixed(2)} L${k} cap${ci}`; }
        });
      }
    });
  }
}
console.log('ring  leg(mm below margin)  arm(mm below margin)   [negative = inside margin]');
for (let r = 1; r <= NR; r++) console.log(String(r).padStart(2), (minLeg[r] * 1000).toFixed(1).padStart(8), ' ', atLeg[r].padEnd(34), (minArm[r] * 1000).toFixed(1).padStart(8), ' ', atArm[r]);
