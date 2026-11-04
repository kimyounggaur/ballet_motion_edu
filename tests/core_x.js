/* ballet-core — rig, solver, movement data. Requires global THREE (r128). */
(function (G) {
'use strict';
const THREE = G.THREE;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
// C2 smooth minimum (cubic): equals min(a, b) once they differ by k or more, dips below it by at most k/6 where they cross
const K_CONTACT = 0.018;   // m: how wide the ball-to-toe handover of the floor contact is blended (at most K/6 = 3 mm of clearance)
const smin = (a, b, k) => { const d = Math.abs(a - b); return d >= k ? Math.min(a, b) : Math.min(a, b) - Math.pow(1 - d / k, 3) * k / 6; };
const wrap180 = a => (((a + 180) % 360) + 360) % 360 - 180;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const qAx = (ax, deg) => new THREE.Quaternion().setFromAxisAngle(ax, deg * D2R);
const AX = V3(1, 0, 0), AY = V3(0, 1, 0), AZ = V3(0, 0, 1), DOWN = V3(0, -1, 0);
const SIDE = { R: -1, L: 1 };          // dancer faces +z, her left is +x
const RL = ['R', 'L'];

/* ---------- body dimensions (m), ~1.66 m dancer ---------- */
const BODY = {
  hipHalf: 0.085, thigh: 0.41, shin: 0.40, ankleH: 0.075,
  heel: V3(0, -0.075, -0.05), ballJ: V3(0, -0.055, 0.14), ballBot: V3(0, -0.075, 0.14), toeTip: V3(0, -0.012, 0.05),
  lumbarJ: V3(0, 0.10, -0.03), lumbarLen: 0.12, thoraxTop: V3(0, 0.28, -0.02), neck: V3(0, 0.095, 0.005),
  shoulder: V3(0.17, 0.25, -0.01), upperArm: 0.27, foreArm: 0.235, hand: 0.17,
};
BODY.leg = BODY.thigh + BODY.shin;
BODY.arm = BODY.upperArm + BODY.foreArm;
const MASS = { pelvis: .142, abd: .139, thorax: .216, head: .081, ua: .028, fa: .016, hand: .006, thigh: .100, shin: .0465, foot: .0145 };

/* ---------- small math ---------- */
function eul(pitch, roll, yaw) { return qAx(AY, yaw).multiply(qAx(AX, pitch)).multiply(qAx(AZ, roll)); }
function basisQuat(y, zh) {
  const Y = y.clone().normalize();
  const Z = zh.clone().addScaledVector(Y, -zh.dot(Y));
  if (Z.lengthSq() < 1e-10) { const t = Math.abs(Y.x) < 0.9 ? AX : AY; Z.copy(t).addScaledVector(Y, -t.dot(Y)); }
  Z.normalize();
  const X = new THREE.Vector3().crossVectors(Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}
function ik2(root, target, l1, l2, pole) {
  const d = target.clone().sub(root); let dist = d.length();
  const u = dist > 1e-9 ? d.clone().divideScalar(dist) : V3(0, -1, 0);
  const maxD = l1 + l2 - 1e-7, minD = Math.abs(l1 - l2) + 1e-4;
  dist = clamp(dist, minD, maxD);
  const v = pole.clone().addScaledVector(u, -pole.dot(u));
  if (v.lengthSq() < 1e-12) { const t = Math.abs(u.x) < 0.9 ? AX : AY; v.copy(t).addScaledVector(u, -t.dot(u)); }
  v.normalize();
  const ca = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
  return {
    mid: root.clone().addScaledVector(u, l1 * ca).addScaledVector(v, l1 * sa),
    end: root.clone().addScaledVector(u, dist),
  };
}
const fdir = phi => V3(Math.sin(phi * D2R), 0, Math.cos(phi * D2R));
const medial = (side, f) => V3(-side * f.z, 0, side * f.x);
function dirAzEl(side, az, el) {
  const se = Math.sin(el * D2R), ce = Math.cos(el * D2R);
  return V3(side * Math.sin(az * D2R) * se, -ce, Math.cos(az * D2R) * se);
}
function azOf(side, d) { const hx = side * d.x, hz = d.z; return hx * hx + hz * hz < 1e-10 ? null : Math.atan2(hx, hz) * R2D; }
function elOf(d) { return Math.acos(clamp(-d.y / d.length(), -1, 1)) * R2D; }
function legDist(kneeDeg) { return Math.sqrt(BODY.thigh ** 2 + BODY.shin ** 2 + 2 * BODY.thigh * BODY.shin * Math.cos(kneeDeg * D2R)); }

/* ---------- feet positions (canonical: right foot in front for crossed positions) ---------- */
function plFromHeel(side, T, hx, hz) { const phi = side * T, f = fdir(phi); return { x: hx + 0.195 * f.x, z: hz + 0.195 * f.z, phi }; }
function heelBackOf(pl) { const f = fdir(pl.phi); return V3(pl.x - 0.195 * f.x, 0, pl.z - 0.195 * f.z); }
const RELEVE = 62;
function buildPositions(T) {
  const hw = 0.012, P = {};
  P['1'] = { L: plFromHeel(1, T, hw, 0), R: plFromHeel(-1, T, -hw, 0) };
  P['2'] = { L: P['1'].L, R: plFromHeel(-1, T, hw - 0.30, 0) };   // left foot stays; heels ~30 cm apart
  const L1 = P['1'].L, fL = fdir(L1.phi), mL = medial(1, fL), hL = heelBackOf(L1), fR = fdir(-T);
  const crossed = (along, halfW) => {
    const M = hL.clone().addScaledVector(fL, along).addScaledVector(mL, halfW);
    const C = M.clone().addScaledVector(mL, 0.028 + 0.006);
    const hb = C.clone().addScaledVector(fR, -0.028);
    return { x: hb.x + 0.195 * fR.x, z: hb.z + 0.195 * fR.z, phi: -T };
  };
  P['3'] = { L: L1, R: crossed(0.10, 0.034) };
  P['5'] = { L: L1, R: crossed(0.19, 0.042) };
  P['4'] = { L: L1, R: Object.assign({}, P['5'].R, { z: P['5'].R.z + 0.22 }) };
  // relevé in 1st: spring draws the balls in so the lifted heels stay close
  const b = RELEVE * D2R, travel = 0.195 - (0.02 * Math.sin(b) + 0.195 * Math.cos(b)), k = 0.85;
  const dr = pl => { const f = fdir(pl.phi); return { x: pl.x - k * travel * f.x, z: pl.z - k * travel * f.z, phi: pl.phi }; };
  P['1r'] = { L: dr(P['1'].L), R: dr(P['1'].R) };
  return P;
}

/* ---------- arm presets (right arm, o = outward, u = up, f = forward; from the shoulder, thorax frame) ---------- */
// gz: how much the gaze goes to this hand (0–1); gy: turn toward the hand's own side (deg); gp: look down (deg), thorax frame.
// Only used by the "polish" path (soft motion / gaze / breath); the classic path ignores them.
const ARMS = {   // w: wrist, pole: elbow direction, palm: palm normal, hand: where the fingers point (soft wrist)
  low:    { w: [-0.075, -0.455, 0.17], pole: [1, -0.1, -0.15], palm: [-0.35, 0.45, -0.8], hand: [-0.3, -0.92, 0.25], gz: 0, gy: 0, gp: 0 },
  first:  { w: [-0.01, -0.15, 0.36], pole: [1, 0.25, -0.1], palm: [-0.4, 0.2, -0.9], hand: [-0.5, -0.25, 0.6], gz: 1, gy: 16, gp: 32 },
  second: { w: [0.44, -0.12, 0.17], pole: [0, -0.2, -1], palm: [0, -0.15, 1], hand: [0.9, -0.28, 0.3], gz: 0, gy: 0, gp: 0 },
  demi:   { w: [0.36, -0.30, 0.12], pole: [0.2, -0.3, -1], palm: [0, -0.5, 0.85], hand: [0.6, -0.72, 0.32], gz: 0, gy: 0, gp: 0 },
  fifth:  { w: [0.01, 0.39, 0.15], pole: [1, 0.05, 0.25], palm: [-0.6, -0.75, -0.2], hand: [-0.5, -0.65, 0.3], gz: 0, gy: 0, gp: 0 },
  arabF:  { w: [-0.05, 0.04, 0.495], pole: [0.6, -1, 0], palm: [0, -1, 0.1], hand: [0.02, -0.12, 1], gz: 1, gy: 9, gp: -8 },
  arabS:  { w: [0.465, 0.0, -0.12], pole: [0, -1, -0.35], palm: [0, -1, 0.1], hand: [1, -0.1, -0.2], gz: 0, gy: 0, gp: 0 },
};
function armLocal(name, side) {
  const a = ARMS[name];
  const w = V3(side * a.w[0], a.w[1], a.w[2]);
  return {
    dir: w.clone().normalize(), r: Math.min(w.length() / BODY.arm, 0.999),
    pole: V3(side * a.pole[0], a.pole[1], a.pole[2]).normalize(),
    palm: V3(side * a.palm[0], a.palm[1], a.palm[2]).normalize(),
    hand: V3(side * a.hand[0], a.hand[1], a.hand[2]).normalize(),
    gz: a.gz, gy: side * a.gy, gp: a.gp,
  };
}

/* ---------- polish: soft motion, gaze, breath (all optional; the classic path never reads these) ---------- */
const GAZE = { headYaw: 0.5, headPitch: 0.3, eyeYaw: 24, eyeUp: 16, eyeDown: 18 };   // share of the gaze the head takes; eye limits (deg)
const LAG = { palm: 0.12, hand: 0.25, eye: 0.12 };   // counts: the hand finishes after the forearm; the eyes arrive before the hands
const EASE0 = { low: 0, rel: null, arms: 2, head: 2 };   // time-warp strength per segment and body part (see warp)
// u → u + s·u²(1−u)²: same start/end values and the same slopes at the keys (so every key pose and every velocity
// match across segments), but with s > 0 the move leaves quickly and arrives softly, with s < 0 the reverse
const warp = (u, s) => (s ? u + s * u * u * (1 - u) * (1 - u) : u);
const breathAt = t => {   // 0 → 1 → 0 once per 4 counts: a longer, softer breath out than in
  const ph = ((t % 4) + 4) % 4;
  return ph < 1.8 ? 0.5 - 0.5 * Math.cos(Math.PI * ph / 1.8) : 0.5 + 0.5 * Math.cos(Math.PI * (ph - 1.8) / 2.2);
};

/* ---------- pose building ---------- */
function toeHold(s) { return lerp(0, 10, s); }
function toeSoft(s) { return lerp(-90, toeHold(s), sstep(0.35, 1.0, s)); }
function toeAngle(qF, ballJ, s, limit) {
  // the toes keep their held angle unless the floor pushes them up; then they bend just enough (down to `limit`).
  // The tip's height is a sinusoid of the toe angle, so the floor rules out one arc of angles (toes pointing down into it);
  // the toes always stay on the side of that arc that they started from (bent up from `limit`), never jump across it.
  const th = toeHold(s), ts = limit !== undefined ? limit : toeSoft(s);
  if (ts >= th) return th;
  const tipY = t => ballJ.y + BODY.toeTip.clone().applyQuaternion(qF.clone().multiply(qAx(AX, t))).y;
  const f0 = tipY(0), f90 = tipY(90), f180 = tipY(180);
  const h = (f0 + f180) / 2, C = (f0 - f180) / 2, S = f90 - h, R = Math.hypot(C, S);
  const g0 = h + C * Math.cos(ts * D2R) + S * Math.sin(ts * D2R);   // tip height with the toes as flexed as allowed
  if (g0 <= 0 || h <= -R) return ts;                       // the floor holds the toes at their limit
  let ext = th - ts;                                       // how far they may open before the tip hits the floor
  if (h < R) {
    const psi = Math.acos(-h / R) * R2D;                   // admissible: |t - phi| <= psi
    const x = (((ts - Math.atan2(S, C) * R2D) % 360) + 360) % 360;
    ext = Math.min(ext, x <= psi ? psi - x : 360 + psi - x);
  }
  // a toe pressed against the floor at its limit stays there; it opens only as that tip lifts off (no jump across the arc)
  return ts + ext * sstep(0, 5e-4, g0);
}
function legFK(side, H, Bq, fk, d) {
  const qSw = new THREE.Quaternion().setFromUnitVectors(DOWN, d.clone().normalize());
  const qT = Bq.clone().multiply(qSw).multiply(qAx(AY, side * fk.tau));
  const K = H.clone().add(V3(0, -BODY.thigh, 0).applyQuaternion(qT));
  const qS = qT.clone().multiply(qAx(AX, fk.knee));
  const A = K.clone().add(V3(0, -BODY.shin, 0).applyQuaternion(qS));
  const qF = qS.clone().multiply(qAx(AX, fk.a));
  if (fk.res) qF.multiply(fk.res);
  const ballJ = A.clone().add(BODY.ballJ.clone().applyQuaternion(qF));
  return { H, K, A, qThigh: qT, qShin: qS, qFoot: qF, ballJ };
}
function minContact(lp, tSoft) {
  const heel = lp.A.clone().add(BODY.heel.clone().applyQuaternion(lp.qFoot));
  const ball = lp.A.clone().add(BODY.ballBot.clone().applyQuaternion(lp.qFoot));
  const tip = lp.ballJ.clone().add(BODY.toeTip.clone().applyQuaternion(lp.qFoot.clone().multiply(qAx(AX, tSoft))));
  return Math.min(heel.y, ball.y, tip.y);
}
function nearestRoot(g, x0, lo, hi, decreasing) {
  x0 = clamp(x0, lo, hi);
  let a = x0, fa = g(x0);
  if (Math.abs(fa) < 1e-6) return x0;
  let dir = fa < 0 ? 1 : -1;
  if (decreasing) dir = -dir;
  let b = a, fb = fa, step = 0.75, found = false;
  for (let i = 0; i < 120; i++) {
    b = clamp(a + dir * step, lo, hi); fb = g(b);
    if ((fb >= 0) !== (fa >= 0)) { found = true; break; }
    if (b === lo || b === hi) return b;
    a = b; fa = fb; step = Math.min(step * 1.35, 8);
  }
  if (!found) return b;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, fm = g(m); if ((fm >= 0) === (fa >= 0)) { a = m; fa = fm; } else { b = m; fb = fm; } }
  return (a + b) / 2;
}
function nearestRoot2(g, x0, lo, hi) {   // nearest sign change on either side of x0
  x0 = clamp(x0, lo, hi);
  const f0 = g(x0);
  if (Math.abs(f0) < 1e-6) return x0;
  const s0 = f0 > 0;
  let pu = x0, pd = x0;
  for (let k = 1; k <= 160; k++) {
    const h = 0.25 * k;
    const xu = Math.min(x0 + h, hi), xd = Math.max(x0 - h, lo);
    if (xd < pd && (g(xd) > 0) !== s0) { let a = xd, b = pd; for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if ((g(m) > 0) === s0) b = m; else a = m; } return (a + b) / 2; }
    if (xu > pu && (g(xu) > 0) !== s0) { let a = pu, b = xu; for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if ((g(m) > 0) === s0) a = m; else b = m; } return (a + b) / 2; }
    pu = xu; pd = xd;
    if (xu === hi && xd === lo) break;
  }
  return x0;
}
function nearestRootUp(g, x0, hi) {   // first sign change of g above x0 (no search below)
  const f0 = g(x0);
  if (Math.abs(f0) < 1e-6) return x0;
  const s0 = f0 > 0;
  let p = x0;
  for (let k = 1; k <= 400; k++) {
    const x = Math.min(x0 + 0.25 * k, hi);
    if ((g(x) > 0) !== s0) { let a = p, b = x; for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if ((g(m) > 0) === s0) a = m; else b = m; } return (a + b) / 2; }
    p = x; if (x >= hi) break;
  }
  return x0;
}
function plantAnkle(pl) {
  const qF = qAx(AY, pl.phi).multiply(qAx(AX, pl.rel || 0)).multiply(qAx(AZ, pl.roll || 0));
  const ballJ = V3(pl.x, 0.02, pl.z);
  return { qF, ballJ, A: ballJ.clone().add(V3(0, 0.055, -0.14).applyQuaternion(qF)) };
}
function kneeOverLine(H, A, f) {   // pole that puts the knee's floor projection exactly on the line A + λf
  const l1 = BODY.thigh, l2 = BODY.shin;
  const dv = A.clone().sub(H); const dist = clamp(dv.length(), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-7);
  const u = dv.normalize();
  const ca = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const e1 = f.clone().addScaledVector(u, -f.dot(u));
  if (sa < 0.04 || e1.lengthSq() < 1e-8) return f.clone();
  e1.normalize();
  const e2 = new THREE.Vector3().crossVectors(u, e1);
  const C = H.clone().addScaledVector(u, l1 * ca), rho = l1 * sa;
  const s = th => {
    const K = C.clone().addScaledVector(e1, rho * Math.cos(th)).addScaledVector(e2, rho * Math.sin(th));
    return f.x * (K.z - A.z) - f.z * (K.x - A.x);
  };
  let lo = -1.0, hi = 1.0, slo = s(lo), shi = s(hi);
  if (slo * shi > 0) return e1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, sm = s(m); if ((sm > 0) === (slo > 0)) { lo = m; slo = sm; } else hi = m; }
  // only a clearly bent knee is steered over the toes; a nearly straight one just faces the foot (no knee twist)
  const kneeFlex = 180 - Math.acos(clamp((l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2), -1, 1)) * R2D;
  const th = (lo + hi) / 2 * sstep(12, 35, kneeFlex);
  return e1.clone().multiplyScalar(Math.cos(th)).addScaledVector(e2, Math.sin(th));
}
function kneePole(side, Bq, H, A, tau) {   // knee direction implied by a turned-out leg aimed from H to A
  const uB = A.clone().sub(H).normalize().applyQuaternion(Bq.clone().invert());
  const qSw = new THREE.Quaternion().setFromUnitVectors(DOWN, uB);
  return AZ.clone().applyQuaternion(qSw.multiply(qAx(AY, side * tau))).applyQuaternion(Bq);
}
function plantReached(pl0, H) {   // the planted foot as it really stands for a hip at H: the heel comes up when the leg can't reach
  const pl = Object.assign({}, pl0);
  let fa = plantAnkle(pl);
  const reachTol = BODY.leg + 2e-4;
  if (H.distanceTo(fa.A) > reachTol && (pl.rel || 0) < 66) {   // unweighted foot can't reach: release the heel a little
    let lo = pl.rel || 0, hi = 66;
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2; const t = plantAnkle(Object.assign({}, pl, { rel: m }));
      if (H.distanceTo(t.A) > reachTol) lo = m; else hi = m;
    }
    pl.rel = hi; fa = plantAnkle(pl);
  }
  return { pl, fa };
}
function legPose(side, H, Bq, L, mods, key) {
  let lp;
  if (L.mode === 'plant') {
    const { pl, fa } = plantReached(L.pl, H);
    const f = fdir(pl.phi);
    const line = f.clone();                       // the knee should travel over this floor line (over the 2nd–3rd toe)
    const pr = (mods && mods.poleRot) || 0;
    if (pr) line.applyAxisAngle(AY, -side * pr * D2R);
    const pole = kneeOverLine(H, fa.A, line);
    const ik = ik2(H, fa.A, BODY.thigh, BODY.shin, pole);
    const K = ik.mid, A = ik.end;
    const qT = basisQuat(H.clone().sub(K), pole), qS = basisQuat(K.clone().sub(A), pole);
    const ballJ = A.clone().add(BODY.ballJ.clone().applyQuaternion(fa.qF));
    lp = { mode: 'plant', H, K, A, qThigh: qT, qShin: qS, qFoot: fa.qF, ballJ, s: 0, pl, reachErr: A.distanceTo(fa.A) };
  } else if (L.mode === 'slide') {
    // Runtime brush along the floor (tendu mechanics): the straight leg carries the ankle along a straight floor path,
    // the floor decides how far the foot has to point; the full authored point arrives only at the end.
    const fk = L.fk;
    const kn = fk.knee + ((mods && mods.workKnee && key === 'R') ? mods.workKnee : 0);
    const d = legDist(kn) - 1e-6;
    const dx = L.ankle.x - H.x, dz = L.ankle.z - H.z;
    const r0 = Math.hypot(dx, dz), ux = r0 > 1e-6 ? dx / r0 : 0, uz = r0 > 1e-6 ? dz / r0 : 1;
    const legAt = r => {
      r = Math.min(r, d * 0.9995);
      const At = V3(H.x + ux * r, Math.max(BODY.ankleH, H.y - Math.sqrt(d * d - r * r)), H.z + uz * r);
      const pole = kneePole(side, Bq, H, At, fk.tau);
      const ik = ik2(H, At, BODY.thigh, BODY.shin, pole);
      return { K: ik.mid, A: ik.end, qT: basisQuat(H.clone().sub(ik.mid), pole), qS: basisQuat(ik.mid.clone().sub(ik.end), pole) };
    };
    const tHold = toeHold(fk.s);
    const tFlex = lerp(-80, tHold, sstep(0.2, 1.0, fk.s));   // soft toes flatten in demi-pointe; pointed toes stay firm
    const footAt = (lg, a) => { const qF = lg.qS.clone().multiply(qAx(AX, a)); if (fk.res) qF.multiply(fk.res); return qF; };
    const ballY = (lg, a) => lg.A.y + BODY.ballBot.clone().applyQuaternion(footAt(lg, a)).y;
    const tipY = (lg, a, t) => { const qF = footAt(lg, a); return lg.A.y + BODY.ballJ.clone().applyQuaternion(qF).y + BODY.toeTip.clone().applyQuaternion(qF.multiply(qAx(AX, t))).y; };
    let lg = legAt(r0), a = fk.a;
    // the floor contact moves from the ball to the toe tip as the foot points; blending the two (instead of switching) keeps the
    // ankle's path smooth there. A flat foot has nothing to blend, so the softness fades in with the pointing.
    const kS = K_CONTACT * sstep(0.2, 0.42, fk.s);
    const reach = (l, x) => kS > 1e-4 ? smin(ballY(l, x), tipY(l, x, tHold), kS) : Math.min(ballY(l, x), tipY(l, x, tHold));
    const pen = (l, x) => kS > 1e-4 ? smin(ballY(l, x), tipY(l, x, tFlex), kS) : Math.min(ballY(l, x), tipY(l, x, tFlex));
    const dbg = { r0, br: 0, r: r0, a0: a };
    // 1) floating: neither the ball nor the toes reach the floor → point just enough to touch (only ever pointing further:
    //    past the foot's lowest tip position a second, 'relaxing' solution exists and the foot would hop between the two)
    if (reach(lg, a) > 0) { a = nearestRootUp(x => reach(lg, x), a, 92); dbg.br |= 1; }
    let rCur = r0;
    if (globalThis.__PENDUMP) { dbg.penCurve = []; for (let x = -30; x <= 92; x += 2) dbg.penCurve.push([x, pen(lg, x) * 1000, reach(lg, x) * 1000]); }
    if (reach(lg, a) > 1e-5) {   // a shortened leg (bent knee, hips placed elsewhere) can't get there: the foot lands closer in
      let rl = 0, rh = r0;
      for (let j = 0; j < 24; j++) { const m = (rl + rh) / 2; if (reach(legAt(m), a) > 0) rh = m; else rl = m; }
      lg = legAt(rl); rCur = rl; dbg.br |= 2; dbg.r = rl;
    }
    // 2) going through the floor in a way the toes can't absorb: near the standing leg the foot relaxes;
    //    when extended (turned-out derrière) the leg glides out a little instead, so the point is kept
    if (pen(lg, a) < -1e-7) {
      dbg.br |= 4;
      let lo = a;
      for (let x = a - 1; x >= -30; x -= 1) { if (pen(lg, x) >= 0) { let p = x, q = lo; for (let j = 0; j < 22; j++) { const m = (p + q) / 2; if (pen(lg, m) >= 0) p = m; else q = m; } lo = p; break; } lo = x; }
      a = lerp(lo, a, (globalThis.__MU === undefined ? sstep(0.15, 0.26, r0) : globalThis.__MU));
      if (pen(lg, a) < -1e-7) {
        dbg.br |= 8;
        const p0 = -pen(lg, a);
        let rl = rCur, rh = Math.min(rCur + 0.15, d * 0.9995);
        if (pen(legAt(rh), a) < 0) { rl = rh; dbg.br |= 16; }
        else for (let j = 0; j < 24; j++) { const m = (rl + rh) / 2; if (pen(legAt(m), a) < 0) rl = m; else rh = m; }
        const EPS = globalThis.__EPS || 0;
        const wgt = EPS > 0 ? sstep(0, EPS, p0) : 1;
        const rr = rCur + wgt * (rh - rCur);
        lg = legAt(rr); dbg.r = rr; dbg.p0 = p0; dbg.dRfull = rh - rCur; dbg.wgt = wgt;
      }
    }
    dbg.a = a; dbg.tFlex = tFlex; dbg.s = fk.s;
    const qF = footAt(lg, a);
    lp = { mode: 'slide', H, K: lg.K, A: lg.A, qThigh: lg.qT, qShin: lg.qS, qFoot: qF, ballJ: lg.A.clone().add(BODY.ballJ.clone().applyQuaternion(qF)), s: fk.s, a, toeLimit: tFlex, dbg };
  } else {
    // glide (key poses): the foot keeps its authored shape and the leg's elevation is solved so it just touches the floor.
    // air: FK; only lifted if it would touch the floor.
    let fk = L.fk;
    if (mods && mods.workKnee && key === 'R') fk = Object.assign({}, fk, { knee: fk.knee + mods.workKnee });
    const tSoft = toeSoft(fk.s);
    let az = azOf(side, fk.d); if (az === null) az = L.azHint || 0;
    const el0 = elOf(fk.d);
    const evalEl = el => legFK(side, H, Bq, fk, dirAzEl(side, az, el));
    const g = el => minContact(evalEl(el), tSoft);
    let el = el0;
    if (L.mode === 'glide') el = nearestRoot2(g, el0, 0, 120);
    else if (g(el0) < 0) el = nearestRoot(g, el0, el0, 170);
    lp = evalEl(el);
    lp.mode = L.mode; lp.s = fk.s; lp.el = el; lp.a = fk.a;
    lp.fk = Object.assign({}, fk, { d: dirAzEl(side, az, el) });
  }
  const t = toeAngle(lp.qFoot, lp.ballJ, lp.s, lp.toeLimit);
  lp.toe = t; lp.qToe = lp.qFoot.clone().multiply(qAx(AX, t));
  lp.heelPt = lp.A.clone().add(BODY.heel.clone().applyQuaternion(lp.qFoot));
  lp.ballPt = lp.A.clone().add(BODY.ballBot.clone().applyQuaternion(lp.qFoot));
  lp.tipPt = lp.ballJ.clone().add(BODY.toeTip.clone().applyQuaternion(lp.qToe));
  return lp;
}
function armPose(side, T12, Rt, a) {
  const S = T12.clone().add(V3(side * BODY.shoulder.x, BODY.shoulder.y, BODY.shoulder.z).applyQuaternion(Rt));
  const Wt = S.clone().add(a.dir.clone().normalize().multiplyScalar(a.r * BODY.arm).applyQuaternion(Rt));
  const pole = a.pole.clone().normalize().applyQuaternion(Rt);
  const ik = ik2(S, Wt, BODY.upperArm, BODY.foreArm, pole);
  const E = ik.mid, W = ik.end;
  const fd = W.clone().sub(E).normalize();
  const palm = a.palm.clone().normalize().applyQuaternion(Rt);
  const hd = a.hand ? fd.clone().lerp(a.hand.clone().normalize().applyQuaternion(Rt), a.hw || 0.55).normalize() : fd;
  return {
    S, E, W, palm,
    qUpper: basisQuat(S.clone().sub(E), pole),
    qFore: basisQuat(E.clone().sub(W), pole),
    qHand: basisQuat(hd.clone().negate(), palm),
  };
}
function computeCoM(p) {
  const c = V3(); let m = 0;
  const add = (pt, w) => { c.addScaledVector(pt, w); m += w; };
  add(p.pp.clone().add(V3(0, 0.02, 0).applyQuaternion(p.Rp)), MASS.pelvis);
  add(p.L0.clone().add(V3(0, 0.06, 0.02).applyQuaternion(p.Rl)), MASS.abd);
  add(p.T12.clone().add(V3(0, 0.15, 0.02).applyQuaternion(p.Rt)), MASS.thorax);
  add(p.HJ.clone().add(V3(0, 0.06, 0.01).applyQuaternion(p.Rh)), MASS.head);
  for (const s of RL) {
    const a = p.arms[s], l = p.legs[s];
    add(a.S.clone().lerp(a.E, 0.436), MASS.ua); add(a.E.clone().lerp(a.W, 0.43), MASS.fa);
    add(a.W.clone().add(V3(0, -0.07, 0).applyQuaternion(a.qHand)), MASS.hand);
    add(l.H.clone().lerp(l.K, 0.433), MASS.thigh); add(l.K.clone().lerp(l.A, 0.433), MASS.shin);
    add(l.A.clone().add(V3(0, -0.04, 0.05).applyQuaternion(l.qFoot)), MASS.foot);
  }
  return c.divideScalar(m);
}
function buildPose(P, pp) {
  const Bq = qAx(AY, P.yaw);
  const Rp = Bq.clone().multiply(eul(P.pelvis[0], P.pelvis[1], P.pelvis[2]));
  const L0 = pp.clone().add(BODY.lumbarJ.clone().applyQuaternion(Rp));
  const Rl = Rp.clone().multiply(eul(P.spine[0], P.spine[2], P.spine[4]));
  const T12 = L0.clone().add(V3(0, BODY.lumbarLen, 0).applyQuaternion(Rl));
  const Rt = Rl.clone().multiply(eul(P.spine[1], P.spine[3], P.spine[5]));
  const C7 = T12.clone().add(BODY.thoraxTop.clone().applyQuaternion(Rt));
  // head: the authored pose, plus (polish) a share of the turn toward the hand she is looking at; the eyes take the rest
  let hYaw = P.head[0], hPitch = P.head[1], eyes = { yaw: 0, pitch: 0 };
  if (P.polish) {
    const mix = sfx => {
      let sw = 0, y = 0, p = 0;
      for (const s of RL) { const a = P.arms[s], w = a['gz' + sfx]; sw += w; y += w * a['gy' + sfx]; p += w * a['gp' + sfx]; }
      const n = Math.max(1, sw);
      return { y: y / n, p: p / n, act: Math.min(1, sw) };
    };
    const gh = mix(''), ge = mix('E');
    hYaw += clamp(GAZE.headYaw * gh.act * (gh.y - P.head[0]), -25, 25);
    hPitch += GAZE.headPitch * gh.act * (gh.p - P.head[1]);
    eyes = { yaw: clamp(ge.y - hYaw, -GAZE.eyeYaw, GAZE.eyeYaw), pitch: clamp(ge.p - hPitch, -GAZE.eyeUp, GAZE.eyeDown) };
  }
  const Rn = Rt.clone().multiply(qAx(AY, hYaw * 0.3)).multiply(qAx(AX, hPitch * 0.4));
  const HJ = C7.clone().add(BODY.neck.clone().applyQuaternion(Rn));
  const Rh = Rn.clone().multiply(qAx(AY, hYaw * 0.7)).multiply(qAx(AX, hPitch * 0.6)).multiply(qAx(AZ, P.head[2]));
  const pose = { pp: pp.clone(), Bq, Rp, L0, Rl, T12, Rt, C7, Rn, HJ, Rh, eyes, arms: {}, legs: {} };
  for (const s of RL) pose.arms[s] = armPose(SIDE[s], T12, Rt, P.arms[s]);
  for (const s of RL) {
    const side = SIDE[s];
    const H = pp.clone().add(V3(side * BODY.hipHalf, 0, 0).applyQuaternion(Rp));
    pose.legs[s] = legPose(side, H, Bq, P.legs[s], P.mods, s);
  }
  pose.com = computeCoM(pose);
  return pose;
}
function plantBalance(pl) {     // where the weight sits over a planted foot (independent of the pelvis)
  const fa = plantAnkle(pl), f = fdir(pl.phi);
  const flat = V3(fa.A.x, 0, fa.A.z).addScaledVector(f, 0.015);                  // over the front of the heel / arch
  const up = V3(fa.ballJ.x, 0, fa.ballJ.z).addScaledVector(f, 0.012).add(V3(0, 0, 0.012)); // over the balls of the feet
  return flat.lerp(up, sstep(0, 12, pl.rel || 0));
}
function balancePoint(lp, L) {
  if (lp.mode === 'plant') return plantBalance(lp.pl);
  if (L && L.balPl) return plantBalance(L.balPl);   // a moving foot takes weight where it will land / where it left
  return V3(lp.ballPt.x, 0, lp.ballPt.z);
}
function balanceTarget(P, pose) {
  const t = balancePoint(pose.legs.L, P.legs.L).lerp(balancePoint(pose.legs.R, P.legs.R), P.w);
  if (P.mods && P.mods.balOffZ) t.z += P.mods.balOffZ;
  return t;
}
function pelvisY(P, x, z) {
  const Rp = qAx(AY, P.yaw).multiply(eul(P.pelvis[0], P.pelvis[1], P.pelvis[2]));
  let best = Infinity;
  for (const s of RL) {
    const L = P.legs[s]; if (L.mode !== 'plant') continue;
    const side = SIDE[s], share = s === 'R' ? P.w : 1 - P.w;
    const A = plantAnkle(L.pl).A;
    const off = V3(side * BODY.hipHalf, 0, 0).applyQuaternion(Rp);
    const hx = x + off.x - A.x, hz = z + off.z - A.z, h2 = hx * hx + hz * hz;
    const d = legDist(P.knee);
    const y = (h2 < d * d ? Math.sqrt(d * d - h2) : 0) + A.y - off.y + (1 - sstep(0.05, 0.35, share)) * 0.05;
    best = Math.min(best, y);
  }
  return best === Infinity ? BODY.ankleH + BODY.leg : best;
}
/* ---------- pelvic roll ----------
   With the weight on one leg, a closed, unweighted leg would have to bend a little to keep its foot flat. The pelvis absorbs up to
   ROLL_MAX° of that by letting the free hip rise (crossed 5th, a free foot resting in 1st while the weight is on one leg); the knee takes
   any remainder. The roll is *solved*, not iterated together with the balance: rollPush() is the net push of every hip that sits lower
   than its leg needs (zero when none does), it never increases with the roll, so its root is unique and the pose is a function of the
   key parameters. (Iterating it with the balance limit-cycled in crossed positions, where a 0.1° roll moves a straight leg's knee by 1 cm.)
   A brushing foot that is on its way into or out of a closed position blends the roll toward the one the closed key pose has (omega,
   rollClosed from evalParams), so the pelvis does not change its tilt in a single frame when the foot lands or leaves. */
