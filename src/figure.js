/* ballet-figure — the dancer.
   One skinned torso (pelvis → neck) whose leotard cut is drawn analytically in the shader, skinned limbs (one continuous surface through each knee and elbow, rigid hip/shoulder/ankle/wrist
   spheres of exactly the limb radius there), hands with fingers, and a modelled head with
   face and hair. Requires BalletCore and THREE r128. */
(function (G) {
'use strict';
const THREE = G.THREE, C = G.BalletCore;
const { clamp, sstep, RL, SIDE, BODY } = C;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lin = hex => new THREE.Color(hex).convertSRGBToLinear();

/* ---------------- geometry helpers ---------------- */
function loft(st, o = {}) {
  const N = o.radial || 24, p = o.pow || 2, axis = o.axis || 'y', K = 5;
  let L = st.map(s => Object.assign({ u: 0, v: 0 }, s)).sort((a, b) => a.t - b.t);
  const cap = (s0, dir, len) => { const out = []; for (let i = 1; i <= K; i++) { const f = i / K, k = Math.sqrt(Math.max(0, 1 - f * f)); out.push({ t: s0.t + dir * len * f, a: s0.a * k, b: s0.b * k, u: s0.u, v: s0.v }); } return out; };
  if (o.cap0) L = cap(L[0], -1, o.cap0).reverse().concat(L);
  if (o.cap1) L = L.concat(cap(L[L.length - 1], 1, o.cap1));
  const pos = [], idx = [];
  for (const s of L) for (let j = 0; j < N; j++) {
    const th = j / N * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
    const cx = Math.sign(c) * Math.pow(Math.abs(c), 2 / p), cy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / p);
    if (axis === 'y') pos.push(s.u + s.a * cx, s.t, s.v + s.b * cy); else pos.push(s.u + s.a * cx, s.v + s.b * cy, s.t);
  }
  const flip = axis === 'z';
  for (let i = 0; i < L.length - 1; i++) for (let j = 0; j < N; j++) {
    const a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, d = (i + 1) * N + (j + 1) % N;
    if (!flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const nRing = pos.length / 3;
  const g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g0.setIndex(idx); g0.computeVertexNormals();
  const nor = Array.from(g0.attributes.normal.array);
  const c0 = nRing, s0 = L[0], s1 = L[L.length - 1], last = (L.length - 1) * N;
  if (axis === 'y') { pos.push(s0.u, s0.t, s0.v, s1.u, s1.t, s1.v); nor.push(0, -1, 0, 0, 1, 0); }
  else { pos.push(s0.u, s0.v, s0.t, s1.u, s1.v, s1.t); nor.push(0, 0, -1, 0, 0, 1); }
  for (let j = 0; j < N; j++) {
    const j1 = (j + 1) % N;
    if (!flip) idx.push(c0, j, j1, c0 + 1, last + j1, last + j); else idx.push(c0, j1, j, c0 + 1, last + j, last + j1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
function ellipsoid(rx, ry, rz, cx = 0, cy = 0, cz = 0, seg = 28) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)); g.scale(rx, ry, rz); g.translate(cx, cy, cz); return g;
}
function tube(p0, p1, r0, r1, radial = 14) {          // tapered capsule between two points
  const d = p1.clone().sub(p0), len = d.length();
  const g = loft([{ t: 0, a: r0, b: r0 }, { t: len, a: r1, b: r1 }], { cap0: r0, cap1: r1, radial });
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)); g.translate(p0.x, p0.y, p0.z); return g;
}
function merge(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
    const gi = g.index.array; for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.attributes.position.count; io += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
}
// Catmull-Rom through table rows [y, v1, v2, …] → y => [v1, v2, …]
function sampler(tab) {
  const n = tab[0].length - 1;
  return y => {
    let i = 0; while (i < tab.length - 2 && y > tab[i + 1][0]) i++;
    const p0 = tab[Math.max(0, i - 1)], p1 = tab[i], p2 = tab[i + 1], p3 = tab[Math.min(tab.length - 1, i + 2)];
    const u = clamp((y - p1[0]) / (p2[0] - p1[0]), 0, 1), u2 = u * u, u3 = u2 * u, out = [];
    for (let k = 1; k <= n; k++) out.push(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3));
    return out;
  };
}

