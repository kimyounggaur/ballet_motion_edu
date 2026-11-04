/* ballet-app — renderer, figure, overlays, camera and UI */
(function () {
'use strict';
const C = window.BalletCore, THREE = window.THREE;
const { V3, RL, clamp, lerp, sstep } = C;
const $ = id => document.getElementById(id);
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ballet3d.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ballet3d.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

/* ---------------- state ---------------- */
const VIEW_DEFS = [
  { key: 'com', label: '무게중심·지지면', sw: 'var(--guide)' },
  { key: 'knee', label: '무릎-발끝 정렬선', sw: 'var(--ok)' },
  { key: 'angles', label: '관절 각도', sw: 'var(--guide)' },
  { key: 'trail', label: '발끝 궤적', sw: 'var(--accent)' },
  { key: 'feet', label: '발 위치 가이드', sw: 'var(--ink-3)' },
  { key: 'work', label: '작업 다리 강조', sw: 'var(--work)' },
  { key: 'tutu', label: '튜튜 스커트', sw: 'var(--tutu)' },
];
const S = {
  move: 0, C: null, t: 0, playing: !reduceMotion, speed: store.get('speed', 0.75), stepStop: store.get('stepStop', false), polish: store.get('polish', true), lag: 0,
  mirror: store.get('mirror', false), turnout: clamp(store.get('turnout', 140), 120, 160), mistake: null, metro: false,
  view: Object.assign({ com: true, knee: true, angles: true, trail: true, feet: true, work: true, tutu: true }, store.get('view', {})),
  cam: 'front', step: -1, prevXZ: null, ghostXZ: null, trail: null, measAt: 0, lastMeas: null,
};

/* ---------------- theme ---------------- */
const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const col = n => new THREE.Color(tok(n) || '#888888').convertSRGBToLinear();

/* ---------------- renderer ---------------- */
const stageEl = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
renderer.domElement.setAttribute('aria-label', '3D 발레 동작 무대. 드래그해서 회전합니다.');
stageEl.insertBefore(renderer.domElement, stageEl.firstChild);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

const hemi = new THREE.HemisphereLight(0xffffff, 0x8f8496, 0.62);
const key = new THREE.DirectionalLight(0xfff3ea, 1.0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 2.1, bottom: -0.9, near: 0.5, far: 9 });
key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015;
const fill = new THREE.DirectionalLight(0xe2e9ff, 0.32);
const rim = new THREE.DirectionalLight(0xffe7e0, 0.5);
scene.add(hemi, key, key.target, fill, rim);

// a tiny studio for image-based light: soft reflections and ambient fill on skin, fabric and satin
function buildEnv() {
  try {
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.BoxGeometry(12, 9, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.50, 0.47, 0.54), side: THREE.BackSide })));
    const panel = (w, h, pos, rgb) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb[0], rgb[1], rgb[2]), side: THREE.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 1.2, 0); es.add(m); };
    panel(4, 3, [3.2, 4.2, 3.6], [5.0, 4.6, 4.2]); panel(3, 4, [-4.2, 2.6, 2.0], [1.3, 1.5, 2.0]); panel(6, 1.2, [0, 3.2, -4.8], [3.0, 2.7, 2.6]);
    scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
  } catch (e) { scene.environment = null; }
}
buildEnv();

/* ---------------- floor ---------------- */
const FLOOR_R = 3.0;
const floorCanvas = document.createElement('canvas'); floorCanvas.width = floorCanvas.height = 2048;
const floorTex = new THREE.CanvasTexture(floorCanvas);
floorTex.encoding = THREE.sRGBEncoding; floorTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_R * 2, FLOOR_R * 2), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
floor.rotation.x = -Math.PI / 2; floor.renderOrder = -3; scene.add(floor);
const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShadowMaterial({ opacity: 0.2 }));
shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = 0.0006; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);
function drawFloor() {
  const g = floorCanvas.getContext('2d'), W = 2048, px = v => (v / (2 * FLOOR_R) + 0.5) * W;
  g.clearRect(0, 0, W, W);
  g.fillStyle = tok('--floor'); g.fillRect(0, 0, W, W);
  // marley speckle
  const ink = tok('--floor-ink');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.globalAlpha = 0.035; g.fillStyle = ink;
  for (let i = 0; i < 9000; i++) { const r = rnd() * 1.6 + 0.4; g.fillRect(rnd() * W, rnd() * W, r, r); }
  // 10 cm grid, stronger every 50 cm
  for (let i = -30; i <= 30; i++) {
    const x = px(i * 0.1), strong = i % 5 === 0;
    g.globalAlpha = strong ? 0.13 : 0.055; g.strokeStyle = ink; g.lineWidth = strong ? 2 : 1.2;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, W); g.stroke();
    g.beginPath(); g.moveTo(0, x); g.lineTo(W, x); g.stroke();
  }
  // downstage edge line + label (the audience is toward +z)
  g.globalAlpha = 0.38; g.lineWidth = 3; g.setLineDash([18, 14]);
  g.beginPath(); g.moveTo(px(-1.6), px(1.25)); g.lineTo(px(1.6), px(1.25)); g.stroke(); g.setLineDash([]);
  g.globalAlpha = 0.6; g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 46px ' + (tok('--font-body') || 'sans-serif');
  g.fillText('정면 · 관객 방향', W / 2, px(1.42));
  g.beginPath(); g.moveTo(W / 2 - 22, px(1.53)); g.lineTo(W / 2 + 22, px(1.53)); g.lineTo(W / 2, px(1.6)); g.closePath(); g.fill();
  // fade the disc out at its rim
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W * 0.5);
  rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, W);
  g.globalCompositeOperation = 'source-over';
  floorTex.needsUpdate = true;
}

