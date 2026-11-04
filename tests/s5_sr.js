// SR prototype trace: t, br, r0, r, a_auth, a, lo, D(mm), mu, c(mm), s_auth, s_eff, h, ball, tip
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], every = +(process.argv[5] || 1), polish = (process.argv[6] || '1') !== '0';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
let prev = null; const f = (v, w = 6, d = 1) => (v === undefined || !isFinite(v) ? '-' : v.toFixed(d)).padStart(w);
console.log('   t     br   r0     r  | a_au    a    lo  |  D    mu    c  | s_au s_eff |  h   ball   tip  | spd | toe');
let last = null, k = 0;
for (let i = 0; i <= n; i++) { const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; const l = pose.legs.R, g = l.dbg || {};
  if (t >= t0 && t <= t1 && l.mode === 'slide') { const sp = last ? l.A.distanceTo(last) * 1000 : 0;
    if ((k++) % every === 0) console.log(`${t.toFixed(3)} ${String(g.br).padStart(3)} ${f(g.r0 * 1000)} ${f(g.r * 1000)} | ${f(g.a0)} ${f(g.a)} ${f(g.lo)} | ${f(g.D * 1000)} ${f(g.mu, 5, 2)} ${f(g.c * 1000, 4, 1)} | ${f(l.s, 5, 2)} ${f(g.s, 5, 2)} | ${f(l.A.y * 1000)} ${f(l.ballPt.y * 1000, 5)} ${f(l.tipPt.y * 1000, 5)} | ${f(sp, 4)} | ${f(l.toe, 6)}`); }
  last = l.A.clone(); }
