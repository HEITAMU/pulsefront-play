System.register([], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    // @ts-nocheck
    // Gameplay logic ported from the supplied PULSEFRONT 1.8.2 source; rules retained.
    function arrangementFor(level, bpm) { const bar = 240 / bpm, target = 64 + 14 * (level - 1) / 99, bars = Math.ceil(target / bar); return { duration: bars * bar, spawnEnd: bars * bar - 2, spawnFadeStart: bars * bar - 6, buildStart: Math.floor(bars * .42) * bar, climaxStart: Math.floor(bars * .54) * bar, climaxEnd: bars * bar - 5, outroStart: bars * bar - 5 }; }
    exports_1("arrangementFor", arrangementFor);
    function sectionAt(t, a) { return t < a.buildStart ? 'groove' : t < a.climaxStart ? 'build' : t < a.climaxEnd ? 'climax' : 'outro'; }
    exports_1("sectionAt", sectionAt);
    return {
        setters: [],
        execute: function () {
        }
    };
});
