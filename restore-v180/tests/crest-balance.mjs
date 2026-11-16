import {Battle,aimAngleFor} from '../engine.mjs';
import {getTrack} from '../music.mjs';
import assert from 'node:assert/strict';
const levels=process.env.LEVELS?process.env.LEVELS.split(',').map(Number):Array.from({length:100},(_,i)=>i+1);
for(const level of levels)for(const strategy of ['hold','beat','miss']){
 const power=level<3?0:Math.min(20,5+Math.floor((level-3)/5)),b=new Battle(level,{seed:28,width:process.env.WIDTH?+process.env.WIDTH:390,height:process.env.WIDTH==='320'?568:844,tempo:getTrack(level).bpm,growth:{power,rate:Math.min(10,Math.floor(level/10)),support:Math.min(15,Math.floor(level/8))}});let last=-1;
 while(b.state==='playing'&&b.t<91){b.held=true;b.rhythmTime=b.t;const e=b.enemies.filter(e=>e.hp>0&&b.targetable(e)).sort((a,c)=>b.distance(a)-b.distance(c))[0];b.aim=e?{x:e.x-b.cx,y:e.y-b.cy}:null;const beat=Math.floor(b.t/b.beatDuration);if(strategy!=='hold'&&beat!==last&&(strategy!=='miss'||beat%5!==2)){last=beat;b.rhythmTime=b.t;b.shoot(b.phase(),true);}b.step(1/40);}
 assert.equal(b.state,strategy==='hold'&&level>=3?'lost':'won',`level ${level} ${strategy} HP ${b.hp}`);
 console.log(JSON.stringify({level,strategy,power,state:b.state,hp:Math.round(b.hp),kills:b.kills,perfects:b.perfects,seconds:Math.round(b.t)}));
}
