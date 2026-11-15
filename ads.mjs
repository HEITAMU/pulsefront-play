import {AD_CONFIG} from './ad-config.mjs?v=1.6.0';
export function validateAdConfig(config,hostname){
 return !!(config.enabled&&config.provider==='adsense-h5'&&/^ca-pub-\d{16}$/.test(config.publisherId)&&config.programApproved&&config.privacyReady&&Array.isArray(config.approvedHosts)&&config.approvedHosts.includes(hostname));
}
// Each reward is settled once, exclusively from the provider's successful-view callback.
export class RewardTransaction {
 constructor(id){this.id=id;this.viewed=false;this.settled=false;}
 markViewed(){if(!this.settled)this.viewed=true;}
 finish(status){if(this.settled)return null;this.settled=true;return{earned:this.viewed,status:this.viewed?'viewed':status,id:this.id};}
}
export class RewardedAds {
 constructor({config=AD_CONFIG,host=typeof location==='undefined'?'':location.hostname,clock=()=>Date.now(),request=null}={}){this.config=config;this.host=host;this.clock=clock;this.requestOverride=request;this.pending=false;this.grants=0;this.lastCompleted=-Infinity;this.loader=null;this.events=[];}
 get configured(){return validateAdConfig(this.config,this.host);}
 get available(){return this.configured&&!this.pending&&this.grants<(this.config.sessionLimit||6)&&this.clock()-this.lastCompleted>=(this.config.cooldownSeconds||90)*1000;}
 log(type,placement){this.events.push({type,placement,time:this.clock()});if(this.events.length>80)this.events.shift();}
 async load(){
  if(this.requestOverride)return this.requestOverride;
  if(!this.configured)throw new Error('not-configured');if(this.loader)return this.loader;
  this.loader=new Promise((resolve,reject)=>{
   window.adsbygoogle=window.adsbygoogle||[];
   window.adBreak=window.adConfig=function(options){window.adsbygoogle.push(options);};
   const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(this.config.publisherId);script.id='pulsefront-ad-sdk';
   let done=false;const timer=setTimeout(()=>{if(done)return;done=true;reject(new Error('sdk-timeout'));},12000);
   script.onerror=()=>{if(done)return;done=true;clearTimeout(timer);reject(new Error('sdk-unavailable'));};
   window.adConfig({preloadAdBreaks:'on',sound:'off',onReady:()=>{if(done)return;done=true;clearTimeout(timer);resolve(window.adBreak);}});
   document.head.appendChild(script);
  });
  return this.loader;
 }
 async reward(placement,{offer=async()=>false,beforeAd=()=>{},afterAd=()=>{}}={}){
  if(!this.available)return{earned:false,status:this.configured?'cooldown':'not-configured'};
  this.pending=true;this.log('requested',placement);let request;
  try{request=await this.load();}catch{this.pending=false;this.log('unavailable',placement);return{earned:false,status:'unavailable'};}
  return new Promise(resolve=>{
   const tx=new RewardTransaction(placement+'-'+this.clock()),closed={value:false};let shown=false,watchdog;
   const finish=status=>{const result=tx.finish(status);if(!result)return;clearTimeout(watchdog);closed.value=true;this.pending=false;if(result.earned){this.grants++;this.lastCompleted=this.clock();}if(shown)afterAd();this.log(result.status,placement);resolve(result);};
   watchdog=setTimeout(()=>finish('unavailable'),18000);
   const callbacks={
    type:'reward',name:placement,
    beforeReward:showAd=>{
     clearTimeout(watchdog);watchdog=setTimeout(()=>finish('cancelled'),120000);
     Promise.resolve(offer()).then(consented=>{if(closed.value)return;if(!consented){finish('cancelled');return;}clearTimeout(watchdog);watchdog=setTimeout(()=>finish('unavailable'),18000);try{showAd();}catch{finish('unavailable');}}).catch(()=>finish('cancelled'));
    },
    beforeAd:()=>{if(closed.value)return;shown=true;clearTimeout(watchdog);beforeAd();watchdog=setTimeout(()=>finish('provider-timeout'),300000);},
    afterAd:()=>{if(!closed.value)finish(tx.viewed?'viewed':'dismissed');},
    adViewed:()=>{if(!closed.value)tx.markViewed();},
    adDismissed:()=>{if(!closed.value)finish('dismissed');},
    adBreakDone:info=>{if(!closed.value)finish(info?.breakStatus||'unavailable');}
   };
   try{request(callbacks);}catch{finish('unavailable');}
  });
 }
}
