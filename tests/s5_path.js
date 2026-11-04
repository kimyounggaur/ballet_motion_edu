// compact path print of the R ankle during a brush: t, r0, r, corr, a, |dA| and d2, with knobs K (JSON) .  usage: K='{}' node s5_path.js move t0 t1 [polish=1]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], t0 = +process.argv[3], t1 = +process.argv[4], polish = (process.argv[5] || '1') !== '0';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9);
let prev = null; const R = [];
for (let i = 0; i <= n; i++) { const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; const l = pose.legs.R, g = l.dbg || {}; R.push({ t, l, g }); }
const f = (v, w = 6, d = 1) => (v === undefined ? '-' : v.toFixed(d)).padStart(w);
for (let i = 1; i < R.length - 1; i++) {
  const { t, l, g } = R[i]; if (t < t0 || t > t1 || l.mode !== 'slide') continue;
  const sp = l.A.distanceTo(R[i - 1].l.A) * 1000, d2 = R[i + 1].l.A.clone().sub(l.A).sub(l.A.clone().sub(R[i - 1].l.A)).length() * 1000;
  console.log(`${t.toFixed(3)} br${String(g.br).padStart(2)} r0 ${f(g.r0 * 1000)} r ${f((g.r) * 1000)} corr ${f((g.r - g.r0) * 1000)} a0 ${f(g.a0)} a ${f(g.a)} s ${f(g.s, 4, 2)} h ${f(l.A.y * 1000)} | speed ${f(sp, 5)} d2 ${f(d2, 5)}`);
}