/* ---------------- figure (see figure.js) ---------------- */
const F = window.BalletFigure, { M } = F;
const buildFigure = isGhost => F.build(scene, isGhost);
const halfway = (fa, fb) => { const q = new THREE.Quaternion(); return p => q.copy(fa(p)).slerp(fb(p), 0.5); };
const SEGS = [['pelvis', p => p.pp, p => p.Rp], ['abdomen', p => p.L0, p => p.Rl], ['thorax', p => p.T12, p => p.Rt], ['neck', p => p.C7, p => p.Rn], ['head', p => p.HJ, p => p.Rh]];
for (const s of RL) {
  SEGS.push([s + '_thigh', p => p.legs[s].H, p => p.legs[s].qThigh, s], [s + '_shin', p => p.legs[s].K, p => p.legs[s].qShin, s],
    [s + '_foot', p => p.legs[s].A, p => p.legs[s].qFoot, s], [s + '_toes', p => p.legs[s].ballJ, p => p.legs[s].qToe, s],
    [s + '_upper', p => p.arms[s].S, p => p.arms[s].qUpper, s], [s + '_fore', p => p.arms[s].E, p => p.arms[s].qFore, s],
    [s + '_hand', p => p.arms[s].W, p => p.arms[s].qHand, s],
    // helper bones in the knee and elbow: halfway between the two bones they sit between, so the skin bends without pinching
    [s + '_kneeM', p => p.legs[s].K, halfway(p => p.legs[s].qThigh, p => p.legs[s].qShin), s],
    [s + '_elbowM', p => p.arms[s].E, halfway(p => p.arms[s].qUpper, p => p.arms[s].qFore), s]);
}
const other = s => (s === 'R' ? 'L' : 'R');
function applyPose(fig, pose, mirror) {
  for (const [name, fp, fq, side] of SEGS) {
    const tgt = mirror && side ? other(side) + name.slice(1) : name;
    const g = fig.G[tgt], p = fp(pose), q = fq(pose);
    if (mirror) { g.position.set(-p.x, p.y, p.z); g.quaternion.set(q.x, -q.y, -q.z, q.w); }
    else { g.position.copy(p); g.quaternion.copy(q); }
  }
}
const fig = buildFigure(false);
const ghost = buildFigure(true); ghost.root.visible = false;
const tutu = window.BalletTutu.build(scene);

