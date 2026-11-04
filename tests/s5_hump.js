// right-branch tip contact angle R(s) and penetration at a=a_auth, warm-started.  usage: node s5_hump.js move t [rmm]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = true; globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], T = +process.argv[3];
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60;
let prev = null, pose = null; for (let tt = 0; tt <= T + 1e-9; tt += step) { pose = C.solvePose(C.evalParams(Cm, tt, { polish: true }), prev); prev = pose.warm; }
const l = pose.legs.R, g = l.dbg; const rmm = process.argv[4] ? +process.argv[4] : g.r0 * 1000;
console.log('t', T, 'r0', (g.r0 * 1000).toFixed(1), 'using r', rmm, 'a_auth', g.a0, 'Hy', (g.Hy * 1000).toFixed(1));
const lg = g.legAt(rmm / 1000);
const roots = (fn, lo0 = -40, hi0 = 120) => { const out = []; let prevv = fn(lo0), pa = lo0; for (let a = lo0 + 0.25; a <= hi0; a += 0.25) { const v = fn(a); if ((v >= 0) !== (prevv >= 0)) { let lo = pa, hi = a; for (let j = 0; j < 40; j++) { const m = (lo + hi) / 2; if ((fn(m) >= 0) === (prevv >= 0)) lo = m; else hi = m; } out.push(+((lo + hi) / 2).toFixed(2)); } prevv = v; pa = a; } return out; };
console.log(' s    tFlex  tHold   pen@a_auth(mm)  pen roots (a)               reach roots');
for (const s of [0, 0.2, 0.35, 0.5, 0.57, 0.7, 0.8, 0.83, 0.9, 0.94, 0.97, 0.99, 1]) { const m = g.mk(s);
  console.log(s.toFixed(2).padStart(4), m.tf.toFixed(1).padStart(7), m.th.toFixed(1).padStart(7), (m.pen(lg, g.a0) * 1000).toFixed(2).padStart(10), '  ', JSON.stringify(roots(x => m.pen(lg, x))).padEnd(28), JSON.stringify(roots(x => m.reach(lg, x)))); }