const ROLL_MAX = 2.5;
const CLOSE_SPAN = 0.3;   // the pelvis settles into a closed position over the last 30 % of the ankle's path
function rolled(P, roll) {
  if (!roll) return P;
  const Q = Object.assign({}, P); Q.pelvis = [P.pelvis[0], P.pelvis[1] + roll, P.pelvis[2]]; return Q;
}
function rollPush(P, x, z, roll) {      // deg; > 0 asks for more roll. Same quantity the pose would give for hips at (x, pelvisY, z)
  const Pr = rolled(P, roll), y = pelvisY(Pr, x, z);
  const Rp = qAx(AY, Pr.yaw).multiply(eul(Pr.pelvis[0], Pr.pelvis[1], Pr.pelvis[2]));
  let d = 0;
  for (const s of RL) {
    const L = Pr.legs[s]; if (L.mode !== 'plant' && L.mode !== 'slide') continue;
    const side = SIDE[s], share = s === 'R' ? Pr.w : 1 - Pr.w;
    const off = V3(side * BODY.hipHalf, 0, 0).applyQuaternion(Rp);
    const H = V3(x + off.x, y + off.y, z + off.z);
    const A = L.mode === 'plant' ? plantReached(L.pl, H).fa.A : V3(L.ankle.x, BODY.ankleH, L.ankle.z);
    const reach = share >= 0.35 && L.mode === 'plant' ? legDist(Pr.knee) : BODY.leg;
    const h2 = (H.x - A.x) ** 2 + (H.z - A.z) ** 2;
    const need = Math.sqrt(Math.max(0, reach * reach - h2)) - (H.y - A.y);
    if (need > 0) d += side * Math.asin(clamp(need / 2 / BODY.hipHalf, -0.2, 0.2)) * R2D;
  }
  return d;
}
function solveRoll(P, x, z, r0) {   // the roll nearest to r0 at which no hip is too low (a one-sided leg leaves a flat zero zone: its edge)
  let r = clamp(r0, -ROLL_MAX, ROLL_MAX), f = rollPush(P, x, z, r);
  if (f === 0) return r;
  let a = null, fa = 0, b = null, fb = 0;      // a: push > 0 (root above), b: push <= 0 (root at or below)
  const note = (rr, ff) => { if (ff > 0) { if (a === null || rr > a) { a = rr; fa = ff; } } else if (b === null || rr < b) { b = rr; fb = ff; } };
  note(r, f);
  for (let k = 0; k < 70; k++) {
    let rn;
    if (a !== null && b !== null) {
      if (b - a < 1e-10) return b;
      rn = a + fa / (fa - fb) * (b - a);
      if (!(rn > a && rn < b) || k % 3 === 2) rn = 0.5 * (a + b);
    } else {
      const cur = a !== null ? a : b, fc = a !== null ? fa : fb;
      rn = clamp(cur + fc, -ROLL_MAX, ROLL_MAX);     // the push is -1 deg per deg of roll in the linear range: one Newton step lands on the root
      if (rn === cur) return cur;                    // out of range: the clamp
    }
    f = rollPush(P, x, z, rn);
    if (f === 0 || (f > 0 && f < 1e-9) || (f < 0 && f > -1e-9)) { if (f !== 0 || a === null) return rn; if (b === null || rn < b) { b = rn; fb = 0; } continue; }
    note(rn, f);
  }
  return a !== null && b !== null ? 0.5 * (a + b) : (a !== null ? a : b);
}
function solvePose(P, init) {
  // (x, z) of the pelvis: where the centre of mass sits over the support. With the roll slaved to the pelvis position the balance is stiff
  // in wide stances (0.1° of roll per mm of pelvis shift moves the torso by ~2 mm), so the plain fixed-point step of the old solver
  // overshoots there; a Broyden step (secant update of the 2x2 balance Jacobian) does not.
  let x = init ? init.x : 0, z = init ? init.z : 0, pose = null;
  let st = init && init.roll ? init.roll : 0;    // the roll carried from frame to frame (a free hip that has been lifted stays lifted)
  let roll = st, settled = false;
  let om = 0, rc = 0;   // a brushing foot on its way into / out of a closed position: the roll it will have there, and how much of it counts now
  for (const s of RL) { const L = P.legs[s]; if (L.mode === 'slide' && L.omega > om) { om = L.omega; rc = L.rollClosed; } }
  const J0 = 0.87;                               // d(COM)/d(pelvis) of a rigid body hanging on fixed feet, about 1 / 1.15
  let J = [J0, 0, 0, J0], prevS = null, prevF = null, done = false, it = 0, res = 0;
  for (; it < 40; it++) {
    if (settled) {   // level the hips once balance has settled (cold start: carried roll until then)
      const r1 = solveRoll(P, x, z, st);
      st = r1; roll = om > 0 ? solveRoll(P, x, z, om * rc + (1 - om) * r1) : r1;
    }
    const Pr = rolled(P, roll);
    pose = buildPose(Pr, V3(x, pelvisY(Pr, x, z), z));
    const tg = balanceTarget(Pr, pose);
    const fx = pose.com.x - tg.x, fz = pose.com.z - tg.z, e2 = fx * fx + fz * fz; res = e2;
    if (e2 < 1e-10 && settled) { done = true; break; }
    const wasSettled = settled;
    settled = e2 < 4e-4;
    if (settled !== wasSettled || !prevS) { J = [J0, 0, 0, J0]; }
    else {   // Broyden update
      const sx = x - prevS[0], sz = z - prevS[1], yx = fx - prevF[0], yz = fz - prevF[1];
      const n2 = sx * sx + sz * sz;
      if (n2 > 1e-14) {
        const rx = yx - (J[0] * sx + J[1] * sz), rz = yz - (J[2] * sx + J[3] * sz);
        J = [J[0] + rx * sx / n2, J[1] + rx * sz / n2, J[2] + rz * sx / n2, J[3] + rz * sz / n2];
      }
    }
    prevS = [x, z]; prevF = [fx, fz];
    const det = J[0] * J[3] - J[1] * J[2];
    let stx, stz;
    if (Math.abs(det) > 1e-3 * J0 * J0) { stx = -(J[3] * fx - J[1] * fz) / det; stz = -(-J[2] * fx + J[0] * fz) / det; }
    else { stx = -fx / J0; stz = -fz / J0; }
    const sl = Math.hypot(stx, stz); if (sl > 0.15) { stx *= 0.15 / sl; stz *= 0.15 / sl; }
    x += stx; z += stz;
  }
  if (!done) {   // out of iterations: settle on the last step
    if (settled) { const r1 = solveRoll(P, x, z, st); st = r1; roll = om > 0 ? solveRoll(P, x, z, om * rc + (1 - om) * r1) : r1; }
    const Pr = rolled(P, roll);
    pose = buildPose(Pr, V3(x, pelvisY(Pr, x, z), z));
  }
  const Pr = rolled(P, roll);
  pose.target = balanceTarget(Pr, pose);
  pose.autoRoll = roll;
  pose.warm = { x, z, roll: st };
  pose.iters = it; pose.resid = Math.sqrt(res);   // diagnostics: balance iterations used and the last balance error (m)
  return pose;
}
function fkFromLeg(side, Bq, lp) {
  const qTL = Bq.clone().invert().multiply(lp.qThigh);
  const d = DOWN.clone().applyQuaternion(qTL);
  const qSw = new THREE.Quaternion().setFromUnitVectors(DOWN, d);
  const qTw = qSw.clone().invert().multiply(qTL);
  const tw = wrap180(2 * Math.atan2(qTw.y, qTw.w) * R2D);
  const qK = lp.qThigh.clone().invert().multiply(lp.qShin);
  const knee = wrap180(2 * Math.atan2(qK.x, qK.w) * R2D);
  const qA = lp.qShin.clone().invert().multiply(lp.qFoot);
  const zf = AZ.clone().applyQuaternion(qA);
  const a = Math.atan2(-zf.y, zf.z) * R2D;
  const res = qAx(AX, a).invert().multiply(qA);
  return { d, tau: side * tw, knee, a, res, s: lp.s || 0 };
}

