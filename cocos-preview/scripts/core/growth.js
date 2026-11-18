System.register([], function (exports_1, context_1) {
    "use strict";
    var UPGRADES, POWER_COSTS;
    var __moduleName = context_1 && context_1.id;
    function normalizeGrowth(raw) { const g = {}; for (const u of UPGRADES)
        g[u.id] = Math.max(0, Math.min(u.max, Math.floor(Number(raw?.[u.id] ?? (u.id === 'spread' ? raw?.rate : 0)) || 0))); return g; }
    exports_1("normalizeGrowth", normalizeGrowth);
    function upgradeCost(g, id) { return id === 'power' ? (POWER_COSTS[g.power] ?? Infinity) : 60 + (g[id] || 0) * 35; }
    exports_1("upgradeCost", upgradeCost);
    function buyUpgrade(g, e, id) { const u = UPGRADES.find(u => u.id === id); if (!u || g[id] >= u.max || e.coins < upgradeCost(g, id))
        return false; e.coins -= upgradeCost(g, id); g[id]++; return true; }
    exports_1("buyUpgrade", buyUpgrade);
    function salvage(e, runId, kills) { const id = runId + '-salvage', old = e.receipts.find(r => r.id === id); if (old)
        return 0; const base = Math.min(80, Math.floor(kills / 8)); e.receipts.push({ id, base, bonus: true }); e.receipts = e.receipts.slice(-128); e.coins = Math.min(999999, e.coins + base); return base; }
    exports_1("salvage", salvage);
    return {
        setters: [],
        execute: function () {
            // @ts-nocheck
            // Gameplay logic ported from the supplied PULSEFRONT 1.8.2 source; rules retained.
            exports_1("UPGRADES", UPGRADES = [{ id: 'power', name: '主炮火力', text: '每级伤害 +6% · 5级解锁踩拍波峰 · 10级强峰 · 15级叠浪 · 20级重峰', max: 20 }, { id: 'spread', name: '波峰扩幅', text: '每级波峰覆盖角度 +3%，最高 +30% · 主炮5级后生效', max: 10 }, { id: 'support', name: '追加攻击', text: '每级追加攻击伤害 +15%', max: 15 }]);
            exports_1("POWER_COSTS", POWER_COSTS = [40, 50, 60, 70, 80, 300, 420, 560, 720, 900, 1200, 1500, 1900, 2400, 3000, 3800, 4800, 6000, 7500, 9500]);
        }
    };
});
