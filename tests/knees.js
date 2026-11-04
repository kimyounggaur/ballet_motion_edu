globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
for (const T of [60,70,80]) {
  const Cm = C.compileMove(C.MOVES[0], T); const out=[];
  for (const [name,t] of [['1st',3],['2nd',7.5],['3rd',11.5],['4th',15.5],['5th',19.5]]) {
    const P=C.evalParams(Cm,t), p=C.solvePose(P,null), m=C.measure(p,P);
    out.push(`${name}: kR ${m.legs.R.knee.toFixed(1)} kL ${m.legs.L.knee.toFixed(1)} roll ${p.autoRoll.toFixed(2)}`);
  }
  // tendu closed with weight on L
  const Ct=C.compileMove(C.MOVES[4],T); const P=C.evalParams(Ct,6), p=C.solvePose(P,null), m=C.measure(p,P);
  out.push(`tendu-closed: kR ${m.legs.R.knee.toFixed(1)} kL ${m.legs.L.knee.toFixed(1)} roll ${p.autoRoll.toFixed(2)}`);
  console.log('T='+T+'  '+out.join(' | '));
}
