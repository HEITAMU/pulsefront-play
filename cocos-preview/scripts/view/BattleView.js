System.register(["cc", "../core/engine.js", "./NativeDraw2D.js"], function (exports_1, context_1) {
    "use strict";
    var cc_1, engine_js_1, NativeDraw2D_js_1, TAU, SPRITE_KIND, BattleView;
    var __moduleName = context_1 && context_1.id;
    function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); }
    function poly(c, points) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
    return {
        setters: [
            function (cc_1_1) {
                cc_1 = cc_1_1;
            },
            function (engine_js_1_1) {
                engine_js_1 = engine_js_1_1;
            },
            function (NativeDraw2D_js_1_1) {
                NativeDraw2D_js_1 = NativeDraw2D_js_1_1;
            }
        ],
        execute: function () {
            TAU = Math.PI * 2;
            SPRITE_KIND = { shield: 'tank', healer: 'splitter', bomb: 'drone' };
            /**
             * Native Cocos rendering of the approved web game's geometry and artwork.
             * Coordinates remain top-left based, preserving the shared combat simulation.
             * Static gradients and enemy sprites were baked from the original renderer;
             * every animated path and effect is a Cocos Graphics/Sprite/Label operation.
             */
            BattleView = class BattleView {
                constructor(parent, width = 420, height = 840) {
                    this.w = 420;
                    this.h = 840;
                    this.chapter = 0;
                    this.lite = false;
                    this.fx = [];
                    this.texts = [];
                    this.flash = 0;
                    this.shake = 0;
                    this.recoil = 0;
                    this.perfect = 0;
                    this.skin = null;
                    this.warning = null;
                    this.assetError = '';
                    this.disposed = false;
                    this.sprites = {};
                    this.shieldSprite = 'shield';
                    this.backdrop = 'backdrop-0';
                    this.dustLayer = 'dust-0';
                    this.vignette = 'vignette';
                    this.root = new cc_1.Node('Battle artwork');
                    this.root.layer = parent.layer;
                    parent.addChild(this.root);
                    this.root.addComponent(cc_1.UITransform).setAnchorPoint(0, 1);
                    this.ctx = new NativeDraw2D_js_1.NativeDraw2D(this.root);
                    for (const type of ['drone', 'runner', 'tank', 'splitter', 'mini', 'boss'])
                        this.sprites[type] = type;
                    const seed = engine_js_1.rng(817);
                    this.stars = Array.from({ length: 150 }, (_, i) => ({ x: seed(), y: seed(), layer: i % 3, size: seed() * 1.1 + .3, speed: .35 + (i % 3) * 2.2 + seed(), alpha: .13 + seed() * .44 }));
                    this.resize(width, height);
                    const names = [...Object.values(this.sprites), 'shield', 'vignette'];
                    for (let i = 0; i < 10; i++)
                        names.push('backdrop-' + i, 'dust-' + i);
                    this.ready = Promise.all(names.map(name => new Promise((resolve, reject) => {
                        cc_1.resources.load('art/' + name + '/spriteFrame', cc_1.SpriteFrame, (error, frame) => {
                            if (error) {
                                this.assetError = '美术资源加载失败：' + name;
                                reject(error);
                                return;
                            }
                            if (!this.disposed)
                                this.ctx.setFrame(name, frame);
                            resolve();
                        });
                    }))).then(() => { });
                }
                resize(width, height, lite = false) {
                    this.w = width;
                    this.h = height;
                    this.lite = lite;
                    this.root.getComponent(cc_1.UITransform).setContentSize(width, height);
                    this.ctx.resize(width, height);
                }
                setChapter(chapter) {
                    this.chapter = Math.max(0, Math.min(9, Math.floor(chapter)));
                    this.backdrop = 'backdrop-' + this.chapter;
                    this.dustLayer = 'dust-' + this.chapter;
                }
                clear() {
                    this.fx = [];
                    this.texts = [];
                    this.warning = null;
                    this.flash = this.shake = this.recoil = this.perfect = 0;
                    this.ctx.beginFrame();
                    this.ctx.endFrame();
                }
                destroy() { this.disposed = true; this.ctx.destroy(); this.root.destroy(); }
                get stats() { return this.ctx.stats; }
                render(battle, time, phase = 0, home = false) {
                    this.ctx.beginFrame();
                    try {
                        this.ctx.fillStyle = '#060b18';
                        this.ctx.fillRect(0, 0, this.w, this.h);
                        this.draw(battle, time, phase, home);
                    }
                    finally {
                        this.ctx.endFrame();
                    }
                }
                addFx(p) { const cap = this.lite ? 160 : 360, ringCap = this.lite ? 28 : 64; if (p.ring) {
                    const rings = this.fx.filter(f => f.ring);
                    if (rings.length >= ringCap) {
                        const old = this.fx.findIndex(f => f.ring && !f.shock);
                        this.fx.splice(old >= 0 ? old : this.fx.findIndex(f => f.ring), 1);
                    }
                } if (this.fx.length >= cap) {
                    const old = this.fx.findIndex(f => !f.shock);
                    this.fx.splice(old < 0 ? 0 : old, 1);
                } this.fx.push(p); }
                event(type, data) {
                    if (type === 'gravityBurst') {
                        this.explode(data.x, data.y, '#d5a7ff', 60);
                        this.addFx({ x: data.x, y: data.y, ring: true, r: 12, speed: data.radius / .65, life: .75, total: .75, color: '#dbb5ff', shock: true });
                        this.label('引 力 坍 缩', data.x, data.y - 45, '#edcaff', 22, 1);
                        this.shake = this.lite ? 0 : 4;
                    }
                    if (type === 'blast') {
                        this.explode(data.x, data.y, '#ffbd77', 18);
                        this.addFx({ x: data.x, y: data.y, ring: true, r: data.radius * .5, life: .35, total: .35, color: '#ffd17a' });
                    }
                    if (type === 'repair')
                        this.label('+', data.x, data.y, '#79ffc6', 19, .5);
                    if (type === 'fire') {
                        this.recoil = .13;
                        if (data.perfect)
                            this.perfect = .3;
                    }
                    if (type === 'perfect')
                        this.label('强 拍', data.x, data.y, '#cbffe5', 16, .65);
                    if (type === 'kill') {
                        this.explode(data.x, data.y, data.type === 'tank' ? '#ffcc87' : data.type === 'splitter' ? '#bb9bff' : '#ff97b8', data.type === 'boss' ? 35 : 10);
                        if (data.combo % 5 === 0)
                            this.label('+' + data.value, data.x, data.y, '#bbdfeb', 11, .75);
                    }
                    if (type === 'hurt') {
                        this.flash = .23;
                        this.shake = this.lite ? 0 : 3;
                        this.explode(data.x, data.y, '#94f6ee', 16);
                    }
                    if (type === 'bossDown') {
                        this.explode(data.x, data.y, '#ffcb8c', 80);
                        this.shake = this.lite ? 0 : 5;
                    }
                    if (type === 'overdrive') {
                        this.shake = this.lite ? 0 : 3;
                        this.perfect = 1;
                    }
                }
                label(text, x, y, color, size, life) { if (this.texts.length > 12)
                    this.texts.shift(); this.texts.push({ text, x, y, color, size, life, total: life }); }
                explode(x, y, color, count) { const dense = this.fx.length > (this.lite ? 95 : 240); count = Math.min(count, this.lite ? (dense ? 2 : 5) : (dense ? 3 : 12)); for (let i = 0; i < count; i++) {
                    const a = Math.random() * TAU, speed = 35 + Math.random() * 180;
                    this.addFx({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, color, life: .18 + Math.random() * .32, total: .5, size: 1 + Math.random() * 1.5 });
                } this.addFx({ x, y, ring: true, r: 4, life: .25, total: .25, color }); }
                update(dt) { if (this.warning)
                    this.warning.life -= dt; this.recoil = Math.max(0, this.recoil - dt); this.perfect = Math.max(0, this.perfect - dt); this.flash = Math.max(0, this.flash - dt); this.shake *= .85; for (const p of this.fx) {
                    p.life -= dt;
                    if (p.ring)
                        p.r += dt * (p.speed || 110);
                    else {
                        p.x += p.vx * dt;
                        p.y += p.vy * dt;
                        p.vx *= .97;
                        p.vy *= .97;
                    }
                } this.fx = this.fx.filter(p => p.life > 0); for (const t of this.texts) {
                    t.life -= dt;
                    t.y -= dt * 21;
                } this.texts = this.texts.filter(t => t.life > 0); }
                draw(battle, time, phase = 0, home = false) {
                    const c = this.ctx, w = this.w, h = this.h, [, accent, secondary] = engine_js_1.CHAPTERS[this.chapter];
                    c.save();
                    if (this.shake > .1)
                        c.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake);
                    const driftX = this.lite ? 0 : Math.sin(time * .025) * 5, driftY = this.lite ? 0 : Math.cos(time * .019) * 7;
                    c.drawImage(this.backdrop, -10 + driftX, -12 + driftY, w + 20, h + 24);
                    if (this.dustLayer) {
                        c.globalAlpha = this.lite ? .5 : .65 + .15 * Math.sin(time * .06);
                        c.drawImage(this.dustLayer, -15 - driftX * 1.5, -20 - driftY, w + 30, h + 40);
                    }
                    c.globalAlpha = 1;
                    for (const star of this.stars) {
                        if (this.lite && star.layer === 2)
                            continue;
                        const motion = this.lite ? 0 : time, depth = star.layer + 1, x = ((star.x * w + Math.sin(motion * .035 + star.y * 3) * depth * 3) % w + w) % w, y = (star.y * h + motion * star.speed) % h;
                        c.globalAlpha = star.alpha * (.9 + .1 * Math.sin(motion * .5 + star.x * 20));
                        c.fillStyle = star.layer === 2 ? '#e7d7bd' : '#bacbd8';
                        const size = star.size * (.65 + star.layer * .4);
                        c.fillRect(x, y, size, size);
                        if (star.layer === 2 && !this.lite) {
                            c.globalAlpha *= .2;
                            c.fillRect(x, y - 4, size, 4);
                        }
                    }
                    c.globalAlpha = 1;
                    if (this.vignette)
                        c.drawImage(this.vignette, 0, 0, w, h);
                    if (home) {
                        this.drawHome(time);
                        c.restore();
                        return;
                    }
                    if (!battle) {
                        c.restore();
                        return;
                    }
                    const { cx, cy, radius } = battle;
                    // A soft perimeter connects the on-screen button to its shield.
                    c.strokeStyle = accent + '13';
                    c.lineWidth = 1;
                    circle(c, cx, cy, radius + 33);
                    c.stroke();
                    const beatDistance = Math.min(phase, battle.beatDuration - phase), pulse = Math.max(0, 1 - beatDistance / .18);
                    this.turret(cx, cy, radius, time, pulse, battle.weapon, battle.overdrive > 0);
                    c.save();
                    c.globalCompositeOperation = 'lighter';
                    for (const wave of battle.waves) {
                        const alpha = Math.min(1, wave.life / .6) * .75;
                        c.globalAlpha = alpha;
                        const color = wave.boosted ? '#c5ffda' : (this.skin?.color || accent);
                        c.strokeStyle = color;
                        c.lineWidth = wave.switchShot ? 9 : wave.boosted ? 3.5 : 1.7;
                        c.beginPath();
                        c.arc(wave.x, wave.y, wave.r, 0, TAU);
                        c.stroke();
                        c.strokeStyle = color + '24';
                        c.lineWidth = wave.boosted ? 15 : 9;
                        c.stroke();
                        if (wave.aimAngle != null) {
                            const aim = (wave.aimAngle + TAU) % TAU, spread = wave.crestWidth || .7, start = aim - spread, end = aim + spread, steps = this.lite ? 18 : 32;
                            for (const [width, opacity] of [[24, .18], [11, .9]]) {
                                c.beginPath();
                                for (let i = 0; i <= steps; i++) {
                                    const a = start + (end - start) * i / steps, r = wave.r + width * engine_js_1.directionalWeight(a, aim, spread);
                                    const x = wave.x + Math.cos(a) * r, y = wave.y + Math.sin(a) * r;
                                    i ? c.lineTo(x, y) : c.moveTo(x, y);
                                }
                                for (let i = steps; i >= 0; i--) {
                                    const a = start + (end - start) * i / steps, r = wave.r - width * engine_js_1.directionalWeight(a, aim, spread);
                                    c.lineTo(wave.x + Math.cos(a) * r, wave.y + Math.sin(a) * r);
                                }
                                c.closePath();
                                c.globalAlpha = alpha * opacity;
                                c.fillStyle = width === 11 ? '#e9ffd4' : color;
                                c.fill();
                            }
                            c.globalAlpha = alpha;
                        }
                        if (wave.boosted) {
                            c.strokeStyle = color + '60';
                            c.lineWidth = 1;
                            c.beginPath();
                            c.arc(wave.x, wave.y, wave.r - 9, 0, TAU);
                            c.stroke();
                        }
                    }
                    for (const bolt of battle.bolts) {
                        c.globalAlpha = .9;
                        c.strokeStyle = this.skin?.color || accent;
                        c.lineWidth = 2;
                        c.beginPath();
                        c.moveTo(bolt.x, bolt.y);
                        c.lineTo(bolt.x - Math.cos(bolt.angle) * 13, bolt.y - Math.sin(bolt.angle) * 13);
                        c.stroke();
                    }
                    const beamColor = this.skin?.secondary || secondary;
                    for (const beam of battle.beams) {
                        c.globalAlpha = beam.life / beam.maxLife;
                        c.strokeStyle = beam.boosted ? '#ddbdff33' : beamColor + '20';
                        c.lineWidth = beam.directional ? 62 : beam.boosted ? 25 : 15;
                        c.beginPath();
                        c.moveTo(beam.x, beam.y);
                        c.lineTo(beam.ex, beam.ey);
                        c.stroke();
                        c.strokeStyle = beam.boosted ? '#cfa1ff' : beamColor;
                        c.lineWidth = beam.directional ? 30 : beam.boosted ? 7 : 4;
                        c.stroke();
                        c.strokeStyle = '#f1ecff';
                        c.lineWidth = beam.directional ? 7 : 1.6;
                        c.stroke();
                    }
                    c.restore();
                    for (const well of battle.wells || []) {
                        c.save();
                        c.translate(well.x, well.y);
                        const contraction = well.burst ? Math.max(.2, Math.min(1, well.life)) : 1;
                        const glow = c.createRadialGradient(0, 0, 8, 0, 0, well.r);
                        glow.addColorStop(0, '#090315');
                        glow.addColorStop(.12, '#dcb5ff70');
                        glow.addColorStop(.45, '#8c51e82d');
                        glow.addColorStop(1, '#8c51e800');
                        c.fillStyle = glow;
                        circle(c, 0, 0, well.r);
                        c.fill();
                        c.rotate(this.lite ? 0 : time * 2);
                        c.strokeStyle = '#c999ff';
                        c.lineWidth = well.burst ? 3 : 2;
                        for (let i = 0; i < (this.lite ? 2 : 4); i++) {
                            c.beginPath();
                            c.ellipse(0, 0, well.r * (.25 + i * .18) * contraction, well.r * .22 * contraction, i * Math.PI / 3, 0, TAU);
                            c.stroke();
                        }
                        for (let i = 0; i < 8; i++) {
                            const a = i * TAU / 8, r = well.r * (1 - ((time * .7 + i * .13) % 1));
                            c.fillStyle = '#f3d7ff';
                            circle(c, Math.cos(a) * r, Math.sin(a) * r, well.burst ? 2.5 : 1.5);
                            c.fill();
                        }
                        c.restore();
                        if (well.burst) {
                            c.fillStyle = '#efd6ff';
                            c.font = '700 13px system-ui';
                            c.textAlign = 'center';
                            c.fillText('引力聚合 · ' + Math.max(1, Math.ceil(well.life)), well.x, well.y + well.r * .55);
                        }
                    }
                    if (battle.aim) {
                        const a = engine_js_1.aimAngleFor(battle.aim);
                        c.save();
                        c.translate(cx, cy);
                        c.rotate(a);
                        c.fillStyle = '#caffb910';
                        c.beginPath();
                        c.moveTo(radius, 0);
                        c.arc(0, 0, radius + 180, -.22, .22);
                        c.closePath();
                        c.fill();
                        c.strokeStyle = '#dcff9a';
                        c.lineWidth = 5;
                        c.beginPath();
                        c.arc(0, 0, radius + 6, -.24, .24);
                        c.stroke();
                        for (let j = -1; j <= 1; j++) {
                            c.save();
                            c.rotate(j * .16);
                            c.fillStyle = '#ddffac';
                            c.fillRect(radius - 5, -4, 25, 8);
                            if (battle.held) {
                                const reach = radius + 24 + ((time * 520 + j * 32) % 150 + 150) % 150;
                                c.strokeStyle = '#e5ffc4';
                                c.lineWidth = 3;
                                c.beginPath();
                                c.moveTo(reach - 22, 0);
                                c.lineTo(reach, 0);
                                c.stroke();
                            }
                            c.restore();
                        }
                        c.restore();
                    }
                    battle.support?.draw(c, this.lite);
                    if (this.warning?.life > 0) {
                        const sides = this.warning.side === 3 ? [1, 2] : [this.warning.side];
                        for (const side of sides) {
                            const x = side === 1 ? 0 : w, gradient = c.createRadialGradient(x, h * .4, 0, x, h * .4, w * .32);
                            gradient.addColorStop(0, this.warning.weapon === 'laser' ? '#c6a0ff55' : '#88eced45');
                            gradient.addColorStop(1, '#88eced00');
                            c.fillStyle = gradient;
                            c.fillRect(side === 1 ? 0 : w * .68, 85, w * .32, h * .6);
                        }
                    }
                    for (const e of battle.enemies)
                        this.enemy(e, time);
                    for (const p of this.fx) {
                        c.globalAlpha = Math.max(0, p.life / p.total);
                        c.strokeStyle = p.color;
                        c.fillStyle = p.color;
                        if (p.ring) {
                            c.lineWidth = p.shock ? 7 : 1.4;
                            circle(c, p.x, p.y, p.r);
                            c.stroke();
                            if (p.shock) {
                                c.globalAlpha *= .14;
                                c.fill();
                            }
                        }
                        else {
                            c.lineWidth = p.size;
                            c.beginPath();
                            c.moveTo(p.x, p.y);
                            c.lineTo(p.x - p.vx * .035, p.y - p.vy * .035);
                            c.stroke();
                        }
                    }
                    c.globalAlpha = 1;
                    for (const t of this.texts) {
                        c.globalAlpha = Math.min(1, t.life / .2);
                        c.fillStyle = t.color;
                        c.font = `700 ${t.size}px system-ui`;
                        c.textAlign = 'center';
                        c.fillText(t.text, t.x, t.y);
                    }
                    c.globalAlpha = 1;
                    if (this.flash > 0) {
                        c.fillStyle = `rgba(255,92,112,${this.flash * .22})`;
                        c.fillRect(0, 0, w, h);
                    }
                    c.restore();
                }
                enemy(e, time) {
                    const c = this.ctx;
                    if (e.y < -90 || e.y > this.h + 60 || e.x < -90 || e.x > this.w + 90)
                        return;
                    const depth = Math.max(0, Math.min(1, e.y / (this.h * .7))), size = e.radius * (e.boss ? 2.9 : 3.1) * (e.boss ? 1 : .9 + .1 * depth);
                    c.save();
                    c.globalAlpha = e.boss ? 1 : .8 + .2 * depth;
                    c.translate(e.x, e.y);
                    if (!e.boss)
                        c.rotate(Math.atan2(this.h - 142 - e.y, this.w / 2 - e.x) - Math.PI / 2);
                    else
                        c.rotate(Math.sin(e.age * .9) * .05);
                    const bob = e.rhythmRole ? 1 + (e.beatPulse || 0) * .1 - (e.warn || 0) * .12 : 1 + Math.sin(time * 5 + e.phase) * .035;
                    c.scale(bob, 1 / bob);
                    c.drawImage(this.sprites[SPRITE_KIND[e.type] || e.type], -size / 2, -size / 2, size, size);
                    if (e.hit > 0) {
                        c.globalCompositeOperation = 'lighter';
                        c.globalAlpha = e.hit * 4;
                        c.drawImage(this.sprites[SPRITE_KIND[e.type] || e.type], -size / 2, -size / 2, size, size);
                    }
                    c.restore();
                    if (e.type === 'shield' && e.guard > 0) {
                        const r = e.radius * 1.52 + 7, breath = this.lite ? 1 : 1 + Math.sin(time * 2 + e.phase) * .018;
                        c.save();
                        c.globalAlpha = Math.min(1, .86 + Math.max(0, e.hit) * 1.8);
                        c.drawImage(this.shieldSprite, e.x - r * breath, e.y - r * breath, r * 2 * breath, r * 2 * breath);
                        c.restore();
                    }
                    if (e.rhythmRole === 'energy') {
                        c.fillStyle = '#baff91';
                        circle(c, e.x, e.y, 6 + Math.sin(time * 8) * 1.5);
                        c.fill();
                        c.fillStyle = '#efffdd';
                        c.font = 'bold 10px system-ui';
                        c.textAlign = 'center';
                        c.fillText('✦', e.x, e.y + 3);
                    }
                    if (e.warn > 0) {
                        const r = e.radius * (1.4 + e.warn * .3);
                        c.save();
                        c.globalAlpha = .2 + e.warn * .5;
                        c.fillStyle = '#ffab73';
                        circle(c, e.x, e.y, r);
                        c.fill();
                        c.globalAlpha = 1;
                        c.fillStyle = '#fff3b4';
                        circle(c, e.x, e.y, 3 + e.warn * 4);
                        c.fill();
                        c.restore();
                    }
                    if (e.type === 'healer') {
                        c.strokeStyle = '#76ffc2';
                        c.lineWidth = 3;
                        c.beginPath();
                        c.moveTo(e.x - 5, e.y);
                        c.lineTo(e.x + 5, e.y);
                        c.moveTo(e.x, e.y - 5);
                        c.lineTo(e.x, e.y + 5);
                        c.stroke();
                    }
                    if (e.type === 'bomb') {
                        c.fillStyle = Math.sin(time * 8) > 0 ? '#ffe298' : '#ff7350';
                        circle(c, e.x, e.y, 5);
                        c.fill();
                    }
                    if (e.boss) {
                        c.fillStyle = '#ffe2ad';
                        c.textAlign = 'center';
                        c.font = '11px system-ui';
                        c.fillText(['旋转堡垒', '双子猎手', '蜂群母舰'][e.bossKind || 0], e.x, e.y - e.radius - 18);
                        if (e.bossKind === 0) {
                            c.save();
                            c.translate(e.x, e.y);
                            c.rotate(time);
                            c.strokeStyle = Math.floor(e.age / (e.beatDuration || 60 / 116)) % 4 === 3 ? '#89ffd5' : '#e7b575';
                            c.lineWidth = 3;
                            c.setLineDash([12, 14]);
                            circle(c, 0, 0, e.radius + 7);
                            c.stroke();
                            c.restore();
                        }
                    }
                    if ((e.type === 'tank' || e.type === 'splitter' || e.boss) && e.hp < e.maxHp) {
                        const len = e.boss ? 85 : e.radius * 1.5;
                        c.fillStyle = '#263147';
                        c.fillRect(e.x - len / 2, e.y - e.radius - 10, len, 2);
                        c.fillStyle = e.boss ? '#ffc897' : '#e5afc2';
                        c.fillRect(e.x - len / 2, e.y - e.radius - 10, len * Math.max(0, e.hp / e.maxHp), 2);
                    }
                }
                turret(x, y, r, time, pulse, weapon, overdrive = false) {
                    const c = this.ctx;
                    const color = overdrive ? '#ffd48b' : weapon === 'laser' ? (this.skin?.secondary || '#b99aff') : (this.skin?.color || engine_js_1.CHAPTERS[this.chapter][1]);
                    c.save();
                    c.translate(x, y);
                    c.strokeStyle = color + '18';
                    c.lineWidth = 1;
                    circle(c, 0, 0, r + 20 + pulse * 5);
                    c.stroke();
                    c.setLineDash([3, 8]);
                    circle(c, 0, 0, r + 13);
                    c.strokeStyle = color + '48';
                    c.stroke();
                    c.setLineDash([]);
                    c.strokeStyle = color + '45';
                    c.lineWidth = 2;
                    circle(c, 0, 0, r);
                    c.stroke();
                    c.strokeStyle = color;
                    c.lineWidth = 2.4;
                    c.beginPath();
                    c.arc(0, 0, r, Math.PI + .23, TAU - .23);
                    c.stroke();
                    for (let i = 0; i < 7; i++) {
                        const a = Math.PI + .15 + (Math.PI - .3) * i / 6;
                        c.save();
                        c.rotate(a);
                        const recoil = this.recoil > 0 ? Math.sin(this.recoil / .13 * Math.PI) * 2 : 0;
                        c.fillStyle = '#0d2435';
                        c.strokeStyle = color + '95';
                        c.lineWidth = 1;
                        c.beginPath();
                        c.roundRect(r - 6 - recoil, -4, 16, 8, 2);
                        c.fill();
                        c.stroke();
                        c.fillStyle = color;
                        c.fillRect(r + 7 - recoil, -2, 3, 4);
                        if (this.recoil > 0) {
                            c.fillStyle = color + 'aa';
                            poly(c, [[r + 11, -3], [r + 24 + this.recoil * 30, 0], [r + 11, 3]]);
                            c.fill();
                        }
                        c.restore();
                    }
                    if (pulse > .05) {
                        c.globalAlpha = pulse * .65;
                        c.strokeStyle = overdrive ? '#ffe3a9' : '#aaffd8';
                        c.lineWidth = 1.5;
                        circle(c, 0, 0, r - 7 - pulse * 2);
                        c.stroke();
                    }
                    c.restore();
                }
                drawHome(time) {
                    const c = this.ctx, w = this.w, h = this.h;
                    const enemies = [{ type: 'drone', x: w * .77, y: h * .185, radius: 17, phase: 0 }, { type: 'splitter', x: w * .82, y: h * .52, radius: 19, phase: 1 }, { type: 'runner', x: w * .61, y: h * .44, radius: 13, phase: 2 }, { type: 'tank', x: w * .24, y: h * .65, radius: 19, phase: 3 }];
                    for (const e of enemies) {
                        e.x += Math.sin(time * .55 + e.phase) * 9;
                        e.y += Math.cos(time * .6 + e.phase) * 8;
                        e.hp = e.maxHp = 1;
                        e.hit = 0;
                        e.age = time;
                        this.enemy(e, time);
                    }
                    const cx = w * .61, cy = h * .69, r = 43;
                    this.turret(cx, cy, r, time, (1 + Math.cos(time * TAU / engine_js_1.BEAT)) * .5, 'wave');
                    const gradient = c.createRadialGradient(cx, cy, 0, cx, cy, r);
                    gradient.addColorStop(0, '#1d3b50');
                    gradient.addColorStop(1, '#0b1828');
                    c.fillStyle = gradient;
                    circle(c, cx, cy, r - 5);
                    c.fill();
                    c.strokeStyle = '#c0ffe4';
                    c.lineWidth = 1.5;
                    circle(c, cx, cy, 12);
                    c.stroke();
                    c.fillStyle = '#c8ffeb';
                    circle(c, cx, cy, 4);
                    c.fill();
                    for (let i = 0; i < 3; i++) {
                        const radius = 55 + ((time * 39 + i * 52) % 156);
                        c.globalAlpha = (1 - (radius - 55) / 156) * .25;
                        c.strokeStyle = '#89efff';
                        c.lineWidth = 1;
                        c.beginPath();
                        c.arc(cx, cy, radius, Math.PI + .2, TAU - .2);
                        c.stroke();
                    }
                    c.globalAlpha = 1;
                }
            };
            exports_1("BattleView", BattleView);
        }
    };
});
