import {Battle} from './legacy-battle.mjs';
import {getTrack} from '../music.mjs';
const strategies={holdWave:b=>{b.weapon='wave';b.held=true},holdLaser:b=>{b.weapon='laser';b.held=true},beatTap:b=>{if(b.t%b.beatDuration<1/60)b.shoot()},casualTap:b=>{if(b.t%(.67)<1/60)b.shoot(.3)}};
let rows=[];
for(const [name,play] of Object.entries(strategies)){
 let wins=0,hp=0,lowest=100,firstLoss=null,maxTime=0;
 for(let level=1;level<=100;level++){
  const b=new Battle(level,{seed:99,width:390,height:844,tempo:getTrack(level).bpm});let frames=0;
  while(b.state==='playing'&&frames++<60*200){play(b);b.step(1/60);}
  if(b.state==='won')wins++;else firstLoss??=level;hp+=b.hp;lowest=Math.min(lowest,b.hp);maxTime=Math.max(maxTime,b.t);
  if([1,10,50,90,100].includes(level))rows.push({strategy:name,level,state:b.state,hp:Math.round(b.hp),time:Math.round(b.t),kills:b.kills,shots:b.shots});
 }
 console.log(JSON.stringify({strategy:name,wins,avgHp:Math.round(hp/100),lowestHp:Math.round(lowest),firstLoss,maxTime:Math.round(maxTime)}));
}
console.log(JSON.stringify(rows,null,2));
