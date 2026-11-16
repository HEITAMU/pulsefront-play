import assert from 'node:assert/strict';
import {Battle} from '../engine.mjs';
import {getTrack} from '../music.mjs';
import {SwitchGesture,cueAt} from '../rhythm.mjs';
import {normalizeGrowth,buyUpgrade,salvage} from '../growth.mjs';
const b=new Battle(1);b.held=true;b.cooldown=.1;assert.equal(b.switchWeapon('laser',0),true);assert.equal(b.perfects,1);assert.equal(b.switchHits,1);assert(b.held);assert(b.beams.some(e=>e.directional));assert.equal(b.switchWeapon('wave',0),false);assert.equal(b.perfects,1);assert.equal(b.weapon,'wave');assert.equal(b.switchWeapon('laser',b.beatDuration),false);assert.equal(b.switchWeapon('wave',4*b.beatDuration),true);assert.equal(b.switchHits,2);assert(b.waves.some(e=>e.switchShot));b.clearing=true;assert.equal(b.switchWeapon('laser',8*b.beatDuration),false);
const tap=new Battle(1);tap.shoot(0);tap.switchWeapon('laser',0);assert.equal(tap.perfects,1);assert.equal(tap.switchHits,0);
const gesture=new SwitchGesture();gesture.reset(100,200,0);assert(!gesture.move(130,195,.1));assert(!gesture.move(155,192,.2));gesture.reset(100,200,0);assert(gesture.move(102,160,.2));assert(!gesture.move(100,150,.3));gesture.move(100,200,.5);assert(gesture.move(100,160,.7));
const g=normalizeGrowth({power:Infinity,rate:-5,support:'3'}),wallet={coins:1000,receipts:[]};assert.equal(g.rate,0);assert.equal(g.support,3);assert(buyUpgrade(g,wallet,'rate'));const before=wallet.coins;assert.equal(salvage(wallet,'run',80),10);assert.equal(salvage(wallet,'run',90),0);assert.equal(wallet.coins,before+10);
for(let level=1;level<=10;level++)for(let beat=8;beat<100;beat+=4){assert.deepEqual(cueAt(level,beat),cueAt(level,beat+2));}
const runs=[];for(const size of [[390,844],[320,568]])for(const seed of [3,28,44])for(const strategy of ['hold','casual'])for(let level=1;level<=10;level++){
 const game=new Battle(level,{width:size[0],height:size[1],seed,tempo:getTrack(level).bpm});let last=-1;while(game.state==='playing'&&game.t<91){game.held=true;const beat=Math.floor(game.t/game.beatDuration);if(strategy==='casual'&&beat!==last){last=beat;if(beat%4===0){const heavy=game.enemies.some(e=>e.hp>0&&(e.rhythmRole==='heavy'||e.boss));game.switchWeapon(heavy?'laser':game.weapon==='wave'?'laser':'wave',beat*game.beatDuration);}if(beat%4===2)game.swayBeat(beat*game.beatDuration);const close=game.enemies.filter(e=>e.hp>0).sort((a,b)=>game.distance(a)-game.distance(b))[0];game.aim=close?{x:(close.x-game.cx)/100,y:Math.min(-.1,(close.y-game.cy)/100)}:null;}game.step(1/60);assert(game.enemies.length<=240);}
 if(strategy==='casual')assert.equal(game.state,'won',`casual ${size} seed${seed} level${level} hp${game.hp}`);
 if(strategy==='hold'&&level<=2)assert.equal(game.state,'won');
 runs.push({level,strategy,hp:game.hp,state:game.state});
}
assert(runs.some(r=>r.strategy==='hold'&&r.level>=7&&r.state==='lost'));assert(runs.some(r=>r.strategy==='hold'&&r.hp>0&&r.hp<80));
console.log('PASS 120 rhythm trials: intro accessible; unattended hold under pressure; deliberate half-rate rhythm+aim clears across seeds and phone sizes. Gesture, switch dedup/cooldown, growth and salvage verified.');
