// Frame-by-frame series for a render clip (same sampling / warm-up as render_clip2.py): roll, pelvis, R/L knee, R ankle.
// usage: node clip_series4.js CORE.js OUT.json move t0 t1 bpm fps [polish=1] [settle=16]
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
const s = { t: [], roll: [], pp: [], KR: [], KL: [], AR: [] };
for (let i = 0; i <= n; i++) {
  const t = t0 + i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm;
  s.t.push(t); s.roll.push(pose.autoRoll || 0); s.pp.push(pose.pp.toArray().map(v => v * 1000));
  s.KR.push(pose.legs.R.K.toArray().map(v => v * 1000)); s.KL.push(pose.legs.L.K.toArray().map(v => v * 1000)); s.AR.push(pose.legs.R.A.toArray().map(v => v * 1000));
}
fs.writeFileSync(out, JSON.stringify(s)); console.log(out, s.t.length, 'samples');
