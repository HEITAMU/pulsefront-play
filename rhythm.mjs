// One score drives music accents, warnings and enemy waves in the first ten stages.
export function cueAt(level,beat,climaxBeat=64){
 if(level>10||beat<8)return null;
 const bar=Math.floor(beat/4),slot=((Math.floor(bar/2)+level)%4),assault=bar%2===0;
 if(!assault)return null;
 return {side:level>=5&&slot===0?3:slot%2?1:2,heavy:level>=2&&slot===2,energy:bar%6===0,climax:beat>=climaxBeat};
}
export class SwitchGesture{
 reset(x=0,y=0,t=0){this.x=x;this.y=y;this.t=t;this.locked=false;}
 move(x,y,t){if(this.locked){if(y>=this.y-12)this.reset(x,y,t);return false;}if(t-this.t>.65||Math.abs(x-this.x)>38||y>this.y+15){this.reset(x,y,t);return false;}if(this.y-y>=34&&Math.abs(x-this.x)<32){this.locked=true;return true;}return false;}
}
export class RhythmDirector{
 constructor(b){this.b=b;this.last=-1;this.buff=null;this.buffUntil=0;this.picked=0;}
 tick(){const b=this.b,time=b.rhythmTime??b.t,beat=Math.floor(time/b.beatDuration);if(beat===this.last)return;this.last=beat;if(b.clearing||b.t>=b.arrangement.spawnEnd)return;
 if(this.active('rush'))for(const id of b.support.equipped)for(let i=0;i<Math.max(1,Math.min(4,b.support.rank));i++)if(b.support.queue.length<240)b.support.queue.push({id,i,n:4,at:b.t+i*.045});
 // Do not replay missed waves after a pause or a clock correction.
 const cue=cueAt(b.c.level,beat,Math.round(b.arrangement.climaxStart/b.beatDuration));
 if(beat%4===2){const next=cueAt(b.c.level,beat+2,Math.round(b.arrangement.climaxStart/b.beatDuration));if(next&&b.spawnIntensity()>=.7&&b.t+2*b.beatDuration<b.arrangement.spawnEnd){
  this.telegraph={...next,weapon:next.heavy?'laser':'wave',targetBeat:beat+2,matched:false};this.stageAssault(this.telegraph);b.emit('assaultWarning',{...this.telegraph,until:(beat+2)*b.beatDuration});
 }}
 if(beat%2===0){const count=Math.round((6+b.c.level*.4)*(b.musicPhase==='climax'?1.5:1)*b.spawnIntensity());for(let i=0;i<count;i++){const e=b.spawn(i%5===0?'runner':'drone',0);if(e){e.rhythmRole='swarm';e.hp=e.maxHp=12+b.c.level*1.3;e.speed*=1.12;}}}
 if(!cue||beat%4!==0||b.spawnIntensity()<.7)return;

 if(cue.energy){const e=b.spawn('bomb',0,{x:b.cx,y:85});if(e){e.rhythmRole='energy';e.hp=e.maxHp=35+b.c.level*3;e.reward=['pierce','push','rush'][Math.floor(beat/24)%3];e.speed*=.65;}}
 }
 stageAssault(cue){const b=this.b,sides=cue.side===3?[1,2]:[cue.side];
 for(const side of sides){const count=b.c.level>=3?3+Math.floor(b.c.level/3):2;for(let i=0;i<count;i++){
  const e=b.spawn(cue.heavy&&i===0?'tank':b.c.level>=3?'runner':'drone',side);if(!e)continue;
  e.rhythmRole=cue.heavy&&i===0?'heavy':b.c.level>=3?'charger':'swarm';e.hp=e.maxHp=e.rhythmRole==='heavy'?(b.c.level===2?85:180+b.c.level*28):e.rhythmRole==='charger'?250+Math.max(0,b.c.level-3)*12:16;
  e.speed*=e.rhythmRole==='heavy'?1.5:2.8;e.damage=12+b.c.level*.8;e.phase=0;e.chargedBeat=cue.targetBeat-4;e.readyBeat=cue.targetBeat;e.cohort=cue.targetBeat;e.x=side===1?e.radius+10:b.w-e.radius-10;
 }}
 }
 cueState(){const b=this.b,c=this.telegraph;if(!c||b.clearing)return null;const beat=(b.rhythmTime??b.t)/b.beatDuration,left=c.targetBeat-beat;
 if(c.matched&&left>-.75)return {...c,status:'matched',count:0};
 if(left>=-.23&&left<=2.05)return {...c,status:Math.abs(left)<=.23?'hit':'prepare',count:Math.max(0,Math.ceil(left-.03))};
 return null;
 }
 resolveBeat(beat,weapon){const b=this.b,c=this.telegraph;if(!c||c.matched||beat!==c.targetBeat||weapon!==c.weapon)return false;c.matched=true;
 for(const e of b.enemies){if(e.hp<=0||e.cohort!==c.targetBeat)continue;e.stunUntil=b.t+b.beatDuration*1.3;e.dashUntil=0;b.damage(e,e.maxHp*(e.rhythmRole==='heavy'?.28:.5),true,'counter');}
 b.emit('rhythmCounter',{weapon,side:c.side});return true;
 }

 move(e,dt){const b=this.b,beatTime=(b.rhythmTime??b.t)/b.beatDuration,beat=Math.floor(beatTime),fraction=beatTime-beat,a=Math.atan2(b.cy-e.y,b.cx-e.x);e.beatPulse=Math.exp(-fraction*10);e.warn=0;if(beatTime<(e.readyBeat||0)){e.warn=Math.max(0,1-(e.readyBeat-beatTime)/2);return;}if(e.stunUntil>b.t){e.warn=0;return;}
 let speed=e.speed*(.7+e.beatPulse*.9);
 if(e.rhythmRole==='charger'){e.warn=beat%4>=2?(beat%4-2+fraction)/2:0;if(beat%4===0&&e.chargedBeat!==beat){e.chargedBeat=beat;e.dashUntil=b.t+.24;}speed*=b.t<(e.dashUntil||0)?3.1:beat%4>=2?.35:.85;}
 if(e.slowUntil>b.t)speed*=.7;
 e.x+=Math.cos(a)*speed*dt;e.y+=Math.sin(a)*speed*dt;
 }
 multiplier(e,kind){if(this.active('pierce'))return 1.2;if(e.rhythmRole==='heavy')return kind==='laser'?1.65:kind==='wave'?.38:1;return 1;}
 push(e,perfect,kind){const b=this.b;if(e.boss||kind==='blast'||kind==='support'||e.hp<=0||b.t<(e.pushAt||0))return;const a=Math.atan2(e.y-b.cy,e.x-b.cx),f=b.aim?Math.max(0,Math.cos(a-Math.atan2(b.aim.y,b.aim.x))):0;const amount=(kind==='wave'?4:2)*(perfect?2:1)*(1+f*1.8)*(this.active('push')?3:1)*(e.rhythmRole==='heavy'?.2:1);e.pushAt=b.t+.14;e.x=Math.max(e.radius,Math.min(b.w-e.radius,e.x+Math.cos(a)*amount));e.y=Math.max(80,e.y+Math.sin(a)*amount);e.slowUntil=b.t+.16;}
 killed(e){if(e.rhythmRole!=='energy')return;this.buff=e.reward;this.buffUntil=this.b.t+6;this.picked++;this.b.emit('pickup',{kind:this.buff});}
 active(kind){return this.buff===kind&&this.b.t<this.buffUntil;}
}
