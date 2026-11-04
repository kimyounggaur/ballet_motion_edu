// Frame-by-frame working-leg series for a render clip, with the same sampling/warm-up as render_clip2.py / render_clip3.py.
// usage: node clip_series.js CORE.js OUT.json move t0 t1 bpm fps [polish=1] [settle=16]   (settle = repeated solves at t0, as render_clip2/3 do while the camera settles)
const fs = require('fs'); globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const [, , , out, move, t0s, t1s, bpms, fpss, pol, settleS] = process.argv;
const settle = settleS === undefined ? 16 : +settleS;
const t0 = +t0s, t1 = +t1s, bpm = +bpms, fps = +fpss, polish = pol === undefined ? true : pol !== '0';
const Cm = C.compileMove(C.MOVES.find(m => m.id === move), 70);
const step = (bpm / 60) / fps, n = Math.round((t1 - t0) / step);
let prev = null;
for (let i = -Math.floor(fps * 1.5); i < 0; i++) prev = C.solvePose(C.evalParams(Cm, Math.max(0, t0 + i * step), { polish }), prev).warm;
for (let k = 0; k < settle; k++) prev = C.solvePose(C.evalParams(Cm, t0, { polish }), prev).warm;
const s = { t: [], A: [], tip: [], toe: [] };
for (let i = 0; i <= n; i++) {
  const t = t0 + i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm;
  const l = pose.legs.R; s.t.push(t); s.A.push(l.A.toArray()); s.tip.push(l.tipPt.toArray()); s.toe.push(l.toe);
}
fs.writeFileSync(out, JSON.stringify(s)); console.log(out, s.t.length, 'samples');
