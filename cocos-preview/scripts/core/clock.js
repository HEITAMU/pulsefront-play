System.register([], function (exports_1, context_1) {
    "use strict";
    var MAX_SIMULATION_STEP, MAX_CATCHUP_SECONDS;
    var __moduleName = context_1 && context_1.id;
    /**
     * Split elapsed time into collision-safe steps, rendering only once afterwards.
     * Tutorial slow motion can advance simulation and musical time at different
     * rates; its rhythm timestamps still interpolate the real transport interval.
     * A long interruption returns -1 so the application can pause instead of
     * freezing for an unbounded catch-up or silently losing elapsed music time.
     */
    function advanceBattleBy(battle, elapsed, rhythmFrom, rhythmTo) {
        if (battle.state !== 'playing' || !Number.isFinite(elapsed) || elapsed <= 0)
            return 0;
        if (elapsed > MAX_CATCHUP_SECONDS + 1e-8)
            return -1;
        const count = Math.ceil(elapsed / MAX_SIMULATION_STEP);
        const dt = elapsed / count;
        let steps = 0;
        for (let i = 1; i <= count && battle.state === 'playing'; i++) {
            const rhythm = rhythmFrom + (rhythmTo - rhythmFrom) * i / count;
            battle.rhythmTime = rhythm;
            const phase = ((rhythm % battle.beatDuration) + battle.beatDuration) % battle.beatDuration;
            battle.step(dt, phase);
            steps++;
        }
        return steps;
    }
    exports_1("advanceBattleBy", advanceBattleBy);
    /** Normal combat and music share one absolute elapsed time. */
    function advanceBattleTo(battle, targetTime) {
        if (!Number.isFinite(targetTime))
            return 0;
        return advanceBattleBy(battle, targetTime - battle.t, battle.t, targetTime);
    }
    exports_1("advanceBattleTo", advanceBattleTo);
    return {
        setters: [],
        execute: function () {
            /** Keep simulation time on the music transport without dropping slow frames. */
            exports_1("MAX_SIMULATION_STEP", MAX_SIMULATION_STEP = 1 / 30);
            exports_1("MAX_CATCHUP_SECONDS", MAX_CATCHUP_SECONDS = 1);
        }
    };
});
