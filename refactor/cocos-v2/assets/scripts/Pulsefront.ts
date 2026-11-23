import { _decorator, Component, Node, UITransform, SpriteFrame, resources, view, ResolutionPolicy, input, Input, game, Game, sys, Label, Texture2D, Sprite, ImageAsset } from 'cc';
import { Combat, UPGRADES, UpgradeId, Mode, dayKey, RULESET } from './core/Combat';
import { getTrack } from './core/music';
import { Audio } from './core/Audio';
import { Progress, host } from './platform/Progress';
import { Rewarded } from './platform/Rewarded';
import { incoming, shareChallenge, publishDaily, leaderboardKey, Challenge } from './platform/Social';
import { BattleView } from './view/BattleView';
import { node, text, button, box, color, COLORS } from './view/UI';
const { ccclass } = _decorator;
@ccclass('Pulsefront')
export class Pulsefront extends Component {
  private progress!: Progress; private audio = new Audio(); private ads = new Rewarded(); private run: Combat | null = null;
  private root!: Node; private ui!: Node; private world!: BattleView; private panel: Node | null = null; private labels: Record<string, Label> = {};
  private page = 'loading'; private h = 840; private safeTop = 24; private safeBottom = 12; private clock = 0; private uiClock = 0; private loading = false;
  private pointer: number | null = null; private lastX = 210; private direction = 0; private extreme = 210; private gestureDistance = 0;
  private runId = ''; private hidden = false; private target: Challenge | null = null; private alive = true; private countdown = 0; private afterCountdown: (() => void) | null = null;
  private frameStats = { frames: 0, totalMs: 0, slowFrames: 0, maxMs: 0 }; private leaderboardTexture: Texture2D | null = null; private leaderboardFrame: SpriteFrame | null = null; private leaderboardImage: ImageAsset | null = null; private leaderClock = 0;
  private wxInterrupt: (() => void) | null = null; private wxInterruptEnd: (() => void) | null = null;
  async onLoad() {
    this.progress = new Progress(sys.localStorage); this.audio.muted = !this.progress.save.sound; this.target = incoming();
    // The same logical arena on every phone keeps daily scores comparable.
    this.h = 840;
    view.setDesignResolutionSize(420, this.h, ResolutionPolicy.SHOW_ALL);
    try { const wx = host(), info = wx && (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()); if (info) { const scale = 420 / info.windowWidth, capsule = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); this.safeTop = Math.max(24, (capsule ? capsule.bottom : info.safeArea.top) * scale + 8); this.safeBottom = Math.max(12, (info.windowHeight - info.safeArea.bottom) * scale); } } catch {}
    this.root = node(this.node, 'PulsefrontV2', -210, -this.h / 2, 420, this.h);
    const loading = text(this.root, '正在校准脉冲…', 30, this.h / 2 - 20, 360, 40, 21, COLORS.mint, 'center');
    try { const assets: Record<string, SpriteFrame> = {}; await Promise.all(['deep-space', 'cannon', 'enemies'].map(name => new Promise<void>((resolve, reject) => resources.load('art/' + name + '/spriteFrame', SpriteFrame, (e, f) => { if (e) reject(e); else { assets[name] = f; resolve(); } })))); if (!this.alive) return;
      loading.node.destroy(); this.world = new BattleView(this.root, this.h, assets); this.ui = node(this.root, 'Interface', 0, 0, 420, this.h); this.home();
    } catch (e: any) { loading.string = '画面资源未载入，请重新打开。'; console.error(e); return; }
    input.on(Input.EventType.TOUCH_START, this.touchStart, this); input.on(Input.EventType.TOUCH_MOVE, this.touchMove, this); input.on(Input.EventType.TOUCH_END, this.touchEnd, this); input.on(Input.EventType.TOUCH_CANCEL, this.touchEnd, this);
    input.on(Input.EventType.KEY_DOWN, this.keyDown, this); input.on(Input.EventType.KEY_UP, this.keyUp, this); game.on(Game.EVENT_HIDE, this.onHide, this); game.on(Game.EVENT_SHOW, this.onShow, this);
    const wx = host(); if (wx) { if (wx.showShareMenu) wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] }); this.wxInterrupt = () => this.onHide(); this.wxInterruptEnd = () => this.onShow(); if (wx.onAudioInterruptionBegin) wx.onAudioInterruptionBegin(this.wxInterrupt); if (wx.onAudioInterruptionEnd) wx.onAudioInterruptionEnd(this.wxInterruptEnd); }
    (globalThis as any).pulsefront = Object.freeze({ version: '2.0.0-cocos-rebuild.1', engine: 'Cocos 3.8.8', snapshot: () => ({ page: this.page, run: this.run ? this.run.snapshot() : null, pools: this.world.counts(), frameStats: { ...this.frameStats }, audio: this.audio.diagnostics(), adsConfigured: this.ads.available, storageAvailable: this.progress.available, rules: RULESET }) });
  }
  private clearUI() { if (this.panel) this.closePanel(); for (const child of this.ui.children.slice()) child.destroy(); this.labels = {}; }
  private home() {
    this.audio.pause(); this.release(); this.run = null; this.page = 'home'; this.clearUI(); const top = this.safeTop;
    text(this.ui, 'P U L S E F R O N T', 28, top, 245, 24, 13, COLORS.mint);
    button(this.ui, 'sound', this.progress.save.sound ? '♫' : '静', 348, top - 3, 44, 38, () => { this.progress.save.sound = !this.progress.save.sound; this.audio.muted = !this.progress.save.sound; this.progress.persist(); this.home(); });
    text(this.ui, '脉冲防线', 27, top + 36, 366, 67, 44, COLORS.text, 'left', true);
    text(this.ui, '把每一拍，打成反击。', 29, top + 109, 360, 28, 16, COLORS.muted);
    text(this.ui, '开火', 136, this.h * .476 - 18, 148, 64, 40, COLORS.gold, 'center', true);
    text(this.ui, 'R H Y T H M   E N G I N E', 112, this.h * .476 + 47, 196, 22, 11, COLORS.muted, 'center');
    const y = this.h - 277 - this.safeBottom;
    if (this.target) text(this.ui, '好友挑战  ·  目标 ' + this.target.score.toLocaleString() + ' 分', 28, y - 32, 364, 25, 15, COLORS.gold, 'center');
    button(this.ui, 'campaign', '继续出击  ·  第 ' + String(this.progress.save.unlocked).padStart(2, '0') + ' 关', 26, y, 368, 55, () => this.begin('campaign', this.progress.save.unlocked), true);
    button(this.ui, 'daily', '每日挑战  ·  90 秒同场较量', 26, y + 67, 368, 52, () => this.begin('daily', 8));
    text(this.ui, '今日最高 ' + this.progress.today().toLocaleString() + '  ·  统一火力配置', 26, y + 123, 368, 23, 14, COLORS.muted, 'center');
    button(this.ui, 'growth', '火力工坊', 26, y + 160, 116, 47, () => this.growth());
    button(this.ui, 'friends', '好友榜', 152, y + 160, 116, 47, () => this.friends());
    button(this.ui, 'sectors', '星域', 278, y + 160, 116, 47, () => this.sectors());
    text(this.ui, '星屑 ' + this.progress.save.coins.toLocaleString(), 28, y + 222, 180, 23, 14, COLORS.gold);
    text(this.ui, '2.0 · 重构试玩', 217, y + 222, 175, 23, 12, COLORS.muted, 'right');
  }
  private modal(title: string, subtitle: string) {
    this.closePanel(); this.panel = node(this.ui, 'Modal', 0, 0, 420, this.h); const shade = box(this.panel, 'Shade', 0, 0, 420, this.h, '#001016f0', '#001016', 0);
    shade.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; });
    const y = Math.max(this.safeTop + 30, (this.h - 600) / 2), body = box(this.panel, 'Panel', 22, y, 376, 586, '#09262b', '#658d7f', 23);
    text(body, title, 24, 25, 328, 43, 28, COLORS.text, 'left', true); text(body, subtitle, 24, 73, 328, 47, 15, COLORS.muted);
    return body;
  }
  private closePanel() { if (this.leaderboardTexture) { const wx = host(); if (wx && wx.getOpenDataContext) wx.getOpenDataContext().postMessage({ type: 'hide' }); if (this.leaderboardFrame) this.leaderboardFrame.destroy(); if (this.leaderboardImage) this.leaderboardImage.destroy(); this.leaderboardTexture.destroy(); this.leaderboardTexture = null; this.leaderboardFrame = null; this.leaderboardImage = null; } if (this.panel) { this.panel.destroy(); this.panel = null; } }
  private growth() {
    const body = this.modal('火力工坊', '星屑 ' + this.progress.save.coins + ' · 永久成长只作用于普通关');
    const rows = [['power', '主炮', '每级伤害 +6%'], ['spread', '波峰扩幅', '每级强拍覆盖角度增加'], ['support', '导弹弹芯', '每级追猎导弹伤害提升']] as const;
    rows.forEach(([key, title, desc], i) => { const y = 136 + i * 124, level = this.progress.save.growth[key], cap = key === 'power' ? 20 : 10, cost = this.progress.cost(key); text(body, title + '  Lv.' + level, 24, y, 220, 30, 21, COLORS.gold); text(body, desc, 24, y + 35, 310, 22, 14, COLORS.muted); button(body, 'buy-' + key, level >= cap ? '已满级' : cost + ' 星屑 · 升级', 24, y + 66, 328, 41, () => { if (this.progress.buy(key)) this.growth(); }, false, level < cap && this.progress.save.coins >= cost); });
    button(body, 'back', '返回', 24, 526, 328, 40, () => this.home());
  }
  private sectors(page = Math.floor((this.progress.save.unlocked - 1) / 12)) {
    const body = this.modal('星域航线', '已解锁 ' + this.progress.save.unlocked + ' / 100 关');
    for (let i = 0; i < 12; i++) { const level = page * 12 + i + 1; if (level > 100) break; const unlocked = level <= this.progress.save.unlocked, stars = this.progress.save.stars[level] || 0; button(body, 'level-' + level, String(level).padStart(2, '0') + (stars ? '\n' + '★'.repeat(stars) : ''), 24 + i % 3 * 112, 142 + Math.floor(i / 3) * 76, 104, 62, () => this.begin('campaign', level), false, unlocked); }
    button(body, 'prev', '上一组', 24, 465, 158, 44, () => this.sectors(page - 1), false, page > 0); button(body, 'next', '下一组', 194, 465, 158, 44, () => this.sectors(page + 1), false, page < 8); button(body, 'back', '返回', 24, 526, 328, 40, () => this.home());
  }
  private friends() {
    const body = this.modal('今日好友榜', dayKey() + ' · 相同敌潮，相同初始火力'); const wx = host();
    if (wx && wx.getOpenDataContext) {
      const context = wx.getOpenDataContext(), canvas = context.canvas; canvas.width = 656; canvas.height = 640;
      this.leaderboardImage = new ImageAsset(canvas); this.leaderboardTexture = new Texture2D(); this.leaderboardTexture.image = this.leaderboardImage;
      this.leaderboardFrame = new SpriteFrame(); this.leaderboardFrame.texture = this.leaderboardTexture;
      const n = node(body, 'FriendsCanvas', 24, 140, 328, 320), s = n.addComponent(Sprite); s.spriteFrame = this.leaderboardFrame; s.sizeMode = Sprite.SizeMode.CUSTOM; n.getComponent(UITransform)!.setContentSize(328, 320);
      context.postMessage({ type: 'show', key: leaderboardKey(), width: 656, height: 640 });
    } else { text(body, '今日个人最高', 24, 170, 328, 30, 18, COLORS.muted, 'center'); text(body, this.progress.today().toLocaleString(), 24, 218, 328, 75, 49, COLORS.gold, 'center', true); text(body, '好友成绩在微信内显示\n发出同场挑战，比一比谁守得更稳。', 32, 320, 312, 65, 17, COLORS.text, 'center'); }
    button(body, 'daily-start', '挑战今天的防线', 24, 464, 328, 45, () => this.begin('daily', 8), true); button(body, 'back', '返回', 24, 526, 328, 40, () => this.home());
  }
  private async begin(mode: Mode, level: number) {
    if (this.loading || this.ads.pending) return; this.audio.activate(); this.loading = true; this.release(); this.page = 'preparing'; this.clearUI();
    text(this.ui, '正在装填音轨…', 30, this.h / 2 - 20, 360, 40, 22, COLORS.mint, 'center');
    const trackLevel = mode === 'daily' ? 1 : ((level - 1) % 7) + 1; await this.audio.prepare(trackLevel); if (!this.alive) return;
    const growth = this.progress.save.growth; this.run = new Combat({ mode, level, height: this.h, day: dayKey(), bpm: getTrack(trackLevel).bpm, power: growth.power, widthUpgrade: growth.spread, support: growth.support });
    this.runId = 'v2-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); this.world.reset(); this.frameStats = { frames: 0, totalMs: 0, slowFrames: 0, maxMs: 0 }; this.loading = false;
    if (!this.progress.save.seen) { this.page = 'guide'; this.battleUI(); const body = this.modal('让节拍替你开路', '一只手，就够了。');
      text(body, '01  按住下方圆盘，持续开火\n\n02  左右滑动，瞄准靠近的敌人\n\n03  光圈合拍时点按，或左右换向\n       强拍冲击 · 连续四拍进入超载', 24, 154, 328, 236, 18, COLORS.text);
      button(body, 'understood', '出击', 24, 455, 328, 55, () => { this.progress.save.seen = true; this.progress.persist(); this.startCountdown(); }, true);
    } else this.startCountdown();
  }
  private startCountdown() { this.closePanel(); this.release(); this.page = 'countdown'; this.battleUI(); this.countdown = 2; this.labels.countdown = text(this.ui, '2', 110, this.h * .36, 200, 100, 76, COLORS.gold, 'center', true); this.afterCountdown = () => { this.page = 'playing'; this.labels.countdown.string = ''; if (this.run) this.audio.start(this.run.time, this.run.duration); }; }
  private battleUI() {
    this.clearUI(); const t = this.safeTop; const run = this.run!;
    this.labels.stage = text(this.ui, run.mode === 'daily' ? '今日挑战' : '第 ' + String(run.level).padStart(2, '0') + ' 关', 26, t, 200, 27, 17, COLORS.mint, 'left', true);
    this.labels.time = text(this.ui, String(run.duration) + 's', 256, t, 74, 28, 19, COLORS.gold, 'right'); button(this.ui, 'pause', 'Ⅱ', 350, t - 3, 42, 38, () => this.pause());
    this.labels.score = text(this.ui, '0', 25, t + 36, 238, 45, 34, COLORS.text, 'left', true);
    this.labels.hp = text(this.ui, '护盾 100', 250, t + 43, 142, 35, 17, COLORS.muted, 'right');
    this.labels.phase = text(this.ui, '第一波 · 守住防线', 24, t + 90, 372, 28, 15, COLORS.gold, 'center');
    this.labels.boss = text(this.ui, '', 40, t + 124, 340, 25, 14, '#ffba8b', 'center');
    this.labels.feedback = text(this.ui, '', 26, this.h - 328, 368, 38, 24, COLORS.gold, 'center', true);
    this.labels.fire = text(this.ui, '开火', 135, this.h - 151, 150, 53, 34, COLORS.gold, 'center', true);
    this.labels.energy = text(this.ui, '强拍  0 / 4', 110, this.h - 98, 200, 27, 15, COLORS.mint, 'center');
    this.labels.hint = text(this.ui, '按住开火 · 左右瞄准 · 换向踩拍', 26, this.h - 38 - this.safeBottom / 2, 368, 24, 14, COLORS.muted, 'center');
  }
  private pause() { if (this.page !== 'playing' && this.page !== 'countdown') return; this.release(); this.audio.pause(); this.page = 'paused'; const body = this.modal('暂停', '防线在等你，准备好再继续。'); button(body, 'resume', '继续战斗', 24, 228, 328, 55, () => this.startCountdown(), true); button(body, 'quit', '返回主界面', 24, 301, 328, 48, () => this.home()); }
  private draft() {
    this.page = 'upgrade'; this.audio.pause(); this.release(); const run = this.run!, body = this.modal('选择一次进化', '第 ' + (run.draft + 1) + ' 次补给 · 本局生效');
    run.choices.forEach((id, i) => { const item = UPGRADES.find(u => u.id === id)!; const y = 144 + i * 112; button(body, 'upgrade-' + id, '', 22, y, 332, 98, () => { if (run.choose(id)) { this.closePanel(); this.page = 'playing'; this.audio.start(run.time, run.duration); } }); text(body, item.name, 40, y + 11, 260, 30, 22, COLORS.gold, 'left', true); text(body, item.desc, 40, y + 46, 294, 40, 15, COLORS.text); });
    text(body, '选完继续，战斗和音乐都已暂停。', 24, 510, 328, 37, 14, COLORS.muted, 'center');
  }
  private result() {
    const r = this.run!; this.release(); this.audio.pause(); this.page = 'result'; this.clearUI(); const win = r.state === 'won';
    const receipt = this.progress.settle(this.runId, r); if (r.mode === 'daily') publishDaily(this.progress.save.daily[RULESET + ':' + r.day] || 0, r.day);
    const t = this.safeTop + 16;
    text(this.ui, r.mode === 'daily' ? '今日战绩' : win ? '防线守住了' : r.time >= r.duration ? '首领仍在进攻' : '防线失守', 26, t, 368, 53, 35, win ? COLORS.mint : COLORS.gold, 'center', true);
    text(this.ui, r.score.toLocaleString(), 26, t + 78, 368, 86, 58, COLORS.gold, 'center', true);
    text(this.ui, '击破 ' + r.kills + '    强拍 ' + r.perfects + '    最高连拍 ' + r.maxCombo, 26, t + 176, 368, 34, 15, COLORS.text, 'center');
    text(this.ui, r.mode === 'daily' ? this.target ? (r.score > this.target.score ? '已超越好友目标 ' : '距好友目标还差 ') + Math.abs(r.score - this.target.score).toLocaleString() + ' 分' : '今日最高 ' + this.progress.today().toLocaleString() : '星屑 +' + receipt.base * (receipt.doubled ? 2 : 1) + ' · 已入账', 26, t + 222, 368, 34, 19, COLORS.mint, 'center');
    const y = Math.max(t + 296, this.h - 323 - this.safeBottom);
    if (r.mode === 'daily') {
      button(this.ui, 'challenge', '把这局发给朋友', 26, y, 368, 50, () => this.share(), true);
      button(this.ui, 'retry', '再战今天的防线', 26, y + 64, 368, 50, () => this.begin('daily', 8));
      text(this.ui, '同一题 · 不带养成 · 不用广告复活', 26, y + 124, 368, 25, 14, COLORS.muted, 'center');
    } else {
      const canRevive = !win && !r.revived && r.time < r.duration;
      button(this.ui, 'reward', canRevive ? '看广告 · 回复 60 护盾继续' : receipt.doubled ? '双倍星屑已到账' : '看广告 ×2 · 再得 ' + receipt.base + ' 星屑', 26, y, 368, 50, () => this.reward(canRevive), false, this.ads.available && (canRevive || !receipt.doubled && receipt.base > 0));
      text(this.ui, this.ads.available ? '自愿观看，未看完不影响已得奖励' : '浏览器试玩不播放微信广告', 26, y + 54, 368, 26, 13, COLORS.muted, 'center');
      button(this.ui, 'next', win ? '下一关' : '再战本关', 26, y + 92, 368, 52, () => this.begin('campaign', win ? Math.min(100, r.level + 1) : r.level), true);
    }
    button(this.ui, 'home', '返回主界面', 26, y + 166, 368, 46, () => this.home());
    this.labels.notice = text(this.ui, this.progress.available ? '' : '进度未保存，请检查设备存储空间。', 26, y + 226, 368, 61, 14, COLORS.gold, 'center');
  }
  private async reward(revive: boolean) {
    if (this.ads.pending) return; const run = this.run, id = this.runId; this.labels.notice.string = '正在载入广告…'; const result = await this.ads.show(); if (!this.alive || this.runId !== id || this.run !== run) return;
    if (result.earned) { if (revive && run && run.revive()) { this.startCountdown(); return; } if (!revive) this.progress.double(id); this.result(); } else this.labels.notice.string = result.status === 'cancelled' ? '未完整观看，已有奖励已保留。' : '广告暂不可用，可以直接继续。';
  }
  private async share() { const r = this.run!; const result = await shareChallenge(r.score, r.day); if (this.labels.notice) this.labels.notice.string = result === 'copied' ? '挑战链接已复制。' : result === 'opened' ? '已打开分享。' : result === 'cancelled' ? '' : result; }
  private touchStart(e: any) { this.audio.activate(); if (this.page !== 'playing' || this.pointer !== null || !this.run) return; const p = e.getUILocation(), y = this.h - p.y; if (y < this.h - 270) return; this.pointer = e.getID(); this.lastX = p.x; this.extreme = p.x; this.gestureDistance = 0; this.direction = 0; this.run.held = true; this.run.aimAt(p.x); this.run.tap(this.audio.position(this.run.time)); }
  private touchMove(e: any) { if (this.page !== 'playing' || e.getID() !== this.pointer || !this.run) return; const x = e.getUILocation().x, delta = x - this.lastX; this.lastX = x; this.run.aimAt(x); if (Math.abs(delta) < .3) return; const d = delta > 0 ? 1 : -1; if (this.direction && d !== this.direction && Math.abs(x - this.extreme) > 12) { if (this.gestureDistance >= 25) this.run.tap(this.audio.position(this.run.time)); this.direction = d; this.extreme = x; this.gestureDistance = 0; } else if (!this.direction) { this.direction = d; this.extreme = x; } else if (d === this.direction) { this.gestureDistance += Math.abs(delta); this.extreme = x; } }
  private touchEnd(e: any) { if (e.getID() === this.pointer) this.release(); }
  private release() { this.pointer = null; this.direction = 0; this.gestureDistance = 0; if (this.run) this.run.held = false; }
  private keyDown(e: any) { this.audio.activate(); if (e.keyCode === 32 && this.page === 'playing' && this.run && !this.run.held) { this.run.held = true; this.run.tap(this.audio.position(this.run.time)); } if (e.keyCode === 27) this.pause(); }
  private keyUp(e: any) { if (e.keyCode === 32) this.release(); }
  private onHide() { this.hidden = true; if (this.page === 'playing' || this.page === 'countdown') this.pause(); this.audio.pause(); this.release(); }
  private onShow() { this.hidden = false; }
  update(dt: number) {
    if (!this.world || this.hidden || !this.alive) return; this.clock += Math.min(dt, .1);
    if (this.page === 'countdown') { this.countdown -= dt; if (this.countdown > 0) this.labels.countdown.string = String(Math.ceil(this.countdown)); else if (this.afterCountdown) { const cb = this.afterCountdown; this.afterCountdown = null; cb(); } }
    if (this.page === 'playing' && this.run) {
      const s = this.frameStats; s.frames++; s.totalMs += dt * 1000; s.maxMs = Math.max(s.maxMs, dt * 1000); if (dt > .034) s.slowFrames++;
      if (dt > .25) { this.pause(); return; } // Background stalls cannot skip enemy time or desync beats.
      this.run.advance(dt); this.audio.tick();
      if (Math.abs(this.audio.transportPosition(this.run.time) - this.run.time) > .12 && this.audio.running) { this.audio.pause(); this.audio.start(this.run.time, this.run.duration); }
      if (this.run.state === 'upgrade') this.draft(); else if (this.run.state === 'won' || this.run.state === 'lost') { this.result(); }
    }
    const run = this.run, isHome = this.page === 'home' || this.page === 'preparing'; this.world.render(run, run && this.page !== 'home' ? this.audio.position(run.time) : this.clock, isHome);
    this.uiClock += dt;
    if (run && this.uiClock >= .1 && (this.page === 'playing' || this.page === 'countdown')) { this.uiClock = 0; this.labels.time.string = Math.max(0, Math.ceil(run.duration - run.time)) + 's'; this.labels.score.string = run.score.toLocaleString(); this.labels.hp.string = '护盾 ' + Math.ceil(run.hp);
      this.labels.energy.string = run.overdrive > 0 ? '超载 ' + run.overdrive.toFixed(1) + 's' : '强拍  ' + Math.floor(run.energy / 25) + ' / 4';
      this.labels.feedback.string = run.time - run.lastPulse < .45 ? (run.overdrive > 0 ? '超载 · 火力全开' : '强拍  ×' + run.combo) : run.time - run.lastHurt < .6 ? '防线受损' : '';
      this.labels.phase.string = run.bossSpawned ? run.bossKilled ? '首领击破 · 守住最后一波' : '首领来袭 · 集中火力' : run.time < 12 ? '按住开火 · 让敌人留在防线之外' : '迎击敌潮 · 强拍触发金色冲击';
      const boss = run.bossIndex >= 0 ? run.enemies.items[run.bossIndex] : null; this.labels.boss.string = boss && boss.active && boss.type === 3 ? '首领装甲  ' + Math.max(0, Math.ceil(boss.hp / boss.maxHp * 100)) + '%' : '';
    }
    if (this.leaderboardTexture) { this.leaderClock += dt; if (this.leaderClock > .25) { this.leaderClock = 0; try { this.leaderboardTexture.uploadData(host().getOpenDataContext().canvas); } catch {} } }
  }
  onDestroy() {
    this.alive = false; this.audio.dispose(); this.ads.dispose(); this.closePanel(); if (this.world) this.world.dispose();
    input.off(Input.EventType.TOUCH_START, this.touchStart, this); input.off(Input.EventType.TOUCH_MOVE, this.touchMove, this); input.off(Input.EventType.TOUCH_END, this.touchEnd, this); input.off(Input.EventType.TOUCH_CANCEL, this.touchEnd, this); input.off(Input.EventType.KEY_DOWN, this.keyDown, this); input.off(Input.EventType.KEY_UP, this.keyUp, this); game.off(Game.EVENT_HIDE, this.onHide, this); game.off(Game.EVENT_SHOW, this.onShow, this);
    const wx = host(); if (wx && wx.offAudioInterruptionBegin && this.wxInterrupt) wx.offAudioInterruptionBegin(this.wxInterrupt); if (wx && wx.offAudioInterruptionEnd && this.wxInterruptEnd) wx.offAudioInterruptionEnd(this.wxInterruptEnd);
  }
}
