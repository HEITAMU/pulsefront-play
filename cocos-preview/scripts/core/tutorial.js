System.register([], function (exports_1, context_1) {
    "use strict";
    var FirstLesson;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            // @ts-nocheck
            // Gameplay logic ported from the supplied PULSEFRONT 1.8.2 source; rules retained.
            FirstLesson = class FirstLesson {
                constructor() { this.stage = 0; this.taps = 0; this.hits = 0; this.min = 0; this.max = 0; this.held = 0; }
                down(x) { if (this.stage === 0 && ++this.taps >= 3) {
                    this.stage = 1;
                    this.min = this.max = x;
                }
                else if (this.stage === 1) {
                    this.min = this.max = x;
                    this.held = 0;
                } }
                move(x) { if (this.stage !== 1)
                    return; this.min = Math.min(this.min, x); this.max = Math.max(this.max, x); if (this.held >= .35 && this.max - this.min >= .9)
                    this.stage = 2; }
                tick(dt, pressed) { if (pressed)
                    this.held += dt; return pressed ? 1 : .06; }
                perfect() { if (this.stage === 2 && ++this.hits >= 3)
                    this.stage = 3; }
                get done() { return this.stage === 3; }
                get title() { return ['点按大按钮开火', '按住按钮，左右滑动', '尝试跟着节拍开火！', '学会了！'][this.stage]; }
                get detail() { return [`点按 ${Math.min(3, this.taps)} / 3 次`, '手指保持按住，从左滑到右', `跟着亮起的鼓点点按 · ${this.hits} / 3 次`, ''][this.stage]; }
            };
            exports_1("FirstLesson", FirstLesson);
        }
    };
});
