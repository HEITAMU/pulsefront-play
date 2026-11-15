import assert from 'node:assert/strict';
import {Battle} from '../engine.mjs';import {getTrack} from '../music.mjs';
const levels=process.env.LEVELS?process.env.LEVELS.split(',').map(Number):[1,2,3,4,5,10,15,20,30,40,50,60,70,80,90,100];
for(const strategy of ['hold','beat','miss'])for(const level of levels){
 const power=level<3?0:Math.min(20,5+Math.floor((level-3)/6));const b=new Battle(level,{width:Number(process.env.WIDTH||390),height:process.env.WIDTH==='320'?568:844,seed:Number(process.env.SEED||28),tempo:getTrack(level).bpm,growth:{power,rate:Math.min(10,Math.floor(level/10))}});let last=-1;
 while(b.state==='playing'&&b.t<91){b.held=true;const beat=Math.floor(b.t/b.beatDuration);if(beat!==last){last=beat;if(strategy!=='hold'&&(strategy==='beat'||beat%5!==1)){
 const e=b.enemies.filter(e=>e.hp>0&&b.targetable(e)).sort((a,c)=>(['heavy','charger'].includes(a.rhythmRole)?-300:0)+b.distance(a)-(['heavy','charger'].includes(c.rhythmRole)?-300:0)-b.distance(c))[0];b.aim=e?{x:e.x-b.cx,y:Math.min(-.1,e.y-b.cy)}:null;b.swayBeat(beat*b.beatDuration+.04);
 }}b.step(1/30);assert(Number.isFinite(b.hp));assert(b.enemies.length<=240);}
 console.log(JSON.stringify({level,power,strategy,state:b.state,hp:Math.round(b.hp),t:Math.round(b.t),kills:b.kills}));
}