/* ---------------- rest pose (bind space) ---------------- */
const REST = (() => {
  const r = {};
  r.pelvis = V(0, 0, 0);
  r.abdomen = BODY.lumbarJ.clone();
  r.thorax = r.abdomen.clone().add(V(0, BODY.lumbarLen, 0));
  r.neck = r.thorax.clone().add(BODY.thoraxTop);
  r.head = r.neck.clone().add(BODY.neck);
  return r;
})();
const SKIN_BONES = ['pelvis', 'abdomen', 'thorax', 'neck', 'head'];

/* ---------------- torso (pelvis → neck), one continuous surface ---------------- */
// [y, half-width, half-depth, centre z] in the standing pelvis frame (y up from the hip-joint line)
const TORSO = sampler([
  [-0.105, 0.040, 0.030, -0.005], [-0.075, 0.085, 0.048, -0.005], [-0.040, 0.125, 0.066, -0.005], [-0.010, 0.145, 0.078, -0.006],
  [0.030, 0.153, 0.099, -0.009],
  [0.080, 0.145, 0.095, -0.013], [0.130, 0.128, 0.086, -0.008], [0.170, 0.116, 0.079, -0.005], [0.220, 0.120, 0.082, -0.006],
  [0.270, 0.129, 0.090, -0.003], [0.340, 0.137, 0.097, 0.000], [0.410, 0.140, 0.093, -0.008], [0.455, 0.144, 0.085, -0.016],
  [0.485, 0.139, 0.072, -0.026], [0.510, 0.117, 0.060, -0.035], [0.530, 0.083, 0.052, -0.042], [0.550, 0.054, 0.048, -0.047],
  [0.575, 0.043, 0.046, -0.049], [0.605, 0.040, 0.043, -0.045], [0.640, 0.039, 0.042, -0.040],
]);
function torsoGeo() {
  const st = [];
  for (let y = -0.105; y < 0.6401; y += 0.0075) { const [a, b, v] = TORSO(y); st.push({ t: y, a, b, v }); }
  const g = loft(st, { pow: 2.25, radial: 64, cap0: 0.022, cap1: 0.02 });
  const pos = g.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i);
    const a1 = sstep(0.055, 0.145, y), a2 = sstep(0.175, 0.265, y), a3 = sstep(0.525, 0.565, y), a4 = sstep(0.578, 0.612, y);
    const w = [1 - a1, a1 * (1 - a2), a1 * a2 * (1 - a3), a1 * a2 * a3 * (1 - a4), a1 * a2 * a3 * a4];
    let k = 0, sum = 0;
    for (let b = 0; b < 5 && k < 4; b++) if (w[b] > 1e-4) { si[i * 4 + k] = b; sw[i * 4 + k] = w[b]; sum += w[b]; k++; }
    for (let j = 0; j < 4; j++) sw[i * 4 + j] /= sum;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return g;
}
function offsetShell(base, d) {                       // the garment: same skin weights, pushed out along the normals
  const g = base.clone(), p = g.attributes.position, nr = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + nr.getX(i) * d, p.getY(i) + nr.getY(i) * d, p.getZ(i) + nr.getZ(i) * d);
  return g;
}

