import assert from 'node:assert/strict';
import {getTrack,STYLES,stepTime,trackFingerprint} from '../music.mjs';
import {Battle} from '../engine.mjs';
import {normalizeEconomy,awardClear,awardDouble,buySkin,buyRevive} from '../economy.mjs';
import {RewardedAds,RewardTransaction,validateAdConfig} from '../ads.mjs';
const tracks=Array.from({length:100},(_,i)=>getTrack(i+1));
assert.equal(new Set(tracks.map(trackFingerprint)).size,100);
assert.equal(new Set(tracks.map(t=>JSON.stringify(t.events.map(e=>[e.step,e.instrument,e.midi-t.key,e.duration,e.velocity,e.bend])))).size,100,'arrangements differ beyond transposition and titles');
assert.equal(new Set(tracks.map(t=>t.style)).size,10);
for(const t of tracks){assert(t.bpm>=80&&t.bpm<=130);assert(t.events.length>350);assert(t.events.some(e=>e.role==='lead'));assert(t.events.some(e=>e.role==='bass'));for(let step=0;step<t.bars*16-1;step++)assert(stepTime(t,step+1)>stepTime(t,step));for(let beat=0;beat<t.bars*4;beat++)assert(Math.abs(stepTime(t,beat*4)-beat*t.beat)<1e-8);}
console.log('PASS 100 distinct musical arrangements, ten genres, swung timing and exact quarter-note grid');
for(const t of tracks){const b=new Battle(t.level,{tempo:t.bpm});assert.equal(b.beatDuration,t.beat);b.t=t.beat*3;b.shoot();assert.equal(b.perfects,1);b.cooldown=0;b.t+=.16;b.shoot();assert.equal(b.perfects,1);}
console.log('PASS beat windows track all 100 tempos');
let e=normalizeEconomy(null,{1:3});assert.equal(e.coins,87);const migrated=normalizeEconomy(e,{1:3});assert.equal(migrated.coins,87);
const receipt=awardClear(e,'run-2',2,3,true);assert.equal(receipt.base,89);assert.equal(e.coins,176);awardClear(e,'run-2',2,3,true);assert.equal(e.coins,176);assert(awardDouble(e,'run-2'));assert.equal(e.coins,265);assert(!awardDouble(e,'run-2'));assert(!awardDouble(e,'missing'));assert(buySkin(e,'amber'));assert.equal(e.coins,145);assert(buySkin(e,'amber'));assert.equal(e.coins,145);assert(!buySkin(e,'pearl'));assert(buyRevive(e));assert.equal(e.coins,85);
console.log('PASS old-save migration, first-clear reward, exactly-once payout and skin purchase');
const b=new Battle(100);b.t=25;b.hp=0;b.state='lost';b.spawn('drone',0,{x:b.cx,y:b.cy-100});const boss=b.spawn('boss',0,{x:b.cx,y:210});assert(b.revive());assert.equal(b.hp,60);assert.equal(b.t,25);assert(b.enemies.includes(boss));assert(!b.enemies.some(m=>m.type==='drone'));b.state='lost';assert(!b.revive());
console.log('PASS one revive per run, preserved stage, nearby enemy removal and boss retention');
const cfg={enabled:true,provider:'adsense-h5',publisherId:'ca-pub-1234567890123456',approvedHosts:['game.example'],programApproved:true,privacyReady:true,cooldownSeconds:90,sessionLimit:2};
assert(validateAdConfig(cfg,'game.example'));assert(!validateAdConfig(cfg,'unapproved.example'));assert(!validateAdConfig({...cfg,enabled:false},'game.example'));assert(!validateAdConfig({...cfg,publisherId:''},'game.example'));
const tx=new RewardTransaction('a');assert.equal(tx.finish('unavailable').earned,false);tx.markViewed();assert.equal(tx.finish('viewed'),null);
let now=100000,shown=0,after=0;const success=new RewardedAds({config:cfg,host:'game.example',clock:()=>now,request:c=>c.beforeReward(()=>{c.beforeAd();shown++;c.adViewed();c.afterAd();c.adBreakDone({breakStatus:'viewed'});})});
const out=await success.reward('clear_double',{offer:()=>true,afterAd:()=>after++});assert(out.earned);assert.equal(shown,1);assert.equal(after,1);assert.equal(success.grants,1);assert(!success.available);now+=91000;assert(success.available);
for(const action of ['dismissed','noFill','failure','cancelled']){let displayed=0;const ads=new RewardedAds({config:cfg,host:'game.example',request:c=>{if(action==='noFill'){c.adBreakDone({breakStatus:'noAdPreloaded'});return;}if(action==='failure')throw new Error('network');c.beforeReward(()=>{displayed++;c.beforeAd();c.adDismissed();c.afterAd();});}});const r=await ads.reward('revive',{offer:()=>action!=='cancelled'});assert(!r.earned);if(action==='cancelled')assert.equal(displayed,0);assert.equal(ads.grants,0);}
const unavailable=new RewardedAds({config:{...cfg,enabled:false},host:'game.example',request:()=>{throw new Error('must not request');}});assert.equal((await unavailable.reward('x')).status,'not-configured');
let cb;const pending=new RewardedAds({config:cfg,host:'game.example',request:c=>{cb=c;}});const p=pending.reward('a');await Promise.resolve();assert.equal((await pending.reward('b')).status,'cooldown');cb.adBreakDone({breakStatus:'noAdPreloaded'});await p;assert(!pending.pending);
console.log('PASS ad configuration gating, consent, actual provider completion, no-fill, cancellation, errors, duplicate callbacks and request serialization');
