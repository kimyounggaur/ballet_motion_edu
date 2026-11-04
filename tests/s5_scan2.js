// scan ball run-in (BR, mm) x hand-off (BH, mm): worst-case over turnouts for ball/tip d2, foot-angle speed and key foot angle.
// usage: node s5_scan2.js CORE.js "BR list" "BH list" [moves] [Ts]
globalThis.THREE = require('../vendor/three.min.js');
const BRs = process.argv[3].split(',').map(Number), BHs = process.argv[4].split(',').map(Number), moves = (process.argv[5] || 'tendu,arabesque,positions').split(','), Ts = (process.argv[6] || '60,70,80').split(',').map(Number);
const p = require('path').resolve(process.argv[2]);
for (const br of BRs) for (const bh of BHs) {
  globalThis.__BR = br / 1000; globalThis.__BH = bh / 1000; delete globalThis.BalletCore; delete require.cache[p]; require(p);
  const C = globalThis.BalletCore; const out = [];
  for (const id of moves) {
    const W = { ball: 0, tip: 0, heel: 0, ankle: 0, da: 0, toe: 0, akey: 999 };
    for (const T of Ts) {
      const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, T), step = (def.bpm / 60) / 60, n = Math.floor(Cm.total / step + 1e-9); let prev = null; const R = [];
      for (let i = 0; i <= n; i++) { const t = i * step, PP = C.evalParams(Cm, t, { polish: true }), pose = C.solvePose(PP, prev); prev = pose.warm; const l = pose.legs.R; R.push({ A: l.A.clone(), H: l.heelPt.clone(), B: l.ballPt.clone(), Tp: l.tipPt.clone(), toe: l.toe || 0, a: l.a || 0, m: l.mode, s: (PP.legs.R.fk && PP.legs.R.fk.s) || 0 }); }
      const d2 = (k, i) => R[i + 1][k].clone().sub(R[i][k]).sub(R[i][k].clone().sub(R[i - 1][k])).length() * 1000;
      for (let i = 1; i < R.length - 1; i++) { W.ball = Math.max(W.ball, d2('B', i)); W.tip = Math.max(W.tip, d2('Tp', i)); W.heel = Math.max(W.heel, d2('H', i)); W.ankle = Math.max(W.ankle, d2('A', i)); W.toe = Math.max(W.toe, Math.abs(R[i + 1].toe - 2 * R[i].toe + R[i - 1].toe)); W.da = Math.max(W.da, Math.abs(R[i + 1].a - R[i].a)); }
      for (const r of R) if (r.m === 'slide' && r.s >= 0.95) W.akey = Math.min(W.akey, r.a);
    }
    out.push(`${id.slice(0, 4)}: ank ${W.ankle.toFixed(1)} heel ${W.heel.toFixed(1)} ball ${W.ball.toFixed(1)} tip ${W.tip.toFixed(1)} toe ${W.toe.toFixed(1)}° da ${W.da.toFixed(1)}° akey ${W.akey.toFixed(0)}`);
  }
  console.log(`BR ${String(br).padStart(2)} BH ${String(bh).padStart(2)} | ` + out.join(' | '));
}
