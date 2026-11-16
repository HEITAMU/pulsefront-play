import {RhythmDirector} from './rhythm.mjs?v=1.8.1';
import {normalizeGrowth} from './growth.mjs?v=1.8.1';
import {SupportSystem} from './support.mjs?v=1.8.1';
import {arrangementFor,sectionAt} from './arrangement.mjs?v=1.8.1';
export const VERSION='1.8.1';
// Aim may reach the pictured side positions, never rotate below the cannon.
export function aimAngleFor(aim){return aim?Math.max(-Math.PI+.16,Math.min(-.16,Math.atan2(Math.min(-.001,aim.y),aim.x))):-Math.PI/2;}
export function enemyHealthScale(level){return level<3?1.2:1.35;}
export const MODULES=[{"id": "echo", "name": "回旋音浪", "description": "音浪到达远端后返回，再造成一次伤害。", "family": "wave"}, {"id": "reverb", "name": "宽幅共鸣", "description": "音浪伤害提高25%，命中范围加宽。", "family": "wave"}, {"id": "tempo", "name": "急速脉冲", "description": "音浪速度提高30%，长按射速提高15%。", "family": "wave"}, {"id": "prism", "name": "折射镜阵", "description": "激光命中后折向附近另一名敌人。", "family": "laser"}, {"id": "focus", "name": "聚焦透镜", "description": "激光伤害提高30%。", "family": "laser"}, {"id": "pierce", "name": "穿甲光束", "description": "激光忽略护盾，额外发射一束。", "family": "laser"}, {"id": "blast", "name": "连锁爆破", "description": "击杀引发小范围爆炸，可连锁触发。", "family": "blast"}, {"id": "chain", "name": "震荡扩散", "description": "爆炸范围提高45%，爆炸伤害提高20%。", "family": "blast"}, {"id": "shrapnel", "name": "碎片弹头", "description": "每次开火额外发射两枚追踪弹。", "family": "blast"}, {"id": "gravity", "name": "引力核心", "description": "每四次攻击生成聚怪黑洞。", "family": "gravity"}, {"id": "orbit", "name": "轨道牵引", "description": "每次击杀回复少量超载能量。", "family": "gravity"}, {"id": "vortex", "name": "坍缩涡流", "description": "黑洞持续更久，并持续伤害其中敌人。", "family": "gravity"}];
export function directionalWeight(angle,aim){if(aim==null)return 0;const delta=Math.atan2(Math.sin(angle-aim),Math.cos(angle-aim));return Math.abs(delta)>=.7?0:(1+Math.cos(Math.PI*delta/.7))/2;}
export const BPM=116;
export const BEAT=60/BPM;
export const CHAPTERS=[
 ['曙光边境','#67efff','#9285ff','DAWN FRONTIER'],['赤焰星云','#ffb176','#ff638a','EMBER NEBULA'],['翡翠航道','#75ffcc','#72b9ff','JADE PASSAGE'],['紫电回廊','#bc9bff','#ff78bf','VIOLET CORRIDOR'],['冰环禁区','#b3f4ff','#7389ff','FROST RING'],['落日星海','#ffc47e','#ff6d9f','SOLAR TIDE'],['幽灵航线','#75e4dc','#9d92ff','GHOST VECTOR'],['量子裂隙','#ed9aff','#7cd7ff','QUANTUM RIFT'],['引力深井','#ffd48b','#bb9dff','GRAVITY WELL'],['最后的黎明','#85f5ff','#ffc282','FINAL DAWN']
];
export function configFor(level,tempo=116){
 level=Math.max(1,Math.min(100,Math.round(level))); const p=(level-1)/99;
 return {level,p,chapter:Math.floor((level-1)/10),boss:level%10===0,duration:arrangementFor(level,tempo).duration,interval:.56-.15*p,group:6.2+3.0*p,hpScale:1+2.5*p,speedScale:1.15+1.0*p,bossHp:380+700*p,damageScale:1.15+.35*p,weaponScale:1+.5*p};
}
export function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export class Battle {
 constructor(level=1,{width=420,height=840,seed=1,tempo=116,modules=[],supports=['seeker'],motions={},growth={},rhythm=true,finisher='wave',emit=()=>{}}={}){
  this.growth=normalizeGrowth(growth);this.rhythmEnabled=rhythm;this.lastSwitchBeat=-Infinity;this.switchHits=0;this.modules=new Set(modules.filter(id=>MODULES.some(m=>m.id===id)));this.aim=null;this.finisher=finisher;this.wells=[];this.pendingOverdrive=false;this.blastDepth=0;this.beatDuration=60/Math.max(70,Math.min(150,tempo));this.rhythmTime=null;this.revived=false;this.c=configFor(level,60/this.beatDuration);this.arrangement=arrangementFor(this.c.level,60/this.beatDuration);this.c.duration=this.arrangement.duration;this.musicPhase='groove';this.climaxHits=0;this.climaxBursts=0;this.w=width;this.h=height;this.cx=width/2;this.cy=height-142;this.radius=82;
  this.random=rng(level*7919+seed);this.emit=emit;this.t=0;this.state='playing';this.hp=100;this.score=0;this.kills=0;this.combo=0;this.maxCombo=0;this.lastKill=-10;this.shots=0;this.perfects=0;this.lastBeat=-1;this.cooldown=0;this.repeat=0;this.held=false;this.weapon='wave';this.enemies=[];this.waves=[];this.beams=[];this.bolts=[];this.spawnClock=.65;this.id=0;this.bossSpawned=false;this.bossDefeated=false;this.hurtCooldown=0;this.energy=0;this.overdrive=0;this.burstCount=0;this.lastHeal=0;this.results=null;this.support=new SupportSystem(this,supports,motions);this.director=this.rhythmEnabled?new RhythmDirector(this):null;
 }
 resize(w,h){const oldCy=this.cy;this.w=w;this.h=h;this.cx=w/2;this.cy=h-142;const dy=this.cy-oldCy;for(const wave of this.waves){wave.y+=dy;}for(const bolt of this.bolts){bolt.y+=dy;}}
 setHeld(held,phase){if(this.clearing)return;this.held=held;if(held){this.shoot(phase);this.repeat=this.weapon==='wave'?.24:.27;}}
 swayBeat(time){
  if(!this.held||this.state!=='playing'||!Number.isFinite(time))return false;
  const beat=Math.round(time/this.beatDuration),phase=((time%this.beatDuration)+this.beatDuration)%this.beatDuration;
  if(Math.min(phase,this.beatDuration-phase)>.125||beat===this.lastBeat)return false;
  // A valid new gesture beat can add one attack even between automatic shots.
  const previous=this.rhythmTime;this.rhythmTime=time;this.cooldown=0;
  const fired=this.shoot(phase,true);this.rhythmTime=previous;return fired;
 }
 switchWeapon(){return false;}
 switchReady(){return false;}
 phase(){return((this.t%this.beatDuration)+this.beatDuration)%this.beatDuration;}
 shoot(phase=this.phase(),manual=true){
  if(this.state!=='playing'||this.clearing)return false;
  const beatNumber=Math.round((this.rhythmTime??this.t)/this.beatDuration),perfect=manual&&Math.min(phase,this.beatDuration-phase)<=.125&&beatNumber!==this.lastBeat;
  if(this.cooldown>0&&!perfect)return false;
  this.weapon='wave';const tier=Math.floor(this.growth.power/5),boosted=this.overdrive>0;
  const base=4*this.c.weaponScale*(1+this.growth.power*.06),strength=(boosted?1.45:1)*(this.musicPhase==='climax'?1.35:1);
  // One accurate crest beats all maximum-rate thin rings in the same beat.
  const thinBudget=Math.ceil(this.beatDuration/.16)*base*1.45*1.35;
  const peak=thinBudget*6*(tier>=2?1.2:1)*(tier>=4?1.25:1),shares=tier>=3?[.7,.3]:[1];
  this.shots++;this.cooldown=.105;
  if(perfect){this.perfects++;this.lastBeat=beatNumber;this.energy=Math.min(100,this.energy+9);this.emit('perfect',{x:this.cx,y:this.cy-130});this.support.beat(beatNumber);this.director?.resolveBeat(beatNumber,'wave');if(this.musicPhase==='climax'){this.climaxHits++;this.emit('climaxHit',{count:this.climaxHits});if(this.climaxHits>=4){this.climaxHits=0;this.climaxBursts++;this.waves.push({id:this.id++,x:this.cx,y:this.cy,r:80,prev:80,maxR:this.h+80,damage:12*this.c.weaponScale,boosted:true,life:2.6,hit:new Set(),speed:650});this.emit('climaxBurst',{count:this.climaxBursts});}}}
  else this.energy=Math.min(100,this.energy+.35);
  if(this.energy>=100&&this.overdrive<=0)this.pendingOverdrive=true;
  const crest=perfect&&tier>=1;
  for(const [i,share] of (crest?shares:[1]).entries())this.waves.push({id:this.id++,x:this.cx,y:this.cy,r:this.radius-4-i*18,prev:this.radius-4-i*18,maxR:this.h+80,damage:i?0:base*strength*(perfect&&tier===0?4:1),crestDamage:crest?peak*share:0,perfect,aimAngle:crest?aimAngleFor(this.aim):null,returning:false,echo:false,boosted:perfect||boosted,life:2.6,hit:new Set(),speed:410+(boosted?65:0)});
  this.emit('fire',{weapon:'wave',perfect,boosted});return true;
 }

 spawnIntensity(){return this.t<this.arrangement.spawnFadeStart?1:Math.max(0,(this.arrangement.spawnEnd-this.t)/(this.arrangement.spawnEnd-this.arrangement.spawnFadeStart));}
 priority(e){return this.distance(e);}
 targetable(e){return e.x>=e.radius&&e.x<=this.w-e.radius&&e.y>=80;}
 distance(e){return Math.hypot(e.x-this.cx,e.y-this.cy);}
 spawn(type,side,at){
  if(this.t>=this.arrangement.spawnEnd||this.enemies.length>=(type==='boss'?240:236))return;
  const r=this.random;const p=this.c.p;
  if(!type){const roll=r();type=roll>.92?'shield':this.c.level>=5&&roll>.88?'healer':roll>.79?'bomb':roll<.08&&this.c.level>=10?'tank':roll<.16&&this.c.level>=20?'splitter':roll<.38?'runner':'drone';}
  let base={shield:[32,62,21,9,100],healer:[14,34,17,6,120],bomb:[10,46,16,7,90],drone:[8,49,13,7,65],runner:[6,82,10,7,75],tank:[60,45,22,12,130],splitter:[24,40,18,8,100],mini:[5,62,8,4,30],boss:[this.c.bossHp,12,53,20,1500]}[type];
  side=side??Math.floor(r()*3);let x,y;
  if(at){x=at.x;y=at.y;}else if(type==='boss'){x=this.cx;y=-70;}else if(side===0){x=24+r()*(this.w-48);y=-30-r()*45;}else{x=side===1?-28:this.w+28;y=90+r()*Math.max(80,this.cy*.6-90);}
  const e={id:++this.id,type,x,y,radius:base[2],hp:base[0]*(type==='boss'?1:this.c.hpScale)*enemyHealthScale(this.c.level),maxHp:base[0]*(type==='boss'?1:this.c.hpScale)*enemyHealthScale(this.c.level),speed:base[1]*this.c.speedScale*(this.h<650?.80:1)*Math.max(.55,Math.min(1.15,this.w/390,(this.cy-60)/642)),damage:base[3]*this.c.damageScale,value:base[4],phase:r()*Math.PI*2,hit:0,age:0,boss:type==='boss',side,attack:2.6};
  e.bossKind=this.c.chapter%3;e.beatDuration=this.beatDuration;e.guard=e.type==='shield'?Math.min(145,52*this.c.hpScale):0;e.healClock=1.4;this.enemies.push(e);this.emit('spawn',e);return e;
 }
 damage(e,amount,perfect=false,kind='wave'){
  if(e.hp<=0)return;amount*=this.director?.multiplier(e,kind)??1;if(e.guard>0&&!this.director?.active('pierce')&&!(kind==='laser'&&this.modules.has('pierce'))){const hit=kind==='laser'?amount*2:amount;const absorbed=Math.min(e.guard,hit);e.guard-=absorbed;amount=Math.max(0,hit-absorbed);}if(kind==='wave'&&e.type!=='shield'&&!e.boss&&this.enemies.some(g=>g.type==='shield'&&g.hp>0&&g.guard>0&&g.y>e.y&&g.y-e.y<100&&Math.abs(g.x-e.x)<48))amount*=.55;if(e.boss&&e.bossKind===0&&Math.floor(e.age/this.beatDuration)%4!==3)amount*=.65;e.hp-=amount;e.hit=.1;this.director?.push(e,perfect,kind);
  if(e.hp<=0){
   this.director?.killed(e);this.kills++;this.combo=this.t-this.lastKill<2.2?this.combo+1:1;this.lastKill=this.t;this.maxCombo=Math.max(this.maxCombo,this.combo);this.score+=Math.round(e.value*(1+Math.min(this.combo,60)*.012));
   if(this.modules.has('orbit'))this.energy=Math.min(100,this.energy+1.2);
   this.emit('kill',{x:e.x,y:e.y,type:e.type,value:e.value,perfect,combo:this.combo});
   if((e.type==='bomb'||this.modules.has('blast')||this.modules.has('chain'))&&this.blastDepth<12){this.blastDepth++;const radius=(e.type==='bomb'?115:72)*(this.modules.has('chain')?1.45:1);this.emit('blast',{x:e.x,y:e.y,radius});for(const other of [...this.enemies])if(other!==e&&other.hp>0&&this.targetable(other)&&Math.hypot(other.x-e.x,other.y-e.y)<radius)this.damage(other,(e.type==='bomb'?25:9)*this.c.weaponScale*(this.modules.has('chain')?1.2:1),false,'blast');this.blastDepth--;}
   if(e.type==='splitter'&&this.enemies.length<232){for(let i=0;i<2;i++)this.spawn('mini',e.side,{x:e.x+(i?14:-14),y:e.y});}
   if(e.boss){this.bossDefeated=true;this.emit('bossDown',{x:e.x,y:e.y});this.hp=Math.min(100,this.hp+20);}
   if(this.kills%100===0){this.hp=Math.min(100,this.hp+(this.rhythmEnabled?2:6));this.emit('heal',{value:6});}
  }
 }
 step(dt,phase){
  if(this.state!=='playing')return;dt=Math.min(dt,.06);this.t+=dt;const nextPhase=sectionAt(this.t,this.arrangement);if(nextPhase!==this.musicPhase){this.musicPhase=nextPhase;this.emit('musicPhase',{phase:nextPhase});}this.cooldown=Math.max(0,this.cooldown-dt);this.overdrive=Math.max(0,this.overdrive-dt);this.hurtCooldown=Math.max(0,this.hurtCooldown-dt);this.director?.tick();
  if(this.held){this.repeat-=dt;if(this.repeat<=0){this.shoot(phase??this.phase(),false);this.repeat+=(this.weapon==='wave'?.24:.27)*(this.modules.has('tempo')?.85:1)/(1+this.growth.rate*.05);}}
  if(this.pendingOverdrive&&this.overdrive<=0&&(phase??this.phase())<dt){this.pendingOverdrive=false;this.energy=0;this.overdrive=5.3;this.burstCount++;this.emit('overdrive',{count:this.burstCount});this.emit('finisher',{kind:this.finisher});if(this.finisher==='gravity'){this.wells.push({x:this.cx,y:this.cy*.55,life:4,r:260,burst:true});}else if(this.finisher==='laser'){for(const e of [...this.enemies])if(this.targetable(e)){this.beams.push({x:e.x,y:0,ex:e.x,ey:this.cy,life:.8,maxLife:.8,boosted:true});this.damage(e,40*this.c.weaponScale,true,'laser');}}else{this.waves.push({id:this.id++,x:this.cx,y:this.cy,r:80,prev:80,maxR:this.h+80,damage:12*this.c.weaponScale,boosted:true,life:2.6,hit:new Set(),speed:600});}}
  for(const well of this.wells){well.life-=dt;for(const e of this.enemies){if(e.hp<=0||e.boss)continue;const d=Math.hypot(e.x-well.x,e.y-well.y);if(d<well.r&&d>5){const pull=well.burst?3.2:1.6;e.x+=(well.x-e.x)*dt*pull;e.y+=(well.y-e.y)*dt*pull;if(this.modules.has('vortex'))this.damage(e,dt*10*this.c.weaponScale,false,'gravity');}}if(well.burst&&well.life<=0){const radius=well.r+35;this.emit('gravityBurst',{x:well.x,y:well.y,radius});for(const e of [...this.enemies])if(e.hp>0&&Math.hypot(e.x-well.x,e.y-well.y)<radius)this.damage(e,75*this.c.weaponScale,true,'gravity');}}this.wells=this.wells.filter(w=>w.life>0);
  if(this.t-this.lastKill>2.2)this.combo=0;
  if(!this.rhythmEnabled&&this.t<this.arrangement.spawnEnd){this.spawnClock-=dt*(this.musicPhase==='climax'?1.2:1)*this.spawnIntensity();if(this.spawnClock<=0){const intro=Math.min(1,this.t/6),g=this.c.group;const count=Math.floor(g)+(this.random()<g%1?1:0);for(let i=0;i<count;i++)this.spawn();this.spawnClock+=this.c.interval/(.65+.35*intro)*(this.c.boss&&this.bossSpawned?.96:1);}}
  if(this.c.boss&&!this.bossSpawned&&this.t>this.c.duration*.45){this.bossSpawned=true;const boss=this.spawn('boss');if(this.rhythmEnabled){boss.hp=boss.maxHp=(2300+this.c.chapter*170)*enemyHealthScale(this.c.level);boss.rhythmRole='conductor';}if(boss.bossKind===1){boss.maxHp*=.55;boss.hp=boss.maxHp;boss.twin=-1;const twin=this.spawn('boss');if(twin){if(this.rhythmEnabled){twin.maxHp=(2300+this.c.chapter*170)*enemyHealthScale(this.c.level);twin.rhythmRole='conductor';}twin.maxHp*=.55;twin.hp=twin.maxHp;twin.twin=1;}}this.emit('boss',{name:['旋转堡垒','双子猎手','蜂群母舰'][this.c.chapter%3],hint:['护甲每四拍开放一次弱点','左右双核，偏向按钮两侧集火','持续放出护卫，波纹清场'][this.c.chapter%3]});}
  for(const e of this.enemies){
   if(e.hp<=0)continue;e.age+=dt;e.hit=Math.max(0,e.hit-dt);
   if(e.type==='healer'){e.healClock-=dt;if(e.healClock<=0){e.healClock=1.4;for(const other of this.enemies)if(other!==e&&!other.boss&&Math.hypot(other.x-e.x,other.y-e.y)<100)other.hp=Math.min(other.maxHp,other.hp+3*this.c.hpScale);this.emit('repair',{x:e.x,y:e.y});}}
   if(e.boss){e.y+=Math.min(1,(Math.min(225,this.h*.30)-e.y)/100)*42*dt;e.x=this.cx+(e.twin?e.twin*this.w*.24:Math.sin(e.age*.65)*(this.w*.23));if(this.rhythmEnabled){const beat=Math.floor((this.rhythmTime??this.t)/this.beatDuration);e.warn=beat%8>=5?(beat%8-5)/3:0;if(beat%8===0&&e.conducted!==beat&&this.t<this.arrangement.spawnEnd){e.conducted=beat;for(let i=0;i<5;i++){const rush=this.spawn('runner',i%2+1,{x:e.x+(i-2)*25,y:e.y+45});if(rush){rush.rhythmRole='charger';rush.hp=rush.maxHp=95*enemyHealthScale(this.c.level);rush.speed*=2;rush.damage=18;}}} }e.attack-=dt;if(!this.rhythmEnabled&&e.attack<0&&this.t<this.arrangement.spawnEnd){e.attack=(2.8-.8*this.c.p)/Math.max(.15,this.spawnIntensity());for(let i=0;i<(e.bossKind===2?5:e.bossKind===1?2:3);i++)this.spawn(e.bossKind===2&&i===0?'shield':'runner',0,{x:e.x+(i-1)*30,y:e.y+40});}}
   else if(this.director){this.director.move(e,dt);}
   else{const a=Math.atan2(this.cy-e.y,this.cx-e.x);const wiggle=e.type==='runner'?Math.sin(e.age*7+e.phase)*16:Math.sin(e.age*3+e.phase)*4;e.x+=(Math.cos(a)*e.speed+wiggle)*dt;e.y+=Math.sin(a)*e.speed*dt;}
   if(!e.boss&&this.distance(e)<this.radius*.8+e.radius){e.hp=0;if(this.hurtCooldown<=0){this.hp=Math.max(0,this.hp-e.damage);this.hurtCooldown=this.rhythmEnabled?.24:.48;this.emit('hurt',{x:e.x,y:e.y,damage:e.damage});}}
  }
  for(const w of this.waves){w.prev=w.r;w.r+=(w.returning?-1:1)*w.speed*dt;w.life-=dt;if(w.echo&&!w.returning&&w.r>Math.min(this.h*.7,this.cy-150)){w.returning=true;w.hit.clear();w.life=2;}if(w.returning&&w.r<75)w.life=0;for(const e of this.enemies){if(e.hp<=0||!this.targetable(e)||w.hit.has(e.id))continue;const dist=Math.hypot(e.x-w.x,e.y-w.y),directional=directionalWeight(Math.atan2(e.y-w.y,e.x-w.x),w.aimAngle),thickness=14+directional*12;if(e.y<w.y+8&&dist-e.radius<=Math.max(w.r,w.prev)+thickness&&dist+e.radius>=Math.min(w.r,w.prev)-thickness){w.hit.add(e.id);const crestHit=(w.crestDamage||0)*directional;this.damage(e,w.damage+crestHit,!!w.perfect,crestHit>0?'crest':'wave');}}}
  for(const b of this.bolts){b.life-=dt;let target=this.enemies.find(e=>e.id===b.target&&e.hp>0&&this.targetable(e));if(!target){target=this.enemies.find(e=>e.hp>0&&this.targetable(e));if(target)b.target=target.id;}if(target){b.angle=Math.atan2(target.y-b.y,target.x-b.x);b.x+=Math.cos(b.angle)*600*dt;b.y+=Math.sin(b.angle)*600*dt;if(Math.hypot(target.x-b.x,target.y-b.y)<target.radius+15){this.damage(target,b.damage);b.life=0;}}else b.life=0;}
  this.support.update(dt);
  this.enemies=this.enemies.filter(e=>e.hp>0);this.waves=this.waves.filter(w=>w.life>0);this.bolts=this.bolts.filter(b=>b.life>0);this.beams=this.beams.filter(b=>(b.life-=dt)>0);
  if(this.hp<=0)this.finish(false);
  else if(this.t>=this.arrangement.spawnEnd&&this.enemies.length===0&&(!this.c.boss||this.bossDefeated)){
   if(!this.clearing){
    this.clearing=true;this.held=false;this.pendingOverdrive=false;this.clearStarted=this.t;
    const tail=Math.max(0,...this.support.shots.map(p=>p.life+.25),...this.wells.map(w=>w.life+.85),...this.waves.map(w=>w.life+.4),...this.beams.map(b=>b.life+.4),this.overdrive+.8);
    this.settleUntil=Math.max(this.c.duration,this.t+3.5,this.t+tail);this.emit('cleared',{});
   }
   if(this.t>=this.settleUntil)this.finish(true);
  }
  else if(!this.clearing&&this.t>=Math.min(89.9,this.c.duration+7)){this.timedOut=true;this.finish(false);}
 }
 finish(win){if(this.state!=='playing')return;this.state=win?'won':'lost';this.held=false;this.results={win,supportRank:this.support.rank,switchHits:this.switchHits,supportGroups:this.support.groups,supportClimax:this.support.climaxGroups,supportKinds:this.support.equipped.length,level:this.c.level,hp:Math.ceil(this.hp),score:this.score,kills:this.kills,perfects:this.perfects,shots:this.shots,maxCombo:this.maxCombo,seconds:Math.round(this.t),stars:win?(this.hp>=65?3:this.hp>=30?2:1):0};this.emit('finish',this.results);}
 revive(){if(this.state!=='lost'||this.revived||this.timedOut)return false;this.revived=true;this.hp=60;this.state='playing';this.results=null;this.held=false;this.hurtCooldown=3;this.cooldown=0;this.repeat=0;this.enemies=this.enemies.filter(e=>e.boss||this.distance(e)>230);this.emit('revive',{});return true;}
 snapshot(){return{level:this.c.level,state:this.state,time:this.t,hp:this.hp,weapon:this.weapon,enemies:this.enemies.length,shots:this.shots,kills:this.kills,perfects:this.perfects,score:this.score,musicPhase:this.musicPhase,switchHits:this.switchHits,switchReady:this.switchReady(),buff:this.director?.buff,climaxHits:this.climaxHits,climaxBursts:this.climaxBursts};}
}
