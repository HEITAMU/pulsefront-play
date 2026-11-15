import {HeatRenderer} from './overheat.mjs?v=1.5.0';
import {CHAPTERS,BEAT,rng,directionalWeight} from './engine.mjs?v=1.5.0';
const TAU=Math.PI*2;
const SPRITE_KIND={shield:'tank',healer:'splitter',bomb:'drone'};
function circle(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);}
function poly(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function sprite(type){
 const size=type==='boss'?240:112,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const c=canvas.getContext('2d'),s=size/112;c.scale(s,s);c.translate(56,56);
 const colors={drone:['#ff9fbb','#e34476','#4c1938'],runner:['#ffbda4','#f56d5e','#5d273a'],tank:['#ffe4a0','#c59448','#5f472f'],splitter:['#d3b1ff','#9971ff','#42366b'],mini:['#ffb1d4','#cf5b96','#58234c'],boss:['#ffdeb5','#e59276','#522b45']};const [light,main,dark]=colors[type];
 const glow=c.createRadialGradient(0,0,3,0,0,52);glow.addColorStop(0,main+'48');glow.addColorStop(.6,main+'12');glow.addColorStop(1,main+'00');c.fillStyle=glow;c.fillRect(-56,-56,112,112);
 c.lineJoin='round';c.lineCap='round';c.strokeStyle=main;c.lineWidth=1.5;
 if(type==='drone'||type==='mini'){
  for(const sign of [-1,1]){poly(c,[[sign*8,-20],[sign*29,-26],[sign*33,-5],[sign*25,18],[sign*15,8]]);c.fillStyle=dark;c.fill();c.stroke();c.beginPath();c.moveTo(sign*23,-14);c.lineTo(sign*26,0);c.lineTo(sign*19,11);c.strokeStyle=light;c.stroke();c.strokeStyle=main;}
  const g=c.createLinearGradient(0,-25,0,24);g.addColorStop(0,main);g.addColorStop(1,dark);c.fillStyle=g;poly(c,[[0,-29],[18,-8],[13,17],[0,29],[-13,17],[-18,-8]]);c.fill();c.stroke();c.fillStyle='#f8c8d7';poly(c,[[-8,0],[0,4],[8,0],[6,10],[0,14],[-6,10]]);c.fill();c.fillStyle='#251627';circle(c,0,6,3);c.fill();
 }else if(type==='runner'){
  for(const sign of [-1,1]){poly(c,[[sign*7,-16],[sign*32,-31],[sign*22,2],[sign*13,29],[sign*10,2]]);c.fillStyle=dark;c.fill();c.stroke();}
  poly(c,[[0,-27],[12,-8],[7,15],[0,34],[-7,15],[-12,-8]]);c.fillStyle=main;c.fill();c.strokeStyle=light;c.stroke();c.fillStyle='#fff4d6';poly(c,[[-6,-7],[6,-7],[0,12]]);c.fill();
 }else if(type==='tank'){
  for(const sign of [-1,1]){for(let j=0;j<3;j++){c.beginPath();c.moveTo(sign*20,-19+j*15);c.lineTo(sign*33,-15+j*15);c.lineTo(sign*31,-4+j*15);c.stroke();}}
  poly(c,[[0,-33],[26,-20],[30,5],[16,28],[0,34],[-16,28],[-30,5],[-26,-20]]);c.fillStyle=dark;c.fill();c.strokeStyle=main;c.lineWidth=2;c.stroke();poly(c,[[0,-25],[20,-13],[16,15],[0,24],[-16,15],[-20,-13]]);c.fillStyle=main;c.fill();c.strokeStyle=light;c.lineWidth=1;c.stroke();c.fillStyle=dark;poly(c,[[0,-18],[10,-4],[6,10],[0,18],[-6,10],[-10,-4]]);c.fill();c.fillStyle=light;circle(c,0,1,5);c.fill();
 }else if(type==='splitter'){
  for(let i=0;i<6;i++){const a=i*TAU/6;c.save();c.rotate(a);c.beginPath();c.moveTo(0,-15);c.lineTo(17,-26);c.lineTo(22,-39);c.strokeStyle=main;c.stroke();circle(c,22,-39,2);c.fillStyle=light;c.fill();c.restore();}
  c.fillStyle=dark;circle(c,0,0,23);c.fill();c.strokeStyle=main;c.stroke();poly(c,[[0,-26],[17,0],[0,27],[-17,0]]);c.fillStyle=main;c.fill();c.strokeStyle=light;c.stroke();poly(c,[[0,-14],[7,0],[0,14],[-7,0]]);c.fillStyle='#efe6ff';c.fill();
 }else{
  for(const sign of [-1,1]){
   poly(c,[[sign*5,-22],[sign*35,-37],[sign*49,-19],[sign*42,4],[sign*31,10],[sign*22,28],[sign*18,4]]);c.fillStyle=dark;c.fill();c.strokeStyle=main;c.stroke();
   c.strokeStyle=light;c.beginPath();c.moveTo(sign*25,-22);c.lineTo(sign*37,-17);c.lineTo(sign*32,0);c.stroke();
   for(let i=0;i<3;i++){c.beginPath();c.moveTo(sign*(18+i*7),9);c.lineTo(sign*(21+i*9),27);c.lineTo(sign*(13+i*10),40);c.strokeStyle=main;c.stroke();}
  }
  poly(c,[[0,-37],[20,-17],[16,21],[0,39],[-16,21],[-20,-17]]);const g=c.createLinearGradient(0,-37,0,39);g.addColorStop(0,main);g.addColorStop(1,dark);c.fillStyle=g;c.fill();c.strokeStyle=light;c.stroke();c.fillStyle='#ffe8cb';poly(c,[[0,-17],[10,2],[0,20],[-10,2]]);c.fill();c.fillStyle='#482735';poly(c,[[0,-8],[4,2],[0,12],[-4,2]]);c.fill();
 }
 return canvas;
}
// Cached translucent volume: no hard perimeter, all layers disappear at the silhouette.
function shieldDome(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
 const c=canvas.getContext('2d');c.translate(96,96);c.scale(1,.96);
 const volume=c.createRadialGradient(-12,-18,0,0,0,88);
 for(const [stop,color] of [[0,'#b4eeff40'],[.35,'#79cde94a'],[.62,'#539bbd38'],[.82,'#6fc9ec1a'],[1,'#75d8ff00']])volume.addColorStop(stop,color);
 c.fillStyle=volume;circle(c,0,0,88);c.fill();
 // Broad off-axis reflection makes the film read as a curved surface.
 c.save();c.translate(-21,-31);c.rotate(-.55);c.scale(1,.45);
 const sheen=c.createRadialGradient(0,0,0,0,0,51);sheen.addColorStop(0,'#e4faff66');sheen.addColorStop(.4,'#c3f2ff32');sheen.addColorStop(1,'#b2edff00');c.fillStyle=sheen;circle(c,0,0,51);c.fill();c.restore();
 // A feathered inner reflection describes the dome curvature without outlining its edge.
 c.save();c.rotate(-.35);const curve=c.createLinearGradient(-64,0,35,-64);curve.addColorStop(0,'#d8f8ff00');curve.addColorStop(.42,'#d8f8ff58');curve.addColorStop(.7,'#c3efff40');curve.addColorStop(1,'#b5ecff00');c.strokeStyle=curve;c.lineCap='round';
 for(const [width,alpha] of [[12,.12],[7,.2],[3,.55]]){c.globalAlpha=alpha;c.lineWidth=width;c.beginPath();c.ellipse(0,0,64,68,0,Math.PI*.98,Math.PI*1.72);c.stroke();}c.restore();
 const bounce=c.createRadialGradient(23,30,0,23,30,42);bounce.addColorStop(0,'#54a7d222');bounce.addColorStop(1,'#54a7d200');c.fillStyle=bounce;circle(c,23,30,42);c.fill();
 return canvas;
}
export class Renderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.w=420;this.h=840;this.dpr=1;this.chapter=0;this.lite=false;this.fx=[];this.texts=[];this.flash=0;this.shake=0;this.recoil=0;this.perfect=0;this.skin=null;this.heatRenderer=new HeatRenderer();this.shieldSprite=shieldDome();this.sprites={};for(const type of ['drone','runner','tank','splitter','mini','boss'])this.sprites[type]=sprite(type);this.seed=rng(817);this.stars=Array.from({length:150},(_,i)=>({x:this.seed(),y:this.seed(),layer:i%3,size:this.seed()*1.1+.3,speed:.35+(i%3)*2.2+this.seed(),alpha:.13+this.seed()*.44}));}
 resize(w,h,lite=false){this.w=w;this.h=h;this.lite=lite;this.dpr=Math.min(window.devicePixelRatio||1,lite?1.3:2);this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.makeBackdrop();}
 setChapter(chapter){if(this.chapter===chapter&&this.backdrop)return;this.chapter=chapter;this.makeBackdrop();}
 makeBackdrop(){
  const b=document.createElement('canvas');b.width=this.w*this.dpr;b.height=this.h*this.dpr;const c=b.getContext('2d');c.scale(this.dpr,this.dpr);const w=this.w,h=this.h,[,accent,secondary]=CHAPTERS[this.chapter];
  c.fillStyle='#060b18';c.fillRect(0,0,w,h);
  const haze=c.createRadialGradient(w*.78,h*.36,0,w*.68,h*.38,w*.83);haze.addColorStop(0,secondary+'12');haze.addColorStop(.5,accent+'07');haze.addColorStop(1,'#060b1800');c.fillStyle=haze;c.fillRect(0,0,w,h);
  const bottom=c.createRadialGradient(w*.5,h*.88,0,w*.5,h*.88,w*.75);bottom.addColorStop(0,accent+'0d');bottom.addColorStop(1,'#060b1800');c.fillStyle=bottom;c.fillRect(0,0,w,h);
  const px=w*.96,py=h*.30,r=w*.41;c.save();c.translate(px,py);c.rotate(-.5);c.strokeStyle=accent+'10';c.lineWidth=1;c.beginPath();c.ellipse(0,0,r*1.63,r*.41,0,0,TAU);c.stroke();c.restore();
  const planet=c.createRadialGradient(px-r*.4,py-r*.5,1,px,py,r);planet.addColorStop(0,'#273747');planet.addColorStop(.45,'#142231');planet.addColorStop(1,'#080e1c');circle(c,px,py,r);c.fillStyle=planet;c.fill();c.strokeStyle=accent+'22';c.stroke();
  c.save();circle(c,px,py,r-.5);c.clip();for(let i=0;i<8;i++){c.beginPath();c.ellipse(px+r*.1,py-r*.8+i*r*.25,r*1.5,r*.21,-.3,0,TAU);c.strokeStyle=i%2?accent+'05':'#02061123';c.lineWidth=4+i*.5;c.stroke();}c.restore();
  c.save();c.translate(px,py);c.rotate(-.5);c.strokeStyle=accent+'35';c.lineWidth=1.3;c.beginPath();c.ellipse(0,0,r*1.63,r*.41,0,0,Math.PI);c.stroke();c.strokeStyle=accent+'0b';c.beginPath();c.ellipse(0,0,r*1.72,r*.45,0,0,Math.PI);c.stroke();c.restore();
  c.strokeStyle='#7ea3be0d';c.lineWidth=.7;c.beginPath();c.ellipse(w*.5,h*.54,w*.69,h*.36,-.3,0,TAU);c.stroke();
  const rando=rng(900+this.chapter);for(let i=0;i<12;i++){const x=rando()*w,y=rando()*h;c.strokeStyle='#9dbfce15';c.lineWidth=.6;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.moveTo(x,y-3);c.lineTo(x,y+3);c.stroke();}
  const farMoon=c.createRadialGradient(w*.17,h*.18,0,w*.19,h*.19,w*.035);farMoon.addColorStop(0,'#486575');farMoon.addColorStop(.5,'#172d3d');farMoon.addColorStop(1,'#060b18');c.fillStyle=farMoon;circle(c,w*.19,h*.19,w*.035);c.fill();
  const depthShade=c.createLinearGradient(0,0,0,h);depthShade.addColorStop(0,'#02050b20');depthShade.addColorStop(.5,'#02050b00');depthShade.addColorStop(1,'#02050b8a');c.fillStyle=depthShade;c.fillRect(0,0,w,h);
  this.backdrop=b;
  const dust=document.createElement('canvas');dust.width=Math.ceil(w);dust.height=Math.ceil(h);const d=dust.getContext('2d'),rand=rng(2791+this.chapter);for(let i=0;i<22;i++){const x=rand()*w,y=rand()*h,r=25+rand()*w*.45;const g=d.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%3?'#8faac008':'#7697ab09');g.addColorStop(1,'#00000000');d.fillStyle=g;d.fillRect(x-r,y-r,r*2,r*2);}this.dustLayer=dust;
  const vignette=document.createElement('canvas');vignette.width=Math.ceil(w);vignette.height=Math.ceil(h);const v=vignette.getContext('2d'),g=v.createRadialGradient(w*.5,h*.43,w*.16,w*.5,h*.43,h*.7);g.addColorStop(0,'#02050800');g.addColorStop(.65,'#02050816');g.addColorStop(1,'#020508b0');v.fillStyle=g;v.fillRect(0,0,w,h);this.vignette=vignette;
 }
 addFx(p){const cap=this.lite?160:360,ringCap=this.lite?28:64;if(p.ring){const rings=this.fx.filter(f=>f.ring);if(rings.length>=ringCap){const old=this.fx.findIndex(f=>f.ring&&!f.shock);this.fx.splice(old>=0?old:this.fx.findIndex(f=>f.ring),1);}}if(this.fx.length>=cap){const old=this.fx.findIndex(f=>!f.shock);this.fx.splice(old<0?0:old,1);}this.fx.push(p);}

 event(type,data){
  if(type==='gravityBurst'){this.explode(data.x,data.y,'#d5a7ff',60);this.addFx({x:data.x,y:data.y,ring:true,r:12,speed:data.radius/.65,life:.75,total:.75,color:'#dbb5ff',shock:true});this.label('引 力 坍 缩',data.x,data.y-45,'#edcaff',22,1);this.shake=this.lite?0:4;}
  if(type==='blast'){this.explode(data.x,data.y,'#ffbd77',18);this.addFx({x:data.x,y:data.y,ring:true,r:data.radius*.5,life:.35,total:.35,color:'#ffd17a'});}
  if(type==='repair')this.label('+',data.x,data.y,'#79ffc6',19,.5);
  if(type==='fire'){this.recoil=.13;if(data.perfect)this.perfect=.3;}
  if(type==='perfect')this.label('强 拍',data.x,data.y,'#cbffe5',16,.65);
  if(type==='kill'){this.explode(data.x,data.y,data.type==='tank'?'#ffcc87':data.type==='splitter'?'#bb9bff':'#ff97b8',data.type==='boss'?35:10);if(data.combo%5===0)this.label('+'+data.value,data.x,data.y,'#bbdfeb',11,.75);}
  if(type==='hurt'){this.flash=.23;this.shake=this.lite?0:3;this.explode(data.x,data.y,'#94f6ee',16);}
  if(type==='bossDown'){this.explode(data.x,data.y,'#ffcb8c',80);this.shake=this.lite?0:5;}
  if(type==='overdrive'){this.shake=this.lite?0:3;this.perfect=1;}
 }
 label(text,x,y,color,size,life){if(this.texts.length>12)this.texts.shift();this.texts.push({text,x,y,color,size,life,total:life});}
 explode(x,y,color,count){const dense=this.fx.length>(this.lite?95:240);count=Math.min(count,this.lite?(dense?2:5):(dense?3:12));for(let i=0;i<count;i++){const a=Math.random()*TAU,speed=35+Math.random()*180;this.addFx({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,color,life:.18+Math.random()*.32,total:.5,size:1+Math.random()*1.5});}this.addFx({x,y,ring:true,r:4,life:.25,total:.25,color});}

 update(dt){this.recoil=Math.max(0,this.recoil-dt);this.perfect=Math.max(0,this.perfect-dt);this.flash=Math.max(0,this.flash-dt);this.shake*=.85;for(const p of this.fx){p.life-=dt;if(p.ring)p.r+=dt*(p.speed||110);else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;}}this.fx=this.fx.filter(p=>p.life>0);for(const t of this.texts){t.life-=dt;t.y-=dt*21;}this.texts=this.texts.filter(t=>t.life>0);}
 render(battle,time,phase=0,home=false){
  const c=this.ctx,w=this.w,h=this.h,[,accent,secondary]=CHAPTERS[this.chapter];c.save();if(this.shake>.1)c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);const driftX=this.lite?0:Math.sin(time*.025)*5,driftY=this.lite?0:Math.cos(time*.019)*7;c.drawImage(this.backdrop,-10+driftX,-12+driftY,w+20,h+24);if(this.dustLayer){c.globalAlpha=this.lite?.5:.65+.15*Math.sin(time*.06);c.drawImage(this.dustLayer,-15-driftX*1.5,-20-driftY,w+30,h+40);}c.globalAlpha=1;
  for(const star of this.stars){if(this.lite&&star.layer===2)continue;const motion=this.lite?0:time,depth=star.layer+1,x=((star.x*w+Math.sin(motion*.035+star.y*3)*depth*3)%w+w)%w,y=(star.y*h+motion*star.speed)%h;c.globalAlpha=star.alpha*(.9+.1*Math.sin(motion*.5+star.x*20));c.fillStyle=star.layer===2?'#e7d7bd':'#bacbd8';const size=star.size*(.65+star.layer*.4);c.fillRect(x,y,size,size);if(star.layer===2&&!this.lite){c.globalAlpha*=.2;c.fillRect(x,y-4,size,4);}}c.globalAlpha=1;if(this.vignette)c.drawImage(this.vignette,0,0,w,h);

  if(home){this.drawHome(time);c.restore();return;}
  if(!battle){c.restore();return;}
  const {cx,cy,radius}=battle;
  // A soft perimeter connects the on-screen button to its shield.
  c.strokeStyle=accent+'13';c.lineWidth=1;circle(c,cx,cy,radius+33);c.stroke();
  const beatDistance=Math.min(phase,battle.beatDuration-phase),pulse=Math.max(0,1-beatDistance/.18);this.turret(cx,cy,radius,time,pulse,battle.weapon,battle.overdrive>0);
  c.save();c.globalCompositeOperation='lighter';
  for(const wave of battle.waves){const alpha=Math.min(1,wave.life/.6)*.75;c.globalAlpha=alpha;const color=wave.boosted?'#c5ffda':(this.skin?.color||accent);c.strokeStyle=color;c.lineWidth=wave.boosted?3.5:1.7;c.beginPath();c.arc(wave.x,wave.y,wave.r,Math.PI+.04,TAU-.04);c.stroke();c.strokeStyle=color+'24';c.lineWidth=wave.boosted?15:9;c.stroke();if(wave.aimAngle!=null){const aim=(wave.aimAngle+TAU)%TAU,start=Math.max(Math.PI+.04,aim-.7),end=Math.min(TAU-.04,aim+.7),steps=this.lite?18:32;for(const [width,opacity] of [[24,.18],[11,.9]]){c.beginPath();for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps,r=wave.r+width*directionalWeight(a,aim);const x=wave.x+Math.cos(a)*r,y=wave.y+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps,r=wave.r-width*directionalWeight(a,aim);c.lineTo(wave.x+Math.cos(a)*r,wave.y+Math.sin(a)*r);}c.closePath();c.globalAlpha=alpha*opacity;c.fillStyle=width===11?'#e9ffd4':color;c.fill();}c.globalAlpha=alpha;}if(wave.boosted){c.strokeStyle=color+'60';c.lineWidth=1;c.beginPath();c.arc(wave.x,wave.y,wave.r-9,Math.PI+.07,TAU-.07);c.stroke();}}
  for(const bolt of battle.bolts){c.globalAlpha=.9;c.strokeStyle=this.skin?.color||accent;c.lineWidth=2;c.beginPath();c.moveTo(bolt.x,bolt.y);c.lineTo(bolt.x-Math.cos(bolt.angle)*13,bolt.y-Math.sin(bolt.angle)*13);c.stroke();}
  const beamColor=this.skin?.secondary||secondary;
  for(const beam of battle.beams){c.globalAlpha=beam.life/beam.maxLife;c.strokeStyle=beam.boosted?'#ddbdff33':beamColor+'20';c.lineWidth=beam.directional?62:beam.boosted?25:15;c.beginPath();c.moveTo(beam.x,beam.y);c.lineTo(beam.ex,beam.ey);c.stroke();c.strokeStyle=beam.boosted?'#cfa1ff':beamColor;c.lineWidth=beam.directional?30:beam.boosted?7:4;c.stroke();c.strokeStyle='#f1ecff';c.lineWidth=beam.directional?7:1.6;c.stroke();}c.restore();
  for(const well of battle.wells||[]){c.save();c.translate(well.x,well.y);const contraction=well.burst?Math.max(.2,Math.min(1,well.life)):1;const glow=c.createRadialGradient(0,0,8,0,0,well.r);glow.addColorStop(0,'#090315');glow.addColorStop(.12,'#dcb5ff70');glow.addColorStop(.45,'#8c51e82d');glow.addColorStop(1,'#8c51e800');c.fillStyle=glow;circle(c,0,0,well.r);c.fill();c.rotate(this.lite?0:time*2);c.strokeStyle='#c999ff';c.lineWidth=well.burst?3:2;for(let i=0;i<(this.lite?2:4);i++){c.beginPath();c.ellipse(0,0,well.r*(.25+i*.18)*contraction,well.r*.22*contraction,i*Math.PI/3,0,TAU);c.stroke();}for(let i=0;i<8;i++){const a=i*TAU/8,r=well.r*(1-((time*.7+i*.13)%1));c.fillStyle='#f3d7ff';circle(c,Math.cos(a)*r,Math.sin(a)*r,well.burst?2.5:1.5);c.fill();}c.restore();if(well.burst){c.fillStyle='#efd6ff';c.font='700 13px system-ui';c.textAlign='center';c.fillText('引力聚合 · '+Math.max(1,Math.ceil(well.life)),well.x,well.y+well.r*.55);}}
  if(battle.aim){const a=Math.atan2(Math.min(-.05,battle.aim.y),battle.aim.x);c.save();c.translate(cx,cy);c.rotate(a);c.fillStyle='#caffb910';c.beginPath();c.moveTo(radius,0);c.arc(0,0,radius+180,-.22,.22);c.closePath();c.fill();c.strokeStyle='#dcff9a';c.lineWidth=5;c.beginPath();c.arc(0,0,radius+6,-.24,.24);c.stroke();for(let j=-1;j<=1;j++){c.save();c.rotate(j*.16);c.fillStyle='#ddffac';c.fillRect(radius-5,-4,25,8);if(battle.held){const reach=radius+24+((time*520+j*32)%150+150)%150;c.strokeStyle='#e5ffc4';c.lineWidth=3;c.beginPath();c.moveTo(reach-22,0);c.lineTo(reach,0);c.stroke();}c.restore();}c.restore();}
  this.heatRenderer.draw(c,battle,time,this.lite);
  for(const e of battle.enemies)this.enemy(e,time);
  for(const p of this.fx){c.globalAlpha=Math.max(0,p.life/p.total);c.strokeStyle=p.color;c.fillStyle=p.color;if(p.ring){c.lineWidth=p.shock?7:1.4;circle(c,p.x,p.y,p.r);c.stroke();if(p.shock){c.globalAlpha*=.14;c.fill();}}else{c.lineWidth=p.size;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.035,p.y-p.vy*.035);c.stroke();}}c.globalAlpha=1;
  for(const t of this.texts){c.globalAlpha=Math.min(1,t.life/.2);c.fillStyle=t.color;c.font=`700 ${t.size}px system-ui`;c.textAlign='center';c.fillText(t.text,t.x,t.y);}c.globalAlpha=1;
  if(this.flash>0){c.fillStyle=`rgba(255,92,112,${this.flash*.22})`;c.fillRect(0,0,w,h);}c.restore();
 }
 enemy(e,time){
  const c=this.ctx;if(e.y < -90||e.y>this.h+60||e.x < -90||e.x>this.w+90)return;const depth=Math.max(0,Math.min(1,e.y/(this.h*.7))),size=e.radius*(e.boss?2.9:3.1)*(e.boss?1:.9+.1*depth);c.save();c.globalAlpha=e.boss?1:.8+.2*depth;c.translate(e.x,e.y);if(!e.boss)c.rotate(Math.atan2(this.h-142-e.y,this.w/2-e.x)-Math.PI/2);else c.rotate(Math.sin(e.age*.9)*.05);const bob=1+Math.sin(time*5+e.phase)*.035;c.scale(bob,1/bob);c.drawImage(this.sprites[SPRITE_KIND[e.type]||e.type],-size/2,-size/2,size,size);if(e.hit>0){c.globalCompositeOperation='lighter';c.globalAlpha=e.hit*4;c.drawImage(this.sprites[SPRITE_KIND[e.type]||e.type],-size/2,-size/2,size,size);}c.restore();
  if(e.type==='shield'&&e.guard>0){const r=e.radius*1.52+7,breath=this.lite?1:1+Math.sin(time*2+e.phase)*.018;c.save();c.globalAlpha=Math.min(1,.86+Math.max(0,e.hit)*1.8);c.drawImage(this.shieldSprite,e.x-r*breath,e.y-r*breath,r*2*breath,r*2*breath);c.restore();}
  if(e.type==='healer'){c.strokeStyle='#76ffc2';c.lineWidth=3;c.beginPath();c.moveTo(e.x-5,e.y);c.lineTo(e.x+5,e.y);c.moveTo(e.x,e.y-5);c.lineTo(e.x,e.y+5);c.stroke();}
  if(e.type==='bomb'){c.fillStyle=Math.sin(time*8)>0?'#ffe298':'#ff7350';circle(c,e.x,e.y,5);c.fill();}
  if(e.boss){c.fillStyle='#ffe2ad';c.textAlign='center';c.font='11px system-ui';c.fillText(['旋转堡垒','双子猎手','蜂群母舰'][e.bossKind||0],e.x,e.y-e.radius-18);if(e.bossKind===0){c.save();c.translate(e.x,e.y);c.rotate(time);c.strokeStyle=Math.floor(e.age/(e.beatDuration||60/116))%4===3?'#89ffd5':'#e7b575';c.lineWidth=3;c.setLineDash([12,14]);circle(c,0,0,e.radius+7);c.stroke();c.restore();}}
  if((e.type==='tank'||e.type==='splitter'||e.boss)&&e.hp<e.maxHp){const len=e.boss?85:e.radius*1.5;c.fillStyle='#263147';c.fillRect(e.x-len/2,e.y-e.radius-10,len,2);c.fillStyle=e.boss?'#ffc897':'#e5afc2';c.fillRect(e.x-len/2,e.y-e.radius-10,len*Math.max(0,e.hp/e.maxHp),2);}
 }
 turret(x,y,r,time,pulse,weapon,overdrive=false){
  const c=this.ctx;const color=overdrive?'#ffd48b':weapon==='laser'?(this.skin?.secondary||'#b99aff'):(this.skin?.color||CHAPTERS[this.chapter][1]);
  c.save();c.translate(x,y);c.strokeStyle=color+'18';c.lineWidth=1;circle(c,0,0,r+20+pulse*5);c.stroke();
  c.setLineDash([3,8]);circle(c,0,0,r+13);c.strokeStyle=color+'48';c.stroke();c.setLineDash([]);
  c.strokeStyle=color+'45';c.lineWidth=2;circle(c,0,0,r);c.stroke();c.strokeStyle=color;c.lineWidth=2.4;c.beginPath();c.arc(0,0,r,Math.PI+.23,TAU-.23);c.stroke();
  for(let i=0;i<7;i++){const a=Math.PI+.15+(Math.PI-.3)*i/6;c.save();c.rotate(a);const recoil=this.recoil>0?Math.sin(this.recoil/.13*Math.PI)*2:0;c.fillStyle='#0d2435';c.strokeStyle=color+'95';c.lineWidth=1;c.beginPath();c.roundRect(r-6-recoil,-4,16,8,2);c.fill();c.stroke();c.fillStyle=color;c.fillRect(r+7-recoil,-2,3,4);if(this.recoil>0){c.fillStyle=color+'aa';poly(c,[[r+11,-3],[r+24+this.recoil*30,0],[r+11,3]]);c.fill();}c.restore();}
  if(pulse>.05){c.globalAlpha=pulse*.65;c.strokeStyle=overdrive?'#ffe3a9':'#aaffd8';c.lineWidth=1.5;circle(c,0,0,r-7-pulse*2);c.stroke();}c.restore();
 }
 drawHome(time){
  const c=this.ctx,w=this.w,h=this.h;const enemies=[{type:'drone',x:w*.77,y:h*.185,radius:17,phase:0},{type:'splitter',x:w*.82,y:h*.52,radius:19,phase:1},{type:'runner',x:w*.61,y:h*.44,radius:13,phase:2},{type:'tank',x:w*.24,y:h*.65,radius:19,phase:3}];
  for(const e of enemies){e.x+=Math.sin(time*.55+e.phase)*9;e.y+=Math.cos(time*.6+e.phase)*8;e.hp=e.maxHp=1;e.hit=0;e.age=time;this.enemy(e,time);}
  const cx=w*.61,cy=h*.69,r=43;this.turret(cx,cy,r,time,(1+Math.cos(time*TAU/BEAT))*.5,'wave');
  const gradient=c.createRadialGradient(cx,cy,0,cx,cy,r);gradient.addColorStop(0,'#1d3b50');gradient.addColorStop(1,'#0b1828');c.fillStyle=gradient;circle(c,cx,cy,r-5);c.fill();c.strokeStyle='#c0ffe4';c.lineWidth=1.5;circle(c,cx,cy,12);c.stroke();c.fillStyle='#c8ffeb';circle(c,cx,cy,4);c.fill();
  for(let i=0;i<3;i++){const radius=55+((time*39+i*52)%156);c.globalAlpha=(1-(radius-55)/156)*.25;c.strokeStyle='#89efff';c.lineWidth=1;c.beginPath();c.arc(cx,cy,radius,Math.PI+.2,TAU-.2);c.stroke();}c.globalAlpha=1;
 }
}
