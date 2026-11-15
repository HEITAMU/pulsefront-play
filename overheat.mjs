export const HEAT_EFFECTS=[
 {id:'comet',name:'彗星焰尾',color:'#ffb568'}, {id:'plasma',name:'等离子团',color:'#79e5ff'},
 {id:'shards',name:'晶体风暴',color:'#b5a2ff'}, {id:'embers',name:'熔金飞散',color:'#ffd482'},
 {id:'petals',name:'星焰花瓣',color:'#ff8ebc'}, {id:'vortex',name:'旋涡星核',color:'#ad8eff'},
 {id:'jets',name:'蓝焰喷涌',color:'#75bbff'}, {id:'nova',name:'新星绽放',color:'#fff0b2'},
 {id:'mist',name:'极光云涌',color:'#80f3c9'}, {id:'discs',name:'流光飞梭',color:'#eea6ff'}
];
export function pickHeatEffects(count,random=Math.random){const pool=[...HEAT_EFFECTS];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,Math.min(3,Math.max(1,count))).map(e=>e.id);}
function path(c,pts){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function ellipse(c,x,y,rx,ry,angle=0){c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();}
function sprite(effect){
 const s=document.createElement('canvas');s.width=s.height=160;const c=s.getContext('2d');c.translate(80,80);
 const glow=c.createRadialGradient(0,0,2,0,0,75);glow.addColorStop(0,effect.color+'6a');glow.addColorStop(.45,effect.color+'22');glow.addColorStop(1,effect.color+'00');c.fillStyle=glow;c.fillRect(-80,-80,160,160);
 const body=c.createLinearGradient(-30,-45,25,48);body.addColorStop(0,'#ffffff');body.addColorStop(.25,effect.color);body.addColorStop(1,effect.color+'00');c.fillStyle=body;
 switch(effect.id){
 case 'comet':c.beginPath();c.moveTo(0,-30);c.bezierCurveTo(33,-25,24,7,0,68);c.bezierCurveTo(-30,14,-23,-28,0,-30);c.fill();c.fillStyle='#fff2cf';ellipse(c,0,-15,9,14);break;
 case 'plasma':for(let i=0;i<5;i++){const a=i*1.256;ellipse(c,Math.cos(a)*15,Math.sin(a)*15,22,27,a);}c.fillStyle='#efffff';ellipse(c,-6,-7,12,15);break;
 case 'shards':for(let i=0;i<3;i++){c.save();c.translate((i-1)*24,(i%2)*20-10);c.rotate((i-1)*.45);path(c,[[0,-38],[13,-5],[0,34],[-12,-4]]);c.fillStyle='#ffffff88';path(c,[[0,-38],[0,30],[-12,-4]]);c.fillStyle=body;c.restore();}break;
 case 'embers':for(let i=0;i<8;i++){const a=i*2.4,r=12+i*5;c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a);path(c,[[-5,-14],[7,-8],[4,16],[-7,5]]);c.restore();}break;
 case 'petals':for(let i=0;i<5;i++){c.save();c.rotate(i*Math.PI*2/5);c.beginPath();c.moveTo(0,8);c.bezierCurveTo(-38,-9,-21,-47,0,-55);c.bezierCurveTo(22,-31,24,-4,0,8);c.fill();c.restore();}break;
 case 'vortex':for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);c.beginPath();c.moveTo(-8,8);c.bezierCurveTo(-65,-10,-35,-65,25,-47);c.bezierCurveTo(-17,-48,-34,-15,9,-7);c.closePath();c.fill();c.restore();}c.fillStyle='#120b31';ellipse(c,0,0,14,14);break;
 case 'jets':for(let i=-1;i<=1;i++){c.save();c.translate(i*20,Math.abs(i)*15);c.beginPath();c.moveTo(0,-60);c.bezierCurveTo(7,-20,22,7,3,38);c.bezierCurveTo(-22,6,-8,-15,0,-60);c.fill();c.restore();}break;
 case 'nova':for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);path(c,[[-7,12],[-15,-16],[0,-58],[13,-15],[6,12]]);c.restore();}c.fillStyle='#ffffe5';ellipse(c,0,0,19,19);break;
 case 'mist':for(let i=0;i<5;i++){const g=c.createRadialGradient((i-2)*18,Math.sin(i*2)*18,0,(i-2)*18,Math.sin(i*2)*18,36);g.addColorStop(0,'#b3ffe6a0');g.addColorStop(.45,effect.color+'60');g.addColorStop(1,effect.color+'00');c.fillStyle=g;c.fillRect(-80,-80,160,160);}break;
 case 'discs':c.save();c.rotate(-.5);ellipse(c,0,0,52,22);c.fillStyle='#fff0ff99';ellipse(c,-10,-5,31,8);c.restore();break;
 }
 return s;
}
export class HeatRenderer {
 constructor(){this.sprites=Object.fromEntries(HEAT_EFFECTS.map(e=>[e.id,sprite(e)]));}
 draw(c,b,time,lite){if(b.overdrive<=0||!b.heatEffects?.length)return;const elapsed=5.3-b.overdrive,fade=Math.min(1,elapsed/.18,b.overdrive/.5),n=lite?5:9;
 c.save();
 b.heatEffects.forEach((id,index)=>{const k=HEAT_EFFECTS.findIndex(e=>e.id===id),img=this.sprites[id];
  for(let i=0;i<n;i++){
   const launch=i*.14+index*.09,age=elapsed-launch;if(age<0)continue;const cycle=1.65+(k%3)*.13,p=(age%cycle)/cycle;
   const lane=Math.sin((i+1)*2.399+k*1.7+Math.floor(age/cycle)*.8),spread=b.w*.52;
   let x=b.cx+lane*spread*p,y=b.cy-80-p*(b.cy-110),size=30+(k%3)*8,rotation=0;
   if(id==='comet'){rotation=Math.atan2(lane*spread,-(b.cy-110))+Math.PI/2;size=44;}
   if(id==='plasma'){x+=Math.sin(p*9+i)*15;size=36+Math.sin(p*8)*8;}
   if(id==='shards'){rotation=p*5+i;size=42;}
   if(id==='embers'){x+=Math.sin(p*5+i)*35;y+=p*p*65;rotation=p*8;size=48;}
   if(id==='petals'){rotation=p*4+i;size=42*(.5+Math.sin(Math.PI*p));}
   if(id==='vortex'){rotation=-time*3+i;size=48;}
   if(id==='jets'){x=b.cx+lane*90+Math.sin(p*7+i)*12;size=55;}
   if(id==='nova'){size=18+60*Math.sin(Math.PI*p);rotation=p*.7;}
   if(id==='mist'){x+=Math.sin(p*6+i)*30;size=70;rotation=p*2;}
   if(id==='discs'){x+=Math.sin(p*8+i)*25;rotation=p*6;size=42;}
   c.globalAlpha=fade*Math.sin(Math.PI*p)*(.68-index*.08);c.save();c.translate(x,y);c.rotate(rotation);c.drawImage(img,-size/2,-size/2,size,size);c.restore();
  }
 });c.restore();}
}
