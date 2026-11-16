import assert from 'node:assert/strict';
import {normalizeGrowth,upgradeCost,POWER_COSTS,buyUpgrade} from '../growth.mjs';
import {Battle,directionalWeight} from '../engine.mjs';
import {normalizeEconomy,awardClear,awardDouble} from '../economy.mjs';
import {WechatRewardedAds} from '../wechat/src/rewarded.mjs';
assert.deepEqual(normalizeGrowth({power:7,rate:8,support:2}),{power:7,spread:8,support:2});
assert.equal(normalizeGrowth({rate:8,spread:0}).spread,0);
assert.equal(POWER_COSTS.reduce((a,b)=>a+b),44800);
const g=normalizeGrowth({}),e=normalizeEconomy();e.coins=39;assert(!buyUpgrade(g,e,'power'));assert.equal(e.coins,39);e.coins=300;for(let i=0;i<5;i++)assert(buyUpgrade(g,e,'power'));assert.equal(g.power,5);assert.equal(e.coins,0);
const a=new Battle(3,{growth:{power:5,spread:0}}),b=new Battle(3,{growth:{power:5,spread:10}});a.shoot(0,true);b.shoot(0,true);assert.equal(b.waves[0].crestWidth,.7*1.3);assert.equal(a.waves[0].crestDamage,b.waves[0].crestDamage);assert.equal(directionalWeight(-Math.PI/2+.8,-Math.PI/2,a.waves[0].crestWidth),0);assert(directionalWeight(-Math.PI/2+.8,-Math.PI/2,b.waves[0].crestWidth)>0);
a.held=b.held=true;for(let i=0;i<100;i++){a.step(.01,.3);b.step(.01,.3);}assert.equal(a.shots,b.shots);
const wallet=normalizeEconomy();const rec=awardClear(wallet,'run1',10,3,true,400);assert.equal(rec.base,78);assert.equal(wallet.coins,78);awardClear(wallet,'run1',10,3,true,400);assert.equal(wallet.coins,78);assert(awardDouble(wallet,'run1'));assert(!awardDouble(wallet,'run1'));assert.equal(wallet.coins,156);assert(!awardDouble(normalizeEconomy(wallet),'run1'));
function fake(){return {close:null,error:null,onClose(f){this.close=f;},offClose(){this.close=null;},onError(f){this.error=f;},offError(){this.error=null;},show(){return Promise.resolve();},load(){return Promise.resolve();}};}
for(const ended of [true,false,undefined]){const ad=fake(),ads=new WechatRewardedAds({createRewardedVideoAd:()=>ad},'adunit-test'),p=ads.reward();assert.equal((await ads.reward()).earned,false);ad.close(ended===undefined?undefined:{isEnded:ended});assert.equal((await p).earned,ended===true);assert.equal(ads.pending,false);}
{const ad=fake(),ads=new WechatRewardedAds({createRewardedVideoAd:()=>ad},'adunit-test'),p=ads.reward();ad.error({errCode:1004});assert.equal((await p).earned,false);}
assert.equal((await new WechatRewardedAds({},'').reward()).earned,false);
console.log('PASS growth migration, 44,800 total, purchases, crest width/hit agreement, no rate bonus, receipts, ad completion/cancel/error/duplicate');
