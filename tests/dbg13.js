globalThis.THREE = require('../vendor/three.min.js');
require('../src/core.js');
const C = globalThis.BalletCore;
const Cm = C.compileMove(C.MOVES[0], 70);
const P=C.evalParams(Cm,7.5);
console.log('w',P.w,'knee',P.knee,'pelvis',P.pelvis, 'modes', P.legs.R.mode, P.legs.L.mode);
const p=C.solvePose(P,null);
for (const s of ['R','L']) { const l=p.legs[s]; console.log(s,'H',l.H.toArray().map(v=>v.toFixed(3)),'A',l.A.toArray().map(v=>v.toFixed(3)),'dist',l.H.distanceTo(l.A).toFixed(4)); }
console.log('roll',p.autoRoll,'pp',p.pp.toArray().map(v=>v.toFixed(3)));