/* ---------------- limbs ---------------- */
// Each leg and arm is ONE skinned surface through its knee / elbow (upper bone, a helper bone in the joint that turns half as far,
// lower bone), so a bent limb has a continuous skin instead of two tubes meeting at a ball. Hip, shoulder, ankle and wrist stay
// rigid spheres whose radius equals the limb radius there. Station rows: t along the limb (origin at its joint, running down -y),
// half-width a (x), half-depth b (z), centre offset v (z).
const THIGH_ST = [{ t: 0.02, a: 0.062, b: 0.060 }, { t: 0, a: 0.068, b: 0.067 }, { t: -0.06, a: 0.070, b: 0.068, v: 0.004 }, { t: -0.15, a: 0.063, b: 0.060, v: 0.006 },
  { t: -0.25, a: 0.054, b: 0.051, v: 0.004 }, { t: -0.33, a: 0.0455, b: 0.0445 }, { t: -0.38, a: 0.0425, b: 0.0425 }, { t: -BODY.thigh, a: 0.0415, b: 0.0415 }];
const SHIN_ST = [{ t: 0, a: 0.0415, b: 0.0415 }, { t: -0.04, a: 0.0435, b: 0.0425 }, { t: -0.10, a: 0.0475, b: 0.0495, v: -0.010 }, { t: -0.16, a: 0.0445, b: 0.0455, v: -0.008 },
  { t: -0.25, a: 0.0345, b: 0.0340, v: -0.003 }, { t: -0.33, a: 0.0275, b: 0.0275 }, { t: -0.375, a: 0.0245, b: 0.0250 }, { t: -BODY.shin, a: 0.0235, b: 0.0240 }];
const UPPER_ST = [{ t: 0.012, a: 0.034, b: 0.034 }, { t: 0, a: 0.040, b: 0.040 }, { t: -0.04, a: 0.0415, b: 0.0405 }, { t: -0.10, a: 0.0365, b: 0.035 }, { t: -0.18, a: 0.0315, b: 0.030 },
  { t: -0.235, a: 0.0285, b: 0.0275 }, { t: -BODY.upperArm, a: 0.0262, b: 0.0262 }];
