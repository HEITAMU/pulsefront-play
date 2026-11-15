import assert from 'node:assert/strict';
import {SwayGesture} from '../sway.mjs';
import {Battle} from '../engine.mjs';
const g=new SwayGesture();g.reset(0,0);
for(const x of [.03,-.02,.04,-.03])assert.equal(g.move(x,.1),null);
g.move(.3,.2);g.move(.8,.5);assert.equal(g.move(.77,.52),null);
assert.deepEqual(g.move(.7,.55),{side:1,time:.5,x:.8});
g.move(-.8,1);assert.deepEqual(g.move(-.7,1.05),{side:-1,time:1,x:-.8});
g.reset();assert.equal(g.move(0,4),null);
for(const weapon of ['wave','laser']){
 const b=new Battle(1,{tempo:120});b.weapon=weapon;b.held=true;b.cooldown=.09;b.rhythmTime=.55;
 assert.equal(b.swayBeat(.5),true);assert.equal(b.perfects,1);assert.equal(b.swayBeat(.51),false);
 assert.equal(b.swayBeat(.75),false);b.held=false;assert.equal(b.swayBeat(1),false);
 b.held=true;b.musicPhase='climax';for(const t of [1,1.5,2,2.5])assert.equal(b.swayBeat(t),true);
 assert.equal(b.climaxBursts,1);b.state='lost';assert.equal(b.swayBeat(3),false);
}
console.log('PASS alternating apex timing, jitter rejection, reset, held-only bonus, cooldown independence, beat deduplication and climax integration');