/* ---------- monotone cubic tracks ---------- */
function monoTrack(ts, ys) {
  const n = ts.length, m = new Array(n).fill(0), dk = [], h = [];
  for (let k = 0; k < n - 1; k++) { h[k] = ts[k + 1] - ts[k]; dk[k] = (ys[k + 1] - ys[k]) / h[k]; }
  for (let k = 1; k < n - 1; k++) {
    if (dk[k - 1] * dk[k] <= 0) m[k] = 0;
    else { const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1]; m[k] = (w1 + w2) / (w1 / dk[k - 1] + w2 / dk[k]); }
  }
  return (k, u) => {
    const hh = h[k], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[k] + (u3 - 2 * u2 + u) * hh * m[k] + (-2 * u3 + 3 * u2) * ys[k + 1] + (u3 - u2) * hh * m[k + 1];
  };
}

/* ---------- authoring helpers ---------- */
const F = (pos, rel = 0) => ({ mode: 'plant', pos, rel });
const Gl = az => ({ mode: 'glide', az });
const Air = (az, el, o = {}) => ({ mode: 'air', az, el, knee: o.knee || 0 });

/* ---------- movement library ---------- */
const PREP = [  // 5-6-7-8: bras bas → en avant → à la seconde
  [0, { w: .5, knee: 0, arms: 'low', head: [0, 0, 0], legs: { R: F('1'), L: F('1') } }],
  [2, { arms: 'first', head: [0, 9, 0] }],
  [4, { arms: 'second', head: [0, 0, 0] }],
];
const MOVES = [
  {
    id: 'positions', name: '기본 포지션', fr: 'Les cinq positions', bpm: 66, intro: 4, cam: 'high',
    desc: '발 포지션 1번부터 5번까지를 탄듀로 이어 가며, 각 포지션에 맞춘 팔 자세를 함께 봅니다.',
    keys: [
      [0, { w: .5, knee: 0, arms: 'low', legs: { R: F('1'), L: F('1') } }],
      [4, {}],
      [5, { w: 0, legs: { R: Gl(90) }, arms: 'first' }],
      [6, { w: .5, legs: { R: F('2') }, arms: 'second' }],
      [8, {}],
      [9, { w: 0, legs: { R: Gl(90) } }],
      [10, { w: .5, legs: { R: F('3') }, arms: { R: 'first', L: 'second' } }],
      [12, {}],
      [13, { w: 0, legs: { R: Gl(-8) } }],
      [14, { w: .5, legs: { R: F('4') }, arms: { R: 'fifth', L: 'second' } }],
      [16, {}],
      [17, { w: 0, legs: { R: Gl(-8) } }],
      [18, { w: .5, legs: { R: F('5') }, arms: 'fifth' }],
      [20, {}],
      [21, { w: 0, legs: { R: Gl(-8) }, arms: 'second' }],
      [22, { w: .5, legs: { R: F('1') }, arms: 'low' }],
      [24, {}],
    ],
    steps: [
      { t0: 0, t1: 4, title: '1번 포지션', fr: 'Première', arms: '브라 바 (준비 자세)', cues: [
        '양 뒤꿈치를 붙이고 발끝은 바깥으로. 턴아웃은 발목이 아니라 고관절에서 돌린다.',
        '무릎뼈는 발끝과 같은 방향을 향하고 다리는 곧게 편다.',
        '체중은 두 발에 고르게, 엄지발가락 아래·새끼발가락 아래·뒤꿈치 세 점으로 선다.',
        '팔은 브라 바: 허벅지 앞에서 살짝 떨어져 둥글게, 손끝은 서로 가깝게.'] },
      { t0: 4, t1: 8, title: '2번 포지션', fr: 'Seconde', arms: '아 라 스공드', cues: [
        '오른발을 탄듀 아 라 스공드로 뻗었다가 뒤꿈치를 내려 선다.',
        '뒤꿈치 사이 간격은 자기 발 길이의 1~1.5배.',
        '골반은 두 발의 정가운데로 옮겨 체중을 반반 나눈다.',
        '팔은 아 라 스공드: 어깨보다 조금 낮고 몸보다 조금 앞, 팔꿈치는 뒤에서 받친다.'] },
      { t0: 8, t1: 12, title: '3번 포지션', fr: 'Troisième', arms: '오른팔 앙 아방 · 왼팔 아 라 스공드', cues: [
        '탄듀 아 라 스공드에서 오른발을 앞으로 닫는다.',
        '앞발 뒤꿈치를 뒷발 장심(발 가운데) 앞에 붙인다.',
        '두 다리 안쪽을 맞붙이듯 모으고 무릎은 끝까지 편다.'] },
      { t0: 12, t1: 16, title: '4번 포지션', fr: 'Quatrième', arms: '오른팔 앙 오 · 왼팔 아 라 스공드', cues: [
        '탄듀 드방으로 뻗은 발을 발 길이 하나만큼 앞에 내려놓는다 (5번에서 앞으로 뺀 자리).',
        '체중은 두 발 사이 가운데. 골반이 앞이나 뒤로 쏠리지 않게.',
        '두 발 모두 턴아웃을 유지하고 앞발 뒤꿈치를 앞으로 민다.'] },
      { t0: 16, t1: 20, title: '5번 포지션', fr: 'Cinquième', arms: '앙 오 (RAD 5번 · 바가노바 3번)', cues: [
        '앞발 뒤꿈치를 뒷발 엄지발가락 관절 앞에 붙여 교차한다. 자기 턴아웃 범위 안에서만.',
        '허벅지 안쪽부터 발목까지 두 다리를 하나처럼 모은다.',
        '팔은 앙 오: 머리 위 조금 앞. 고개를 들지 않아도 눈 끝에 손이 보이는 위치.'] },
      { t0: 20, t1: 24, title: '1번으로 닫기', fr: 'Fermer', arms: '아 라 스공드 → 브라 바', cues: [
        '탄듀 드방으로 뻗었다가 1번 포지션으로 닫는다.',
        '팔은 앙 오에서 아 라 스공드로 열고, 손끝을 마지막으로 브라 바까지 내린다.'] },
    ],
    mistakes: ['kneesFront'],
  },
  {
    id: 'demi-plie', name: '드미 플리에', fr: 'Demi-plié', bpm: 60, intro: 4, cam: 'front',
    desc: '1번 포지션에서 뒤꿈치를 바닥에 둔 채 무릎을 발끝 방향으로 굽혔다 펴는, 모든 점프와 회전의 출발점입니다.',
    keys: [
      ...PREP,
      [6, { knee: 70 }],
      [8, { knee: 0 }],
      [10, { knee: 70 }],
      [12, { knee: 0 }],
      [14, { arms: 'low' }],
      [16, {}],
    ],
    steps: [
      { t0: 0, t1: 4, title: '준비', fr: 'Préparation', arms: '브라 바 → 앙 아방 → 아 라 스공드', cues: [
        '5·6에 팔을 앙 아방으로 들고, 7·8에 아 라 스공드로 연다.',
        '앙 아방에서 시선은 손으로, 팔이 열리면 다시 정면으로.'] },
      { t0: 4, t1: 6, title: '내려가기', fr: 'Plier', cues: [
        '무릎은 두 번째·세 번째 발가락 방향으로 열며 굽힌다.',
        '뒤꿈치는 끝까지 바닥에 둔다. 아킬레스건이 늘어나는 깊이까지만.',
        '골반은 중립, 꼬리뼈는 바닥을 향한다. 엉덩이를 뒤로 빼지 않는다.',
        '몸은 내려가도 정수리는 위로 늘린다.'] },
      { t0: 6, t1: 8, title: '올라오기', fr: 'Étirer', cues: [
        '바닥을 밀어내며 내려갈 때와 같은 속도로 올라온다.',
        '다 올라오면 무릎을 끝까지 펴고 허벅지 안쪽을 앞으로 돌려 턴아웃을 유지한다.',
        '바닥에서 멈추지 않고 하나의 흐름으로 이어 간다.'] },
      { t0: 8, t1: 12, title: '한 번 더', fr: 'Répéter', cues: [
        '같은 깊이, 같은 속도로 반복한다.',
        '두 번째에도 뒤꿈치와 무릎 방향이 처음과 같은지 확인한다.'] },
      { t0: 12, t1: 16, title: '마무리', fr: 'Fin', arms: '아 라 스공드 → 브라 바', cues: [
        '팔을 아 라 스공드에서 브라 바로 내린다. 손끝이 가장 마지막에 도착한다.'] },
    ],
    mistakes: ['kneesIn', 'heelsUp', 'pelvisTilt'],
  },
  {
    id: 'grand-plie', name: '그랑 플리에', fr: 'Grand plié', bpm: 60, intro: 4, cam: 'q34',
    desc: '드미 플리에를 지나 깊게 내려가는 플리에. 1번 포지션에서는 바닥 근처에서만 뒤꿈치를 들고, 올라올 때 가장 먼저 내립니다.',
    ease: { 6: { rel: -3 }, 8: { rel: 4 } },    // heels leave the floor late on the way down, and come back first on the way up
    keys: [
      ...PREP,
      [6, { knee: 70, arms: 'demi' }],
      [8, { knee: 122, legs: { R: F('1', 28), L: F('1', 28) }, arms: 'low', head: [0, 6, 0] }],
      [10, { knee: 70, legs: { R: F('1'), L: F('1') }, arms: 'first', head: [0, 9, 0] }],
      [12, { knee: 0, arms: 'second', head: [0, 0, 0] }],
      [14, { arms: 'low' }],
      [16, {}],
    ],
    steps: [
      { t0: 0, t1: 4, title: '준비', fr: 'Préparation', arms: '브라 바 → 앙 아방 → 아 라 스공드', cues: [
        '5·6에 팔을 앙 아방으로, 7·8에 아 라 스공드로 연다.'] },
      { t0: 4, t1: 6, title: '드미 플리에 지나기', fr: 'Demi-plié', cues: [
        '먼저 드미 플리에 깊이까지 내려간다. 여기까지 뒤꿈치는 바닥에.',
        '팔은 아 라 스공드에서 천천히 내려오기 시작한다.'] },
      { t0: 6, t1: 8, title: '가장 깊이', fr: 'Grand plié', cues: [
        '드미 플리에를 지나면서 뒤꿈치를 필요한 만큼만 든다.',
        '허벅지가 바닥과 거의 평행할 때까지. 상체는 수직으로 내려간다.',
        '팔은 브라 바에 도착한다. 가장 낮은 곳에서 머물지 않는다.'] },
      { t0: 8, t1: 10, title: '올라오기', fr: 'Remonter', cues: [
        '올라오기 시작하자마자 뒤꿈치부터 바닥에 내린다.',
        '팔은 앙 아방을 지나고, 시선은 손을 따라간다.',
        '무릎은 계속 발끝 방향을 향한다.'] },
      { t0: 10, t1: 12, title: '펴기', fr: 'Étirer', cues: [
        '드미 플리에를 지나 무릎을 끝까지 편다.',
        '팔은 아 라 스공드로 열고 시선은 정면.'] },
      { t0: 12, t1: 16, title: '마무리', fr: 'Fin', arms: '아 라 스공드 → 브라 바', cues: [
        '팔을 브라 바로 내린다.',
        '2번 포지션 그랑 플리에는 뒤꿈치를 들지 않는다는 점도 함께 기억한다.'] },
    ],
    mistakes: ['leanForward', 'heelsEarly', 'kneesIn'],
  },
  {
    id: 'releve', name: '를르베', fr: 'Relevé', bpm: 66, intro: 4, cam: 'side34',
    desc: '드미 플리에에서 바닥을 밀어 발볼(드미 푸앵트) 위로 올라서는 동작. 스프링과 함께 발을 살짝 모아 들입니다.',
    ease: { 5: { low: 2 } },    // the spring up onto the balls of the feet
    keys: [
      ...PREP,
      [5, { knee: 60 }],
      [6, { knee: 0, legs: { R: F('1r', RELEVE), L: F('1r', RELEVE) } }],
      [8, {}],
      [9, { knee: 60, legs: { R: F('1'), L: F('1') } }],
      [10, { knee: 0 }],
      [12, {}],
      [14, { arms: 'low' }],
      [16, {}],
    ],
    steps: [
      { t0: 0, t1: 4, title: '준비', fr: 'Préparation', arms: '브라 바 → 앙 아방 → 아 라 스공드', cues: [
        '팔을 아 라 스공드로 열고 1번 포지션에 고르게 선다.'] },
      { t0: 4, t1: 5, title: '드미 플리에', fr: 'Demi-plié', cues: [
        '를르베 전에 드미 플리에로 바닥을 느낀다. 뒤꿈치는 바닥에.'] },
      { t0: 5, t1: 6, title: '를르베', fr: 'Relevé', cues: [
        '바닥을 밀어내며 발볼 위로 올라서고 무릎을 동시에 편다.',
        '작은 스프링으로 발을 살짝 모아 들인다.',
        '체중은 엄지·둘째 발가락 아래로. 발목이 바깥으로 꺾이지 않게.',
        '몸 전체가 발볼 위로 조금 앞으로 옮겨 간다.'] },
      { t0: 6, t1: 8, title: '균형 유지', fr: 'Tenir', cues: [
        '뒤꿈치를 앞으로(서로를 향해) 밀어 턴아웃을 지킨다.',
        '배와 엉덩이를 끌어올려 발볼 위에 몸을 쌓는다.',
        '어깨는 내리고 목은 길게.'] },
      { t0: 8, t1: 9, title: '내려오기', fr: 'Descendre', cues: [
        '발가락 → 발볼 → 뒤꿈치 순서로 굴리듯 내려와 드미 플리에.',
        '발은 다시 1번 포지션 자리로 돌아간다.'] },
      { t0: 9, t1: 12, title: '펴기', fr: 'Étirer', cues: [
        '무릎을 끝까지 펴고 체중을 두 발에 고르게 되돌린다.'] },
      { t0: 12, t1: 16, title: '마무리', fr: 'Fin', arms: '아 라 스공드 → 브라 바', cues: [
        '팔을 브라 바로 내린다.'] },
    ],
    mistakes: ['weightBack', 'sickle'],
  },
  {
    id: 'tendu', name: '바뜨망 탄듀', fr: 'Battement tendu', bpm: 66, intro: 4, cam: 'q34r',
    desc: '발바닥으로 바닥을 쓸며 다리를 뻗어 발끝까지 포인하는 동작. 앞·옆·뒤·옆(앙 크루아) 순서로 1번 포지션에서 합니다.',
    keys: [
      [0, { w: .5, knee: 0, arms: 'low', head: [0, 0, 0], legs: { R: F('1'), L: F('1') } }],
      [2, { arms: 'first', head: [0, 9, 0] }],
      [4, { arms: 'second', head: [0, 0, 0], w: 0 }],
      [5, { legs: { R: Gl(-9) } }],
      [6, { legs: { R: F('1') } }],
      [7, { legs: { R: Gl(90) } }],
      [8, { legs: { R: F('1') } }],
      [9, { legs: { R: Gl(189) } }],
      [10, { legs: { R: F('1') } }],
      [11, { legs: { R: Gl(90) } }],
      [12, { legs: { R: F('1') } }],
      [14, { w: .5, arms: 'low' }],
      [16, {}],
    ],
    steps: [
      { t0: 0, t1: 4, title: '준비', fr: 'Préparation', arms: '브라 바 → 앙 아방 → 아 라 스공드', cues: [
        '팔을 아 라 스공드로 열면서 체중을 왼발(지지하는 다리)로 옮긴다.',
        '오른발은 바닥에 그대로 두고 체중만 뺀다.'] },
      { t0: 4, t1: 6, title: '탄듀 드방', fr: 'Tendu devant', cues: [
        '뒤꿈치를 앞으로 내밀며 나간다. 앞으로 갈 때는 뒤꿈치가 앞장선다.',
        '발바닥으로 바닥을 쓸며 뒤꿈치 → 발볼 → 발끝 순서로 포인.',
        '다 뻗었을 때 발끝만 바닥에, 무릎은 완전히 편다.',
        '돌아올 때는 발끝이 앞장서며 반대 순서로 바닥을 쓴다.'] },
      { t0: 6, t1: 8, title: '탄듀 아 라 스공드', fr: 'Tendu à la seconde', cues: [
        '지지하는 발 뒤꿈치와 일직선이 되도록 옆으로 뻗는다.',
        '뒤꿈치는 앞을 향하게 해 턴아웃을 유지한다.',
        '골반은 수평. 작업 다리 쪽 엉덩이가 따라 올라가지 않게.'] },
      { t0: 8, t1: 10, title: '탄듀 데리에르', fr: 'Tendu derrière', cues: [
        '뒤로 갈 때는 발끝이 앞장선다.',
        '엄지발가락 쪽이 바닥에 닿게 한다. 새끼발가락으로 서지 않는다.',
        '다리를 뒤로 보내도 상체와 골반은 앞으로 기울지 않는다.',
        '돌아올 때는 뒤꿈치가 앞장선다.'] },
      { t0: 10, t1: 12, title: '탄듀 아 라 스공드', fr: 'Tendu à la seconde', cues: [
        '처음의 아 라 스공드와 같은 자리로 뻗는다.',
        '닫을 때도 다리는 펴진 채로 1번 포지션까지 쓸어 들어온다.'] },
      { t0: 12, t1: 16, title: '마무리', fr: 'Fin', arms: '아 라 스공드 → 브라 바', cues: [
        '체중을 두 발로 되돌리고 팔은 브라 바로 내린다.'] },
    ],
    mistakes: ['bentKnee', 'hipHike', 'noWeightShift'],
  },
  {
    id: 'arabesque', name: '아라베스크', fr: 'Première arabesque', bpm: 60, intro: 4, cam: 'side',
    desc: '한 다리로 서서 다른 다리를 뒤로 길게 뻗는 자세. 1번 아라베스크는 지지하는 다리 쪽 팔을 앞으로 뻗습니다.',
    keys: [
      [0, { w: .5, knee: 0, arms: 'low', head: [0, 0, 0], legs: { R: F('1'), L: F('1') } }],
      [2, { arms: 'first', head: [0, 9, 0] }],
      [4, { arms: 'second', head: [0, 0, 0], w: 0 }],
      [6, { legs: { R: Gl(184) }, arms: { L: 'arabF', R: 'arabS' }, head: [0, -4, 0] }],
      [8, { legs: { R: Air(182, 90) }, pelvis: [18, -4, -6], spine: [-6, -2, 2, 2, 3, 3], head: [0, -6, 0] }],
      [10, {}],
      [11, { legs: { R: Gl(184) }, pelvis: [0, 0, 0], spine: [0, 0, 0, 0, 0, 0], head: [0, -4, 0] }],
      [12, { legs: { R: F('1') }, arms: 'second', head: [0, 0, 0] }],
      [14, { w: .5, arms: 'low' }],
      [16, {}],
    ],
    steps: [
      { t0: 0, t1: 4, title: '준비', fr: 'Préparation', arms: '브라 바 → 앙 아방 → 아 라 스공드', cues: [
        '팔을 아 라 스공드로 열며 체중을 왼발로 완전히 옮긴다.'] },
      { t0: 4, t1: 6, title: '탄듀 데리에르', fr: 'Tendu derrière', arms: '1번 아라베스크 팔', cues: [
        '오른발을 탄듀 데리에르로 뻗는다. 발끝이 앞장선다.',
        '왼팔(지지하는 다리 쪽)은 어깨 높이로 앞으로, 오른팔은 옆으로 조금 뒤에.',
        '시선은 앞쪽 손끝 너머로.'] },
      { t0: 6, t1: 8, title: '들어올리기', fr: 'Arabesque', cues: [
        '높이보다 길이: 다리를 멀리 뻗으며 뒤로 들어 올린다.',
        '다리가 높아질수록 골반이 조금 앞으로 기울고, 등 위쪽은 들어 올려 가슴을 세운다.',
        '작업 다리 무릎은 바닥이 아니라 옆을 향하게 턴아웃한다.',
        '어깨는 수평, 가슴은 정면.'] },
      { t0: 8, t1: 10, title: '균형', fr: 'Tenir', cues: [
        '지지하는 다리는 무릎을 펴고 턴아웃을 유지한다.',
        '무게중심은 지지하는 발 한가운데.',
        '앞 팔과 뒤 다리가 서로 반대 방향으로 늘어나는 느낌.'] },
      { t0: 10, t1: 11, title: '내리기', fr: 'Descendre', cues: [
        '다리 길이를 유지한 채 탄듀 데리에르로 내린다.',
        '골반과 상체는 다시 바로 세운다.'] },
      { t0: 11, t1: 12, title: '닫기', fr: 'Fermer', cues: [
        '뒤꿈치가 앞장서며 1번 포지션으로 쓸어 닫는다.'] },
      { t0: 12, t1: 16, title: '마무리', fr: 'Fin', arms: '아 라 스공드 → 브라 바', cues: [
        '체중을 두 발로 되돌리고 팔을 브라 바로 내린다.'] },
    ],
    mistakes: ['hipOpen', 'standingKneeBent', 'chestDrop'],
  },
];