const FORE_ST = [{ t: 0, a: 0.0262, b: 0.0262 }, { t: -0.05, a: 0.0292, b: 0.0262 }, { t: -0.13, a: 0.0240, b: 0.0212 }, { t: -0.20, a: 0.0182, b: 0.0155 }, { t: -BODY.foreArm, a: 0.0165, b: 0.0138 }];
function limbGeo(upper, lower, len, o) {
  // `lower` has its origin at the mid joint, which sits `len` below the upper joint; one smooth profile through both
  const rows = upper.map(s => [s.t, s.a, s.b, s.v || 0]);
  for (const s of lower) if (s.t < -1e-9) rows.push([s.t - len, s.a, s.b, s.v || 0]);
  rows.sort((p, q) => p[0] - q[0]);
  const prof = sampler(rows), yTop = rows[rows.length - 1][0], yBot = rows[0][0], yJ = -len, band = o.band;
  const ys = [];
  for (let y = yTop; y > yBot + 1e-6; y -= Math.abs(y - yJ) < band * 1.25 ? o.fine : o.coarse) ys.push(y);
  ys.push(yBot);
  const g = loft(ys.map(y => { const [a, b, v] = prof(y); return { t: y, a, b, v }; }), { radial: o.radial });
  const pos = g.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {                       // bone 0 above the joint, bone 1 (half-turn helper) in it, bone 2 below
    const d = yJ - pos.getY(i);
    let w0 = 0, w1 = 0, w2 = 0;
    if (d <= -band) w0 = 1; else if (d >= band) w2 = 1;
    else if (d <= 0) { const t = sstep(-band, 0, d); w0 = 1 - t; w1 = t; }
    else { const t = sstep(0, band, d); w1 = 1 - t; w2 = t; }
    si[i * 4] = 0; si[i * 4 + 1] = 1; si[i * 4 + 2] = 2; sw[i * 4] = w0; sw[i * 4 + 1] = w1; sw[i * 4 + 2] = w2;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return g;
}
const LG = (() => {
  const g = {};
  g.leg = limbGeo(THIGH_ST, SHIN_ST, BODY.thigh, { band: 0.07, fine: 0.008, coarse: 0.018, radial: 40 });
  g.arm = limbGeo(UPPER_ST, FORE_ST, BODY.upperArm, { band: 0.05, fine: 0.006, coarse: 0.016, radial: 28 });
  g.hip = ellipsoid(0.068, 0.068, 0.067, 0, 0, 0, 32);
  g.ankle = ellipsoid(0.0235, 0.0235, 0.0240, 0, -BODY.shin, 0, 16);
  g.foot = loft([
    { t: -0.06, a: 0.02, b: 0.02, v: -0.055 }, { t: -0.045, a: 0.026, b: 0.028, v: -0.047 }, { t: -0.02, a: 0.028, b: 0.034, v: -0.04 },
    { t: 0.01, a: 0.03, b: 0.037, v: -0.037 }, { t: 0.05, a: 0.034, b: 0.03, v: -0.044 }, { t: 0.095, a: 0.04, b: 0.023, v: -0.051 },
    { t: 0.135, a: 0.043, b: 0.018, v: -0.056 }, { t: 0.15, a: 0.041, b: 0.016, v: -0.057 }], { axis: 'z', cap0: 0.012, cap1: 0.01, radial: 28 });
  g.toes = loft([{ t: -0.008, a: 0.04, b: 0.017, v: 0 }, { t: 0.015, a: 0.037, b: 0.0155, v: -0.001 }, { t: 0.035, a: 0.03, b: 0.013, v: -0.003 }, { t: 0.05, a: 0.02, b: 0.009, v: -0.004 }],
    { axis: 'z', cap1: 0.008, radial: 22 });
  g.shoulder = ellipsoid(0.040, 0.040, 0.040, 0, 0, 0, 24);
  g.wrist = ellipsoid(0.0165, 0.0138, 0.0138, 0, -BODY.foreArm, 0, 14);
  return g;
})();
// a hand with four fingers and a thumb; +z is the palm side, fingers hang down -y
function handGeo(sx) {
  const parts = [loft([{ t: 0.006, a: 0.019, b: 0.012 }, { t: -0.028, a: 0.031, b: 0.0125, v: 0.001 }, { t: -0.062, a: 0.0345, b: 0.0115, v: 0.003 }, { t: -0.088, a: 0.032, b: 0.0105, v: 0.0045 }], { radial: 22, cap1: 0.004 })];
  const len = [0.066, 0.074, 0.068, 0.054], rad = [0.0082, 0.0086, 0.0080, 0.0070];
  for (let i = 0; i < 4; i++) {
    const x = sx * (0.0225 - 0.0148 * i), p0 = V(x, -0.086, 0.0045);
    const p1 = V(x, p0.y - len[i] * 0.58, p0.z + 0.004), p2 = V(x, p0.y - len[i] * 0.95, p0.z + 0.010 + len[i] * 0.16);
    parts.push(tube(p0, p1, rad[i], rad[i] * 0.88, 12), tube(p1, p2, rad[i] * 0.88, rad[i] * 0.66, 12));
  }
  const t0 = V(sx * 0.027, -0.020, 0.010), t1 = V(sx * 0.022, -0.046, 0.019), t2 = V(sx * 0.0125, -0.071, 0.029);
  parts.push(tube(t0, t1, 0.0098, 0.0088, 12), tube(t1, t2, 0.0088, 0.0066, 12));
  return merge(parts);
}

/* ---------------- head ---------------- */
// [y, half-width, half-depth, centre z] — origin at the head–neck joint, +z is the face
const HEAD = sampler([
  [-0.014, 0.012, 0.014, 0.078], [0.000, 0.034, 0.040, 0.062], [0.014, 0.047, 0.056, 0.050], [0.030, 0.058, 0.070, 0.037],
  [0.050, 0.066, 0.080, 0.026], [0.075, 0.071, 0.088, 0.018], [0.100, 0.073, 0.092, 0.013], [0.125, 0.072, 0.093, 0.010],
  [0.150, 0.068, 0.090, 0.007], [0.175, 0.058, 0.080, 0.004], [0.192, 0.043, 0.063, 0.002], [0.203, 0.024, 0.038, 0.000], [0.208, 0.010, 0.016, 0.000],
]);
function headLoft(da, db, dv, y0 = -0.014, y1 = 0.208) {
  const st = [];
  for (let y = y0; y <= y1 + 1e-6; y += 0.006) { const [a, b, v] = HEAD(y); st.push({ t: y, a: a + da, b: b + db, v: v + dv }); }
  return loft(st, { radial: 56, cap0: 0.003 + (da ? 0.004 : 0), cap1: 0.003 + (da ? 0.004 : 0) });
}
const faceZ = (x, y) => { const [a, b, v] = HEAD(y); const r = clamp(x / a, -0.999, 0.999); return v + b * Math.sqrt(1 - r * r); };
function faceFrame(x, y, lift = 0, roll = 0) {         // point on the face surface + a matrix that puts local +z along its normal
  const h = 0.002, z = faceZ(x, y);
  const n = V(-(faceZ(x + h, y) - faceZ(x - h, y)) / (2 * h), -(faceZ(x, y + h) - faceZ(x, y - h)) / (2 * h), 1).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n);
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), roll));
  return new THREE.Matrix4().compose(V(x, y, z).addScaledVector(n, lift), q, V(1, 1, 1));
}
function onFace(geo, x, y, lift, roll) { geo.applyMatrix4(faceFrame(x, y, lift, roll)); return geo; }

