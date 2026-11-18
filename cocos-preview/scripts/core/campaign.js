System.register([], function (exports_1, context_1) {
    "use strict";
    var ENCOUNTERS;
    var __moduleName = context_1 && context_1.id;
    function campaignFor(level) {
        const chapter = Math.floor((level - 1) / 10), slot = (level - 1) % 10, p = (level - 1) / 99;
        return { chapter, slot, name: ENCOUNTERS[slot], pressure: 1 + 1.15 * Math.sqrt(p), tier: Math.min(20, level <= 10 ? level : 10 + (level - 10) / 9),
            assaultCount: level < 3 ? 2 : level <= 10 ? 3 + Math.floor(level / 3) : Math.min(8, 6 + Math.floor((level - 10) / 30)),
            swarmCount: Math.min(16, 6 + level * .10), swarmHp: 12 + Math.min(26, level * .65),
            chargerHp: level <= 2 ? 16 : (350 + Math.min(280, (level - 3) * 15)) * (level > 10 && (slot === 1 || slot === 5) ? .8 : 1),
            heavyHp: level === 2 ? 85 : 180 + Math.min(420, level * 12),
            damage: 12 + Math.min(13, level * .8), shield: level >= 11, repair: level >= 21, split: level >= 31, weave: level >= 41,
            breath: slot === 7, dense: slot === 2 || slot === 8, double: slot === 3 || slot === 8 };
    }
    exports_1("campaignFor", campaignFor);
    return {
        setters: [],
        execute: function () {
            // @ts-nocheck
            // Gameplay logic ported from the supplied PULSEFRONT 1.8.2 source; rules retained.
            // Ten encounter families rotate inside each chapter; pressure is bounded at stage 100.
            exports_1("ENCOUNTERS", ENCOUNTERS = ['交替突袭', '重甲突破', '密集蜂群', '左右夹击', '护航纵队', '切分冲锋', '回声追击', '短暂喘息', '混合围攻', '星域首领']);
        }
    };
});
