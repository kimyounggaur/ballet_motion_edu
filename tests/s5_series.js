// Whole-move series at playback sampling for the sliding R leg: ankle/knee/heel/ball/tip positions (mm), foot angle, toe angle, stiffness, mode.
// usage: node s5_series.js CORE.js OUT.json move fps [polish=1] [T=70]
const fs = require('fs'); globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const [, , , out, move, fpss, pol, Ts] = process.argv;
const fps = +fpss, polish = pol === undefined ? true : pol !== '0', T = Ts === undefined ? 70 : +Ts;
const def = C.MOVES.find(m => m.id === move), Cm = C.compileMove(def, T);
const step = (def.bpm / 60) / fps, n = Math.floor(Cm.total / step + 1e-9);
let prev = null;
const mm = v => v.toArray().map(x => x * 1000);
const s = { move, fps, polish, T, bpm: def.bpm, t: [], pp: [], roll: [], A: [], K: [], H: [], B: [], Tp: [], toe: [], a: [], sa: [], mode: [], lowest: [] };
for (let i = 0; i <= n; i++) {
  const t = i * step, PP = C.evalParams(Cm, t, { polish }), pose = C.solvePose(PP, prev); prev = pose.warm; const l = pose.legs.R;
  s.t.push(t); s.pp.push(mm(pose.pp)); s.roll.push(pose.autoRoll || 0);
  s.A.push(mm(l.A)); s.K.push(mm(l.K)); s.H.push(mm(l.heelPt)); s.B.push(mm(l.ballPt)); s.Tp.push(mm(l.tipPt));
  s.toe.push(l.toe || 0); s.a.push(l.a || 0); s.sa.push((PP.legs.R.fk && PP.legs.R.fk.s) || 0); s.mode.push(l.mode || '');
  s.lowest.push(Math.min(l.heelPt.y, l.ballPt.y, l.tipPt.y) * 1000);
}
fs.writeFileSync(out, JSON.stringify(s)); console.log(out, s.t.length, 'samples');
