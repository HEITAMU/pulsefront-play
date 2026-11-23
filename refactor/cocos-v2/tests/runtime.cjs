// Contract tests with small engine/audio doubles. These do not verify GPU rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
let checks = 0;
const passed = name => { checks++; console.log('PASS ' + name); };
class Node {
  constructor(name) { this.name=name; this.children=[]; this.position={x:0,y:0,z:0}; this.scale={x:1,y:1,z:1}; this.components=new Map(); this.handlers={}; this.active=true; this.angle=0; }
  addChild(n) { n.parent=this; this.children.push(n); }
  addComponent(C) { const c=new C(); c.node=this; this.components.set(C,c); return c; }
  getComponent(C) { return this.components.get(C)||null; }
  setPosition(x,y,z=0) { this.position={x,y,z}; }
  setScale(x,y,z=1) { this.scale={x,y,z}; }
  on(e,f) { this.handlers[e]=f; }
  off(e) { delete this.handlers[e]; }
  destroy() { this.destroyed=true; for(const c of this.children.slice())c.destroy(); if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this); }
}
Node.EventType=Object.fromEntries(['TOUCH_START','TOUCH_MOVE','TOUCH_END','TOUCH_CANCEL','MOUSE_DOWN','MOUSE_MOVE','MOUSE_UP','MOUSE_LEAVE'].map(x=>[x,x]));
class UITransform { setAnchorPoint(){} setContentSize(w,h){this.width=w;this.height=h;} }
class Graphics { clear(){this.clears=(this.clears||0)+1;} moveTo(){} lineTo(){} quadraticCurveTo(){} circle(){} roundRect(){} fill(){} stroke(){} close(){} }
class Color {fromHEX(x){this.hex=x;return this;}}
class Label {}
Label.Overflow={SHRINK:0,CLAMP:1};Label.HorizontalAlign={CENTER:1,RIGHT:2,LEFT:0};Label.VerticalAlign={CENTER:1};Label.CacheMode={CHAR:2};
class Sprite{} Sprite.Type={SLICED:1};Sprite.SizeMode={CUSTOM:1};
class SpriteFrame {constructor(){this.rect={width:512,height:512};}reset(v){Object.assign(this,v);}destroy(){}}
class Texture2D {reset(){}uploadData(){this.uploads=(this.uploads||0)+1;}setFilters(){}destroy(){}}
Texture2D.PixelFormat={RGBA8888:1};Texture2D.Filter={LINEAR:1};
class UIOpacity {constructor(){this.opacity=255;}}
class Rect {constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
const cc={Node,UITransform,Graphics,Color,Label,Sprite,SpriteFrame,Texture2D,UIOpacity,Rect,Size:class{},Vec2:class{},LabelOutline:class{},BlockInputEvents:class{},Component:class{},Layers:{Enum:{UI_2D:1}},_decorator:{ccclass:()=>c=>c}};
const originalLoad=Module._load;Module._load=function(name,...args){return name==='cc'?cc:originalLoad.call(this,name,...args);};
const {Pulsefront}=require('../.test-build/Pulsefront');
const {BattleView}=require('../.test-build/view/BattleView');
const {Progress}=require('../.test-build/platform/Progress');
const {Combat}=require('../.test-build/core/Combat');
const {Audio}=require('../.test-build/core/Audio');
const {node}=require('../.test-build/view/UI');
const {homeLayout,arenaLayout}=require('../.test-build/core/Layout');
Module._load=originalLoad;
const find=(n,name)=>n.name===name?n:n.children.map(c=>find(c,name)).find(Boolean);
const assets=()=>Object.fromEntries(['deep-space','cannon','enemies'].map(k=>[k,new SpriteFrame()]));
async function controllerChecks(){
  const p=new Pulsefront();p.root=new Node('Root');p.ui=node(p.root,'Interface');p.world=new BattleView(p.root,840,assets());p.world.resize(840,420,24,12);
  const mem=new Map();p.progress=new Progress({getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)});
  let ready,prepares=0,starts=0;
  p.audio={pause(){},activate(){},prepare(){prepares++;return new Promise(r=>ready=r);},start(){starts++;},position:t=>t,transportPosition:t=>t,feedback(){}};
  p.home();assert(!find(p.ui,'campaign'));assert(find(p.ui,'FireDisc'));const oldLayer=p.ui,cannon=p.world.cannon;
  const pending=p.begin('campaign',1);await p.begin('campaign',1);assert.equal(prepares,1);assert.equal(p.page,'launching');
  for(let i=0;i<30;i++)p.update(1/60);assert.equal(p.run,null);assert(!oldLayer.destroyed);assert.equal(starts,0);
  p.hidden=true;const time=p.launchGate.elapsed;p.update(10);assert.equal(p.launchGate.elapsed,time);p.onShow();
  ready();await pending;assert.equal(p.run.time,0);assert.equal(p.page,'launching');assert(find(p.ui,'LaunchInputBlock'));assert.equal(p.labels.score.overflow,Label.Overflow.CLAMP);
  for(let i=0;i<20;i++)p.update(1/60);
  assert.equal(p.page,'playing');assert.equal(starts,1);assert(p.run.time<.1);assert(oldLayer.destroyed);assert.equal(p.world.cannon,cannon);assert(!find(p.ui,'LaunchInputBlock'));assert(!find(p.ui,'Modal'));assert.equal(p.progress.save.seen,true);
  passed('one cannon tap enters battle with the same cannon and no loading, tutorial or countdown modal');
  const run=p.run;p.pause();assert.equal(p.page,'paused');p.home();assert.equal(p.run,null);assert.equal(p.page,'home');assert.equal(run.held,false);assert.equal(p.root.children.filter(n=>n.name==='Interface').length,1);
  passed('launch input is locked, hidden time is frozen, and returning home leaves one interface');
}
function visualContractChecks(){
  const v=new BattleView(new Node('Root'),840,assets());v.resize(840,420,16,14);const r=new Combat({mode:'campaign',level:1,height:840,bpm:108});
  const home=homeLayout(840,16,14),arena=arenaLayout(840,16,14);
  v.render(null,0,true);assert.equal(v.energy.position.y,-home.heroY);
  v.render(r,0,false,.5);assert.equal(v.energy.position.y,-(home.heroY+arena.cannonY)/2);assert(!v.battle.active);
  v.render(r,0,false);assert.equal(v.energy.position.y,-arena.cannonY);assert(v.battle.active);
  r.tap(0);v.render(r,0,false);const wave=v.waves[0],clears=wave.g.clears;
  r.waves.items[0].id+=10;r.waves.items[0].angle+=.4;v.render(r,0,false);assert.equal(wave.g.clears,clears);assert(Math.abs(wave.arc.angle)>.1);
  r.waves.items[0].width+=.16;v.render(r,0,false);assert.equal(wave.g.clears,clears+1);
  passed('cannon pose is continuous and reused shockwaves rotate without rebuilding geometry');
  v.dispose();
}
async function audioChecks(){
  const savedSet=global.setInterval,savedClear=global.clearInterval,timers=new Map();let next=0,buffers=0;
  global.setInterval=f=>{const id=++next;timers.set(id,f);return id;};global.clearInterval=id=>timers.delete(id);
  const sources=[];const ctx={sampleRate:8000,currentTime:0,state:'running',destination:{},resume:()=>Promise.resolve(),close(){this.state='closed';},createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),createBuffer:(_,n,rate)=>{buffers++;const data=new Float32Array(n);return {duration:n/rate,getChannelData:()=>data};},createBufferSource:()=>{const s={connect(){},disconnect(){this.disconnected=true;},start(at){this.at=at;sources.push(this);},stop(){this.stopped=true;}};return s;}};
  const a=new Audio();a.ctx=ctx;a.bus=ctx.createGain();
  try {
    await a.prepare(1);const prepared=buffers;await a.prepare(1);assert.equal(buffers,prepared);
    a.start(0,90);assert.equal(timers.size,1);const first=sources.length;
    // Audio callbacks advance without invoking Cocos update or Audio.tick directly.
    for(let i=1;i<=60;i++){ctx.currentTime=i*.025;for(const s of sources)if(!s.ended&&ctx.currentTime>=s.at+s.buffer.duration){s.ended=true;s.onended();}for(const f of timers.values())f();}
    assert(sources.length>first+8);assert(a.diagnostics().voices<64);
    a.pause();assert.equal(timers.size,0);assert.equal(a.diagnostics().voices,0);assert(sources.every(s=>s.disconnected));
    for(let i=0;i<20;i++){a.start(0,90);assert.equal(timers.size,1);a.pause();assert.equal(timers.size,0);}
    a.dispose();assert.equal(timers.size,0);assert.equal(ctx.state,'closed');
    passed('music scheduling continues without render frames and timers/voices release on every pause');
    passed('consecutive rounds reuse prepared audio samples');
  } finally {a.dispose();global.setInterval=savedSet;global.clearInterval=savedClear;}
}
(async()=>{await controllerChecks();visualContractChecks();await audioChecks();const p='docs/validation.json',report=JSON.parse(fs.readFileSync(p,'utf8'));report.runtimeContractChecks=checks;report.checks+=checks;report.runtimeScope='Controller, transform and WebAudio contract doubles only; no GPU, audible playback or device input verification.';fs.writeFileSync(p,JSON.stringify(report,null,2));console.log('Runtime contract checks: '+checks);})().catch(e=>{console.error(e);process.exitCode=1;});
