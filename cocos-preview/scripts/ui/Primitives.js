System.register(["cc", "./LabelClarity.js?v=56ad489c6a4bccde"], function (exports_1, context_1) {
    "use strict";
    var cc_1, LabelClarity_js_1, palette, Panel;
    var __moduleName = context_1 && context_1.id;
    function color(hex, alpha = 1) {
        const c = new cc_1.Color();
        c.fromHEX(hex);
        c.a *= alpha;
        return c;
    }
    exports_1("color", color);
    /** All UI layout coordinates are measured from the top left, as in the original trial. */
    function nodeAt(parent, name, x, y, w = 0, h = 0) {
        const n = new cc_1.Node(name);
        n.layer = cc_1.Layers.Enum.UI_2D;
        parent.addChild(n);
        n.setPosition(x, -y, 0);
        const t = n.addComponent(cc_1.UITransform);
        t.setAnchorPoint(0, 1);
        t.setContentSize(w, h);
        return n;
    }
    exports_1("nodeAt", nodeAt);
    function rounded(g, x, y, w, h, r, fill, stroke, lineWidth = 1) {
        g.roundRect(x, -y - h, Math.max(0, w), Math.max(0, h), Math.min(r, w / 2, h / 2));
        g.fillColor = color(fill);
        g.fill();
        if (stroke) {
            g.lineWidth = lineWidth;
            g.strokeColor = color(stroke);
            g.stroke();
        }
    }
    exports_1("rounded", rounded);
    function card(parent, name, x, y, w, h, fill = palette.panel, stroke = '#43576475', radius = 16) {
        const n = nodeAt(parent, name, x, y, w, h), g = n.addComponent(cc_1.Graphics);
        rounded(g, 0, 0, w, h, radius, fill, stroke);
        if (h > 25) {
            g.strokeColor = color('#dcebef12');
            g.lineWidth = 1;
            g.moveTo(radius, -1.5);
            g.lineTo(w - radius, -1.5);
            g.stroke();
        }
        return n;
    }
    exports_1("card", card);
    function text(parent, value, x, y, w, h, opts = {}) {
        const n = nodeAt(parent, 'Text:' + value.slice(0, 28), x, y, w, h), l = n.addComponent(cc_1.Label);
        l.string = value;
        l.fontSize = opts.size ?? 14;
        l.lineHeight = opts.lineHeight ?? Math.ceil(l.fontSize * 1.45);
        l.fontFamily = 'Arial';
        l.useSystemFont = true;
        l.isBold = !!opts.bold;
        l.color = color(opts.color ?? palette.text);
        l.horizontalAlign = opts.align === 'center' ? cc_1.Label.HorizontalAlign.CENTER : opts.align === 'right' ? cc_1.Label.HorizontalAlign.RIGHT : cc_1.Label.HorizontalAlign.LEFT;
        l.verticalAlign = cc_1.Label.VerticalAlign.TOP;
        l.enableWrapText = opts.wrap !== false;
        l.overflow = cc_1.Label.Overflow.SHRINK;
        LabelClarity_js_1.configureLabelClarity(l, { fontSize: opts.size ?? 14, lineHeight: opts.lineHeight ?? Math.ceil((opts.size ?? 14) * 1.45), width: w, height: h });
        return l;
    }
    exports_1("text", text);
    function button(parent, id, title, x, y, w, h, action, opts = {}) {
        const fill = opts.fill ?? (opts.primary ? '#c9cec1' : opts.selected ? '#2b4947' : '#1b2d3c');
        const n = card(parent, id, x, y, w, h, fill, opts.primary ? '#e9edda' : opts.selected ? '#a6dbc5' : '#819eaf38', opts.radius ?? 10);
        if (opts.primary) {
            const surface = nodeAt(n, 'MetalSurface', 0, 0, w, h), sprite = surface.addComponent(cc_1.Sprite);
            sprite.sizeMode = cc_1.Sprite.SizeMode.CUSTOM;
            cc_1.resources.load('ui/primary/spriteFrame', cc_1.SpriteFrame, (error, frame) => { if (!error && cc_1.isValid(surface))
                sprite.spriteFrame = frame; });
        }
        const hl = nodeAt(n, 'PressedGlow', 0, 0, w, h), hg = hl.addComponent(cc_1.Graphics);
        hg.roundRect(-2, -h - 2, w + 4, h + 4, (opts.radius ?? 10) + 2);
        hg.lineWidth = 6;
        hg.strokeColor = color('#9cffdb', .2);
        hg.stroke();
        rounded(hg, 1, 1, w - 2, h - 2, opts.radius ?? 10, '#cdffe73d', '#e6fff1', 2);
        hl.active = false;
        // Navigation is an independent vector icon: font fallback, text length and
        // Label's fit rules must never hide, shrink or move the arrow into the title.
        const hasArrow = opts.arrow ?? /↗\s*$/.test(title), caption = hasArrow ? title.replace(/\s*↗\s*$/, '') : title;
        const foreground = opts.foreground ?? (opts.primary ? '#182e32' : palette.text);
        const align = opts.align ?? (hasArrow && opts.primary ? 'left' : 'center');
        const inset = align === 'left' ? (opts.primary ? 20 : 14) : 5;
        const label = text(n, caption, inset, (h - (opts.size ?? 13) * 1.5) / 2, w - inset - (hasArrow ? 37 : inset), h * .8, { size: opts.size ?? 13, bold: !!opts.primary, color: foreground, align, wrap: false });
        if (hasArrow) {
            const size = opts.primary ? 18 : 11;
            const arrow = nodeAt(n, 'NavigationArrow', w - (opts.primary ? 25 : 17), h / 2, size, size);
            arrow.getComponent(cc_1.UITransform).setAnchorPoint(.5, .5);
            const ag = arrow.addComponent(cc_1.Graphics), half = size / 2;
            ag.lineCap = cc_1.Graphics.LineCap.ROUND;
            ag.lineJoin = cc_1.Graphics.LineJoin.ROUND;
            ag.strokeColor = color(opts.primary ? foreground : '#b6d3d4');
            ag.lineWidth = opts.primary ? 2 : 1.6;
            ag.moveTo(-half, -half);
            ag.lineTo(half, half);
            ag.moveTo(-half * .4, half);
            ag.lineTo(half, half);
            ag.lineTo(half, -half * .4);
            ag.stroke();
        }
        const opacity = n.addComponent(cc_1.UIOpacity);
        let enabled = opts.enabled !== false, down = false, origin = { x: 0, y: 0 };
        const reset = () => { down = false; hl.active = false; n.setScale(1, 1, 1); };
        const setEnabled = (v) => { enabled = v; opacity.opacity = v ? 255 : 90; if (!v)
            reset(); };
        n.on(cc_1.Node.EventType.TOUCH_START, (e) => {
            if (!enabled)
                return;
            down = true;
            const p = e.getUILocation();
            origin = { x: p.x, y: p.y };
            hl.active = true;
        });
        n.on(cc_1.Node.EventType.TOUCH_MOVE, (e) => { const p = e.getUILocation(); if (Math.hypot(p.x - origin.x, p.y - origin.y) > 12)
            reset(); });
        n.on(cc_1.Node.EventType.TOUCH_CANCEL, reset);
        n.on(cc_1.Node.EventType.TOUCH_END, () => { const invoke = down && enabled; reset(); if (invoke)
            action(); });
        setEnabled(enabled);
        return { node: n, label, setEnabled };
    }
    exports_1("button", button);
    function slider(parent, id, title, value, x, y, w, change) {
        text(parent, title, x, y, w - 55, 24, { size: 13 });
        const val = text(parent, Math.round(value * 100) + '%', x + w - 55, y, 55, 24, { size: 13, color: palette.mint, align: 'right' });
        const track = nodeAt(parent, id, x, y + 26, w, 36), g = track.addComponent(cc_1.Graphics);
        const draw = (v) => {
            g.clear();
            rounded(g, 0, 15, w, 6, 3, '#334957');
            if (v > .001)
                rounded(g, 0, 15, Math.max(6, w * v), 6, 3, '#b1e9ce');
            g.circle(w * v, -18, 8);
            g.fillColor = color('#e1f8e9');
            g.fill();
            val.string = Math.round(v * 100) + '%';
        };
        const move = (e) => {
            const p = e.getUILocation(), local = track.getComponent(cc_1.UITransform).convertToNodeSpaceAR(new cc_1.Vec3(p.x, p.y));
            const v = Math.max(0, Math.min(1, local.x / w));
            draw(v);
            change(v);
            e.propagationStopped = true;
        };
        track.on(cc_1.Node.EventType.TOUCH_START, move);
        track.on(cc_1.Node.EventType.TOUCH_MOVE, move);
        draw(value);
    }
    exports_1("slider", slider);
    return {
        setters: [
            function (cc_1_1) {
                cc_1 = cc_1_1;
            },
            function (LabelClarity_js_1_1) {
                LabelClarity_js_1 = LabelClarity_js_1_1;
            }
        ],
        execute: function () {
            exports_1("palette", palette = {
                text: '#e0eee9', muted: '#96aebc', faint: '#688394', mint: '#b8f5d6',
                panel: '#142331', card: '#20313f', line: '#435764', gold: '#f2dea1',
            });
            /** A fixed header and a clipped native ScrollView; long menus work on short phones. */
            Panel = class Panel {
                constructor(parent, w, h, title, eyebrow, close) {
                    this.root = nodeAt(parent, 'Modal:' + title, 0, 0, w, h);
                    const veil = nodeAt(this.root, 'ModalBackdrop', 0, 0, w, h), vg = veil.addComponent(cc_1.Graphics);
                    rounded(vg, 0, 0, w, h, 0, '#040914dc');
                    veil.addComponent(cc_1.BlockInputEvents);
                    const pw = Math.min(382, w - 36), ph = Math.min(h - 70, 730), px = (w - pw) / 2, py = (h - ph) / 2;
                    const shell = card(this.root, 'Panel', px, py, pw, ph, '#132333', '#84adc04a', 22);
                    shell.addComponent(cc_1.BlockInputEvents);
                    text(shell, eyebrow, 22, 20, pw - 80, 20, { size: 8, color: '#8daab8', wrap: false });
                    text(shell, title, 22, 43, pw - 70, 37, { size: 23, bold: true });
                    if (close)
                        button(shell, 'close-panel', '×', pw - 51, 31, 30, 30, close, { size: 22, radius: 15 });
                    this.width = pw - 44;
                    this.viewportHeight = ph - 99;
                    const viewport = nodeAt(shell, 'Viewport', 22, 84, this.width, this.viewportHeight);
                    viewport.addComponent(cc_1.Mask).type = cc_1.Mask.Type.GRAPHICS_RECT;
                    this.body = nodeAt(viewport, 'Content', 0, 0, this.width, this.viewportHeight);
                    this.bodyTransform = this.body.getComponent(cc_1.UITransform);
                    this.scroll = viewport.addComponent(cc_1.ScrollView);
                    this.scroll.content = this.body;
                    this.scroll.horizontal = false;
                    this.scroll.vertical = true;
                    this.scroll.inertia = true;
                    this.scroll.elastic = true;
                    this.scroll.brake = .8;
                    this.scroll.cancelInnerEvents = true;
                }
                finish(height) { this.bodyTransform.setContentSize(this.width, Math.max(this.viewportHeight, height + 14)); this.scroll.scrollToTop(0); }
                destroy() { this.root.destroy(); }
            };
            exports_1("Panel", Panel);
        }
    };
});
