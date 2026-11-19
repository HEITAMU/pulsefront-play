System.register(["cc", "./Primitives.js?v=56ad489c6a4bccde"], function (exports_1, context_1) {
    "use strict";
    var cc_1, Primitives_js_1, DEG, CannonButton;
    var __moduleName = context_1 && context_1.id;
    function ring(g, radius, tint, width, alpha = 1) {
        g.circle(0, 0, radius);
        g.strokeColor = Primitives_js_1.color(tint, Math.max(0, alpha));
        g.lineWidth = width;
        g.stroke();
    }
    return {
        setters: [
            function (cc_1_1) {
                cc_1 = cc_1_1;
            },
            function (Primitives_js_1_1) {
                Primitives_js_1 = Primitives_js_1_1;
            }
        ],
        execute: function () {
            DEG = 180 / Math.PI;
            /** Native, silent feedback. Stable geometry is retained; motion still updates each frame. */
            CannonButton = class CannonButton {
                constructor(parent, x, y) {
                    this.held = false;
                    this.pressAge = 1;
                    this.releaseAge = 1;
                    this.recoil = 0;
                    this.strong = 0;
                    this.flash = 0;
                    this.rings = [];
                    this.lite = false;
                    this.faceHot = -1;
                    this.faceGlow = '';
                    this.haloLight = -1;
                    this.haloGlow = '';
                    this.orbitHot = -1;
                    this.orbitGlow = '';
                    this.flashValue = -1;
                    this.flashHot = false;
                    this.pulseValue = -1;
                    this.ringsWereVisible = false;
                    this.geometryRebuilds = 0;
                    this.node = Primitives_js_1.nodeAt(parent, 'Cannon', x, y, 0, 0);
                    this.halo = Primitives_js_1.nodeAt(this.node, 'CannonHalo', 0, 0).addComponent(cc_1.Graphics);
                    this.orbit = Primitives_js_1.nodeAt(this.node, 'CannonOrbit', 0, 0).addComponent(cc_1.Graphics);
                    this.holdRing = Primitives_js_1.nodeAt(this.node, 'CannonHeldRing', 0, 0).addComponent(cc_1.Graphics);
                    this.kickRings = Primitives_js_1.nodeAt(this.node, 'CannonKickRings', 0, 0).addComponent(cc_1.Graphics);
                    this.face = Primitives_js_1.nodeAt(this.node, 'CannonVisual', 0, 0, 150, 150);
                    this.face.getComponent(cc_1.UITransform).setAnchorPoint(.5, .5);
                    this.g = this.face.addComponent(cc_1.Graphics);
                    this.flashLayer = Primitives_js_1.nodeAt(this.face, 'CannonFlash', 0, 0).addComponent(cc_1.Graphics);
                    this.pulseLayer = Primitives_js_1.nodeAt(this.face, 'CannonBeat', 0, 0).addComponent(cc_1.Graphics);
                    this.top = Primitives_js_1.text(this.face, 'PULSE ENGINE', -65, -39, 130, 16, { size: 7, color: '#8fb3bf', align: 'center', wrap: false });
                    this.main = Primitives_js_1.text(this.face, '开火', -70, -14, 140, 47, { size: 31, bold: true, color: '#d5f9e5', align: 'center', wrap: false });
                    this.bottom = Primitives_js_1.text(this.face, '点按 / 长按', -70, 33, 140, 19, { size: 9, color: '#93b2bc', align: 'center', wrap: false });
                    this.direction = Primitives_js_1.nodeAt(this.node, 'CannonDirectionArrows', 0, 0).addComponent(cc_1.Graphics);
                    this.direction.lineCap = cc_1.Graphics.LineCap.ROUND;
                    this.direction.lineJoin = cc_1.Graphics.LineJoin.ROUND;
                    // The arrow shape is fixed and rotated as a node as the player's aim changes.
                    const d = this.direction;
                    d.arc(0, 0, 82, -.3, .3, false);
                    d.strokeColor = Primitives_js_1.color('#ffe6a6');
                    d.lineWidth = 5;
                    d.stroke();
                    d.moveTo(109, 0);
                    d.lineTo(95, 6);
                    d.lineTo(95, -6);
                    d.close();
                    d.fillColor = Primitives_js_1.color('#fff0bc');
                    d.fill();
                    this.direction.node.active = false;
                    const guide = (side) => {
                        const node = Primitives_js_1.nodeAt(this.node, side < 0 ? 'CannonSwipeLeft' : 'CannonSwipeRight', side * 53, 0);
                        const g = node.addComponent(cc_1.Graphics);
                        g.lineCap = cc_1.Graphics.LineCap.ROUND;
                        g.lineJoin = cc_1.Graphics.LineJoin.ROUND;
                        g.strokeColor = Primitives_js_1.color('#e4fff1');
                        g.lineWidth = 2.5;
                        g.moveTo(-side * 6, 1);
                        g.lineTo(0, -6);
                        g.lineTo(-side * 6, -13);
                        g.stroke();
                        node.active = false;
                        return node;
                    };
                    this.swipeLeft = guide(-1);
                    this.swipeRight = guide(1);
                    this.hitArea = Primitives_js_1.nodeAt(this.node, 'FireTouchArea', -93, -93, 186, 168);
                }
                setHeld(value) {
                    if (value === this.held)
                        return;
                    this.held = value;
                    if (value) {
                        this.pressAge = 0;
                        this.flash = .28;
                        this.rings.push(0);
                    }
                    else {
                        this.releaseAge = 0;
                    }
                }
                kick(perfect = false) {
                    this.recoil = .14;
                    this.flash = Math.max(this.flash, perfect ? .24 : .08);
                    if (perfect) {
                        this.strong = .24;
                        this.rings.push(0);
                    }
                    if (this.rings.length > 5)
                        this.rings.splice(0, this.rings.length - 5);
                }
                reset() { this.setHeld(false); }
                move(x, y) { this.node.setPosition(x, -y); }
                get stats() { return { geometryRebuilds: this.geometryRebuilds }; }
                clear(g) { g.clear(); this.geometryRebuilds++; }
                update(dt, time, phase, beat, aim, overdrive, accent = '#a8fbd6', swipeGuide = false) {
                    this.pressAge += dt;
                    this.releaseAge += dt;
                    this.recoil = Math.max(0, this.recoil - dt);
                    this.strong = Math.max(0, this.strong - dt);
                    this.flash = Math.max(0, this.flash - dt);
                    let live = 0;
                    for (let i = 0; i < this.rings.length; i++) {
                        const age = this.rings[i] + dt;
                        if (age < .52)
                            this.rings[live++] = age;
                    }
                    this.rings.length = live;
                    const afterglow = Math.max(0, 1 - this.releaseAge / .24);
                    const contact = this.held ? 1 : afterglow;
                    const hot = Math.max(contact, this.strong / .24);
                    const flash = this.flash / .28;
                    const glow = overdrive ? '#ffda93' : accent;
                    const pulse = Math.max(0, 1 - Math.min(phase, beat - phase) / .14);
                    let scale = 1;
                    if (!this.lite) {
                        if (this.held) {
                            const t = this.pressAge;
                            scale = t < .06 ? 1.07 - t / .06 * .19 : t < .16 ? .88 + (t - .06) / .10 * .05 : .93;
                            scale += this.recoil / .14 * .022;
                        }
                        else if (this.releaseAge < .32)
                            scale = 1 + Math.sin(this.releaseAge * 24) * Math.exp(-this.releaseAge * 12) * .08;
                    }
                    this.face.setScale(scale, scale, 1);
                    this.face.angle = this.held && !this.lite && this.pressAge < .16 ? Math.sin(this.pressAge * 36) * 1.2 : 0;
                    // Graphics uses vertex alpha in 3.8.8. Cache its geometry when colors remain
                    // stable, and redraw the small fading layers only while their alpha changes.
                    const light = hot > .001 || flash > .001 ? Math.min(1, hot + flash * .25) : 0;
                    if (light !== this.haloLight || glow !== this.haloGlow) {
                        this.haloLight = light;
                        this.haloGlow = glow;
                        const h = this.halo;
                        this.clear(h);
                        if (light) {
                            for (const [radius, width, alpha] of [[77, 66, .07], [77, 48, .10], [77, 30, .16], [77, 17, .25], [76, 7, .48]])
                                ring(h, radius, glow, width, alpha * light);
                            ring(h, 77, '#e7fff5', 3.2, .95 * light);
                        }
                        else
                            ring(h, 76, glow, 15, .025);
                    }
                    if (hot !== this.orbitHot || glow !== this.orbitGlow) {
                        this.orbitHot = hot;
                        this.orbitGlow = glow;
                        const g = this.orbit;
                        this.clear(g);
                        for (let i = 0; i < 24; i++) {
                            const a = i * Math.PI / 12;
                            g.arc(0, 0, 89 + hot * 7, a, a + .11, false);
                            g.lineWidth = 1.2 + hot * 2;
                            g.strokeColor = Primitives_js_1.color(glow, .14 + hot * .8);
                            g.stroke();
                        }
                    }
                    this.orbit.node.angle = (this.lite ? 0 : time * (this.held ? 5.2 : .7)) * DEG;
                    this.holdRing.node.active = this.held && !this.lite;
                    if (this.holdRing.node.active) {
                        const progress = (this.pressAge % .42) / .42;
                        this.clear(this.holdRing);
                        ring(this.holdRing, 79 + progress * 27, '#caffea', 3 - progress, (1 - progress) * .88);
                    }
                    const showRings = !this.lite && this.rings.length > 0;
                    if (showRings || this.ringsWereVisible) {
                        this.clear(this.kickRings);
                        if (showRings)
                            for (const age of this.rings)
                                ring(this.kickRings, 77 + age * 70, '#ddfff1', 3.5 - age * 4, (1 - age / .52) * .9);
                    }
                    this.ringsWereVisible = showRings;
                    if (hot !== this.faceHot || glow !== this.faceGlow) {
                        this.faceHot = hot;
                        this.faceGlow = glow;
                        const g = this.g;
                        this.clear(g);
                        const faceColor = new cc_1.Color();
                        cc_1.Color.lerp(faceColor, Primitives_js_1.color('#122b3b'), Primitives_js_1.color('#377f82'), hot);
                        g.circle(0, 0, 74);
                        g.fillColor = faceColor;
                        g.fill();
                        for (let i = 0; i < 6; i++) {
                            g.circle(-9, 11, 61 - i * 7);
                            g.fillColor = Primitives_js_1.color(hot > 0 ? '#baffdf' : '#7b9aa6', .015 + hot * .018);
                            g.fill();
                        }
                        ring(g, 74, '#e7fff3', 1.2 + hot * 1.8, .38 + hot * .62);
                        ring(g, 69, glow, 2 + hot * 7, .08 + hot * .33);
                        ring(g, 65, '#e6fff1', 1 + hot, .18 + hot * .62);
                        ring(g, 59, glow, 1, .13 + hot * .25);
                    }
                    if (flash !== this.flashValue || (hot > 0) !== this.flashHot) {
                        this.flashValue = flash;
                        this.flashHot = hot > 0;
                        const g = this.flashLayer;
                        this.clear(g);
                        if (flash > .01) {
                            g.circle(0, 0, 63);
                            g.fillColor = Primitives_js_1.color('#ddfff0', flash * .2);
                            g.fill();
                            ring(g, 72, '#ffffff', 3, flash * .8);
                        }
                    }
                    if (pulse !== this.pulseValue) {
                        this.pulseValue = pulse;
                        this.clear(this.pulseLayer);
                        if (pulse > .02)
                            ring(this.pulseLayer, 70 - pulse * 2, '#d6ffe8', 2, pulse * .5);
                    }
                    this.direction.node.active = !!aim;
                    if (aim) {
                        this.direction.node.angle = -Math.atan2(aim.y, aim.x) * DEG;
                        this.bottom.string = Math.abs(aim.x) < .35 ? '正前方加火力' : aim.x < 0 ? '左侧加火力' : '右侧加火力';
                    }
                    else
                        this.bottom.string = swipeGuide ? '按住 · 左右滑动' : this.held ? '全向开火' : '点按 / 长按';
                    this.swipeLeft.active = this.swipeRight.active = swipeGuide;
                    if (swipeGuide) {
                        const offset = this.lite ? 0 : Math.sin(time * 5) * 3;
                        this.swipeLeft.setPosition(-53 - offset, 0);
                        this.swipeRight.setPosition(53 + offset, 0);
                    }
                    this.main.color = Primitives_js_1.color(hot > .1 ? '#ffffff' : '#d7f5df');
                    this.top.color = Primitives_js_1.color(hot > .1 ? '#e0fff4' : '#8faeb8');
                    this.bottom.color = Primitives_js_1.color(aim ? '#ffe7af' : hot > .1 ? '#e0fff4' : '#93b2bc');
                }
            };
            exports_1("CannonButton", CannonButton);
        }
    };
});
