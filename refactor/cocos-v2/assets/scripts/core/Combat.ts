export const RULESET = 'v2-20261123';
export const LIMITS = Object.freeze({ enemies: 64, bullets: 192, waves: 10, effects: 96, step: 1 / 60, maxSteps: 4 });
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function hash(text: string) { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; }
export function dayKey(now = Date.now()) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
export const UPGRADES = [
  { id: 'spread', name: '分裂弹舱', desc: '额外两束侧向弹幕，封住两翼。', family: '覆盖' },
  { id: 'pierce', name: '贯穿弹芯', desc: '每枚弹穿透一架敌机，伤害提升。', family: '穿透' },
  { id: 'chain', name: '连锁引爆', desc: '击破震伤附近敌机，可连锁爆破。', family: '爆破' },
  { id: 'seeker', name: '追猎导弹', desc: '每两拍自动追击最靠近防线的敌人。', family: '追踪' },
  { id: 'resonance', name: '共振波峰', desc: '强拍冲击更宽、更强；超载延长。', family: '节奏' },
  { id: 'repair', name: '护盾回流', desc: '立即回复 25 护盾；强拍还能修复护盾。', family: '续航' },
] as const;
export type UpgradeId = typeof UPGRADES[number]['id'];
export type Mode = 'campaign' | 'daily';
export interface Enemy { active: boolean; gen: number; type: number; x: number; y: number; px: number; py: number; hp: number; maxHp: number; radius: number; age: number; speed: number; phase: number; hit: number; lastWave: number; next: number; }
export interface Bullet { active: boolean; x: number; y: number; px: number; py: number; vx: number; vy: number; age: number; damage: number; pierce: number; lastEnemy: number; lastGen: number; kind: number; }
export interface Wave { active: boolean; id: number; x: number; y: number; radius: number; previous: number; angle: number; width: number; damage: number; }
export interface Effect { active: boolean; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; kind: number; }
export class Pool<T extends { active: boolean }> {
  readonly items: T[]; cursor = 0; peak = 0;
  constructor(size: number, factory: () => T) { this.items = Array.from({ length: size }, factory); }
  take(): T | null { const a = this.items; for (let k = 0; k < a.length; k++) { const i = (this.cursor + k) % a.length; if (!a[i].active) { this.cursor = (i + 1) % a.length; a[i].active = true; return a[i]; } } return null; }
  clear() { for (const v of this.items) v.active = false; this.cursor = 0; }
  count() { let n = 0; for (const v of this.items) if (v.active) n++; this.peak = Math.max(this.peak, n); return n; }
}
export interface RunOptions { mode: Mode; level: number; day?: string; seed?: number; height: number; bpm?: number; power?: number; support?: number; widthUpgrade?: number; }
/** Pure simulation. Fixed pools and broadphase grid; no rendering/audio/storage in the hot loop. */
export class Combat {
  readonly enemies = new Pool<Enemy>(LIMITS.enemies, () => ({ active: false, gen: 0, type: 0, x: 0, y: 0, px: 0, py: 0, hp: 0, maxHp: 0, radius: 0, age: 0, speed: 0, phase: 0, hit: 0, lastWave: 0, next: -1 }));
  readonly bullets = new Pool<Bullet>(LIMITS.bullets, () => ({ active: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, age: 0, damage: 0, pierce: 0, lastEnemy: -1, lastGen: -1, kind: 0 }));
  readonly waves = new Pool<Wave>(LIMITS.waves, () => ({ active: false, id: 0, x: 0, y: 0, radius: 0, previous: 0, angle: 0, width: 0, damage: 0 }));
  readonly effects = new Pool<Effect>(LIMITS.effects, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, kind: 0 }));
  readonly grid = new Int16Array(6 * 18);
  readonly upgrades: Record<UpgradeId, number> = { spread: 0, pierce: 0, chain: 0, seeker: 0, resonance: 0, repair: 0 };
  readonly mode: Mode; readonly level: number; readonly day: string; readonly seed: number;
  readonly duration: number; readonly beat: number; readonly baseDamage: number; readonly baseSupport: number; readonly waveWidth: number;
  height: number; defenseY: number; cannonY: number; time = 0; accumulator = 0; steps = 0; skippedSeconds = 0;
  state: 'playing' | 'upgrade' | 'won' | 'lost' = 'playing'; hp = 100; score = 0; kills = 0; perfects = 0; combo = 0; maxCombo = 0;
  energy = 0; overdrive = 0; held = false; aim = -Math.PI / 2; lastBeat = -1; lastPulse = -100; lastHurt = -100; revived = false;
  bossSpawned = false; bossKilled = false; bossIndex = -1; draft = 0; choices: UpgradeId[] = []; collisionChecks = 0;
  private randomState: number; private cosmeticState = 9271; private spawnClock = .6; private shotClock = 0; private missileClock = 1; private waveId = 0; private generation = 0; private bossClock = 0;
  private deathQueue = new Int16Array(LIMITS.enemies); private deathCount = 0;
  constructor(o: RunOptions) {
    this.mode = o.mode; this.level = clamp(Math.floor(o.level), 1, 100); this.day = o.day || dayKey();
    this.seed = o.seed === undefined ? hash(RULESET + (o.mode === 'daily' ? this.day : String(this.level))) : o.seed >>> 0;
    this.randomState = this.seed; this.height = o.height; this.cannonY = o.height - 142; this.defenseY = o.height - 260;
    this.duration = o.mode === 'daily' ? 90 : this.level <= 2 ? 60 : 75;
    this.beat = 60 / (o.bpm || 104);
    this.baseDamage = 8 * (1 + (o.mode === 'campaign' ? clamp(o.power || 0, 0, 20) * .06 : 0));
    this.baseSupport = o.mode === 'campaign' ? clamp(o.support || 0, 0, 10) : 0;
    this.waveWidth = .75 + (o.mode === 'campaign' ? clamp(o.widthUpgrade || 0, 0, 10) * .022 : 0);
  }
  random() { let t = this.randomState += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  private cosmetic() { this.cosmeticState = Math.imul(this.cosmeticState, 1664525) + 1013904223 | 0; return (this.cosmeticState >>> 0) / 4294967296; }
  aimAt(x: number) { this.aim = -Math.PI / 2 + clamp((x - 210) / 170, -1, 1) * .88; }
  tap(clock = this.time) {
    if (this.state !== 'playing') return false;
    const b = Math.round(clock / this.beat), err = Math.abs(clock - b * this.beat);
    if (err > .12 || b <= this.lastBeat) return false;
    this.lastBeat = b; this.perfects++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.lastPulse = this.time;
    this.energy = Math.min(100, this.energy + 25); this.hp = Math.min(100, this.hp + this.upgrades.repair * 1.2);
    this.score += 20 * (1 + Math.min(3, Math.floor(this.combo / 8)));
    if (this.energy >= 100) { this.energy = 0; this.overdrive = 4 + this.upgrades.resonance; }
    this.pulse(); return true;
  }
  private pulse() { const w = this.waves.take(); if (!w) return; w.id = ++this.waveId; w.x = 210; w.y = this.defenseY + 22; w.radius = 18; w.previous = 0; w.angle = this.aim; w.width = this.waveWidth + this.upgrades.resonance * .16; w.damage = this.baseDamage * (2.4 + this.upgrades.resonance * .75); }
  advance(dt: number) {
    if (this.state !== 'playing') return;
    this.accumulator += Math.min(Math.max(0, dt), .1); if (dt > .1) this.skippedSeconds += dt - .1;
    let n = 0; while (this.accumulator + 1e-10 >= LIMITS.step && n < LIMITS.maxSteps && this.state === 'playing') { this.accumulator -= LIMITS.step; this.step(); n++; }
    if (this.accumulator >= LIMITS.step) { this.skippedSeconds += this.accumulator; this.accumulator %= LIMITS.step; }
  }
  private step() {
    const dt = LIMITS.step; this.time += dt; this.steps++; this.overdrive = Math.max(0, this.overdrive - dt);
    const upgradeAt = this.draft === 0 ? 18 : this.draft === 1 ? 38 : this.draft === 2 && this.mode === 'daily' ? 58 : 1000;
    if (this.time >= upgradeAt) { this.state = 'upgrade'; this.held = false; this.choices = this.offer(); return; }
    if (!this.bossSpawned && this.time >= this.duration - 18) { this.spawn(3, 210, 150); this.bossSpawned = true; }
    this.spawnClock -= dt;
    if (this.spawnClock <= 0 && this.time < this.duration - 7) {
      const pressure = this.mode === 'daily' ? 1.25 : .8 + Math.min(1.4, (this.level - 1) * .025);
      this.spawnClock = Math.max(.44, (1.2 - this.time / this.duration * .55) / pressure);
      const count = this.time < 5 ? 1 : 2 + (this.time > 28 ? 1 : 0);
      const side = this.random() < .18;
      for (let i = 0; i < count; i++) this.spawn(this.time < 7 ? 0 : this.random() < .22 ? 1 : this.random() < .2 ? 2 : 0, side ? (this.random() < .5 ? 24 : 396) : 38 + this.random() * 344, side ? 180 + this.random() * 70 : 104 - i * 35);
    }
    this.shotClock -= dt; this.missileClock -= dt;
    if (this.held && this.shotClock <= 0) { this.fire(); this.shotClock = this.overdrive > 0 ? .105 : .17; }
    if (this.upgrades.seeker && this.missileClock <= 0) { this.missileClock = this.beat * 2; this.projectile(this.aim, 1); }
    this.grid.fill(-1); this.deathCount = 0;
    for (let i = 0; i < this.enemies.items.length; i++) {
      const e = this.enemies.items[i]; if (!e.active) continue; e.px = e.x; e.py = e.y; e.age += dt; e.hit = Math.max(0, e.hit - dt);
      if (e.type === 3) {
        e.x = 210 + Math.sin(e.age * .9) * 112; e.y = 174 + Math.sin(e.age * .6) * 26; this.bossClock -= dt;
        if (this.bossClock <= 0) { this.bossClock = 2.8; this.spawn(0, clamp(e.x - 45, 28, 392), e.y + 45); this.spawn(0, clamp(e.x + 45, 28, 392), e.y + 45); }
      } else {
        e.y += e.speed * dt; e.x += (Math.sin(e.age * 2.1 + e.phase) * (e.type === 0 ? 17 : 7) + (210 - e.x) * .05) * dt;
        if (e.y + e.radius >= this.defenseY) { e.active = false; this.hp = Math.max(0, this.hp - (e.type === 1 ? 13 : e.type === 2 ? 9 : 6)); this.combo = 0; this.energy = Math.max(0, this.energy - 12); this.lastHurt = this.time; this.burst(e.x, this.defenseY, 2, 5); continue; }
      }
      const cell = clamp(Math.floor(e.y / 70), 0, 17) * 6 + clamp(Math.floor(e.x / 70), 0, 5); e.next = this.grid[cell]; this.grid[cell] = i;
    }
    for (const b of this.bullets.items) {
      if (!b.active) continue; b.px = b.x; b.py = b.y; b.age += dt;
      if (b.kind === 1) { let target: Enemy | null = null; for (const e of this.enemies.items) if (e.active && (!target || e.y > target.y)) target = e; if (target) { const a = Math.atan2(target.y - b.y, target.x - b.x); b.vx += (Math.cos(a) * 600 - b.vx) * .18; b.vy += (Math.sin(a) * 600 - b.vy) * .18; } }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.age > 2 || b.x < -30 || b.x > 450 || b.y < 50) { b.active = false; continue; }
      const minX = clamp(Math.floor((Math.min(b.px, b.x) - 56) / 70), 0, 5), maxX = clamp(Math.floor((Math.max(b.px, b.x) + 56) / 70), 0, 5);
      const minY = clamp(Math.floor((Math.min(b.py, b.y) - 56) / 70), 0, 17), maxY = clamp(Math.floor((Math.max(b.py, b.y) + 56) / 70), 0, 17);
      for (let gy = minY; gy <= maxY && b.active; gy++) for (let gx = minX; gx <= maxX && b.active; gx++) {
        let j = this.grid[gy * 6 + gx]; while (j >= 0 && b.active) { const e = this.enemies.items[j]; const next = e.next;
          if (e.active && e.hp > 0 && !(j === b.lastEnemy && e.gen === b.lastGen)) {
            this.collisionChecks++; const dx = b.x - b.px, dy = b.y - b.py, den = dx * dx + dy * dy;
            const f = den ? clamp(((e.x - b.px) * dx + (e.y - b.py) * dy) / den, 0, 1) : 0;
            const x = b.px + dx * f - e.x, y = b.py + dy * f - e.y;
            if (x * x + y * y <= (e.radius + 4) ** 2) { this.hit(e, b.damage); b.lastEnemy = j; b.lastGen = e.gen; if (b.pierce-- <= 0) b.active = false; }
          } j = next;
        }
      }
    }
    for (const w of this.waves.items) {
      if (!w.active) continue; w.previous = w.radius; w.radius += 520 * dt; if (w.radius > this.height) { w.active = false; continue; }
      for (const e of this.enemies.items) if (e.active && e.hp > 0 && e.lastWave !== w.id) {
        const dx = e.x - w.x, dy = e.y - w.y, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), gap = Math.abs(Math.atan2(Math.sin(a - w.angle), Math.cos(a - w.angle)));
        if (r + e.radius >= w.previous && r - e.radius <= w.radius && gap < w.width) { e.lastWave = w.id; this.hit(e, w.damage); }
      }
    }
    // Iterative bounded chain damage: each enemy enters the queue at most once.
    for (let k = 0; k < this.deathCount; k++) {
      const e = this.enemies.items[this.deathQueue[k]]; if (!e.active) continue; e.active = false; this.kills++;
      this.score += (e.type === 3 ? 1800 : e.type === 1 ? 70 : 35) * (1 + Math.min(3, Math.floor(this.combo / 8)));
      this.burst(e.x, e.y, e.type === 3 ? 1 : 0, e.type === 3 ? 16 : 5);
      if (e.type === 3) this.bossKilled = true;
      if (this.upgrades.chain) for (const other of this.enemies.items) if (other.active && other.hp > 0 && (other.x - e.x) ** 2 + (other.y - e.y) ** 2 < (52 + 12 * this.upgrades.chain) ** 2) this.hit(other, this.baseDamage * this.upgrades.chain);
    }
    for (const f of this.effects.items) if (f.active) { f.life -= dt; if (f.life <= 0) f.active = false; else { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .94; f.vy *= .94; } }
    if (this.hp <= 0) this.state = 'lost'; else if (this.time >= this.duration) this.state = this.bossKilled ? 'won' : 'lost';
  }
  private hit(e: Enemy, damage: number) { if (e.hp <= 0) return; e.hp -= damage; e.hit = .075; if (e.hp <= 0 && this.deathCount < this.deathQueue.length) this.deathQueue[this.deathCount++] = this.enemies.items.indexOf(e); }
  spawn(type: number, x: number, y: number) {
    const e = this.enemies.take(); if (!e) return; const scale = this.mode === 'daily' ? 1.7 : 1 + (this.level - 1) * .035;
    e.gen = ++this.generation; e.type = type; e.x = e.px = x; e.y = e.py = y; e.age = 0; e.phase = this.random() * 6.28;
    e.radius = type === 3 ? 50 : type === 1 ? 23 : 17; e.maxHp = e.hp = (type === 3 ? 250 : type === 1 ? 31 : type === 2 ? 22 : 8) * scale;
    e.speed = (type === 1 ? 30 : type === 2 ? 39 : 51) * (1 + Math.min(.55, (this.level - 1) * .009)); e.hit = 0; e.lastWave = 0; e.next = -1;
    if (type === 3) { this.bossIndex = this.enemies.items.indexOf(e); this.bossClock = 2; }
  }
  private fire() { const n = 3 + this.upgrades.spread * 2; for (let j = 0; j < n; j++) this.projectile(this.aim + (j - (n - 1) / 2) * .115, 0); }
  private projectile(angle: number, kind: number) { const b = this.bullets.take(); if (!b) return; b.x = b.px = 210 + Math.cos(angle) * 18; b.y = b.py = this.defenseY + 28; b.vx = Math.cos(angle) * 700; b.vy = Math.sin(angle) * 700; b.age = 0; b.kind = kind; b.damage = this.baseDamage * (1 + this.upgrades.pierce * .22) * (this.overdrive > 0 ? 1.65 : 1) * (kind === 1 ? 3 + this.baseSupport * .15 : 1); b.pierce = kind ? 0 : this.upgrades.pierce; b.lastEnemy = b.lastGen = -1; }
  private burst(x: number, y: number, kind: number, n: number) { for (let i = 0; i < n; i++) { const f = this.effects.take(); if (!f) return; const a = this.cosmetic() * 6.28, v = 35 + this.cosmetic() * 130; f.x = x; f.y = y; f.vx = Math.cos(a) * v; f.vy = Math.sin(a) * v; f.maxLife = f.life = .22 + this.cosmetic() * .28; f.kind = kind; f.size = 3 + this.cosmetic() * 5; } }
  private offer(): UpgradeId[] { const ids: UpgradeId[] = ['spread', 'pierce', 'chain', 'seeker', 'resonance', 'repair']; const result: UpgradeId[] = []; for (let n = 0; n < 3; n++) { const i = Math.floor(this.random() * ids.length); result.push(ids.splice(i, 1)[0]); } return result; }
  choose(id: UpgradeId) { if (this.state !== 'upgrade' || !this.choices.includes(id)) return false; this.upgrades[id]++; if (id === 'repair') this.hp = Math.min(100, this.hp + 25); this.draft++; this.state = 'playing'; this.accumulator = 0; return true; }
  revive() { if (this.mode !== 'campaign' || this.state !== 'lost' || this.revived || this.time >= this.duration) return false; this.revived = true; this.hp = 60; this.energy = 100; this.state = 'playing'; this.held = false; for (const e of this.enemies.items) if (e.active && e.type !== 3 && e.y > this.defenseY - 180) e.active = false; return true; }
  snapshot() { return { state: this.state, time: +this.time.toFixed(3), hp: this.hp, score: this.score, kills: this.kills, perfects: this.perfects, combo: this.combo, mode: this.mode, level: this.level, seed: this.seed, enemies: this.enemies.count(), bullets: this.bullets.count(), waves: this.waves.count(), effects: this.effects.count(), steps: this.steps, collisionChecks: this.collisionChecks, skippedSeconds: this.skippedSeconds, bossKilled: this.bossKilled, upgrades: { ...this.upgrades } }; }
}