/* ---------- common mistakes (applied to the ghost figure) ---------- */
function workEl(P) { const L = P.legs.R; return L.mode === 'plant' ? 0 : elOf(L.fk.d); }
function eachPlant(P, fn) { for (const s of RL) if (P.legs[s].mode === 'plant') { P.legs[s].pl = Object.assign({}, P.legs[s].pl); fn(P.legs[s].pl, s); } }
const MISTAKES = {
  kneesFront: { label: '발로만 턴아웃', why: '고관절이 돌아가지 않은 채 발끝만 벌려서 무릎뼈가 정면을 향한다. 무릎이 비틀린다.', fix: '발 각도를 줄여서라도 무릎뼈와 발끝 방향을 맞춘다.', apply: P => { P.mods.poleRot = 32; } },
  kneesIn: { label: '무릎이 안으로 말림', why: '굽힐 때 무릎이 엄지발가락 안쪽으로 떨어진다. 발 아치가 무너지고 무릎 안쪽에 부담이 간다.', fix: '무릎을 두 번째·세 번째 발가락 위로 보낸다. 허벅지 바깥으로 돌리는 힘을 쓴다.', apply: P => { P.mods.poleRot = 24; } },
  heelsUp: { label: '드미 플리에에서 뒤꿈치 듦', why: '깊이 내려가려다 뒤꿈치가 떠서 발목이 늘어나지 않는다.', fix: '뒤꿈치가 바닥에 붙어 있는 깊이까지만 내려간다.', apply: P => { const k = sstep(15, 65, P.knee); eachPlant(P, pl => { pl.rel = (pl.rel || 0) + 16 * k; }); P.knee += 8 * k; } },
  pelvisTilt: { label: '엉덩이가 뒤로 빠짐', why: '골반이 앞으로 기울면서 엉덩이가 뒤로 빠지고 허리가 꺾인다.', fix: '꼬리뼈를 바닥 쪽으로 길게 내리고 아랫배를 끌어올린다.', apply: P => { const k = sstep(10, 60, P.knee); P.pelvis[0] += 17 * k; P.spine[0] -= 11 * k; P.spine[1] -= 2 * k; } },
  leanForward: { label: '상체가 앞으로 숙여짐', why: '깊이 내려가면서 엉덩이가 뒤로 빠지고 상체가 앞으로 무너진다.', fix: '벽에 등을 대고 내려가듯 골반을 수직으로 내린다.', apply: P => { const k = sstep(20, 110, P.knee); P.pelvis[0] += 20 * k; P.spine[0] += 7 * k; P.spine[1] += 8 * k; } },
  heelsEarly: { label: '뒤꿈치를 너무 일찍, 높이 듦', why: '드미 플리에 깊이를 지나기도 전에 뒤꿈치가 올라가 체중이 발가락으로 쏠린다.', fix: '드미 플리에를 다 쓴 다음에 필요한 만큼만 든다.', apply: P => { const k = sstep(20, 75, P.knee); eachPlant(P, pl => { pl.rel = Math.max(pl.rel || 0, 48 * k); }); } },
  weightBack: { label: '체중이 뒤에 남음', why: '발볼 위로 몸을 옮기지 않아 무게중심이 지지면 뒤쪽 밖으로 빠진다. 뒤로 넘어지거나 금방 내려오게 된다.', fix: '올라서는 순간 몸 전체를 발볼 위로 조금 앞으로 옮긴다.', apply: P => { let r = 0; eachPlant(P, pl => { r = Math.max(r, pl.rel || 0); }); P.mods.balOffZ = -0.055 * sstep(15, 50, r); } },
  sickle: { label: '발목이 바깥으로 꺾임 (낫 모양 발)', why: '체중이 새끼발가락 쪽으로 쏠리며 발목이 바깥으로 휜다. 발목 염좌의 흔한 원인.', fix: '엄지발가락과 둘째 발가락 아래로 체중을 모은다.', apply: P => { eachPlant(P, (pl, s) => { pl.roll = -SIDE[s] * 15 * sstep(15, 50, pl.rel || 0); }); } },
  bentKnee: { label: '작업 다리 무릎이 굽음', why: '발을 뻗는 동안 무릎이 풀려 다리 라인이 끊긴다.', fix: '허벅지 앞쪽을 끌어올려 무릎을 끝까지 편 채로 바닥을 쓴다.', apply: P => { if (P.legs.R.mode !== 'plant') P.mods.workKnee = 24 * sstep(2, 20, workEl(P)); } },
  hipHike: { label: '골반이 따라 올라감', why: '다리를 옆으로 뻗을 때 작업 다리 쪽 엉덩이가 들린다.', fix: '양쪽 골반을 수평으로 두고 다리만 길게 보낸다.', apply: P => { const g = sstep(3, 25, workEl(P)); P.pelvis[1] -= 8 * g; P.spine[2] += 5 * g; } },
  noWeightShift: { label: '체중을 옮기지 않음', why: '두 발 가운데에 체중을 둔 채 다리를 뻗어 무게중심이 지지하는 발 밖에 있다.', fix: '탄듀 전에 지지하는 다리 위로 골반을 옮긴다.', apply: P => { P.w = 0.5; } },
  hipOpen: { label: '골반이 열림', why: '다리를 높이려고 작업 다리 쪽 골반을 뒤로 돌리고 들어 올렸다.', fix: '골반은 최대한 정면에. 높이는 줄여도 된다.', apply: P => { const g = sstep(20, 90, workEl(P)); P.pelvis[2] -= 22 * g; P.pelvis[1] -= 9 * g; P.spine[4] += 10 * g; P.spine[5] += 10 * g; } },
  standingKneeBent: { label: '지지하는 다리 무릎이 굽음', why: '균형을 잡으려고 지지하는 다리 무릎이 풀린다.', fix: '허벅지 안쪽과 앞쪽을 끌어올려 지지하는 다리를 끝까지 편다.', apply: P => { P.knee += 16 * sstep(5, 60, workEl(P)); } },
  chestDrop: { label: '상체가 너무 숙여짐', why: '다리를 올리면서 가슴이 바닥을 향해 떨어진다.', fix: '등 위쪽을 들어 올려 가슴이 앞을 보게 한다.', apply: P => { const g = sstep(20, 90, workEl(P)); P.pelvis[0] += 20 * g; P.spine[0] += 8 * g; P.spine[1] += 9 * g; } },
};