/* ---------------- shaders: the costume is cut analytically, so its edges are pixel-sharp ---------------- */
const GLSL_LEO = `
float leoField(vec3 p) {                       // > 0 where the leotard exists (torso rest space, pelvis frame, +z front)
  float ax = abs(p.x);
  float fr = smoothstep(-0.035, 0.015, p.z);
  float yb = mix(0.452, 0.430, fr);                                           // scoop neckline, deeper in front
  float hw = 0.082 * sqrt(clamp((p.y - yb) / (0.545 - yb), 0.0, 1.0));
  float nNeck = max(ax - hw, yb - p.y);
  float nArm = length(vec2(ax - 0.185, p.y - 0.490)) - 0.085;                 // round armholes
  float nLeg = p.y - (mix(-0.062, -0.032, fr) + 0.090 * smoothstep(0.0, 0.150, ax));   // high-cut leg openings
  return min(min(nNeck, nArm), nLeg);
}
float legCut(vec3 p) {
  float ax = abs(p.x), fr = smoothstep(-0.035, 0.015, p.z);
  return mix(-0.062, -0.032, fr) + 0.090 * smoothstep(0.0, 0.150, ax);
}`;
const GLSL_HAIR = `
float hairField(vec3 p) {                      // > 0 where hair is: pulled back from the forehead, up behind the ears
  float ax = abs(p.x);
  float w = smoothstep(-0.060, 0.018, p.z);
  float yFront = 0.172 - 0.022 * smoothstep(0.015, 0.065, ax);
  return p.y - mix(0.028, yFront, w);
}`;
const RIM = 'outgoingLight += uRim * pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);';
const OUT_RE = /vec3 outgoingLight = reflectedLight\.directDiffuse \+ reflectedLight\.indirectDiffuse \+ reflectedLight\.directSpecular \+ reflectedLight\.indirectSpecular \+ totalEmissiveRadiance;/;
function patch(mat, key, o) {
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, o.uniforms || {});
    shader.vertexShader = 'varying vec3 vRest;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvRest = position;');
    let fs = 'varying vec3 vRest;\n' + (o.decl || '') + '\n' + shader.fragmentShader;
    if (o.color) fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + o.color);
    if (o.out) fs = fs.replace(OUT_RE, m => m + '\n\t' + o.out);
    shader.fragmentShader = fs;
  };
}

