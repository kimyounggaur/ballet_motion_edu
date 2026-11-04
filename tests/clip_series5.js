// Frame-by-frame series for a render clip (same sampling / warm-up as render_clip3.py): R ankle, foot angle, toe angle, mode.
// usage: node clip_series5.js CORE.js OUT.json move t0 t1 bpm fps [polish=1] [settle=16]
const fs = require('fs'); globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const [, , , out, move, t0s, t1s, bpms, fpss, pol, settleS] = process.argv;
const settle = settleS === undefined ? 16 : +settleS;
const t0 = +t0s, t1 = +t1s, bpm = +bpms, fps = +fpss, polish = pol === undefined ? true : pol !== '0';
const Cm = C.compileMove(C.MOVES.find(m => m.id === move), 70);
const step = (bpm / 60) / fps, n = Math.round((t1 - t0) / step);
let prev = null;
const nwarm = process.env.WARM_FROM0 ? Math.floor(t0 / step) + 1 : Math.floor(fps * 1.5);
for (let i = -nwarm; i < 0; i++) prev = C.solvePose(C.evalParams(Cm, Math.max(0, t0 + i * step), { polish }), prev).warm;
for (let k = 0; k < settle; k++) prev = C.solvePose(C.evalParams(Cm, t0, { polish }), prev).warm;
const s = { t: [], A: [], toe: [], a: [], mode: [], tipY: [], ballY: [], heelY: [] };
const mm = v => v.toArray().map(x => x * 1000);
for (let i = 0; i <= n; i++) {
  const t = t0 + i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; const l = pose.legs.R;
  s.t.push(t); s.A.push(mm(l.A)); s.toe.push(l.toe || 0); s.a.push(l.a || 0); s.mode.push(l.mode || '');
  s.tipY.push(l.tipPt.y * 1000); s.ballY.push(l.ballPt.y * 1000); s.heelY.push(l.heelPt.y * 1000);
}
fs.writeFileSync(out, JSON.stringify(s)); console.log(out, s.t.length, 'samples');
