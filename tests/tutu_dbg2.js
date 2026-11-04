globalThis.THREE = require('../vendor/three.min.js'); globalThis.window = globalThis;
require('../src/core.js'); window.BalletCore = globalThis.BalletCore; window.THREE = THREE;
require('../src/figure.js'); require('../src/tutu.js');
const C = globalThis.BalletCore, TU = window.BalletTutu, { V3, RL } = C;
const scene = new THREE.Scene(); const tutu = TU.build(scene);
const def = C.MOVES.find(m => m.id === (process.argv[2] || 'demi-plie'));
const Cm = C.compileMove(def, 70);
const k = +process.argv[3], vi = +process.argv[4], t0 = +process.argv[5], t1 = +process.argv[6];
let prev = null, pose;
for (let tt = 0; tt <= t1 + 1e-9; tt += (+process.argv[7] || 0.025)) {
  pose = C.solvePose(C.evalParams(Cm, tt, {}), prev); prev = V3(pose.pp.x, 0, pose.pp.z);
  if (tt < t0 - 1e-9) continue;
  tutu.update(pose, false, 1);
  const ly = tutu.layers[k]; const v = vi * 3;
  const x = ly.pos[v], y = ly.pos[v + 1], z = ly.pos[v + 2];
  // rest in world
  const m = new THREE.Matrix4().makeRotationFromQuaternion(pose.Rp).elements;
  const rx = ly.rest[v], ry = ly.rest[v + 1], rz = ly.rest[v + 2];
  const wx = pose.pp.x + m[0] * rx + m[4] * ry + m[8] * rz, wy = pose.pp.y + m[1] * rx + m[5] * ry + m[9] * rz, wz = pose.pp.z + m[2] * rx + m[6] * ry + m[10] * rz;
  const ss = tutu.caps.map(c => { const qx = wx - c.ax, qy = wy - c.ay, qz = wz - c.az; let tt2 = Math.max(0, Math.min(1, (qx * c.dx + qy * c.dy + qz * c.dz) * c.inv)); return (Math.hypot(qx - c.dx * tt2, qy - c.dy * tt2, qz - c.dz * tt2) - (c.ra + (c.rb - c.ra) * tt2)) * 1000; });
  console.log(tt.toFixed(3), 'pos', [x, y, z].map(a => a.toFixed(3)).join(','), 'off', (Math.hypot(x - wx, y - wy, z - wz) * 1000).toFixed(1), 'mm; rest s per cap(mm):', ss.map(a => a.toFixed(0)).join(' '));
}
