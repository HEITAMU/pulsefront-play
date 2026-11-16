import assert from 'node:assert/strict';
import {Battle} from './legacy-battle.mjs';
import {getTrack} from '../music.mjs';
const rows=[];
for(const level of [1,10,25,50,75,100]){
 let spawned=0,peak=0,lateBase=0;
 const b=new Battle(level,{seed:28,tempo:getTrack(level).bpm,width:390,height:844,emit:(type,e)=>{if(type==='spawn'){spawned++;if(b.t>=b.arrangement.spawnEnd)lateBase++;}}});b.held=true;
 while(b.state==='playing'&&b.t<91){b.step(1/60);peak=Math.max(peak,b.enemies.length);assert(b.enemies.length<=240);}
 assert.equal(b.state,'won');assert(spawned>=600);assert(b.t>=60&&b.t<=90);assert.equal(lateBase,0);
 rows.push({level,spawned,kills:b.kills,peak,hp:Math.round(b.hp),seconds:+b.t.toFixed(1)});
}
const b=new Battle(1);assert.equal(b.arrangement.climaxEnd,b.c.duration-5);assert.equal(b.arrangement.spawnEnd,b.c.duration-2);
const values=[0,1,2,3,4,5,6].map(offset=>{b.t=b.arrangement.spawnFadeStart+offset;return b.spawnIntensity();});assert.deepEqual(values,[1,.75,.5,.25,0,0,0]);
for(const type of ['drone','mini','runner','shield','boss'])assert.equal(b.spawn(type),undefined);
b.t=b.arrangement.spawnFadeStart;
const e=b.spawn('tank',0,{x:b.cx,y:80});assert(b.targetable(e));b.step(.01);assert(e.hp>0,'outro must not retire enemies for free');
console.log('PASS density 600+ enemies,240 cap,final6-second taper,last2-second cutoff,no fake retirement');console.log(JSON.stringify(rows));

{const b=new Battle(1,{modules:['blast']});b.spawnClock=1e9;const bomb=b.spawn('bomb',1,{x:35,y:150}),off=b.spawn('drone',1,{x:-5,y:150}),on=b.spawn('drone',1,{x:60,y:150});const hp=off.hp;b.damage(bomb,1000);assert.equal(off.hp,hp,'blast must not kill unseen neighbors');assert(on.hp<on.maxHp);assert.equal(b.targetable({...on,x:on.radius-1}),false);assert.equal(b.targetable({...on,x:b.w-on.radius+1}),false);assert.equal(b.targetable({...on,y:79}),false);}
