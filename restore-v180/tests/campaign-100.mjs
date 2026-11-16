import assert from 'node:assert/strict';
import {Battle} from '../engine.mjs';
import {getTrack,trackFingerprint} from '../music.mjs';
import {campaignFor} from '../campaign.mjs';
const rows=[];
for(const strategy of ['hold','rhythm','imperfect'])for(const [width,height,seed] of [[390,844,28]])for(let level=1;level<=100;level++){
 if(process.env.LEVELS&&!process.env.LEVELS.split(',').map(Number).includes(level))continue;
 if(strategy==='hold'&&level>12&&level%10!==0)continue;
 const b=new Battle(level,{width,height,seed,tempo:getTrack(level).bpm});let last=-1,maxEnemies=0,earlyDamage=0,lateDamage=0;
 while(b.state==='playing'&&b.t<91){b.held=true;const beat=Math.floor(b.t/b.beatDuration);if(beat!==last){last=beat;
  if(strategy!=='hold'&&(strategy==='rhythm'||beat%5!==1)){
   const c=b.director.telegraph;if(c&&c.targetBeat===beat)b.switchWeapon(c.weapon,beat*b.beatDuration);
   b.swayBeat(beat*b.beatDuration);
  }
 }
 const hp=b.hp;b.step(1/30);if(b.t<b.arrangement.climaxStart)earlyDamage+=Math.max(0,hp-b.hp);else lateDamage+=Math.max(0,hp-b.hp);
 maxEnemies=Math.max(maxEnemies,b.enemies.length);assert(b.enemies.length<=240);assert(Number.isFinite(b.hp));
 }
 if(level%10===0)console.log('checked',strategy,level,b.state,Math.round(b.hp));
 rows.push({level,strategy,width,state:b.state,hp:Math.round(b.hp),earlyDamage:Math.round(earlyDamage),lateDamage:Math.round(lateDamage),maxEnemies,kills:b.kills});
}
for(const strategy of ['hold','rhythm','imperfect'])console.log(strategy,JSON.stringify(Array.from({length:10},(_,i)=>{const r=rows.filter(r=>r.strategy===strategy&&Math.floor((r.level-1)/10)===i);return{chapter:i+1,wins:r.filter(r=>r.state==='won').length,hp:Math.round(r.reduce((a,b)=>a+b.hp,0)/r.length),minHp:Math.min(...r.map(r=>r.hp)),maxEnemies:Math.max(...r.map(r=>r.maxEnemies)),early:Math.round(r.reduce((a,b)=>a+b.earlyDamage,0)/r.length),late:Math.round(r.reduce((a,b)=>a+b.lateDamage,0)/r.length)}})));
const tracks=Array.from({length:100},(_,i)=>getTrack(i+1));assert.equal(new Set(tracks.map(trackFingerprint)).size,100);
for(const t of tracks){assert.equal(t.form.length,t.bars);assert(t.form.includes('break'));assert(t.form.includes('hook'));assert(t.duration>=60&&t.duration<84);}
console.log('failed rhythmic runs:',JSON.stringify(rows.filter(r=>r.strategy!=='hold'&&r.state!=='won')));
if(process.argv.includes('--strict')){assert(rows.filter(r=>r.strategy==='rhythm').every(r=>r.state==='won'));assert(rows.filter(r=>r.strategy==='imperfect').every(r=>r.state==='won'));assert(rows.filter(r=>r.strategy==='hold'&&r.level>=4).some(r=>r.state==='lost'));}
console.log('100 distinct full-stage arrangements; bounded entities and encounter schedules checked.');
