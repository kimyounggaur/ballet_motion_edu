globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const tip = a => a.W.clone().add(new T3.Vector3(0,-0.165,0.02).applyQuaternion(a.qHand));
for (const [nm,mv,t] of [['low','positions',2],['first','demi-plie',2],['second','demi-plie',4.2],['fifth','positions',19.5]]) {
  const Cm=C.compileMove(C.MOVES.find(m=>m.id===mv),70); const P=C.evalParams(Cm,t); const p=C.solvePose(P,null);
  const R=p.arms.R, L=p.arms.L, tR=tip(R), tL=tip(L);
  const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
  const elbowAng = a => { const u=a.S.clone().sub(a.E).normalize(), v=a.W.clone().sub(a.E).normalize(); return (Math.acos(u.dot(v))*180/Math.PI).toFixed(0); };
  console.log(nm.padEnd(7),'tipGap',(tR.distanceTo(tL)*100).toFixed(1)+'cm','tipR',f(tR),'wristR',f(R.W),'elbowR',f(R.E),'elbowAngle',elbowAng(R),'S',f(R.S), 'navelY', (p.pp.y+0.12).toFixed(3));
}
