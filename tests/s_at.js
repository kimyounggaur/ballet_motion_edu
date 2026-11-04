globalThis.THREE = require('../vendor/three.min.js');
require(require('path').resolve(process.argv[2]));
const C = globalThis.BalletCore;
const id = process.argv[3]; const def = C.MOVES.find(m => m.id === id), Cm = C.compileMove(def, 70);
const opt = { polish: !!process.env.POLISH };
for (const t of process.argv.slice(4).map(Number)) { const P = C.evalParams(Cm, t, opt); const fk = P.legs.R.fk || {}; console.log(id, t, 'mode', P.legs.R.mode, 's', (fk.s ?? NaN).toFixed(3), 'a', (fk.a ?? NaN).toFixed(1)); }
