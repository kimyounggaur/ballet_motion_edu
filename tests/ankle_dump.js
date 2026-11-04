// frame-rate (60 fps) ankle / tip / toe samples for the working leg: node ankle_dump.js CORE.js OUT.json   env POLISH
const fs = require('fs'); globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore, out = {}, dtf = 60 / 70 / 60;
for (const id of ['tendu', 'arabesque']) {
  const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70), s = { t: [], A: [], tip: [], toe: [], a: [] }; let prev = null;
  for (let t = 0; t <= Cm.total; t += dtf) { const pose = C.solvePose(C.evalParams(Cm, t, { polish: !!process.env.POLISH }), prev); prev = pose.warm; const l = pose.legs.R; s.t.push(t); s.A.push(l.A.toArray()); s.tip.push(l.tipPt.toArray()); s.toe.push(l.toe); s.a.push(l.a ?? 0); }
  out[id] = s;
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
