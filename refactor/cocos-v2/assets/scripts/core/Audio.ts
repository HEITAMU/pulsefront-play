import { getTrack, frequency, stepTime } from './music';
import { host } from '../platform/Progress';
/** Cached short PCM voices. Preparation is time sliced; battle never synthesizes samples. */
export class Audio {
  ctx: any = null; bus: any = null; ready = false; muted = false; running = false; track: any; origin = 0; step = 0; duration = 90;
  private samples = new Map<string, any>(); private voices = new Set<any>(); private ticket = 0;
  private cues = new Map<string, any>(); private cueTimes: Record<string, number> = {};
  diagnostics() { return { ready: this.ready, running: this.running, state: this.ctx ? this.ctx.state : 'unavailable', voices: this.voices.size, samples: this.samples.size }; }
  activate() {
    try { if (!this.ctx) { const wx = host(), scope: any = globalThis; this.ctx = wx && wx.createWebAudioContext ? wx.createWebAudioContext() : new (scope.AudioContext || scope.webkitAudioContext)(); this.bus = this.ctx.createGain(); this.bus.gain.value = this.muted ? 0 : .6; this.bus.connect(this.ctx.destination); } if (this.ctx.resume) Promise.resolve(this.ctx.resume()).catch(() => {}); this.ready = !['closed', 'suspended', 'interrupted'].includes(this.ctx.state); return true; } catch { this.ready = false; return false; }
  }
  private key(e: any) { return e.instrument + ':' + (e.midi || 0) + ':' + Math.round(e.duration * 100); }
  private sample(e: any) {
    const ctx = this.ctx, rate = ctx.sampleRate || 44100, duration = Math.max(.055, Math.min(.85, e.duration + .07));
    const b = ctx.createBuffer(1, Math.ceil(rate * duration), rate), data = b.getChannelData(0), hz = frequency(e.midi || 40);
    const ins = String(e.instrument); const kick = ins === 'kick', snare = ins === 'snare', hat = ['hat', 'tamb', 'rim'].includes(ins), bass = ins === 'bass';
    let seed = 119, phase = 0, smoothed = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, env = Math.min(1, t / .004) * Math.exp(-t / (kick ? .065 : snare ? .045 : hat ? .018 : bass ? duration * .35 : duration * .28));
      seed = Math.imul(seed, 1664525) + 1013904223 | 0; const noise = (seed >>> 0) / 2147483648 - 1;
      smoothed += .25 * (noise - smoothed);
      phase += Math.PI * 2 * (kick ? 45 + 110 * Math.exp(-t * 45) : hz) / rate;
      let v = kick ? Math.sin(phase) * .85 : snare ? smoothed * .8 + Math.sin(2 * Math.PI * 170 * t) * .13 : hat ? (noise - smoothed) * .24 : Math.sin(phase) * (bass ? .65 : .22) + Math.sin(phase * 2) * .12 + Math.sin(phase * 3) * (bass ? .06 : .035);
      data[i] = Math.tanh(v * env);
    }
    return b;
  }
  private cue(name: string) {
    if (this.cues.has(name)) return this.cues.get(name);
    const rate = this.ctx.sampleRate || 44100, duration = name === 'perfect' ? .16 : name === 'break' ? .13 : .065;
    const b = this.ctx.createBuffer(1, Math.ceil(rate * duration), rate), data = b.getChannelData(0); let phase = 0, seed = 117;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, life = t / duration, envelope = Math.min(1, t / .0015) * Math.exp(-life * 6) * (1 - life);
      seed = Math.imul(seed, 1664525) + 1013904223 | 0; const noise = (seed >>> 0) / 2147483648 - 1;
      const pitch = name === 'shot' ? 150 - life * 95 : name === 'perfect' ? 115 + life * 80 : name === 'ui' ? 390 - life * 160 : 230 - life * 160;
      phase += Math.PI * 2 * pitch / rate;
      data[i] = (Math.sin(phase) * .65 + Math.sin(phase * 2.5) * .12 + noise * (name === 'hit' || name === 'break' ? .28 : .045)) * envelope;
    }
    this.cues.set(name, b); return b;
  }
  feedback(name: 'shot' | 'hit' | 'perfect' | 'break' | 'ui') {
    if (!this.ctx || this.muted || this.voices.size >= 60) return;
    const now = this.ctx.currentTime, interval = name === 'shot' ? .095 : name === 'hit' ? .07 : name === 'perfect' ? .3 : .1;
    if (now - (this.cueTimes[name] === undefined ? -100 : this.cueTimes[name]) < interval) return; this.cueTimes[name] = now;
    if (!this.running) this.bus.gain.value = .6;
    const s = this.ctx.createBufferSource(), gain = this.ctx.createGain(); s.buffer = this.cue(name);
    gain.gain.value = name === 'perfect' ? .29 : name === 'ui' ? .18 : name === 'shot' ? .09 : .115;
    s.connect(gain); gain.connect(this.bus); this.voices.add(s); s.onended = () => { this.voices.delete(s); try { s.disconnect(); gain.disconnect(); } catch {} }; s.start(now);
  }
  async prepare(level: number) {
    const ticket = ++this.ticket; this.track = getTrack(level); if (!this.ctx) return;
    this.pause(); this.samples.clear(); const events = this.track.events; let batchStart = Date.now();
    for (const name of ['shot', 'hit', 'perfect', 'break', 'ui']) this.cue(name);
    for (const e of events) { if (ticket !== this.ticket) return; const k = this.key(e); if (!this.samples.has(k)) this.samples.set(k, this.sample(e)); if (Date.now() - batchStart > 5) { await new Promise(r => setTimeout(r, 0)); batchStart = Date.now(); } }
  }
  start(offset: number, duration: number) { if (!this.ctx || !this.track) return; this.activate(); this.origin = this.ctx.currentTime - offset; this.step = Math.max(0, Math.floor(offset / (this.track.beat / 4))); this.duration = duration; this.running = true; this.tick(); }
  transportPosition(fallback: number) { return this.ctx && this.running ? Math.max(0, this.ctx.currentTime - this.origin) : fallback; }
  position(fallback: number) {
    if (!this.ctx || !this.running) return fallback;
    let audible = this.ctx.currentTime;
    try { const stamp = this.ctx.getOutputTimestamp && this.ctx.getOutputTimestamp(); if (stamp && stamp.contextTime > 0) audible = stamp.contextTime; else audible -= Math.min(.12, Number(this.ctx.outputLatency) || 0); } catch {}
    return Math.max(0, audible - this.origin);
  }
  tick() {
    if (!this.running || !this.ctx || !this.track) return;
    const now = this.ctx.currentTime, elapsed = now - this.origin;
    this.bus.gain.value = this.muted ? 0 : .6 * Math.min(1, Math.max(0, (this.duration - elapsed) / 4));
    if (elapsed > this.duration) { this.pause(); return; }
    // Skip stale scheduled work after a stall; never schedule a burst of missed notes.
    if (elapsed - stepTime(this.track, this.step) > .25) this.step = Math.floor(elapsed / (this.track.beat / 4));
    let budget = 16;
    while (this.origin + stepTime(this.track, this.step) < now + .095 && budget-- > 0) {
      const at = this.origin + stepTime(this.track, this.step), entries = this.track.byStep[this.step % (this.track.bars * 16)] || [];
      if (at >= now - .025) for (const e of entries) {
        if (this.voices.size >= 64) break; const sample = this.samples.get(this.key(e)); if (!sample) continue;
        const source = this.ctx.createBufferSource(), gain = this.ctx.createGain(); source.buffer = sample; gain.gain.value = Math.min(1, e.velocity || 1) * .55;
        source.connect(gain); gain.connect(this.bus); this.voices.add(source);
        source.onended = () => { this.voices.delete(source); try { source.disconnect(); gain.disconnect(); } catch {} };
        source.start(Math.max(now, at));
      }
      this.step++;
    }
  }
  pause() { this.running = false; for (const s of this.voices) { try { s.stop(); } catch {} if (s.onended) s.onended(); } this.voices.clear(); }
  dispose() { this.ticket++; this.pause(); this.samples.clear(); this.cues.clear(); if (this.ctx && this.ctx.close) this.ctx.close(); this.ctx = null; }
}
