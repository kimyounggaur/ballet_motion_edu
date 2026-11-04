// maxD2 (second difference of the ankle at dt) for every move / side / mode: node pop_all.js CORE.js [dt] 
globalThis.THREE = require('../vendor/three.min.js');
if (process.env.SMIN_K !== undefined) globalThis.__SMIN_K = +process.env.SMIN_K;
require(require('path').resolve(process.argv[2] || '../src/core.js'));
const C = globalThis.BalletCore;
const dt = +(process.argv[3] || 0.002);
for (const pol of [0, 1]) {
  for (const def of C.MOVES) {
    const Cm = C.compileMove(def, 70), opt = { polish: !!pol };
    const res = {};
    for (const side of ['R', 'L']) res[side] = [];
    let prev = null;
    for (let t = 0; t <= Cm.total + 1e-9; t += dt) {
      const P = C.evalParams(Cm, t, opt), pose = C.solvePose(P, prev); prev = pose.warm;
      for (const side of ['R', 'L']) res[side].push({ t, A: pose.legs[side].A.clone(), tip: pose.legs[side].tipPt.clone(), mode: pose.legs[side].mode });
    }
    const out = [];
    for (const side of ['R', 'L']) {
      const r = res[side]; let m = 0, at = 0, mt = 0, att = 0, slideN = 0;
      for (let i = 1; i < r.length - 1; i++) {
        if (r[i].mode === 'slide') slideN++;
        const d2 = r[i + 1].A.clone().sub(r[i].A).sub(r[i].A.clone().sub(r[i - 1].A)).length() * 1000;
        const d2t = r[i + 1].tip.clone().sub(r[i].tip).sub(r[i].tip.clone().sub(r[i - 1].tip)).length() * 1000;
        if (d2 > m) { m = d2; at = r[i].t; }
        if (d2t > mt) { mt = d2t; att = r[i].t; }
      }
      out.push(`${side}: ankleD2 ${m.toFixed(2)}@${at.toFixed(3)} tipD2 ${mt.toFixed(2)}@${att.toFixed(3)} slide=${slideN}`);
    }
    console.log(`pol=${pol} ${def.id.padEnd(12)} ${out.join(' | ')}`);
  }
}
