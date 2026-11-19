System.register([], function (exports_1, context_1) {
    "use strict";
    var SAVE_KEY, WECHAT_APP_ID, REWARDED_AD_UNIT_ID, storageAdapter, storageAvailable, RewardedAds;
    var __moduleName = context_1 && context_1.id;
    function getWeChat() {
        if (typeof wx !== 'undefined')
            return wx;
        return globalThis.wx || null;
    }
    exports_1("getWeChat", getWeChat);
    function isWeChat() {
        return !!getWeChat();
    }
    exports_1("isWeChat", isWeChat);
    function createAudioContext() {
        const host = getWeChat();
        if (host && typeof host.createWebAudioContext === 'function') {
            try {
                const context = host.createWebAudioContext();
                if (context)
                    return context;
            }
            catch { }
        }
        const scope = globalThis;
        const AudioContextClass = scope.AudioContext || scope.webkitAudioContext;
        if (!AudioContextClass)
            return null;
        try {
            return new AudioContextClass({ latencyHint: 'interactive' });
        }
        catch {
            // Older iOS WebKit contexts may reject constructor options.
            try { return new AudioContextClass(); }
            catch { return null; }
        }
    }
    exports_1("createAudioContext", createAudioContext);
    /** Optionally use Cocos sys.localStorage; tests can inject an in-memory adapter. */
    function setStorageAdapter(adapter) {
        storageAdapter = adapter;
    }
    exports_1("setStorageAdapter", setStorageAdapter);
    function loadSave() {
        try {
            const host = getWeChat();
            const raw = host && typeof host.getStorageSync === 'function'
                ? host.getStorageSync(SAVE_KEY)
                : (storageAdapter || globalThis.localStorage)?.getItem(SAVE_KEY);
            if (raw === '' || raw === null || raw === undefined)
                return null;
            const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        }
        catch {
            exports_1("storageAvailable", storageAvailable = false);
            return null;
        }
    }
    exports_1("loadSave", loadSave);
    function saveSave(value) {
        try {
            const raw = JSON.stringify(value);
            const host = getWeChat();
            if (host && typeof host.setStorageSync === 'function')
                host.setStorageSync(SAVE_KEY, raw);
            else {
                const storage = storageAdapter || globalThis.localStorage;
                if (!storage) {
                    exports_1("storageAvailable", storageAvailable = false);
                    return false;
                }
                storage.setItem(SAVE_KEY, raw);
            }
            return true;
        }
        catch {
            exports_1("storageAvailable", storageAvailable = false);
            return false;
        }
    }
    exports_1("saveSave", saveSave);
    return {
        setters: [],
        execute: function () {
            exports_1("SAVE_KEY", SAVE_KEY = 'pulsefront-save-v1');
            exports_1("WECHAT_APP_ID", WECHAT_APP_ID = 'wx43da24c6ac1e5a12');
            // Copy the approved rewarded-video placement ID here before publishing ads.
            exports_1("REWARDED_AD_UNIT_ID", REWARDED_AD_UNIT_ID = '');
            storageAdapter = null;
            exports_1("storageAvailable", storageAvailable = true);
            /** Rewards require an explicit isEnded === true callback from WeChat. */
            RewardedAds = class RewardedAds {
                constructor(adUnitId = REWARDED_AD_UNIT_ID, host = getWeChat()) {
                    this.ad = null;
                    this.finishPending = null;
                    this.pending = false;
                    this.id = adUnitId.trim();
                    this.host = host;
                }
                get configured() {
                    return !!this.id && typeof this.host?.createRewardedVideoAd === 'function';
                }
                get available() {
                    return this.configured && !this.pending;
                }
                async reward(_placement = '') {
                    if (!this.available)
                        return { earned: false, status: this.pending ? 'busy' : 'not-configured' };
                    this.pending = true;
                    try {
                        this.ad || (this.ad = this.host.createRewardedVideoAd({ adUnitId: this.id }));
                        const ad = this.ad;
                        return await new Promise(resolve => {
                            let done = false;
                            let shown = false;
                            let timer;
                            const finish = (earned, status) => {
                                if (done)
                                    return;
                                done = true;
                                clearTimeout(timer);
                                if (typeof ad.offClose === 'function')
                                    ad.offClose(close);
                                if (typeof ad.offError === 'function')
                                    ad.offError(error);
                                this.finishPending = null;
                                resolve({ earned, status });
                            };
                            const close = (result) => finish(result?.isEnded === true, result?.isEnded === true ? 'completed' : 'cancelled');
                            const error = () => finish(false, 'error');
                            this.finishPending = finish;
                            timer = setTimeout(() => { if (!shown)
                                finish(false, 'timeout'); }, 20000);
                            ad.onClose(close);
                            ad.onError(error);
                            Promise.resolve().then(() => { if (!done)
                                return ad.show(); })
                                .catch(() => {
                                if (done)
                                    return;
                                return Promise.resolve(ad.load()).then(() => { if (!done)
                                    return ad.show(); });
                            })
                                .then(() => { shown = true; clearTimeout(timer); })
                                .catch(error);
                        });
                    }
                    catch {
                        return { earned: false, status: 'error' };
                    }
                    finally {
                        this.pending = false;
                    }
                }
                dispose() {
                    this.finishPending?.(false, 'disposed');
                    this.finishPending = null;
                    if (typeof this.ad?.destroy === 'function')
                        this.ad.destroy();
                    this.ad = null;
                }
            };
            exports_1("RewardedAds", RewardedAds);
        }
    };
});
