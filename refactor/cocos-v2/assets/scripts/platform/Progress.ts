import { clamp, dayKey, RULESET } from '../core/Combat';
export const SAVE_KEY = 'pulsefront-save-v2';
export const LEGACY_KEY = 'pulsefront-save-v1';
export const APP_ID = 'wx43da24c6ac1e5a12';
export const AD_UNIT_ID = 'adunit-34f3a0d585044563';
export function host(): any { return (globalThis as any).wx || null; }
export interface Save { version: number; unlocked: number; coins: number; growth: { power: number; spread: number; support: number }; stars: Record<string, number>; best: Record<string, number>; daily: Record<string, number>; receipts: Record<string, { base: number; doubled: boolean }>; sound: boolean; seen: boolean; legacy?: any; }
export function normalize(raw: any): Save {
  raw = raw && typeof raw === 'object' ? raw : {}; const g = raw.growth || {};
  const record = (value: any) => { const out: Record<string, number> = {}; if (value && typeof value === 'object') for (const k of Object.keys(value).slice(-120)) if (Number.isFinite(value[k]) && value[k] >= 0) out[k] = Math.min(999999999, value[k]); return out; };
  return { version: 2, unlocked: clamp(Math.floor(Number(raw.unlocked) || 1), 1, 100), coins: clamp(Math.floor(Number(raw.coins === undefined ? raw.economy && raw.economy.coins : raw.coins) || 0), 0, 999999999), growth: { power: clamp(Math.floor(Number(g.power) || 0), 0, 20), spread: clamp(Math.floor(Number(g.spread === undefined ? g.rate : g.spread) || 0), 0, 10), support: clamp(Math.floor(Number(g.support) || 0), 0, 10) }, stars: record(raw.stars), best: record(raw.best), daily: record(raw.daily), receipts: raw.version === 2 && raw.receipts && typeof raw.receipts === 'object' ? raw.receipts : {}, sound: raw.sound === undefined ? !(raw.settings && raw.settings.sound === false) : raw.sound !== false, seen: !!raw.seen, legacy: raw.version === 2 ? raw.legacy : raw };
}
export class Progress {
  save: Save; available = true;
  constructor(private storage: any) { let raw: any; try { raw = this.read(SAVE_KEY) || this.read(LEGACY_KEY); } catch { this.available = false; } this.save = normalize(raw); }
  private read(key: string) { const wx = host(); const v = wx && wx.getStorageSync ? wx.getStorageSync(key) : this.storage.getItem(key); return typeof v === 'string' && v ? JSON.parse(v) : v; }
  persist() { try { const value = JSON.stringify(this.save), wx = host(); if (wx && wx.setStorageSync) wx.setStorageSync(SAVE_KEY, value); else this.storage.setItem(SAVE_KEY, value); this.available = true; return true; } catch { this.available = false; return false; } }
  cost(key: 'power' | 'spread' | 'support') { const n = this.save.growth[key]; return Math.round((key === 'power' ? 35 : 50) * (1 + n * .75 + n * n * .18)); }
  buy(key: 'power' | 'spread' | 'support') { const cost = this.cost(key); if (this.save.growth[key] >= (key === 'power' ? 20 : 10) || this.save.coins < cost) return false; this.save.coins -= cost; this.save.growth[key]++; this.persist(); return true; }
  settle(id: string, run: any) {
    const prior = this.save.receipts[id];
    const win = run.state === 'won'; const base = Math.floor(run.kills * .8) + (win ? 45 + run.level * 3 : 0);
    const amount = run.mode === 'daily' ? 0 : base;
    const r = prior || { base: amount, doubled: false }; this.save.receipts[id] = r;
    this.save.coins += prior ? Math.max(0, amount - prior.base) : r.base;
    r.base = Math.max(r.base, amount);
    if (run.mode === 'campaign' && win) { this.save.unlocked = Math.max(this.save.unlocked, Math.min(100, run.level + 1)); const stars = run.hp >= 70 ? 3 : run.hp >= 35 ? 2 : 1; this.save.stars[run.level] = Math.max(this.save.stars[run.level] || 0, stars); this.save.best[run.level] = Math.max(this.save.best[run.level] || 0, run.score); }
    if (run.mode === 'daily' && !run.revived) { const k = RULESET + ':' + run.day; this.save.daily[k] = Math.max(this.save.daily[k] || 0, run.score); }
    const ids = Object.keys(this.save.receipts); for (const k of ids.slice(0, Math.max(0, ids.length - 40))) delete this.save.receipts[k];
    const days = Object.keys(this.save.daily).sort(); for (const k of days.slice(0, Math.max(0, days.length - 14))) delete this.save.daily[k];
    this.persist(); return r;
  }
  double(id: string) { const r = this.save.receipts[id]; if (!r || r.doubled || r.base <= 0) return false; r.doubled = true; this.save.coins += r.base; this.persist(); return true; }
  today() { return this.save.daily[RULESET + ':' + dayKey()] || 0; }
}
