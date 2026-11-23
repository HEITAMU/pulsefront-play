import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {WechatRewardedAds} from '../wechat/src/rewarded.mjs';
import {awardClear, awardDouble, normalizeEconomy} from '../economy.mjs';

const ID = 'adunit-34f3a0d585044563';
const nativeConfig = readFileSync(new URL('../wechat/config.js', import.meta.url), 'utf8');
assert.match(nativeConfig, /rewardedAdUnitId:\s*'adunit-34f3a0d585044563'/);

const source = readFileSync(new URL('../cocos-preview/scripts/platform/Platform.js', import.meta.url), 'utf8');
const cocos = {};
runInNewContext(source, {
  System: { register(deps, declare) {
    assert.equal(deps.length, 0);
    const mod = declare((name, value) => { cocos[name] = value; }, { id: 'platform-test' });
    mod.execute();
  } },
  globalThis: {},
  setTimeout, clearTimeout, console
});
assert.equal(cocos.REWARDED_AD_UNIT_ID, ID);

function fakeWechat() {
  const handlers = {close: new Set(), error: new Set()};
  const state = {shows: 0, loads: 0, creates: 0};
  const ad = {
    onClose(fn) { handlers.close.add(fn); },
    offClose(fn) { handlers.close.delete(fn); },
    onError(fn) { handlers.error.add(fn); },
    offError(fn) { handlers.error.delete(fn); },
    show() { state.shows++; return Promise.resolve(); },
    load() { state.loads++; return Promise.resolve(); }
  };
  return {
    state,
    api: {createRewardedVideoAd(options) {
      assert.equal(options.adUnitId, ID);
      state.creates++;
      return ad;
    }},
    close(result) { for (const fn of [...handlers.close]) fn(result); },
    error() { for (const fn of [...handlers.error]) fn({errMsg: 'ad unavailable'}); },
    listenerCount() { return handlers.close.size + handlers.error.size; }
  };
}

const waitForShow = () => new Promise(resolve => setImmediate(resolve));
const cocosHost = fakeWechat();
const cocosAds = new cocos.RewardedAds(undefined, cocosHost.api);
assert.equal(cocosAds.availableFor('clear_double'), true);
assert.equal(cocosAds.availableFor('revive'), false, 'revive needs its own ad unit');
assert.equal((await cocosAds.reward('revive')).earned, false);
assert.equal(cocosHost.state.shows, 0, 'wrong placement must never show ad');

let pending = cocosAds.reward('clear_double');
await waitForShow();
assert.equal((await cocosAds.reward('clear_double')).earned, false, 'reject overlapping ad requests');
cocosHost.close({isEnded: false});
assert.equal((await pending).earned, false, 'early close denies reward');
assert.equal(cocosHost.listenerCount(), 0, 'listeners are removed on completion');

pending = cocosAds.reward('clear_double');
await waitForShow();
cocosHost.close({isEnded: true});
assert.equal((await pending).earned, true, 'full-watch callback authorizes reward');
assert.equal(cocosHost.listenerCount(), 0);
assert.equal(cocosHost.state.creates, 1, 'same placement reuses video instance');

pending = cocosAds.reward('clear_double');
await waitForShow();
cocosHost.error();
assert.equal((await pending).earned, false, 'ad errors deny reward');

const nativeHost = fakeWechat();
const nativeAds = new WechatRewardedAds(nativeHost.api, ID);
pending = nativeAds.reward();
await waitForShow();
nativeHost.close({isEnded: false});
assert.equal((await pending).earned, false, 'native early close denies reward');
pending = nativeAds.reward();
await waitForShow();
nativeHost.close({isEnded: true});
assert.equal((await pending).earned, true, 'native full-watch callback authorizes reward');

const bank = normalizeEconomy(null, {});
const receipt = awardClear(bank, 'run-ad-test', 3, 3, true, 50);
assert.equal(bank.coins, receipt.base, 'base clear reward is unconditional');
assert.equal(awardDouble(bank, 'run-ad-test'), true);
assert.equal(bank.coins, receipt.base * 2, 'earned reward adds one matching base');
assert.equal(awardDouble(bank, 'run-ad-test'), false, 'same run cannot pay twice');
assert.equal(bank.coins, receipt.base * 2, 'no duplicate payout');

const controller = readFileSync(new URL('../cocos-preview/scripts/Pulsefront.js', import.meta.url), 'utf8');
assert.match(controller, /this\.ads\.availableFor\('clear_double'\)/);
assert.match(controller, /!this\.ads\.availableFor\(placement\)/);
assert.doesNotMatch(controller, /this\.offerReward\(r\.win \? 'clear_double' : 'revive'/);
console.log('PASS WeChat/Cocos adUnit, early close, full completion, duplicate guard and placement isolation');
