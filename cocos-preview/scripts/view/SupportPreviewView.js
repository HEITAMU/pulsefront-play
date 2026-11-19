System.register(["cc", "../core/support.js?v=56ad489c6a4bccde", "./NativeDraw2D.js?v=56ad489c6a4bccde"], function (exports_1, context_1) {
    "use strict";
    var cc_1, support_js_1, NativeDraw2D_js_1, SupportPreviewView;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (cc_1_1) {
                cc_1 = cc_1_1;
            },
            function (support_js_1_1) {
                support_js_1 = support_js_1_1;
            },
            function (NativeDraw2D_js_1_1) {
                NativeDraw2D_js_1 = NativeDraw2D_js_1_1;
            }
        ],
        execute: function () {
            /** The web version's six projectile previews, drawn with native Cocos nodes. */
            SupportPreviewView = class SupportPreviewView {
                constructor(parent, width, height, id, motion, lite = false) {
                    this.lite = lite;
                    this.cycle = -1;
                    this.width = width;
                    this.height = height;
                    this.id = support_js_1.SUPPORTS.some(s => s.id === id) ? id : support_js_1.SUPPORTS[0].id;
                    this.root = new cc_1.Node('Support preview');
                    this.root.layer = parent.layer;
                    parent.addChild(this.root);
                    const frame = this.root.addComponent(cc_1.UITransform);
                    frame.setAnchorPoint(0, 1);
                    frame.setContentSize(width, height);
                    this.root.addComponent(cc_1.Mask).type = cc_1.Mask.Type.GRAPHICS_RECT;
                    const content = new cc_1.Node('Projectile paths');
                    content.layer = this.root.layer;
                    this.root.addChild(content);
                    const contentTransform = content.addComponent(cc_1.UITransform);
                    contentTransform.setAnchorPoint(0, 1);
                    contentTransform.setContentSize(width, height);
                    this.draw = new NativeDraw2D_js_1.NativeDraw2D(content);
                    this.draw.resize(width, height);
                    this.demo = {
                        t: 0, w: width, h: height + 90, cx: width / 2, cy: height + 75,
                        c: { weaponScale: 1 }, musicPhase: 'groove', enemies: [],
                        targetable: (enemy) => enemy.hp > 0,
                        damage: (enemy, amount) => { enemy.hp -= amount; },
                        emit: () => { },
                    };
                    this.support = new support_js_1.SupportSystem(this.demo, [this.id], { [this.id]: motion });
                }
                update(dt) {
                    dt = Math.min(.06, Math.max(0, dt));
                    this.demo.t += dt;
                    const cycle = Math.floor(this.demo.t / 2.5);
                    if (cycle !== this.cycle) {
                        this.cycle = cycle;
                        this.demo.enemies = [
                            { id: 1, x: this.width * .196, y: this.height * .25, radius: 8, hp: 30 },
                            { id: 2, x: this.width * .518, y: this.height * .321, radius: 8, hp: 30 },
                            { id: 3, x: this.width * .804, y: this.height * .179, radius: 8, hp: 30 },
                        ];
                        for (let i = 0; i < 6; i++)
                            this.support.launch({ id: this.id, i, n: 6 });
                    }
                    this.support.update(dt);
                    const c = this.draw;
                    c.beginFrame();
                    c.fillStyle = '#070f1e';
                    c.fillRect(0, 0, this.width, this.height);
                    for (const enemy of this.demo.enemies) {
                        if (enemy.hp <= 0)
                            continue;
                        c.fillStyle = '#e578a3';
                        c.beginPath();
                        c.moveTo(enemy.x, enemy.y - 7);
                        c.lineTo(enemy.x + 6, enemy.y);
                        c.lineTo(enemy.x, enemy.y + 7);
                        c.lineTo(enemy.x - 6, enemy.y);
                        c.closePath();
                        c.fill();
                    }
                    this.support.draw(c, this.lite);
                    c.endFrame();
                }
                get stats() { return { ...this.draw.stats, shots: this.support.shots.length }; }
                destroy() { this.draw.destroy(); this.root.destroy(); }
            };
            exports_1("SupportPreviewView", SupportPreviewView);
        }
    };
});
