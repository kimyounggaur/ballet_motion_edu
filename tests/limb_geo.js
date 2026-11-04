globalThis.THREE = require('../vendor/three.min.js'); globalThis.window = globalThis;
require('../src/core.js'); window.BalletCore = globalThis.BalletCore; window.THREE = THREE;
require('../src/figure.js');
const { LG } = window.BalletFigure;
for (const k of ['leg', 'arm']) {
  const g = LG[k], p = g.attributes.position.array; let nan = 0, minY = 1e9, maxY = -1e9, maxR = 0;
  for (let i = 0; i < p.length; i += 3) { if (!isFinite(p[i] + p[i + 1] + p[i + 2])) nan++; minY = Math.min(minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1]); maxR = Math.max(maxR, Math.hypot(p[i], p[i + 2])); }
  const sw = g.attributes.skinWeight.array; let bad = 0; for (let i = 0; i < sw.length; i += 4) { const s = sw[i] + sw[i + 1] + sw[i + 2] + sw[i + 3]; if (Math.abs(s - 1) > 1e-4 || !isFinite(s)) bad++; }
  console.log(k, 'verts', p.length / 3, 'tris', g.index.count / 3, 'NaN', nan, 'y range', minY.toFixed(3), maxY.toFixed(3), 'max radius', maxR.toFixed(3), 'bad weight sums', bad);
}
