globalThis.THREE = require('../vendor/three.min.js'); require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore, id = process.argv[3], tStart = +process.argv[4], a = +process.argv[5], b = +process.argv[6];
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), dt = (def.bpm / 60) / 60, polish = true;
function chain(t0, t1) { let prev = null; const o = []; for (let t = t0; t <= t1 + 1e-9; t += dt) { const pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; const l = pose.legs.R; o.push({ t, A: l.A.clone().multiplyScalar(1000), pp: pose.pp.clone().multiplyScalar(1000), mode: l.mode, a: l.a, toe: l.toe }); } return o; }
const ref = chain(0, b + 0.2), cs = chain(tStart, b + 0.2);
const find = (arr, t) => arr.find(x => Math.abs(x.t - t) < 1e-6);
console.log('t      mode(ref/cs)  |A_cs-A_ref|  |pp_cs-pp_ref|  d2_ref  d2_cs   a_ref a_cs');
for (let i = 1; i < cs.length - 1; i++) {
  const c = cs[i]; if (c.t < a || c.t > b) continue; const r = find(ref, c.t); if (!r) continue;
  const j = ref.indexOf(r), d2r = ref[j + 1].A.clone().sub(r.A.clone().multiplyScalar(2)).add(ref[j - 1].A).length(), d2c = cs[i + 1].A.clone().sub(c.A.clone().multiplyScalar(2)).add(cs[i - 1].A).length();
  console.log(`${c.t.toFixed(3)}  ${r.mode.slice(0, 5)}/${c.mode.slice(0, 5)}  ${c.A.distanceTo(r.A).toFixed(2).padStart(8)}  ${c.pp.distanceTo(r.pp).toFixed(2).padStart(10)}  ${d2r.toFixed(2).padStart(7)} ${d2c.toFixed(2).padStart(7)}   ${r.a.toFixed(1).padStart(5)} ${c.a.toFixed(1).padStart(5)}`);
}