/* ---------------- overlays ---------------- */
const mv3 = v => (S.mirror ? new THREE.Vector3(-v.x, v.y, v.z) : new THREE.Vector3(v.x, v.y, v.z));
function dynLine(max, color, opts = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
  geo.setDrawRange(0, 0);
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 0.95, depthTest: opts.depthTest ?? true });
  const obj = new (opts.loop ? THREE.LineLoop : THREE.Line)(geo, m);
  obj.renderOrder = opts.order ?? 3; obj.frustumCulled = false; scene.add(obj);
  return {
    obj, mat: m,
    set(pts) { const a = geo.attributes.position.array; const n = Math.min(pts.length, max); for (let i = 0; i < n; i++) { a[i * 3] = pts[i].x; a[i * 3 + 1] = pts[i].y; a[i * 3 + 2] = pts[i].z; } geo.attributes.position.needsUpdate = true; geo.setDrawRange(0, n); obj.visible = n > 1; },
    hide() { obj.visible = false; },
  };
}
function dynFill(max, color, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 9), 3));
  geo.setDrawRange(0, 0);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const obj = new THREE.Mesh(geo, m); obj.renderOrder = 1; obj.frustumCulled = false; scene.add(obj);
  return {
    obj, mat: m,
    set(poly, y) {
      const a = geo.attributes.position.array; if (poly.length < 3) { obj.visible = false; return; }
      let cx = 0, cz = 0; for (const q of poly) { cx += q.x; cz += q.z; } cx /= poly.length; cz /= poly.length;
      let k = 0;
      for (let i = 0; i < poly.length && k < max; i++, k++) {
        const p0 = poly[i], p1 = poly[(i + 1) % poly.length];
        a.set([cx, y, cz, p0.x, y, p0.z, p1.x, y, p1.z], k * 9);
      }
      geo.attributes.position.needsUpdate = true; geo.setDrawRange(0, k * 3); obj.visible = true;
    },
  };
}
const OV = {};
function buildOverlays() {
  const guide = col('--guide'), ok = col('--ok'), accent = col('--accent'), ghostC = col('--ghost'), ink3 = col('--ink-3');
  OV.polyFill = dynFill(40, guide, 0.13);
  OV.polyLine = dynLine(40, guide, { loop: true, opacity: 0.75 });
  OV.comBall = new THREE.Mesh(new THREE.SphereGeometry(0.02, 18, 14), new THREE.MeshBasicMaterial({ color: guide, depthTest: false, transparent: true, opacity: 0.95 }));
  OV.comBall.renderOrder = 6; scene.add(OV.comBall);
  OV.comLine = dynLine(2, guide, { opacity: 0.85, order: 6 });
  OV.comDot = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.03, 28), new THREE.MeshBasicMaterial({ color: guide, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
  OV.comDot.rotation.x = -Math.PI / 2; OV.comDot.renderOrder = 2; scene.add(OV.comDot);
  OV.gComBall = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: ghostC, depthTest: false, transparent: true, opacity: 0.9 }));
  OV.gComBall.renderOrder = 6; scene.add(OV.gComBall);
  OV.gComLine = dynLine(2, ghostC, { opacity: 0.8, order: 6 });
  OV.knee = {}; OV.footLine = {};
  for (const s of RL) { OV.knee[s] = dynLine(2, ok, { opacity: 0.9, depthTest: false, order: 4 }); OV.footLine[s] = dynLine(2, ok, { opacity: 0.85, order: 2 }); }
  OV.kneeDot = {};
  for (const s of RL) { const m = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.02, 20), new THREE.MeshBasicMaterial({ color: ok, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); OV.kneeDot[s] = m; }
  OV.arcs = [0, 1, 2].map(() => dynLine(24, guide, { opacity: 0.95, depthTest: false, order: 7 }));
  OV.prints = [0, 1].map(() => dynLine(40, ink3, { loop: true, opacity: 0.55, order: 2 }));
  OV.trailMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, depthWrite: false });
  OV.trail = [];
}
function recolorOverlays() {
  const guide = col('--guide'), ghostC = col('--ghost'), accent = col('--accent'), ink3 = col('--ink-3');
  [OV.polyFill.mat, OV.polyLine.mat, OV.comBall.material, OV.comLine.mat, OV.comDot.material, ...OV.arcs.map(a => a.mat)].forEach(m => m.color.copy(guide));
  [OV.gComBall.material, OV.gComLine.mat].forEach(m => m.color.copy(ghostC));
  OV.prints.forEach(p => p.mat.color.copy(ink3));
  OV.trailMat.color.copy(accent);
}
function buildTrail() {
  for (const m of OV.trail) { scene.remove(m); m.geometry.dispose(); }
  OV.trail = [];
  if (!S.trail) return;
  for (const s of RL) {
    const pts = S.trail[s];
    if (!pts || pts.length < 4) continue;
    let span = 0; for (const p of pts) span = Math.max(span, p.distanceTo(pts[0]));
    if (span < 0.05) continue;
    const curve = new THREE.CatmullRomCurve3(pts.map(mv3));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(600, pts.length * 2), 0.0035, 6, false), OV.trailMat);
    mesh.renderOrder = 2; scene.add(mesh); OV.trail.push(mesh);
  }
}
const FOOT_OUTLINE = (() => {
  const half = [[0, -0.062], [0.016, -0.059], [0.025, -0.047], [0.029, -0.02], [0.031, 0.012], [0.035, 0.05], [0.041, 0.095], [0.044, 0.135], [0.042, 0.158], [0.037, 0.178], [0.029, 0.191], [0.015, 0.198], [0, 0.2]];
  const pts = half.map(([x, z]) => [x, z]);
  for (let i = half.length - 2; i > 0; i--) pts.push([-half[i][0], half[i][1]]);
  return pts;
})();
function footprintPts(pl) {
  const f = C.fdir(pl.phi), lat = new THREE.Vector3(f.z, 0, -f.x);
  const qF = C.qAx(new THREE.Vector3(0, 1, 0), pl.phi);
  const A = new THREE.Vector3(pl.x, 0.02, pl.z).add(new THREE.Vector3(0, 0.055, -0.14).applyQuaternion(qF));
  return FOOT_OUTLINE.map(([x, z]) => new THREE.Vector3(A.x + lat.x * x + f.x * z, 0.0015, A.z + lat.z * x + f.z * z));
}
const labelsEl = $('labels');
const LBL = [0, 1, 2].map(() => { const d = document.createElement('div'); d.className = 'lbl3d'; d.hidden = true; labelsEl.appendChild(d); return d; });
function placeLabel(el, p, text, cls) {
  const v = p.clone().project(camera);
  if (v.z > 1 || v.z < -1) { el.hidden = true; return; }
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  el.textContent = text; el.className = 'lbl3d' + (cls ? ' ' + cls : '');
  el.style.transform = `translate(${((v.x + 1) / 2 * w + 8).toFixed(1)}px, ${((1 - v.y) / 2 * h - 10).toFixed(1)}px)`;
  el.hidden = false;
}
function arcPts(center, u1, u2, r) {
  const ang = Math.acos(clamp(u1.dot(u2), -1, 1)); const n = 20, pts = [];
  const axis = new THREE.Vector3().crossVectors(u1, u2); if (axis.lengthSq() < 1e-10) return pts; axis.normalize();
  for (let i = 0; i <= n; i++) pts.push(center.clone().add(u1.clone().applyAxisAngle(axis, ang * i / n).multiplyScalar(r)));
  return pts;
}

/* ---------------- camera ---------------- */
const CAMS = {
  front: { th: 0, ph: 80, r: 4.3, y: 0.84 }, q34: { th: -38, ph: 70, r: 4.25, y: 0.8 }, side: { th: -90, ph: 82, r: 4.4, y: 0.84 },
  back: { th: 180, ph: 80, r: 4.3, y: 0.84 }, top: { th: 0, ph: 4, r: 3.3, y: 0.1 },
};
const cam = { th: 0, ph: 80, r: 4.3, y: 0.84, tx: 0, tz: 0, goal: null };
const nearAng = (from, to) => { let d = ((to - from) % 360 + 540) % 360 - 180; return from + d; };
function setCam(name, instant) {
  const c = CAMS[name]; if (!c) return;
  S.cam = name;
  const g = { th: nearAng(cam.th, S.mirror ? -c.th : c.th), ph: c.ph, r: c.r, y: c.y };
  if (instant || reduceMotion) { Object.assign(cam, g); cam.goal = null; } else cam.goal = g;
  for (const b of $('cams').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.cam === name));
}
function updateCamera(dt, target) {
  if (cam.goal) {
    const k = 1 - Math.exp(-dt * 5.5);
    for (const f of ['th', 'ph', 'r', 'y']) cam[f] += (cam.goal[f] - cam[f]) * k;
    if (Math.abs(cam.goal.th - cam.th) < 0.05 && Math.abs(cam.goal.ph - cam.ph) < 0.05 && Math.abs(cam.goal.r - cam.r) < 0.002) { Object.assign(cam, cam.goal); cam.goal = null; }
  }
  const kf = reduceMotion ? 1 : 1 - Math.exp(-dt * 3);
  cam.tx += (target.x - cam.tx) * kf; cam.tz += (target.z - cam.tz) * kf;
  const th = cam.th * Math.PI / 180, ph = cam.ph * Math.PI / 180;
  camera.position.set(cam.tx + cam.r * Math.sin(th) * Math.sin(ph), cam.y + cam.r * Math.cos(ph), cam.tz + cam.r * Math.cos(th) * Math.sin(ph));
  camera.up.set(0, 1, 0);
  if (cam.ph < 6) camera.up.set(-Math.sin(th), 0, -Math.cos(th));
  camera.lookAt(cam.tx, cam.y, cam.tz);
}
(function camInput() {
  const el = renderer.domElement, pts = new Map(); let pinch = 0;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cam.goal = null;
    if (pts.size === 1) { cam.th -= dx * 0.38; cam.ph = clamp(cam.ph - dy * 0.3, 3, 89); markCustomCam(); }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0) cam.r = clamp(cam.r * pinch / d, 1.5, 7); pinch = d; }
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); cam.goal = null; cam.r = clamp(cam.r * Math.exp(e.deltaY * 0.0012), 1.5, 7); }, { passive: false });
})();
function markCustomCam() { if (S.cam) { S.cam = null; for (const b of $('cams').querySelectorAll('button')) b.setAttribute('aria-pressed', 'false'); } }

