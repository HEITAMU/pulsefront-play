import assert from 'node:assert/strict';
import {HEAT_EFFECTS,pickHeatEffects} from '../overheat.mjs';
import {Battle,rng} from '../engine.mjs';
assert.equal(HEAT_EFFECTS.length,10);const seen=new Set(),random=rng(792);
for(let i=0;i<100;i++){const choices=pickHeatEffects(i+1,random);assert.equal(choices.length,Math.min(3,i+1));assert.equal(new Set(choices).size,choices.length);choices.forEach(x=>seen.add(x));}assert.equal(seen.size,10);
const b=new Battle(1);for(let i=1;i<=5;i++){b.overdrive=0;b.pendingOverdrive=true;b.step(.01,0);assert.equal(b.burstCount,i);assert.equal(b.heatEffects.length,Math.min(3,i));assert.equal(new Set(b.heatEffects).size,b.heatEffects.length);}
assert.equal(new Battle(1).burstCount,0);console.log('PASS ten distinct heat choices, 1/2/3/3 progression, no duplicates, new-level reset');
