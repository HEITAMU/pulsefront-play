System.register(["cc", "./core/engine.js?v=81a7a01cc2f828cc", "./core/music.js?v=81a7a01cc2f828cc", "./core/audio.js?v=81a7a01cc2f828cc", "./core/clock.js?v=81a7a01cc2f828cc", "./core/tutorial.js?v=81a7a01cc2f828cc", "./core/sway.js?v=81a7a01cc2f828cc", "./core/campaign.js?v=81a7a01cc2f828cc", "./core/economy.js?v=81a7a01cc2f828cc", "./core/growth.js?v=81a7a01cc2f828cc", "./core/support.js?v=81a7a01cc2f828cc", "./platform/Platform.js?v=81a7a01cc2f828cc", "./view/BattleView.js?v=81a7a01cc2f828cc", "./view/SupportPreviewView.js?v=81a7a01cc2f828cc", "./ui/Primitives.js?v=81a7a01cc2f828cc", "./ui/CannonButton.js?v=81a7a01cc2f828cc"], function (exports_1, context_1) {
    "use strict";
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var cc_1, engine_js_1, music_js_1, audio_js_1, clock_js_1, tutorial_js_1, sway_js_1, campaign_js_1, economy_js_1, growth_js_1, support_js_1, Platform_js_1, BattleView_js_1, SupportPreviewView_js_1, Primitives_js_1, CannonButton_js_1, ccclass, clamp, Pulsefront;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (cc_1_1) {
                cc_1 = cc_1_1;
            },
            function (engine_js_1_1) {
                engine_js_1 = engine_js_1_1;
            },
            function (music_js_1_1) {
                music_js_1 = music_js_1_1;
            },
            function (audio_js_1_1) {
                audio_js_1 = audio_js_1_1;
            },
            function (clock_js_1_1) {
                clock_js_1 = clock_js_1_1;
            },
            function (tutorial_js_1_1) {
                tutorial_js_1 = tutorial_js_1_1;
            },
            function (sway_js_1_1) {
                sway_js_1 = sway_js_1_1;
            },
            function (campaign_js_1_1) {
                campaign_js_1 = campaign_js_1_1;
            },
            function (economy_js_1_1) {
                economy_js_1 = economy_js_1_1;
            },
            function (growth_js_1_1) {
                growth_js_1 = growth_js_1_1;
            },
            function (support_js_1_1) {
                support_js_1 = support_js_1_1;
            },
            function (Platform_js_1_1) {
                Platform_js_1 = Platform_js_1_1;
            },
            function (BattleView_js_1_1) {
                BattleView_js_1 = BattleView_js_1_1;
            },
            function (SupportPreviewView_js_1_1) {
                SupportPreviewView_js_1 = SupportPreviewView_js_1_1;
            },
            function (Primitives_js_1_1) {
                Primitives_js_1 = Primitives_js_1_1;
            },
            function (CannonButton_js_1_1) {
                CannonButton_js_1 = CannonButton_js_1_1;
            }
        ],
        execute: function () {
            ccclass = cc_1._decorator.ccclass;
            clamp = (v, a, b) => Math.max(a, Math.min(b, v));
            Pulsefront = class Pulsefront extends cc_1.Component {
                constructor() {
                    super(...arguments);
                    this.audio = new audio_js_1.Soundtrack();
                    this.ads = new Platform_js_1.RewardedAds();
                    this.battle = null;
                    this.lesson = null;
                    this.sway = new sway_js_1.SwayGesture();
                    this.mode = 'home';
                    this.activeRun = null;
                    this.musicElapsed = 0;
                    this.visualTime = 0;
                    this.pressed = false;
                    this.pointer = null;
                    this.keys = new Set();
                    this.mapChapter = 0;
                    this.musicGenre = 0;
                    this.previewLevel = null;
                    this.w = 420;
                    this.h = 840;
                    this.safeTop = 0;
                    this.safeBottom = 0;
                    this.bannerUntil = 0;
                    this.artReady = Promise.resolve();
                    this.panel = null;
                    this.panelReopen = null;
                    this.labels = {};
                    this.loading = false;
                    this.resultWait = 0;
                    this.supportDemo = null;
                    this.destroyed = false;
                    this.resizePending = false;
                    this.assetsLoaded = false;
                    this.intent = 0;
                    this.hudBarsKey = '';
                    this.hudGrooveKey = '';
                    this.hudBeatKey = -2;
                    this.simulationSteps = 0;
                }
                onLoad() {
                    Platform_js_1.setStorageAdapter(cc_1.sys.localStorage);
                    this.readSave();
                    this.applyAudio();
                    this.resizeView();
                    this.root = Primitives_js_1.nodeAt(this.node, 'PulsefrontRoot', -this.w / 2, -this.h / 2, this.w, this.h);
                    const world = Primitives_js_1.nodeAt(this.root, 'World', 0, 0, this.w, this.h);
                    this.renderer = new BattleView_js_1.BattleView(world, this.w, this.h);
                    this.renderer.lite = this.save.settings.lite;
                    this.artReady = Promise.resolve(this.renderer.ready).then(() => { this.assetsLoaded = true; if (!this.destroyed)
                        this.labels.loading.string = ''; }).catch((e) => {
                        if (!this.destroyed)
                            this.labels.loading.string = '画面资源载入失败，请重新打开。';
                        throw e;
                    });
                    // Keep failures observable without an unhandled rejection while the player is at home.
                    this.artReady.catch((e) => console.error('[Pulsefront assets]', e));
                    this.home = Primitives_js_1.nodeAt(this.root, 'Home', 0, 0, this.w, this.h);
                    this.hud = Primitives_js_1.nodeAt(this.root, 'BattleHUD', 0, 0, this.w, this.h);
                    this.top = Primitives_js_1.nodeAt(this.root, 'Topbar', 0, 0, this.w, this.h);
                    this.bannerLayer = Primitives_js_1.nodeAt(this.root, 'Banner', 0, 0, this.w, this.h);
                    this.modalLayer = Primitives_js_1.nodeAt(this.root, 'Modals', 0, 0, this.w, this.h);
                    this.buildHome();
                    this.buildBattleUI();
                    this.buildTop();
                    this.buildBanner();
                    this.refreshHome();
                    this.hud.active = false;
                    // Audio unlock is initiated on a real TOUCH_START, before async loading.
                    // Do not unlock from a timer or visibility callback: iOS rejects those.
                    cc_1.input.on(cc_1.Input.EventType.TOUCH_START, this.onAudioGesture, this);
                    cc_1.input.on(cc_1.Input.EventType.TOUCH_END, this.onTouchEnd, this);
                    cc_1.input.on(cc_1.Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
                    cc_1.input.on(cc_1.Input.EventType.KEY_DOWN, this.onKeyDown, this);
                    cc_1.input.on(cc_1.Input.EventType.KEY_UP, this.onKeyUp, this);
                    cc_1.game.on(cc_1.Game.EVENT_HIDE, this.onHide, this);
                    cc_1.view.on('canvas-resize', this.onResize, this);
                    // Read-only diagnostics. No currency, progression, or input cheats in the shipped game.
                    globalThis.pulsefront = Object.freeze({
                        version: engine_js_1.VERSION + '-cocos.5', engine: 'Cocos Creator 3.8.8',
                        snapshot: () => ({ mode: this.mode, panel: this.panel?.root.name ?? null, ...this.battle?.snapshot(), lesson: this.lesson?.stage ?? null,
                            held: this.pressed, unlocked: this.save.unlocked, coins: this.save.economy.coins, completed: Object.keys(this.save.stars).length,
                            storageAvailable: Platform_js_1.storageAvailable, duration: this.battle?.c.duration ?? null, beatDuration: this.battle?.beatDuration ?? null,
                            clearing: !!this.battle?.clearing, simulationSteps: this.simulationSteps,
                            audio: { available: !!this.audio.ctx, state: this.audio.ctx?.state, running: this.audio.running,
                                position: this.audio.position(this.musicElapsed), contextTime: this.audio.ctx?.currentTime,
                                trackDuration: this.audio.track.duration, musicLevel: this.audio.musicLevel(this.audio.position(this.musicElapsed)),
                                musicGain: this.audio.music?.gain.value } }),
                        config: Object.freeze({ stages: 100, tracks: 100, genres: 10, cannonSounds: false, adsConfigured: this.ads.configured }),
                    });
                }
                readSave() {
                    const raw = Platform_js_1.loadSave() || {};
                    const settings = raw.settings || {};
                    this.save = { unlocked: clamp(Math.floor(Number(raw.unlocked) || 1), 1, 100), stars: {}, best: {}, seen: !!raw.seen, swipeLearned: !!raw.swipeLearned,
                        finisher: 'wave', settings: { sound: typeof settings.sound === 'boolean' ? settings.sound : true, haptics: false,
                            musicVolume: Number.isFinite(settings.musicVolume) ? clamp(settings.musicVolume, 0, 1) : .74,
                            fxVolume: Number.isFinite(settings.fxVolume) ? clamp(settings.fxVolume, 0, 1) : .55, lite: !!settings.lite } };
                    for (const field of ['stars', 'best'])
                        if (raw[field] && typeof raw[field] === 'object') {
                            for (const [key, value] of Object.entries(raw[field]))
                                if (+key >= 1 && +key <= 100 && Number.isFinite(+value))
                                    this.save[field][key] = clamp(Math.floor(+value), 0, field === 'stars' ? 3 : 99999999);
                        }
                    this.save.economy = economy_js_1.normalizeEconomy(raw.economy, this.save.stars);
                    this.save.support = support_js_1.normalizeSupport(raw.support, this.save.unlocked);
                    this.save.growth = growth_js_1.normalizeGrowth(raw.growth);
                    this.mapChapter = Math.floor((this.save.unlocked - 1) / 10);
                }
                persist() { Platform_js_1.saveSave(this.save); }
                applyAudio() { this.audio.setVolumes(this.save.settings.musicVolume, this.save.settings.fxVolume); this.audio.setMute(!this.save.settings.sound); }
                resizeView() {
                    const frame = cc_1.view.getFrameSize();
                    const ratio = frame.width > 0 ? frame.height / frame.width : 2;
                    this.h = ratio > 1.2 ? clamp(Math.round(420 * ratio), 700, 1000) : 840;
                    cc_1.view.setDesignResolutionSize(this.w, this.h, cc_1.ResolutionPolicy.SHOW_ALL);
                    this.safeTop = 0;
                    this.safeBottom = 0;
                    try {
                        const wx = Platform_js_1.getWeChat(), info = wx?.getWindowInfo?.() || wx?.getSystemInfoSync?.();
                        if (info) {
                            const scale = this.w / info.windowWidth;
                            this.safeTop = Math.max(0, (info.safeArea?.top || 0) * scale);
                            this.safeBottom = Math.max(0, (info.windowHeight - (info.safeArea?.bottom || info.windowHeight)) * scale);
                            const capsule = wx.getMenuButtonBoundingClientRect?.();
                            if (capsule)
                                this.safeTop = Math.max(this.safeTop, capsule.bottom * scale - 10);
                        }
                    }
                    catch { /* Devices without safe-area APIs use the conservative layout margin. */ }
                }
                onResize() { this.resizePending = true; }
                rebuildLayout() {
                    this.resizePending = false;
                    const reopen = this.panelReopen;
                    this.closePanel();
                    this.resetInput();
                    this.resizeView();
                    this.root.setPosition(-this.w / 2, this.h / 2);
                    this.root.getComponent(cc_1.UITransform).setContentSize(this.w, this.h);
                    this.renderer.resize(this.w, this.h, this.save.settings.lite);
                    this.battle?.resize(this.w, this.h - this.safeBottom);
                    for (const layer of [this.home, this.hud, this.top, this.bannerLayer]) {
                        for (const n of [...layer.children])
                            n.destroy();
                        layer.removeAllChildren();
                    }
                    this.labels = {};
                    this.buildHome();
                    this.buildBattleUI();
                    this.buildTop();
                    this.buildBanner();
                    this.refreshHome();
                    this.home.active = this.mode === 'home';
                    this.hud.active = this.mode !== 'home';
                    if (reopen)
                        reopen();
                }
                buildHome() {
                    const w = this.w, h = this.h, pad = 24, inner = w - pad * 2, compact = h < 760;
                    const heroTop = Math.max(100, this.safeTop + 90), dockHeight = compact ? 280 : 314, dockY = h - Math.max(22, this.safeBottom + 10) - dockHeight;
                    Primitives_js_1.text(this.home, 'RHYTHM BEYOND THE VOID', 28, heroTop + 25, 270, 20, { size: 7, color: '#8299a5', wrap: false });
                    Primitives_js_1.text(this.home, '随节拍，点燃星海。', 30, heroTop + 230, 270, 25, { size: 11, color: '#acbec5', wrap: false });
                    const wallet = Primitives_js_1.card(this.home, 'Wallet', w - 122, heroTop - 18, 98, 32, '#1b2c35b8', '#b5c9d128', 16);
                    this.labels.wallet = Primitives_js_1.text(wallet, '✧  0', 6, 6, 86, 24, { size: 11, color: '#cedcce', align: 'center', wrap: false });
                    const campaignH = compact ? 110 : 124, campaign = Primitives_js_1.card(this.home, 'CampaignCard', pad, dockY, inner, campaignH, '#21343fe8', '#bfd4d43b', 18);
                    const start = Primitives_js_1.button(campaign, 'start', '开始出击', 15, 15, inner - 30, compact ? 48 : 56, () => this.startCampaign(), { primary: true, size: 16 });
                    this.labels.start = start.label;
                    Primitives_js_1.button(campaign, 'map', '星域地图 · 选择已解锁关卡', 15, compact ? 69 : 77, inner - 30, 32, () => { this.mapChapter = Math.floor((this.save.unlocked - 1) / 10); this.showMap(); }, { fill: '#21343f', size: 11 });
                    const groupY = dockY + campaignH + 13, groupH = compact ? 103 : 117, group = Primitives_js_1.card(this.home, 'GrowthCard', pad, groupY, inner, groupH, '#1d2d3aeb', '#bacfd332', 18);
                    Primitives_js_1.text(group, '武 器 养 成', 15, 12, inner - 30, 18, { size: 9, color: '#93aab5', wrap: false });
                    const tileW = (inner - 40) / 2;
                    const a = Primitives_js_1.button(group, 'support', '', 15, 35, tileW, compact ? 56 : 68, () => this.showSupport(), { fill: '#2b3e49' });
                    const b = Primitives_js_1.button(group, 'growth', '', 25 + tileW, 35, tileW, compact ? 56 : 68, () => this.showGrowth(), { fill: '#2b3e49' });
                    for (const [n, symbol, title, detail] of [[a.node, '✦', '副武器', '装配与飞行动作'], [b.node, '▥', '火力工坊', '永久升级']]) {
                        Primitives_js_1.text(n, symbol, 10, compact ? 1 : 4, tileW - 20, compact ? 22 : 26, { size: compact ? 20 : 24, lineHeight: compact ? 22 : 26, color: '#b8dfd1', align: 'center', wrap: false });
                        Primitives_js_1.text(n, title, 10, compact ? 24 : 32, tileW - 20, 16, { size: 12, lineHeight: 16, bold: true, align: 'center', wrap: false });
                        Primitives_js_1.text(n, detail, 10, compact ? 42 : 51, tileW - 20, 12, { size: 8, lineHeight: 12, color: '#a5bac4', align: 'center', wrap: false });
                    }
                    const utilityY = groupY + groupH + 13, utilityW = (inner - 10) / 2;
                    Primitives_js_1.button(this.home, 'hangar', '◈   机库外观', pad, utilityY, utilityW, 45, () => this.showHangar(), { size: 11, fill: '#142531cf', radius: 12 });
                    Primitives_js_1.button(this.home, 'music', '♫   星际唱片机', pad + utilityW + 10, utilityY, utilityW, 45, () => this.showMusic(), { size: 11, fill: '#142531cf', radius: 12 });
                    Primitives_js_1.text(this.home, 'v1.8.2 · C5', 26, h - 16 - this.safeBottom, 140, 13, { size: 7, color: '#68808b', wrap: false });
                    this.labels.loading = Primitives_js_1.text(this.home, this.assetsLoaded ? '' : '正在载入星域…', 26, heroTop + 274, w - 52, 25, { size: 10, color: '#95b6bb' });
                }
                buildTop() {
                    for (const child of [...this.top.children])
                        child.destroy();
                    this.top.removeAllChildren();
                    const y = this.safeTop + 22;
                    if (this.mode === 'home') {
                        const logo = Primitives_js_1.card(this.top, 'Brand', 25, y, 28, 29, '#1c303b', '#b7cacb66', 7);
                        Primitives_js_1.text(logo, 'P', 4, 1, 22, 27, { size: 21, color: '#d7e2df', bold: true, align: 'center' });
                        Primitives_js_1.text(this.top, 'PULSEFRONT', 63, y + 1, 155, 18, { size: 11, bold: true, color: '#b9cbd1', wrap: false });
                        Primitives_js_1.text(this.top, '脉 冲 防 线', 63, y + 19, 155, 14, { size: 8, color: '#819ca8', wrap: false });
                    }
                    Primitives_js_1.button(this.top, 'sound', this.save.settings.sound ? '♫' : '×', this.w - 100, y, 34, 34, () => this.toggleSound(), { size: 18, radius: 17, fill: '#152431d9' });
                    Primitives_js_1.button(this.top, this.mode === 'home' ? 'settings' : 'pause', this.mode === 'home' ? '☷' : 'Ⅱ', this.w - 58, y, 34, 34, () => this.mode === 'home' ? this.showSettings() : this.pauseGame(), { size: 19, radius: 17, fill: '#152431d9' });
                }
                refreshHome() {
                    this.labels.wallet.string = '✧  ' + this.save.economy.coins.toLocaleString();
                    const label = this.save.unlocked === 1 && !this.save.stars[1] ? '开始出击' : `继续出击 · 第${String(this.save.unlocked).padStart(2, '0')}关`;
                    this.labels.start.string = label;
                    const skin = economy_js_1.SKINS.find((s) => s.id === this.save.economy.equipped) || economy_js_1.SKINS[0];
                    this.renderer.skin = skin.id === 'classic' ? null : skin;
                    this.renderer.lite = this.save.settings.lite;
                    if (this.cannon)
                        this.cannon.lite = this.save.settings.lite;
                }
                buildBattleUI() {
                    this.hudBarsKey = this.hudGrooveKey = '';
                    this.hudBeatKey = -2;
                    const y = this.safeTop + 21, capsule = Primitives_js_1.card(this.hud, 'FlightCapsule', 22, y, this.w - 134, 42, '#142332df', '#94b6c340', 14);
                    Primitives_js_1.text(capsule, 'SECTOR', 10, 5, 40, 11, { size: 6, color: '#8ba9b7', wrap: false });
                    this.labels.level = Primitives_js_1.text(capsule, '01', 10, 16, 34, 24, { size: 18, bold: true, wrap: false });
                    Primitives_js_1.text(capsule, '/100', 38, 21, 28, 15, { size: 7, color: '#8197a6', wrap: false });
                    this.labels.time = Primitives_js_1.text(capsule, '65s', 75, 5, 70, 20, { size: 13, align: 'center', wrap: false });
                    this.labels.hp = Primitives_js_1.text(capsule, '◈ 100', 164, 12, 88, 25, { size: 12, align: 'right', color: '#b7e6cc', wrap: false });
                    const bars = Primitives_js_1.nodeAt(this.hud, 'Bars', 0, 0, this.w, this.h);
                    this.bars = bars.addComponent(cc_1.Graphics);
                    this.labels.boss = Primitives_js_1.text(this.hud, '', 46, y + 55, this.w - 92, 23, { size: 10, color: '#ffc99f', align: 'center', wrap: false });
                    this.labels.combo = Primitives_js_1.text(this.hud, '', this.w - 115, this.h * .25, 88, 55, { size: 25, color: '#c9f1df', bold: true, align: 'right' });
                    this.grooveBox = Primitives_js_1.nodeAt(this.hud, 'GrooveStatus', 25, this.h - 282 - this.safeBottom, this.w - 50, 48);
                    this.grooveGraphics = this.grooveBox.addComponent(cc_1.Graphics);
                    this.labels.phase = Primitives_js_1.text(this.grooveBox, '律动', 12, 7, 87, 23, { size: 15, bold: true, wrap: false });
                    this.labels.hits = Primitives_js_1.text(this.grooveBox, '', 90, 7, this.w - 165, 24, { size: 16, bold: true, color: '#ffedb0', align: 'right', wrap: false });
                    this.labels.instruction = Primitives_js_1.text(this.grooveBox, '点按或左右摇摆 · 踩拍强化', 12, 29, this.w - 74, 15, { size: 8, color: '#b3cbbd', align: 'center', wrap: false });
                    const beats = Primitives_js_1.nodeAt(this.hud, 'BeatLights', 0, 0, this.w, this.h);
                    this.beatGraphics = beats.addComponent(cc_1.Graphics);
                    Primitives_js_1.text(this.hud, '跟着光点 · 踩点强化', 25, this.h - 220 - this.safeBottom, 150, 16, { size: 8, color: '#94afb9', wrap: false });
                    this.labels.bpm = Primitives_js_1.text(this.hud, '116 BPM', this.w - 100, this.h - 220 - this.safeBottom, 75, 16, { size: 8, color: '#90a7af', align: 'right', wrap: false });
                    this.cannon = new CannonButton_js_1.CannonButton(this.hud, this.w / 2, this.h - 142 - this.safeBottom);
                    this.cannon.lite = this.save.settings.lite;
                    this.cannon.hitArea.on(cc_1.Node.EventType.TOUCH_START, this.onFireStart, this);
                    this.cannon.hitArea.on(cc_1.Node.EventType.TOUCH_MOVE, this.onFireMove, this);
                    this.cannon.hitArea.on(cc_1.Node.EventType.TOUCH_END, this.onTouchEnd, this);
                    this.cannon.hitArea.on(cc_1.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
                    this.labels.charge = Primitives_js_1.text(this.hud, '超载能量', 25, this.h - 35 - this.safeBottom, 80, 24, { size: 11, color: '#e4d5b2', wrap: false });
                    this.labels.energy = Primitives_js_1.text(this.hud, '0%', this.w - 65, this.h - 35 - this.safeBottom, 40, 24, { size: 12, color: '#f3e3b4', align: 'right', wrap: false });
                    this.tutorialBox = Primitives_js_1.card(this.hud, 'FirstLesson', 18, this.h * .29, this.w - 36, 130, '#10252eef', '#d5ecc0', 22);
                    this.tutorialTitle = Primitives_js_1.text(this.tutorialBox, '', 10, 17, this.w - 56, 42, { size: 23, color: '#f4e3a3', bold: true, align: 'center', wrap: false });
                    this.tutorialDetail = Primitives_js_1.text(this.tutorialBox, '', 10, 65, this.w - 56, 25, { size: 14, align: 'center', wrap: false });
                    this.tutorialWait = Primitives_js_1.text(this.tutorialBox, '', 10, 99, this.w - 56, 18, { size: 10, color: '#b3ccd4', align: 'center', wrap: false });
                    this.tutorialBox.active = false;
                }
                buildBanner() {
                    this.bannerMain = Primitives_js_1.text(this.bannerLayer, '', 20, this.h - 356 - this.safeBottom, this.w - 40, 35, { size: 22, color: '#fff0b9', bold: true, align: 'center', wrap: false });
                    this.bannerSub = Primitives_js_1.text(this.bannerLayer, '', 20, this.h - 320 - this.safeBottom, this.w - 40, 22, { size: 10, color: '#b3c3ba', align: 'center', wrap: false });
                }
                banner(title, sub = '', seconds = 1.5) { this.bannerMain.string = title; this.bannerSub.string = sub; this.bannerUntil = this.visualTime + seconds; }
                showPanel(title, eyebrow, close, reopen) {
                    this.closePanel();
                    this.panelReopen = reopen;
                    this.panel = new Primitives_js_1.Panel(this.modalLayer, this.w, this.h, title, eyebrow, close);
                    return this.panel;
                }
                closePanel() { this.intent++; this.loading = false; this.supportDemo?.destroy(); this.supportDemo = null; this.panel?.destroy(); this.panel = null; this.panelReopen = null; }
                backFromMenu() { if (this.mode === 'result' && this.battle)
                    this.showResult(this.battle.results);
                else if (this.mode === 'paused')
                    this.showPause();
                else
                    this.closePanel(); }
                onAudioGesture() {
                    if (this.destroyed || !this.save?.settings.sound)
                        return;
                    const context = this.audio.ctx;
                    if (context && (!context.state || context.state === 'running'))
                        return;
                    // Retry blocked/interrupted audio at the next user gesture.
                    // The simulation remains on its elapsed-time clock until audio is running.
                    if (this.mode === 'playing' && this.battle)
                        void this.ensureBattleAudio();
                    else
                        void this.audio.unlock();
                }
                async startCampaign() {
                    const ticket = ++this.intent;
                    await this.audio.unlock();
                    if (this.destroyed || ticket !== this.intent || this.mode !== 'home')
                        return;
                    if (!this.save.seen)
                        this.showBriefing();
                    else
                        this.launch(this.save.unlocked);
                }
                async launch(level, trained = false) {
                    const ticket = ++this.intent;
                    this.loading = true;
                    this.resetInput();
                    this.audio.stop();
                    this.previewLevel = null;
                    // Begin WebAudio resume synchronously inside the selection gesture,
                    // not after artReady (which loses Safari's transient activation).
                    const audioAttempt = this.audio.unlock();
                    try {
                        await this.artReady;
                        if (ticket !== this.intent || this.destroyed)
                            return;
                        await audioAttempt;
                    }
                    catch {
                        if (ticket === this.intent && !this.destroyed) {
                            this.loading = false;
                            this.banner('画面资源尚未准备好', '请重新打开游戏', 5);
                        }
                        return;
                    }
                    if (this.destroyed || ticket !== this.intent)
                        return;
                    this.closePanel();
                    this.lesson = level === 1 && !trained ? new tutorial_js_1.FirstLesson() : null;
                    const track = music_js_1.getTrack(level);
                    this.musicElapsed = 0;
                    this.activeRun = { id: 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2), receipt: null, salvage: 0, challengeRewards: [] };
                    this.battle = new engine_js_1.Battle(level, { width: this.w, height: this.h - this.safeBottom, seed: Date.now() % 999, tempo: track.bpm,
                        supports: this.save.support.equipped, motions: { ...this.save.support.motions }, growth: { ...this.save.growth }, finisher: 'wave', emit: (t, d) => this.onEvent(t, d) });
                    this.mode = 'playing';
                    this.home.active = false;
                    this.hud.active = true;
                    this.renderer.clear();
                    this.renderer.setChapter(this.battle.c.chapter);
                    this.resultWait = 0;
                    this.labels.level.string = String(level).padStart(2, '0');
                    this.labels.bpm.string = track.bpm + ' BPM';
                    this.audio.start(level, 0, !!this.lesson, true);
                    this.buildTop();
                    this.refreshHome();
                    this.loading = false;
                    this.banner(`第 ${String(level).padStart(2, '0')} 关`, campaign_js_1.campaignFor(level).name, 1.3);
                }
                goHome() {
                    this.resetInput();
                    this.persist();
                    this.audio.stop();
                    this.previewLevel = null;
                    this.closePanel();
                    this.lesson = null;
                    this.battle = null;
                    this.activeRun = null;
                    this.mode = 'home';
                    this.resultWait = 0;
                    this.home.active = true;
                    this.hud.active = false;
                    this.bannerUntil = 0;
                    this.renderer.clear();
                    this.renderer.setChapter(0);
                    this.buildTop();
                    this.refreshHome();
                }
                pauseGame() {
                    if (this.mode !== 'playing')
                        return;
                    // Pause at the last simulated position, including after a long interruption.
                    // The audio clock may have continued while JavaScript could not render.
                    this.musicElapsed = this.lesson ? this.musicElapsed : this.battle?.t ?? this.musicElapsed;
                    this.resetInput();
                    this.audio.stop();
                    this.mode = 'paused';
                    this.persist();
                    this.showPause();
                }
                async resume() {
                    if (this.mode !== 'paused' || !this.battle || this.battle.state !== 'playing')
                        return;
                    const ticket = ++this.intent, b = this.battle, runId = this.activeRun?.id;
                    await this.audio.unlock();
                    if (this.destroyed || ticket !== this.intent || this.mode !== 'paused' || b !== this.battle || runId !== this.activeRun?.id)
                        return;
                    this.resetInput();
                    this.closePanel();
                    this.mode = 'playing';
                    this.audio.start(b.c.level, this.musicElapsed, !!this.lesson, true);
                    this.buildTop();
                }
                onHide() { this.intent++; this.loading = false; if (this.mode === 'playing')
                    this.pauseGame();
                else {
                    this.resetInput();
                    this.audio.stop();
                    this.previewLevel = null;
                } this.persist(); }
                toggleSound() { this.save.settings.sound = !this.save.settings.sound; this.applyAudio(); if (this.save.settings.sound) {
                    if (this.mode === 'playing')
                        this.ensureBattleAudio();
                    else
                        this.audio.unlock();
                } this.persist(); this.buildTop(); }
                async ensureBattleAudio() {
                    const b = this.battle, run = this.activeRun, ticket = this.intent;
                    const unlocked = await this.audio.unlock();
                    if (unlocked && !this.destroyed && this.mode === 'playing' && !this.loading && this.battle === b && this.activeRun === run && this.intent === ticket && !this.audio.running)
                        this.audio.start(b.c.level, this.musicElapsed, !!this.lesson, true);
                }
                point(e) {
                    const p = e.getUILocation(), v = this.root.getComponent(cc_1.UITransform).convertToNodeSpaceAR(new cc_1.Vec3(p.x, p.y, 0));
                    return { x: v.x, y: -v.y };
                }
                aim(x, y) {
                    if (!this.battle)
                        return;
                    const nx = (x - this.battle.cx) / 75, ny = (y - this.battle.cy) / 75;
                    let direction = Math.hypot(nx, ny) < .25 ? null : { x: clamp(nx, -1, 1), y: Math.min(-.08, Math.max(-1, ny)) };
                    if (direction) {
                        const a = engine_js_1.aimAngleFor(direction);
                        direction = { x: Math.cos(a), y: Math.sin(a) };
                    }
                    this.battle.aim = direction;
                }
                onFireStart(e) {
                    if (this.mode !== 'playing' || this.panel || this.loading || this.pressed || this.battle?.clearing)
                        return;
                    const p = this.point(e);
                    if (Math.hypot(p.x - this.battle.cx, p.y - this.battle.cy) > 94)
                        return;
                    this.pointer = e.getID();
                    this.beginFire(p.x, p.y);
                    e.propagationStopped = true;
                }
                beginFire(x, y) {
                    if (!this.battle)
                        return;
                    this.pressed = true;
                    this.cannon.setHeld(true);
                    const now = this.audio.position(this.musicElapsed);
                    this.lesson?.down((x - this.battle.cx) / 75);
                    this.sway.reset((x - this.battle.cx) / 75, now);
                    this.aim(x, y);
                    this.ensureBattleAudio();
                    this.battle.rhythmTime = now;
                    this.battle.setHeld(true, this.phase());
                }
                onFireMove(e) {
                    if (!this.pressed || e.getID() !== this.pointer || this.mode !== 'playing')
                        return;
                    const p = this.point(e);
                    this.moveFire(p.x, p.y);
                    e.propagationStopped = true;
                }
                moveFire(x, y) {
                    this.aim(x, y);
                    const nx = (x - this.battle.cx) / 75, now = this.audio.position(this.musicElapsed);
                    this.lesson?.move(nx);
                    const peak = this.sway.move(nx, now);
                    if (peak && now - peak.time <= .22 && this.battle.swayBeat(peak.time))
                        this.renderer.label(peak.side < 0 ? '左 · 强拍' : '右 · 强拍', this.battle.cx + peak.side * 65, this.battle.cy - 105, '#ceffe4', 14, .7);
                }
                onTouchEnd(e) { if (this.pointer !== null && e.getID() === this.pointer)
                    this.resetInput(); }
                resetInput() { this.pointer = null; this.pressed = false; this.keys.clear(); this.sway.reset(); this.cannon?.reset(); if (this.battle) {
                    this.battle.held = false;
                    this.battle.aim = null;
                } }
                onKeyDown(e) {
                    if (e.keyCode === cc_1.KeyCode.ESCAPE) {
                        if (this.mode === 'playing')
                            this.pauseGame();
                        else if (this.mode === 'paused')
                            this.resume();
                        return;
                    }
                    if (this.mode !== 'playing' || this.panel || this.loading || !this.battle || this.battle.clearing)
                        return;
                    const was = this.keys.has(e.keyCode);
                    this.keys.add(e.keyCode);
                    if (e.keyCode === cc_1.KeyCode.SPACE && !was && !this.pressed)
                        this.beginFire(this.battle.cx, this.battle.cy);
                    if (this.pressed && (e.keyCode === cc_1.KeyCode.ARROW_LEFT || e.keyCode === cc_1.KeyCode.ARROW_RIGHT))
                        this.moveFire(this.battle.cx + (e.keyCode === cc_1.KeyCode.ARROW_LEFT ? -75 : 75), this.battle.cy - 10);
                }
                onKeyUp(e) { this.keys.delete(e.keyCode); if (e.keyCode === cc_1.KeyCode.SPACE && this.pointer === null)
                    this.resetInput(); }
                phase() { const beat = this.battle?.beatDuration || music_js_1.getTrack(this.previewLevel || 1).beat; const fallback = this.musicElapsed % beat; return this.audio.phase(fallback); }
                onEvent(type, data) {
                    this.renderer.event(type, data);
                    // The main cannon, press, release and perfect-beat actions are intentionally silent.
                    // Music drums continue to play; impacts, pickups and support cues keep their own channel.
                    if (['hurt', 'bossDown', 'overdrive'].includes(type))
                        this.audio.fx(type, data);
                    if (type === 'fire')
                        this.cannon.kick(!!data.perfect);
                    if (type === 'perfect')
                        this.lesson?.perfect();
                    if (type === 'rhythmCounter')
                        this.renderer.label('音浪 · 压住了', this.battle.cx, this.battle.cy - 155, '#d5ffb5', 16, .7);
                    if (type === 'pickup') {
                        this.audio.fx('pickup');
                        this.banner({ pierce: '贯穿火力', push: '重推脉冲', rush: '急奏追击' }[data.kind], '6秒强化', .9);
                    }
                    if (type === 'assaultWarning')
                        this.renderer.warning = { ...data, life: 2 * this.battle.beatDuration };
                    if (type === 'gravityBurst')
                        this.audio.fx('bossDown');
                    if (type === 'supportProgress')
                        this.save.support.stats[data.id][data.metric] += data.amount;
                    if (type === 'supportMilestone')
                        this.banner({ 4: '副炮成形', 8: '收割火力', 12: '追击全开' }[data.rank], '本关火力已保留', .9);
                    if (type === 'supportBurst') {
                        this.audio.fx('support', { rank: data.rank });
                        this.persist();
                        this.renderer.label('追加 ×' + data.count, this.battle.cx, this.battle.cy - 115, '#b9ffe3', 13, .7);
                    }
                    if (type === 'boss')
                        this.banner(data.name || '首领来袭', '', 1.2);
                    if (type === 'finisher')
                        this.banner('过热 · 低音波', '', 1.2);
                    if (type === 'musicPhase' && data.phase === 'climax')
                        this.banner('高潮 · 全炮口开放', '', 1.1);
                    if (type === 'climaxBurst') {
                        this.banner('重拍音爆', '', .7);
                        this.audio.fx('overdrive');
                    }
                    if (type === 'heal')
                        this.renderer.label('护盾 +' + (data.value || 8), this.battle.cx, this.battle.cy - 122, '#baffc6', 12, .8);
                    if (type === 'cleared') {
                        this.resetInput();
                        this.banner('星域已清', '', 3.5);
                    }
                    if (type === 'finish') {
                        this.mode = 'result';
                        this.musicElapsed = this.lesson ? this.musicElapsed : this.battle.t;
                        this.resetInput();
                        this.audio.finish(data.win);
                        this.activeRun.salvage = data.win ? 0 : growth_js_1.salvage(this.save.economy, this.activeRun.id, data.kills);
                        this.activeRun.challengeRewards = support_js_1.claimChallenges(this.save.support, data, this.save.economy);
                        if (data.win) {
                            this.activeRun.receipt = economy_js_1.awardClear(this.save.economy, this.activeRun.id, data.level, data.stars, !this.save.stars[data.level], data.kills);
                            this.save.stars[data.level] = Math.max(this.save.stars[data.level] || 0, data.stars);
                            this.save.best[data.level] = Math.max(this.save.best[data.level] || 0, data.score);
                            this.save.unlocked = Math.min(100, Math.max(this.save.unlocked, data.level + 1));
                        }
                        this.persist();
                        this.resultWait = data.win ? .3 : .65;
                    }
                }
                update(rawDt) {
                    if (!this.renderer || this.destroyed)
                        return;
                    const elapsed = Number.isFinite(rawDt) ? Math.max(0, rawDt) : 0;
                    const dt = Math.min(elapsed, .05);
                    this.visualTime += dt;
                    this.simulationSteps = 0;
                    if (this.resizePending)
                        this.rebuildLayout();
                    this.supportDemo?.update(dt);
                    if (this.mode === 'playing' && this.battle && !this.loading) {
                        const previous = this.musicElapsed;
                        const target = Math.max(previous, this.audio.position(previous + elapsed));
                        const gap = target - previous, audioState = this.audio.ctx?.state;
                        const interrupted = this.audio.running && (audioState === 'suspended' || audioState === 'interrupted' || audioState === 'closed');
                        if (interrupted || gap > clock_js_1.MAX_CATCHUP_SECONDS + 1e-8 || (!this.lesson && target - this.battle.t > clock_js_1.MAX_CATCHUP_SECONDS + 1e-8)) {
                            this.pauseGame();
                        }
                        else if (this.lesson?.done) {
                            this.save.swipeLearned = true;
                            this.persist();
                            this.launch(1, true);
                        }
                        else {
                            this.musicElapsed = target;
                            if (this.lesson) {
                                const scale = this.lesson.tick(gap, this.pressed);
                                this.simulationSteps = clock_js_1.advanceBattleBy(this.battle, gap * scale, previous, target);
                                this.battle.t = Math.min(this.battle.t, 10);
                                this.battle.hp = 100;
                            }
                            else {
                                this.simulationSteps = clock_js_1.advanceBattleTo(this.battle, target);
                            }
                            this.battle.rhythmTime = target;
                        }
                    }
                    if (this.resultWait > 0) {
                        this.resultWait -= dt;
                        if (this.resultWait <= 0 && this.battle)
                            this.showResult(this.battle.results);
                    }
                    if (this.mode === 'home' || this.mode === 'playing' || this.mode === 'result')
                        this.renderer.update(dt);
                    if (this.mode !== 'paused')
                        this.renderer.render(this.battle, this.visualTime, this.phase(), this.mode === 'home');
                    if (this.battle && this.mode !== 'paused')
                        this.updateHUD(dt);
                    if (this.visualTime > this.bannerUntil) {
                        this.bannerMain.string = '';
                        this.bannerSub.string = '';
                    }
                }
                updateHUD(dt) {
                    const b = this.battle, phase = this.phase(), beat = b.beatDuration, lit = Math.min(phase, beat - phase) < .13;
                    const index = Math.floor((b.rhythmTime + beat * .08) / beat) % 4, g = this.bars;
                    this.labels.time.string = b.clearing ? '已清场' : b.t < b.c.duration ? Math.ceil(b.c.duration - b.t) + 's' : '清场';
                    this.labels.hp.string = '◈ ' + Math.ceil(b.hp);
                    const boss = b.enemies.find((e) => e.boss);
                    this.labels.boss.string = boss ? '首领  ·  ' + Math.ceil(boss.hp / boss.maxHp * 100) + '%' : '';
                    this.labels.combo.string = b.combo >= 3 ? b.combo + '\n连击' : '';
                    const over = b.overdrive > 0, energy = over ? b.overdrive / 5.3 : b.energy / 100;
                    this.labels.charge.string = over ? '火力超载' : '超载能量';
                    this.labels.energy.string = over ? Math.ceil(b.overdrive) + 's' : Math.floor(b.energy) + '%';
                    // Half a design pixel is below one backing pixel on common phone layouts.
                    // Rebuild bar geometry only when a visible width actually changes.
                    const pixelWidth = (value) => Math.round(value * 2) / 2;
                    const timeWidth = pixelWidth(Math.max(3, 70 * Math.min(1, b.t / b.c.duration)));
                    const bossWidth = boss ? pixelWidth(Math.max(4, (this.w - 110) * Math.max(0, boss.hp / boss.maxHp))) : 0;
                    const energyWidth = energy > 0 ? pixelWidth(Math.max(8, (this.w - 180) * energy)) : 0;
                    const barsKey = timeWidth + '/' + bossWidth + '/' + energyWidth;
                    if (barsKey !== this.hudBarsKey) {
                        this.hudBarsKey = barsKey;
                        g.clear();
                        Primitives_js_1.rounded(g, 97, this.safeTop + 49, 70, 3, 1.5, '#334755');
                        Primitives_js_1.rounded(g, 97, this.safeTop + 49, timeWidth, 3, 1.5, '#b6dccb');
                        if (boss) {
                            Primitives_js_1.rounded(g, 55, this.safeTop + 97, this.w - 110, 4, 2, '#3a2939');
                            Primitives_js_1.rounded(g, 55, this.safeTop + 97, bossWidth, 4, 2, '#ffd1a4');
                        }
                        Primitives_js_1.rounded(g, 105, this.h - 29 - this.safeBottom, this.w - 180, 8, 4, '#263d48');
                        if (energyWidth)
                            Primitives_js_1.rounded(g, 105, this.h - 29 - this.safeBottom, energyWidth, 8, 4, '#edd08e');
                    }
                    const cue = b.director?.cueState(), phaseName = b.musicPhase || 'groove';
                    this.labels.phase.string = cue ? (cue.status === 'matched' ? '✓ 节拍压制' : cue.heavy ? '重甲 · 踩拍' : '群袭 · 踩拍') : { groove: '律动', build: '蓄势', climax: b.support.rank >= 8 ? '收割' : '高潮', outro: '收尾' }[phaseName];
                    this.labels.hits.string = cue ? cue.status === 'matched' ? '成功' : cue.status === 'hit' ? '现在！' : cue.count + ' 拍后' : b.clearing ? '' : `连拍 ${b.support.progress()}/3 · 副炮 ×${b.support.rank}`;
                    this.labels.instruction.string = phaseName === 'climax' ? '长按增强 · 踩中4拍追加音爆 · 漏拍不清零' : phaseName === 'build' ? '准备跟上鼓点，高潮马上到来' : phaseName === 'outro' ? '保持火力，完成收尾' : '点按或左右摇摆 · 踩拍强化';
                    const grooveKey = (over ? '1' : '0') + (lit ? '1' : '0');
                    if (grooveKey !== this.hudGrooveKey) {
                        this.hudGrooveKey = grooveKey;
                        this.grooveGraphics.clear();
                        Primitives_js_1.rounded(this.grooveGraphics, 0, 0, this.w - 50, 48, 12, over ? '#59452cee' : '#244239ee', lit ? '#eefac2' : '#a1d4ba', lit ? 2.4 : 1.5);
                    }
                    const beatKey = lit ? index : -1;
                    if (beatKey !== this.hudBeatKey) {
                        this.hudBeatKey = beatKey;
                        this.beatGraphics.clear();
                        for (let i = 0; i < 4; i++) {
                            this.beatGraphics.circle(this.w / 2 - 27 + i * 18, -(this.h - 211 - this.safeBottom), lit && i === index ? 5 : 3.5);
                            this.beatGraphics.fillColor = Primitives_js_1.color(lit && i === index ? '#e2ffd3' : '#3b6266');
                            this.beatGraphics.fill();
                        }
                    }
                    this.cannon.update(dt, this.visualTime, phase, beat, b.aim, over, this.renderer.skin?.color || '#a8fbd6', this.lesson?.stage === 1);
                    this.tutorialBox.active = !!this.lesson;
                    if (this.lesson) {
                        this.tutorialTitle.string = this.lesson.title;
                        this.tutorialDetail.string = this.lesson.detail;
                        this.tutorialWait.string = this.pressed ? '' : '子弹时间 · 等你操作';
                        this.tutorialBox.setScale(this.save.settings.lite ? 1 : lit ? 1.015 : 1, this.save.settings.lite ? 1 : lit ? 1.015 : 1, 1);
                    }
                }
                // Menus below are all native Cocos nodes, shared unchanged by both build targets.
                showBriefing() {
                    const p = this.showPanel('一根手指，守住防线。', 'PILOT BRIEFING / 飞行简报', () => this.closePanel(), () => this.showBriefing()), w = p.width;
                    const items = [
                        ['01', '按住大按钮，直接开火', '按住保持全向开火，护盾归零才会失败。'],
                        ['02', '踩准鼓点，波峰破敌', '长按发射细波，踩拍强化攻击。主炮升到5级后，踩拍向手指方向推出高伤害波峰。'],
                        ['03', '点按或左右摇摆', '转向顶点卡鼓点也有效。每连续3下强拍增加副炮数量，漏拍保留已有数量。'],
                    ];
                    items.forEach(([n, title, detail], i) => { const c = Primitives_js_1.card(p.body, 'Briefing' + n, 0, i * 128, w, 116, '#1c3040', '#7297a42a', 12); Primitives_js_1.text(c, n, 13, 15, 32, 32, { size: 20, color: '#a8dfc9', bold: true }); Primitives_js_1.text(c, title, 55, 15, w - 67, 30, { size: 14, bold: true }); Primitives_js_1.text(c, detail, 55, 49, w - 70, 60, { size: 11, color: '#a2bbc8' }); });
                    Primitives_js_1.text(p.body, '电脑：空格开火，按住空格配合方向键左右滑动。', 0, 386, w, 40, { size: 10, color: Primitives_js_1.palette.muted });
                    Primitives_js_1.button(p.body, 'briefing-go', '出发', 0, 432, w, 52, () => { this.save.seen = true; this.persist(); this.launch(this.save.unlocked); }, { primary: true, size: 15 });
                    p.finish(494);
                }
                showPause() {
                    if (!this.battle)
                        return;
                    const p = this.showPanel('稍作休整。', 'FLIGHT PAUSED', undefined, () => this.showPause()), w = p.width;
                    Primitives_js_1.text(p.body, `第 ${this.battle.c.level} 关 · ${engine_js_1.CHAPTERS[this.battle.c.chapter][0]}\n当前战斗已经暂停。`, 0, 0, w, 63, { size: 13, color: Primitives_js_1.palette.muted });
                    Primitives_js_1.text(p.body, this.equippedText(), 0, 73, w, 44, { size: 13, color: '#bde9d7' });
                    const choices = [['resume', '继续战斗', () => this.resume()], ['retry', '重新开始本关', () => this.launch(this.battle.c.level)], ['pause-settings', '声音与画面', () => this.showSettings()], ['pause-music', '唱片机 · 试听全部曲目', () => this.showMusic()], ['home', '返回主界面', () => this.goHome()]];
                    choices.forEach(([id, name, run], i) => Primitives_js_1.button(p.body, id, name, 0, 124 + i * 58, w, 46, run, { primary: i === 0 }));
                    p.finish(414);
                }
                showSettings() {
                    if (this.mode === 'playing') {
                        this.pauseGame();
                    }
                    const p = this.showPanel('声音与画面', 'SETTINGS', () => this.backFromMenu(), () => this.showSettings()), w = p.width;
                    Primitives_js_1.text(p.body, '音乐与音效', 0, 13, w - 82, 28, { size: 14 });
                    Primitives_js_1.button(p.body, 'toggle-sound', this.save.settings.sound ? '开启' : '关闭', w - 76, 6, 76, 34, () => { this.toggleSound(); this.showSettings(); }, { selected: this.save.settings.sound });
                    Primitives_js_1.slider(p.body, 'music-volume', '音乐音量', this.save.settings.musicVolume, 0, 72, w, v => { this.save.settings.musicVolume = v; this.applyAudio(); this.persist(); });
                    Primitives_js_1.slider(p.body, 'fx-volume', '战斗音效', this.save.settings.fxVolume, 0, 154, w, v => { this.save.settings.fxVolume = v; this.applyAudio(); this.persist(); });
                    Primitives_js_1.text(p.body, '主炮开火、按下和松开保持静音。', 0, 222, w, 25, { size: 10, color: Primitives_js_1.palette.muted });
                    Primitives_js_1.text(p.body, '轻量画面', 0, 280, w - 82, 25, { size: 14 });
                    Primitives_js_1.text(p.body, '减少粒子、屏幕震动与耗电', 0, 309, w - 82, 40, { size: 10, color: Primitives_js_1.palette.muted });
                    Primitives_js_1.button(p.body, 'toggle-lite', this.save.settings.lite ? '开启' : '关闭', w - 76, 282, 76, 34, () => { this.save.settings.lite = !this.save.settings.lite; this.renderer.resize(this.w, this.h, this.save.settings.lite); this.cannon.lite = this.save.settings.lite; this.persist(); this.showSettings(); }, { selected: this.save.settings.lite });
                    if (!Platform_js_1.storageAvailable)
                        Primitives_js_1.text(p.body, '当前环境未能保存进度，请保持游戏打开。', 0, 362, w, 40, { size: 11, color: '#f2cc9c' });
                    Primitives_js_1.button(p.body, 'settings-done', '完成', 0, 413, w, 46, () => this.backFromMenu());
                    p.finish(470);
                }
                equippedText() { return '律动装配 · ' + this.save.support.equipped.map((id) => support_js_1.SUPPORTS.find((s) => s.id === id)?.name).join(' + '); }
                showMap() {
                    if (this.mode === 'playing')
                        this.pauseGame();
                    const p = this.showPanel('星域地图', 'STAR CHART / 100 STAGES', () => this.backFromMenu(), () => this.showMap()), w = p.width;
                    const cw = (w - 24) / 5;
                    engine_js_1.CHAPTERS.forEach((_, i) => Primitives_js_1.button(p.body, 'chapter-' + (i + 1), String(i + 1).padStart(2, '0'), i % 5 * (cw + 6), Math.floor(i / 5) * 42, cw, 35, () => { this.mapChapter = i; this.showMap(); }, { selected: i === this.mapChapter, size: 12 }));
                    Primitives_js_1.text(p.body, `${String(this.mapChapter + 1).padStart(2, '0')} / ${engine_js_1.CHAPTERS[this.mapChapter][0]}`, 0, 98, w, 28, { size: 15, color: '#cee4e2' });
                    for (let i = 0; i < 10; i++) {
                        const n = this.mapChapter * 10 + i + 1, stars = this.save.stars[n] || 0;
                        const b = Primitives_js_1.button(p.body, 'level-' + n, '', i % 5 * (cw + 6), 139 + Math.floor(i / 5) * 82, cw, 72, () => { this.save.seen = true; this.persist(); this.launch(n); }, { enabled: n <= this.save.unlocked, selected: n === this.save.unlocked });
                        Primitives_js_1.text(b.node, String(n).padStart(2, '0'), 4, 10, cw - 8, 28, { size: 19, align: 'center', bold: true, wrap: false });
                        Primitives_js_1.text(b.node, stars ? '✦'.repeat(stars) : n > this.save.unlocked ? '未解锁' : campaign_js_1.campaignFor(n).name, 2, 44, cw - 4, 22, { size: 7, color: stars ? '#e3d596' : '#9ab0ba', align: 'center' });
                    }
                    Primitives_js_1.text(p.body, '每10关迎战星域首领，通关自动解锁下一关。\n连拍积累副炮火力，漏拍保留已攒成长。', 0, 321, w, 63, { size: 11, color: Primitives_js_1.palette.muted });
                    Primitives_js_1.button(p.body, 'map-continue', `前往第 ${this.save.unlocked} 关`, 0, 399, w, 48, () => { this.save.seen = true; this.persist(); this.launch(this.save.unlocked); }, { primary: true });
                    p.finish(460);
                }
                showGrowth() {
                    if (this.mode === 'playing')
                        this.pauseGame();
                    const p = this.showPanel('把火力推上去。', 'FIREPOWER WORKSHOP / 火力工坊', () => this.backFromMenu(), () => this.showGrowth()), w = p.width;
                    Primitives_js_1.text(p.body, '✧ 星屑  ' + this.save.economy.coins, 0, 0, w, 34, { size: 15, color: '#e2d7af', bold: true });
                    growth_js_1.UPGRADES.forEach((u, i) => {
                        const y = 45 + i * 159, c = Primitives_js_1.card(p.body, 'Upgrade:' + u.id, 0, y, w, 146, '#1b3040', '#8faebb35', 12);
                        Primitives_js_1.text(c, `${u.name} · Lv.${this.save.growth[u.id]}`, 13, 12, w - 26, 28, { size: 15, bold: true });
                        Primitives_js_1.text(c, u.text, 13, 45, w - 26, 42, { size: 11, color: '#a4bfca' });
                        const max = this.save.growth[u.id] >= u.max, cost = growth_js_1.upgradeCost(this.save.growth, u.id);
                        Primitives_js_1.button(c, 'upgrade-' + u.id, max ? '已满级' : cost + ' 星屑 · 升级', 13, 96, w - 26, 36, () => { if (growth_js_1.buyUpgrade(this.save.growth, this.save.economy, u.id)) {
                            this.persist();
                            this.refreshHome();
                            this.showGrowth();
                        } }, { enabled: !max && this.save.economy.coins >= cost, selected: !max && this.save.economy.coins >= cost });
                    });
                    Primitives_js_1.text(p.body, '升级下次出击生效，关卡不会随升级涨血。\n通关奖励包含击破回收，失败也可回收星屑。', 0, 530, w, 65, { size: 11, color: Primitives_js_1.palette.muted });
                    p.finish(595);
                }
                showSupport() {
                    if (this.mode === 'playing')
                        this.pauseGame();
                    const p = this.showPanel('副武器', 'RHYTHM ARSENAL', () => this.backFromMenu(), () => this.showSupport()), w = p.width;
                    Primitives_js_1.text(p.body, this.equippedText(), 0, 0, w, 41, { size: 12, color: '#c7eedb' });
                    Primitives_js_1.text(p.body, '每3下强拍，追加数量 +1。允许漏1拍，连漏2拍重计；已攒火力保留到本关结束。', 0, 47, w, 60, { size: 11, color: Primitives_js_1.palette.muted });
                    const sw = (w - 10) / 2;
                    support_js_1.SUPPORTS.forEach((s, i) => {
                        const slot = this.save.support.equipped.indexOf(s.id), unlocked = this.save.unlocked >= s.level;
                        const b = Primitives_js_1.button(p.body, 'support-' + s.id, '', i % 2 * (sw + 10), 119 + Math.floor(i / 2) * 115, sw, 104, () => this.showSupportDetail(s.id), { selected: slot >= 0 });
                        Primitives_js_1.text(b.node, '━', 12, 11, sw - 24, 21, { size: 24, color: s.color, align: 'center' });
                        Primitives_js_1.text(b.node, s.name, 12, 42, sw - 24, 23, { size: 13, bold: true, align: 'center', wrap: false });
                        Primitives_js_1.text(b.node, unlocked ? slot >= 0 ? '槽位 ' + (slot + 1) + ' · 使用中' : '已解锁 · 查看与搭配' : '第 ' + s.level + ' 关解锁', 12, 74, sw - 24, 20, { size: 8, color: Primitives_js_1.palette.muted, align: 'center' });
                    });
                    Primitives_js_1.button(p.body, 'support-growth', '火力工坊 · 永久升级', 0, 476, w, 43, () => this.showGrowth());
                    Primitives_js_1.button(p.body, 'support-challenges', '律动挑战 · ' + Object.values(this.save.support.challenges).filter(Boolean).length + '/3', 0, 531, w, 43, () => this.showChallenges());
                    Primitives_js_1.text(p.body, '使用中积攒熟练度，解锁不同飞行动作。\n装配在下次出击生效。', 0, 590, w, 50, { size: 10, color: Primitives_js_1.palette.muted });
                    p.finish(646);
                }
                showSupportDetail(id) {
                    const s = support_js_1.SUPPORTS.find((s) => s.id === id), unlocked = this.save.unlocked >= s.level, stats = this.save.support.stats[id];
                    const p = this.showPanel(s.name, unlocked ? 'UNLOCKED / 攻击动作' : 'SECTOR ' + String(s.level).padStart(2, '0'), () => this.showSupport(), () => this.showSupportDetail(id)), w = p.width;
                    const preview = Primitives_js_1.card(p.body, 'SupportPreview', 0, 0, w, 137, '#071522', '#8cbbc140', 13);
                    Primitives_js_1.text(p.body, s.text, 0, 151, w, 42, { size: 12, color: Primitives_js_1.palette.muted });
                    this.supportDemo = new SupportPreviewView_js_1.SupportPreviewView(preview, w, 137, id, this.save.support.motions[id], this.save.settings.lite);
                    support_js_1.MOTIONS.forEach((m, i) => {
                        const available = support_js_1.unlockedMotion(this.save.support, id, m.id), selected = this.save.support.motions[id] === m.id;
                        const b = Primitives_js_1.button(p.body, 'motion-' + m.id, '', 0, 205 + i * 75, w, 66, () => { if (available) {
                            this.save.support.motions[id] = m.id;
                            this.persist();
                            this.showSupportDetail(id);
                        } }, { enabled: available, selected });
                        Primitives_js_1.text(b.node, m.name, 12, 5, w - 24, 19, { size: 13, lineHeight: 18, bold: true, align: 'center', wrap: false });
                        Primitives_js_1.text(b.node, m.text, 12, 27, w - 24, 16, { size: 9, lineHeight: 14, color: Primitives_js_1.palette.muted, align: 'center', wrap: false });
                        const status = available ? selected ? '使用中' : '切换' : { groups: '三连触发', kills: '专属击破', climax: '高潮三连' }[m.metric] + ' · ' + Math.min(stats[m.metric], m.goal) + ' / ' + m.goal;
                        Primitives_js_1.text(b.node, status, 12, 47, w - 24, 16, { size: 9, lineHeight: 14, color: '#c5d9cf', align: 'center', wrap: false });
                    });
                    for (let slot = 0; slot < 2; slot++)
                        Primitives_js_1.button(p.body, 'equip-' + slot, (this.save.support.equipped[slot] === id ? '已装配到' : '装入') + '槽位 ' + (slot + 1), slot * (w + 10) / 2, 522, (w - 10) / 2, 44, () => { if (support_js_1.equipSupport(this.save.support, id, this.save.unlocked, slot)) {
                            this.persist();
                            this.showSupportDetail(id);
                        } }, { enabled: unlocked });
                    if (!unlocked)
                        Primitives_js_1.text(p.body, '到达第 ' + s.level + ' 关自动解锁，无需抽取。', 0, 583, w, 32, { size: 11, color: Primitives_js_1.palette.muted });
                    p.finish(625);
                }
                showChallenges() {
                    const p = this.showPanel('给这一局定个目标。', 'RHYTHM TRIALS', () => this.showSupport(), () => this.showChallenges()), w = p.width;
                    support_js_1.CHALLENGES.forEach((c, i) => {
                        const n = Primitives_js_1.card(p.body, 'Challenge:' + c.id, 0, i * 174, w, 162, '#1b3040', '#7297a42a', 12);
                        Primitives_js_1.text(n, c.name, 13, 13, w - 26, 27, { size: 15, bold: true });
                        Primitives_js_1.text(n, c.text, 13, 47, w - 26, 43, { size: 11, color: Primitives_js_1.palette.muted });
                        Primitives_js_1.text(n, this.save.support.challenges[c.id] ? '已完成 · 120星屑已领取' : '首次完成 +120 星屑', 13, 91, w - 26, 20, { size: 10, color: '#e2d39f' });
                        Primitives_js_1.button(n, 'challenge-' + c.id, this.save.unlocked < c.level ? '到达第' + c.level + '关开放' : '挑战第' + c.level + '关', 13, 118, w - 26, 32, () => this.launch(c.level), { enabled: this.save.unlocked >= c.level });
                    });
                    p.finish(526);
                }
                showHangar() {
                    if (this.mode === 'playing')
                        this.pauseGame();
                    const p = this.showPanel('换个频率出场。', 'HANGAR / 机库外观', () => this.backFromMenu(), () => this.showHangar()), w = p.width;
                    Primitives_js_1.text(p.body, '✧ 星屑  ' + this.save.economy.coins, 0, 0, w, 30, { size: 15, color: '#e2d7af' });
                    const sw = (w - 10) / 2;
                    economy_js_1.SKINS.forEach((s, i) => {
                        const owned = this.save.economy.owned.includes(s.id), selected = s.id === this.save.economy.equipped;
                        const b = Primitives_js_1.button(p.body, 'skin-' + s.id, '', i % 2 * (sw + 10), 45 + Math.floor(i / 2) * 166, sw, 155, () => { if (economy_js_1.buySkin(this.save.economy, s.id)) {
                            this.persist();
                            this.refreshHome();
                            this.showHangar();
                        } }, { selected, enabled: owned || this.save.economy.coins >= s.cost });
                        const orb = Primitives_js_1.nodeAt(b.node, 'SkinOrb', sw / 2, 36), g = orb.addComponent(cc_1.Graphics);
                        g.circle(0, 0, 21);
                        g.strokeColor = Primitives_js_1.color(s.color, .22);
                        g.lineWidth = 8;
                        g.stroke();
                        g.circle(0, 0, 19);
                        g.strokeColor = Primitives_js_1.color(s.color);
                        g.lineWidth = 2;
                        g.stroke();
                        g.circle(0, 0, 6);
                        g.fillColor = Primitives_js_1.color(s.secondary);
                        g.fill();
                        Primitives_js_1.text(b.node, s.name, 8, 71, sw - 16, 24, { size: 13, bold: true, align: 'center', wrap: false });
                        Primitives_js_1.text(b.node, s.description, 8, 99, sw - 16, 23, { size: 9, color: Primitives_js_1.palette.muted, align: 'center' });
                        Primitives_js_1.text(b.node, selected ? '使用中' : owned ? '换上' : s.cost + ' 星屑', 8, 126, sw - 16, 23, { size: 11, color: s.color, align: 'center' });
                    });
                    p.finish(553);
                }
                showMusic(genre = this.musicGenre) {
                    if (this.mode === 'playing')
                        this.pauseGame();
                    this.musicGenre = genre;
                    const close = () => { this.audio.stop(); this.previewLevel = null; this.backFromMenu(); };
                    const p = this.showPanel('星际唱片机', '100 TRACKS / 原创合成编曲', close, () => this.showMusic(genre)), w = p.width, tw = (w - 24) / 5;
                    ['Funk', '蓝调', 'Disco', '灵魂乐', '爵士', 'Boogie', '拉丁', '碎拍', '电子', '摇滚'].forEach((name, i) => Primitives_js_1.button(p.body, 'genre-' + i, name, i % 5 * (tw + 6), Math.floor(i / 5) * 38, tw, 32, () => this.showMusic(i), { size: 10, selected: i === genre }));
                    Primitives_js_1.text(p.body, music_js_1.STYLES[genre].name + ' · 每一关都有自己的律动', 0, 87, w, 35, { size: 11, color: Primitives_js_1.palette.muted });
                    const songs = Array.from({ length: 10 }, (_, i) => music_js_1.getTrack(i * 10 + genre + 1));
                    songs.forEach((t, i) => {
                        const active = this.previewLevel === t.level, b = Primitives_js_1.button(p.body, 'track-' + t.level, '', 0, 131 + i * 70, w, 61, async () => {
                            const ticket = ++this.intent;
                            if (this.previewLevel === t.level) {
                                this.audio.stop();
                                this.previewLevel = null;
                            }
                            else {
                                await this.audio.unlock();
                                if (this.destroyed || ticket !== this.intent || this.panel !== p)
                                    return;
                                this.save.settings.sound = true;
                                this.applyAudio();
                                this.persist();
                                this.previewLevel = t.level;
                                this.audio.start(t.level);
                                this.buildTop();
                            }
                            if (this.panel === p && !this.destroyed)
                                this.showMusic(genre);
                        }, { selected: active });
                        Primitives_js_1.text(b.node, String(t.level).padStart(2, '0') + ' · ' + t.name, 12, 4, w - 24, 20, { size: 13, lineHeight: 18, bold: true, align: 'center', wrap: false });
                        Primitives_js_1.text(b.node, t.bpm + ' BPM · ' + (t.swing > .1 ? '摇摆节拍' : '切分律动'), 12, 26, w - 24, 15, { size: 9, lineHeight: 13, color: Primitives_js_1.palette.muted, align: 'center', wrap: false });
                        Primitives_js_1.text(b.node, active ? '暂停' : '试听', 12, 44, w - 24, 14, { size: 9, lineHeight: 12, color: '#bcead4', align: 'center', wrap: false });
                    });
                    Primitives_js_1.text(p.body, '点击试听，出击自动播放当前关卡曲目。', 0, 844, w, 35, { size: 10, color: Primitives_js_1.palette.muted });
                    p.finish(886);
                }
                showResult(r, notice = '') {
                    if (!r || !this.activeRun)
                        return;
                    const complete = r.win && r.level === 100;
                    const p = this.showPanel(complete ? '星海已清，防线仍在。' : r.win ? '防线守住了。' : '再来一次，轰回去。', `SECTOR ${String(Math.floor((r.level - 1) / 10) + 1).padStart(2, '0')} · STAGE ${String(r.level).padStart(2, '0')} / 100`, undefined, () => this.showResult(r, notice)), w = p.width;
                    Primitives_js_1.text(p.body, '✦'.repeat(r.stars) + '·'.repeat(3 - r.stars), 0, 0, w, 62, { size: 41, color: '#e7e7b2', align: 'center' });
                    Primitives_js_1.text(p.body, r.score.toLocaleString(), 0, 74, w, 63, { size: 38, bold: true, color: '#d8f4df', align: 'center' });
                    [[r.kills, '击破'], [r.perfects, '踩点强化'], [r.maxCombo, '最高连击']].forEach(([value, name], i) => { Primitives_js_1.text(p.body, String(value), i * w / 3, 146, w / 3, 35, { size: 23, align: 'center' }); Primitives_js_1.text(p.body, String(name), i * w / 3, 183, w / 3, 20, { size: 10, align: 'center', color: Primitives_js_1.palette.muted }); });
                    const receipt = this.activeRun.receipt;
                    let y = 222;
                    if (receipt || this.activeRun.salvage) {
                        const reward = receipt ? receipt.base * (receipt.bonus ? 2 : 1) : this.activeRun.salvage;
                        const c = Primitives_js_1.card(p.body, 'RewardReceipt', 0, y, w, 48, '#29433b', '#a2cfaa55', 10);
                        Primitives_js_1.text(c, `✧ 星屑  +${reward}          ${receipt?.bonus ? '双倍已领取' : '已入账'}`, 12, 13, w - 24, 27, { size: 13, color: '#e4e7bc' });
                        y += 64;
                    }
                    const rewardNames = this.activeRun.challengeRewards || [], unlock = r.win ? support_js_1.SUPPORTS.find((s) => s.level === r.level + 1) : null;
                    Primitives_js_1.text(p.body, notice || (unlock ? '已解锁 ' + unlock.name + '，前往副武器装配。' : rewardNames.length ? '挑战完成 · ' + rewardNames.join('、') + ' · +' + rewardNames.length * 120 + '星屑' : r.win ? `剩余护盾 ${r.hp}% · 副炮成长 ×${r.supportRank || 0}` : '对准来敌踩拍，波峰击破厚血怪物。'), 0, y, w, 47, { size: 11, align: 'center', color: Primitives_js_1.palette.muted });
                    y += 60;
                    Primitives_js_1.button(p.body, 'result-next', r.win && !complete ? '下一关 · ' + String(r.level + 1).padStart(2, '0') : '再战本关', 0, y, w, 51, () => this.launch(r.win && !complete ? r.level + 1 : r.level), { primary: true, size: 15 });
                    y += 64;
                    const revive = !r.win && !this.battle.revived && !this.battle.timedOut;
                    if (this.ads.available && (r.win && receipt && !receipt.bonus || revive)) {
                        Primitives_js_1.button(p.body, 'reward-ad', r.win ? '广告 · 完整观看再得 ' + receipt.base + ' 星屑' : '广告 · 完整观看恢复60护盾', 0, y, w, 46, () => this.offerReward(r.win ? 'clear_double' : 'revive', r));
                        y += 58;
                    }
                    if (revive) {
                        Primitives_js_1.button(p.body, 'coin-revive', `${economy_js_1.REVIVE_COST} 星屑续战 · 当前 ${this.save.economy.coins}`, 0, y, w, 44, () => { if (this.battle.state === 'lost' && !this.battle.revived && economy_js_1.buyRevive(this.save.economy)) {
                            this.persist();
                            this.reviveBattle();
                        } }, { enabled: this.save.economy.coins >= economy_js_1.REVIVE_COST });
                        y += 56;
                    }
                    const actions = [['result-map', '星域地图', () => { this.mapChapter = Math.floor((r.level - 1) / 10); this.showMap(); }], ['result-support', '副武器', () => this.showSupport()], ['result-hangar', '机库外观', () => this.showHangar()], ['result-home', '主界面', () => this.goHome()]];
                    actions.forEach(([id, name, run], i) => Primitives_js_1.button(p.body, id, name, i % 2 * (w + 10) / 2, y + Math.floor(i / 2) * 48, (w - 10) / 2, 38, run, { size: 11 }));
                    p.finish(y + 99);
                }
                reviveBattle() { if (!this.battle.revive())
                    return; this.musicElapsed = this.lesson ? this.musicElapsed : this.battle.t; this.renderer.clear(); this.mode = 'paused'; this.resultWait = 0; this.resume(); }
                offerReward(placement, r) {
                    const p = this.showPanel('自愿观看 · 额外奖励', 'OPTIONAL REWARD', () => this.showResult(r), () => this.offerReward(placement, r)), w = p.width;
                    Primitives_js_1.text(p.body, placement === 'clear_double' ? `完整观看广告后额外获得 ${this.activeRun.receipt.base} 星屑。` : '完整观看广告后恢复60护盾，本局可续战一次。', 0, 0, w, 75, { size: 14 });
                    Primitives_js_1.text(p.body, '提前关闭不会获得额外奖励，普通奖励照常保留。', 0, 91, w, 60, { size: 12, color: Primitives_js_1.palette.muted });
                    Primitives_js_1.button(p.body, 'ad-watch', '观看广告并领取', 0, 166, w, 48, () => this.requestReward(placement, r), { primary: true });
                    Primitives_js_1.button(p.body, 'ad-decline', '暂时不要', 0, 229, w, 42, () => this.showResult(r));
                    p.finish(286);
                }
                async requestReward(placement, r) {
                    if (!this.ads.available || this.mode !== 'result')
                        return;
                    const runId = this.activeRun.id;
                    this.mode = 'ad';
                    this.audio.stop();
                    this.resetInput();
                    const p = this.showPanel('正在加载广告…', 'REWARDED VIDEO', undefined, () => { });
                    Primitives_js_1.text(p.body, '普通奖励已经保留。', 0, 10, p.width, 40, { size: 13, color: Primitives_js_1.palette.muted });
                    p.finish(90);
                    const outcome = await this.ads.reward(placement);
                    if (this.destroyed || this.activeRun?.id !== runId)
                        return;
                    this.mode = 'result';
                    if (outcome.earned) {
                        if (placement === 'clear_double') {
                            economy_js_1.awardDouble(this.save.economy, runId);
                            this.persist();
                            this.showResult(r, '额外星屑已领取。');
                        }
                        else
                            this.reviveBattle();
                    }
                    else
                        this.showResult(r, outcome.status === 'cancelled' ? '已取消，普通奖励照常保留。' : '本次未获得广告奖励，可以照常继续游戏。');
                }
                onDestroy() {
                    this.destroyed = true;
                    this.intent++;
                    this.persist();
                    this.audio.dispose();
                    this.ads.dispose();
                    this.supportDemo?.destroy();
                    this.renderer?.destroy?.();
                    cc_1.input.off(cc_1.Input.EventType.TOUCH_START, this.onAudioGesture, this);
                    cc_1.input.off(cc_1.Input.EventType.TOUCH_END, this.onTouchEnd, this);
                    cc_1.input.off(cc_1.Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
                    cc_1.input.off(cc_1.Input.EventType.KEY_DOWN, this.onKeyDown, this);
                    cc_1.input.off(cc_1.Input.EventType.KEY_UP, this.onKeyUp, this);
                    cc_1.game.off(cc_1.Game.EVENT_HIDE, this.onHide, this);
                    cc_1.view.off('canvas-resize', this.onResize, this);
                }
            };
            Pulsefront = __decorate([
                ccclass('Pulsefront')
            ], Pulsefront);
            exports_1("Pulsefront", Pulsefront);
        }
    };
});