/* ---------------- compile / movement ---------------- */
const countLabel = (mv, c) => (c < mv.intro ? String(8 - mv.intro + 1 + c) : String(((c - mv.intro) % 8) + 1));
function stepAt(t) { const st = S.C.def.steps; for (let i = st.length - 1; i >= 0; i--) if (t >= st[i].t0 - 1e-9) return i; return 0; }
function compile() {
  const def = C.MOVES[S.move];
  S.C = C.compileMove(def, S.turnout / 2);
  S.prevXZ = null; S.ghostXZ = null;
  // toe paths for the trail
  const N = Math.round(S.C.total * 24), tr = { R: [], L: [] }; let prev = null;
  for (let i = 0; i <= N; i++) {
    const P = C.evalParams(S.C, S.C.total * i / N), p = C.solvePose(P, prev); prev = p.warm;
    for (const s of RL) tr[s].push(p.legs[s].tipPt.clone().setY(Math.max(0.004, p.legs[s].tipPt.y)));
  }
  S.trail = tr;
  // footprints at the end of each step
  S.prints = def.steps.map(st => {
    let k = 0; S.C.ts.forEach((t, i) => { if (t <= st.t1 + 1e-9) k = i; });
    const P = S.C.keyParams[k];
    return RL.filter(s => P.legs[s].mode === 'plant').map(s => footprintPts(P.legs[s].pl));
  });
  buildTrail();
}
function setMove(i, keepTime) {
  S.move = i; S.mistake = null;
  compile();
  if (!keepTime) S.t = 0;
  S.step = -1;
  const def = C.MOVES[i];
  for (const b of $('moveTabs').children) b.setAttribute('aria-selected', String(+b.dataset.i === i));
  $('mvName').textContent = def.name; $('mvFr').textContent = def.fr; $('mvDesc').textContent = def.desc;
  buildSteps(); buildRuler(); buildMistakes();
  if (!keepTime) setCam(def.cam === 'side34' ? 'side' : def.cam === 'q34r' || def.cam === 'high' ? 'q34' : def.cam, false);
  try { if (location.hash.slice(1) !== def.id) location.replace('#' + def.id); } catch (e) { /* hash routing unavailable */ }
}