/* ---------------- materials ---------------- */
const U = { uSkinRim: { value: new THREE.Color(0.20, 0.075, 0.05) }, uHairRim: { value: new THREE.Color(0.05, 0.035, 0.03) } };
const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0, skinning: true }, o));
const phys = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ roughness: 0.6, metalness: 0, skinning: true }, o));
const M = {
  skin: std({ roughness: 0.52 }),                       // arms, hands, head (rigid)
  skinBody: std({ roughness: 0.52 }),                   // the continuous torso under the leotard
  leo: phys({ roughness: 0.58, sheen: new THREE.Color(0.20, 0.14, 0.24) }),
  hair: std({ roughness: 0.46 }),
  tightsR: phys({ roughness: 0.74, sheen: new THREE.Color(0.28, 0.16, 0.16) }), tightsL: phys({ roughness: 0.74, sheen: new THREE.Color(0.28, 0.16, 0.16) }),
  slipR: phys({ roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.45 }), slipL: phys({ roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.45 }),
  eye: std({ color: lin(0x2a1c18), roughness: 0.28 }), brow: std({ color: lin(0x3b2823), roughness: 0.7 }),
  lip: std({ color: lin(0xb8636f), roughness: 0.45 }), sclera: std({ color: lin(0xf1ece6), roughness: 0.35 }), mouth: std({ color: lin(0x8f4952), roughness: 0.6 }),
};
patch(M.skin, 'skin', { uniforms: { uRim: { value: U.uSkinRim.value } }, decl: 'uniform vec3 uRim;', out: RIM });
patch(M.skinBody, 'skinBody', {
  uniforms: { uRim: { value: U.uSkinRim.value } }, decl: GLSL_LEO + '\nuniform vec3 uRim;',
  color: 'if (vRest.y < legCut(vRest) + 0.004) discard;', out: RIM,
});
for (const [k, cond] of [['baseR', 'vRest.x > 0.0005'], ['baseL', 'vRest.x < -0.0005']]) {
  M[k] = phys({ roughness: 0.74, sheen: new THREE.Color(0.28, 0.16, 0.16) });
  M[k].color = M['tights' + k.slice(4)].color;                     // one shared colour: the work tint reaches the pelvis too
  patch(M[k], k, { decl: GLSL_LEO, color: 'if (vRest.y >= legCut(vRest) + 0.004 || ' + cond + ') discard;' });
}
patch(M.leo, 'leo', {
  decl: GLSL_LEO,
  color: 'float lf = leoField(vRest); if (lf < 0.0) discard; diffuseColor.rgb *= mix(0.74, 1.0, smoothstep(0.0, 0.0038, lf));',
});
patch(M.hair, 'hair', {
  uniforms: { uRim: { value: U.uHairRim.value } }, decl: GLSL_HAIR + '\nuniform vec3 uRim;',
  color: 'if (hairField(vRest) < 0.0) discard;', out: RIM,
});
// A material's shader is compiled once, for the first mesh that draws with it, so skinned and rigid meshes need their own
// instances. The skinned twins share the colour objects with the originals, so theme and work tint reach both.
M.skinS = std({ roughness: 0.52 });                     // skinned arms
M.skinS.color = M.skin.color;
patch(M.skinS, 'skinS', { uniforms: { uRim: { value: U.uSkinRim.value } }, decl: 'uniform vec3 uRim;', out: RIM });
for (const sd of RL) {                                  // skinned legs (the rigid hip and ankle spheres keep tights<side>)
  M['leg' + sd] = phys({ roughness: 0.74, sheen: new THREE.Color(0.28, 0.16, 0.16) });
  M['leg' + sd].color = M['tights' + sd].color;
}
for (const k in M) M[k].envMapIntensity = 0.42;
const ghostOpts = { roughness: 0.5, transparent: true, opacity: 0.34, depthWrite: false };
const ghostMat = new THREE.MeshStandardMaterial(Object.assign({ skinning: false }, ghostOpts));
const ghostSkin = new THREE.MeshStandardMaterial(Object.assign({ skinning: true }, ghostOpts));
const setGhostOpacity = o => { ghostMat.opacity = ghostSkin.opacity = o; };
function recolor(col) {
  M.skin.color.copy(col('--skin')); M.skinBody.color.copy(col('--skin')); M.leo.color.copy(col('--leotard')); M.hair.color.copy(col('--hair'));
  for (const s of RL) { M['tights' + s].color.copy(col('--tights')); M['slip' + s].color.copy(col('--slipper')); }
  for (const gm of [ghostMat, ghostSkin]) { gm.color.copy(col('--ghost')); gm.emissive.copy(col('--ghost')); gm.emissiveIntensity = 0.25; }
}

