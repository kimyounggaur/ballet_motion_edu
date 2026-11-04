// run slide_metrics-like numbers for a knob set.  usage: K='{"s0":0.8}' node s5_knobs.js [moves=tendu,arabesque,positions] [polish=1]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = false;
globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, FPS = 60, polish = (process.argv[3] || '1') !== '0';
const only = (process.argv[2] || 'tendu,arabesque,positions').split(',');
for (const id of only) {
  const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / FPS, n = Math.floor(Cm.total / step + 1e-9);
  let prev = null; const R = [];
  for (let i = 0; i <= n; i++) {
    const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm;
    const l = pose.legs.R, g = l.dbg || {};
    R.push({ t, mode: l.mode, A: l.A.clone(), K: l.K.clone(), P: pose.pp.clone(), a: l.a || 0, corr: g.r !== undefined ? (g.r - g.r0) * 1000 : 0, br: g.br === undefined ? -1 : g.br,
             low: Math.min(l.tipPt.y, l.ballPt.y) * 1000, ball: l.ballPt.y * 1000, tip: l.tipPt.y * 1000 });
  }
  const st = { dA: 0, nA: 0, dK: 0, nK: 0, dP: 0, corr: 0, pen: 0, hov: 0, dAng: 0, at: 0 };
  for (let i = 1; i < R.length - 1; i++) {
    const m = R[i], d2 = f => f(R[i + 1]).clone().sub(f(R[i])).sub(f(R[i]).clone().sub(f(R[i - 1]))).length() * 1000;
    st.dP = Math.max(st.dP, d2(r => r.P));
    if (!(R[i - 1].mode === 'slide' && m.mode === 'slide' && R[i + 1].mode === 'slide')) continue;
    const dA = d2(r => r.A), dK = d2(r => r.K);
    if (dA > st.dA) { st.dA = dA; st.at = m.t; }
    st.dK = Math.max(st.dK, dK); if (dA > 3) st.nA++; if (dK > 3) st.nK++;
    st.dAng = Math.max(st.dAng, Math.abs(R[i + 1].a - 2 * m.a + R[i - 1].a));
    st.corr = Math.max(st.corr, Math.abs(m.corr)); st.pen = Math.min(st.pen, m.low); if (m.a > 25) st.hov = Math.max(st.hov, m.low);
  }
  const f = (v, w = 6, d = 2) => v.toFixed(d).padStart(w);
  console.log(`${id.padEnd(10)} ankle d2 ${f(st.dA)}@${st.at.toFixed(2)} n>3:${String(st.nA).padStart(3)} | knee d2 ${f(st.dK)} n>3:${String(st.nK).padStart(2)} | pelvis d2 ${f(st.dP)} | ang d2 ${f(st.dAng, 5, 1)}° | corr max ${f(st.corr, 6, 1)}mm | lowest ${f(st.pen)} hover(a>25) ${f(st.hov)}`);
}
