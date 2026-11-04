globalThis.THREE = require('../vendor/three.min.js'); globalThis.window = globalThis;
require('../src/core.js'); window.BalletCore = globalThis.BalletCore; window.THREE = THREE;
require('../src/figure.js');
const F = window.BalletFigure, scene = new THREE.Scene();
const fig = F.build(scene, false);
const legs = fig.root.children.filter(c => c.isSkinnedMesh);
console.log('skinned meshes:', legs.length, legs.map(m => m.geometry.attributes.position.count + '/' + m.skeleton.bones.length).join(' '));
const L = fig.G.R_thigh, K = fig.G.R_kneeM, S = fig.G.R_shin;
console.log('bones exist', !!L, !!K, !!S);
L.position.set(0.085, 0.9, 0); K.position.set(0.085, 0.49, 0.0); S.position.set(0.085, 0.49, 0);
scene.updateMatrixWorld(true);
const m = legs.find(x => x.skeleton.bones[0] === L);
m.skeleton.update();
const v = new THREE.Vector3(); const out = [];
for (const i of [0, 100, 1000, 2000, 2361]) { m.boneTransform(i, v); const o = new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, i); out.push(`${i}: (${o.x.toFixed(3)},${o.y.toFixed(3)},${o.z.toFixed(3)}) -> (${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)})`); }
console.log(out.join('\n'));
console.log('boneInverses[0]', m.skeleton.boneInverses[0].elements.slice(12, 15), 'boneInverses[1]', m.skeleton.boneInverses[1].elements.slice(12, 15));
console.log('bindMatrix', m.bindMatrix.elements.slice(12, 15), 'mesh matrixWorld', m.matrixWorld.elements.slice(12, 15));
