// contact map of the sliding R foot at one frame: for ankle radius r (along the frame's ray) and toe stiffness s, the angles where
// the foot just touches (reach=0) and where it starts to go through (pen=0).   usage: node s5_band.js move t [polish=1]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = true;
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, id = process.argv[2], t = +process.argv[3], polish = (process.argv[4] || '1') !== '0';
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
const pose = C.solvePose(C.evalParams(Cm, t, { polish }), null), l = pose.legs.R, g = l.dbg;
const D2R = Math.PI / 180;
const roots = (fn) => { const out = []; let prev = fn(-40), pa = -40; for (let a = -39.5; a <= 120; a += 0.5) { const v = fn(a); if ((v >= 0) !== (prev >= 0)) { let lo = pa, hi = a; for (let j = 0; j < 30; j++) { const m = (lo + hi) / 2; if ((fn(m) >= 0) === (prev >= 0)) lo = m; else hi = m; } out.push(+(((lo + hi) / 2)).toFixed(1) * (1)); } prev = v; pa = a; } return out; };
console.log(`t=${t} mode=${l.mode} Hy=${(g.Hy * 1000).toFixed(1)} d=${(g.d * 1000).toFixed(1)} r0=${(g.r0 * 1000).toFixed(1)} s_auth=${g.s} a_auth=${g.a0}`);
const S = (process.env.S || '0,0.2,0.4,0.6,0.8,1').split(',').map(Number), Rr = (process.env.R || '150,200,250,300,330,350,360,370,380,390,400').split(',').map(Number);
for (const s of S) {
  const m = g.mk(s); console.log(`s=${s}  tHold ${m.th.toFixed(1)} tFlex ${m.tf.toFixed(1)} kS ${(m.ks * 1000).toFixed(1)}mm`);
  for (const r of Rr) { const lg = g.legAt(r / 1000), h = lg.A.y * 1000;
    console.log(`   r ${String(r).padStart(4)} h ${h.toFixed(1).padStart(6)}  reach roots [${roots(x => m.reach(lg, x)).join(', ')}]   pen roots [${roots(x => m.pen(lg, x)).join(', ')}]`); }
}
