/* ballet-tutu — a short layered tulle skirt. It hangs from the pelvis and is pushed away by the legs and arms.
   Stateless on purpose: the shape depends only on the current pose, so scrubbing the timeline always gives the same skirt.
   Requires THREE, BalletCore and BalletFigure (for the torso outline the yoke sits on). */
(function (G) {
'use strict';
const THREE = G.THREE, C = G.BalletCore, F = G.BalletFigure;
const { sstep, clamp, RL } = C;

const NA = 120, NR = 9;              // quads around the waist; rows per layer (NR + 1 rings)
const Y0 = 0.045;                    // yoke height above the hip-joint line, pelvis frame (m)
const R_FULL = 0.31;                 // reach of the longest layer
const DROP = 0.075;                  // how far the longest layer's hem hangs below the yoke
const PLEATS = 20;
const TAU = Math.PI * 2;
// lowest (longest) layer first; each shorter layer rides 6 mm above the one below it
const LAYERS = [
  { R: 0.310, y: 0.000, ph: 0.00, op: 0.55 },
  { R: 0.283, y: 0.006, ph: 0.37, op: 0.55 },
  { R: 0.254, y: 0.012, ph: 0.71, op: 0.55 },
];
const SOFT = 0.012;                  // m: how wide a contact is blended (at most SOFT/6 = 2 mm of extra clearance)
const MARGIN = 0.0055, STACK = 0.0045;
const LEANF = [Math.exp(-0.35), Math.exp(0.35)];   // where a limb straddles the cloth, the way out leans toward the side the limb normally lies on
const LIFT_MAX = 0.12, PRESS_MAX = 0.04, EPS = 0.3;   // m: the most a leg can lift the skirt / an arm can press it (smoothly saturating)
const SLOPE = 0.7, SPREAD_IT = 4;    // a lift or press may fall away at most 0.7 m per m of cloth, over 4 vertices

// C2 smooth maximum: equals max(a, b) once they differ by k or more, rises above it by at most k/6 where they cross
const smax = (a, b, k) => { const d = Math.abs(a - b); return d >= k ? Math.max(a, b) : Math.max(a, b) + Math.pow(1 - d / k, 3) * k / 6; };

// tapered capsules (a, b, radius at a, radius at b, side): thighs and shins lie UNDER the skirt (side +1: it rests on top of them),
// upper arms, forearms and hands lie OVER it (side -1: it hangs below them)
function capsules(pose, out) {
  let n = 0;
  const put = (a, b, ra, rb, sg) => {
    const c = out[n++] || (out[n - 1] = {});
    c.ax = a.x; c.ay = a.y; c.az = a.z; c.dx = b.x - a.x; c.dy = b.y - a.y; c.dz = b.z - a.z;
    const l2 = c.dx * c.dx + c.dy * c.dy + c.dz * c.dz; c.inv = l2 > 1e-12 ? 1 / l2 : 0;
    c.ra = ra; c.rb = rb; c.sg = sg;
    // 'up' as seen across the limb: world up with its along-the-limb part removed (zero for a limb that stands straight up)
    const ay = c.dy * c.inv; c.ux = -ay * c.dx; c.uy = 1 - ay * c.dy; c.uz = -ay * c.dz;
    const reach = Math.sqrt(l2) / 2 + Math.max(ra, rb) + MARGIN + STACK * (LAYERS.length - 1) + SOFT + 0.015;
    c.cx = a.x + c.dx / 2; c.cy = a.y + c.dy / 2; c.cz = a.z + c.dz / 2; c.r2 = reach * reach;
  };
  for (const s of RL) {
    const l = pose.legs[s], a = pose.arms[s];
    put(l.H, l.K, 0.070, 0.043, 1); put(l.K, l.A, 0.047, 0.026, 1);
    put(a.S, a.E, 0.041, 0.031, -1); put(a.E, a.W, 0.028, 0.017, -1);
    const tip = _v.set(0, -0.05, 0).applyQuaternion(a.qHand).add(a.W);      // the heel of the hand; the fingers don't push the skirt
    put(a.W, tip, 0.022, 0.018, -1);
  }
  out.length = n;
  return out;
}
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();

// signed distance from a point to the tapered capsule
function sdf(c, x, y, z) {
  const qx = x - c.ax, qy = y - c.ay, qz = z - c.az;
  let t = (qx * c.dx + qy * c.dy + qz * c.dz) * c.inv; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const wx = qx - c.dx * t, wy = qy - c.dy * t, wz = qz - c.dz * t;
  return Math.sqrt(wx * wx + wy * wy + wz * wz) - (c.ra + (c.rb - c.ra) * t);
}
function build(scene) {
  const group = new THREE.Group(); group.renderOrder = 2; scene.add(group);
  const [ta, tb, tv] = F.TORSO(Y0);
  const A = ta + 0.008, B = tb + 0.008;           // the yoke is the leotard's outline at the hips, plus the cloth
  const nv = NA * (NR + 1);
  const layers = LAYERS.map((L, k) => {
    const rest = new Float32Array(nv * 3), pos = new Float32Array(nv * 3), shade = new Float32Array(nv * 3);
    for (let j = 0; j <= NR; j++) {
      for (let i = 0; i < NA; i++) {
        const th = TAU * i / NA, c = Math.cos(th), s = Math.sin(th), ph = TAU * L.ph;
        const rRing = A * B / Math.sqrt(B * B * c * c + A * A * s * s) + 0.0016 * k;
        const Rk = L.R * (1 + 0.011 * Math.sin(PLEATS * th + ph));            // a slightly scalloped hem
        const u = j / NR, rho = rRing + (Rk - rRing) * u;
        const xr = clamp((rho - rRing) / (R_FULL - rRing), 0, 1);
        const y = Y0 + L.y - DROP * Math.pow(xr, 1.7) + 0.0055 * Math.pow(u, 1.5) * Math.sin(PLEATS * th + ph * 1.3);
        const v = (j * NA + i) * 3;
        rest[v] = rho * c; rest[v + 1] = y; rest[v + 2] = tv + rho * s;
        const sh = 0.80 + 0.20 * Math.pow(u, 0.7); shade[v] = shade[v + 1] = shade[v + 2] = sh;
      }
    }
    // rest distances to the next vertex around and to the next ring out: how steeply a lift may fall away
    const dA = new Float32Array(nv), dR = new Float32Array(nv);
    for (let j = 0; j <= NR; j++) for (let i = 0; i < NA; i++) {
      const v = j * NA + i, a = v * 3, b = (j * NA + (i + 1) % NA) * 3, c = j < NR ? ((j + 1) * NA + i) * 3 : a;
      dA[v] = Math.hypot(rest[a] - rest[b], rest[a + 1] - rest[b + 1], rest[a + 2] - rest[b + 2]);
      dR[v] = j < NR ? Math.hypot(rest[a] - rest[c], rest[a + 1] - rest[c + 1], rest[a + 2] - rest[c + 2]) : 0;
    }
    const idx = [];
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) {
      const i1 = (i + 1) % NA, a = j * NA + i, b = j * NA + i1, c = (j + 1) * NA + i, d = (j + 1) * NA + i1;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(shade, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: L.op, depthWrite: false, vertexColors: true });
    mat.envMapIntensity = 0.42;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.renderOrder = 2 + k * 0.01; mesh.castShadow = k === 0; mesh.receiveShadow = false;
    group.add(mesh);
    return { L, rest, pos, geo, mat, mesh, margin: MARGIN + STACK * k, dA, dR,
      w: new Float32Array(nv * 3), up: new Float32Array(nv), dn: new Float32Array(nv), hx: new Float32Array(nv), hz: new Float32Array(nv), t1: new Float32Array(nv), t2: new Float32Array(nv) };
  });
  const caps = [];

  // spread a lift (or a press) into the cloth around it: the sheet can only rise or fall so steeply from one vertex to the next
  function spread(f, tmp, dA, dR, sign) {
    let src = f, dst = tmp;
    for (let it = 0; it < SPREAD_IT; it++) {
      for (let j = 1; j <= NR; j++) {
        for (let i = 0; i < NA; i++) {
          const v = j * NA + i, il = j * NA + (i + NA - 1) % NA, ir = j * NA + (i + 1) % NA;
          let m = src[v];
          // sign +1: lifts (take the highest), -1: presses (take the lowest)
          const a = src[il] - sign * SLOPE * dA[il], b = src[ir] - sign * SLOPE * dA[v], c = src[v - NA] - sign * SLOPE * dR[v - NA], d = j < NR ? src[v + NA] - sign * SLOPE * dR[v] : -sign * 1e9;
          if (sign > 0) { if (a > m) m = a; if (b > m) m = b; if (c > m) m = c; if (d > m) m = d; }
          else { if (a < m) m = a; if (b < m) m = b; if (c < m) m = c; if (d < m) m = d; }
          dst[v] = m;
        }
      }
      const t = src; src = dst; dst = t;
    }
    if (src !== f) f.set(src);
  }

  function update(pose, mirror, fade) {
    group.visible = fade > 0.01;
    if (!group.visible) return;
    capsules(pose, caps);
    _m.makeRotationFromQuaternion(pose.Rp);
    const e = _m.elements, px = pose.pp.x, py = pose.pp.y, pz = pose.pp.z;
    const sx = mirror ? -1 : 1;
    for (const ly of layers) {
      const rest = ly.rest, pos = ly.pos, w = ly.w, up = ly.up, dn = ly.dn, hx = ly.hx, hz = ly.hz, margin = ly.margin;
      let anyUp = false, anyDn = false;
      for (let v = 0; v < nv * 3; v += 3) {
        const rx = rest[v], ry = rest[v + 1], rz = rest[v + 2];
        const x = w[v] = px + e[0] * rx + e[4] * ry + e[8] * rz, y = w[v + 1] = py + e[1] * rx + e[5] * ry + e[9] * rz, z = w[v + 2] = pz + e[2] * rx + e[6] * ry + e[10] * rz;
        const vi = v / 3; up[vi] = 0; dn[vi] = 0; hx[vi] = 0; hz[vi] = 0;
        if (vi < NA) continue;                                     // the first ring is the yoke: it stays on the pelvis
        let hsx = 0, hsz = 0, hw = 0;
        for (let n = 0; n < caps.length; n++) {
          const c = caps[n];
          const cx = x - c.cx, cy = y - c.cy, cz = z - c.cz;
          if (cx * cx + cy * cy + cz * cz > c.r2) continue;
          const qx = x - c.ax, qy = y - c.ay, qz = z - c.az;
          let t = (qx * c.dx + qy * c.dy + qz * c.dz) * c.inv; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const wx = qx - c.dx * t, wy = qy - c.dy * t, wz = qz - c.dz * t, r = c.ra + (c.rb - c.ra) * t;
          const d = Math.sqrt(wx * wx + wy * wy + wz * wz), s0 = d - r;
          if (s0 >= margin + SOFT) continue;
          // the cloth either rests on top of the limb (lift it clear) or hangs below it (press it down): whichever way out is shorter,
          // leaning toward the side the limb normally lies on (legs under the skirt, arms over it), blended so that nothing pops.
          // The way out is "up across the limb", bent a little toward straight away from its axis (all the way for a limb standing upright).
          const R = r + smax(s0, margin, SOFT), gi = 1 / (d + 0.002);
          let ex = c.ux + EPS * wx * gi, ey = c.uy + EPS * wy * gi, ez = c.uz + EPS * wz * gi; const en = 1 / (Math.sqrt(ex * ex + ey * ey + ez * ez) || 1);
          ex *= en; ey *= en; ez *= en;
          const b = wx * ex + wy * ey + wz * ez, disc = Math.sqrt(Math.max(0, b * b - (d * d - R * R)));
          const dU = disc - b, dD = disc + b;                       // ways out along +e and along -e
          // pw: how much to press rather than lift. The cheaper way out wins smoothly (the cost of a way out is its length), with a lean to the usual side
          const cu = dU * LEANF[c.sg > 0 ? 0 : 1], cd = dD * LEANF[c.sg > 0 ? 1 : 0], pw = cu * cu / (cu * cu + cd * cd + 1e-12);
          const sd = (1 - pw) * LIFT_MAX * Math.tanh(dU / LIFT_MAX) - pw * PRESS_MAX * Math.tanh(dD / PRESS_MAX);   // signed move along e
          const vy = sd * ey;
          if (vy > up[vi]) { up[vi] = vy; anyUp = true; } else if (vy < dn[vi]) { dn[vi] = vy; anyDn = true; }
          const wgt = sd * sd; hsx += wgt * sd * ex; hsz += wgt * sd * ez; hw += wgt;       // sideways part: weighted by size, so no limb ever takes over with a jump
        }
        if (hw > 0) { hx[vi] = hsx / hw; hz[vi] = hsz / hw; }
      }
      if (anyUp) spread(up, ly.t1, ly.dA, ly.dR, 1);
      if (anyDn) spread(dn, ly.t2, ly.dA, ly.dR, -1);
      for (let v = 0, vi = 0; v < nv * 3; v += 3, vi++) { pos[v] = sx * (w[v] + hx[vi]); pos[v + 1] = w[v + 1] + up[vi] + dn[vi]; pos[v + 2] = w[v + 2] + hz[vi]; }
      ly.geo.attributes.position.needsUpdate = true;
      ly.geo.computeVertexNormals();
    }
  }
  function setOpacity(k) { for (const ly of layers) ly.mat.opacity = ly.L.op * k; }
  function recolor(col) { const c = col('--tutu'); for (const ly of layers) ly.mat.color.copy(c); }
  return { group, layers, caps, update, setOpacity, recolor };
}

G.BalletTutu = { build, capsules, MARGIN, STACK, SOFT, NA, NR };
})(window);
