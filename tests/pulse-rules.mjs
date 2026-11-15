import assert from 'node:assert/strict';import {Battle} from '../engine.mjs';import {SupportSystem} from '../support.mjs';import {normalizeGrowth,upgradeCost} from '../growth.mjs';
for(const power of [0,4,5,10,15,20])for(const bpm of [86,104,126]){
 const b=new Battle(10,{tempo:bpm,growth:{power,rate:10}});b.aim={x:-1,y:-1};b.overdrive=5;b.musicPhase='climax';b.shoot(.25,false);assert(b.waves.every(w=>w.aimAngle===null&&w.crestDamage===0));const thin=b.waves[0].damage;b.waves=[];b.cooldown=0;b.shoot(0,true);
 const crest=b.waves.reduce((n,w)=>n+w.crestDamage,0);if(power>=5){assert(crest>=Math.ceil(b.beatDuration/.16)*thin*1.5);assert(b.waves.every(w=>w.aimAngle<0));assert.equal(b.waves.length,power>=15?2:1);}else{assert.equal(crest,0);assert(b.waves[0].boosted);}
 assert.equal(b.beams.length,0);assert.equal(b.switchWeapon('laser',0),false);assert.equal(b.weapon,'wave');
}
for(const id of ['seeker','bounce','shuttle','spiral','meteor','arc']){const b=new Battle(10);for(const rank of [0,12,40]){b.support.rank=rank;b.support.launch({id,i:0,n:1});assert.equal(b.support.shots.at(-1).damage,(id==='bounce'?5:id==='meteor'?14:8)*b.c.weaponScale*.3);}}
const b=new Battle(10),elite=b.spawn('tank',0,{x:b.cx,y:200});elite.rhythmRole='heavy';elite.guard=0;elite.hp=1000;b.damage(elite,100,true,'support');assert.equal(elite.hp,965);const hp=elite.hp;b.damage(elite,100,false,'wave');assert(elite.hp>hp-30);
assert.equal(normalizeGrowth({power:99}).power,20);assert.equal([0,1,2,3,4].reduce((s,power)=>s+upgradeCost({power},'power'),0),250);
console.log('PASS 18 peak/tempo combinations, max-rate damage bound, non-beat thin rings, wave evolution, no laser, six support nerfs, elite armor and growth costs');
