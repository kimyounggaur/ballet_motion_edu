// Smoothness / fidelity of the sliding foot at playback sampling.  usage: node slide_metrics.js [fps=60]   env CORE, MOVES (comma list)
// per move+polish: max & #frames>3mm of the 2nd difference of the working (R) ankle and knee, foot-angle a and toe angle 2nd difference (deg),
// max glide-out |r-r0| (mm), lowest tip/ball point (mm, <0 = through the floor) while sliding, max hover of the lowest of (ball,tip) when a>25 deg.
globalThis.THREE = require('../vendor/three.min.js'); if (process.env.MU !== undefined) globalThis.__MU = +process.env.MU; if (process.env.EPS !== undefined) globalThis.__EPS = +process.env.EPS;
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore;
const FPS = +(process.argv[2] || 60), only = process.env.MOVES ? process.env.MOVES.split(',') : null;
const fmt = (v, w = 6, d = 2) => v.toFixed(d).padStart(w);
let allMax = 0;
for (const polish of [true, false]) for (const def of C.MOVES) {
  if (only && !only.includes(def.id)) continue;
  const Cm = C.compileMove(def, 70), step = (def.bpm / 60) / FPS, n = Math.floor(Cm.total / step + 1e-9);
  let prev = null; const R = [];
  for (let i = 0; i <= n; i++) {
    const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm;
    const l = pose.legs.R, g = l.dbg || {};
    R.push({ t, mode: l.mode, A: l.A.clone(), K: l.K.clone(), a: l.a === undefined ? 0 : l.a, toe: l.toe, corr: g.r !== undefined ? (g.r - g.r0) * 1000 : 0, br: g.br === undefined ? -1 : g.br,
             low: Math.min(l.tipPt.y, l.ballPt.y) * 1000, tip: l.tipPt.y * 1000, ball: l.ballPt.y * 1000, a0: g.a0, aEff: g.a });
  }
  const st = { dA: 0, nA: 0, dK: 0, nK: 0, dAng: 0, dToe: 0, corr: 0, pen: 0, hover: 0, dAngAt: 0, dAAt: 0 };
  for (let i = 1; i < R.length - 1; i++) {
    const m = R[i];
    const dd = (f) => f(R[i + 1]).clone().sub(f(R[i])).sub(f(R[i]).clone().sub(f(R[i - 1]))).length() * 1000;
    const slide = R[i - 1].mode === 'slide' && m.mode === 'slide' && R[i + 1].mode === 'slide';
    if (!slide) continue;
    const dA = dd(r => r.A), dK = dd(r => r.K);
    if (dA > st.dA) { st.dA = dA; st.dAAt = m.t; }
    st.dK = Math.max(st.dK, dK); if (dA > 3) st.nA++; if (dK > 3) st.nK++;
    const dAng = Math.abs(R[i + 1].a - 2 * m.a + R[i - 1].a); if (dAng > st.dAng) { st.dAng = dAng; st.dAngAt = m.t; }
    st.dToe = Math.max(st.dToe, Math.abs(R[i + 1].toe - 2 * m.toe + R[i - 1].toe));
    st.corr = Math.max(st.corr, Math.abs(m.corr)); st.pen = Math.min(st.pen, m.low);
    if (m.a > 25) st.hover = Math.max(st.hover, m.low);
  }
  allMax = Math.max(allMax, st.dA);
  console.log(`${def.id.padEnd(10)} p${+polish}: ankle d2 max ${fmt(st.dA)}@${st.dAAt.toFixed(2)} n>3:${String(st.nA).padStart(3)} | knee d2 max ${fmt(st.dK)} n>3:${String(st.nK).padStart(3)} | foot-angle d2 ${fmt(st.dAng, 5, 1)}°@${st.dAngAt.toFixed(2)} toe d2 ${fmt(st.dToe, 5, 1)}° | glide-out max ${fmt(st.corr, 6, 1)}mm | lowest pt ${fmt(st.pen, 6, 2)}mm hover(a>25) ${fmt(st.hover, 5, 2)}mm`);
}
