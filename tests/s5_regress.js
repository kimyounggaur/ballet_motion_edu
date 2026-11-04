// New core (src/core.js) vs shipped v6 core: which moves are untouched, and how far do the sliding ones differ?
//   node s5_regress.js [T list]   (polish on and off)
globalThis.THREE = require('../vendor/three.min.js');
require('../backup_s5/core_v6.js'); const A = globalThis.BalletCore; delete globalThis.BalletCore;
require('../src/core.js'); const B = globalThis.BalletCore;
const Ts = (process.argv[2] || '70').split(',').map(Number), dt = 1 / 60;
for (const T of Ts) for (const polish of [true, false]) {
  console.log(`--- T=${T} polish ${polish ? 'on' : 'off'}`);
  for (const def of B.MOVES) {
    const Ca = A.compileMove(def, T), Cb = B.compileMove(def, T); let pa = null, pb = null; const w = {}; let nDiff = 0, nFrames = 0, firstT = null, lastT = null;
    const bump = (k, v, t) => { if (!w[k] || v > w[k].v) w[k] = { v, t }; };
    for (let t = 0; t <= Cb.total + 1e-9; t += dt) {
      const sa = A.solvePose(A.evalParams(Ca, t, { polish }), pa), sb = B.solvePose(B.evalParams(Cb, t, { polish }), pb); pa = sa.warm; pb = sb.warm; nFrames++;
      let m = Math.max(sa.pp.distanceTo(sb.pp), sa.HJ.distanceTo(sb.HJ), sa.com.distanceTo(sb.com), Math.abs(sa.autoRoll - sb.autoRoll));
      bump('pp', sa.pp.distanceTo(sb.pp), t); bump('HJ', sa.HJ.distanceTo(sb.HJ), t); bump('com', sa.com.distanceTo(sb.com), t); bump('roll°', Math.abs(sa.autoRoll - sb.autoRoll), t);
      for (const s of ['R', 'L']) { const x = sa.legs[s], y = sb.legs[s];
        const dA = x.A.distanceTo(y.A), dK = x.K.distanceTo(y.K), dH = x.heelPt.distanceTo(y.heelPt), dB = x.ballPt.distanceTo(y.ballPt), dT = x.tipPt.distanceTo(y.tipPt), dW = sa.arms[s].W.distanceTo(sb.arms[s].W);
        bump('A' + s, dA, t); bump('K' + s, dK, t); bump('tip' + s, dT, t); bump('W' + s, dW, t); bump('toe' + s + '°', Math.abs((x.toe || 0) - (y.toe || 0)) * 1e-3, t);
        m = Math.max(m, dA, dK, dH, dB, dT, dW, x.mode === y.mode ? 0 : 1); }
      if (m > 0) { nDiff++; if (firstT === null) firstT = t; lastT = t; }
    }
    console.log(def.id.padEnd(11) + (nDiff === 0 ? 'BIT-IDENTICAL to v6 (' + nFrames + ' frames)' : `differs in ${nDiff}/${nFrames} frames (t ${firstT.toFixed(2)}–${lastT.toFixed(2)}): ` + Object.entries(w).filter(([k, o]) => o.v > 0).map(([k, o]) => `${k} ${k.includes('°') ? (o.v * 1e3).toFixed(1) + '°' : (o.v * 1000).toFixed(1) + 'mm'}@${o.t.toFixed(2)}`).join('  ')));
  }
}
