System.register(["./rhythm.js?v=5c8bccdeaafa8f53", "../platform/Platform.js?v=5c8bccdeaafa8f53", "./arrangement.js?v=5c8bccdeaafa8f53", "./music.js?v=5c8bccdeaafa8f53"], function (exports_1, context_1) {
    "use strict";
    var rhythm_js_1, Platform_js_1, arrangement_js_1, music_js_1, Soundtrack;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (rhythm_js_1_1) {
                rhythm_js_1 = rhythm_js_1_1;
            },
            function (Platform_js_1_1) {
                Platform_js_1 = Platform_js_1_1;
            },
            function (arrangement_js_1_1) {
                arrangement_js_1 = arrangement_js_1_1;
            },
            function (music_js_1_1) {
                music_js_1 = music_js_1_1;
            }
        ],
        execute: function () {
            Soundtrack = class Soundtrack {
                constructor({ createContext = Platform_js_1.createAudioContext } = {}) {
                    this.createContext = createContext;
                    this.ctx = null;
                    this.muted = false;
                    this.running = false;
                    this.origin = 0;
                    this.step = 0;
                    this.timer = null;
                    this.track = music_js_1.getTrack(1);
                    this.volume = .52;
                    this.musicVolume = .74;
                    this.fxVolume = .55;
                    this.nodes = new Set();
                    this.effectNodes = new Set();
                    this.voiceCleanup = new Map();
                    this.disconnectTimers = new Set();
                    this.generation = 0;
                    this.tutorialLoop = false;
                }
                async unlock() {
                    try {
                        if (!this.ctx) {
                            const context = this.createContext();
                            if (!context)
                                return false;
                            this.setup(context);
                        }
                        if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function')
                            await this.ctx.resume();
                        return !this.ctx.state || this.ctx.state === 'running';
                    }
                    catch {
                        try {
                            this.ctx?.close?.();
                        }
                        catch { }
                        this.ctx = null;
                        return false;
                    }
                }
                setup(ctx) {
                    this.ctx = ctx;
                    this.master = ctx.createGain();
                    this.master.gain.value = this.muted ? 0 : this.volume;
                    this.music = ctx.createGain();
                    this.effects = ctx.createGain();
                    this.music.gain.value = this.musicVolume;
                    this.effects.gain.value = this.fxVolume;
                    this.music.connect(this.master);
                    this.effects.connect(this.master);
                    const limiter = this.limiter = ctx.createDynamicsCompressor();
                    limiter.threshold.value = -15;
                    limiter.knee.value = 14;
                    limiter.ratio.value = 7;
                    limiter.attack.value = .003;
                    limiter.release.value = .14;
                    this.master.connect(limiter);
                    limiter.connect(ctx.destination);
                    this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .5), ctx.sampleRate);
                    const data = this.noise.getChannelData(0);
                    let seed = 9127;
                    for (let i = 0; i < data.length; i++) {
                        seed = (seed * 1664525 + 1013904223) >>> 0;
                        data[i] = seed / 2147483648 - 1;
                    }
                }
                setMute(value) { this.muted = value; if (this.master)
                    this.master.gain.setTargetAtTime(value ? 0 : this.volume, this.ctx.currentTime, .025); }
                setVolumes(music, fx) { this.musicVolume = Math.max(0, Math.min(1, music)); this.fxVolume = Math.max(0, Math.min(1, fx)); if (this.music) {
                    if (this.running)
                        this.applyMusicEnvelope();
                    else
                        this.music.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, .04);
                    this.effects.gain.setTargetAtTime(this.fxVolume, this.ctx.currentTime, .04);
                } }
                tone(at, freq, duration, gain, type = 'sine', endFreq, filterFreq, bus = this.music, options = {}) {
                    if (!this.ctx || (bus === this.effects && this.effectNodes.size >= 36) || this.nodes.size >= 220)
                        return;
                    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), cleanup = [];
                    o.type = type;
                    o.frequency.setValueAtTime(Math.max(16, freq), at);
                    if (endFreq)
                        o.frequency.exponentialRampToValueAtTime(Math.max(16, endFreq), at + Math.min(duration, .16));
                    if (options.bend) {
                        o.frequency.setValueAtTime(freq * .94, at);
                        o.frequency.exponentialRampToValueAtTime(freq, at + .065);
                    }
                    if (options.detune)
                        o.detune.value = options.detune;
                    const attack = Math.min(duration * .3, options.attack || .004);
                    g.gain.setValueAtTime(.0001, at);
                    g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), at + attack);
                    g.gain.exponentialRampToValueAtTime(.0001, at + duration);
                    if (options.hardStop)
                        g.gain.setValueAtTime(0, at + duration + .002);
                    o.connect(g);
                    let tail = g;
                    if (filterFreq) {
                        const f = this.ctx.createBiquadFilter();
                        f.type = options.filterType || 'lowpass';
                        f.Q.value = options.q || .65;
                        f.frequency.setValueAtTime(filterFreq, at);
                        if (options.wah)
                            f.frequency.exponentialRampToValueAtTime(Math.max(160, filterFreq * .3), at + duration);
                        g.connect(f);
                        tail = f;
                        cleanup.push(f);
                    }
                    if (options.pan && this.ctx.createStereoPanner) {
                        const pan = this.ctx.createStereoPanner();
                        pan.pan.value = options.pan;
                        tail.connect(pan);
                        tail = pan;
                        cleanup.push(pan);
                    }
                    tail.connect(bus || this.music);
                    this.trackVoice(o, bus, g, [g, ...cleanup]);
                    o.start(at);
                    o.stop(at + duration + (options.hardStop ? .003 : .025));
                }
                hiss(at, duration, gain, hz, bus = this.music) { if (!this.ctx || (bus === this.effects && this.effectNodes.size >= 36) || this.nodes.size >= 220)
                    return; const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = hz; g.gain.setValueAtTime(Math.max(.0001, gain), at); g.gain.exponentialRampToValueAtTime(.0001, at + duration); source.connect(filter); filter.connect(g); g.connect(bus || this.music); this.trackVoice(source, bus, g, [filter, g]); source.start(at); source.stop(at + duration); }
                note(event, at) {
                    const { instrument: i, duration: d, velocity: v, midi, bend, role } = event, f = music_js_1.frequency(midi);
                    const bus = this.music;
                    if (i === 'kick') {
                        this.tone(at, 145, d, .67 * v, 'sine', 43, undefined, bus);
                        this.hiss(at, .018, .06 * v, 1600);
                        return;
                    }
                    if (i === 'snare') {
                        this.hiss(at, d, .2 * v, 1200);
                        this.tone(at, 188, .085, .15 * v, 'triangle', 120);
                        return;
                    }
                    if (i === 'hat' || i === 'tamb') {
                        this.hiss(at, d, (i === 'tamb' ? .10 : .085) * v, i === 'tamb' ? 6500 : 7600);
                        return;
                    }
                    if (i === 'rim') {
                        this.tone(at, 940, .025, .095 * v, 'triangle', 610);
                        return;
                    }
                    if (i === 'conga' || i === 'tom') {
                        this.tone(at, f * .5, d, .2 * v, 'sine', f * .36);
                        this.hiss(at, .018, .03 * v, 1800);
                        return;
                    }
                    const bass = role === 'bass', amp = bass ? .25 * v : .18 * v;
                    if (i === 'slap') {
                        this.tone(at, f, d, .33 * v, 'triangle', undefined, 1250, bus, { wah: true });
                        this.tone(at, f * 2, .055, .09 * v, 'sawtooth', undefined, 1900);
                        this.hiss(at, .018, .026 * v, 1800);
                    }
                    else if (i === 'finger' || i === 'round' || i === 'upright') {
                        this.tone(at, f, d * 1.35, .35 * v, 'sine');
                        this.tone(at, f, d, .13 * v, 'triangle', undefined, i === 'upright' ? 800 : 520);
                        if (i === 'upright')
                            this.hiss(at, .025, .013 * v, 1500);
                    }
                    else if (i === 'clav') {
                        this.tone(at, f, d, amp * .8, 'sawtooth', undefined, 2200, bus, { wah: true, q: 1.4, pan: -.17 });
                        this.tone(at, f * 2, d * .48, amp * .3, 'triangle', undefined, 3000);
                    }
                    else if (i === 'rhodes') {
                        this.tone(at, f, d * 1.6, amp * .8, 'sine', undefined, undefined, bus, { pan: .14 });
                        this.tone(at, f * 2, d * .35, amp * .22, 'sine');
                        this.tone(at, f * 3, d * .23, amp * .12, 'sine');
                    }
                    else if (i === 'piano') {
                        this.tone(at, f, d * 1.8, amp * .75, 'triangle', undefined, bass ? 1100 : 3500);
                        this.tone(at, f * 2, d * .65, amp * .24, 'sine');
                        this.tone(at, f * 3, d * .35, amp * .13, 'sine');
                    }
                    else if (i === 'organ') {
                        this.tone(at, f, d, amp * .55, 'sine', undefined, undefined, bus, { attack: .012, pan: -.12 });
                        this.tone(at, f * 2, d, amp * .25, 'sine');
                        this.tone(at, f * 3, d * .8, amp * .17, 'sine');
                    }
                    else if (i === 'guitar') {
                        this.tone(at, f, d * 1.35, amp * .9, 'triangle', undefined, 2100, bus, { bend, wah: true, pan: .12 });
                        this.tone(at, f * 2, d * .35, amp * .2, 'sawtooth', undefined, 1600);
                    }
                    else if (i === 'brass') {
                        this.tone(at, f, d, amp * .65, 'sawtooth', undefined, 1800, bus, { attack: .018, wah: true, pan: .22 });
                        this.tone(at, f, d, amp * .32, 'sawtooth', undefined, 1500, bus, { detune: 7 });
                    }
                    else if (i === 'strings') {
                        this.tone(at, f, d * 1.8, amp * .48, 'sawtooth', undefined, 1600, bus, { attack: .045, detune: -5, pan: -.2 });
                        this.tone(at, f, d * 1.8, amp * .4, 'triangle', undefined, 1400, bus, { attack: .04, detune: 5 });
                    }
                    else if (i === 'vibes') {
                        this.tone(at, f, d * 2.1, amp, 'sine', undefined, undefined, bus, { pan: .2 });
                        this.tone(at, f * 4, d * .28, amp * .16, 'sine');
                    }
                    else if (i === 'synth') {
                        this.tone(at, f, d * 1.25, bass ? .27 * v : amp * .8, 'sawtooth', undefined, bass ? 600 : 2400, bus, { wah: true, q: 2 });
                        this.tone(at, f, d, bass ? .21 * v : amp * .3, 'sine');
                    }
                }
                // The transport is monotonic. Tutorial repeats the first eight full groove bars,
                // not the arrangement outro, so there is no end fade or clock reset in a lesson.
                start(level = 1, time = 0, tutorial = false) {
                    this.stop();
                    this.tutorialLoop = tutorial;
                    this.track = music_js_1.getTrack(level);
                    if (!this.ctx)
                        return;
                    time = Math.max(0, Number(time) || 0);
                    this.music = this.ctx.createGain();
                    this.music.connect(this.master);
                    // Only a brand-new track needs the small scheduling lead. Applying it on resume
                    // would move the gameplay clock 45 ms backwards after every pause.
                    this.running = true;
                    this.origin = this.ctx.currentTime - time + (time > 0 ? 0 : .045);
                    this.applyMusicEnvelope(true);
                    this.step = Math.max(0, Math.floor(time / (this.track.beat / 4)));
                    this.schedule();
                    this.timer = setInterval(() => this.schedule(), 25);
                }
                musicLevel(time) { if (this.tutorialLoop)
                    return this.musicVolume; const a = arrangement_js_1.arrangementFor(this.track.level, this.track.bpm); return this.musicVolume * Math.max(0, Math.min(1, (a.duration - time) / 5)); }
                applyMusicEnvelope(fadeIn = false) {
                    if (!this.ctx || !this.music)
                        return;
                    if (this.tutorialLoop) {
                        const now = this.ctx.currentTime, g = this.music.gain;
                        g.cancelScheduledValues(now);
                        g.setValueAtTime(fadeIn ? 0 : this.musicVolume, now);
                        if (fadeIn)
                            g.linearRampToValueAtTime(this.musicVolume, now + .18);
                        return;
                    }
                    const now = this.ctx.currentTime, a = arrangement_js_1.arrangementFor(this.track.level, this.track.bpm), time = Math.max(0, now - this.origin), end = this.origin + a.duration, start = end - 5, g = this.music.gain;
                    g.cancelScheduledValues(now);
                    g.setValueAtTime(fadeIn ? 0 : this.musicLevel(time), now);
                    if (fadeIn)
                        g.linearRampToValueAtTime(this.musicLevel(time + .18), now + .18);
                    if (start > now + .18)
                        g.setValueAtTime(this.musicVolume, start);
                    g.linearRampToValueAtTime(0, Math.max(now + .19, end));
                }
                finish() {
                    if (!this.ctx || !this.running)
                        return;
                    const now = this.ctx.currentTime;
                    this.endingAt = now;
                    this.music.gain.cancelScheduledValues(now);
                    this.music.gain.setValueAtTime(this.musicLevel(Math.max(0, now - this.origin)), now);
                    this.music.gain.linearRampToValueAtTime(0, now + 1.2);
                    const gen = this.generation;
                    clearTimeout(this.endTimer);
                    this.endTimer = setTimeout(() => { if (this.generation === gen)
                        this.stop(); }, 1300);
                }
                trackVoice(source, bus, gain, connections) {
                    this.nodes.add(source);
                    if (bus === this.effects)
                        this.effectNodes.add(source);
                    let released = false;
                    const release = () => {
                        if (released)
                            return;
                        released = true;
                        this.nodes.delete(source);
                        this.effectNodes.delete(source);
                        this.voiceCleanup.delete(source);
                        for (const node of [source, ...connections])
                            try {
                                node.disconnect();
                            }
                            catch { }
                        source.onended = null;
                    };
                    this.voiceCleanup.set(source, { gain, release });
                    source.onended = release;
                }
                stop() {
                    clearTimeout(this.endTimer);
                    this.endingAt = null;
                    this.running = false;
                    this.generation++;
                    if (this.timer)
                        clearInterval(this.timer);
                    this.timer = null;
                    const now = this.ctx?.currentTime || 0, old = this.music;
                    if (old) {
                        old.gain.cancelScheduledValues(now);
                        old.gain.setValueAtTime(old.gain.value, now);
                        old.gain.linearRampToValueAtTime(0, now + .18);
                        const timer = setTimeout(() => { try {
                            old.disconnect();
                        }
                        catch { } this.disconnectTimers.delete(timer); }, 350);
                        this.disconnectTimers.add(timer);
                    }
                    for (const n of this.nodes) {
                        try {
                            const voice = this.voiceCleanup.get(n);
                            if (voice) {
                                const g = voice.gain.gain;
                                g.cancelScheduledValues(now);
                                g.setValueAtTime(g.value, now);
                                g.linearRampToValueAtTime(0, now + .18);
                            }
                            n.stop(now + .2);
                        }
                        catch {
                            this.voiceCleanup.get(n)?.release();
                        }
                    }
                }
                dispose() {
                    this.stop();
                    for (const timer of this.disconnectTimers)
                        clearTimeout(timer);
                    this.disconnectTimers.clear();
                    for (const voice of [...this.voiceCleanup.values()])
                        voice.release();
                    for (const node of [this.music, this.effects, this.master, this.limiter])
                        try {
                            node?.disconnect();
                        }
                        catch { }
                    try {
                        this.ctx?.close?.();
                    }
                    catch { }
                    this.ctx = null;
                }
                position(fallback = 0) { return this.ctx && this.running ? Math.max(0, this.ctx.currentTime - this.origin) : fallback; }
                phase(fallback = 0) { const beat = this.track.beat; return this.ctx && this.running ? ((this.ctx.currentTime - this.origin) % beat + beat) % beat : fallback; }
                schedule() {
                    if (!this.running || !this.ctx)
                        return;
                    const t = this.track, n = t.bars * 16, loopSteps = Math.min(n, 8 * 16);
                    // Skip stale events after an interrupted frame. Do not rebase origin or emit a catch-up burst.
                    if (this.ctx.currentTime - this.origin - music_js_1.stepTime(t, this.step) > 1)
                        this.step = Math.max(this.step, Math.floor((this.ctx.currentTime - this.origin) / (t.beat / 4)));
                    while (this.origin + music_js_1.stepTime(t, this.step) < this.ctx.currentTime + .14) {
                        const at = this.origin + music_js_1.stepTime(t, this.step), patternStep = this.tutorialLoop ? this.step % loopSteps : this.step;
                        if ((!this.endingAt || at < this.endingAt) && at >= this.ctx.currentTime - .012) {
                            const when = Math.max(at, this.ctx.currentTime), elapsed = music_js_1.stepTime(t, patternStep), a = arrangement_js_1.arrangementFor(t.level, t.bpm), section = this.tutorialLoop ? 'groove' : arrangement_js_1.sectionAt(elapsed, a), sub = patternStep % 16;
                            if (!this.tutorialLoop && elapsed >= a.duration) {
                                this.step++;
                                continue;
                            }
                            const beforeDrop = !this.tutorialLoop && elapsed >= a.climaxStart - t.beat && elapsed < a.climaxStart;
                            const events = t.byStep[patternStep % n] || [];
                            for (const e of events) {
                                if (beforeDrop && e.instrument !== 'snare' && e.instrument !== 'hat')
                                    continue;
                                if (section === 'groove' && elapsed < 8 * t.beat && e.role === 'lead')
                                    continue;
                                if (section === 'outro' && (e.role === 'lead' || e.instrument === 'tamb'))
                                    continue;
                                this.note({ ...e, velocity: e.velocity * (section === 'climax' ? 1.04 : section === 'outro' ? .75 : 1) }, when);
                                if (section === 'climax' && e.role === 'bass' && sub % 4 === 0)
                                    this.note({ ...e, midi: e.midi + 12, velocity: e.velocity * .27 }, when);
                            }
                            if (sub % 4 === 0) {
                                const beat = Math.floor(patternStep / 4);
                                if (sub === 0)
                                    this.note({ instrument: 'kick', midi: 0, duration: .15, velocity: .32 }, when);
                                if (!this.tutorialLoop && beat % 4 === 2 && rhythm_js_1.cueAt(t.level, beat + 2)) {
                                    this.note({ instrument: 'tom', midi: 53, duration: .09, velocity: .65 }, when);
                                    this.note({ instrument: 'tom', midi: 48, duration: .09, velocity: .65 }, when + t.beat);
                                }
                            }
                            if (section === 'build' && (sub === 0 || sub === 12 || elapsed >= a.climaxStart - t.beat * 4 && sub % 2 === 0))
                                this.note({ instrument: 'snare', midi: 0, duration: .055, velocity: .15 + .3 * (elapsed - a.buildStart) / (a.climaxStart - a.buildStart) }, when);
                            if (section === 'climax' && sub % 4 === 0 && !events.some(e => e.instrument === 'kick'))
                                this.note({ instrument: 'kick', midi: 0, duration: .18, velocity: .65 }, when);
                            if (section === 'climax' && sub === 0 && Math.floor(patternStep / 16) % 4 === 0) {
                                this.hiss(when, .18, .035, 4200);
                                this.tone(when, music_js_1.frequency(t.key), .3, .12, 'sine');
                            }
                        }
                        this.step++;
                    }
                }
                fx(type, data = {}) {
                    if (!this.ctx || this.muted || type === 'press' || type === 'release' || type === 'ui')
                        return;
                    const now = this.ctx.currentTime, b = this.effects;
                    if (type === 'switch') {
                        const f = music_js_1.frequency(this.track.key + 12);
                        if (data.weapon === 'wave') {
                            this.tone(now, 140, data.perfect ? .2 : .08, data.perfect ? .24 : .06, 'sine', 52, undefined, b);
                            this.air(now, .09, .05, 800, b);
                        }
                        else if (data.perfect) {
                            const bass = Math.max(49, Math.min(82, music_js_1.frequency(this.track.key)));
                            this.tone(now, bass * 2.4, .09, data.perfect ? .25 : .18, 'triangle', bass, 550, b, { hardStop: true, attack: .003 });
                            this.tone(now, bass * 1.2, .075, data.perfect ? .12 : .085, 'sine', bass * .7, undefined, b, { hardStop: true, attack: .003 });
                        }
                    }
                    if (type === 'pickup')
                        this.tone(now, music_js_1.frequency(this.track.key + 12), .2, .09, 'triangle', music_js_1.frequency(this.track.key + 24), 1300, b);
                    if (type === 'strong') {
                        this.tone(now, 155, .12, .18, 'sine', 72, undefined, b);
                        this.tone(now, 390, .035, .045, 'triangle', 230, 1000, b);
                        this.air(now, .045, .06, 1600, b);
                    }
                    if (type === 'support') {
                        const f = music_js_1.frequency(this.track.key + 12);
                        this.tone(now, f, .16, .065, 'triangle', f * 2, 1200, b);
                        this.air(now, .11, .035, 1100, b);
                    }
                    if (type === 'fire')
                        this.tone(now, data.weapon === 'laser' ? 360 : 150, .055, .023, 'triangle', data.weapon === 'laser' ? 130 : 65, 850, b);
                    if (type === 'hurt') {
                        this.air(now, .13, .15, 500, b);
                        this.tone(now, 85, .18, .13, 'sawtooth', 35, 350, b);
                    }
                    if (type === 'bossDown' || type === 'overdrive') {
                        this.tone(now, 90, .32, .19, 'sine', 34, undefined, b);
                        this.air(now, .22, .13, 1100, b);
                        this.tone(now, 240, .13, .07, 'triangle', 100, 650, b);
                    }
                }
                air(at, duration, gain, hz, bus) { if (!this.ctx || (bus === this.effects && this.effectNodes.size >= 36) || this.nodes.size >= 220)
                    return; const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = hz; filter.Q.value = .7; g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(gain, at + .004); g.gain.exponentialRampToValueAtTime(.0001, at + duration); source.connect(filter); filter.connect(g); g.connect(bus); this.trackVoice(source, bus, g, [filter, g]); source.start(at); source.stop(at + duration); }
            };
            exports_1("Soundtrack", Soundtrack);
        }
    };
});
