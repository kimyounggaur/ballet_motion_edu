// pen(a) landscape of the sliding foot at one instant: node pen_curve.js move t [polish=1]   env CORE
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__PENDUMP = true;
require(require('path').resolve(process.env.CORE || 'core_x.js'));
const C = globalThis.BalletCore, id = process.argv[2], t = +process.argv[3], polish = (process.argv[4] || '1') !== '0';
const Cm = C.compileMove(C.MOVES.find(m => m.id === id), 70);
let prev = null; const def = Cm.def, FPS = 60, step = (def.bpm / 60) / FPS;
for (let tt = Math.max(0, t - 1.5); tt < t - 1e-9; tt += step) prev = C.solvePose(C.evalParams(Cm, tt, { polish }), prev).warm;
const pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev), l = pose.legs.R, g = l.dbg;
console.log(`t=${t} mode=${l.mode} br=${g.br} r0=${(g.r0*1000).toFixed(1)} r=${(g.r*1000).toFixed(1)} a_auth=${g.a0.toFixed(1)} a=${g.a.toFixed(1)} s=${g.s.toFixed(3)} A.y=${(l.A.y*1000).toFixed(1)}`);
console.log('a(deg):   pen(mm)   reach(mm)');
console.log(g.penCurve.map(([x, p, r]) => `${String(x).padStart(4)}: ${p.toFixed(1).padStart(7)} ${r.toFixed(1).padStart(7)}`).join('\n'));