/* ---------------- UI builders ---------------- */
function el(tag, attrs = {}, html) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (html !== undefined) e.innerHTML = html; return e; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function buildTabs() {
  const nav = $('moveTabs');
  C.MOVES.forEach((m, i) => {
    const b = el('button', { type: 'button', role: 'tab', 'data-i': i, 'aria-selected': 'false' }, `<span class="ko">${esc(m.name)}</span><span class="fr">${esc(m.fr)}</span>`);
    b.addEventListener('click', () => { setMove(i); if (!reduceMotion) S.playing = true; updatePlay(); });
    nav.appendChild(b);
  });
}
function stepCountRange(st) {
  const mv = S.C.def, a = countLabel(mv, Math.floor(st.t0)), b = countLabel(mv, Math.max(Math.floor(st.t0), Math.ceil(st.t1) - 1));
  return a === b ? a : `${a}–${b}`;
}
function buildSteps() {
  const ol = $('steps'); ol.innerHTML = '';
  S.C.def.steps.forEach((st, i) => {
    const li = el('li');
    const b = el('button', { type: 'button' }, `<span class="n">${i + 1}</span><span class="t">${esc(st.title)}</span>`);
    b.addEventListener('click', () => { S.t = st.t0; S.playing = false; updatePlay(); });
    li.appendChild(b);
    const ul = el('ul', { class: 'cues' });
    if (st.arms) ul.appendChild(el('li', { class: 'arms-note' }, `팔: ${esc(st.arms)}`));
    for (const c of st.cues) ul.appendChild(el('li', {}, esc(c)));
    li.appendChild(ul);
    ol.appendChild(li);
  });
}
function buildRuler() {
  const tr = $('track'); tr.innerHTML = ''; S.segs = [];
  S.C.def.steps.forEach((st, i) => {
    const d = el('div', { class: 'seg', title: st.title }, '<i></i>');
    d.style.flex = `${st.t1 - st.t0} 1 0`;
    tr.appendChild(d); S.segs.push({ d, f: d.firstChild, t0: st.t0, t1: st.t1 });
  });
}
(function trackInput() {
  const tr = $('track'); let drag = false, wasPlaying = false;
  const toT = e => {
    let best = null, bd = Infinity;
    for (const g of S.segs) {
      const r = g.d.getBoundingClientRect(), dist = e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0;
      if (dist < bd) { bd = dist; best = { g, r }; }
    }
    return best.g.t0 + clamp((e.clientX - best.r.left) / best.r.width, 0, 1) * (best.g.t1 - best.g.t0);
  };
  tr.addEventListener('pointerdown', e => { e.preventDefault(); drag = true; wasPlaying = S.playing; S.playing = false; tr.setPointerCapture(e.pointerId); S.t = Math.min(toT(e), S.C.total - 1e-3); updatePlay(); });
  tr.addEventListener('pointermove', e => { if (drag) S.t = Math.min(toT(e), S.C.total - 1e-3); });
  const end = () => { if (drag) { drag = false; S.playing = wasPlaying; updatePlay(); } };
  tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
  tr.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { S.t = Math.min(S.C.total - 1e-3, S.t + 0.5); e.preventDefault(); } if (e.key === 'ArrowLeft') { S.t = Math.max(0, S.t - 0.5); e.preventDefault(); } });
})();
function buildToggles() {
  const box = $('toggles'); box.innerHTML = '';
  for (const v of VIEW_DEFS) {
    const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(!!S.view[v.key]), style: `--sw:${v.sw}` }, `<i></i>${esc(v.label)}`);
    b.addEventListener('click', () => { S.view[v.key] = !S.view[v.key]; b.setAttribute('aria-pressed', String(S.view[v.key])); store.set('view', S.view); });
    box.appendChild(b);
  }
}
function buildMistakes() {
  const box = $('mistakes'); box.innerHTML = '';
  for (const id of S.C.def.mistakes) {
    const m = C.MISTAKES[id];
    const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(S.mistake === id) }, `<i></i>${esc(m.label)}`);
    b.addEventListener('click', () => { S.mistake = S.mistake === id ? null : id; S.ghostXZ = null; buildMistakes(); });
    box.appendChild(b);
  }
  const card = $('mistCard');
  if (S.mistake) {
    const m = C.MISTAKES[S.mistake];
    card.innerHTML = `<h4>${esc(m.label)}</h4><p><b>왜 문제인가</b> ${esc(m.why)}</p><p><b>고치는 법</b> ${esc(m.fix)}</p>`;
    card.hidden = false;
  } else card.hidden = true;
  $('ghostKey').hidden = !S.mistake;
}
function updatePlay() {
  $('playTxt').textContent = S.playing ? '일시정지' : '재생';
  $('playBtn').setAttribute('aria-label', S.playing ? '일시정지' : '재생');
  $('playIcon').innerHTML = S.playing ? '<path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/>' : '<path d="M4 2.5v11l9.5-5.5z"/>';
}
function bindControls() {
  $('playBtn').addEventListener('click', () => { if (!S.playing && S.t >= S.C.total - 1e-6) S.t = 0; S.playing = !S.playing; updatePlay(); });
  $('prevBtn').addEventListener('click', () => { const i = stepAt(S.t), st = S.C.def.steps; S.t = (S.t - st[i].t0 > 0.35 || i === 0) ? st[i].t0 : st[i - 1].t0; S.playing = false; updatePlay(); });
  $('nextBtn').addEventListener('click', () => { const i = stepAt(S.t), st = S.C.def.steps; S.t = i + 1 < st.length ? st[i + 1].t0 : 0; S.playing = false; updatePlay(); });
  for (const b of $('speeds').querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(+b.dataset.speed === S.speed));
    b.addEventListener('click', () => { S.speed = +b.dataset.speed; store.set('speed', S.speed); for (const x of $('speeds').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b)); });
  }
  const ss = $('stepStop'); ss.setAttribute('aria-pressed', String(S.stepStop));
  ss.addEventListener('click', () => { S.stepStop = !S.stepStop; ss.setAttribute('aria-pressed', String(S.stepStop)); store.set('stepStop', S.stepStop); });
  const pl = $('polish'); pl.setAttribute('aria-pressed', String(S.polish));
  pl.addEventListener('click', () => { S.polish = !S.polish; pl.setAttribute('aria-pressed', String(S.polish)); store.set('polish', S.polish); });
  const mt = $('metro');
  mt.addEventListener('click', () => {
    S.metro = !S.metro; mt.setAttribute('aria-pressed', String(S.metro));
    if (S.metro && !S.actx) { try { S.actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { S.metro = false; mt.setAttribute('aria-pressed', 'false'); } }
    if (S.actx && S.actx.state === 'suspended') S.actx.resume();
  });
  for (const b of $('cams').querySelectorAll('button')) b.addEventListener('click', () => setCam(b.dataset.cam));
  const setSide = m => {
    if (m === S.mirror) return;
    S.mirror = m; store.set('mirror', m);
    $('sideR').setAttribute('aria-pressed', String(!m)); $('sideL').setAttribute('aria-pressed', String(m));
    cam.th = -cam.th; if (cam.goal) cam.goal.th = -cam.goal.th; cam.tx = -cam.tx;
    buildTrail(); S.lastMeas = null;
  };
  $('sideR').addEventListener('click', () => setSide(false)); $('sideL').addEventListener('click', () => setSide(true));
  $('sideR').setAttribute('aria-pressed', String(!S.mirror)); $('sideL').setAttribute('aria-pressed', String(S.mirror));
  const to = $('turnout'); to.value = S.turnout; $('turnoutOut').textContent = S.turnout + '°';
  to.addEventListener('input', () => { $('turnoutOut').textContent = to.value + '°'; });
  to.addEventListener('change', () => { S.turnout = +to.value; store.set('turnout', S.turnout); compile(); });
  document.addEventListener('keydown', e => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); $('playBtn').click(); }
  });
  window.addEventListener('hashchange', () => { const i = C.MOVES.findIndex(m => m.id === location.hash.slice(1)); if (i >= 0 && i !== S.move) setMove(i); });
}

