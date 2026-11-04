globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const f=v=>`(${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)})`;
const def = C.MOVES.find(m=>m.id==='arabesque'); const Cm = C.compileMove(def, 70);
const S=Cm.poses[6].legs.R;
const Z=new T3.Vector3(0,0,1), Y=new T3.Vector3(0,1,0);
console.log('static H',f(S.H),'K',f(S.K),'A',f(S.A),'thighZ',f(Z.clone().applyQuaternion(S.qThigh)),'shinZ',f(Z.clone().applyQuaternion(S.qShin)),'footZ',f(Z.clone().applyQuaternion(S.qFoot)),'footY',f(Y.clone().applyQuaternion(S.qFoot)));
for (const t of [11.0, 11.001, 11.02]) {
const P=C.evalParams(Cm,t); const pose=C.solvePose(P,null); const R=pose.legs.R;
console.log(t, 'run H',f(R.H),'K',f(R.K),'A',f(R.A),'thighZ',f(Z.clone().applyQuaternion(R.qThigh)),'shinZ',f(Z.clone().applyQuaternion(R.qShin)),'footZ',f(Z.clone().applyQuaternion(R.qFoot)),'a',R.a, 'fk.a', P.legs.R.fk.a, 'res', JSON.stringify(P.legs.R.fk.res));
}
