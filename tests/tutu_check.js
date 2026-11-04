// Numeric check of the tutu: penetration of the limbs, push size, frame-to-frame jumps of the skirt relative to the pelvis.
// usage: node tutu_check.js [move] [mistake]   env: POLISH=1, MIRROR=1, SPS=samples per count (default 40)
globalThis.THREE = require('../vendor/three.min.js'); globalThis.window = globalThis;
require('../src/core.js'); window.BalletCore = globalThis.BalletCore; window.THREE = THREE;
require('../src/figure.js');
require('../src/tutu.js');
const C = globalThis.BalletCore, TU = window.BalletTutu;
const { RL, V3 } = C;
const only = process.argv[2], mistake = process.argv[3];
const SPS = +(process.env.SPS || 40), MIRROR = !!process.env.MIRROR;
const scene = new THREE.Scene();
const tutu = TU.build(scene);
const NV = TU.NA * (TU.NR + 1);
let ALL = { pen0: 1e9, penM: 1e9, push: 0, jump: 0, jumpAt: '', ms: 0, frames: 0, hover: 0 };
for (const def of C.MOVES) {
  if (only && def.id !== only) continue;
  const Cm = C.compileMove(def, 70);
  const N = Math.round(Cm.total * SPS);
  let prevXZ = null, prevRel = null;
  const W = { legPen: 1e9, legAt: '', armPen: 1e9, armAt: '', pen0: 1e9, penM: 1e9, push: 0, jump: 0, jumpAt: '', maxLift: 0, ms: 0, pen0At: '', penMAt: '', pushAt: '' };
  for (let i = 0; i <= N; i++) {
    const t = Cm.total * i / N;
    let P = C.evalParams(Cm, t, { polish: !!process.env.POLISH });
    if (mistake) P = C.applyMistake(P, mistake);
    const pose = C.solvePose(P, prevXZ); prevXZ = V3(pose.pp.x, 0, pose.pp.z);
    const t0 = process.hrtime.bigint();
    tutu.update(pose, MIRROR, 1);
    W.ms += Number(process.hrtime.bigint() - t0) / 1e6;
    // penetration: distance of every moved vertex to every capsule, against the layer's margin
    const caps = tutu.caps;
    const sx = MIRROR ? -1 : 1;
    const Rinv = new THREE.Matrix4().makeRotationFromQuaternion(pose.Rp).transpose().elements;
    const rel = [];
    tutu.layers.forEach((ly, k) => {
      const pos = ly.pos, r = new Float32Array(NV * 3);
      for (let v = 0; v < NV * 3; v += 3) {
        const x = sx * pos[v], y = pos[v + 1], z = pos[v + 2];
        if (!isFinite(x + y + z)) { console.log('NaN', def.id, t); process.exit(1); }
        // pelvis-frame position, compared with the rest position = the collision offset
        const dx = x - pose.pp.x, dy = y - pose.pp.y, dz = z - pose.pp.z;
        const px = Rinv[0] * dx + Rinv[4] * dy + Rinv[8] * dz, py = Rinv[1] * dx + Rinv[5] * dy + Rinv[9] * dz, pz = Rinv[2] * dx + Rinv[6] * dy + Rinv[10] * dz;
        r[v] = px; r[v + 1] = py; r[v + 2] = pz;
        const off = Math.hypot(px - ly.rest[v], py - ly.rest[v + 1], pz - ly.rest[v + 2]);
        if (off > W.push) { W.push = off; W.pushAt = `L${k} v${v / 3} t=${t.toFixed(2)}`; }
        if (v >= TU.NA * 3) {
          for (const c of caps) {
            const qx = x - c.ax, qy = y - c.ay, qz = z - c.az;
            let tt = (qx * c.dx + qy * c.dy + qz * c.dz) * c.inv; tt = Math.max(0, Math.min(1, tt));
            const wx = qx - c.dx * tt, wy = qy - c.dy * tt, wz = qz - c.dz * tt;
            const s = Math.hypot(wx, wy, wz) - (c.ra + (c.rb - c.ra) * tt);
            const ci = caps.indexOf(c), isLeg = (ci % 5) < 2;
            if (isLeg) { if (s - ly.margin < W.legPen) { W.legPen = s - ly.margin; W.legAt = `L${k} v${v / 3} cap${ci} t=${t.toFixed(2)}`; } }
            else if (s - ly.margin < W.armPen) { W.armPen = s - ly.margin; W.armAt = `L${k} v${v / 3} cap${ci} t=${t.toFixed(2)}`; }
            if (s < W.pen0) { W.pen0 = s; W.pen0At = `L${k} v${v / 3} cap${caps.indexOf(c)} t=${t.toFixed(2)}`; }
            if (s - ly.margin < W.penM) { W.penM = s - ly.margin; W.penMAt = `L${k} v${v / 3} cap${caps.indexOf(c)} t=${t.toFixed(2)}`; }
          }
        }
      }
      rel.push(r);
    });
    if (prevRel) {
      for (let k = 0; k < rel.length; k++) {
        for (let v = 0; v < NV * 3; v += 3) {
          const j = Math.hypot(rel[k][v] - prevRel[k][v], rel[k][v + 1] - prevRel[k][v + 1], rel[k][v + 2] - prevRel[k][v + 2]);
          if (j > W.jump) { W.jump = j; W.jumpAt = `L${k} v${v / 3} t=${t.toFixed(2)}`; }
        }
      }
    }
    prevRel = rel;
  }
  console.log(def.id.padEnd(10), `legs: ${(W.legPen * 1000).toFixed(2)} mm below margin @ ${W.legAt}; arms: ${(W.armPen * 1000).toFixed(1)} mm @ ${W.armAt};`, 'min clearance to limbs', (W.pen0 * 1000).toFixed(2), 'mm; below margin', (W.penM * 1000).toFixed(2), 'mm @', W.pen0At, '; max push', (W.push * 1000).toFixed(0), 'mm @', W.pushAt, '; max jump/sample', (W.jump * 1000).toFixed(2), 'mm @', W.jumpAt, '; update', (W.ms / (N + 1)).toFixed(2), 'ms');
  ALL.pen0 = Math.min(ALL.pen0, W.pen0); ALL.penM = Math.min(ALL.penM, W.penM); ALL.push = Math.max(ALL.push, W.push); ALL.jump = Math.max(ALL.jump, W.jump); ALL.ms += W.ms; ALL.frames += N + 1;
}
console.log('ALL  min clearance', (ALL.pen0 * 1000).toFixed(2), 'mm; worst below margin', (ALL.penM * 1000).toFixed(2), 'mm; max push', (ALL.push * 1000).toFixed(0), 'mm; max jump/sample', (ALL.jump * 1000).toFixed(2), 'mm; mean update', (ALL.ms / ALL.frames).toFixed(2), 'ms/frame');