/* ---------------- audio ---------------- */
function click(c) {
  const a = S.actx; if (!a) return;
  const accent = countLabel(S.C.def, c) === '1' || c === 0;
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime;
  o.type = 'triangle'; o.frequency.value = accent ? 1320 : 880;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.12, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.12);
}

/* ---------------- per-frame updates ---------------- */
function updateHud() {
  const def = S.C.def, i = stepAt(S.t), st = def.steps[i];
  if (i !== S.step) {
    S.step = i;
    $('hudIdx').textContent = `${String(i + 1).padStart(2, '0')} / ${String(def.steps.length).padStart(2, '0')} · ${stepCountRange(st)}`;
    $('hudTitle').textContent = st.title; $('hudFr').textContent = st.fr;
    [...$('steps').children].forEach((li, k) => li.classList.toggle('on', k === i));
  }
  const c = Math.min(Math.floor(S.t + 1e-6), S.C.total - 1);
  $('hudCount').textContent = countLabel(def, c);
  $('hudAnd').textContent = (S.t - c) >= 0.5 ? '&' : '';
  S.segs.forEach((g, k) => {
    const u = clamp((S.t - g.t0) / (g.t1 - g.t0), 0, 1);
    g.f.style.transform = `scaleX(${u.toFixed(3)})`;
    g.d.classList.toggle('on', k === i); g.d.classList.toggle('done', S.t >= g.t1 - 1e-6);
  });
  const tk = $('track'); tk.setAttribute('aria-valuemin', '0'); tk.setAttribute('aria-valuemax', String(S.C.total));
  tk.setAttribute('aria-valuenow', S.t.toFixed(1)); tk.setAttribute('aria-valuetext', `${st.title}, 카운트 ${countLabel(def, c)}`);
}
const fmtDeg = v => `${Math.round(v)}°`;
function updateMeasure(pose, P, m, work) {
  const cols = S.mirror ? ['R', 'L'] : ['L', 'R'];   // display columns: 왼쪽, 오른쪽
  const isWork = s => work.includes(s);
  const cell = (s, html) => `<td class="${isWork(s) ? 'w' : ''}">${html}</td>`;
  const rows = [];
  const kneeTxt = s => (m.legs[s].knee < 5 ? '곧게' : fmtDeg(m.legs[s].knee));
  const ankleTxt = s => { const a = m.legs[s].ankle; return Math.abs(a) < 2 ? '0°' : a > 0 ? `포인 ${Math.round(a)}°` : `굽힘 ${Math.round(-a)}°`; };
  const heightTxt = s => (m.legs[s].mode === 'plant' ? '—' : fmtDeg(m.legs[s].el));
  const heelTxt = s => (m.legs[s].mode === 'plant' ? `${(m.legs[s].heel * 100).toFixed(1)} cm` : '—');
  const alignTxt = s => {
    const L = m.legs[s];
    if (L.mode !== 'plant' || L.align === null) return '—';
    if (L.kneeOff !== null && L.knee > 15) { const off = L.kneeOff * 100, bad = Math.abs(off) > 2; return `<span class="${bad ? 'bad' : 'ok'}">${bad ? (off > 0 ? '안쪽 ' : '바깥 ') + Math.abs(off).toFixed(1) + ' cm' : '발끝 위 ✓'}</span>`; }
    const bad = L.align > 12; return `<span class="${bad ? 'bad' : 'ok'}">${bad ? '어긋남 ' + Math.round(L.align) + '°' : '같은 방향 ✓'}</span>`;
  };
  rows.push(['무릎 굴곡', kneeTxt], ['발목', ankleTxt], ['다리 높이', heightTxt], ['뒤꿈치 높이', heelTxt], ['무릎·발끝 정렬', alignTxt]);
  $('measBody').innerHTML = rows.map(([lab, f]) => `<tr><td>${lab}</td>${cell(cols[0], f(cols[0]))}${cell(cols[1], f(cols[1]))}</tr>`).join('');
  const tilt = m.pelvisTilt, lean = m.torsoLean;
  $('measFoot').innerHTML = `<span>턴아웃 <b>${S.turnout}°</b></span><span>골반 앞기울기 <b>${tilt >= 0 ? '' : '−'}${Math.abs(tilt).toFixed(0)}°</b></span><span>상체 기울기 <b>${Math.abs(lean).toFixed(0)}°${Math.abs(lean) >= 1 ? (lean > 0 ? ' 앞' : ' 뒤') : ''}</b></span>`;
  // balance box
  const wL = S.mirror ? P.w : 1 - P.w;
  $('wTxt').textContent = `왼 ${Math.round(wL * 100)} · 오 ${Math.round((1 - wL) * 100)}`;
  $('wFill').style.width = `${(wL * 100).toFixed(1)}%`;
  const ok = m.comDist > -0.015, ct = $('comTxt');
  ct.className = ok ? 'com-ok' : 'com-bad';
  ct.textContent = ok ? `지지면 안${m.comDist > 0 ? ` · 여유 ${(m.comDist * 100).toFixed(1)} cm` : ''}` : `지지면 밖 ${(-m.comDist * 100).toFixed(1)} cm`;
  const gm = S.gm, gr = $('gRow');
  if (gm) {
    const gok = gm.comDist > -0.015, gt = $('gTxt');
    gt.className = gok ? 'com-ok' : 'com-bad';
    gt.textContent = gok ? `지지면 안 · 여유 ${(Math.max(0, gm.comDist) * 100).toFixed(1)} cm` : `지지면 밖 ${(-gm.comDist * 100).toFixed(1)} cm`;
    gr.hidden = false;
  } else gr.hidden = true;
}
function updateOverlays(pose, P, m, gpose, gm) {
  const v = S.view, ok = col('--ok'), bad = col('--bad');
  // centre of mass + support polygon
  const showCom = v.com;
  OV.polyFill.obj.visible = OV.polyLine.obj.visible = OV.comBall.visible = OV.comLine.obj.visible = OV.comDot.visible = showCom;
  if (showCom) {
    const poly = m.poly.map(q => mv3({ x: q.x, y: 0.002, z: q.z }));
    OV.polyFill.set(poly, 0.0018); OV.polyLine.set(poly);
    const com = mv3(pose.com); OV.comBall.position.copy(com); OV.comLine.set([com, new THREE.Vector3(com.x, 0.003, com.z)]);
    OV.comDot.position.set(com.x, 0.003, com.z);
    const cc = m.comDist > -0.015 ? col('--guide') : bad; OV.comDot.material.color.copy(cc); OV.comBall.material.color.copy(cc);
  }
  const gOn = showCom && !!gpose;
  OV.gComBall.visible = gOn; OV.gComLine.obj.visible = gOn;
  if (gOn) { const gc = mv3(gpose.com); OV.gComBall.position.copy(gc); OV.gComLine.set([gc, new THREE.Vector3(gc.x, 0.003, gc.z)]); }
  // knee-over-toe guides for planted legs (or the mistake ghost's, when one is shown)
  const kp = gpose || pose, km = gm || m;
  for (const s of RL) {
    const l = kp.legs[s], L = km.legs[s];
    const show = v.knee && l.mode === 'plant';
    OV.knee[s].obj.visible = OV.footLine[s].obj.visible = OV.kneeDot[s].visible = show;
    if (!show) continue;
    const f = C.fdir(l.pl.phi);
    const heel = new THREE.Vector3(l.heelPt.x, 0.0025, l.heelPt.z);
    const tipFar = new THREE.Vector3(l.ballJ.x + f.x * 0.16, 0.0025, l.ballJ.z + f.z * 0.16);
    const isBad = L.align !== null && ((L.kneeOff !== null && L.knee > 15) ? Math.abs(L.kneeOff) > 0.02 : L.align > 12);
    const c = isBad ? bad : ok;
    OV.footLine[s].set([mv3(heel), mv3(tipFar)]); OV.footLine[s].mat.color.copy(c);
    const K = mv3(l.K); OV.knee[s].set([K, new THREE.Vector3(K.x, 0.003, K.z)]); OV.knee[s].mat.color.copy(c);
    OV.kneeDot[s].position.set(K.x, 0.003, K.z); OV.kneeDot[s].material.color.copy(c);
  }
  // angle arcs + labels
  let li = 0;
  const lbl = (pt, text, cls) => { if (li < LBL.length) placeLabel(LBL[li++], pt, text, cls); };
  OV.arcs.forEach(a => a.hide());
  if (v.angles) {
    let ai = 0;
    for (const s of RL) {
      const l = pose.legs[s], L = m.legs[s];
      if (L.knee > 8 && ai < 3) {
        const u1 = l.K.clone().sub(l.H).normalize(), u2 = l.A.clone().sub(l.K).normalize();
        const pts = arcPts(l.K, u1, u2, 0.085).map(mv3);
        OV.arcs[ai++].set(pts); lbl(pts[pts.length >> 1], fmtDeg(L.knee), '');
      }
      if (l.mode !== 'plant' && L.el > 12 && ai < 3) {
        const u1 = new THREE.Vector3(0, -1, 0), u2 = l.A.clone().sub(l.H).normalize();
        const pts = arcPts(l.H, u1, u2, 0.2).map(mv3);
        OV.arcs[ai++].set(pts); lbl(pts[pts.length >> 1], '다리 ' + fmtDeg(L.el), 'work');
      }
    }
  }
  for (; li < LBL.length; li++) LBL[li].hidden = true;
  // trail + footprints
  for (const t of OV.trail) t.visible = v.trail;
  const pr = v.feet && S.prints ? S.prints[stepAt(S.t)] || [] : [];
  OV.prints.forEach((p, i) => { if (pr[i]) p.set(pr[i].map(mv3)); else p.hide(); });
}
const workBase = new THREE.Color(), workTint = new THREE.Color(), slipBase = new THREE.Color();
function updateWorkTint(work) {
  workBase.copy(col('--tights')); workTint.copy(col('--work')); slipBase.copy(col('--slipper'));
  for (const s of RL) {
    const disp = S.mirror ? other(s) : s;
    const target = S.view.work && work.includes(s) ? 1 : 0;
    const k = (S['wk' + disp] = lerp(S['wk' + disp] || 0, target, 0.18));
    M['tights' + disp].color.copy(workBase).lerp(workTint, k * 0.75);
    M['slip' + disp].emissive.copy(workTint); M['slip' + disp].emissiveIntensity = k * 0.12;
  }
}
function applyTheme() {
  F.recolor(col); tutu.recolor(col);
  const dark = getComputedStyle(document.documentElement).colorScheme === 'dark' || tok('--bg').toLowerCase() === '#141018';
  hemi.intensity = dark ? 0.26 : 0.30; key.intensity = dark ? 1.05 : 0.92; rim.intensity = dark ? 0.85 : 0.5;
  shadowCatcher.material.opacity = dark ? 0.32 : 0.2;
  drawFloor(); recolorOverlays(); buildTrail();
}

