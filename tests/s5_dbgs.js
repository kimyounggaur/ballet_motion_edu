globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = true; globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], T = +process.argv[3];
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60;
let prev = null, pose = null; for (let tt = 0; tt <= T + 1e-9; tt += step) { pose = C.solvePose(C.evalParams(Cm, tt, { polish: true }), prev); prev = pose.warm; }
const l = pose.legs.R, g = l.dbg; console.log('t', T, 'br', g.br, 'r0', (g.r0*1000).toFixed(1), 'a', g.a.toFixed(2), 's_eff', g.s.toFixed(3), 'toe', l.toe.toFixed(1), 'tFlex', g.tFlex.toFixed(1), 'tHold', g.tHold.toFixed(1));
const lg = g.legAt(g.r0); const a = g.a;
for (const s of [0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1]) { const m = g.mk(s); console.log('s', s.toFixed(2), 'pen', (m.pen(lg, a) * 1000).toFixed(2), 'reach', (m.reach(lg, a) * 1000).toFixed(2), 'tFlex', m.tf.toFixed(1), 'tHold', m.th.toFixed(1), 'ks', (m.ks*1000).toFixed(1)); }