/* ---------------- build ---------------- */
function build(scene, isGhost, opts = {}) {
  const root = new THREE.Group(); scene.add(root);
  const Gp = {};
  const shadow = opts.selfShadow === true;
  const add = (parent, geo, m, o = {}) => {
    const me = new THREE.Mesh(geo, isGhost ? ghostMat : m);
    if (isGhost) me.renderOrder = 5; else { me.castShadow = o.cast !== false; me.receiveShadow = shadow && o.receive !== false; }
    parent.add(me); return me;
  };
  const group = n => { const g = new THREE.Group(); root.add(g); Gp[n] = g; return g; };

  // skeleton: pelvis → abdomen → thorax → neck → head (flat under root; the pose sets world transforms)
  const bones = SKIN_BONES.map(n => { const b = new THREE.Bone(); b.position.copy(REST[n]); root.add(b); Gp[n] = b; return b; });
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const skinned = (geo, m, o = {}, skel = skeleton) => {
    const me = new THREE.SkinnedMesh(geo, isGhost ? ghostSkin : m);
    me.frustumCulled = false;
    if (isGhost) me.renderOrder = 5; else { me.castShadow = o.cast !== false; me.receiveShadow = shadow && o.receive !== false; }
    root.add(me); me.updateMatrixWorld(true); me.bind(skel, new THREE.Matrix4()); return me;
  };
  // a limb: upper bone, half-turn helper bone and lower bone, all at their rest positions (the bind pose is the straight limb hanging from the origin)
  const limb = (up, mid, lo, len, geo, mat) => {
    const mk = (n, y) => { const b = new THREE.Bone(); b.position.set(0, y, 0); root.add(b); Gp[n] = b; return b; };
    const bs = [mk(up, 0), mk(mid, -len), mk(lo, -len)];
    root.updateMatrixWorld(true);
    skinned(geo, mat, {}, new THREE.Skeleton(bs));
    return bs;
  };
  const torso = torsoGeo();
  skinned(torso, M.skinBody);
  if (!isGhost) { skinned(torso, M.baseR, { cast: false }); skinned(torso, M.baseL, { cast: false }); skinned(offsetShell(torso, 0.0026), M.leo, { cast: false }); }

  // head
  const eyeRig = [];
  const hg = new THREE.Group(); hg.scale.setScalar(0.95); Gp.head.add(hg);
  add(hg, headLoft(0, 0, 0), M.skin);
  if (!isGhost) {
    const f = (g, m, o) => add(hg, g, m, Object.assign({ cast: false, receive: false }, o));
    add(hg, headLoft(0.0034, 0.0046, -0.0020), M.hair, { cast: false, receive: false });
    f(ellipsoid(0.040, 0.037, 0.036, 0, 0.164, -0.098, 24), M.hair);                       // bun
    for (const sx of [-1, 1]) {
      f(onFace(ellipsoid(0.0104, 0.0060, 0.0030, 0, 0, 0, 16), sx * 0.0305, 0.1015, 0.0000, sx * 0.04), M.sclera);       // eyes: white,
      const iris = f(onFace(ellipsoid(0.0054, 0.0054, 0.0028, 0, 0, 0, 14), sx * 0.0298, 0.1015, 0.0014, 0), M.eye);     // iris,
      const lid = f(onFace(ellipsoid(0.0112, 0.0011, 0.0032, 0, 0, 0, 14), sx * 0.0305, 0.1071, 0.0012, sx * 0.04), M.brow);   // upper lid line
      const fr = faceFrame(sx * 0.0298, 0.1015, 0.0014, 0);                                                              // the iris slides over the white along the face
      eyeRig.push({ iris, lid, ex: V(1, 0, 0).transformDirection(fr), ey: V(0, 1, 0).transformDirection(fr) });
      const pts = [[0.012, 0.1255], [0.026, 0.1282], [0.040, 0.1270], [0.052, 0.1225]].map(([x, y]) => V(sx * x, y, faceZ(x, y) + 0.0012));
      f(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.0017, 6), M.brow);                                 // brows
      f(onFace(ellipsoid(0.0036, 0.0042, 0.0050, 0, 0, 0, 12), sx * 0.0078, 0.0742, 0.0026), M.skin);                    // nostril wings
      { const [ea, , ev] = HEAD(0.088); f(ellipsoid(0.0050, 0.0150, 0.0100, sx * (ea + 0.0004), 0.088, ev - 0.004, 12), M.skin); }   // ears
    }
    f(onFace(ellipsoid(0.0040, 0.0150, 0.0040, 0, 0, 0, 14), 0, 0.0935, 0.0012), M.skin);                              // nose bridge
    f(onFace(ellipsoid(0.0074, 0.0066, 0.0080, 0, 0, 0, 16), 0, 0.0752, 0.0056), M.skin);                              // nose tip
    f(onFace(ellipsoid(0.0138, 0.0038, 0.0056, 0, 0, 0, 16), 0, 0.0408, 0.0003), M.lip);                               // lips
    f(onFace(ellipsoid(0.0128, 0.0046, 0.0060, 0, 0, 0, 16), 0, 0.0312, 0.0008), M.lip);
    { const m = [[-0.0150, 0.0392], [-0.0075, 0.0366], [0, 0.0360], [0.0075, 0.0366], [0.0150, 0.0392]].map(([x, y]) => V(x, y, faceZ(x, y) + 0.0058));
      f(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(m), 12, 0.0008, 5), M.mouth); }                               // a hint of a smile
  }

  for (const s of RL) {
    const sx = SIDE[s], tm = M['tights' + s], sm = M['slip' + s];
    const [th, , sh] = limb(s + '_thigh', s + '_kneeM', s + '_shin', BODY.thigh, LG.leg, M['leg' + s]);
    add(th, LG.hip, tm); add(sh, LG.ankle, tm);
    add(group(s + '_foot'), LG.foot, sm);
    add(group(s + '_toes'), LG.toes, sm);
    const [ua, , fa] = limb(s + '_upper', s + '_elbowM', s + '_fore', BODY.upperArm, LG.arm, M.skinS);
    add(ua, LG.shoulder, M.skin); add(fa, LG.wrist, M.skin);
    add(group(s + '_hand'), handGeo(sx), M.skin);
  }
  // where she looks (deg; yaw + = her left, pitch + = down): the iris slides over the white, the lid line follows a little
  const setGaze = (yaw, pitch) => {
    const dx = clamp(yaw / 24, -1, 1) * 0.0036, dy = pitch > 0 ? -clamp(pitch / 18, 0, 1) * 0.0013 : clamp(-pitch / 16, 0, 1) * 0.0009;
    for (const e of eyeRig) {
      e.iris.position.copy(e.ex).multiplyScalar(dx).addScaledVector(e.ey, dy);
      e.lid.position.copy(e.ey).multiplyScalar(dy * 0.5);
    }
  };
  // breath (0–1): the ribcage widens a little and mostly forward; pelvis, neck and head stay put
  const setBreath = b => Gp.thorax.scale.set(1 + 0.032 * b, 1 + 0.014 * b, 1 + 0.060 * b);
  return { root, G: Gp, setGaze, setBreath };
}

G.BalletFigure = { build, M, ghostMat, setGhostOpacity, recolor, REST, LG, TORSO };
})(window);
