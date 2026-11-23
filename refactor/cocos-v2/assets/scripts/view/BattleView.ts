import { Node, Sprite, SpriteFrame, Texture2D, Rect, Size, Vec2, Graphics, UIOpacity } from 'cc';
import { Combat, LIMITS } from '../core/Combat';
import { node, sprite, color } from './UI';
type Slot = { node: Node; sprite: Sprite; gen?: number; type?: number; hit?: boolean };
/** Native Cocos batched sprites. Pools are allocated once, outside combat. */
export class BattleView {
  readonly root: Node; readonly battle: Node; readonly cannon: Node; readonly energy: Node; readonly halo: Node;
  private enemies: Slot[] = []; private bullets: Slot[] = []; private effects: Slot[] = [];
  private waves: { node: Node; g: Graphics; id: number }[] = []; private frames: SpriteFrame[] = []; private dot: SpriteFrame;
  private beatBars: Node[] = []; private ownedFrames: SpriteFrame[] = []; private ownedTextures: Texture2D[] = [];
  private white = color('#ffffff'); private flash = color('#b7fff2'); private mint = color('#70ffe0'); private gold = color('#ffe3a1'); private orange = color('#ff9270');
  constructor(parent: Node, readonly height: number, assets: Record<string, SpriteFrame>) {
    this.root = node(parent, 'World');
    sprite(this.root, 'Space', assets['deep-space'], 210, height / 2, 420, height);
    this.battle = node(this.root, 'BattlePool');
    const atlas = assets.enemies; const size = atlas.rect.width / 2;
    for (let i = 0; i < 4; i++) { const f = new SpriteFrame(); f.reset({ texture: atlas.texture, rect: new Rect(i % 2 * size, Math.floor(i / 2) * size, size, size), originalSize: new Size(size, size), offset: new Vec2(0, 0) }); f.packable = false; this.frames.push(f); this.ownedFrames.push(f); }
    this.dot = this.energyTexture();
    // Dedicated layers preserve batching instead of interleaving text and projectiles.
    const enemyLayer = node(this.battle, 'Enemies'), projectileLayer = node(this.battle, 'Projectiles'), waveLayer = node(this.battle, 'Shockwaves'), fxLayer = node(this.battle, 'Sparks');
    for (let i = 0; i < LIMITS.enemies; i++) { const s = sprite(enemyLayer, 'Enemy' + i, this.frames[0], 0, 0, 54, 54); s.node.active = false; this.enemies.push(s); }
    for (let i = 0; i < LIMITS.bullets; i++) { const s = sprite(projectileLayer, 'Bolt' + i, this.dot, 0, 0, 9, 30); s.sprite.color = this.mint; s.node.active = false; this.bullets.push(s); }
    for (let i = 0; i < LIMITS.effects; i++) { const s = sprite(fxLayer, 'Spark' + i, this.dot, 0, 0, 10, 10); s.sprite.color = this.gold; s.node.active = false; this.effects.push(s); }
    for (let i = 0; i < LIMITS.waves; i++) { const n = node(waveLayer, 'Wave' + i); n.active = false; this.waves.push({ node: n, g: n.addComponent(Graphics), id: -1 }); }
    const shield = node(this.battle, 'DefenseLine', 18, height - 260); const g = shield.addComponent(Graphics); g.moveTo(0, 0); g.lineTo(384, 0); g.strokeColor = color('#72f3d34a'); g.lineWidth = 2; g.stroke();
    this.energy = node(this.root, 'RhythmInstrument');
    this.halo = node(this.energy, 'BeatHalo'); const hg = this.halo.addComponent(Graphics); hg.circle(0, 0, 126); hg.lineWidth = 2; hg.strokeColor = color('#78ffe887'); hg.stroke(); this.halo.addComponent(UIOpacity);
    this.cannon = sprite(this.energy, 'Cannon', assets.cannon, 0, 0, 274, 274).node;
    for (let i = 0; i < 7; i++) { const s = sprite(this.energy, 'Equalizer' + i, this.dot, (i - 3) * 26, -161, 17, 34); s.sprite.color = i === 3 ? this.gold : this.mint; this.beatBars.push(s.node); }
  }
  private energyTexture() {
    const w = 32, h = 32, pixels = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (x + .5 - w / 2) / (w / 2), dy = (y + .5 - h / 2) / (h / 2), d = dx * dx + dy * dy, p = (y * w + x) * 4; pixels[p] = pixels[p + 1] = pixels[p + 2] = 255; pixels[p + 3] = Math.round(255 * Math.max(0, Math.exp(-d * 4) - .018)); }
    const texture = new Texture2D(); texture.reset({ width: w, height: h, format: Texture2D.PixelFormat.RGBA8888 }); texture.uploadData(pixels); texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
    const f = new SpriteFrame(); f.texture = texture; f.packable = false; this.ownedFrames.push(f); this.ownedTextures.push(texture); return f;
  }
  render(run: Combat | null, time: number, home: boolean) {
    this.battle.active = !home && !!run;
    const phase = (time / (run ? run.beat : 60 / 104)) % 1, pulse = Math.exp(-phase * 10);
    this.energy.setPosition(210, -(home ? this.height * .476 : this.height - 132), 0);
    this.energy.setScale(home ? .96 : .83, home ? .96 : .83, 1);
    const scale = 1 + pulse * .024; this.cannon.setScale(scale, scale, 1);
    this.halo.setScale(1.12 + phase * .18, 1.12 + phase * .18, 1); this.halo.getComponent(UIOpacity)!.opacity = Math.round((1 - phase) * 150);
    for (let i = 0; i < this.beatBars.length; i++) { const s = .4 + Math.abs(Math.sin(time * 2.2 + i * .7)) * .6 + pulse * .35; this.beatBars[i].setScale(1, s, 1); }
    if (!run || home) return;
    const blend = run.accumulator / LIMITS.step;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = run.enemies.items[i], s = this.enemies[i]; if (s.node.active !== e.active) s.node.active = e.active; if (!e.active) continue;
      if (s.gen !== e.gen) { s.gen = e.gen; s.type = e.type; s.sprite.spriteFrame = this.frames[e.type]; const k = e.type === 3 ? 2.8 : e.type === 1 ? 1.32 : 1; s.node.setScale(k, k, 1); }
      s.node.setPosition(e.px + (e.x - e.px) * blend, -(e.py + (e.y - e.py) * blend), 0);
      s.node.angle = Math.sin(e.age * 2.1 + e.phase) * (e.type === 3 ? 5 : 8);
      if (s.hit !== (e.hit > 0)) { s.hit = e.hit > 0; s.sprite.color = s.hit ? this.flash : this.white; }
    }
    for (let i = 0; i < this.bullets.length; i++) { const b = run.bullets.items[i], s = this.bullets[i]; if (s.node.active !== b.active) s.node.active = b.active; if (!b.active) continue; s.node.setPosition(b.px + (b.x - b.px) * blend, -(b.py + (b.y - b.py) * blend), 0); s.node.angle = -Math.atan2(b.vy, b.vx) * 180 / Math.PI - 90; const type = b.kind === 1 || run.overdrive > 0 ? 1 : 0; if (s.type !== type) { s.type = type; s.sprite.color = type ? this.gold : this.mint; s.node.setScale(type ? 1.4 : 1, type ? 1.4 : 1, 1); } }
    for (let i = 0; i < this.effects.length; i++) { const f = run.effects.items[i], s = this.effects[i]; if (s.node.active !== f.active) s.node.active = f.active; if (!f.active) continue; s.node.setPosition(f.x, -f.y); const scale = f.size / 5 * f.life / f.maxLife; s.node.setScale(scale, scale, 1); if (s.type !== f.kind) { s.type = f.kind; s.sprite.color = f.kind === 2 ? this.orange : this.gold; } }
    for (let i = 0; i < this.waves.length; i++) { const w = run.waves.items[i], s = this.waves[i]; if (s.node.active !== w.active) s.node.active = w.active; if (!w.active) continue;
      if (s.id !== w.id) { s.id = w.id; s.g.clear(); for (let pass = 0; pass < 2; pass++) { s.g.moveTo(Math.cos(w.angle - w.width) * 64, -Math.sin(w.angle - w.width) * 64); for (let k = 1; k <= 24; k++) { const a = w.angle - w.width + k / 24 * w.width * 2; s.g.lineTo(Math.cos(a) * 64, -Math.sin(a) * 64); } s.g.lineWidth = pass ? 1.1 : 3.2; s.g.strokeColor = pass ? this.gold : color('#82ffcd32'); s.g.stroke(); } }
      s.node.setPosition(w.x, -w.y); s.node.setScale(w.radius / 64, w.radius / 64, 1);
    }
  }
  reset() { for (const s of this.enemies) s.gen = -1; for (const w of this.waves) w.id = -1; }
  counts() { return { enemyNodes: this.enemies.length, projectileNodes: this.bullets.length, effectNodes: this.effects.length, waveNodes: this.waves.length }; }
  dispose() { this.root.destroy(); for (const f of this.ownedFrames) f.destroy(); for (const t of this.ownedTextures) t.destroy(); }
}
