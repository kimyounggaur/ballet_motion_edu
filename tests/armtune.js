globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const tip = a => a.W.clone().add(new T3.Vector3(0,-0.165,0.02).applyQuaternion(a.qHand));
function evalArm(name, mv, t) {
  const Cm=C.compileMove(C.MOVES.find(m=>m.id===mv),70); const P=C.evalParams(Cm,t); const p=C.solvePose(P,null);
  const mid=p.T12.x, R=p.arms.R, L=p.arms.L, tR=tip(R), tL=tip(L);
  return { tipRx: tR.x-mid, tipY: tR.y, tipZ: tR.z-p.T12.z, gap: tR.x<tL.x ? tR.distanceTo(tL) : -tR.distanceTo(tL), wristZ: R.W.z-p.T12.z, wristY: R.W.y, elbowY: R.E.y, headY: p.HJ.y, elbowX: R.E.x-mid };
}
const show=(n,o)=>console.log(n.padEnd(7), Object.entries(o).map(([k,v])=>k+'='+(v*100).toFixed(1)).join(' '));
const cand = JSON.parse(process.argv[2]||'{}');
Object.assign(C.ARMS, cand);
show('first', evalArm('first','demi-plie',2));
show('fifth', evalArm('fifth','positions',19.5));
show('low', evalArm('low','positions',2));