/* ---------- compile ---------- */
const SCALARS = ['w', 'knee', 'yaw', 'p0', 'p1', 'p2', 's0', 's1', 's2', 's3', 's4', 's5', 'h0', 'h1', 'h2'];
function baseSpec() { return { w: .5, knee: 0, yaw: 0, pelvis: [0, 0, 0], spine: [0, 0, 0, 0, 0, 0], head: [0, 0, 0], arms: { R: 'low', L: 'low' }, legs: { R: F('1'), L: F('1') } }; }
function cloneSpec(s) { return JSON.parse(JSON.stringify(s)); }
function scalarsOf(P) {
  return [P.w, P.knee, P.yaw, P.pelvis[0], P.pelvis[1], P.pelvis[2], ...P.spine, ...P.head];
}
function compileMove(def, T) {
  const POS = buildPositions(T);
  const specs = []; let cur = baseSpec();
  for (const [t, sp] of def.keys) {
    const k = cloneSpec(cur);
    for (const key of Object.keys(sp)) {
      if (key === 'arms') { if (typeof sp.arms === 'string') k.arms = { R: sp.arms, L: sp.arms }; else Object.assign(k.arms, sp.arms); }
      else if (key === 'legs') Object.assign(k.legs, cloneSpec(sp.legs));
      else k[key] = cloneSpec(sp[key]);
    }
    k.t = t; specs.push(k); cur = k;
  }
  const keyParams = specs.map(k => {
    const P = { yaw: k.yaw, w: k.w, knee: k.knee, pelvis: k.pelvis.slice(), spine: k.spine.slice(), head: k.head.slice(), arms: {}, legs: {}, mods: {} };
    for (const s of RL) {
      const side = SIDE[s];
      P.arms[s] = armLocal(k.arms[s], side);
      const L = k.legs[s];
      if (L.mode === 'plant') P.legs[s] = { mode: 'plant', pl: Object.assign({}, POS[L.pos][s], { rel: L.rel || 0, roll: 0 }) };
      else if (L.mode === 'glide') P.legs[s] = { mode: 'glide', azHint: L.az, fk: { d: dirAzEl(side, L.az, 25), tau: T, knee: 0, a: 75, s: 1, res: new THREE.Quaternion() } };
      else P.legs[s] = { mode: 'air', azHint: L.az, fk: { d: dirAzEl(side, L.az, L.el), tau: T, knee: L.knee || 0, a: 75, s: 1, res: new THREE.Quaternion() } };
    }
    return P;
  });
  // a moving foot carries the balance point of its nearest planted placement (prefer where it lands)
  for (const s of RL) {
    keyParams.forEach((P, i) => {
      if (P.legs[s].mode === 'plant') return;
      for (let d = 1; d < keyParams.length; d++) {
        const n = keyParams[i + d], p = keyParams[i - d];
        if (n && n.legs[s].mode === 'plant') { P.legs[s].balPl = n.legs[s].pl; break; }
        if (p && p.legs[s].mode === 'plant') { P.legs[s].balPl = p.legs[s].pl; break; }
      }
    });
  }
  const ts = specs.map(k => k.t);
  let prev = null;
  const poses = keyParams.map(P => { const p = solvePose(P, prev); prev = p.warm; return p; });
  // per-key FK for every leg
  const fks = poses.map(p => {
    const o = {};
    for (const s of RL) {
      const lp = p.legs[s];
      o[s] = lp.mode === 'plant' ? fkFromLeg(SIDE[s], p.Bq, lp) : Object.assign({}, lp.fk, { res: lp.fk.res || new THREE.Quaternion() });
    }
    return o;
  });
  const tr = {};
  const mk = (name, arr) => { tr[name] = monoTrack(ts, arr); };
  const sc = keyParams.map(scalarsOf);
  SCALARS.forEach((n, i) => mk(n, sc.map(r => r[i])));
  for (const s of RL) {
    for (const c of ['x', 'y', 'z']) {
      mk(`a${s}d${c}`, keyParams.map(P => P.arms[s].dir[c]));
      mk(`a${s}p${c}`, keyParams.map(P => P.arms[s].pole[c]));
      mk(`a${s}m${c}`, keyParams.map(P => P.arms[s].palm[c]));
      mk(`a${s}h${c}`, keyParams.map(P => P.arms[s].hand[c]));
      mk(`l${s}d${c}`, fks.map(f => f[s].d[c]));
    }
    mk(`a${s}r`, keyParams.map(P => P.arms[s].r));
    for (const c of ['gz', 'gy', 'gp']) mk(`a${s}${c}`, keyParams.map(P => P.arms[s][c]));
    for (const c of ['tau', 'knee', 'a', 's']) mk(`l${s}${c}`, fks.map(f => f[s][c]));
    mk(`l${s}Ax`, poses.map(p => p.legs[s].A.x));
    mk(`l${s}Az`, poses.map(p => p.legs[s].A.z));
  }
  // plant runs (placement interpolation only inside runs of consecutive planted keys)
  const runs = { R: [], L: [] };
  for (const s of RL) {
    let i = 0;
    while (i < specs.length) {
      if (keyParams[i].legs[s].mode !== 'plant') { i++; continue; }
      let j = i; while (j + 1 < specs.length && keyParams[j + 1].legs[s].mode === 'plant') j++;
      if (j > i) {
        const sub = ts.slice(i, j + 1), pls = keyParams.slice(i, j + 1).map(P => P.legs[s].pl);
        const run = { i0: i, i1: j, tr: {} };
        for (const c of ['x', 'z', 'phi', 'rel', 'roll']) run.tr[c] = monoTrack(sub, pls.map(p => p[c] || 0));
        runs[s].push(run);
      }
      i = j + 1;
    }
  }
  // easing per segment (polish); `def.ease[t]` overrides the segment that starts at count t
  const ease = [];
  for (let k = 0; k + 1 < specs.length; k++) {
    const e = Object.assign({}, EASE0);
    for (const s of RL) {
      const m0 = keyParams[k].legs[s].mode, m1 = keyParams[k + 1].legs[s].mode;
      if (m0 === 'plant' && m1 !== 'plant') e.low = 2;          // leaving a closed position: quick start, soft arrival
      else if (m0 !== 'plant' && m1 === 'plant') e.low = -0.8;  // coming back: held at first, then closed with a little accent
    }
    if (e.low === 0 && keyParams[k].knee - keyParams[k + 1].knee >= 20) e.low = 1;   // straightening the knees: push off the floor, then lengthen
    ease.push(Object.assign(e, def.ease && def.ease[ts[k]]));
  }
  const total = ts[ts.length - 1];
  return { def, T, POS, specs, keyParams, poses, fks, ts, tr, runs, ease, total };
}
function segAt(C, t) {
  const ts = C.ts; t = clamp(t, ts[0], ts[ts.length - 1]);
  let k = 0; while (k < ts.length - 2 && t >= ts[k + 1]) k++;
  return { k, u: (t - ts[k]) / (ts[k + 1] - ts[k]) };
}
function evalParams(C, t, opt) {
  // opt.polish: soft motion (per-part time warps, hand/palm follow-through) plus the gaze channels.
  // opt.lag (0–1, default 1) scales the follow-through and the eyes' lead: 0 gives the exact keyed hand, so a paused
  // or scrubbed pose is the textbook pose. Without polish every line below reduces to the classic evaluation.
  const { k, u } = segAt(C, t), tr = C.tr;
  const polish = !!(opt && opt.polish), lag = polish ? (opt.lag === undefined ? 1 : clamp(opt.lag, 0, 1)) : 0, E = polish ? C.ease[k] : null;
  const uL = polish ? warp(u, E.low) : u, uA = polish ? warp(u, E.arms) : u, uH = polish ? warp(u, E.head) : u;
  const uR = polish && E.rel !== null ? warp(u, E.rel) : uL;
  const g = n => tr[n](k, uL);          // trunk, balance, legs
  const gh = n => tr[n](k, uH);         // head
  // an arm channel sampled `dt` counts away, with the arm easing of the segment it falls in
  const ga = (n, dt) => {
    if (!dt) return tr[n](k, uA);
    const q = segAt(C, t + dt);
    return tr[n](q.k, warp(q.u, C.ease[q.k].arms));
  };
  const P = {
    yaw: g('yaw'), w: clamp(g('w'), 0, 1), knee: Math.max(0, g('knee')),
    pelvis: [g('p0'), g('p1'), g('p2')], spine: [g('s0'), g('s1'), g('s2'), g('s3'), g('s4'), g('s5')], head: [gh('h0'), gh('h1'), gh('h2')],
    arms: {}, legs: {}, mods: {}, k, u, polish,
  };
  const dPalm = -LAG.palm * lag, dHand = -LAG.hand * lag;
  for (const s of RL) {
    P.arms[s] = {
      dir: V3(ga(`a${s}dx`), ga(`a${s}dy`), ga(`a${s}dz`)).normalize(), r: clamp(ga(`a${s}r`), 0.3, 0.999),
      pole: V3(ga(`a${s}px`), ga(`a${s}py`), ga(`a${s}pz`)).normalize(),
      palm: V3(ga(`a${s}mx`, dPalm), ga(`a${s}my`, dPalm), ga(`a${s}mz`, dPalm)).normalize(),
      hand: V3(ga(`a${s}hx`, dHand), ga(`a${s}hy`, dHand), ga(`a${s}hz`, dHand)).normalize(),
    };
    if (polish) P.arms[s].hw = 0.55 + 0.13 * lag;   // a softer wrist while moving: the hand follows the forearm a little less rigidly
    if (polish) {   // where she looks: the head follows the hand now, the eyes get there a little earlier
      const A = P.arms[s];
      A.gz = clamp(ga(`a${s}gz`), 0, 1); A.gy = ga(`a${s}gy`); A.gp = ga(`a${s}gp`);
      A.gzE = clamp(ga(`a${s}gz`, LAG.eye * lag), 0, 1); A.gyE = ga(`a${s}gy`, LAG.eye * lag); A.gpE = ga(`a${s}gp`, LAG.eye * lag);
    }
    const m0 = C.keyParams[k].legs[s].mode, m1 = C.keyParams[k + 1].legs[s].mode;
    if (m0 === 'plant' && m1 === 'plant') {
      const run = C.runs[s].find(r => k >= r.i0 && k + 1 <= r.i1);
      const kk = k - run.i0;
      P.legs[s] = { mode: 'plant', pl: { x: run.tr.x(kk, uL), z: run.tr.z(kk, uL), phi: run.tr.phi(kk, uL), rel: Math.max(0, run.tr.rel(kk, uR)), roll: run.tr.roll(kk, uL) } };
    } else {
      const r0 = C.fks[k][s].res, r1 = C.fks[k + 1][s].res;
      const res = r0.clone().slerp(r1, sstep(0, 1, uL));
      const fk = {
        d: V3(g(`l${s}dx`), g(`l${s}dy`), g(`l${s}dz`)).normalize(), tau: g(`l${s}tau`), knee: Math.max(0, g(`l${s}knee`)),
        a: g(`l${s}a`), s: clamp(g(`l${s}s`), 0, 1), res,
      };
      const contact = m0 !== 'air' && m1 !== 'air';
      let omega = 0, rollClosed = 0;   // how much the pelvic roll already is the one of this foot's closed position (see solvePose)
      if (contact && (m0 === 'plant') !== (m1 === 'plant')) {
        // brushing out of / into a closed position: the floor shapes the foot; the full point arrives over the
        // last stretch of the ankle's path (measured by distance travelled, not by time)
        const kc = m0 === 'plant' ? k : k + 1, ko = m0 === 'plant' ? k + 1 : k;
        const Ac = C.poses[kc].legs[s].A, Ao = C.poses[ko].legs[s].A;
        const span = Math.hypot(Ao.x - Ac.x, Ao.z - Ac.z) || 1e-6;
        const prog = clamp(Math.hypot(g(`l${s}Ax`) - Ac.x, g(`l${s}Az`) - Ac.z) / span, 0, 1);
        fk.a = lerp(C.fks[kc][s].a, C.fks[ko][s].a, sstep(0.25, 1, prog));
        fk.s = lerp(C.fks[kc][s].s, C.fks[ko][s].s, sstep(0.3, 1, prog));
        // only a closed position that carries weight on this foot has one roll to settle into; with the foot unweighted (tendu closing
        // to 1st) the roll is whatever the standing leg last needed and is simply carried on
        const sh = s === 'R' ? C.keyParams[kc].w : 1 - C.keyParams[kc].w;
        omega = (1 - sstep(0, CLOSE_SPAN, prog)) * sstep(0.05, 0.35, sh); rollClosed = C.poses[kc].autoRoll;
      }
      const azHint = (C.keyParams[k + 1].legs[s].azHint !== undefined) ? C.keyParams[k + 1].legs[s].azHint : C.keyParams[k].legs[s].azHint;
      const balPl = m1 === 'plant' ? C.keyParams[k + 1].legs[s].pl : m0 === 'plant' ? C.keyParams[k].legs[s].pl : (C.keyParams[k + 1].legs[s].balPl || C.keyParams[k].legs[s].balPl);
      P.legs[s] = contact
        ? { mode: 'slide', fk, ankle: { x: g(`l${s}Ax`), z: g(`l${s}Az`) }, balPl, omega, rollClosed }
        : { mode: 'air', fk, azHint, balPl };
    }
  }
  return P;
}
function applyMistake(P, id) {
  const m = MISTAKES[id]; if (!m) return P;
  P.pelvis = P.pelvis.slice(); P.spine = P.spine.slice(); P.mods = Object.assign({}, P.mods);
  P.legs = { R: Object.assign({}, P.legs.R), L: Object.assign({}, P.legs.L) };
  m.apply(P);
  return P;
}
function workingSide(P) { return RL.filter(s => P.legs[s].mode !== 'plant'); }

