// lowest point of the sliding R foot (heel/ball/tip) over all slide frames: how far it floats above / sinks below the floor.  usage: K='{...}' node s5_float.js [moves] [polish]
globalThis.THREE = require('../vendor/three.min.js'); globalThis.__S5DUMP = false; globalThis.__K = process.env.K ? JSON.parse(process.env.K) : {};
require(require('path').resolve(process.env.CORE || 'core_x5.js'));
const C = globalThis.BalletCore, FPS = 60, polish = (process.argv[3] || '1') !== '0', only = (process.argv[2] || 'tendu,arabesque,positions').split(',');
for (const id of only) {
  const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, +(process.env.T || 70)), step = (def.bpm / 60) / FPS, n = Math.floor(Cm.total / step + 1e-9);
  let prev = null, hi = { v: -1e9, t: 0 }, lo = { v: 1e9, t: 0 }, nHov = 0, nSlide = 0, hi2 = { v: -1e9, t: 0 };
  for (let i = 0; i <= n; i++) { const t = i * step, pose = C.solvePose(C.evalParams(Cm, t, { polish }), prev); prev = pose.warm; const l = pose.legs.R;
    if (l.mode !== 'slide') continue; nSlide++;
    const low = Math.min(l.heelPt.y, l.ballPt.y, l.tipPt.y) * 1000;
    if (low > hi.v) hi = { v: low, t }; if (low < lo.v) lo = { v: low, t }; if (low > 1) nHov++;
    if (l.a > 25) { const lw = Math.min(l.ballPt.y, l.tipPt.y) * 1000; if (lw > hi2.v) hi2 = { v: lw, t }; } }
  console.log(`${id.padEnd(10)} slide frames ${nSlide} | lowest point: max float ${hi.v.toFixed(2)}mm @${hi.t.toFixed(2)} (frames >1mm: ${nHov}) | deepest sink ${lo.v.toFixed(2)}mm @${lo.t.toFixed(2)} | (a>25) ball/tip float max ${hi2.v.toFixed(2)}@${hi2.t.toFixed(2)}`);
}
