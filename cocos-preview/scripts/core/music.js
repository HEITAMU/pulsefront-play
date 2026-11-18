System.register(["./arrangement.js?v=4592cf42476a57b5"], function (exports_1, context_1) {
    "use strict";
    var arrangement_js_1, random, STYLES, variants, tracks, frequency;
    var __moduleName = context_1 && context_1.id;
    function stepTime(track, step) { const beat = Math.floor(step / 4), sub = step % 4, s = track.swing; return (beat + [0, (.5 + s) / 2, .5 + s, .75 + s / 2][sub]) * track.beat; }
    exports_1("stepTime", stepTime);
    function getTrack(level) {
        level = Math.max(1, Math.min(100, Math.round(level)));
        if (tracks.has(level))
            return tracks.get(level);
        const style = STYLES[(level - 1) % 10], v = Math.floor((level - 1) / 10), r = random(level * 10757 + 611), key = [40, 43, 45, 38, 41, 47, 42, 44, 39, 46][(v + Math.floor((level - 1) % 10 / 2)) % 10];
        const bpm = style.bpm + [-2, 2, -4, 4, 0, 6, -3, 3, 1, 5][v];
        const track = { level, id: `groove-${String(level).padStart(3, '0')}`, name: style.title + ' · ' + variants[v], genre: style.name, style: style.id, bpm, beat: 60 / bpm, swing: style.swing + (v % 3) * .005, key, bars: Math.round(arrangement_js_1.arrangementFor(level, bpm).duration / (240 / bpm)), color: style.color, events: [], voice: { bass: style.bass, keys: style.keys, lead: style.lead } };
        const palettes = { funk: ['brass', 'clav', 'rhodes'], blues: ['guitar', 'organ', 'piano'], disco: ['brass', 'strings', 'vibes'], soul: ['rhodes', 'organ', 'vibes'], jazz: ['vibes', 'rhodes', 'brass'], boogie: ['piano', 'guitar', 'organ'], latin: ['brass', 'piano', 'vibes'], breaks: ['clav', 'rhodes', 'synth'], electro: ['clav', 'synth', 'vibes'], shuffle: ['guitar', 'organ', 'piano'] };
        track.voice.lead = palettes[style.id][v % 3];
        track.form = [];
        const motif = Array.from({ length: 8 }, (_, i) => i === 0 ? 0 : style.scale[Math.floor(r() * style.scale.length)]);
        const bassNotes = Array.from({ length: 8 }, (_, i) => i === 0 ? 0 : [0, 7, 10, 12, 5, 2][Math.floor(r() * 6)]);
        const add = (step, instrument, midi = 0, duration = .12, velocity = 1, extra = {}) => track.events.push({ step, instrument, midi, duration, velocity, ...extra });
        for (let bar = 0; bar < track.bars; bar++) {
            const base = bar * 16, part = Math.floor(bar / 4) % 2, root = key + style.progression[(bar + (v % 3) * 2) % style.progression.length], fill = bar % 8 === 7;
            const a = arrangement_js_1.arrangementFor(level, bpm), time = bar * 4 * track.beat;
            const section = bar < 2 ? 'intro' : time >= a.outroStart ? 'outro' : time >= a.climaxStart ? (bar % 8 === 6 ? 'space' : 'hook') : time >= a.buildStart ? 'rise' : bar % 8 === 6 ? 'break' : part ? 'answer' : 'verse';
            track.form.push(section);
            const sparse = ['intro', 'break', 'space', 'outro'].includes(section), answer = section === 'answer';
            const variation = (bar + v) % 4;
            for (const s of style.kick.filter(s => !sparse || s === 0 || s === 8))
                add(base + s, 'kick', 0, .19, s === 0 ? 1 : .83);
            if (!sparse && variation === 2)
                add(base + (v % 2 ? 15 : 7), 'kick', 0, .13, .52);
            for (const s of style.snare)
                add(base + s, 'snare', 0, .14, s === 15 ? .42 : .85);
            if (!sparse && (variation === 1 || fill))
                add(base + 11, 'snare', 0, .065, .19);
            for (const s of style.hat.filter((s, i) => !sparse || i % 2 === 0))
                add(base + s, 'hat', 0, s === 14 && part && !sparse ? .09 : .035, (s % 4 === 2 ? .42 : .22) * (v % 2 ? .85 : 1));
            if (!sparse && (style.id === 'funk' || style.id === 'jazz' || style.id === 'electro')) {
                for (const s of [1, 7, 9, 15])
                    if ((s + bar + v) % 3 !== 0)
                        add(base + s, 'hat', 0, .025, .15);
            }
            if (style.id === 'latin') {
                for (const s of [0, 3, 6, 10, 12])
                    add(base + s, 'conga', s % 2 ? 72 : 65, .13, .45);
                for (const s of [2, 8, 14])
                    add(base + s, 'rim', 0, .055, .35);
            }
            if (style.id === 'disco')
                for (const s of [2, 6, 10, 14])
                    add(base + s, 'tamb', 0, .11, .32);
            style.bassSteps.forEach((s, i) => {
                if (sparse && i % 2 === 1)
                    return;
                let offset = bassNotes[(i + bar % 2 * 2) % 8];
                if (style.id === 'blues' || style.id === 'boogie' || style.id === 'shuffle')
                    offset = [0, 4, 7, 9, 10, 9, 7, 4][(i + (part ? v % 3 : 0)) % 8];
                if (style.id === 'disco')
                    offset = i % 2 ? 12 : [0, 0, 7, 5][(i / 2 + bar) % 4];
                if (s === 0)
                    offset = 0;
                if (fill && i === style.bassSteps.length - 1)
                    offset = -1 + (v % 2) * 3;
                add(base + s, style.bass, root + offset, style.id === 'soul' ? .27 : .13 + (i % 3) * .025, s % 4 === 0 ? .9 : .68, { role: 'bass' });
            });
            // Extra bass pickup and chord inversions differ for each of the ten arrangements in a style.
            if (!sparse && v % 2 === 1 && variation === 0)
                add(base + 13, style.bass, root + 12, .085, .45, { role: 'bass' });
            style.chords.forEach((s, i) => {
                if (sparse && i > 0 || answer && i % 2 === 1)
                    return;
                const inversion = (v + i + part) % 3;
                const notes = style.quality.map((n, j) => root + 24 + n + (j < inversion ? 12 : 0));
                const duration = ['organ', 'rhodes', 'strings'].includes(style.keys) ? .3 + (s === 0 ? .2 : 0) : .095;
                for (const note of notes)
                    add(base + s, style.keys, note, duration, .16 + (i % 2) * .045, { role: 'chord' });
            });
            if (!sparse && section !== 'rise' && (bar % 2 === 1 || section === 'hook' && bar % 4 === 0)) {
                const phrase = [[2, 5, 7, 10, 14], [0, 6, 9, 12], [3, 7, 8, 14], [2, 6, 10], [0, 3, 7, 11, 14]][v % 5];
                phrase.forEach((s, i) => {
                    if ((i + bar + v) % 4 === 0)
                        return;
                    let note = root + 24 + motif[(i + (answer ? 4 : 0) + (section === 'hook' ? 0 : part * 2)) % 8] + (answer ? -12 : 0);
                    if (fill && i === 4)
                        note = root + 24;
                    add(base + s, track.voice.lead, note, .14 + (i % 2) * .14, .19 + (section === 'hook' ? .025 : 0), { role: 'lead', bend: track.voice.lead === 'guitar' && i % 2 === 1 });
                });
            }
            if (fill && !sparse) {
                for (const s of [13, 14, 15])
                    add(base + s, 'tom', 49 + (15 - s) * 3, .11, .28 + (s - 13) * .07);
            }
        }
        const endBar = track.bars - 1;
        track.events = track.events.filter(e => e.step < endBar * 16);
        add(endBar * 16, style.bass, key, .8, .58, { role: 'bass' });
        for (const n of [0, 7, 12])
            add(endBar * 16, 'rhodes', key + 24 + n, 1.1, .12, { role: 'chord' });
        track.events.sort((a, b) => a.step - b.step);
        track.duration = track.bars * 4 * track.beat;
        track.events.forEach(e => e.time = stepTime(track, e.step));
        track.byStep = Array.from({ length: track.bars * 16 }, () => []);
        for (const e of track.events)
            track.byStep[e.step].push(e);
        tracks.set(level, track);
        return track;
    }
    exports_1("getTrack", getTrack);
    function trackFingerprint(track) { return JSON.stringify(track.events.map(e => [e.step, e.instrument, e.midi, +e.duration.toFixed(3), +e.velocity.toFixed(3), e.bend || false])); }
    exports_1("trackFingerprint", trackFingerprint);
    return {
        setters: [
            function (arrangement_js_1_1) {
                arrangement_js_1 = arrangement_js_1_1;
            }
        ],
        execute: function () {
            random = seed => () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
            exports_1("STYLES", STYLES = [
                { id: 'funk', name: 'Funk 放克', bpm: 106, swing: .045, bass: 'slap', keys: 'clav', lead: 'brass', kick: [0, 6, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 3, 6, 7, 10, 12, 15], chords: [3, 7, 11, 14], progression: [0, 0, 5, 0, 0, 7, 5, 0], quality: [0, 4, 7, 10, 14], scale: [0, 3, 5, 6, 7, 10], title: '霓虹切分', color: '#bcf7b4' },
                { id: 'blues', name: '摇摆蓝调', bpm: 100, swing: .16, bass: 'upright', keys: 'organ', lead: 'guitar', kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], chords: [2, 6, 10, 14], progression: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], quality: [0, 4, 7, 10], scale: [0, 3, 5, 6, 7, 10], title: '午夜弯音', color: '#9bbdff' },
                { id: 'disco', name: 'Disco 迪斯科', bpm: 120, swing: 0, bass: 'finger', keys: 'strings', lead: 'brass', kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], chords: [2, 6, 10, 14], progression: [0, 0, 5, 5, 9, 9, 7, 7], quality: [0, 3, 7, 10], scale: [0, 3, 5, 7, 10, 12], title: '镜球引力', color: '#ffb8d4' },
                { id: 'soul', name: 'Neo-Soul 灵魂乐', bpm: 90, swing: .10, bass: 'round', keys: 'rhodes', lead: 'organ', kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 6, 8, 10, 14], bassSteps: [0, 3, 7, 8, 11, 14], chords: [0, 7, 12], progression: [0, 5, 2, 7, 0, 5, 9, 7], quality: [0, 3, 7, 10, 14], scale: [0, 2, 3, 5, 7, 10], title: '月光慢摆', color: '#e7bcff' },
                { id: 'jazz', name: 'Jazz Funk 爵士放克', bpm: 108, swing: .06, bass: 'finger', keys: 'rhodes', lead: 'vibes', kick: [0, 3, 8, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 3, 5, 7, 8, 11, 14], chords: [1, 6, 10, 15], progression: [2, 7, 0, 0, 5, 7, 0, 9], quality: [0, 3, 7, 10, 14], scale: [0, 2, 3, 5, 7, 9, 10], title: '电气沙发', color: '#8de8d7' },
                { id: 'boogie', name: 'Boogie 布吉乌吉', bpm: 118, swing: .14, bass: 'piano', keys: 'piano', lead: 'guitar', kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], chords: [2, 6, 10, 14], progression: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], quality: [0, 4, 7, 10], scale: [0, 3, 4, 5, 7, 9, 10], title: '八拍夜车', color: '#ffd18e' },
                { id: 'latin', name: 'Latin Funk 拉丁放克', bpm: 110, swing: .02, bass: 'round', keys: 'piano', lead: 'brass', kick: [0, 6, 10], snare: [4, 12], hat: [0, 4, 8, 12], bassSteps: [0, 3, 6, 8, 11, 14], chords: [0, 3, 6, 10, 12], progression: [0, 5, 0, 7, 0, 5, 2, 7], quality: [0, 4, 7, 10, 14], scale: [0, 2, 4, 5, 7, 9, 10], title: '赤道回声', color: '#ffc291' },
                { id: 'breaks', name: 'Breakbeat 碎拍', bpm: 116, swing: .035, bass: 'synth', keys: 'clav', lead: 'synth', kick: [0, 6, 9, 14], snare: [4, 12, 15], hat: [0, 2, 3, 6, 8, 10, 11, 14], bassSteps: [0, 1, 6, 8, 9, 12, 15], chords: [3, 10, 14], progression: [0, 0, 3, 5, 0, 0, 7, 5], quality: [0, 3, 7, 10], scale: [0, 3, 5, 7, 10], title: '断拍巡航', color: '#b3e8ff' },
                { id: 'electro', name: 'Electro Funk 电子放克', bpm: 114, swing: .025, bass: 'synth', keys: 'clav', lead: 'synth', kick: [0, 5, 8, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 3, 4, 7, 10, 11, 14], chords: [2, 7, 10, 15], progression: [0, 0, 5, 7, 0, 3, 5, 7], quality: [0, 4, 7, 10], scale: [0, 3, 5, 7, 10], title: '机器摇摆', color: '#c0aaff' },
                { id: 'shuffle', name: 'Blues Rock 蓝调摇滚', bpm: 112, swing: .145, bass: 'finger', keys: 'guitar', lead: 'guitar', kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], chords: [0, 6, 8, 14], progression: [0, 0, 5, 0, 5, 5, 0, 0, 7, 5, 0, 7], quality: [0, 7, 12], scale: [0, 3, 5, 6, 7, 10], title: '引擎布鲁斯', color: '#ffb598' }
            ]);
            variants = ['启程', '霓光', '夜行', '回旋', '漫游', '逐浪', '掠影', '炽热', '升空', '破晓'];
            tracks = new Map();
            exports_1("frequency", frequency = midi => 440 * 2 ** ((midi - 69) / 12));
        }
    };
});