/* ---------- measurement ---------- */
function hull(pts) {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.z - b.z);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function footContacts(lp) {
  const out = [];
  const f = AZ.clone().applyQuaternion(lp.qFoot); f.y = 0; f.normalize();
  const lat = V3(f.z, 0, -f.x);
  const add = (p, hw) => { out.push({ x: p.x + lat.x * hw, z: p.z + lat.z * hw }); out.push({ x: p.x - lat.x * hw, z: p.z - lat.z * hw }); };
  const tol = 0.006;
  if (lp.heelPt.y < 0.01) add(lp.heelPt, 0.022);
  if (lp.ballPt.y < tol) add(lp.ballPt, 0.04);
  if (lp.tipPt.y < tol + 0.004) add(lp.tipPt, lp.ballPt.y < tol ? 0.03 : 0.012);
  return out;
}
function supportPolygon(pose, P) {
  let pts = [];
  for (const s of RL) {
    const share = s === 'R' ? P.w : 1 - P.w;
    const md = pose.legs[s].mode;
    if ((md === 'plant' || md === 'slide') && share > 0.08) pts = pts.concat(footContacts(pose.legs[s]));
  }
  return hull(pts);
}
function signedDist(poly, q) {   // >0 inside
  if (poly.length < 3) return -1;
  let minD = Infinity, inside = true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x, ez = b.z - a.z, L = Math.hypot(ex, ez) || 1e-9;
    const cross = (ex * (q.z - a.z) - ez * (q.x - a.x)) / L;
    if (cross < 0) inside = false;
    const tt = clamp(((q.x - a.x) * ex + (q.z - a.z) * ez) / (L * L), 0, 1);
    minD = Math.min(minD, Math.hypot(q.x - (a.x + ex * tt), q.z - (a.z + ez * tt)));
  }
  return inside ? minD : -minD;
}
function measure(pose, P) {
  const m = { legs: {} };
  for (const s of RL) {
    const l = pose.legs[s];
    const td = l.K.clone().sub(l.H).normalize(), sd = l.A.clone().sub(l.K).normalize();
    const knee = Math.acos(clamp(td.dot(sd), -1, 1)) * R2D;
    const qA = l.qShin.clone().invert().multiply(l.qFoot);
    const zf = AZ.clone().applyQuaternion(qA);
    const ankle = Math.atan2(-zf.y, zf.z) * R2D;
    const lv = l.A.clone().sub(l.H);
    const el = Math.acos(clamp(-lv.y / lv.length(), -1, 1)) * R2D;
    const kz = AZ.clone().applyQuaternion(l.qThigh); kz.y = 0;
    let align = null, kneeOff = null, footYaw = null;
    if (l.mode === 'plant') {
      const f = fdir(l.pl.phi);
      const side = SIDE[s];
      const kv = V3(l.K.x - l.A.x, 0, l.K.z - l.A.z);
      if (knee > 15) kneeOff = -side * (f.x * kv.z - f.z * kv.x);   // + = knee inside the foot line (toward the big toe)
      if (knee > 15 && kv.length() > 0.04) {
        // bent knee: its floor projection should sit over the foot's line (2nd–3rd toe)
        kv.normalize(); align = Math.acos(clamp(kv.dot(f), -1, 1)) * R2D;
      } else if (kz.lengthSq() > 1e-6) {
        kz.normalize(); align = Math.acos(clamp(kz.dot(f), -1, 1)) * R2D;   // straight leg: kneecap vs foot direction
      }
      footYaw = Math.abs(l.pl.phi);
    }
    m.legs[s] = { knee, ankle, el, heel: Math.max(0, l.heelPt.y), mode: l.mode, align, kneeOff, footYaw };
  }
  const py = AY.clone().applyQuaternion(pose.Rp), ty = AY.clone().applyQuaternion(pose.Rt);
  m.pelvisTilt = Math.atan2(py.z, py.y) * R2D;
  m.torsoLean = Math.acos(clamp(ty.y, -1, 1)) * R2D * (ty.z >= 0 ? 1 : -1);
  m.w = P.w;
  m.poly = supportPolygon(pose, P);
  m.comXZ = { x: pose.com.x, z: pose.com.z };
  m.comDist = signedDist(m.poly, m.comXZ);
  m.turnout = (m.legs.R.footYaw || 0) + (m.legs.L.footYaw || 0);
  return m;
}

G.BalletCore = {
  THREE, D2R, R2D, clamp, lerp, sstep, V3, qAx, BODY, SIDE, RL, MOVES, MISTAKES, ARMS,
  buildPositions, compileMove, evalParams, solvePose, buildPose, applyMistake, measure, workingSide, segAt, breathAt, warp, GAZE, LAG,
  fdir, elOf, azOf, footContacts, supportPolygon, hull, signedDist, RELEVE,
};
})(typeof window !== 'undefined' ? window : globalThis);
