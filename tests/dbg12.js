globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore; const T3=globalThis.THREE;
const f=v=>`(${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`;
const def = C.MOVES.find(m=>m.id===process.argv[2]); const Cm = C.compileMove(def, +process.argv[3]);
const t=+process.argv[4];
const P=C.evalParams(Cm,t); const p=C.solvePose(P,null); const m=C.measure(p,P);
for (const s of ['R','L']) { const l=p.legs[s]; const kz=new T3.Vector3(0,0,1).applyQuaternion(l.qThigh);
console.log(s, l.mode, 'H',f(l.H),'K',f(l.K),'A',f(l.A),'kneecap',f(kz),'phi',l.pl?l.pl.phi:'', 'knee', m.legs[s].knee.toFixed(1), 'align', m.legs[s].align&&m.legs[s].align.toFixed(1), 'off', m.legs[s].kneeOff);}
console.log('autoRoll', p.autoRoll, 'w', P.w);
