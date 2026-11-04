globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
const def = C.MOVES.find(m=>m.id==='positions'); const Cm = C.compileMove(def, 70);
console.log('key ankles R:', Cm.poses.map((p,i)=>`${Cm.ts[i]}:${p.legs.R.A.x.toFixed(3)},${p.legs.R.A.z.toFixed(3)}`).join('  '));
for (const t of [21.0, 21.5, 21.8, 21.9, 21.95]) {
  const P=C.evalParams(Cm,t); const p=C.solvePose(P,null); const R=p.legs.R;
  console.log(t, 'target', JSON.stringify(P.legs.R.ankle), 'H', f(R.H), 'A', f(R.A), 'el', R.el.toFixed(1), 'a', P.legs.R.fk.a.toFixed(1), 'knee', P.legs.R.fk.knee.toFixed(1), 'tau', P.legs.R.fk.tau.toFixed(1));
}
