import { _decorator, Component, Node, UITransform, UIOpacity, BlockInputEvents, SpriteFrame, resources, view, ResolutionPolicy, input, Input, game, Game, sys, Label, Texture2D, Sprite, ImageAsset } from 'cc';
import { Combat, UPGRADES, UpgradeId, Mode, dayKey, RULESET } from './core/Combat';
import { getTrack } from './core/music';
import { Audio } from './core/Audio';
import { Progress, host } from './platform/Progress';
import { Rewarded } from './platform/Rewarded';
import { incoming, shareChallenge, publishDaily, leaderboardKey, Challenge } from './platform/Social';
import { BattleView } from './view/BattleView';
import { node, text, button, box, color, COLORS, icon, Icon, meter, divider, installTheme, disposeTheme } from './view/UI';
import { viewportLayout, homeLayout, arenaLayout } from './core/Layout';
import { AimGesture } from './core/AimGesture';
import { LaunchGate, scatterPose } from './core/Launch';
const { ccclass } = _decorator;
@ccclass('Pulsefront')
export class Pulsefront extends Component {
  private progress!: Progress; private audio = new Audio(); private ads = new Rewarded(); private run: Combat | null = null;
  private root!: Node; private ui!: Node; private world!: BattleView; private panel: Node | null = null; private labels: Record<string, Label> = {};
  private page = 'loading'; private h = 840; private safeTop = 24; private safeBottom = 12; private clock = 0; private uiClock = 0; private loading = false;
  private pointer: number | null = null; private gesture = new AimGesture(); private designWidth = 420; private left = 0; private viewportKey = ''; private modalName = ''; private sectorPage = 0;
  private hpMeter: ReturnType<typeof meter> | null = null; private bossMeter: ReturnType<typeof meter> | null = null; private shots = 0; private hits = 0; private kills = 0; private pulses = 0; private lastVibration = -10;
  private runId = ''; private hidden = false; private target: Challenge | null = null; private alive = true; private countdown = 0; private afterCountdown: (() => void) | null = null;
  private frameStats = { frames: 0, totalMs: 0, slowFrames: 0, maxMs: 0 }; private leaderboardTexture: Texture2D | null = null; private leaderboardFrame: SpriteFrame | null = null; private leaderboardImage: ImageAsset | null = null; private leaderClock = 0;
  private wxInterrupt: (() => void) | null = null; private wxInterruptEnd: (() => void) | null = null;
  private launchGate: LaunchGate | null = null; private launchLayer: Node | null = null; private homeCaption: Node | null = null;
  private launchHUD: UIOpacity | null = null; private launchBlock: Node | null = null; private launchRelayout = false; private firstFlight = false;
  private departures: { node: Node; x: number; y: number; dx: number; dy: number; angle: number; opacity: UIOpacity; delay: number }[] = [];
  async onLoad() {
    this.progress = new Progress(sys.localStorage); this.audio.muted = !this.progress.save.sound; this.target = incoming();
    this.measureViewport();
    this.root = node(this.node, 'PulsefrontV2', -210, -this.h / 2, 420, this.h);
    const loading = text(this.root, '正在校准脉冲…', 30, this.h / 2 - 20, 360, 40, 21, COLORS.mint, 'center');
    try { const assets: Record<string, SpriteFrame> = {}; await Promise.all(['deep-space', 'cannon', 'enemies', 'ui-panel', 'ui-button', 'ui-icons'].map(name => new Promise<void>((resolve, reject) => resources.load('art/' + name + '/spriteFrame', SpriteFrame, (e, f) => { if (e) reject(e); else { assets[name] = f; resolve(); } })))); if (!this.alive) return;
      loading.node.destroy(); installTheme(assets, () => { this.audio.activate(); this.audio.feedback('ui'); }); this.world = new BattleView(this.root, this.h, assets); this.world.resize(this.h, this.designWidth, this.safeTop, this.safeBottom); this.ui = node(this.root, 'Interface', 0, 0, 420, this.h); this.home(); view.on('canvas-resize', this.onViewportResize, this);
    } catch (e: any) { loading.string = '画面资源未载入，请重新打开。'; console.error(e); return; }
    input.on(Input.EventType.TOUCH_START, this.touchStart, this); input.on(Input.EventType.TOUCH_MOVE, this.touchMove, this); input.on(Input.EventType.TOUCH_END, this.touchEnd, this); input.on(Input.EventType.TOUCH_CANCEL, this.touchEnd, this);
    input.on(Input.EventType.MOUSE_DOWN, this.touchStart, this); input.on(Input.EventType.MOUSE_MOVE, this.touchMove, this); input.on(Input.EventType.MOUSE_UP, this.touchEnd, this); input.on(Input.EventType.KEY_DOWN, this.keyDown, this); input.on(Input.EventType.KEY_UP, this.keyUp, this); game.on(Game.EVENT_HIDE, this.onHide, this); game.on(Game.EVENT_SHOW, this.onShow, this);
    const wx = host(); if (wx) { if (wx.showShareMenu) wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] }); this.wxInterrupt = () => this.onHide(); this.wxInterruptEnd = () => this.onShow(); if (wx.onAudioInterruptionBegin) wx.onAudioInterruptionBegin(this.wxInterrupt); if (wx.onAudioInterruptionEnd) wx.onAudioInterruptionEnd(this.wxInterruptEnd); }
    (globalThis as any).pulsefront = Object.freeze({ version: '2.2.0-cocos-launch.1', engine: 'Cocos 3.8.8', snapshot: () => ({ page: this.page, viewport: { width: this.designWidth, height: this.h, left: this.left }, run: this.run ? this.run.snapshot() : null, pools: this.world.counts(), frameStats: { ...this.frameStats }, audio: this.audio.diagnostics(), adsConfigured: this.ads.available, storageAvailable: this.progress.available, rules: RULESET }) });
  }
  private measureViewport() {
    const frame = view.getFrameSize(), layout = viewportLayout(frame.width, frame.height);
    this.h = layout.height; this.designWidth = layout.width; this.left = layout.left; this.safeTop = 16; this.safeBottom = 14;
    view.setDesignResolutionSize(layout.width, layout.height, ResolutionPolicy.FIXED_WIDTH);
    try {
      const wx = host(), info = wx && (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync());
      if (info) { const scale = layout.width / info.windowWidth, capsule = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); this.safeTop = Math.max(16, (capsule ? capsule.bottom : info.safeArea ? info.safeArea.top : 0) * scale + 8); this.safeBottom = Math.max(14, info.safeArea ? (info.windowHeight - info.safeArea.bottom) * scale : 14); }
      else { const g: any = globalThis, probe = g.document && g.document.getElementById('safe-area-probe'); if (probe) { const css = g.getComputedStyle(probe), scale = layout.width / frame.width; this.safeTop = Math.max(16, parseFloat(css.paddingTop) * scale + 8); this.safeBottom = Math.max(14, parseFloat(css.paddingBottom) * scale + 8); } }
    } catch {}
    this.viewportKey = Math.round(frame.width) + 'x' + Math.round(frame.height);
  }
  private onViewportResize() {
    if (!this.world || !this.alive) return;
    const frame = view.getFrameSize(), key = Math.round(frame.width) + 'x' + Math.round(frame.height); if (key === this.viewportKey) return;
    this.release(); const modal = this.modalName; this.measureViewport(); this.root.setPosition(-210, this.h / 2); this.root.getComponent(UITransform)!.setContentSize(420, this.h); this.ui.getComponent(UITransform)!.setContentSize(420, this.h); this.world.resize(this.h, this.designWidth, this.safeTop, this.safeBottom);
    if (this.page === 'home') { this.home(); if (modal === 'growth') this.growth(); else if (modal === 'friends') this.friends(); else if (modal === 'sectors') this.sectors(this.sectorPage); }
    else if (this.page === 'result') this.result();
    else if (this.page === 'upgrade') { this.battleUI(); this.draft(); }
    else if (this.page === 'guide') this.guide();
    else if (this.page === 'paused') { this.battleUI(); this.page = 'playing'; this.pause(); }
    else if (this.page === 'countdown') { this.battleUI(); this.labels.countdown = text(this.ui, String(Math.ceil(this.countdown)), 110, this.h * .36, 200, 100, 76, COLORS.gold, 'center', true); }
    else if (this.page === 'playing') this.battleUI();
    else if (this.page === 'launching') { this.launchRelayout = true; if (this.launchBlock) { this.launchBlock.setPosition(-this.left, 0); this.launchBlock.getComponent(UITransform)!.setContentSize(this.designWidth, this.h); } }
  }
  private clearUI() { if (this.panel) this.closePanel(); for (const child of this.ui.children.slice()) child.destroy(); this.labels = {}; this.hpMeter = this.bossMeter = null; }
  private home() {
    this.audio.pause(); this.release(); this.run = null; this.page = 'home'; this.modalName = ''; this.clearUI(); const top = this.safeTop, layout = homeLayout(this.h, top, this.safeBottom);
    text(this.ui, 'P U L S E F R O N T', 25, top, 280, 23, 13, COLORS.mint);
    button(this.ui, 'sound', this.progress.save.sound ? '♫' : '静', 354, top - 2, 44, 42, () => { this.progress.save.sound = !this.progress.save.sound; this.audio.muted = !this.progress.save.sound; this.progress.persist(); this.home(); });
    text(this.ui, '脉冲防线', 23, top + 30, 370, 62, 46, COLORS.gold, 'left', true);
    divider(this.ui, 26, top + 100, 132); text(this.ui, '跟着鼓点，击穿敌潮', 26, top + 107, 360, 26, 16, COLORS.muted);
    const fireSize = Math.min(43, layout.heroSize * .16);
    this.homeCaption = node(this.ui, 'CannonCaption', 210, layout.heroY);
    text(this.homeCaption, '开火', -80, -fireSize * .55, 160, fireSize * 1.4, fireSize, COLORS.gold, 'center', true);
    text(this.homeCaption, '108 BPM', -70, fireSize, 140, 23, 13, COLORS.mint, 'center');
    const fireHit = node(this.ui, 'FireDisc', 210 - layout.heroSize / 2, layout.heroY - layout.heroSize / 2, layout.heroSize, layout.heroSize);
    fireHit.on(Node.EventType.TOUCH_END, () => this.begin('campaign', this.progress.save.unlocked)); fireHit.on(Node.EventType.MOUSE_UP, () => this.begin('campaign', this.progress.save.unlocked));
    button(this.ui, 'daily', this.target ? '好友挑战 · ' + this.target.score.toLocaleString() + ' 分' : '每日挑战 · 90 秒', 20, layout.dailyY, 380, 55, () => this.begin('daily', 8), false, true, 'wave');
    text(this.ui, '今日最高 ' + this.progress.today().toLocaleString() + '   ·   统一初始火力', 24, layout.dailyY + 56, 372, 22, 13, COLORS.muted, 'center');
    const nav: [string, string, Icon, () => void][] = [['growth', '工坊', 'cannon', () => this.growth()], ['friends', '好友榜', 'medal', () => this.friends()], ['sectors', '星域', 'orbit', () => this.sectors()]];
    nav.forEach(([id, title, art, action], i) => { const b = button(this.ui, id, '', 20 + i * 130, layout.navY, 120, 62, action); icon(b.face, art, 9, 9, 42); text(b.face, title, 50, 7, 59, 48, 16, COLORS.text, 'center'); });
    icon(this.ui, 'cell', 23, layout.footerY - 2, 25); text(this.ui, this.progress.save.coins.toLocaleString(), 53, layout.footerY - 1, 160, 24, 15, COLORS.gold, 'left', true);
    text(this.ui, '2.2 · 一触出击', 225, layout.footerY, 172, 22, 12, COLORS.muted, 'right');
  }
  private modal(title: string, subtitle: string, art: Icon = 'wave') {
    this.closePanel(); this.panel = node(this.ui, 'Modal', 0, 0, 420, this.h); const shade = box(this.panel, 'Shade', -this.left, 0, this.designWidth, this.h, '#001016e9', '#001016', 0);
    shade.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; });
    const scale = Math.min(1, (this.h - this.safeTop - this.safeBottom - 24) / 586), y = this.safeTop + (this.h - this.safeTop - this.safeBottom - 586 * scale) / 2;
    const body = box(this.panel, 'Panel', (420 - 376 * scale) / 2, y, 376, 586); body.setScale(scale, scale, 1);
    icon(body, art, 23, 25, 49); text(body, title, 82, 25, 268, 43, 28, COLORS.gold, 'left', true); text(body, subtitle, 27, 80, 322, 43, 15, COLORS.muted); divider(body, 28, 129, 320);
    return body;
  }
  private closePanel() { if (this.leaderboardTexture) { const wx = host(); if (wx && wx.getOpenDataContext) wx.getOpenDataContext().postMessage({ type: 'hide' }); if (this.leaderboardFrame) this.leaderboardFrame.destroy(); if (this.leaderboardImage) this.leaderboardImage.destroy(); this.leaderboardTexture.destroy(); this.leaderboardTexture = null; this.leaderboardFrame = null; this.leaderboardImage = null; } if (this.panel) { this.panel.destroy(); this.panel = null; } }
  private growth() {
    this.modalName = 'growth'; const body = this.modal('火力工坊', '星屑 ' + this.progress.save.coins + ' · 普通关永久成长', 'cannon');
    const rows = [['power', '主炮', '每级伤害 +6%', 'cannon'], ['spread', '波峰扩幅', '提升强拍的覆盖角度', 'wave'], ['support', '导弹弹芯', '提升追猎导弹的伤害', 'missile']] as const;
    rows.forEach(([key, title, desc, art], i) => { const y = 145 + i * 119, level = this.progress.save.growth[key], cap = key === 'power' ? 20 : 10, cost = this.progress.cost(key);
      icon(body, art, 27, y + 2, 57); text(body, title + '  Lv.' + level, 96, y, 248, 30, 21, COLORS.gold, 'left', true); text(body, desc, 96, y + 32, 246, 22, 14, COLORS.muted);
      const bar = meter(body, 29, y + 70, 116, 9); bar.set(level / cap);
      button(body, 'buy-' + key, level >= cap ? '已满级' : cost + ' 星屑 · 升级', 159, y + 62, 188, 42, () => { if (this.progress.buy(key)) this.growth(); }, true, level < cap && this.progress.save.coins >= cost);
    });
    button(body, 'back', '返回', 26, 526, 324, 42, () => this.home());
  }
  private sectors(page = Math.floor((this.progress.save.unlocked - 1) / 12)) {
    this.modalName = 'sectors'; this.sectorPage = page; const body = this.modal('星域航线', '已解锁 ' + this.progress.save.unlocked + ' / 100 关', 'orbit');
    for (let i = 0; i < 12; i++) { const level = page * 12 + i + 1; if (level > 100) break; const unlocked = level <= this.progress.save.unlocked, stars = this.progress.save.stars[level] || 0; button(body, 'level-' + level, String(level).padStart(2, '0') + (stars ? '\n' + '★'.repeat(stars) : ''), 24 + i % 3 * 112, 142 + Math.floor(i / 3) * 76, 104, 62, () => this.begin('campaign', level), false, unlocked); }
    button(body, 'prev', '上一组', 24, 465, 158, 44, () => this.sectors(page - 1), false, page > 0); button(body, 'next', '下一组', 194, 465, 158, 44, () => this.sectors(page + 1), false, page < 8); button(body, 'back', '返回', 24, 526, 328, 40, () => this.home());
  }
  private friends() {
    this.modalName = 'friends'; const body = this.modal('今日好友榜', dayKey() + ' · 相同敌潮，相同初始火力', 'medal'); const wx = host();
    if (wx && wx.getOpenDataContext) {
      const context = wx.getOpenDataContext(), canvas = context.canvas; canvas.width = 656; canvas.height = 640;
      this.leaderboardImage = new ImageAsset(canvas); this.leaderboardTexture = new Texture2D(); this.leaderboardTexture.image = this.leaderboardImage;
      this.leaderboardFrame = new SpriteFrame(); this.leaderboardFrame.texture = this.leaderboardTexture;
      const n = node(body, 'FriendsCanvas', 24, 140, 328, 320), s = n.addComponent(Sprite); s.spriteFrame = this.leaderboardFrame; s.sizeMode = Sprite.SizeMode.CUSTOM; n.getComponent(UITransform)!.setContentSize(328, 320);
      context.postMessage({ type: 'show', key: leaderboardKey(), width: 656, height: 640 });
    } else { icon(body, 'medal', 139, 148, 98); text(body, '今日个人最高', 24, 258, 328, 30, 18, COLORS.muted, 'center'); text(body, this.progress.today().toLocaleString(), 24, 294, 328, 66, 45, COLORS.gold, 'center', true); text(body, '好友成绩在微信内显示\n发出同场挑战，比一比谁守得更稳。', 32, 375, 312, 57, 16, COLORS.text, 'center'); }
    button(body, 'daily-start', '挑战今天的防线', 24, 464, 328, 45, () => this.begin('daily', 8), true); button(body, 'back', '返回', 24, 526, 328, 40, () => this.home());
  }
  private async begin(mode: Mode, level: number) {
    if (this.loading || this.ads.pending) return; const launch = mode === 'campaign' && this.page === 'home' && !this.panel;
    this.audio.activate(); this.loading = true; this.release(); this.modalName = ''; this.firstFlight = !this.progress.save.seen;
    if (launch) this.startHomeLaunch();
    else { this.page = 'preparing'; this.clearUI(); const loadPanel = box(this.ui, 'LoadPanel', 43, this.h / 2 - 112, 334, 224); icon(loadPanel, 'cell', 130, 24, 74); text(loadPanel, '正在装填音轨…', 22, 110, 290, 40, 23, COLORS.gold, 'center', true); text(loadPanel, '稳住呼吸，第一拍就要来了', 22, 158, 290, 30, 15, COLORS.muted, 'center'); }
    const trackLevel = mode === 'daily' ? 1 : ((level - 1) % 7) + 1;
    try { await this.audio.prepare(trackLevel); } catch (error) { this.audio.pause(); console.warn('Audio preparation unavailable', error); } if (!this.alive) return;
    const growth = this.progress.save.growth; this.run = new Combat({ mode, level, height: 840, day: dayKey(), bpm: getTrack(trackLevel).bpm, power: growth.power, widthUpgrade: growth.spread, support: growth.support });
    this.runId = 'v2-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); this.world.reset(); this.shots = this.hits = this.kills = this.pulses = 0; this.frameStats = { frames: 0, totalMs: 0, slowFrames: 0, maxMs: 0 };
    if (launch && this.launchGate) {
      this.ui = node(this.root, 'Interface', 0, 0, 420, this.h); this.launchHUD = this.ui.addComponent(UIOpacity); this.launchHUD.opacity = 1; this.battleUI();
      this.launchBlock = node(this.ui, 'LaunchInputBlock', -this.left, 0, this.designWidth, this.h); this.launchBlock.addComponent(BlockInputEvents); this.launchGate.ready = true;
    } else { this.loading = false; if (!this.progress.save.seen) this.guide(); else this.startCountdown(); }
  }
  private startHomeLaunch() {
    this.page = 'launching'; this.launchGate = new LaunchGate(); this.launchLayer = this.ui; this.launchRelayout = false; this.departures = [];
    const home = homeLayout(this.h, this.safeTop, this.safeBottom);
    for (const child of this.ui.children) {
      if (child === this.homeCaption || child.name === 'FireDisc') continue;
      const t = child.getComponent(UITransform)!, p = child.position, exit = scatterPose(p.x + t.width / 2, -p.y + t.height / 2, home.heroY, this.designWidth, this.h);
      this.departures.push({ node: child, x: p.x, y: p.y, dx: exit.x, dy: -exit.y, angle: exit.angle, opacity: child.getComponent(UIOpacity) || child.addComponent(UIOpacity), delay: this.departures.length % 4 * .018 });
    }
    if (this.homeCaption) this.homeCaption.addComponent(UIOpacity);
    const blocker = node(this.ui, 'LaunchInputBlock', -this.left, 0, this.designWidth, this.h); blocker.addComponent(BlockInputEvents);
  }
  private stepHomeLaunch(dt: number) {
    const gate = this.launchGate; if (!gate) return;
    const done = gate.step(dt), progress = gate.progress, home = homeLayout(this.h, this.safeTop, this.safeBottom), arena = arenaLayout(this.h, this.safeTop, this.safeBottom);
    for (const item of this.departures) { const t = Math.max(0, Math.min(1, (gate.elapsed - item.delay) / .46)), eased = 1 - (1 - t) ** 3; item.node.setPosition(item.x + item.dx * eased, item.y + item.dy * eased); item.node.angle = item.angle * eased; item.opacity.opacity = Math.round(255 * (1 - t) ** 2); }
    if (this.homeCaption) { this.homeCaption.setPosition(210, -(home.heroY + (arena.cannonY - home.heroY) * progress)); const size = home.heroSize / 260, scale = (size + (.89 - size) * progress) / size; this.homeCaption.setScale(scale, scale, 1); this.homeCaption.getComponent(UIOpacity)!.opacity = Math.round(255 * (1 - Math.max(0, (progress - .5) * 2))); }
    if (this.launchHUD) this.launchHUD.opacity = Math.max(1, Math.round(255 * Math.max(0, (progress - .5) * 2)));
    if (!done) return;
    this.launchLayer!.destroy(); this.launchLayer = this.homeCaption = null; this.departures = []; this.launchGate = null;
    if (this.launchBlock) this.launchBlock.destroy(); this.launchBlock = null; if (this.launchHUD) this.launchHUD.opacity = 255; this.launchHUD = null;
    this.loading = false; this.page = 'playing'; if (this.launchRelayout) this.battleUI();
    this.progress.save.seen = true; this.progress.persist(); this.audio.start(this.run!.time, this.run!.duration);
  }
  private guide() {
    this.page = 'guide'; this.battleUI(); const body = this.modal('让节拍替你开路', '按住就开火，拖动就瞄准。', 'cannon');
    const steps: [Icon, string, string][] = [['cannon', '按住开火', '按住下方圆盘，立即持续射击'], ['orbit', '拖动瞄准', '手指左右滑，炮台跟着转'], ['wave', '踩中强拍', '跟鼓点点按或左右换向，击出冲击波']];
    steps.forEach(([art, title, desc], i) => { const y = 151 + i * 94; icon(body, art, 28, y, 53); text(body, title, 94, y + 1, 251, 30, 22, COLORS.gold, 'left', true); text(body, desc, 94, y + 34, 250, 45, 16, COLORS.text); });
    text(body, '四次强拍，进入超载。', 27, 438, 322, 30, 17, COLORS.mint, 'center');
    button(body, 'understood', '出击', 26, 493, 324, 59, () => { this.progress.save.seen = true; this.progress.persist(); this.startCountdown(); }, true);
  }
  private startCountdown() { this.closePanel(); this.release(); this.page = 'countdown'; this.battleUI(); this.countdown = 2; this.labels.countdown = text(this.ui, '2', 110, this.h * .36, 200, 100, 76, COLORS.gold, 'center', true); this.afterCountdown = () => { this.page = 'playing'; this.labels.countdown.string = ''; if (this.run) this.audio.start(this.run.time, this.run.duration); }; }
  private battleUI() {
    this.clearUI(); const t = this.safeTop, run = this.run!, arena = arenaLayout(this.h, t, this.safeBottom);
    const hud = box(this.ui, 'FlightHUD', 14, t - 2, 392, 108);
    this.labels.stage = text(hud, run.mode === 'daily' ? '今日挑战' : '第 ' + String(run.level).padStart(2, '0') + ' 关', 18, 13, 170, 27, 17, COLORS.mint, 'left', true);
    this.labels.time = text(hud, String(run.duration) + 's', 243, 12, 68, 28, 19, COLORS.gold, 'right'); button(hud, 'pause', 'Ⅱ', 328, 12, 45, 40, () => this.pause());
    this.labels.score = text(hud, '0', 17, 44, 211, 47, 33, COLORS.gold, 'left', true);
    this.labels.hp = text(hud, '护盾 100', 231, 54, 141, 25, 16, COLORS.text, 'right'); this.hpMeter = meter(hud, 232, 86, 139, 9); this.hpMeter.set(run.hp / 100);
    this.labels.phase = text(this.ui, '守住防线', 25, t + 110, 370, 27, 15, COLORS.muted, 'center');
    this.labels.boss = text(this.ui, '', 40, t + 141, 340, 23, 14, COLORS.gold, 'center'); this.bossMeter = meter(this.ui, 95, t + 165, 230, 8, '#efb07b'); this.bossMeter.node.active = false;
    this.labels.feedback = text(this.ui, '', 26, arena.defenseY - 96, 368, 42, 25, COLORS.gold, 'center', true);
    this.labels.fire = text(this.ui, '开火', 135, arena.cannonY - 24, 150, 53, 35, COLORS.gold, 'center', true);
    this.labels.energy = text(this.ui, '强拍  0 / 4', 110, arena.cannonY + 37, 200, 26, 15, COLORS.mint, 'center', true);
    this.labels.hint = text(this.ui, '按住射击 · 左右瞄准 · 换向踩拍', 20, this.h - this.safeBottom - 24, 380, 23, 13, COLORS.muted, 'center');
    for (const key of ['score', 'time', 'hp', 'energy', 'boss']) { this.labels[key].overflow = Label.Overflow.CLAMP; this.labels[key].enableWrapText = false; this.labels[key].cacheMode = Label.CacheMode.CHAR; }
  }
  private pause() {
    if (this.page !== 'playing' && this.page !== 'countdown') return; this.release(); this.audio.pause(); this.page = 'paused'; const body = this.modal('暂停', '准备好，再把节奏接回来。', 'shield');
    icon(body, 'shield', 126, 159, 124); text(body, '防线待命', 26, 298, 324, 38, 25, COLORS.gold, 'center', true);
    button(body, 'resume', '继续战斗', 26, 374, 324, 58, () => this.startCountdown(), true); button(body, 'quit', '返回主界面', 26, 449, 324, 51, () => this.home());
  }
  private draft() {
    this.page = 'upgrade'; this.audio.pause(); this.release(); const run = this.run!, body = this.modal('选择一次进化', '第 ' + (run.draft + 1) + ' 次补给 · 本局生效', 'cell');
    const art: Record<UpgradeId, Icon> = { spread: 'cannon', pierce: 'missile', chain: 'burst', seeker: 'missile', resonance: 'wave', repair: 'shield' };
    run.choices.forEach((id, i) => { const item = UPGRADES.find(u => u.id === id)!, y = 148 + i * 115;
      const b = button(body, 'upgrade-' + id, '', 23, y, 330, 101, () => { if (run.choose(id)) { this.closePanel(); this.page = 'playing'; this.audio.start(run.time, run.duration); } }, true);
      icon(b.face, art[id], 10, 20, 61); text(b.face, item.name, 81, 11, 233, 32, 22, COLORS.gold, 'left', true); text(b.face, item.desc, 81, 48, 229, 42, 15, COLORS.text);
    });
    text(body, '选好进化，继续迎击敌潮', 24, 510, 328, 35, 15, COLORS.muted, 'center');
  }
  private result() {
    const r = this.run!; this.release(); this.audio.pause(); this.page = 'result'; this.clearUI(); const win = r.state === 'won';
    const receipt = this.progress.settle(this.runId, r); if (r.mode === 'daily') publishDaily(this.progress.save.daily[RULESET + ':' + r.day] || 0, r.day);
    const title = r.mode === 'daily' ? '今日战绩' : win ? '防线守住了' : r.time >= r.duration ? '首领仍在进攻' : '防线失守';
    const body = this.modal(title, r.mode === 'daily' ? r.day + ' · 同场挑战' : '第 ' + r.level + ' 关 · ' + (win ? '航线已推进' : '调整火力，再战一次'), win || r.mode === 'daily' ? 'medal' : 'shield');
    icon(body, win || r.mode === 'daily' ? 'medal' : 'shield', 145, 146, 86);
    text(body, r.score.toLocaleString(), 26, 237, 324, 65, 47, COLORS.gold, 'center', true);
    text(body, '击破 ' + r.kills + '    强拍 ' + r.perfects + '    最高连拍 ' + r.maxCombo, 26, 306, 324, 27, 14, COLORS.text, 'center');
    const reward = r.mode === 'daily' ? this.target ? (r.score >= this.target.score ? '已超越好友目标 ' : '距好友目标还差 ') + Math.abs(r.score - this.target.score).toLocaleString() + ' 分' : '今日最高 ' + this.progress.today().toLocaleString() : '星屑 +' + receipt.base * (receipt.doubled ? 2 : 1) + ' · 已入账';
    text(body, reward, 26, 338, 324, 28, 18, COLORS.mint, 'center', true);
    if (r.mode === 'daily') {
      button(body, 'challenge', '把这局发给朋友', 26, 382, 324, 48, () => this.share(), true);
      button(body, 'retry', '再战今天的防线', 26, 444, 324, 48, () => this.begin('daily', 8));
    } else {
      const canRevive = !win && !r.revived && r.time < r.duration;
      const rewardText = !this.ads.available ? '微信内可领取广告奖励' : canRevive ? '看广告 · 回复护盾继续' : receipt.doubled ? '双倍星屑已到账' : '看广告 ×2 · 再得 ' + receipt.base + ' 星屑';
      button(body, 'reward', rewardText, 26, 382, 324, 48, () => this.reward(canRevive), false, this.ads.available && (canRevive || !receipt.doubled && receipt.base > 0));
      button(body, 'next', win ? '下一关' : '再战本关', 26, 444, 324, 48, () => this.begin('campaign', win ? Math.min(100, r.level + 1) : r.level), true);
    }
    button(body, 'home', '返回主界面', 26, 508, 324, 40, () => this.home());
    this.labels.notice = text(body, this.progress.available ? '' : '进度未保存，请检查设备存储空间。', 26, 550, 324, 28, 13, COLORS.gold, 'center');
  }
  private async reward(revive: boolean) {
    if (this.ads.pending) return; const run = this.run, id = this.runId; this.labels.notice.string = '正在载入广告…'; const result = await this.ads.show(); if (!this.alive || this.runId !== id || this.run !== run) return;
    if (result.earned) { if (revive && run && run.revive()) { this.startCountdown(); return; } if (!revive) this.progress.double(id); this.result(); } else this.labels.notice.string = result.status === 'cancelled' ? '未完整观看，已有奖励已保留。' : '广告暂不可用，可以直接继续。';
  }
  private async share() { const r = this.run!; const result = await shareChallenge(r.score, r.day); if (this.labels.notice) this.labels.notice.string = result === 'copied' ? '挑战链接已复制。' : result === 'opened' ? '已打开分享。' : result === 'cancelled' ? '' : result; }
  private touchStart(e: any) {
    if (e.getButton && e.getButton() !== 0) return; this.audio.activate(); if (this.page !== 'playing' || this.pointer !== null || !this.run) return;
    const p = e.getUILocation(), y = this.h - p.y, x = p.x - this.left; if (y < this.safeTop + 180 || x < 0 || x > 420) return;
    this.pointer = (e.getID ? e.getID() : -1); this.gesture.start(x, this.run.aim); this.run.press(); this.run.tap(this.audio.position(this.run.time));
  }
  private touchMove(e: any) {
    if (this.page !== 'playing' || (e.getID ? e.getID() : -1) !== this.pointer || !this.run) return;
    const turn = this.gesture.move(e.getUILocation().x - this.left); this.run.aim = this.gesture.aim;
    if (turn) this.run.tap(this.audio.position(this.run.time));
  }
  private touchEnd(e: any) { if ((e.getID ? e.getID() : -1) === this.pointer) this.release(); }
  private release() { this.pointer = null; this.gesture.end(); if (this.run) this.run.held = false; }
  private keyDown(e: any) { this.audio.activate(); if (e.keyCode === 32 && this.page === 'playing' && this.run && !this.run.held) { this.run.press(); this.run.tap(this.audio.position(this.run.time)); } if (e.keyCode === 27) this.pause(); }
  private keyUp(e: any) { if (e.keyCode === 32) this.release(); }
  private battleFeedback() {
    const r = this.run!;
    if (r.shots !== this.shots) { this.audio.feedback('shot'); this.shots = r.shots; }
    if (r.hits !== this.hits) { this.audio.feedback('hit'); this.hits = r.hits; }
    if (r.kills !== this.kills) { this.audio.feedback('break'); this.kills = r.kills; }
    if (r.perfects !== this.pulses) { this.audio.feedback('perfect'); this.pulses = r.perfects; const wx = host(); if (wx && wx.vibrateShort && this.clock - this.lastVibration > .3) { this.lastVibration = this.clock; wx.vibrateShort({ type: 'light', fail: () => {} }); } }
  }
  private onHide() { this.hidden = true; if (this.page === 'playing' || this.page === 'countdown') this.pause(); this.audio.pause(); this.release(); }
  private onShow() { this.hidden = false; }
  update(dt: number) {
    if (!this.world || this.hidden || !this.alive) return; this.clock += Math.min(dt, .1);
    if (this.page === 'launching') this.stepHomeLaunch(dt);
    if (this.page === 'countdown') { this.countdown -= dt; if (this.countdown > 0) this.labels.countdown.string = String(Math.ceil(this.countdown)); else if (this.afterCountdown) { const cb = this.afterCountdown; this.afterCountdown = null; cb(); } }
    if (this.page === 'playing' && this.run) {
      const s = this.frameStats; s.frames++; s.totalMs += dt * 1000; s.maxMs = Math.max(s.maxMs, dt * 1000); if (dt > .034) s.slowFrames++;
      if (dt > .25) { this.pause(); return; } // Background stalls cannot skip enemy time or desync beats.
      this.run.advance(dt); this.battleFeedback();
      if (Math.abs(this.audio.transportPosition(this.run.time) - this.run.time) > .12 && this.audio.running) { this.audio.pause(); this.audio.start(this.run.time, this.run.duration); }
      if (this.run.state === 'upgrade') this.draft(); else if (this.run.state === 'won' || this.run.state === 'lost') { this.result(); }
    }
    const run = this.run, isHome = this.page === 'home' || this.page === 'preparing'; this.world.render(run, run && this.page !== 'home' && this.page !== 'launching' ? this.audio.position(run.time) : this.clock, isHome, this.launchGate ? this.launchGate.progress : null);
    this.uiClock += dt;
    if (run && this.uiClock >= .1 && (this.page === 'playing' || this.page === 'countdown')) { this.uiClock = 0; this.labels.time.string = Math.max(0, Math.ceil(run.duration - run.time)) + 's'; this.labels.score.string = run.score.toLocaleString(); this.labels.hp.string = '护盾 ' + Math.ceil(run.hp); if (this.hpMeter) this.hpMeter.set(run.hp / 100);
      this.labels.energy.string = run.overdrive > 0 ? '超载 ' + run.overdrive.toFixed(1) + 's' : '强拍  ' + Math.floor(run.energy / 25) + ' / 4';
      this.labels.feedback.string = run.time - run.lastPulse < .45 ? (run.overdrive > 0 ? '超载 · 火力全开' : '强拍  ×' + run.combo) : run.time - run.lastHurt < .6 ? '防线受损' : '';
      this.labels.phase.string = run.bossSpawned ? run.bossKilled ? '首领击破 · 守住最后一波' : '首领来袭 · 集中火力' : this.firstFlight && run.time < 18 ? run.time < 5 ? '按住炮台，持续开火' : run.time < 10 ? '左右拖动，调整射击方向' : '跟着鼓点点按或换向，触发强拍' : run.time < 12 ? '按住开火 · 让敌人留在防线之外' : '迎击敌潮 · 强拍触发金色冲击';
      const boss = run.bossIndex >= 0 ? run.enemies.items[run.bossIndex] : null; if (this.bossMeter) { this.bossMeter.node.active = !!(boss && boss.active && boss.type === 3); if (boss) this.bossMeter.set(boss.hp / boss.maxHp); } this.labels.boss.string = boss && boss.active && boss.type === 3 ? '首领装甲  ' + Math.max(0, Math.ceil(boss.hp / boss.maxHp * 100)) + '%' : '';
    }
    if (this.leaderboardTexture) { this.leaderClock += dt; if (this.leaderClock > .25) { this.leaderClock = 0; try { this.leaderboardTexture.uploadData(host().getOpenDataContext().canvas); } catch {} } }
  }
  onDestroy() {
    this.alive = false; view.off('canvas-resize', this.onViewportResize, this); this.audio.dispose(); this.ads.dispose(); this.closePanel(); if (this.world) this.world.dispose(); disposeTheme();
    input.off(Input.EventType.TOUCH_START, this.touchStart, this); input.off(Input.EventType.TOUCH_MOVE, this.touchMove, this); input.off(Input.EventType.TOUCH_END, this.touchEnd, this); input.off(Input.EventType.TOUCH_CANCEL, this.touchEnd, this); input.off(Input.EventType.MOUSE_DOWN, this.touchStart, this); input.off(Input.EventType.MOUSE_MOVE, this.touchMove, this); input.off(Input.EventType.MOUSE_UP, this.touchEnd, this); input.off(Input.EventType.KEY_DOWN, this.keyDown, this); input.off(Input.EventType.KEY_UP, this.keyUp, this); game.off(Game.EVENT_HIDE, this.onHide, this); game.off(Game.EVENT_SHOW, this.onShow, this);
    const wx = host(); if (wx && wx.offAudioInterruptionBegin && this.wxInterrupt) wx.offAudioInterruptionBegin(this.wxInterrupt); if (wx && wx.offAudioInterruptionEnd && this.wxInterruptEnd) wx.offAudioInterruptionEnd(this.wxInterruptEnd);
  }
}
