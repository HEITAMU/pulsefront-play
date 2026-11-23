import { host, AD_UNIT_ID } from './Progress';
export class Rewarded {
  pending = false; private ad: any = null; private cancel: (() => void) | null = null;
  constructor(private wx: any = host(), private id = AD_UNIT_ID) {}
  get available() { return !!(this.id && this.wx && this.wx.createRewardedVideoAd) && !this.pending; }
  async show(): Promise<{ earned: boolean; status: string }> {
    if (!this.available) return { earned: false, status: 'unavailable' };
    this.pending = true;
    try {
      if (!this.ad) this.ad = this.wx.createRewardedVideoAd({ adUnitId: this.id });
      const ad = this.ad;
      return await new Promise(resolve => {
        let done = false, shown = false;
        const finish = (earned: boolean, status: string) => { if (done) return; done = true; clearTimeout(timer); if (ad.offClose) ad.offClose(close); if (ad.offError) ad.offError(error); this.cancel = null; resolve({ earned, status }); };
        const close = (r: any) => finish(!!r && r.isEnded === true, r && r.isEnded === true ? 'completed' : 'cancelled');
        const error = () => finish(false, 'error');
        const timer = setTimeout(() => { if (!shown) finish(false, 'timeout'); }, 20000);
        this.cancel = () => finish(false, 'disposed'); ad.onClose(close); ad.onError(error);
        Promise.resolve().then(() => ad.show()).catch(() => { if (done) return; return ad.load().then(() => { if (!done) return ad.show(); }); }).then(() => { if (!done) { shown = true; clearTimeout(timer); } }).catch(error);
      });
    } catch { return { earned: false, status: 'error' }; } finally { this.pending = false; }
  }
  dispose() { if (this.cancel) this.cancel(); if (this.ad && this.ad.destroy) this.ad.destroy(); this.ad = null; }
}