function poseDiff(a, b) {
  let d = Math.max(a.pp.distanceTo(b.pp), a.HJ.distanceTo(b.HJ));
  for (const s of RL) {
    d = Math.max(d, a.legs[s].K.distanceTo(b.legs[s].K), a.legs[s].A.distanceTo(b.legs[s].A), a.legs[s].tipPt.distanceTo(b.legs[s].tipPt), a.arms[s].W.distanceTo(b.arms[s].W));
  }
  return d;
}

/* ---------------- loop ---------------- */
let last = performance.now(), lastPose = null;
function advance(dt) {
  const def = S.C.def; let nt = S.t + dt * def.bpm / 60 * S.speed;
  if (S.stepStop) { const i = stepAt(S.t), end = def.steps[i].t1; if (S.t < end - 1e-6 && nt >= end - 1e-6) { nt = end; S.playing = false; updatePlay(); } }
  if (S.metro) { const c0 = Math.floor(S.t + 1e-9), c1 = Math.floor(nt + 1e-9); if (c1 > c0) click(c1 % S.C.total); }
  if (nt >= S.C.total) { if (S.stepStop) { nt = S.C.total; S.playing = false; updatePlay(); } else nt -= S.C.total; }
  S.t = nt;
}
function renderFrame(dt) {
  S.lag += ((S.lagLock !== undefined ? S.lagLock : S.playing ? 1 : 0) - S.lag) * (1 - Math.exp(-dt / 0.14));   // follow-through only while moving; a pause settles into the textbook pose
  const ev = { polish: S.polish, lag: S.lag };
  const P = C.evalParams(S.C, S.t, ev);
  const pose = C.solvePose(P, S.prevXZ); S.prevXZ = pose.warm;
  applyPose(fig, pose, S.mirror);
  // the skirt is see-through from above so the feet and the floor guides stay readable in the top view
  const tutuK = S.view.tutu ? 0.1 + 0.9 * sstep(16, 52, cam.ph) : 0;
  tutu.setOpacity(tutuK); tutu.update(pose, S.mirror, tutuK);
  const br = S.polish ? C.breathAt(S.t) : 0;
  fig.setGaze(S.mirror ? -pose.eyes.yaw : pose.eyes.yaw, pose.eyes.pitch); fig.setBreath(br);
  const work = C.workingSide(P);
  updateWorkTint(work);
  let gpose = null, gm = null;
  ghost.root.visible = false;
  if (S.mistake) {
    const Pg = C.applyMistake(C.evalParams(S.C, S.t, ev), S.mistake);
    const gp = C.solvePose(Pg, S.ghostXZ); S.ghostXZ = gp.warm;
    // fade the ghost out where the mistake doesn't change anything, so it never tints the correct figure
    const k = sstep(0.008, 0.03, poseDiff(pose, gp));
    if (k > 0.01) {
      applyPose(ghost, gp, S.mirror); ghost.setBreath(br); ghost.root.visible = true; F.setGhostOpacity(0.34 * k);
      gpose = gp; gm = C.measure(gp, Pg);
    }
  }
  const m = C.measure(pose, P);
  S.gm = gm;
  const pc = mv3(pose.pp);
  key.position.set(pc.x + 1.2, 4.6, pc.z + 2.1); key.target.position.set(pc.x, 0.75, pc.z);
  fill.position.set(pc.x - 2.6, 1.7, pc.z + 1.4); rim.position.set(pc.x - 0.9, 2.7, pc.z - 3.2);
  updateCamera(dt, pc);
  updateOverlays(pose, P, m, gpose, gm);
  renderer.render(scene, camera);
  updateHud();
  const now = performance.now();
  if (now - S.measAt > 90) { S.measAt = now; updateMeasure(pose, P, m, work); }
  lastPose = { pose, P, m };
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S.playing) advance(dt);
  renderFrame(dt);
  requestAnimationFrame(frame);
}
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h);
  camera.fov = w < 520 ? 36 : 30; camera.updateProjectionMatrix();
}

