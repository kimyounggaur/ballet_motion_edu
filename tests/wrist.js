globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js'); const C = globalThis.BalletCore;
const id = process.argv[2] || 'demi-plie', t0 = +process.argv[3] || 12, t1 = +process.argv[4] || 14.4, side = process.argv[5] || 'R';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
const rows = [];
for (let t = t0; t <= t1 + 1e-9; t += 0.2) {
  const r = [t.toFixed(1)];
  for (const pol of [false, true]) {
    const P = C.evalParams(Cm, t, { polish: pol }), pose = C.solvePose(P, null);
    const a = pose.arms[side], fd = a.W.clone().sub(a.E).normalize();
    // hand direction = local -Y of qHand ... qHand maps hand frame: use the same convention as the tip: W + (0,-1,0)·qHand
    const hd = new THREE.Vector3(0, -1, 0).applyQuaternion(a.qHand);
    const bend = Math.acos(Math.min(1, Math.max(-1, fd.dot(hd)))) * 180 / Math.PI;
    const elbowH = a.E.y.toFixed(3);
    r.push('wristBend ' + bend.toFixed(1).padStart(5), 'W.y ' + a.W.y.toFixed(3), 'tipY ' + (a.W.y + hd.y * 0.17).toFixed(3));
  }
  rows.push(r.join('  '));
}
console.log('t     [v3] ................................ [2단계]');
console.log(rows.join('\n'));
