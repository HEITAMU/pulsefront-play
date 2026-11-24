import { Node, Sprite, SpriteFrame, Texture2D, Rect, Size, Vec2, Graphics, UIOpacity, UITransform } from 'cc';
import { Combat, LIMITS } from '../core/Combat';
import { arenaLayout, arenaY, homeLayout } from '../core/Layout';
import { node, sprite, color } from './UI';
type Slot = { node: Node; sprite: Sprite; gen?: number; type?: number; hit?: boolean; flash?: Node; opacity?: UIOpacity };
/** Preallocated Cocos visuals: no instantiate, destroy or texture upload during combat. */
export class BattleView {
  readonly root: Node; readonly battle: Node; readonly cannon: Node; readonly energy: Node; readonly halo: Node;
  private space: Node; private glow: Node; private muzzle: Node; private haloOpacity: UIOpacity; private muzzleOpacity: UIOpacity; private glowOpacity: UIOpacity; private guide: Node;
  private enemies: Slot[] = []; private bullets: Slot[] = []; private effects: Slot[] = [];
  private waves: { node: Node; arc: Node; g: Graphics; width: number; opacity: UIOpacity }[] = []; private frames: SpriteFrame[] = []; private dot: SpriteFrame;
  private beatBars: Node[] = []; private ownedFrames: SpriteFrame[] = []; private ownedTextures: Texture2D[] = [];
  private shield: Node; private safeTop = 16; private safeBottom = 14; private width = 420;
  private white = color('#ffffff'); private flash = color('#c7fff4'); private mint = color('#80ffe3'); private gold = color('#ffe3a1'); private orange = color('#ffab69');
  private waveColors = [color('#68ffce25'), color('#9bffce9f'), color('#fff2b8')];
  private layout = arenaLayout(840, 16, 14);
  private homePosition = homeLayout(840, 16, 14);
  constructor(parent: Node, public height: number, assets: Record<string, SpriteFrame>) {
    this.root = node(parent, 'World');
    this.space = sprite(this.root, 'Space', assets['deep-space'], 210, height / 2, 420, height).node;
    this.battle = node(this.root, 'BattlePool');
    const atlas = assets.enemies, size = atlas.rect.width / 2;
    for (let i = 0; i < 4; i++) { const f = new SpriteFrame(); f.reset({ texture: atlas.texture, rect: new Rect(i % 2 * size, Math.floor(i / 2) * size, size, size), originalSize: new Size(size, size), offset: new Vec2(0, 0) }); f.packable = false; this.frames.push(f); this.ownedFrames.push(f); }
    this.dot = this.energyTexture();
    const enemyLayer = node(this.battle, 'Enemies'), hitLayer = node(this.battle, 'HitLights'), projectileLayer = node(this.battle, 'Projectiles'), waveLayer = node(this.battle, 'Shockwaves'), fxLayer = node(this.battle, 'Sparks');
    for (let i = 0; i < LIMITS.enemies; i++) { const s: Slot = sprite(enemyLayer, 'Enemy' + i, this.frames[0], 0, 0, 60, 60); s.node.active = false; s.flash = sprite(hitLayer, 'Hit' + i, this.dot, 0, 0, 52, 52).node; s.opacity = s.flash.addComponent(UIOpacity); s.flash.active = false; this.enemies.push(s); }
    for (let i = 0; i < LIMITS.bullets; i++) { const s = sprite(projectileLayer, 'Bolt' + i, this.dot, 0, 0, 9, 40); s.sprite.color = this.mint; s.node.active = false; this.bullets.push(s); }
    for (let i = 0; i < LIMITS.effects; i++) { const s: Slot = sprite(fxLayer, 'Spark' + i, this.dot, 0, 0, 13, 13); s.sprite.color = this.gold; s.opacity = s.node.addComponent(UIOpacity); s.node.active = false; this.effects.push(s); }
    for (let i = 0; i < LIMITS.waves; i++) { const n = node(waveLayer, 'Wave' + i), arc = node(n, 'Arc'); n.active = false; this.waves.push({ node: n, arc, g: arc.addComponent(Graphics), width: -1, opacity: n.addComponent(UIOpacity) }); }
    this.shield = node(this.battle, 'DefenseLine'); const g = this.shield.addComponent(Graphics);
    g.moveTo(14, 0); g.quadraticCurveTo(210, 10, 406, 0); g.strokeColor = color('#74f1cb72'); g.lineWidth = 2; g.stroke();
    this.energy = node(this.root, 'RhythmInstrument');
    this.glow = sprite(this.energy, 'CoreGlow', this.dot, 0, 0, 330, 330).node; this.glow.getComponent(Sprite)!.color = this.mint; this.glowOpacity = this.glow.addComponent(UIOpacity);
    this.halo = node(this.energy, 'BeatHalo'); const hg = this.halo.addComponent(Graphics); hg.circle(0, 0, 120); hg.lineWidth = 2; hg.strokeColor = color('#a2ffda'); hg.stroke(); this.haloOpacity = this.halo.addComponent(UIOpacity);
    this.guide = node(this.energy, 'AimGuide'); const gg = this.guide.addComponent(Graphics); gg.moveTo(-7, 112); gg.lineTo(-16, 215); gg.lineTo(16, 215); gg.lineTo(7, 112); gg.close(); gg.fillColor = color('#94ffda16'); gg.fill();
    this.cannon = sprite(this.energy, 'Cannon', assets.cannon, 0, 0, 260, 260).node;
    this.muzzle = sprite(this.energy, 'MuzzleFlash', this.dot, 0, -104, 38, 62).node; this.muzzleOpacity = this.muzzle.addComponent(UIOpacity);
    for (let i = 0; i < 7; i++) {
      const n = node(this.energy, 'BeatKey' + i, (i - 3) * 22 - 5, -150, 10, 26), bg = n.addComponent(Graphics);
      bg.roundRect(0, 0, 10, 26, 3); bg.fillColor = color('#223c38'); bg.fill(); bg.lineWidth = 1; bg.strokeColor = color('#b7a370'); bg.stroke(); bg.roundRect(2, 2, 6, 22, 2); bg.fillColor = i === 3 ? this.gold : this.mint; bg.fill(); this.beatBars.push(n);
    }
  }
  resize(height: number, width: number, safeTop: number, safeBottom: number) {
    this.height = height; this.width = width; this.safeTop = safeTop; this.safeBottom = safeBottom; this.layout = arenaLayout(height, safeTop, safeBottom); this.homePosition = homeLayout(height, safeTop, safeBottom);
    // Cover the viewport without stretching the planets.
    const imageRatio = 2 / 3, coverW = Math.max(width + 4, height * imageRatio), coverH = coverW / imageRatio;
    this.space.getComponent(UITransform)!.setContentSize(coverW, coverH); this.space.setPosition(210, -height / 2);
    this.shield.setPosition(0, -this.layout.defenseY);
  }
  private energyTexture() {
    const w = 32, h = 32, pixels = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (x + .5 - w / 2) / (w / 2), dy = (y + .5 - h / 2) / (h / 2), d = dx * dx + dy * dy, p = (y * w + x) * 4; pixels[p] = pixels[p + 1] = pixels[p + 2] = 255; pixels[p + 3] = Math.round(255 * Math.max(0, Math.exp(-d * 5) - .006)); }
    const texture = new Texture2D(); texture.reset({ width: w, height: h, format: Texture2D.PixelFormat.RGBA8888 }); texture.uploadData(pixels); texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
    const f = new SpriteFrame(); f.texture = texture; f.packable = false; this.ownedFrames.push(f); this.ownedTextures.push(texture); return f;
  }
  render(run: Combat | null, time: number, home: boolean, launch: number | null = null) {
    const launching = launch !== null, idle = home || launching, progress = launch === null ? 1 : launch;
    this.battle.active = !idle && !!run;
    const phase = (time / (run ? run.beat : 60 / 108)) % 1, pulse = Math.exp(-phase * 12), h = this.homePosition;
    const y = home ? h.heroY : h.heroY + (this.layout.cannonY - h.heroY) * progress;
    this.energy.setPosition(210, -y, 0);
    const energyScale = home ? h.heroSize / 260 : h.heroSize / 260 + (.89 - h.heroSize / 260) * progress; this.energy.setScale(energyScale, energyScale, 1);
    const shotAge = run ? run.time - run.lastShot : 99, kick = shotAge < .13 ? Math.sin(Math.min(1, shotAge / .13) * Math.PI) * 6 : 0;
    const pressed = run && run.held && !idle; const scale = (pressed ? .986 : 1) + pulse * .012;
    this.cannon.setScale(scale, scale, 1); this.cannon.angle = idle || !run ? 0 : -(run.aim + Math.PI / 2) * 180 / Math.PI;
    this.cannon.setPosition(run && !idle ? -Math.cos(run.aim) * kick : 0, run && !idle ? Math.sin(run.aim) * kick : 0);
    this.guide.active = !!pressed; this.guide.angle = this.cannon.angle;
    this.muzzle.active = !idle && !!run && shotAge < .085;
    if (run && this.muzzle.active) { this.muzzle.setPosition(Math.cos(run.aim) * 114, -Math.sin(run.aim) * 114); this.muzzle.angle = this.cannon.angle; this.muzzleOpacity.opacity = Math.round(255 * (1 - shotAge / .085)); this.muzzle.setScale(1 + shotAge * 4, 1 + shotAge * 5, 1); }
    this.glowOpacity.opacity = Math.round(home ? 36 + pulse * 34 : run && run.overdrive > 0 ? 110 + pulse * 75 : 25 + pulse * 34);
    this.halo.setScale(.94 + (1 - phase) * .18, .94 + (1 - phase) * .18, 1); this.haloOpacity.opacity = Math.round(35 + pulse * 150);
    for (let i = 0; i < this.beatBars.length; i++) { const s = .45 + Math.abs(Math.sin(time * 3 + i * .65)) * .4 + pulse * .55; this.beatBars[i].setScale(1, s, 1); }
    if (!run || idle) { this.battle.setPosition(0, 0); return; }
    // Brief camera impulse only. Simulation, music and touch coordinates never stop or shake.
    const hurtAge = run.time - run.lastHurt, pulseAge = run.time - run.lastPulse;
    const amplitude = hurtAge < .22 ? (1 - hurtAge / .22) * 3 : pulseAge < .13 ? (1 - pulseAge / .13) * 1.7 : 0;
    this.battle.setPosition(Math.sin(run.time * 93) * amplitude, Math.cos(run.time * 81) * amplitude * .6);
    const blend = run.accumulator / LIMITS.step;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = run.enemies.items[i], s = this.enemies[i]; if (s.node.active !== e.active) s.node.active = e.active; s.flash!.active = e.active && e.hit > 0; if (!e.active) continue;
      const k = e.type === 3 ? 2.65 : e.type === 1 ? 1.3 : 1;
      if (s.gen !== e.gen) { s.gen = e.gen; s.type = e.type; s.sprite.spriteFrame = this.frames[e.type]; }
      const hitScale = 1 + e.hit * .55; s.node.setScale(k * hitScale, k / hitScale, 1);
      const x = e.px + (e.x - e.px) * blend, y = arenaY(e.py + (e.y - e.py) * blend, this.layout);
      s.node.setPosition(x, -y, 0); s.node.angle = Math.sin(e.age * 2.1 + e.phase) * (e.type === 3 ? 4 : 8);
      if (s.hit !== (e.hit > 0)) { s.hit = e.hit > 0; s.sprite.color = s.hit ? this.flash : this.white; }
      if (s.flash!.active) { s.flash!.setPosition(x, -y); s.flash!.setScale(k, k, 1); s.opacity!.opacity = Math.round(190 * e.hit / .09); }
    }
    for (let i = 0; i < this.bullets.length; i++) { const b = run.bullets.items[i], s = this.bullets[i]; if (s.node.active !== b.active) s.node.active = b.active; if (!b.active) continue; const y = b.py + (b.y - b.py) * blend; s.node.setPosition(b.px + (b.x - b.px) * blend, -arenaY(y, this.layout), 0); s.node.angle = -Math.atan2(b.vy * (y <= 580 ? this.layout.scale : 1), b.vx) * 180 / Math.PI - 90; const type = b.kind === 1 || run.overdrive > 0 ? 1 : 0; if (s.type !== type) { s.type = type; s.sprite.color = type ? this.gold : this.mint; s.node.setScale(type ? 1.4 : 1, type ? 1.25 : 1, 1); } }
    for (let i = 0; i < this.effects.length; i++) { const f = run.effects.items[i], s = this.effects[i]; if (s.node.active !== f.active) s.node.active = f.active; if (!f.active) continue; s.node.setPosition(f.x, -arenaY(f.y, this.layout)); const life = f.life / f.maxLife, scale = f.size / (f.kind === 3 ? 3 : 2.5) * (.5 + life); s.node.setScale(scale, f.kind === 3 ? scale * .4 : scale, 1); s.node.angle = Math.atan2(f.vy, f.vx) * -180 / Math.PI; s.opacity!.opacity = Math.round(life * 255); if (s.type !== f.kind) { s.type = f.kind; s.sprite.color = f.kind === 2 ? this.orange : f.kind === 3 ? this.white : this.gold; } }
    for (let i = 0; i < this.waves.length; i++) { const w = run.waves.items[i], s = this.waves[i]; if (s.node.active !== w.active) s.node.active = w.active; if (!w.active) continue;
      if (s.width !== w.width) { s.width = w.width; s.g.clear(); for (let pass = 0; pass < 3; pass++) { s.g.moveTo(Math.cos(-Math.PI / 2 - w.width) * 64, -Math.sin(-Math.PI / 2 - w.width) * 64); for (let k = 1; k <= 28; k++) { const a = -Math.PI / 2 - w.width + k / 28 * w.width * 2; s.g.lineTo(Math.cos(a) * 64, -Math.sin(a) * 64); } s.g.lineWidth = pass === 0 ? 10 : pass === 1 ? 4 : 1.2; s.g.strokeColor = this.waveColors[pass]; s.g.stroke(); } }
      s.arc.angle = -(w.angle + Math.PI / 2) * 180 / Math.PI;
      s.node.setPosition(w.x, -arenaY(w.y, this.layout)); s.node.setScale(w.radius / 64, w.radius / 64 * this.layout.scale, 1); s.opacity.opacity = Math.round(Math.max(0, 1 - w.radius / 900) * 255);
    }
  }
  reset() { for (const s of this.enemies) s.gen = -1; }
  counts() { return { enemyNodes: this.enemies.length, hitNodes: this.enemies.length, projectileNodes: this.bullets.length, effectNodes: this.effects.length, waveNodes: this.waves.length }; }
  dispose() { this.root.destroy(); for (const f of this.ownedFrames) f.destroy(); for (const t of this.ownedTextures) t.destroy(); }
}
