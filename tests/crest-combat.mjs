import assert from 'node:assert/strict';
import {Battle,aimAngleFor,directionalWeight,enemyHealthScale} from '../engine.mjs';
import {normalizeGrowth,upgradeCost} from '../growth.mjs';
import {SUPPORTS} from '../support.mjs';
for(const x of [-100,-1,0,1,100])for(const y of [-100,0,100]){
 const a=aimAngleFor({x,y});assert(a>=-Math.PI+.16&&a<=-.16);
 assert.equal(directionalWeight(a-.7,a),0);assert.equal(directionalWeight(a+.7,a),0);
}
for(const power of [0,4,5,10,15,20])for(const tempo of [86,104,126]){
 const b=new Battle(22,{tempo,growth:{power,rate:10},supports:[]});b.aim={x:1,y:1};
 b.shoot(b.beatDuration/2,false);const thin=b.waves[0];assert.equal(thin.aimAngle,null);assert.equal(thin.crestDamage,0);
 b.cooldown=.1;b.shoot(0,true);const peaks=b.waves.slice(1);assert.equal(peaks.length,power>=15?2:1);
 if(power<5)assert.equal(peaks[0].aimAngle,null);
 else {assert.equal(peaks[0].aimAngle,-.16);assert(peaks.reduce((n,w)=>n+w.crestDamage,0)>Math.ceil(b.beatDuration/.16)*thin.damage*1.45*1.35);}
 assert.equal(b.perfects,1);b.cooldown=0;b.shoot(0,true);assert.equal(b.perfects,1);assert.equal(b.waves.at(-1).aimAngle,null);
 assert.equal(b.switchWeapon('laser',0),false);assert.equal(b.weapon,'wave');assert.equal(b.beams.length,0);
}
const b=new Battle(22,{growth:{power:8},supports:[]});b.aim={x:1,y:-.16};b.shoot(0,true);const w=b.waves[0];
const heavy={type:'tank',hp:729,maxHp:729,rhythmRole:'heavy',x:b.cx+150,y:b.cy-24,radius:22,guard:0,id:900};
b.enemies=[heavy];b.damage(heavy,w.damage+w.crestDamage,true,'crest');assert(heavy.hp>0&&heavy.hp<729/2);b.damage(heavy,w.damage+w.crestDamage,true,'crest');assert(heavy.hp<=0);
const thinHeavy={...heavy,hp:729,maxHp:729,id:901};b.enemies=[thinHeavy];for(let i=0;i<12;i++)b.damage(thinHeavy,w.damage,false,'wave');assert(thinHeavy.hp>729*.9);
for(const s of SUPPORTS){const game=new Battle(1);game.support.rank=12;game.support.launch({id:s.id,i:0,n:1});assert.equal(game.support.shots[0].damage,(s.id==='bounce'?5:s.id==='meteor'?14:8)*.25);}
assert.equal(normalizeGrowth({power:20}).power,20);let cost=0;for(let i=0;i<5;i++)cost+=upgradeCost({power:i},'power');assert.equal(cost,300);
assert(enemyHealthScale(22)>1);
console.log('PASS aim limits, 18 growth/tempo cases, beat-only crests, same-beat damage dominance, 2-crest heavy kill vs 12 thin hits, six support nerfs, laser removal and growth unlock cost');
