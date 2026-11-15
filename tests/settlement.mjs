import assert from 'node:assert/strict';
import {Battle} from './legacy-battle.mjs';
const b=new Battle(1);b.t=b.c.duration-1;b.overdrive=5;b.wells.push({x:100,y:100,r:40,life:4,burst:true});b.pendingOverdrive=true;b.step(.01,.3);
assert(b.clearing);assert.equal(b.state,'playing');assert.equal(b.pendingOverdrive,false);const shots=b.shots;b.setHeld(true,0);assert.equal(b.shoot(0),false);assert.equal(b.shots,shots);
for(let i=0;i<210;i++)b.step(1/60);assert.equal(b.state,'playing');assert(b.overdrive>0);assert(b.wells.length);
for(let i=0;i<160;i++)b.step(1/60);assert.equal(b.state,'won');assert.equal(b.wells.length,0);assert.equal(b.overdrive,0);
const c=new Battle(1);c.t=c.c.duration-.5;c.step(.01);const started=c.t;while(c.state==='playing')c.step(1/60);assert(c.t-started>=3.5);assert(c.t-started<3.6);
const occupied=new Battle(1);const e=occupied.spawn('tank',0,{x:80,y:100});occupied.t=occupied.c.duration;occupied.step(.01);assert(!occupied.clearing);assert(e.hp>0);
console.log('PASS clear-field hold >=3.5s, natural gravity/heat tails, no post-clear attacks, no premature clear with survivors');
