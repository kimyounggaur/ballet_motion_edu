// Numeric verification of the rig: contacts, reach, balance, continuity, collisions.
globalThis.THREE = require('../vendor/three.min.js');
require(process.env.CORE ? require('path').resolve(process.env.CORE) : '../src/core.js');
const C = globalThis.BalletCore;
const { RL, V3 } = C;
const T = +(process.argv[2] || 70);
const onlyMove = process.argv[3];
const mistake = process.argv[4];

function segDist(p1, q1, p2, q2) { // closest distance between segments
  const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2);
  const a = Math.max(d1.dot(d1),1e-12), e = Math.max(d2.dot(d2),1e-12), f = d2.dot(r);
  let s, t; const c = d1.dot(r), b = d1.dot(d2), den = a * e - b * b;
  s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
  t = (b * s + f) / e;
  if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
  return p1.clone().addScaledVector(d1, s).distanceTo(p2.clone().addScaledVector(d2, t));
}

let worst = {};
const upd = (k, v, info) => { if (!(k in worst) || v < worst[k].v) worst[k] = { v, info }; };
for (const def of C.MOVES) {
  if (onlyMove && def.id !== onlyMove) continue;
  const Cm = C.compileMove(def, T);
  const N = Math.round(Cm.total * 40);
  let prevXZ = null, prevPP = null, maxJump = 0, jumpAt = 0;
  let prevFeet = null, maxFootJump = 0, footJumpAt = 0;
  for (let i = 0; i <= N; i++) {
    const t = Cm.total * i / N;
    let P = C.evalParams(Cm, t, { polish: !!process.env.POLISH });
    if (mistake) P = C.applyMistake(P, mistake);
    const pose = C.solvePose(P, prevXZ);
    prevXZ = V3(pose.pp.x, 0, pose.pp.z);
    const m = C.measure(pose, P);
    const tag = `${def.id}@${t.toFixed(2)}`;
    // NaN
    const any = [pose.pp, pose.com, pose.legs.R.A, pose.legs.L.A, pose.arms.R.W, pose.arms.L.W];
    if (any.some(v => !isFinite(v.x + v.y + v.z))) { console.log('NaN at', tag); process.exit(1); }
    for (const s of RL) {
      const l = pose.legs[s];
      const minY = Math.min(l.heelPt.y, l.ballPt.y, l.tipPt.y);
      upd(`minFootY_${s}`, minY, tag);
      if (l.mode === 'plant') {
        upd('plantReach(neg err)', -l.reachErr, tag);
        if ((l.pl.rel || 0) < 1) upd('flatHeelY(neg)', -Math.abs(l.heelPt.y), tag);
      }
      if (l.mode === 'glide' || l.mode === 'slide') upd('glideContact(neg|err|)', -Math.abs(Math.min(l.heelPt.y, l.ballPt.y, l.tipPt.y)), tag);
      upd(`kneeFlex_${s}`, m.legs[s].knee, tag);
      if (m.legs[s].align !== null) upd(`kneeAlign_${s}(neg)`, -m.legs[s].align, tag);
    }
    upd('comDist', m.comDist, tag);
    // thigh/shin clearance between legs (radii: thigh ~0.065 top..0.044 knee, shin ~0.045)
    const L = pose.legs.L, R = pose.legs.R;
    upd('thighs-gap', segDist(R.H.clone().lerp(R.K, 0.25), R.K, L.H.clone().lerp(L.K, 0.25), L.K) - 0.11, tag);
    upd('shins-gap', segDist(R.K, R.A, L.K, L.A) - 0.085, tag);
    upd('feet-gap', segDist(R.A, R.ballJ, L.A, L.ballJ) - 0.06, tag);
    // hands vs torso: wrist distance from spine axis
    for (const s of RL) {
      const a = pose.arms[s];
      const W = a.W.clone().add(V3(0, -0.07, 0).applyQuaternion(a.qHand));
      const ax0 = pose.L0, ax1 = pose.C7;
      upd(`hand-torso_${s}`, segDist(W, W, ax0, ax1) - 0.16, tag);
      upd(`hand-thigh_${s}`, Math.min(segDist(W, W, pose.legs[s].H, pose.legs[s].K), segDist(W, W, pose.legs[s === 'R' ? 'L' : 'R'].H, pose.legs[s === 'R' ? 'L' : 'R'].K)) - 0.085, tag);
    }
    if (prevPP) { const j = pose.pp.distanceTo(prevPP); if (j > maxJump) { maxJump = j; jumpAt = t; } }
    prevPP = pose.pp.clone();
    const feet = [R.A, L.A, R.ballJ, L.ballJ, R.tipPt, L.tipPt].map(v => v.clone());
    if (prevFeet) { for (let q = 0; q < feet.length; q++) { const j = feet[q].distanceTo(prevFeet[q]); if (j > maxFootJump) { maxFootJump = j; footJumpAt = t; } } }
    prevFeet = feet;
  }
  console.log(`${def.id.padEnd(11)} total=${Cm.total} maxPelvisStep=${(maxJump * 1000).toFixed(1)}mm@${jumpAt.toFixed(2)} maxFootStep=${(maxFootJump * 1000).toFixed(1)}mm@${footJumpAt.toFixed(2)}`);
}
console.log('\nWorst values (m or deg):');
for (const [k, o] of Object.entries(worst)) console.log(`  ${k.padEnd(24)} ${o.v.toFixed(4)}  ${o.info}`);
