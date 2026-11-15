import assert from 'node:assert/strict';
import {Battle} from '../engine.mjs';
import {getTrack} from '../music.mjs';
import {arrangementFor} from '../arrangement.mjs';
let shortest=Infinity,longest=0;
for(let l=1;l<=100;l++)for(const strategy of ['hold','beat']){
 const b=new Battle(l,{tempo:getTrack(l).bpm,seed:28,width:390,height:844,modules:['blast','reverb','gravity','vortex'].slice(0,Math.floor(((l-1)%10)/2))});
 while(b.state==='playing'&&b.t<91){if(strategy==='hold')b.held=true;else if(b.phase()<1/60)b.shoot();b.step(1/60);}
 assert.equal(b.state,'won',`${l} ${strategy} hp${b.hp} time${b.t}`);assert(b.t>=60&&b.t<=90);shortest=Math.min(shortest,b.t);longest=Math.max(longest,b.t);
}
const events=[],b=new Battle(1,{emit:(type,data)=>events.push([type,data])});b.t=b.arrangement.climaxStart;b.step(.01);assert.equal(b.musicPhase,'climax');
for(let i=0;i<3;i++){b.cooldown=0;b.rhythmTime=(i+100)*b.beatDuration;b.shoot(0);}
assert.equal(b.climaxHits,3);b.cooldown=0;b.shoot(.3);assert.equal(b.climaxHits,3);b.cooldown=0;b.rhythmTime=104*b.beatDuration;b.shoot(0);assert.equal(b.climaxHits,0);assert.equal(b.climaxBursts,1);assert(events.some(e=>e[0]==='climaxBurst'));b.step(.01);assert.equal(b.state,'playing');
const deadline=new Battle(1);deadline.bossSpawned=true;const boss=deadline.spawn('boss');boss.hp=1e10;deadline.t=deadline.c.duration+7;deadline.step(.01);assert.equal(deadline.state,'lost');assert.equal(deadline.revive(),false);
for(let l=1;l<=100;l++){const t=getTrack(l),a=arrangementFor(l,t.bpm);assert(a.climaxStart<a.climaxEnd);assert(a.duration>=60&&a.duration<=83);assert(Math.abs(a.duration/(t.beat*4)-Math.round(a.duration/(t.beat*4)))<1e-8);}
console.log(`PASS 200 all-stage hold/beat runs finish in ${shortest.toFixed(1)}–${longest.toFixed(1)}s; aligned sections, four-hit burst, miss retention, bounded timeout`);
