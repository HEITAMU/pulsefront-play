System.register(["cc", "./Primitives.js?v=4592cf42476a57b5"], function (exports_1, context_1) {
    "use strict";
    var cc_1, Primitives_js_1, CannonButton;
    var __moduleName = context_1 && context_1.id;
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
            /** Native, silent feedback. Halo, button face and aiming arrows have separate layers. */
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
                    this.node = Primitives_js_1.nodeAt(parent, 'Cannon', x, y, 0, 0);
                    this.halo = Primitives_js_1.nodeAt(this.node, 'CannonHalo', 0, 0).addComponent(cc_1.Graphics);
                    this.face = Primitives_js_1.nodeAt(this.node, 'CannonVisual', 0, 0, 150, 150);
                    this.face.getComponent(cc_1.UITransform).setAnchorPoint(.5, .5);
                    this.g = this.face.addComponent(cc_1.Graphics);
                    this.top = Primitives_js_1.text(this.face, 'PULSE ENGINE', -65, -39, 130, 16, { size: 7, color: '#8fb3bf', align: 'center', wrap: false });
                    this.main = Primitives_js_1.text(this.face, '开火', -70, -14, 140, 47, { size: 31, bold: true, color: '#d5f9e5', align: 'center', wrap: false });
                    this.bottom = Primitives_js_1.text(this.face, '点按 / 长按', -70, 33, 140, 19, { size: 9, color: '#93b2bc', align: 'center', wrap: false });
                    this.direction = Primitives_js_1.nodeAt(this.node, 'CannonDirectionArrows', 0, 0).addComponent(cc_1.Graphics);
                    this.direction.lineCap = cc_1.Graphics.LineCap.ROUND;
                    this.direction.lineJoin = cc_1.Graphics.LineJoin.ROUND;
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
                    this.rings = this.rings.slice(-5);
                }
                reset() { this.setHeld(false); }
                move(x, y) { this.node.setPosition(x, -y); }
                update(dt, time, phase, beat, aim, overdrive, accent = '#a8fbd6', swipeGuide = false) {
                    this.pressAge += dt;
                    this.releaseAge += dt;
                    this.recoil = Math.max(0, this.recoil - dt);
                    this.strong = Math.max(0, this.strong - dt);
                    this.flash = Math.max(0, this.flash - dt);
                    this.rings = this.rings.map(t => t + dt).filter(t => t < .52);
                    // A quick tap remains visible after release. Held light does not depend on
                    // hitting a beat, and reduced motion keeps the bright face and rim.
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
                    const ring = (g, r, tint, width, alpha = 1) => {
                        g.circle(0, 0, r);
                        g.strokeColor = Primitives_js_1.color(tint, Math.max(0, alpha));
                        g.lineWidth = width;
                        g.stroke();
                    };
                    const h = this.halo;
                    h.clear();
                    if (hot > .001 || flash > .001) {
                        const light = Math.min(1, hot + flash * .25);
                        // Broad, graded light is visible beyond the pressed face; it is not only
                        // a thin outline. Geometry stays sharp at the display's pixel density.
                        for (const [radius, width, alpha] of [[77, 66, .07], [77, 48, .10], [77, 30, .16], [77, 17, .25], [76, 7, .48]]) {
                            ring(h, radius, glow, width, alpha * light);
                        }
                        ring(h, 77, '#e7fff5', 3.2, .95 * light);
                        if (this.held && !this.lite) {
                            const progress = (this.pressAge % .42) / .42;
                            ring(h, 79 + progress * 27, '#caffea', 3 - progress, (1 - progress) * .88);
                        }
                    }
                    else {
                        ring(h, 76, glow, 15, .025);
                    }
                    const a0 = this.lite ? 0 : time * (this.held ? 5.2 : .7);
                    for (let i = 0; i < 24; i++) {
                        const a = a0 + i * Math.PI / 12, r = 89 + hot * 7;
                        h.arc(0, 0, r, a, a + .11, false);
                        h.lineWidth = 1.2 + hot * 2;
                        h.strokeColor = Primitives_js_1.color(glow, .14 + hot * .8);
                        h.stroke();
                    }
                    if (!this.lite)
                        for (const age of this.rings) {
                            ring(h, 77 + age * 70, '#ddfff1', 3.5 - age * 4, (1 - age / .52) * .9);
                        }
                    const g = this.g;
                    g.clear();
                    const faceColor = new cc_1.Color();
                    cc_1.Color.lerp(faceColor, Primitives_js_1.color('#122b3b'), Primitives_js_1.color('#377f82'), hot);
                    g.circle(0, 0, 74);
                    g.fillColor = faceColor;
                    g.fill();
                    // Restore the metal highlight and add a large bright contact surface.
                    for (let i = 0; i < 6; i++) {
                        g.circle(-9, 11, 61 - i * 7);
                        g.fillColor = Primitives_js_1.color(hot > 0 ? '#baffdf' : '#7b9aa6', (.015 + hot * .018) + flash * .008);
                        g.fill();
                    }
                    ring(g, 74, '#e7fff3', 1.2 + hot * 1.8, .38 + hot * .62);
                    ring(g, 69, glow, 2 + hot * 7, .08 + hot * .33);
                    ring(g, 65, '#e6fff1', 1 + hot, .18 + hot * .62);
                    ring(g, 59, glow, 1, .13 + hot * .25);
                    if (flash > .01) {
                        g.circle(0, 0, 63);
                        g.fillColor = Primitives_js_1.color('#ddfff0', flash * .2);
                        g.fill();
                        ring(g, 72, '#ffffff', 3, flash * .8);
                    }
                    if (pulse > .02)
                        ring(g, 70 - pulse * 2, '#d6ffe8', 2, pulse * .5);
                    const d = this.direction;
                    d.clear();
                    if (aim) {
                        const a = -Math.atan2(aim.y, aim.x), dx = Math.cos(a), dy = Math.sin(a);
                        d.arc(0, 0, 82, a - .3, a + .3, false);
                        d.strokeColor = Primitives_js_1.color('#ffe6a6');
                        d.lineWidth = 5;
                        d.stroke();
                        // The apex faces the aim direction, outside the halo's button rim.
                        d.moveTo(dx * 109, dy * 109);
                        d.lineTo(dx * 95 - dy * 6, dy * 95 + dx * 6);
                        d.lineTo(dx * 95 + dy * 6, dy * 95 - dx * 6);
                        d.close();
                        d.fillColor = Primitives_js_1.color('#fff0bc');
                        d.fill();
                        this.bottom.string = Math.abs(aim.x) < .35 ? '正前方加火力' : aim.x < 0 ? '左侧加火力' : '右侧加火力';
                    }
                    else
                        this.bottom.string = swipeGuide ? '按住 · 左右滑动' : this.held ? '全向开火' : '点按 / 长按';
                    if (swipeGuide) {
                        const offset = this.lite ? 0 : Math.sin(time * 5) * 3;
                        d.strokeColor = Primitives_js_1.color('#e4fff1');
                        d.lineWidth = 2.5;
                        for (const side of [-1, 1]) {
                            const x = side * (53 + offset);
                            d.moveTo(x - side * 6, 1);
                            d.lineTo(x, -6);
                            d.lineTo(x - side * 6, -13);
                            d.stroke();
                        }
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
