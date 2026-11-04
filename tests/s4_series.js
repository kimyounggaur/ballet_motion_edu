// Whole-move series at playback-like sampling (warm-started, every frame).
// usage: node s4_series.js CORE.js OUT.json move fps [polish=1]
const fs = require('fs'); globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const [, , , out, move, fpss, pol] = process.argv;
const fps = +fpss, polish = pol === undefined ? true : pol !== '0';
const def = C.MOVES.find(m => m.id === move), Cm = C.compileMove(def, 70);
const step = (def.bpm / 60) / fps, n = Math.floor(Cm.total / step + 1e-9);
let prev = null;
const s = { move, fps, polish, bpm: def.bpm, t: [], pp: [], roll: [], A: { R: [], L: [] }, K: { R: [], L: [] }, mode: { R: [], L: [] }, dR: [], dL: [] };
for (let i = 0; i <= n; i++) {
  const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm;
  s.t.push(t); s.pp.push(pose.pp.toArray().map(v => v * 1000)); s.roll.push(pose.autoRoll || 0);
  for (const k of ['R', 'L']) { const l = pose.legs[k]; s.A[k].push(l.A.toArray().map(v => v * 1000)); s.K[k].push(l.K.toArray().map(v => v * 1000)); s.mode[k].push(l.mode || l.m || ''); }
}
fs.writeFileSync(out, JSON.stringify(s)); console.log(out, s.t.length, 'samples, step', step.toFixed(5));
