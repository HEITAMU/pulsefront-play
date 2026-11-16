'use strict';
const factories={
"wechat/src/main.mjs":function(require,module,exports){
const {FirstLesson}=require("tutorial.mjs");
const {Battle,aimAngleFor}=require("engine.mjs");
const {Renderer}=require("renderer.mjs");
const {Soundtrack}=require("audio.mjs");
const {SwayGesture}=require("sway.mjs");
const {getTrack}=require("music.mjs");
const {UPGRADES,normalizeGrowth,upgradeCost,buyUpgrade,salvage}=require("growth.mjs");
const {normalizeEconomy,awardClear,awardDouble,SKINS,buySkin}=require("economy.mjs");
const {SUPPORTS,MOTIONS,normalizeSupport,equipSupport,unlockedMotion,claimChallenges}=require("support.mjs");
const {WechatRewardedAds}=require("wechat/src/rewarded.mjs");
class WechatGame {
 constructor(wx,canvas,config){
  this.wx=wx;this.canvas=canvas;this.config=config;this.buttons=[];this.mode='home';this.page='home';this.clock=0;this.last=0;this.pointer=null;this.sway=new SwayGesture();this.notice='';
  let raw={};try{raw=wx.getStorageSync('pulsefront-save-v1')||{};if(typeof raw==='string')raw=JSON.parse(raw);}catch{}
  this.save={unlocked:Math.max(1,Math.min(100,raw.unlocked||1)),stars:raw.stars||{},best:raw.best||{},seen:!!raw.seen,settings:{sound:true,lite:false,...raw.settings}};
  this.save.growth=normalizeGrowth(raw.growth);this.save.economy=normalizeEconomy(raw.economy,this.save.stars);this.save.support=normalizeSupport(raw.support,this.save.unlocked);
  this.renderer=new Renderer(canvas);this.audio=new Soundtrack();this.audio.setMute(!this.save.settings.sound);this.ads=new WechatRewardedAds(wx,config.rewardedAdUnitId);this.resize();this.persist();
  wx.onTouchStart(e=>this.touchStart(e));wx.onTouchMove(e=>this.touchMove(e));wx.onTouchEnd(e=>this.touchEnd(e));wx.onTouchCancel(()=>this.release());
  wx.onHide(()=>{this.hidden=true;if(this.mode==='playing')this.pause();this.release();this.audio.stop();this.persist();});
  wx.onShow(()=>{this.hidden=false;this.last=0;});wx.onWindowResize?.(()=>this.resize());
  wx.showShareMenu?.({menus:['shareAppMessage']});wx.onShareAppMessage?.(()=>({title:'脉冲防线 · 跟着低音，守住星海'}));
 }
 persist(){try{this.wx.setStorageSync('pulsefront-save-v1',this.save);}catch{this.notice='进度保存失败，请检查设备空间';}}
 resize(){const info=this.wx.getWindowInfo?.()||this.wx.getSystemInfoSync();this.w=info.windowWidth;this.h=info.windowHeight;const capsule=this.wx.getMenuButtonBoundingClientRect?.();this.top=Math.max(info.safeArea?.top||20,capsule?.bottom||40)+12;this.bottom=Math.max(12,this.h-(info.safeArea?.bottom||this.h));this.renderer.resize(this.w,this.h,this.save.settings.lite);this.battle?.resize(this.w,this.h);}
 async start(level,trained=false){this.lesson=level===1&&!trained?new FirstLesson():null;if(this.ads.pending)return;await this.audio.unlock();this.save.seen=true;this.persist();this.notice='';this.release();this.runId='wx-'+Date.now()+'-'+Math.random().toString(36).slice(2);this.receipt=null;this.salvaged=0;this.battle=new Battle(level,{width:this.w,height:this.h,tempo:getTrack(level).bpm,seed:Date.now()%999,supports:this.save.support.equipped,motions:this.save.support.motions,growth:this.save.growth,finisher:'wave',emit:(t,d)=>this.event(t,d)});this.mode='playing';this.page='battle';this.renderer.fx=[];this.renderer.texts=[];this.renderer.setChapter(this.battle.c.chapter);this.audio.start(level);this.last=0;}
 event(type,data){
  this.renderer.event(type,data);
  if(['fire','hurt','bossDown','overdrive','pickup'].includes(type))this.audio.fx(type,data);
  if(type==='perfect'){this.lesson?.perfect();this.audio.fx('strong');this.hitAt=this.clock;}
  if(type==='supportProgress'){const stat=this.save.support.stats[data.id];if(stat)stat[data.metric]+=data.amount;}
  if(type==='supportBurst')this.audio.fx('support',{rank:data.rank});
  if(type==='finish'){
   this.release();this.mode='result';this.page='result';this.audio.finish();this.result=data;
   if(data.win){this.receipt=awardClear(this.save.economy,this.runId,data.level,data.stars,!this.save.stars[data.level],data.kills);this.save.stars[data.level]=Math.max(this.save.stars[data.level]||0,data.stars);this.save.best[data.level]=Math.max(this.save.best[data.level]||0,data.score);this.save.unlocked=Math.min(100,Math.max(this.save.unlocked,data.level+1));}
   else this.salvaged=salvage(this.save.economy,this.runId,data.kills);
   claimChallenges(this.save.support,data,this.save.economy);this.persist();
  }
 }
 pause(){if(this.mode!=='playing')return;this.mode='paused';this.page='pause';this.release();this.audio.stop();}
 async resume(){await this.audio.unlock();this.mode='playing';this.page='battle';this.audio.start(this.battle.c.level,this.battle.t);this.last=0;}
 home(){if(this.ads.pending)return;this.release();this.audio.stop();this.battle=null;this.mode='home';this.page='home';this.renderer.setChapter(0);this.notice='';this.persist();}
 release(){this.pointer=null;this.sway.reset();if(this.battle){this.battle.held=false;this.battle.aim=null;}}
 aim(t){const b=this.battle,x=(t.clientX-b.cx)/75,y=(t.clientY-b.cy)/75;const a=aimAngleFor({x,y:Math.min(-.08,y)});b.aim=Math.hypot(x,y)<.25?null:{x:Math.cos(a),y:Math.sin(a)};return x;}
 touchStart(e){if(this.ads.pending)return;const t=e.changedTouches?.[0]||e.touches?.[0];if(!t)return;this.audio.unlock();if(this.mode==='playing'&&Math.hypot((t.clientX-this.battle.cx)/93,(t.clientY-this.battle.cy)/((t.clientY<this.battle.cy)?100:83))<=1){if(this.pointer!==null)return;this.pointer=t.identifier;this.lesson?.down((t.clientX-this.battle.cx)/75);this.battle.rhythmTime=this.audio.position(this.battle.t);this.sway.reset(this.aim(t),this.battle.rhythmTime);this.battle.setHeld(true,this.audio.phase(this.battle.phase()));return;}
  const button=[...this.buttons].reverse().find(b=>!b.disabled&&t.clientX>=b.x&&t.clientX<=b.x+b.w&&t.clientY>=b.y&&t.clientY<=b.y+b.h);if(button){this.audio.fx('ui');button.fn();}}
 touchMove(e){if(this.pointer===null||this.mode!=='playing')return;const t=e.touches.find(t=>t.identifier===this.pointer);if(!t)return;this.lesson?.move((t.clientX-this.battle.cx)/75);const time=this.audio.position(this.battle.t),peak=this.sway.move(this.aim(t),time);if(peak&&time-peak.time<=.22)this.battle.swayBeat(peak.time);}
 touchEnd(e){if((e.changedTouches||[]).some(t=>t.identifier===this.pointer))this.release();}
 async doubleReward(){if(!this.receipt||this.receipt.bonus||!this.ads.available)return;const run=this.runId;this.audio.stop();this.notice='正在加载广告…';const result=await this.ads.reward();if(run!==this.runId)return;if(result.earned){awardDouble(this.save.economy,run);this.persist();this.notice='双倍星屑已到账';}else this.notice=result.status==='cancelled'?'未完整观看，基础星屑已保留':'暂无可用广告，基础星屑已保留';}
 frame(now){const dt=Math.max(0,Math.min(.05,(now-(this.last||now))/1000));this.last=now;if(this.hidden)return;this.clock+=dt;if(this.mode==='playing'){this.battle.rhythmTime=this.audio.position(this.battle.t);if(this.lesson?.done){this.lesson=null;this.start(1,true);}else{this.battle.step(dt*(this.lesson?this.lesson.tick(dt,this.pointer!==null):1),this.audio.phase(this.battle.phase()));if(this.lesson){this.battle.hp=100;this.battle.t=Math.min(this.battle.t,10);if(this.audio.position(0)>24)this.audio.start(1);}}}this.renderer.update(dt);this.renderer.skin=SKINS.find(s=>s.id===this.save.economy.equipped&&s.id!=='classic')||null;this.renderer.render(this.battle,this.clock,this.audio.phase(this.battle?.phase()||0),!this.battle);this.draw();}
 text(s,x,y,size=16,color='#e6eadb',align='left'){const c=this.renderer.ctx;c.fillStyle=color;c.font=`${size>=25?'600 ':''}${size}px sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);}
 box(x,y,w,h,fill='#152630ee',stroke='#8fa7a250'){const c=this.renderer.ctx;c.beginPath();c.roundRect(x,y,w,h,18);c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
 button(label,y,fn,{x=22,w=this.w-44,h=48,primary=false,disabled=false}={}){this.box(x,y,w,h,disabled?'#111b24ee':primary?'#ced8c2':'#172833ee',primary?'#eff4d7':'#94a5a25a');this.text(label,x+w/2,y+h/2,15,disabled?'#596570':primary?'#15222a':'#dce6df','center');this.buttons.push({x,y:this.hitScale?this.hitOrigin+(y-this.hitOrigin)*this.hitScale:y,w,h:h*(this.hitScale||1),fn,disabled});}
 panel(title){this.box(12,this.top,this.w-24,this.h-this.top-this.bottom-8,'#09121cf5');this.text(title,28,this.top+30,25);this.text('◇ '+this.save.economy.coins,this.w-26,this.top+67,16,'#e2d6ae','right');}
 back(){this.page=this.mode==='result'?'result':this.mode==='paused'?'pause':'home';this.notice='';}
 draw(){const c=this.renderer.ctx;c.save();this.buttons=[];if(this.page==='battle')this.drawBattle();else if(this.page==='home')this.drawHome();else{this.panel(({growth:'火力工坊',result:this.result?.win?'防线守住了':'再来一次',pause:'暂时停拍',map:'星域地图',support:'律动装配',settings:'声音与画面',skins:'机库外观',guide:'跟着鼓点开火'})[this.page]||'脉冲防线');c.save();this.hitOrigin=this.top+80;this.hitScale=Math.min(1,(this.h-this.top-this.bottom-155)/440);c.translate(0,this.hitOrigin);c.scale(1,this.hitScale);c.translate(0,-this.hitOrigin);const y=this.top+100;
 if(this.page==='growth')this.drawGrowth(y);
 if(this.page==='result')this.drawResult(y);
 if(this.page==='pause'){this.button('继续战斗',y,()=>this.resume(),{primary:true});this.button('返回主界面',y+64,()=>this.home());}
 if(this.page==='map')this.drawMap(y);
 if(this.page==='support')this.drawSupport(y);
 if(this.page==='skins')SKINS.forEach((s,i)=>this.button(s.name+' · '+(this.save.economy.equipped===s.id?'使用中':this.save.economy.owned.includes(s.id)?'换上':s.cost+' 星屑'),y+i*55,()=>{if(buySkin(this.save.economy,s.id))this.persist();},{disabled:!this.save.economy.owned.includes(s.id)&&this.save.economy.coins<s.cost}));
 if(this.page==='settings'){this.button('声音 · '+(this.save.settings.sound?'开':'关'),y,()=>{this.save.settings.sound=!this.save.settings.sound;this.audio.setMute(!this.save.settings.sound);this.persist();});this.button('画面 · '+(this.save.settings.lite?'省电':'完整'),y+62,()=>{this.save.settings.lite=!this.save.settings.lite;this.resize();this.persist();});this.button('操作说明',y+124,()=>this.page='guide');}
 if(this.page==='guide'){['按住大按钮，持续发射细波。','点按踩拍，或按住左右摇摆，','在转向顶点踩准鼓点。','主炮5级解锁高伤害波峰。','手指偏向哪边，波峰就在哪边。','每3下连续强拍，副炮数量增加。'].forEach((s,i)=>this.text(s,30,y+i*34,15));this.button('开始出击',y+230,()=>this.start(this.save.unlocked),{primary:true});}
 c.restore();this.hitScale=null;if(!['result','pause'].includes(this.page))this.button('返回',this.h-this.bottom-60,()=>this.back());}
 if(this.notice)this.text(this.notice,this.w/2,this.h-this.bottom-82,12,'#e8d8a8','center');c.restore();}
 drawHome(){this.text('PULSEFRONT',26,this.top+15,13,'#c1d0d4');this.text('脉冲',28,this.top+100,44);this.text('防线.',28,this.top+152,44);this.text('踩节拍，点亮星海。',30,this.top+203,13,'#96acb7');this.text('◇ '+this.save.economy.coins,this.w-26,this.top+15,16,'#e8d8a8','right');const y=Math.min(this.h-this.bottom-234,Math.max(this.top+265,this.h-this.bottom-285));this.button('出击 · 第 '+this.save.unlocked+' / 100 关',y,()=>this.save.seen?this.start(this.save.unlocked):this.page='guide',{primary:true});this.button('火力工坊',y+62,()=>this.page='growth',{w:(this.w-54)/2});this.button('律动装配',y+62,()=>this.page='support',{x:this.w/2+5,w:(this.w-54)/2});this.button('星域地图',y+124,()=>{this.mapGroup=Math.floor((this.save.unlocked-1)/10);this.page='map';},{w:(this.w-54)/2});this.button('机库外观',y+124,()=>this.page='skins',{x:this.w/2+5,w:(this.w-54)/2});this.button('声音与操作',y+186,()=>this.page='settings');}
 drawBattle(){if(this.lesson){const y=this.h*.3;this.box(16,y,this.w-32,116,'#132b32ef','#e9e1a8');this.text(this.lesson.title,this.w/2,y+30,22,'#ffe7a5','center');this.text(this.lesson.detail,this.w/2,y+66,13,'#e4f3de','center');if(this.pointer===null)this.text('子弹时间 · 等你操作',this.w/2,y+94,13,'#bacfd5','center');}const b=this.battle,c=this.renderer.ctx;this.box(14,this.top,this.w-82,53,'#17232de8');this.text(String(b.c.level).padStart(2,'0')+' /100',28,this.top+27,19);this.text(Math.max(0,Math.ceil(b.c.duration-b.t))+'s',this.w*.43,this.top+27,18,'#e9dfb8');this.text('◇ '+Math.ceil(b.hp),this.w-82,this.top+27,17,'#bfe5d6','right');this.button('暂停',this.top,()=>this.pause(),{x:this.w-58,w:44,h:53});
  const cx=b.cx,cy=b.cy,r=this.pointer===null?75:73,flash=this.clock-(this.hitAt??-10)<.18;
  c.save();const g=c.createRadialGradient(cx-22,cy-33,2,cx,cy,r);g.addColorStop(0,flash?'#577c78':'#375563');g.addColorStop(1,'#112632');c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();c.strokeStyle=flash?'#ecffd3':'#bfbd91';c.lineWidth=flash?3:1.5;c.stroke();c.beginPath();c.arc(cx,cy,r-5,0,Math.PI*2);c.strokeStyle='#aaccc331';c.lineWidth=1;c.stroke();c.restore();this.text('P U L S E  E N G I N E',cx,cy-41,8,'#8fa4aa','center');this.text('开 火',cx,cy,30,'#f0dfa9','center');this.text(b.aim?(b.aim.x<-.3?'← 左侧加火力':b.aim.x>.3?'右侧加火力 →':'↑ 正前方加火力'):'踩拍强化',cx,cy+34,12,'#eadfb5','center');
  const cue=b.director?.cueState(),label=b.clearing?'星域已清':cue?(cue.status==='matched'?'✓ 节拍压制':(cue.heavy?'重甲':'群袭')+' · 踩拍 '+(cue.status==='hit'?'现在！':cue.count+'拍后')):'副炮 ×'+b.support.rank+' · '+b.support.progress()+'/3';this.box(cx-105,cy-132,210,30,'#1e2c34db');this.text(label,cx,cy-117,13,'#dcebcf','center');this.text(getTrack(b.c.level).bpm+' BPM',this.w-20,cy-155,10,'#768c96','right');c.fillStyle='#20313e';c.fillRect(70,this.h-this.bottom-28,this.w-140,3);c.fillStyle='#dbc99a';c.fillRect(70,this.h-this.bottom-28,(this.w-140)*Math.min(1,(b.energy||0)/100),3);this.text('过热',26,this.h-this.bottom-27,10,'#98a7ae');}
 drawGrowth(y){const gap=Math.min(140,(this.h-this.bottom-y-78)/3);UPGRADES.forEach((u,i)=>{const yy=y+i*gap,g=this.save.growth[u.id],cost=upgradeCost(this.save.growth,u.id);this.text(u.name+' · Lv.'+g+'/'+u.max,28,yy,18);const subtitle=u.id==='power'?'5级波峰 / 10级强峰 / 15级叠浪 / 20级重峰':u.id==='spread'?'每级覆盖角度 +3% · 主炮5级后生效':'每级追加攻击伤害 +15%';this.text(subtitle,28,yy+27,11,'#a8bdc1');this.button(g>=u.max?'已满级':cost+' 星屑 · 升级',yy+45,()=>{if(buyUpgrade(this.save.growth,this.save.economy,u.id))this.persist();},{h:40,disabled:g>=u.max||this.save.economy.coins<cost});});}
 drawResult(y){const r=this.result,rec=this.receipt;this.text('第 '+r.level+' 关 · 击破 '+r.kills+' · 强拍 '+r.perfects,28,y,14,'#a3babf');this.text(rec?'◇ +'+rec.base*(rec.bonus?2:1):'回收 +'+this.salvaged,28,y+49,30,'#eadca9');this.text(rec?(rec.bonus?'双倍星屑已到账':'基础星屑已入账，包含击破回收'):'失败回收已保留',28,y+80,12,'#a6b9bd');const lv=this.save.growth.power,need=upgradeCost(this.save.growth,'power');this.text(lv<20?'主炮 Lv.'+lv+' → '+(lv+1)+'：'+Math.min(this.save.economy.coins,need)+' / '+need:'主炮已满级',28,y+112,14);this.button(rec&&!rec.bonus?'看广告 ×2 · 再得 '+rec.base+' 星屑':rec?'双倍奖励已领取':'返回再战',y+144,()=>rec?this.doubleReward():this.start(r.level),{primary:!!rec,disabled:!!rec&&(rec.bonus||!this.ads.available)});if(rec&&!rec.bonus&&!this.ads.available)this.text('广告暂不可用，可直接继续',this.w/2,y+207,12,'#91a6ae','center');this.button(r.win?'继续 · 第 '+Math.min(100,r.level+1)+' 关':'再战本关',y+230,()=>this.start(r.win?Math.min(100,r.level+1):r.level),{primary:!rec});this.button('升级主炮',y+290,()=>this.page='growth');this.button('返回主界面',y+350,()=>this.home());}
 drawMap(y){const group=this.mapGroup||0;this.text('星域 '+(group+1)+' / 10',28,y,16);for(let i=0;i<10;i++){const level=group*10+i+1,col=i%2,row=Math.floor(i/2);this.button('第 '+level+' 关 '+(this.save.stars[level]?'★'.repeat(this.save.stars[level]):''),y+30+row*52,()=>this.start(level),{x:22+col*(this.w-34)/2,w:(this.w-54)/2,h:43,disabled:level>this.save.unlocked});}this.button('上一星域',y+300,()=>this.mapGroup=Math.max(0,group-1),{w:(this.w-54)/2});this.button('下一星域',y+300,()=>this.mapGroup=Math.min(9,group+1),{x:this.w/2+5,w:(this.w-54)/2});}
 drawSupport(y){SUPPORTS.forEach((s,i)=>{const selected=this.save.support.equipped.includes(s.id),unlocked=this.save.unlocked>=s.level;this.button(s.name+' · '+(!unlocked?'第'+s.level+'关解锁':selected?'已装配':'装配'),y+i*51,()=>{this.selectedSupport=s.id;const slot=this.save.support.equipped.length<2?this.save.support.equipped.length:(this.supportSlot||0);equipSupport(this.save.support,s.id,this.save.unlocked,slot);this.persist();},{h:43,disabled:!unlocked});});this.button('装入槽位 '+((this.supportSlot||0)+1)+' ↻',y+365,()=>this.supportSlot=(this.supportSlot||0)?0:1,{h:38});const id=this.selectedSupport||this.save.support.equipped[0];if(id){const available=MOTIONS.filter(m=>unlockedMotion(this.save.support,id,m.id)),current=available.findIndex(m=>m.id===this.save.support.motions[id]);this.button('动作 · '+(available[current]?.name||'原式')+' ↻',y+315,()=>{this.save.support.motions[id]=available[(current+1)%available.length].id;this.persist();},{h:40});}}
}

Object.assign(exports,{WechatGame});
},
"tutorial.mjs":function(require,module,exports){
class FirstLesson {
 constructor(){this.stage=0;this.taps=0;this.hits=0;this.min=0;this.max=0;this.held=0;}
 down(x){if(this.stage===0&&++this.taps>=3){this.stage=1;this.min=this.max=x;}else if(this.stage===1){this.min=this.max=x;this.held=0;}}
 move(x){if(this.stage!==1)return;this.min=Math.min(this.min,x);this.max=Math.max(this.max,x);if(this.held>=.35&&this.max-this.min>=.9)this.stage=2;}
 tick(dt,pressed){if(pressed)this.held+=dt;return pressed?1:.06;}
 perfect(){if(this.stage===2&&++this.hits>=3)this.stage=3;}
 get done(){return this.stage===3;}
 get title(){return ['点按大按钮开火','按住按钮，左右滑动','尝试跟着节拍开火！','学会了！'][this.stage];}
 get detail(){return [`点按 ${Math.min(3,this.taps)} / 3 次`,'手指保持按住，从左滑到右',`跟着亮起的鼓点点按 · ${this.hits} / 3 次`,''][this.stage];}
}

Object.assign(exports,{FirstLesson});
},
"engine.mjs":function(require,module,exports){
const {RhythmDirector}=require("rhythm.mjs");
const {normalizeGrowth}=require("growth.mjs");
const {SupportSystem}=require("support.mjs");
const {arrangementFor,sectionAt}=require("arrangement.mjs");
const VERSION='1.8.2';
// Aim may reach the pictured side positions, never rotate below the cannon.
function aimAngleFor(aim){return aim?Math.max(-Math.PI+.16,Math.min(-.16,Math.atan2(Math.min(-.001,aim.y),aim.x))):-Math.PI/2;}
function enemyHealthScale(level){return level<3?1.2:1.35;}
const MODULES=[{"id": "echo", "name": "回旋音浪", "description": "音浪到达远端后返回，再造成一次伤害。", "family": "wave"}, {"id": "reverb", "name": "宽幅共鸣", "description": "音浪伤害提高25%，命中范围加宽。", "family": "wave"}, {"id": "tempo", "name": "急速脉冲", "description": "音浪速度提高30%，长按射速提高15%。", "family": "wave"}, {"id": "prism", "name": "折射镜阵", "description": "激光命中后折向附近另一名敌人。", "family": "laser"}, {"id": "focus", "name": "聚焦透镜", "description": "激光伤害提高30%。", "family": "laser"}, {"id": "pierce", "name": "穿甲光束", "description": "激光忽略护盾，额外发射一束。", "family": "laser"}, {"id": "blast", "name": "连锁爆破", "description": "击杀引发小范围爆炸，可连锁触发。", "family": "blast"}, {"id": "chain", "name": "震荡扩散", "description": "爆炸范围提高45%，爆炸伤害提高20%。", "family": "blast"}, {"id": "shrapnel", "name": "碎片弹头", "description": "每次开火额外发射两枚追踪弹。", "family": "blast"}, {"id": "gravity", "name": "引力核心", "description": "每四次攻击生成聚怪黑洞。", "family": "gravity"}, {"id": "orbit", "name": "轨道牵引", "description": "每次击杀回复少量超载能量。", "family": "gravity"}, {"id": "vortex", "name": "坍缩涡流", "description": "黑洞持续更久，并持续伤害其中敌人。", "family": "gravity"}];
function directionalWeight(angle,aim,width=.7){if(aim==null)return 0;const delta=Math.atan2(Math.sin(angle-aim),Math.cos(angle-aim));return Math.abs(delta)>=width?0:(1+Math.cos(Math.PI*delta/width))/2;}
const BPM=116;
const BEAT=60/BPM;
const CHAPTERS=[
 ['曙光边境','#67efff','#9285ff','DAWN FRONTIER'],['赤焰星云','#ffb176','#ff638a','EMBER NEBULA'],['翡翠航道','#75ffcc','#72b9ff','JADE PASSAGE'],['紫电回廊','#bc9bff','#ff78bf','VIOLET CORRIDOR'],['冰环禁区','#b3f4ff','#7389ff','FROST RING'],['落日星海','#ffc47e','#ff6d9f','SOLAR TIDE'],['幽灵航线','#75e4dc','#9d92ff','GHOST VECTOR'],['量子裂隙','#ed9aff','#7cd7ff','QUANTUM RIFT'],['引力深井','#ffd48b','#bb9dff','GRAVITY WELL'],['最后的黎明','#85f5ff','#ffc282','FINAL DAWN']
];
function configFor(level,tempo=116){
 level=Math.max(1,Math.min(100,Math.round(level))); const p=(level-1)/99;
 return {level,p,chapter:Math.floor((level-1)/10),boss:level%10===0,duration:arrangementFor(level,tempo).duration,interval:.56-.15*p,group:6.2+3.0*p,hpScale:1+2.5*p,speedScale:1.15+1.0*p,bossHp:380+700*p,damageScale:1.15+.35*p,weaponScale:1+.5*p};
}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
class Battle {
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
  for(const [i,share] of (crest?shares:[1]).entries())this.waves.push({id:this.id++,x:this.cx,y:this.cy,r:this.radius-4-i*18,prev:this.radius-4-i*18,maxR:this.h+80,damage:i?0:base*strength*(perfect&&tier===0?4:1),crestDamage:crest?peak*share:0,crestWidth:.7*(1+this.growth.spread*.03),perfect,aimAngle:crest?aimAngleFor(this.aim):null,returning:false,echo:false,boosted:perfect||boosted,life:2.6,hit:new Set(),speed:410+(boosted?65:0)});
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
  if(this.held){this.repeat-=dt;if(this.repeat<=0){this.shoot(phase??this.phase(),false);this.repeat+=(this.weapon==='wave'?.24:.27)*(this.modules.has('tempo')?.85:1);}}
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
  for(const w of this.waves){w.prev=w.r;w.r+=(w.returning?-1:1)*w.speed*dt;w.life-=dt;if(w.echo&&!w.returning&&w.r>Math.min(this.h*.7,this.cy-150)){w.returning=true;w.hit.clear();w.life=2;}if(w.returning&&w.r<75)w.life=0;for(const e of this.enemies){if(e.hp<=0||!this.targetable(e)||w.hit.has(e.id))continue;const dist=Math.hypot(e.x-w.x,e.y-w.y),directional=directionalWeight(Math.atan2(e.y-w.y,e.x-w.x),w.aimAngle,w.crestWidth),thickness=14+directional*12;if(e.y<w.y+8&&dist-e.radius<=Math.max(w.r,w.prev)+thickness&&dist+e.radius>=Math.min(w.r,w.prev)-thickness){w.hit.add(e.id);const crestHit=(w.crestDamage||0)*directional;this.damage(e,w.damage+crestHit,!!w.perfect,crestHit>0?'crest':'wave');}}}
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

Object.assign(exports,{VERSION,aimAngleFor,enemyHealthScale,MODULES,directionalWeight,BPM,BEAT,CHAPTERS,configFor,rng,Battle});
},
"rhythm.mjs":function(require,module,exports){
const {campaignFor}=require("campaign.mjs");
const healthScale=level=>level<3?1.2:1.35;
// One score drives music accents, warnings and enemy waves in the first ten stages.
function cueAt(level,beat,climaxBeat=64){
 if(beat<8)return null;
 const bar=Math.floor(beat/4),plan=campaignFor(level),slot=((Math.floor(bar/2)+level)%4),assault=level<=10?bar%2===0:plan.breath?bar%3===0:bar%2===0;
 // An instrumental break also gives the player room to recover; the main beat stays steady.
 if(level>10&&bar%16===7)return null;
 if(!assault)return null;
 return {side:level>=5&&(slot===0||plan.double&&slot===3)?3:slot%2?1:2,heavy:level>=2&&(slot===2||level>10&&plan.slot===1&&slot===0),energy:bar%6===0,climax:beat>=climaxBeat};
}
class SwitchGesture{
 reset(x=0,y=0,t=0){this.x=x;this.y=y;this.t=t;this.locked=false;}
 move(x,y,t){if(this.locked){if(y>=this.y-12)this.reset(x,y,t);return false;}if(t-this.t>.65||Math.abs(x-this.x)>38||y>this.y+15){this.reset(x,y,t);return false;}if(this.y-y>=34&&Math.abs(x-this.x)<32){this.locked=true;return true;}return false;}
}
class RhythmDirector{
 constructor(b){this.b=b;this.plan=campaignFor(b.c.level);this.last=-1;this.buff=null;this.buffUntil=0;this.picked=0;}
 tick(){const b=this.b,time=b.rhythmTime??b.t,beat=Math.floor(time/b.beatDuration);if(beat===this.last)return;this.last=beat;if(b.clearing||b.t>=b.arrangement.spawnEnd)return;
 if(this.active('rush'))for(const id of b.support.equipped)for(let i=0;i<Math.max(1,Math.min(4,b.support.rank));i++)if(b.support.queue.length<240)b.support.queue.push({id,i,n:4,at:b.t+i*.045});
 // Do not replay missed waves after a pause or a clock correction.
 const cue=cueAt(b.c.level,beat,Math.round(b.arrangement.climaxStart/b.beatDuration));
 if(beat%4===2){const next=cueAt(b.c.level,beat+2,Math.round(b.arrangement.climaxStart/b.beatDuration));if(next&&b.spawnIntensity()>=.7&&b.t+2*b.beatDuration<b.arrangement.spawnEnd){
  this.telegraph={...next,weapon:'wave',targetBeat:beat+2,matched:false};this.stageAssault(this.telegraph);b.emit('assaultWarning',{...this.telegraph,until:(beat+2)*b.beatDuration});
 }}
 if(beat%2===0){const count=Math.round(this.plan.swarmCount*(this.plan.dense?1.2:this.plan.breath?.8:1)*(b.musicPhase==='climax'?1.5:1)*b.spawnIntensity());for(let i=0;i<count;i++){const e=b.spawn(i%5===0?'runner':'drone',0);if(e){e.rhythmRole='swarm';e.hp=e.maxHp=this.plan.swarmHp*healthScale(b.c.level);e.speed*=1.12;
 if(this.plan.split&&i===2&&beat%8===0)e.type='splitter';
 if(this.plan.repair&&i===3&&beat%16===0){e.type='healer';e.hp=e.maxHp*=2;}
 }}}
 if(!cue||beat%4!==0||b.spawnIntensity()<.7)return;

 if(cue.energy){const e=b.spawn('bomb',0,{x:b.cx,y:85});if(e){e.rhythmRole='energy';e.hp=e.maxHp=(35+b.c.level*3)*healthScale(b.c.level);e.reward=['pierce','push','rush'][Math.floor(beat/24)%3];e.speed*=.65;}}
 }
 stageAssault(cue){const b=this.b,sides=cue.side===3?[1,2]:[cue.side];
 for(const side of sides){const count=this.plan.assaultCount;for(let i=0;i<count;i++){
  const e=b.spawn(cue.heavy&&i===0?'tank':b.c.level>=3?'runner':'drone',side);if(!e)continue;
  e.rhythmRole=cue.heavy&&i===0?'heavy':b.c.level>=3?'charger':'swarm';e.hp=e.maxHp=(e.rhythmRole==='heavy'?this.plan.heavyHp:e.rhythmRole==='charger'?this.plan.chargerHp:16)*healthScale(b.c.level);
  e.speed*= (e.rhythmRole==='heavy'?1.5:3.1)/Math.max(1,b.c.speedScale/1.45);e.damage=this.plan.damage;
  if(this.plan.shield&&cue.heavy&&i===0){e.type='shield';e.guard=45+this.plan.chapter*6;}
  e.echo=this.plan.slot===6&&i%2===1;e.weave=this.plan.weave&&this.plan.slot===5;e.phase=0;e.chargedBeat=cue.targetBeat-4;e.readyBeat=cue.targetBeat;e.cohort=cue.targetBeat;e.x=side===1?e.radius+10:b.w-e.radius-10;
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
 if(e.weave)e.x+=Math.sin(beatTime*Math.PI)*dt*34;
 if(e.echo&&beat%4===1)speed*=1.35;
 if(e.rhythmRole==='charger'){e.warn=beat%4>=2?(beat%4-2+fraction)/2:0;if(beat%4===0&&e.chargedBeat!==beat){e.chargedBeat=beat;e.dashUntil=b.t+.24;}speed*=b.t<(e.dashUntil||0)?3.1:beat%4>=2?.35:.85;}
 if(e.slowUntil>b.t)speed*=.7;
 e.x+=Math.cos(a)*speed*dt;e.y+=Math.sin(a)*speed*dt;
 }
 multiplier(e,kind){if(this.active('pierce'))return 1.2;if(e.rhythmRole==='heavy')return kind==='crest'?1.65:kind==='wave'?.38:1;return 1;}
 push(e,perfect,kind){const b=this.b;if(e.boss||kind==='blast'||kind==='support'||e.hp<=0||b.t<(e.pushAt||0))return;const a=Math.atan2(e.y-b.cy,e.x-b.cx),f=b.aim?Math.max(0,Math.cos(a-Math.atan2(b.aim.y,b.aim.x))):0;const amount=(kind==='wave'?4:2)*(perfect?2:1)*(1+f*1.8)*(this.active('push')?3:1)*(e.rhythmRole==='heavy'?.2:1);e.pushAt=b.t+.14;e.x=Math.max(e.radius,Math.min(b.w-e.radius,e.x+Math.cos(a)*amount));e.y=Math.max(80,e.y+Math.sin(a)*amount);e.slowUntil=b.t+.16;}
 killed(e){if(e.rhythmRole!=='energy')return;this.buff=e.reward;this.buffUntil=this.b.t+6;this.picked++;this.b.emit('pickup',{kind:this.buff});}
 active(kind){return this.buff===kind&&this.b.t<this.buffUntil;}
}

Object.assign(exports,{cueAt,SwitchGesture,RhythmDirector});
},
"campaign.mjs":function(require,module,exports){
// Ten encounter families rotate inside each chapter; pressure is bounded at stage 100.
const ENCOUNTERS=['交替突袭','重甲突破','密集蜂群','左右夹击','护航纵队','切分冲锋','回声追击','短暂喘息','混合围攻','星域首领'];
function campaignFor(level){
 const chapter=Math.floor((level-1)/10),slot=(level-1)%10,p=(level-1)/99;
 return {chapter,slot,name:ENCOUNTERS[slot],pressure:1+1.15*Math.sqrt(p),tier:Math.min(20,level<=10?level:10+(level-10)/9),
  assaultCount:level<3?2:level<=10?3+Math.floor(level/3):Math.min(8,6+Math.floor((level-10)/30)),
  swarmCount:Math.min(16,6+level*.10),swarmHp:12+Math.min(26,level*.65),
  chargerHp:level<=2?16:(350+Math.min(280,(level-3)*15))*(level>10&&(slot===1||slot===5)?.8:1),
  heavyHp:level===2?85:180+Math.min(420,level*12),
  damage:12+Math.min(13,level*.8),shield:level>=11,repair:level>=21,split:level>=31,weave:level>=41,
  breath:slot===7,dense:slot===2||slot===8,double:slot===3||slot===8};
}

Object.assign(exports,{ENCOUNTERS,campaignFor});
},
"growth.mjs":function(require,module,exports){
const UPGRADES=[{id:'power',name:'主炮火力',text:'每级伤害 +6% · 5级解锁踩拍波峰 · 10级强峰 · 15级叠浪 · 20级重峰',max:20},{id:'spread',name:'波峰扩幅',text:'每级波峰覆盖角度 +3%，最高 +30% · 主炮5级后生效',max:10},{id:'support',name:'追加攻击',text:'每级追加攻击伤害 +15%',max:15}];
function normalizeGrowth(raw){const g={};for(const u of UPGRADES)g[u.id]=Math.max(0,Math.min(u.max,Math.floor(Number(raw?.[u.id]??(u.id==='spread'?raw?.rate:0))||0)));return g;}
const POWER_COSTS=[40,50,60,70,80,300,420,560,720,900,1200,1500,1900,2400,3000,3800,4800,6000,7500,9500];
function upgradeCost(g,id){return id==='power'?(POWER_COSTS[g.power]??Infinity):60+(g[id]||0)*35;}
function buyUpgrade(g,e,id){const u=UPGRADES.find(u=>u.id===id);if(!u||g[id]>=u.max||e.coins<upgradeCost(g,id))return false;e.coins-=upgradeCost(g,id);g[id]++;return true;}
function salvage(e,runId,kills){const id=runId+'-salvage',old=e.receipts.find(r=>r.id===id);if(old)return 0;const base=Math.min(80,Math.floor(kills/8));e.receipts.push({id,base,bonus:true});e.receipts=e.receipts.slice(-128);e.coins=Math.min(999999,e.coins+base);return base;}

Object.assign(exports,{UPGRADES,normalizeGrowth,POWER_COSTS,upgradeCost,buyUpgrade,salvage});
},
"support.mjs":function(require,module,exports){
const SUPPORTS=[
 {id:'seeker',name:'荧光追踪',level:1,color:'#8effbe',text:'荧光短弹先甩开，再弯曲追敌。'},
 {id:'bounce',name:'弹跳光点',level:4,color:'#83dfff',text:'亮点撞击后急转，连续弹向三只怪物。'},
 {id:'shuttle',name:'回旋光梭',level:8,color:'#d8a4ff',text:'光梭沿宽弧切入怪群，再加速返回。'},
 {id:'spiral',name:'螺旋流萤',level:15,color:'#ffb988',text:'双侧光点交错盘旋，向前穿过怪群。'},
 {id:'meteor',name:'星雨',level:25,color:'#ffe58b',text:'短促的亮芒从上方斜落，击中后小范围溅射。'},
 {id:'arc',name:'折跃闪光',level:40,color:'#ff99cd',text:'闪光沿侧翼急进，接连折向附近的敌人。'}
];
const MOTIONS=[{id:'base',name:'原式',metric:null,goal:0,text:'原始运动方式'}, {id:'fan',name:'扇形散开',metric:'groups',goal:12,text:'先向外展开，再收拢追击'}, {id:'relay',name:'二次追踪',metric:'kills',goal:150,text:'穿过首个目标，再追击另一只'}, {id:'orbit',name:'回旋入场',metric:'climax',goal:6,text:'先绕炮台半圈，再加速飞出'}];
const count=n=>Math.max(0,Math.min(1e9,Math.floor(Number(n)||0)));
function normalizeSupport(raw,level=1){const out={equipped:[],stats:{},motions:{},challenges:{}};for(const s of SUPPORTS){const r=raw?.stats?.[s.id];out.stats[s.id]={groups:count(r?.groups),kills:count(r?.kills),climax:count(r?.climax)};const m=MOTIONS.find(m=>m.id===raw?.motions?.[s.id]);out.motions[s.id]=m&&(!m.metric||out.stats[s.id][m.metric]>=m.goal)?m.id:'base';}out.equipped=[...new Set(Array.isArray(raw?.equipped)?raw.equipped:[])].filter(id=>SUPPORTS.some(s=>s.id===id&&s.level<=level)).slice(0,2);if(!out.equipped.length)out.equipped=['seeker'];for(const id of ['steady','groove','boss'])out.challenges[id]=raw?.challenges?.[id]===true;return out;}
function unlockedMotion(profile,id,motion){const m=MOTIONS.find(m=>m.id===motion);return !!m&&(!m.metric||profile.stats[id]?.[m.metric]>=m.goal);}
function equipSupport(profile,id,level,slot){if(!SUPPORTS.some(s=>s.id===id&&s.level<=level)||![0,1].includes(slot))return false;const other=profile.equipped.indexOf(id);if(other>=0){const previous=profile.equipped[slot];profile.equipped[slot]=id;if(previous&&other!==slot)profile.equipped[other]=previous;}else profile.equipped[slot]=id;profile.equipped=[...new Set(profile.equipped.filter(Boolean))];return true;}
const CHALLENGES=[{id:'steady',name:'稳住节拍',level:8,text:'通关时护盾至少60，并触发8轮追加攻击',goal:r=>r.win&&r.hp>=60&&r.supportGroups>=8},{id:'groove',name:'高潮接力',level:15,text:'一关内在高潮段触发6轮追加攻击并通关',goal:r=>r.win&&r.supportClimax>=6},{id:'boss',name:'双频猎手',level:20,text:'带两种追加攻击，触发12轮并通过首领关',goal:r=>r.win&&r.level%10===0&&r.supportKinds===2&&r.supportGroups>=12}];
function claimChallenges(profile,result,coins){const claimed=[];for(const c of CHALLENGES)if(!profile.challenges[c.id]&&result.level>=c.level&&c.goal(result)){profile.challenges[c.id]=true;coins.coins+=120;claimed.push(c.name);}return claimed;}
class SupportSystem {
 constructor(b,equipped=['seeker'],motions={}){this.b=b;this.equipped=[...new Set(equipped)].filter(id=>SUPPORTS.some(s=>s.id===id)).slice(0,2);this.motions=motions;this.lastBeat=-Infinity;this.streak=0;this.rank=0;this.groups=0;this.climaxGroups=0;this.queue=[];this.shots=[];this.sparks=[];}
 beat(beat){if(beat<=this.lastBeat)return;this.streak=beat-this.lastBeat>2?1:this.streak+1;this.lastBeat=beat;if(this.streak%3)return;this.rank++;this.groups++;if([4,8,12].includes(this.rank))this.b.emit('supportMilestone',{rank:this.rank});if(this.b.musicPhase==='climax')this.climaxGroups++;const n=Math.min(64,this.rank);this.equipped.forEach((id,slot)=>{for(let i=0;i<n&&this.queue.length<240;i++)this.queue.push({id,i,n,at:this.b.t+slot*.07+i*.022});this.b.emit('supportProgress',{id,metric:'groups',amount:1});if(this.b.musicPhase==='climax')this.b.emit('supportProgress',{id,metric:'climax',amount:1});});this.b.emit('supportBurst',{rank:this.rank,count:n,kinds:this.equipped.length});}
 progress(){const beat=Math.round((this.b.rhythmTime??this.b.t)/this.b.beatDuration);return beat-this.lastBeat>2?0:this.streak%3;}
 target(p,exclude=new Set()){return this.b.enemies.filter(e=>e.hp>0&&this.b.targetable(e)&&!exclude.has(e.id)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];}
 launch(q){const b=this.b,motion=this.motions[q.id]||'base',angle=-Math.PI/2+(q.i-(q.n-1)/2)*Math.min(.16,1.8/Math.max(1,q.n))+(motion==='fan'?(q.i%2?1:-1)*.65:0),start={x:b.cx+Math.cos(angle)*85,y:b.cy+Math.sin(angle)*85};const p={...start,id:q.id,motion,angle,age:0,life:4,trail:[],hits:new Set(),hops:0,seed:q.i,growth:Math.min(12,this.rank),damage:(q.id==='bounce'?5:q.id==='meteor'?14:8)*b.c.weaponScale*(1+(b.growth?.support||0)*.15)*.25};if(q.id==='meteor'){const target=this.target(start);p.x=target?target.x-80:start.x-80;p.y=-20;p.angle=Math.atan2((target?.y||200)-p.y,(target?.x||b.cx)-p.x);}this.shots.push(p);}
 update(dt){const b=this.b;if(b.clearing)this.queue=[];else for(let i=this.queue.length-1;i>=0;i--)if(this.queue[i].at<=b.t&&this.shots.length<140){this.launch(this.queue[i]);this.queue.splice(i,1);}
 for(const p of this.shots){const haste=b.director?.active('rush')?1.6:1;p.age+=dt;p.life-=dt;p.trail.push({x:p.x,y:p.y});if(p.trail.length>7)p.trail.shift();const target=this.target(p,p.hits);if(p.motion==='orbit'&&p.age<.33){const a=-Math.PI+(p.age/.33)*Math.PI;p.x=b.cx+Math.cos(a)*105;p.y=b.cy+Math.sin(a)*105;continue;}
 const speed=(p.id==='arc'?720:p.id==='bounce'?570:p.id==='shuttle'?470:430)*(1+p.growth*.025);
 if(p.motion==='fan'&&p.age<.22){p.angle+=(p.seed%2?1:-1)*dt*1.4;}
 else if(p.id==='shuttle'&&p.age>1.05&&!(p.motion==='relay'&&p.hops>0)){const a=Math.atan2(b.cy-p.y,b.cx-p.x);p.angle+=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle))*Math.min(1,dt*7);if(Math.hypot(b.cx-p.x,b.cy-p.y)<80)p.life=0;}
 else if(p.id==='spiral'&&!(p.motion==='relay'&&p.hops>0)){p.angle=-Math.PI/2+Math.sin(p.age*9+p.seed)*.85;}
 else if(target&&(p.id!=='meteor'||(p.motion==='relay'||p.growth>=4)&&p.hops>0)){const a=Math.atan2(target.y-p.y,target.x-p.x),delta=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));p.angle+=delta*Math.min(1,dt*(p.id==='bounce'||p.id==='arc'?18:6));}
 p.x+=Math.cos(p.angle)*speed*dt*haste;p.y+=Math.sin(p.angle)*speed*dt*haste;
 for(const e of b.enemies){if(e.hp<=0||!b.targetable(e)||p.hits.has(e.id)||Math.hypot(e.x-p.x,e.y-p.y)>e.radius+7)continue;p.hits.add(e.id);const hp=e.hp;b.damage(e,p.damage,true,'support');if(hp>0&&e.hp<=0)b.emit('supportProgress',{id:p.id,metric:'kills',amount:1});this.sparks.push({x:e.x,y:e.y,id:p.id,life:.18});p.hops++;
 if(p.id==='meteor'){for(const other of b.enemies)if(other!==e&&other.hp>0&&b.targetable(other)&&Math.hypot(other.x-e.x,other.y-e.y)<65){const old=other.hp;b.damage(other,p.damage*.55,true,'support');if(old>0&&other.hp<=0)b.emit('supportProgress',{id:p.id,metric:'kills',amount:1});}}
 const allowed=p.id==='bounce'||p.id==='arc'?3:p.id==='shuttle'||p.id==='spiral'?5:1;if(p.hops>=allowed+(p.motion==='relay'?1:0)+Math.floor(p.growth/4))p.life=0;break;}
 if(p.x< -90||p.x>b.w+90||p.y< -100||p.y>b.h+50)p.life=0;
 }this.shots=this.shots.filter(p=>p.life>0);this.sparks=this.sparks.slice(-60).filter(s=>(s.life-=dt)>0);}
 draw(c,lite=false){c.save();c.globalCompositeOperation='lighter';for(const p of this.shots){const color=SUPPORTS.find(s=>s.id===p.id).color;c.strokeStyle=color;c.lineCap='round';const trail=lite?p.trail.slice(-3):p.trail;for(let i=1;i<trail.length;i++){c.globalAlpha=i/trail.length*.32;c.lineWidth=1+i/trail.length*1.5;c.beginPath();c.moveTo(trail[i-1].x,trail[i-1].y);c.lineTo(trail[i].x,trail[i].y);c.stroke();}c.globalAlpha=Math.min(1,p.life*3);c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.fillStyle=color;if(p.id==='bounce'||p.id==='spiral'){c.beginPath();c.arc(0,0,3.3,0,Math.PI*2);c.fill();}else if(p.id==='shuttle'){c.beginPath();c.moveTo(8,0);c.lineTo(-4,-3);c.lineTo(-8,0);c.lineTo(-4,3);c.closePath();c.fill();}else{c.lineWidth=p.id==='meteor'?3:2.4+p.growth*.075;c.beginPath();c.moveTo(-9,0);c.lineTo(5,0);c.stroke();}c.fillStyle='#f4fff7';c.fillRect(1,-.7,3,1.4);c.restore();}for(const s of this.sparks){c.globalAlpha=s.life/.18;c.fillStyle=SUPPORTS.find(e=>e.id===s.id).color;c.beginPath();c.arc(s.x,s.y,2+(1-s.life/.18)*10,0,Math.PI*2);c.fill();}c.restore();}
}

Object.assign(exports,{SUPPORTS,MOTIONS,normalizeSupport,unlockedMotion,equipSupport,CHALLENGES,claimChallenges,SupportSystem});
},
"arrangement.mjs":function(require,module,exports){
function arrangementFor(level,bpm){const bar=240/bpm,target=64+14*(level-1)/99,bars=Math.ceil(target/bar);return{duration:bars*bar,spawnEnd:bars*bar-2,spawnFadeStart:bars*bar-6,buildStart:Math.floor(bars*.42)*bar,climaxStart:Math.floor(bars*.54)*bar,climaxEnd:bars*bar-5,outroStart:bars*bar-5};}
function sectionAt(t,a){return t<a.buildStart?'groove':t<a.climaxStart?'build':t<a.climaxEnd?'climax':'outro';}

Object.assign(exports,{arrangementFor,sectionAt});
},
"renderer.mjs":function(require,module,exports){
const {CHAPTERS,BEAT,rng,directionalWeight,aimAngleFor}=require("engine.mjs");
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
class Renderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.w=420;this.h=840;this.dpr=1;this.chapter=0;this.lite=false;this.fx=[];this.texts=[];this.flash=0;this.shake=0;this.recoil=0;this.perfect=0;this.skin=null;this.shieldSprite=shieldDome();this.sprites={};for(const type of ['drone','runner','tank','splitter','mini','boss'])this.sprites[type]=sprite(type);this.seed=rng(817);this.stars=Array.from({length:150},(_,i)=>({x:this.seed(),y:this.seed(),layer:i%3,size:this.seed()*1.1+.3,speed:.35+(i%3)*2.2+this.seed(),alpha:.13+this.seed()*.44}));}
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

 update(dt){if(this.warning)this.warning.life-=dt;this.recoil=Math.max(0,this.recoil-dt);this.perfect=Math.max(0,this.perfect-dt);this.flash=Math.max(0,this.flash-dt);this.shake*=.85;for(const p of this.fx){p.life-=dt;if(p.ring)p.r+=dt*(p.speed||110);else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;}}this.fx=this.fx.filter(p=>p.life>0);for(const t of this.texts){t.life-=dt;t.y-=dt*21;}this.texts=this.texts.filter(t=>t.life>0);}
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
  for(const wave of battle.waves){const alpha=Math.min(1,wave.life/.6)*.75;c.globalAlpha=alpha;const color=wave.boosted?'#c5ffda':(this.skin?.color||accent);c.strokeStyle=color;c.lineWidth=wave.switchShot?9:wave.boosted?3.5:1.7;c.beginPath();c.arc(wave.x,wave.y,wave.r,0,TAU);c.stroke();c.strokeStyle=color+'24';c.lineWidth=wave.boosted?15:9;c.stroke();if(wave.aimAngle!=null){const aim=(wave.aimAngle+TAU)%TAU,spread=wave.crestWidth||.7,start=aim-spread,end=aim+spread,steps=this.lite?18:32;for(const [width,opacity] of [[24,.18],[11,.9]]){c.beginPath();for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps,r=wave.r+width*directionalWeight(a,aim,spread);const x=wave.x+Math.cos(a)*r,y=wave.y+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps,r=wave.r-width*directionalWeight(a,aim,spread);c.lineTo(wave.x+Math.cos(a)*r,wave.y+Math.sin(a)*r);}c.closePath();c.globalAlpha=alpha*opacity;c.fillStyle=width===11?'#e9ffd4':color;c.fill();}c.globalAlpha=alpha;}if(wave.boosted){c.strokeStyle=color+'60';c.lineWidth=1;c.beginPath();c.arc(wave.x,wave.y,wave.r-9,0,TAU);c.stroke();}}
  for(const bolt of battle.bolts){c.globalAlpha=.9;c.strokeStyle=this.skin?.color||accent;c.lineWidth=2;c.beginPath();c.moveTo(bolt.x,bolt.y);c.lineTo(bolt.x-Math.cos(bolt.angle)*13,bolt.y-Math.sin(bolt.angle)*13);c.stroke();}
  const beamColor=this.skin?.secondary||secondary;
  for(const beam of battle.beams){c.globalAlpha=beam.life/beam.maxLife;c.strokeStyle=beam.boosted?'#ddbdff33':beamColor+'20';c.lineWidth=beam.directional?62:beam.boosted?25:15;c.beginPath();c.moveTo(beam.x,beam.y);c.lineTo(beam.ex,beam.ey);c.stroke();c.strokeStyle=beam.boosted?'#cfa1ff':beamColor;c.lineWidth=beam.directional?30:beam.boosted?7:4;c.stroke();c.strokeStyle='#f1ecff';c.lineWidth=beam.directional?7:1.6;c.stroke();}c.restore();
  for(const well of battle.wells||[]){c.save();c.translate(well.x,well.y);const contraction=well.burst?Math.max(.2,Math.min(1,well.life)):1;const glow=c.createRadialGradient(0,0,8,0,0,well.r);glow.addColorStop(0,'#090315');glow.addColorStop(.12,'#dcb5ff70');glow.addColorStop(.45,'#8c51e82d');glow.addColorStop(1,'#8c51e800');c.fillStyle=glow;circle(c,0,0,well.r);c.fill();c.rotate(this.lite?0:time*2);c.strokeStyle='#c999ff';c.lineWidth=well.burst?3:2;for(let i=0;i<(this.lite?2:4);i++){c.beginPath();c.ellipse(0,0,well.r*(.25+i*.18)*contraction,well.r*.22*contraction,i*Math.PI/3,0,TAU);c.stroke();}for(let i=0;i<8;i++){const a=i*TAU/8,r=well.r*(1-((time*.7+i*.13)%1));c.fillStyle='#f3d7ff';circle(c,Math.cos(a)*r,Math.sin(a)*r,well.burst?2.5:1.5);c.fill();}c.restore();if(well.burst){c.fillStyle='#efd6ff';c.font='700 13px system-ui';c.textAlign='center';c.fillText('引力聚合 · '+Math.max(1,Math.ceil(well.life)),well.x,well.y+well.r*.55);}}
  if(battle.aim){const a=aimAngleFor(battle.aim);c.save();c.translate(cx,cy);c.rotate(a);c.fillStyle='#caffb910';c.beginPath();c.moveTo(radius,0);c.arc(0,0,radius+180,-.22,.22);c.closePath();c.fill();c.strokeStyle='#dcff9a';c.lineWidth=5;c.beginPath();c.arc(0,0,radius+6,-.24,.24);c.stroke();for(let j=-1;j<=1;j++){c.save();c.rotate(j*.16);c.fillStyle='#ddffac';c.fillRect(radius-5,-4,25,8);if(battle.held){const reach=radius+24+((time*520+j*32)%150+150)%150;c.strokeStyle='#e5ffc4';c.lineWidth=3;c.beginPath();c.moveTo(reach-22,0);c.lineTo(reach,0);c.stroke();}c.restore();}c.restore();}
  battle.support?.draw(c,this.lite);
  if(this.warning?.life>0){const sides=this.warning.side===3?[1,2]:[this.warning.side];for(const side of sides){const x=side===1?0:w,gradient=c.createRadialGradient(x,h*.4,0,x,h*.4,w*.32);gradient.addColorStop(0,this.warning.weapon==='laser'?'#c6a0ff55':'#88eced45');gradient.addColorStop(1,'#88eced00');c.fillStyle=gradient;c.fillRect(side===1?0:w*.68,85,w*.32,h*.6);}}
  for(const e of battle.enemies)this.enemy(e,time);
  for(const p of this.fx){c.globalAlpha=Math.max(0,p.life/p.total);c.strokeStyle=p.color;c.fillStyle=p.color;if(p.ring){c.lineWidth=p.shock?7:1.4;circle(c,p.x,p.y,p.r);c.stroke();if(p.shock){c.globalAlpha*=.14;c.fill();}}else{c.lineWidth=p.size;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.035,p.y-p.vy*.035);c.stroke();}}c.globalAlpha=1;
  for(const t of this.texts){c.globalAlpha=Math.min(1,t.life/.2);c.fillStyle=t.color;c.font=`700 ${t.size}px system-ui`;c.textAlign='center';c.fillText(t.text,t.x,t.y);}c.globalAlpha=1;
  if(this.flash>0){c.fillStyle=`rgba(255,92,112,${this.flash*.22})`;c.fillRect(0,0,w,h);}c.restore();
 }
 enemy(e,time){
  const c=this.ctx;if(e.y < -90||e.y>this.h+60||e.x < -90||e.x>this.w+90)return;const depth=Math.max(0,Math.min(1,e.y/(this.h*.7))),size=e.radius*(e.boss?2.9:3.1)*(e.boss?1:.9+.1*depth);c.save();c.globalAlpha=e.boss?1:.8+.2*depth;c.translate(e.x,e.y);if(!e.boss)c.rotate(Math.atan2(this.h-142-e.y,this.w/2-e.x)-Math.PI/2);else c.rotate(Math.sin(e.age*.9)*.05);const bob=e.rhythmRole?1+(e.beatPulse||0)*.1-(e.warn||0)*.12:1+Math.sin(time*5+e.phase)*.035;c.scale(bob,1/bob);c.drawImage(this.sprites[SPRITE_KIND[e.type]||e.type],-size/2,-size/2,size,size);if(e.hit>0){c.globalCompositeOperation='lighter';c.globalAlpha=e.hit*4;c.drawImage(this.sprites[SPRITE_KIND[e.type]||e.type],-size/2,-size/2,size,size);}c.restore();
  if(e.type==='shield'&&e.guard>0){const r=e.radius*1.52+7,breath=this.lite?1:1+Math.sin(time*2+e.phase)*.018;c.save();c.globalAlpha=Math.min(1,.86+Math.max(0,e.hit)*1.8);c.drawImage(this.shieldSprite,e.x-r*breath,e.y-r*breath,r*2*breath,r*2*breath);c.restore();}
  if(e.rhythmRole==='energy'){c.fillStyle='#baff91';circle(c,e.x,e.y,6+Math.sin(time*8)*1.5);c.fill();c.fillStyle='#efffdd';c.font='bold 10px system-ui';c.textAlign='center';c.fillText('✦',e.x,e.y+3);}
  if(e.warn>0){const r=e.radius*(1.4+e.warn*.3);c.save();c.globalAlpha=.2+e.warn*.5;c.fillStyle='#ffab73';circle(c,e.x,e.y,r);c.fill();c.globalAlpha=1;c.fillStyle='#fff3b4';circle(c,e.x,e.y,3+e.warn*4);c.fill();c.restore();}
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

Object.assign(exports,{Renderer});
},
"audio.mjs":function(require,module,exports){
const {cueAt}=require("rhythm.mjs");
const {arrangementFor,sectionAt}=require("arrangement.mjs");
const {getTrack,frequency,stepTime}=require("music.mjs");
class Soundtrack {
 constructor(){this.ctx=null;this.muted=false;this.running=false;this.origin=0;this.step=0;this.timer=null;this.track=getTrack(1);this.volume=.52;this.musicVolume=.74;this.fxVolume=.55;this.nodes=new Set();this.generation=0;}
 async unlock(){
  try{
   if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC({latencyHint:'interactive'});this.setup(this.ctx);}
   if(this.ctx.state==='suspended')await this.ctx.resume();return this.ctx.state==='running';
  }catch{this.ctx=null;return false;}
 }
 setup(ctx){
  this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=this.muted?0:this.volume;this.music=ctx.createGain();this.effects=ctx.createGain();this.music.gain.value=this.musicVolume;this.effects.gain.value=this.fxVolume;this.music.connect(this.master);this.effects.connect(this.master);
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-15;limiter.knee.value=14;limiter.ratio.value=7;limiter.attack.value=.003;limiter.release.value=.14;this.master.connect(limiter);limiter.connect(ctx.destination);
  this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.5),ctx.sampleRate);const data=this.noise.getChannelData(0);let seed=9127;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}
 }
 setMute(value){this.muted=value;if(this.master)this.master.gain.setTargetAtTime(value?0:this.volume,this.ctx.currentTime,.025);}
 setVolumes(music,fx){this.musicVolume=Math.max(0,Math.min(1,music));this.fxVolume=Math.max(0,Math.min(1,fx));if(this.music){if(this.running)this.applyMusicEnvelope();else this.music.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.04);this.effects.gain.setTargetAtTime(this.fxVolume,this.ctx.currentTime,.04);}}
 tone(at,freq,duration,gain,type='sine',endFreq,filterFreq,bus=this.music,options={}){
  if(!this.ctx||(this.nodes.size>180&&!this.ctx.startRendering))return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),cleanup=[];o.type=type;o.frequency.setValueAtTime(Math.max(16,freq),at);
  if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(16,endFreq),at+Math.min(duration,.16));
  if(options.bend){o.frequency.setValueAtTime(freq*.94,at);o.frequency.exponentialRampToValueAtTime(freq,at+.065);}
  if(options.detune)o.detune.value=options.detune;
  const attack=Math.min(duration*.3,options.attack||.004);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+duration);if(options.hardStop)g.gain.setValueAtTime(0,at+duration+.002);o.connect(g);
  let tail=g;if(filterFreq){const f=this.ctx.createBiquadFilter();f.type=options.filterType||'lowpass';f.Q.value=options.q||.65;f.frequency.setValueAtTime(filterFreq,at);if(options.wah)f.frequency.exponentialRampToValueAtTime(Math.max(160,filterFreq*.3),at+duration);g.connect(f);tail=f;cleanup.push(f);}
  if(options.pan&&this.ctx.createStereoPanner){const pan=this.ctx.createStereoPanner();pan.pan.value=options.pan;tail.connect(pan);tail=pan;cleanup.push(pan);}
  tail.connect(bus||this.music);o.start(at);o.stop(at+duration+(options.hardStop?.003:.025));this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();for(const n of cleanup)n.disconnect();};
 }
 hiss(at,duration,gain,hz,bus=this.music){if(!this.ctx)return;const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();source.buffer=this.noise;filter.type='highpass';filter.frequency.value=hz;g.gain.setValueAtTime(Math.max(.0001,gain),at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);source.connect(filter);filter.connect(g);g.connect(bus||this.music);source.start(at);source.stop(at+duration);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);source.disconnect();filter.disconnect();g.disconnect();};}
 note(event,at){
  const {instrument:i,duration:d,velocity:v,midi,bend,role}=event,f=frequency(midi);const bus=this.music;
  if(i==='kick'){this.tone(at,145,d,.67*v,'sine',43,undefined,bus);this.hiss(at,.018,.06*v,1600);return;}
  if(i==='snare'){this.hiss(at,d,.2*v,1200);this.tone(at,188,.085,.15*v,'triangle',120);return;}
  if(i==='hat'||i==='tamb'){this.hiss(at,d,(i==='tamb'?.10:.085)*v,i==='tamb'?6500:7600);return;}
  if(i==='rim'){this.tone(at,940,.025,.095*v,'triangle',610);return;}
  if(i==='conga'||i==='tom'){this.tone(at,f*.5,d,.2*v,'sine',f*.36);this.hiss(at,.018,.03*v,1800);return;}
  const bass=role==='bass',amp=bass?.25*v:.18*v;
  if(i==='slap'){this.tone(at,f,d,.33*v,'triangle',undefined,1250,bus,{wah:true});this.tone(at,f*2,.055,.09*v,'sawtooth',undefined,1900);this.hiss(at,.018,.026*v,1800);}
  else if(i==='finger'||i==='round'||i==='upright'){this.tone(at,f,d*1.35,.35*v,'sine');this.tone(at,f,d,.13*v,'triangle',undefined,i==='upright'?800:520);if(i==='upright')this.hiss(at,.025,.013*v,1500);}
  else if(i==='clav'){this.tone(at,f,d,amp*.8,'sawtooth',undefined,2200,bus,{wah:true,q:1.4,pan:-.17});this.tone(at,f*2,d*.48,amp*.3,'triangle',undefined,3000);}
  else if(i==='rhodes'){this.tone(at,f,d*1.6,amp*.8,'sine',undefined,undefined,bus,{pan:.14});this.tone(at,f*2,d*.35,amp*.22,'sine');this.tone(at,f*3,d*.23,amp*.12,'sine');}
  else if(i==='piano'){this.tone(at,f,d*1.8,amp*.75,'triangle',undefined,bass?1100:3500);this.tone(at,f*2,d*.65,amp*.24,'sine');this.tone(at,f*3,d*.35,amp*.13,'sine');}
  else if(i==='organ'){this.tone(at,f,d,amp*.55,'sine',undefined,undefined,bus,{attack:.012,pan:-.12});this.tone(at,f*2,d,amp*.25,'sine');this.tone(at,f*3,d*.8,amp*.17,'sine');}
  else if(i==='guitar'){this.tone(at,f,d*1.35,amp*.9,'triangle',undefined,2100,bus,{bend,wah:true,pan:.12});this.tone(at,f*2,d*.35,amp*.2,'sawtooth',undefined,1600);}
  else if(i==='brass'){this.tone(at,f,d,amp*.65,'sawtooth',undefined,1800,bus,{attack:.018,wah:true,pan:.22});this.tone(at,f,d,amp*.32,'sawtooth',undefined,1500,bus,{detune:7});}
  else if(i==='strings'){this.tone(at,f,d*1.8,amp*.48,'sawtooth',undefined,1600,bus,{attack:.045,detune:-5,pan:-.2});this.tone(at,f,d*1.8,amp*.4,'triangle',undefined,1400,bus,{attack:.04,detune:5});}
  else if(i==='vibes'){this.tone(at,f,d*2.1,amp,'sine',undefined,undefined,bus,{pan:.2});this.tone(at,f*4,d*.28,amp*.16,'sine');}
  else if(i==='synth'){this.tone(at,f,d*1.25,bass?.27*v:amp*.8,'sawtooth',undefined,bass?600:2400,bus,{wah:true,q:2});this.tone(at,f,d,bass?.21*v:amp*.3,'sine');}
 }
 start(level=1,time=0){this.stop();this.track=getTrack(level);if(!this.ctx)return;this.music=this.ctx.createGain();this.music.connect(this.master);this.music.gain.setValueAtTime(0,this.ctx.currentTime);this.music.gain.linearRampToValueAtTime(this.musicVolume,this.ctx.currentTime+.18);this.running=true;this.origin=this.ctx.currentTime-time+.045;this.applyMusicEnvelope(true);this.step=Math.max(0,Math.floor(time/(this.track.beat/4)));this.schedule();this.timer=setInterval(()=>this.schedule(),25);}
 musicLevel(time){const a=arrangementFor(this.track.level,this.track.bpm);return this.musicVolume*Math.max(0,Math.min(1,(a.duration-time)/5));}
 applyMusicEnvelope(fadeIn=false){
  if(!this.ctx||!this.music)return;const now=this.ctx.currentTime,a=arrangementFor(this.track.level,this.track.bpm),time=Math.max(0,now-this.origin),end=this.origin+a.duration,start=end-5,g=this.music.gain;
  g.cancelScheduledValues(now);g.setValueAtTime(fadeIn?0:this.musicLevel(time),now);
  if(fadeIn)g.linearRampToValueAtTime(this.musicLevel(time+.18),now+.18);
  if(start>now+.18)g.setValueAtTime(this.musicVolume,start);
  g.linearRampToValueAtTime(0,Math.max(now+.19,end));
 }
 finish(){
  if(!this.ctx||!this.running)return;const now=this.ctx.currentTime;this.endingAt=now;
  this.music.gain.cancelScheduledValues(now);this.music.gain.setValueAtTime(this.musicLevel(Math.max(0,now-this.origin)),now);this.music.gain.linearRampToValueAtTime(0,now+1.2);
  const gen=this.generation;clearTimeout(this.endTimer);this.endTimer=setTimeout(()=>{if(this.generation===gen)this.stop();},1300);
 }
 stop(){clearTimeout(this.endTimer);this.endingAt=null;this.running=false;this.generation++;if(this.timer)clearInterval(this.timer);this.timer=null;const now=this.ctx?.currentTime||0,old=this.music;if(old){old.gain.cancelScheduledValues(now);old.gain.setValueAtTime(old.gain.value,now);old.gain.linearRampToValueAtTime(0,now+.18);setTimeout(()=>old.disconnect(),350);}for(const n of this.nodes){try{if(n.fadeGain){n.fadeGain.gain.cancelScheduledValues(now);n.fadeGain.gain.setValueAtTime(n.fadeGain.gain.value,now);n.fadeGain.gain.linearRampToValueAtTime(0,now+.18);}n.stop(now+.2);}catch{}}this.nodes.clear();}
 position(fallback=0){return this.ctx&&this.running?Math.max(0,this.ctx.currentTime-this.origin):fallback;}
 phase(fallback=0){const beat=this.track.beat;return this.ctx&&this.running?((this.ctx.currentTime-this.origin)%beat+beat)%beat:fallback;}
 schedule(){
  if(!this.running||!this.ctx)return;const t=this.track,n=t.bars*16;
  if(this.ctx.currentTime-this.origin-stepTime(t,this.step)>1)this.step=Math.floor((this.ctx.currentTime-this.origin)/(t.beat/4));
  while(this.origin+stepTime(t,this.step)<this.ctx.currentTime+.14){const at=this.origin+stepTime(t,this.step);if((!this.endingAt||at<this.endingAt)&&at>=this.ctx.currentTime-.012){
   const when=Math.max(at,this.ctx.currentTime),elapsed=stepTime(t,this.step),a=arrangementFor(t.level,t.bpm),section=sectionAt(elapsed,a),sub=this.step%16;
   if(elapsed>=a.duration){this.step++;continue;}
   const beforeDrop=elapsed>=a.climaxStart-t.beat&&elapsed<a.climaxStart;
   for(const e of t.byStep[this.step%n]){
    if(beforeDrop&&e.instrument!=='snare'&&e.instrument!=='hat')continue;
    if(section==='groove'&&elapsed<8*t.beat&&e.role==='lead')continue;
    if(section==='outro'&&(e.role==='lead'||e.instrument==='tamb'))continue;
    this.note({...e,velocity:e.velocity*(section==='climax'?1.04:section==='outro'?.75:1)},when);
    if(section==='climax'&&e.role==='bass'&&sub%4===0)this.note({...e,midi:e.midi+12,velocity:e.velocity*.27},when);
   }
   if(sub%4===0){const beat=Math.floor(this.step/4);if(sub===0)this.note({instrument:'kick',midi:0,duration:.15,velocity:.32},when);if(beat%4===2&&cueAt(t.level,beat+2)){this.note({instrument:'tom',midi:53,duration:.09,velocity:.65},when);this.note({instrument:'tom',midi:48,duration:.09,velocity:.65},when+t.beat);}}
   if(section==='build'&&(sub===0||sub===12||elapsed>=a.climaxStart-t.beat*4&&sub%2===0))this.note({instrument:'snare',midi:0,duration:.055,velocity:.15+.3*(elapsed-a.buildStart)/(a.climaxStart-a.buildStart)},when);
   if(section==='climax'&&sub%4===0&&!t.byStep[this.step%n].some(e=>e.instrument==='kick'))this.note({instrument:'kick',midi:0,duration:.18,velocity:.65},when);
   if(section==='climax'&&sub===0&&Math.floor(this.step/16)%4===0){this.hiss(when,.18,.035,4200);this.tone(when,frequency(t.key),.3,.12,'sine');}
  }this.step++;}
 }
 fx(type,data={}){
  if(!this.ctx||this.muted)return;const now=this.ctx.currentTime,b=this.effects;
  if(type==='switch'){const f=frequency(this.track.key+12);if(data.weapon==='wave'){this.tone(now,140,data.perfect?.2:.08,data.perfect?.24:.06,'sine',52,undefined,b);this.air(now,.09,.05,800,b);}else if(data.perfect){const bass=Math.max(49,Math.min(82,frequency(this.track.key)));this.tone(now,bass*2.4,.09,data.perfect?.25:.18,'triangle',bass,550,b,{hardStop:true,attack:.003});this.tone(now,bass*1.2,.075,data.perfect?.12:.085,'sine',bass*.7,undefined,b,{hardStop:true,attack:.003});}}
  if(type==='pickup')this.tone(now,frequency(this.track.key+12),.2,.09,'triangle',frequency(this.track.key+24),1300,b);
  if(type==='press'){this.tone(now,115,.09,.15,'sine',62,undefined,b);this.tone(now,260,.045,.035,'triangle',170,700,b);this.air(now,.055,.025,900,b);}
  if(type==='strong'){this.tone(now,155,.12,.18,'sine',72,undefined,b);this.tone(now,390,.035,.045,'triangle',230,1000,b);this.air(now,.045,.06,1600,b);}
  if(type==='support'){const f=frequency(this.track.key+12);this.tone(now,f,.16,.065,'triangle',f*2,1200,b);this.air(now,.11,.035,1100,b);}
  if(type==='release')this.air(now,.06,.018,650,b);
  if(type==='fire')this.tone(now,data.weapon==='laser'?360:150,.055,.023,'triangle',data.weapon==='laser'?130:65,850,b);
  if(type==='hurt'){this.air(now,.13,.15,500,b);this.tone(now,85,.18,.13,'sawtooth',35,350,b);}
  if(type==='bossDown'||type==='overdrive'){this.tone(now,90,.32,.19,'sine',34,undefined,b);this.air(now,.22,.13,1100,b);this.tone(now,240,.13,.07,'triangle',100,650,b);}
  if(type==='ui'){this.tone(now,230,.065,.075,'triangle',140,700,b);this.air(now,.03,.02,900,b);}
 }
 air(at,duration,gain,hz,bus){if(!this.ctx||this.nodes.size>180)return;const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();source.buffer=this.noise;filter.type='bandpass';filter.frequency.value=hz;filter.Q.value=.7;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(gain,at+.004);g.gain.exponentialRampToValueAtTime(.0001,at+duration);source.connect(filter);filter.connect(g);g.connect(bus);source.start(at);source.stop(at+duration);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);source.disconnect();filter.disconnect();g.disconnect();};}
}

Object.assign(exports,{Soundtrack});
},
"music.mjs":function(require,module,exports){
const {arrangementFor}=require("arrangement.mjs");
const random=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
const STYLES=[
 {id:'funk',name:'Funk 放克',bpm:106,swing:.045,bass:'slap',keys:'clav',lead:'brass',kick:[0,6,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bassSteps:[0,3,6,7,10,12,15],chords:[3,7,11,14],progression:[0,0,5,0,0,7,5,0],quality:[0,4,7,10,14],scale:[0,3,5,6,7,10],title:'霓虹切分',color:'#bcf7b4'},
 {id:'blues',name:'摇摆蓝调',bpm:100,swing:.16,bass:'upright',keys:'organ',lead:'guitar',kick:[0,8,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bassSteps:[0,2,4,6,8,10,12,14],chords:[2,6,10,14],progression:[0,0,0,0,5,5,0,0,7,5,0,7],quality:[0,4,7,10],scale:[0,3,5,6,7,10],title:'午夜弯音',color:'#9bbdff'},
 {id:'disco',name:'Disco 迪斯科',bpm:120,swing:0,bass:'finger',keys:'strings',lead:'brass',kick:[0,4,8,12],snare:[4,12],hat:[2,6,10,14],bassSteps:[0,2,4,6,8,10,12,14],chords:[2,6,10,14],progression:[0,0,5,5,9,9,7,7],quality:[0,3,7,10],scale:[0,3,5,7,10,12],title:'镜球引力',color:'#ffb8d4'},
 {id:'soul',name:'Neo-Soul 灵魂乐',bpm:90,swing:.10,bass:'round',keys:'rhodes',lead:'organ',kick:[0,7,10],snare:[4,12],hat:[0,2,6,8,10,14],bassSteps:[0,3,7,8,11,14],chords:[0,7,12],progression:[0,5,2,7,0,5,9,7],quality:[0,3,7,10,14],scale:[0,2,3,5,7,10],title:'月光慢摆',color:'#e7bcff'},
 {id:'jazz',name:'Jazz Funk 爵士放克',bpm:108,swing:.06,bass:'finger',keys:'rhodes',lead:'vibes',kick:[0,3,8,11],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bassSteps:[0,3,5,7,8,11,14],chords:[1,6,10,15],progression:[2,7,0,0,5,7,0,9],quality:[0,3,7,10,14],scale:[0,2,3,5,7,9,10],title:'电气沙发',color:'#8de8d7'},
 {id:'boogie',name:'Boogie 布吉乌吉',bpm:118,swing:.14,bass:'piano',keys:'piano',lead:'guitar',kick:[0,8],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bassSteps:[0,2,4,6,8,10,12,14],chords:[2,6,10,14],progression:[0,0,0,0,5,5,0,0,7,5,0,7],quality:[0,4,7,10],scale:[0,3,4,5,7,9,10],title:'八拍夜车',color:'#ffd18e'},
 {id:'latin',name:'Latin Funk 拉丁放克',bpm:110,swing:.02,bass:'round',keys:'piano',lead:'brass',kick:[0,6,10],snare:[4,12],hat:[0,4,8,12],bassSteps:[0,3,6,8,11,14],chords:[0,3,6,10,12],progression:[0,5,0,7,0,5,2,7],quality:[0,4,7,10,14],scale:[0,2,4,5,7,9,10],title:'赤道回声',color:'#ffc291'},
 {id:'breaks',name:'Breakbeat 碎拍',bpm:116,swing:.035,bass:'synth',keys:'clav',lead:'synth',kick:[0,6,9,14],snare:[4,12,15],hat:[0,2,3,6,8,10,11,14],bassSteps:[0,1,6,8,9,12,15],chords:[3,10,14],progression:[0,0,3,5,0,0,7,5],quality:[0,3,7,10],scale:[0,3,5,7,10],title:'断拍巡航',color:'#b3e8ff'},
 {id:'electro',name:'Electro Funk 电子放克',bpm:114,swing:.025,bass:'synth',keys:'clav',lead:'synth',kick:[0,5,8,11],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bassSteps:[0,3,4,7,10,11,14],chords:[2,7,10,15],progression:[0,0,5,7,0,3,5,7],quality:[0,4,7,10],scale:[0,3,5,7,10],title:'机器摇摆',color:'#c0aaff'},
 {id:'shuffle',name:'Blues Rock 蓝调摇滚',bpm:112,swing:.145,bass:'finger',keys:'guitar',lead:'guitar',kick:[0,8,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bassSteps:[0,2,4,6,8,10,12,14],chords:[0,6,8,14],progression:[0,0,5,0,5,5,0,0,7,5,0,7],quality:[0,7,12],scale:[0,3,5,6,7,10],title:'引擎布鲁斯',color:'#ffb598'}
];
const variants=['启程','霓光','夜行','回旋','漫游','逐浪','掠影','炽热','升空','破晓'];
const tracks=new Map();
const frequency=midi=>440*2**((midi-69)/12);
function stepTime(track,step){const beat=Math.floor(step/4),sub=step%4,s=track.swing;return (beat+[0,(.5+s)/2,.5+s,.75+s/2][sub])*track.beat;}
function getTrack(level){
 level=Math.max(1,Math.min(100,Math.round(level)));if(tracks.has(level))return tracks.get(level);
 const style=STYLES[(level-1)%10],v=Math.floor((level-1)/10),r=random(level*10757+611),key=[40,43,45,38,41,47,42,44,39,46][(v+Math.floor((level-1)%10/2))%10];
 const bpm=style.bpm+[-2,2,-4,4,0,6,-3,3,1,5][v];
 const track={level,id:`groove-${String(level).padStart(3,'0')}`,name:style.title+' · '+variants[v],genre:style.name,style:style.id,bpm,beat:60/bpm,swing:style.swing+(v%3)*.005,key,bars:Math.round(arrangementFor(level,bpm).duration/(240/bpm)),color:style.color,events:[],voice:{bass:style.bass,keys:style.keys,lead:style.lead}};
 const palettes={funk:['brass','clav','rhodes'],blues:['guitar','organ','piano'],disco:['brass','strings','vibes'],soul:['rhodes','organ','vibes'],jazz:['vibes','rhodes','brass'],boogie:['piano','guitar','organ'],latin:['brass','piano','vibes'],breaks:['clav','rhodes','synth'],electro:['clav','synth','vibes'],shuffle:['guitar','organ','piano']};
 track.voice.lead=palettes[style.id][v%3];
 track.form=[];
 const motif=Array.from({length:8},(_,i)=>i===0?0:style.scale[Math.floor(r()*style.scale.length)]);
 const bassNotes=Array.from({length:8},(_,i)=>i===0?0:[0,7,10,12,5,2][Math.floor(r()*6)]);
 const add=(step,instrument,midi=0,duration=.12,velocity=1,extra={})=>track.events.push({step,instrument,midi,duration,velocity,...extra});
 for(let bar=0;bar<track.bars;bar++){
  const base=bar*16,part=Math.floor(bar/4)%2,root=key+style.progression[(bar+(v%3)*2)%style.progression.length],fill=bar%8===7;
  const a=arrangementFor(level,bpm),time=bar*4*track.beat;
  const section=bar<2?'intro':time>=a.outroStart?'outro':time>=a.climaxStart?(bar%8===6?'space':'hook'):time>=a.buildStart?'rise':bar%8===6?'break':part?'answer':'verse';
  track.form.push(section);
  const sparse=['intro','break','space','outro'].includes(section),answer=section==='answer';
  const variation=(bar+v)%4;
  for(const s of style.kick.filter(s=>!sparse||s===0||s===8))add(base+s,'kick',0,.19,s===0?1:.83);
  if(!sparse&&variation===2)add(base+(v%2?15:7),'kick',0,.13,.52);
  for(const s of style.snare)add(base+s,'snare',0,.14,s===15?.42:.85);
  if(!sparse&&(variation===1||fill))add(base+11,'snare',0,.065,.19);
  for(const s of style.hat.filter((s,i)=>!sparse||i%2===0))add(base+s,'hat',0,s===14&&part&&!sparse?.09:.035,(s%4===2?.42:.22)*(v%2?.85:1));
  if(!sparse&&(style.id==='funk'||style.id==='jazz'||style.id==='electro')){for(const s of [1,7,9,15])if((s+bar+v)%3!==0)add(base+s,'hat',0,.025,.15);}
  if(style.id==='latin'){for(const s of [0,3,6,10,12])add(base+s,'conga',s%2?72:65,.13,.45);for(const s of [2,8,14])add(base+s,'rim',0,.055,.35);}
  if(style.id==='disco')for(const s of [2,6,10,14])add(base+s,'tamb',0,.11,.32);
  style.bassSteps.forEach((s,i)=>{
   if(sparse&&i%2===1)return;
   let offset=bassNotes[(i+bar%2*2)%8];
   if(style.id==='blues'||style.id==='boogie'||style.id==='shuffle')offset=[0,4,7,9,10,9,7,4][(i+(part?v%3:0))%8];
   if(style.id==='disco')offset=i%2?12:[0,0,7,5][(i/2+bar)%4];
   if(s===0)offset=0;if(fill&&i===style.bassSteps.length-1)offset=-1+(v%2)*3;
   add(base+s,style.bass,root+offset,style.id==='soul'?.27:.13+(i%3)*.025,s%4===0?.9:.68,{role:'bass'});
  });
  // Extra bass pickup and chord inversions differ for each of the ten arrangements in a style.
  if(!sparse&&v%2===1&&variation===0)add(base+13,style.bass,root+12,.085,.45,{role:'bass'});
  style.chords.forEach((s,i)=>{
   if(sparse&&i>0||answer&&i%2===1)return;
   const inversion=(v+i+part)%3;const notes=style.quality.map((n,j)=>root+24+n+(j<inversion?12:0));
   const duration=['organ','rhodes','strings'].includes(style.keys)?.3+(s===0?.2:0):.095;
   for(const note of notes)add(base+s,style.keys,note,duration,.16+(i%2)*.045,{role:'chord'});
  });
  if(!sparse&&section!=='rise'&&(bar%2===1||section==='hook'&&bar%4===0)){
   const phrase=[[2,5,7,10,14],[0,6,9,12],[3,7,8,14],[2,6,10],[0,3,7,11,14]][v%5];
   phrase.forEach((s,i)=>{if((i+bar+v)%4===0)return;let note=root+24+motif[(i+(answer?4:0)+(section==='hook'?0:part*2))%8]+(answer?-12:0);if(fill&&i===4)note=root+24;
    add(base+s,track.voice.lead,note,.14+(i%2)*.14,.19+(section==='hook'?.025:0),{role:'lead',bend:track.voice.lead==='guitar'&&i%2===1});
   });
  }
  if(fill&&!sparse){for(const s of [13,14,15])add(base+s,'tom',49+(15-s)*3,.11,.28+(s-13)*.07);}
 }
 const endBar=track.bars-1;track.events=track.events.filter(e=>e.step<endBar*16);
 add(endBar*16,style.bass,key,.8,.58,{role:'bass'});
 for(const n of [0,7,12])add(endBar*16,'rhodes',key+24+n,1.1,.12,{role:'chord'});
 track.events.sort((a,b)=>a.step-b.step);track.duration=track.bars*4*track.beat;track.events.forEach(e=>e.time=stepTime(track,e.step));
 track.byStep=Array.from({length:track.bars*16},()=>[]);for(const e of track.events)track.byStep[e.step].push(e);
 tracks.set(level,track);return track;
}
function trackFingerprint(track){return JSON.stringify(track.events.map(e=>[e.step,e.instrument,e.midi,+e.duration.toFixed(3),+e.velocity.toFixed(3),e.bend||false]));}

Object.assign(exports,{STYLES,frequency,stepTime,getTrack,trackFingerprint});
},
"sway.mjs":function(require,module,exports){
// A turn is confirmed after 7% of button radius of return travel.
// Judge its recorded apex time, not the later confirmation event.
class SwayGesture {
 reset(x=0,time=0){this.origin=x;this.extreme=x;this.time=time;this.direction=0;this.lastSide=0;}
 constructor(){this.reset();}
 move(x,time){
  if(!this.direction){if(Math.abs(x-this.origin)<.18)return null;this.direction=Math.sign(x-this.origin);this.extreme=x;this.time=time;return null;}
  if((x-this.extreme)*this.direction>0){this.extreme=x;this.time=time;return null;}
  if((this.extreme-x)*this.direction<.07)return null;
  const side=this.direction,peak={side,time:this.time,x:this.extreme};
  const valid=side*this.extreme>=.28&&Math.abs(this.extreme-this.origin)>=.55&&side!==this.lastSide;
  this.origin=this.extreme;this.direction=-side;this.extreme=x;this.time=time;
  if(!valid)return null;this.lastSide=side;return peak;
 }
}

Object.assign(exports,{SwayGesture});
},
"economy.mjs":function(require,module,exports){
const SKINS=[
 {id:'classic',name:'极光引擎',cost:0,color:'#86f4ff',secondary:'#a993ff',description:'最初的脉冲。'},
 {id:'amber',name:'黄铜唱针',cost:120,color:'#ffd18d',secondary:'#ff9c73',description:'把鼓点镀成金色。'},
 {id:'rose',name:'霓虹舞池',cost:260,color:'#ff9fcb',secondary:'#e2b0ff',description:'下一拍，继续摇摆。'},
 {id:'jade',name:'翡翠频率',cost:480,color:'#96ffd0',secondary:'#71d9ec',description:'低音流过整片星海。'},
 {id:'violet',name:'午夜蓝调',cost:760,color:'#b9a7ff',secondary:'#a6dcff',description:'留一点空间给即兴。'},
 {id:'pearl',name:'白金终曲',cost:1200,color:'#e7fff0',secondary:'#ffd790',description:'压轴登场。'}
];
function normalizeEconomy(raw,stars={}){
 const valid=raw&&raw.version===1;const owned=['classic'];if(valid&&Array.isArray(raw.owned))for(const id of raw.owned)if(SKINS.some(s=>s.id===id)&&!owned.includes(id))owned.push(id);
 const coins=valid?Math.max(0,Math.min(999999,Math.floor(Number(raw.coins)||0))):Object.entries(stars).reduce((sum,[l,s])=>sum+70+Number(l)*2+Number(s)*5,0);
 const receipts=valid&&Array.isArray(raw.receipts)?raw.receipts.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.base)).slice(-128).map(x=>({id:x.id,base:Math.max(0,Math.min(1000,x.base)),bonus:!!x.bonus})):[];
 return{version:1,coins,owned,equipped:valid&&owned.includes(raw.equipped)?raw.equipped:'classic',receipts,revivesSpent:valid?Math.max(0,Math.floor(Number(raw.revivesSpent)||0)):0};
}
function awardClear(economy,runId,level,stars,firstClear,kills=0){
 const existing=economy.receipts.find(r=>r.id===runId);if(existing)return existing;
 const normal=20+Math.max(1,Math.min(100,level))*2+Math.max(1,Math.min(3,stars))*5+(firstClear?50:0)+Math.min(80,Math.floor(Math.max(0,kills)/8));
 const base=Math.ceil(normal/2);
 const receipt={id:runId,base,bonus:false};economy.coins=Math.min(999999,economy.coins+base);economy.receipts.push(receipt);if(economy.receipts.length>128)economy.receipts.shift();return receipt;
}
function awardDouble(economy,runId){const receipt=economy.receipts.find(r=>r.id===runId);if(!receipt||receipt.bonus)return false;receipt.bonus=true;economy.coins=Math.min(999999,economy.coins+receipt.base);return true;}
function buySkin(economy,id){const skin=SKINS.find(s=>s.id===id);if(!skin)return false;if(economy.owned.includes(id)){economy.equipped=id;return true;}if(economy.coins<skin.cost)return false;economy.coins-=skin.cost;economy.owned.push(id);economy.equipped=id;return true;}
const REVIVE_COST=60;
function buyRevive(economy){if(economy.coins<REVIVE_COST)return false;economy.coins-=REVIVE_COST;economy.revivesSpent++;return true;}

Object.assign(exports,{SKINS,normalizeEconomy,awardClear,awardDouble,buySkin,REVIVE_COST,buyRevive});
},
"wechat/src/rewarded.mjs":function(require,module,exports){
// Rewards are granted only after the platform explicitly confirms full viewing.
class WechatRewardedAds {
 constructor(wx,adUnitId){this.wx=wx;this.id=adUnitId;this.pending=false;this.ad=null;}
 get available(){return !!this.id&&typeof this.wx.createRewardedVideoAd==='function'&&!this.pending;}
 async reward(){
  if(!this.available)return {earned:false,status:'unavailable'};
  this.pending=true;
  try{
   this.ad ||= this.wx.createRewardedVideoAd({adUnitId:this.id});
   const ad=this.ad;
   return await new Promise(resolve=>{
    let done=false,shown=false;
    const finish=(earned,status)=>{if(done)return;done=true;clearTimeout(timer);ad.offClose(close);ad.offError(error);resolve({earned,status});};
    const close=r=>finish(r?.isEnded===true,r?.isEnded===true?'completed':'cancelled');
    const error=()=>finish(false,'error');
    // Only time out loading; a visible video may last longer.
    const timer=setTimeout(()=>{if(!shown)finish(false,'timeout');},20000);
    ad.onClose(close);ad.onError(error);
    Promise.resolve().then(()=>ad.show()).catch(()=>{if(done)return;return ad.load().then(()=>{if(!done)return ad.show();});}).then(()=>{shown=true;clearTimeout(timer);}).catch(error);
   });
  }catch{return {earned:false,status:'error'};}finally{this.pending=false;}
 }
}

Object.assign(exports,{WechatRewardedAds});
}
};
const cache={};function load(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;factories[id](load,m,m.exports);return m.exports;}
module.exports=load("wechat/src/main.mjs");
