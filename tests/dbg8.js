globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE; const V3=C.V3, qAx=C.qAx, B=C.BODY;
for (const [mv, ki] of [['arabesque',6],['tendu',3],['tendu',5],['tendu',7]]) {
const def = C.MOVES.find(m=>m.id===mv); const Cm = C.compileMove(def, 70);
const S=Cm.poses[ki].legs.R;
let row=[];
for (let a=0;a<=95;a+=5){
  const qF=S.qShin.clone().multiply(qAx(new T3.Vector3(1,0,0),a));
  const bj=S.A.clone().add(B.ballJ.clone().applyQuaternion(qF));
  const ball=S.A.y+B.ballBot.clone().applyQuaternion(qF).y;
  const tip=bj.y+B.toeTip.clone().applyQuaternion(qF.clone().multiply(qAx(new T3.Vector3(1,0,0),10))).y;
  row.push(`${a}:${(Math.min(ball,tip)*100).toFixed(1)}`);
}
console.log(mv, ki, row.join(' '));
}
