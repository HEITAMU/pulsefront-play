System.register(["cc", "./Primitives.js"], function (exports_1, context_1) {
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
            /** Native, silent cannon feedback. The ring and the direction indicator are independent. */
            CannonButton = class CannonButton {
                constructor(parent, x, y) {
                    this.held = false;
                    this.pressAge = 1;
                    this.releaseAge = 1;
                    this.recoil = 0;
                    this.strong = 0;
                    this.rings = [];
                    this.lite = false;
                    this.node = Primitives_js_1.nodeAt(parent, 'Cannon', x, y, 0, 0);
                    this.face = Primitives_js_1.nodeAt(this.node, 'CannonVisual', 0, 0, 150, 150);
                    this.face.getComponent(cc_1.UITransform).setAnchorPoint(.5, .5);
                    this.g = this.face.addComponent(cc_1.Graphics);
                    this.top = Primitives_js_1.text(this.face, 'PULSE ENGINE', -65, -39, 130, 16, { size: 7, color: '#8fb3bf', align: 'center', wrap: false });
                    this.main = Primitives_js_1.text(this.face, '开火', -70, -14, 140, 47, { size: 31, bold: true, color: '#d5f9e5', align: 'center', wrap: false });
                    this.bottom = Primitives_js_1.text(this.face, '点按 / 长按', -70, 33, 140, 19, { size: 9, color: '#93b2bc', align: 'center', wrap: false });
                    this.hitArea = Primitives_js_1.nodeAt(this.node, 'FireTouchArea', -93, -93, 186, 168);
                }
                setHeld(v) {
                    if (v === this.held)
                        return;
                    this.held = v;
                    if (v) {
                        this.pressAge = 0;
                        this.rings.push(0);
                    }
                    else
                        this.releaseAge = 0;
                }
                kick(perfect = false) { this.recoil = .14; if (perfect) {
                    this.strong = .24;
                    this.rings.push(0);
                } this.rings = this.rings.slice(-5); }
                reset() { this.setHeld(false); this.bottom.string = '全向开火'; }
                move(x, y) { this.node.setPosition(x, -y); }
                update(dt, time, phase, beat, aim, overdrive, accent = '#a8fbd6') {
                    this.pressAge += dt;
                    this.releaseAge += dt;
                    this.recoil = Math.max(0, this.recoil - dt);
                    this.strong = Math.max(0, this.strong - dt);
                    this.rings = this.rings.map(t => t + dt).filter(t => t < .5);
                    let scale = 1;
                    if (!this.lite) {
                        if (this.held) {
                            const t = this.pressAge;
                            scale = t < .055 ? 1.06 - t / .055 * .18 : t < .17 ? .88 + (t - .055) / .115 * .065 : .945;
                            scale += this.recoil * .15;
                        }
                        else if (this.releaseAge < .3)
                            scale = 1 + Math.sin(this.releaseAge * 24) * Math.exp(-this.releaseAge * 14) * .075;
                    }
                    this.face.setScale(scale, scale, 1);
                    this.face.angle = this.held && !this.lite ? Math.sin(time * 32) * .5 : 0;
                    const pulse = Math.max(0, 1 - Math.min(phase, beat - phase) / .14), hot = this.held || this.strong > 0;
                    const glow = overdrive ? '#ffda93' : accent, g = this.g;
                    g.clear();
                    const circle = (r, col, width, alpha = 1) => { g.circle(0, 0, r); g.strokeColor = Primitives_js_1.color(col, alpha); g.lineWidth = width; g.stroke(); };
                    if (hot) {
                        for (const [radius, width, a] of [[76, 36, .055], [77, 22, .09], [77, 10, .18], [76, 3, .95]])
                            circle(radius, glow, width, a);
                    }
                    else {
                        circle(76, glow, 15, .025);
                        circle(75, '#93bdc8', 1, .48);
                    }
                    g.circle(0, 0, 74);
                    g.fillColor = Primitives_js_1.color(hot ? '#255557' : '#122b3b');
                    g.fill();
                    g.circle(-10, 14, 59);
                    g.fillColor = Primitives_js_1.color(hot ? '#83eac01c' : '#2c4d5a40');
                    g.fill();
                    circle(66, glow, hot ? 2 : 1, hot ? .65 : .19);
                    circle(59, glow, 1, hot ? .3 : .12);
                    const a0 = this.lite ? 0 : time * 1.8;
                    for (let i = 0; i < 24; i++) {
                        const a = a0 + i * Math.PI / 12, r = hot ? 95 : 87;
                        g.arc(0, 0, r, a, a + .11, false);
                        g.lineWidth = hot ? 2.7 : 1.2;
                        g.strokeColor = Primitives_js_1.color(glow, hot ? .75 : .15);
                        g.stroke();
                    }
                    if (!this.lite)
                        for (const age of this.rings)
                            circle(80 + age * 75, glow, 3 - age * 4, (1 - age / .5) * .8);
                    if (pulse > .02)
                        circle(71 - pulse * 2, '#d6ffe8', 2, pulse * .65);
                    if (aim) {
                        const a = -Math.atan2(aim.y, aim.x);
                        g.arc(0, 0, 81, a - .22, a + .22, false);
                        g.strokeColor = Primitives_js_1.color('#f1ffbb');
                        g.lineWidth = 5;
                        g.stroke();
                        const x = Math.cos(a), y = Math.sin(a);
                        g.moveTo(x * 86, y * 86);
                        g.lineTo(x * 101 - y * 5, y * 101 + x * 5);
                        g.lineTo(x * 101 + y * 5, y * 101 - x * 5);
                        g.close();
                        g.fillColor = Primitives_js_1.color('#edffc2');
                        g.fill();
                        this.bottom.string = Math.abs(aim.x) < .35 ? '↑ 正前方加火力' : aim.x < 0 ? '← 左侧加火力' : '右侧加火力 →';
                    }
                    else
                        this.bottom.string = this.held ? '全向开火' : '点按 / 长按';
                    this.main.color = Primitives_js_1.color(hot ? '#f7fff8' : '#d7f5df');
                    this.top.color = Primitives_js_1.color(hot ? '#d8fff0' : '#8faeb8');
                }
            };
            exports_1("CannonButton", CannonButton);
        }
    };
});