/* ---------------- boot ---------------- */
buildOverlays(); buildTabs(); bindControls(); buildToggles();
const hashIdx = C.MOVES.findIndex(m => m.id === location.hash.slice(1));
setMove(hashIdx >= 0 ? hashIdx : 0);
setCam(S.cam || 'front', true);
updatePlay(); applyTheme(); resize();
if (window.ResizeObserver) new ResizeObserver(resize).observe(stageEl); else window.addEventListener('resize', resize);
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawFloor);
requestAnimationFrame(frame);

/* test hook */
window.__ballet = {
  scene, fig, ghost, tutu,
  set(o) {
    if (o.move !== undefined) { const i = C.MOVES.findIndex(m => m.id === o.move); if (i >= 0) setMove(i); }
    if (o.mirror !== undefined) (o.mirror ? $('sideL') : $('sideR')).click();
    if (o.turnout !== undefined) { S.turnout = o.turnout; compile(); }
    if (o.polish !== undefined) S.polish = !!o.polish;
    S.lagLock = undefined;
    if (o.mistake !== undefined) { S.mistake = o.mistake; buildMistakes(); }
    if (o.t !== undefined) { S.t = o.t; S.playing = false; updatePlay(); }
    if (o.cam) setCam(o.cam, true);
    if (o.camR) cam.r = o.camR;
    if (o.camY) cam.y = o.camY;
    if (o.camTh !== undefined) cam.th = o.camTh;
    if (o.camPh !== undefined) cam.ph = o.camPh;
    if (o.view) Object.assign(S.view, o.view);
    S.prevXZ = null; S.ghostXZ = null;
    for (let i = 0; i < 4; i++) renderFrame(1);
    updateMeasure(lastPose.pose, lastPose.P, lastPose.m, C.workingSide(lastPose.P));
    return true;
  },
  measure() { return lastPose && lastPose.m; },
  warm(t) { S.prevXZ = C.solvePose(C.evalParams(S.C, t, { polish: S.polish }), S.prevXZ).warm; return true; },   // advance the solver without drawing
  frame(t, polish) { if (polish !== undefined) S.polish = !!polish; S.t = t; S.playing = false; S.lagLock = 1; renderFrame(1); return true; },   // one playback-like step (keeps the solver's warm start)
};
})();
