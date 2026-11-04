// R-ankle second difference (60 fps playback sampling) with contact-branch flags: lists frames with d2 > THR and where br changes.
// usage: node br60.js [move=positions] [polish=1] [thr=3]   env CORE
globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.env.CORE || '../src/core.js'));
const C = globalThis.BalletCore;
const id = process.argv[2] || 'positions', polish = (process.argv[3] || '1') !== '0', THR = +(process.argv[4] || 3), FPS = +(process.env.FPS || 60);
const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
const step = (def.bpm / 60) / FPS, n = Math.floor(Cm.total / step + 1e-9);
let prev = null; const rows = [];
for (let i = 0; i <= n; i++) {
  const t = i * step, P = C.evalParams(Cm, t, { polish }), pose = C.solvePose(P, prev); prev = pose.warm;
  const l = pose.legs.R, g = l.dbg || {}; rows.push({ t, A: l.A.clone(), mode: l.mode, br: g.br === undefined ? -1 : g.br, r: g.r, r0: g.r0 });
}
let big = 0, n3 = 0;
for (let i = 1; i < rows.length - 1; i++) {
  const d2 = rows[i + 1].A.clone().sub(rows[i].A).sub(rows[i].A.clone().sub(rows[i - 1].A)).length() * 1000;
  const chg = rows[i].br !== rows[i - 1].br || rows[i + 1].br !== rows[i].br;
  if (d2 > THR) { n3++; if (!process.env.QUIET) console.log(`t=${rows[i].t.toFixed(3)} d2=${d2.toFixed(2)} mode=${rows[i].mode} br ${rows[i - 1].br}->${rows[i].br}->${rows[i + 1].br} corr=${rows[i].r !== undefined ? ((rows[i].r - rows[i].r0) * 1000).toFixed(1) : '-'}mm`); }
  big = Math.max(big, d2);
}
console.log(`${id} polish=${+polish} fps=${FPS}: max R-ankle d2 ${big.toFixed(2)} mm, frames > ${THR} mm: ${n3}`);
