// Rewards are granted only after the platform explicitly confirms full viewing.
export class WechatRewardedAds {
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
