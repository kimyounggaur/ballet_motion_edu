globalThis.THREE = require('../vendor/three.min.js');
const fs=require('fs');
let src=fs.readFileSync(__dirname+'/../src/core.js','utf8');
src=src.replace("    const dr = freeHipRoll(Pr, pose);","    const dr = freeHipRoll(Pr, pose); if (globalThis.TRACE) console.log('it',it,'roll',roll.toFixed(3),'dr',dr.toFixed(3),'x',x.toFixed(4),'dx',dx.toFixed(5), RL.map(s=>s+':'+pose.legs[s].H.distanceTo(pose.legs[s].A).toFixed(5)).join(' '));");
eval(src);
const C = globalThis.BalletCore;
const Cm = C.compileMove(C.MOVES[0], 70);
const P=C.evalParams(Cm,7.5);
globalThis.TRACE=true; C.solvePose(P,null);
