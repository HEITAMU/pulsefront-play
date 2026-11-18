/** Allocation/retention stress using the real game and whichever Cocos runtime hosts this page. */
export async function runViewStress(cc, options = {}) {
    const { BattleView } = await System.import('./scripts/view/BattleView.js');
    const { SupportPreviewView } = await System.import('./scripts/view/SupportPreviewView.js');
    const { Battle } = await System.import('./scripts/core/engine.js');
    const { getTrack } = await System.import('./scripts/core/music.js');
    const scene = cc.director.getScene();
    if (!scene) throw new Error('A running Cocos scene is required');
    const canvas = scene.getChildByName('Canvas') || scene;
    const host = new cc.Node('Allocation stress (offscreen)'); host.layer = canvas.layer;
    canvas.addChild(host); host.addComponent(cc.UITransform).setContentSize(420, 840);
    host.setPosition(10000, 10000, 0);
    const view = new BattleView(host, 420, 840);
    await view.ready;
    const duration = options.duration ?? 300, every = options.renderEvery ?? 6;
    const yieldFrame = options.yieldFrame || (() => new Promise(resolve => requestAnimationFrame(resolve)));
    let elapsed = 0, run = 0, battle, samples = 0, dropped = 0;
    const peak = { retainedNodes: 0, graphics: 0, sprites: 0, labels: 0, enemies: 0, fx: 0 };
    const runs = [];
    const track = getTrack(100);
    const newBattle = () => {
        view.clear(); view.setChapter(9); run++;
        battle = new Battle(100, { width: 420, height: 840, seed: 817, tempo: track.bpm,
            growth: {power: 0,spread:0,support:0}, supports: ['seeker','arc'],
            emit: (type, data) => view.event(type, data) });
        battle.setHeld(true, 0);
    };
    const sample = () => {
        view.render(battle, elapsed, elapsed % battle.beatDuration);
        const stats = view.stats;
        for (const key of ['retainedNodes','graphics','sprites','labels']) peak[key] = Math.max(peak[key], stats[key]);
        peak.enemies = Math.max(peak.enemies,battle.enemies.length); peak.fx = Math.max(peak.fx,view.fx.length);
        dropped += stats.droppedCommands; samples++;
        if (stats.retainedNodes > stats.nodeLimit) throw new Error('Retained node hard limit exceeded');
    };
    newBattle();
    for (let i = 0; i < Math.ceil(duration * 60); i++) {
        const dt = 1 / 60; elapsed += dt;
        if (battle.state !== 'playing') { runs.push({run,retained:view.stats.retainedNodes}); newBattle(); }
        battle.rhythmTime = battle.t;
        // Invulnerability keeps this test on the highest-pressure stage. No live save is touched.
        battle.hp = 100; battle.step(dt, battle.t % battle.beatDuration);
        view.update(dt);
        if (i % every === 0) sample();
        if (i % 600 === 599) await yieldFrame();
    }
    const heldBeforeQuiet = view.stats.retainedNodes;
    view.clear(); view.setChapter(0);
    for (let i = 0; i < 600; i++) view.render(null, elapsed + i / 60, 0, true);
    const heldAfterQuiet = view.stats.retainedNodes;
    if (heldAfterQuiet > heldBeforeQuiet + 10) throw new Error('Node allocation grew in quiet home frames');
    // The source combat cap is 240 enemies. Use the maximum sprite work per enemy:
    // ordinary body + additive hit + shield. This is a stress scene, not normal balance.
    newBattle(); battle.enemies = [];
    for(let i=0;i<240;i++) battle.enemies.push({id:i,type:'shield',x:20+(i%20)*20,y:100+Math.floor(i/20)*35,
        radius:13,hp:20,maxHp:20,phase:i,age:1,hit:.1,guard:50,boss:false,warn:.8});
    for(let i=0;i<2000;i++) view.explode(50+(i%10)*30,200+(i%7)*40,'#ff97b8',80);
    sample();
    const crowded = { ...view.stats, enemies: battle.enemies.length, fx:view.fx.length };
    let previewPeak=0,previewShots=0;
    for(const id of ['seeker','bounce','shuttle','spiral','meteor','arc']){
        for(const motion of ['base','fan','relay','orbit']){
            const preview = new SupportPreviewView(host,340,137,id,motion);
            for(let i=0;i<150;i++){preview.update(1/30); previewPeak=Math.max(previewPeak,preview.stats.retainedNodes);previewShots=Math.max(previewShots,preview.stats.shots);}
            preview.destroy();
        }
        await yieldFrame();
    }
    view.destroy(); host.destroy(); await yieldFrame();
    return { simulatedSeconds:duration,renderSamples:samples,runs:run,peak,heldBeforeQuiet,heldAfterQuiet,
        droppedCommands:dropped,crowded,previewCases:24,previewPeakNodes:previewPeak,previewPeakShots:previewShots,
        assertion:'retained nodes bounded, quiet frames reuse pool, 240-enemy crowd within cap, all 24 support previews run' };
}
