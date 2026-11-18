System.register(["cc"], function (exports_1, context_1) {
    "use strict";
    var cc_1, DRAW_LIMITS, TAU, RAD_TO_DEG, clamp01, RadialPaint, NativeDraw2D;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (cc_1_1) {
                cc_1 = cc_1_1;
            }
        ],
        execute: function () {
            exports_1("DRAW_LIMITS", DRAW_LIMITS = Object.freeze({ graphics: 384, sprites: 768, labels: 64, pointsPerGraphics: 4000 }));
            TAU = Math.PI * 2;
            RAD_TO_DEG = 180 / Math.PI;
            clamp01 = (n) => Math.max(0, Math.min(1, n));
            RadialPaint = class RadialPaint {
                constructor(x, y, inner, radius, matrix) {
                    this.x = x;
                    this.y = y;
                    this.inner = inner;
                    this.radius = radius;
                    this.matrix = matrix;
                    this.stops = [];
                }
                addColorStop(at, color) {
                    this.stops.push({ at: clamp01(at), color });
                    this.stops.sort((a, b) => a.at - b.at);
                }
            };
            exports_1("RadialPaint", RadialPaint);
            NativeDraw2D = class NativeDraw2D {
                constructor(parent) {
                    this.parent = parent;
                    this.state = this.freshState();
                    this.stack = [];
                    this.paths = [];
                    this.path = null;
                    this.graphicsPool = [];
                    this.spritesPool = [];
                    this.textPool = [];
                    this.graphicIndex = 0;
                    this.spriteIndex = 0;
                    this.textIndex = 0;
                    this.order = 0;
                    this.current = null;
                    this.currentVertices = 0;
                    this.droppedCommands = 0;
                    this.colorCache = new Map();
                    this.frames = new Map();
                    this.width = 420;
                    this.height = 840;
                }
                freshState() {
                    return { matrix: [1, 0, 0, 1, 0, 0], alpha: 1, fill: '#ffffff', stroke: '#ffffff',
                        lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', dash: [], composite: 'source-over',
                        font: '14px sans-serif', textAlign: 'left' };
                }
                get globalAlpha() { return this.state.alpha; }
                set globalAlpha(n) { this.state.alpha = clamp01(n); }
                get fillStyle() { return this.state.fill; }
                set fillStyle(value) { this.state.fill = value; }
                get strokeStyle() { return this.state.stroke; }
                set strokeStyle(value) { this.state.stroke = value; }
                get lineWidth() { return this.state.lineWidth; }
                set lineWidth(value) { this.state.lineWidth = Math.max(0.1, value); }
                get lineCap() { return this.state.lineCap; }
                set lineCap(value) { this.state.lineCap = value; }
                get lineJoin() { return this.state.lineJoin; }
                set lineJoin(value) { this.state.lineJoin = value; }
                get globalCompositeOperation() { return this.state.composite; }
                set globalCompositeOperation(value) { this.state.composite = value; }
                get font() { return this.state.font; }
                set font(value) { this.state.font = value; }
                get textAlign() { return this.state.textAlign; }
                set textAlign(value) { this.state.textAlign = value; }
                resize(width, height) {
                    this.width = width;
                    this.height = height;
                    for (const slot of this.graphicsPool)
                        slot.node.getComponent(cc_1.UITransform).setContentSize(width, height);
                }
                setFrame(name, frame) { this.frames.set(name, frame); }
                beginFrame() {
                    this.graphicIndex = this.spriteIndex = this.textIndex = this.order = 0;
                    this.current = null;
                    this.currentVertices = 0;
                    this.droppedCommands = 0;
                    this.state = this.freshState();
                    this.stack.length = 0;
                    this.beginPath();
                }
                endFrame() {
                    for (let i = this.graphicIndex; i < this.graphicsPool.length; i++)
                        this.graphicsPool[i].node.active = false;
                    for (let i = this.spriteIndex; i < this.spritesPool.length; i++)
                        this.spritesPool[i].node.active = false;
                    for (let i = this.textIndex; i < this.textPool.length; i++)
                        this.textPool[i].node.active = false;
                }
                get stats() {
                    return { graphics: this.graphicIndex, sprites: this.spriteIndex, labels: this.textIndex,
                        retainedNodes: this.graphicsPool.length + this.spritesPool.length + this.textPool.length,
                        nodeLimit: DRAW_LIMITS.graphics + DRAW_LIMITS.sprites + DRAW_LIMITS.labels, droppedCommands: this.droppedCommands };
                }
                destroy() {
                    for (const slot of [...this.graphicsPool, ...this.spritesPool, ...this.textPool])
                        slot.node.destroy();
                    this.graphicsPool = [];
                    this.spritesPool = [];
                    this.textPool = [];
                    this.frames.clear();
                }
                place(node) {
                    node.active = true;
                    if (node.getSiblingIndex() !== this.order)
                        node.setSiblingIndex(this.order);
                    this.order++;
                }
                makeNode(name) {
                    const node = new cc_1.Node(name);
                    node.layer = this.parent.layer;
                    this.parent.addChild(node);
                    node.addComponent(cc_1.UITransform);
                    return node;
                }
                blend(target, additive) {
                    // A separate material instance keeps additive trails independent of normal UI.
                    const material = target.getMaterialInstance(0);
                    if (material)
                        material.overridePipelineStates({ blendState: { targets: [{
                                        blend: true,
                                        // Builtin Graphics premultiplies RGB by alpha in its fragment shader.
                                        // Sprite textures keep straight alpha and need SRC_ALPHA blending.
                                        blendSrc: target instanceof cc_1.Graphics ? cc_1.gfx.BlendFactor.ONE : cc_1.gfx.BlendFactor.SRC_ALPHA,
                                        blendDst: additive ? cc_1.gfx.BlendFactor.ONE : cc_1.gfx.BlendFactor.ONE_MINUS_SRC_ALPHA,
                                        blendSrcAlpha: cc_1.gfx.BlendFactor.ONE,
                                        blendDstAlpha: cc_1.gfx.BlendFactor.ONE_MINUS_SRC_ALPHA,
                                    }] } });
                }
                graphic(pointCount = 0) {
                    if (this.current && (this.current.blend !== this.state.composite || this.currentVertices + pointCount > DRAW_LIMITS.pointsPerGraphics))
                        this.current = null;
                    if (!this.current) {
                        if (this.graphicIndex >= DRAW_LIMITS.graphics) {
                            this.droppedCommands++;
                            return null;
                        }
                        let slot = this.graphicsPool[this.graphicIndex];
                        if (!slot) {
                            const node = this.makeNode('Native paths');
                            const transform = node.getComponent(cc_1.UITransform);
                            transform.setAnchorPoint(0, 1);
                            transform.setContentSize(this.width, this.height);
                            slot = { node, graphic: node.addComponent(cc_1.Graphics), blend: '' };
                            this.graphicsPool.push(slot);
                        }
                        const reactivated = !slot.node.active;
                        this.graphicIndex++;
                        this.place(slot.node);
                        slot.graphic.clear();
                        if (reactivated || slot.blend !== this.state.composite) {
                            slot.blend = this.state.composite;
                            this.blend(slot.graphic, slot.blend === 'lighter');
                        }
                        this.current = slot;
                        this.currentVertices = 0;
                    }
                    this.currentVertices += pointCount;
                    return this.current.graphic;
                }
                rgba(value) {
                    let result = this.colorCache.get(value);
                    if (result)
                        return result;
                    if (value.startsWith('#')) {
                        let hex = value.slice(1);
                        if (hex.length === 3 || hex.length === 4)
                            hex = [...hex].map(x => x + x).join('');
                        result = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255];
                    }
                    else {
                        const match = value.match(/[\d.]+/g);
                        result = match ? [+match[0], +match[1], +match[2], match[3] == null ? 255 : +match[3] * 255] : [255, 255, 255, 255];
                    }
                    if (this.colorCache.size > 512)
                        this.colorCache.clear();
                    this.colorCache.set(value, result);
                    return result;
                }
                color(value, alpha = this.state.alpha) {
                    const c = this.rgba(typeof value === 'string' ? value : value.stops[0]?.color || '#ffffff');
                    return new cc_1.Color(c[0], c[1], c[2], Math.round(c[3] * clamp01(alpha)));
                }
                point(x, y, m = this.state.matrix) {
                    return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
                }
                save() { this.stack.push({ ...this.state, matrix: [...this.state.matrix], dash: [...this.state.dash] }); }
                restore() { const state = this.stack.pop(); if (state)
                    this.state = state; }
                translate(x, y) {
                    const m = this.state.matrix;
                    m[4] += m[0] * x + m[2] * y;
                    m[5] += m[1] * x + m[3] * y;
                }
                rotate(a) {
                    const m = this.state.matrix, c = Math.cos(a), s = Math.sin(a);
                    const [a0, a1, a2, a3] = m;
                    m[0] = a0 * c + a2 * s;
                    m[1] = a1 * c + a3 * s;
                    m[2] = a2 * c - a0 * s;
                    m[3] = a3 * c - a1 * s;
                }
                scale(x, y) { const m = this.state.matrix; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; }
                setLineDash(value) { this.state.dash = value; }
                beginPath() { this.paths = []; this.path = null; }
                moveTo(x, y) {
                    this.path = { points: [this.point(x, y)], closed: false };
                    this.paths.push(this.path);
                }
                lineTo(x, y) { if (!this.path)
                    this.moveTo(x, y);
                else
                    this.path.points.push(this.point(x, y)); }
                closePath() { if (this.path)
                    this.path.closed = true; }
                arc(x, y, radius, start, end, anticlockwise = false) {
                    this.ellipse(x, y, radius, radius, 0, start, end, anticlockwise);
                }
                ellipse(x, y, rx, ry, rotation, start, end, anticlockwise = false) {
                    rx = Math.max(0, rx);
                    ry = Math.max(0, ry);
                    let span = end - start;
                    if (Math.abs(span) >= TAU)
                        span = anticlockwise ? -TAU : TAU;
                    else if (!anticlockwise && span < 0)
                        span += TAU;
                    else if (anticlockwise && span > 0)
                        span -= TAU;
                    const points = Math.max(3, Math.min(128, Math.ceil(Math.abs(span) * Math.sqrt(Math.max(1, rx, ry)) * .85)));
                    const cos = Math.cos(rotation), sin = Math.sin(rotation);
                    for (let i = 0; i <= points; i++) {
                        const a = start + span * i / points, px = Math.cos(a) * rx, py = Math.sin(a) * ry;
                        this.lineTo(x + px * cos - py * sin, y + px * sin + py * cos);
                    }
                }
                roundRect(x, y, width, height, radius) {
                    const r = Math.min(radius, width / 2, height / 2);
                    this.moveTo(x + r, y);
                    this.lineTo(x + width - r, y);
                    this.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
                    this.lineTo(x + width, y + height - r);
                    this.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
                    this.lineTo(x + r, y + height);
                    this.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
                    this.lineTo(x, y + r);
                    this.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
                    this.closePath();
                }
                drawPaths(g, dashed) {
                    for (const path of this.paths) {
                        if (!path.points.length)
                            continue;
                        if (dashed && this.state.dash.length) {
                            const pts = path.closed ? [...path.points, path.points[0]] : path.points;
                            let dash = 0, remaining = Math.max(.1, this.state.dash[0]), on = true;
                            for (let i = 1; i < pts.length; i++) {
                                const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
                                let used = 0;
                                while (used < length - .0001) {
                                    const step = Math.min(remaining, length - used);
                                    if (on) {
                                        g.moveTo(a.x + dx * used / length, -(a.y + dy * used / length));
                                        g.lineTo(a.x + dx * (used + step) / length, -(a.y + dy * (used + step) / length));
                                    }
                                    used += step;
                                    remaining -= step;
                                    if (remaining < .0001) {
                                        dash = (dash + 1) % this.state.dash.length;
                                        remaining = Math.max(.1, this.state.dash[dash]);
                                        on = !on;
                                    }
                                }
                            }
                        }
                        else {
                            const first = path.points[0];
                            g.moveTo(first.x, -first.y);
                            for (let i = 1; i < path.points.length; i++)
                                g.lineTo(path.points[i].x, -path.points[i].y);
                            if (path.closed)
                                g.close();
                        }
                    }
                }
                stroke() {
                    if (this.state.alpha <= 0 || !this.paths.length)
                        return;
                    const g = this.graphic(this.paths.reduce((n, p) => n + p.points.length, 0));
                    if (!g)
                        return;
                    const m = this.state.matrix;
                    g.lineWidth = this.state.lineWidth * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
                    g.lineCap = this.state.lineCap === 'round' ? cc_1.Graphics.LineCap.ROUND : cc_1.Graphics.LineCap.BUTT;
                    g.lineJoin = this.state.lineJoin === 'round' ? cc_1.Graphics.LineJoin.ROUND : cc_1.Graphics.LineJoin.MITER;
                    g.strokeColor = this.color(this.state.stroke);
                    this.drawPaths(g, true);
                    g.stroke();
                }
                fill() {
                    if (this.state.alpha <= 0 || !this.paths.length)
                        return;
                    if (this.state.fill instanceof RadialPaint) {
                        this.fillRadial(this.state.fill);
                        return;
                    }
                    const g = this.graphic(this.paths.reduce((n, p) => n + p.points.length, 0));
                    if (!g)
                        return;
                    g.fillColor = this.color(this.state.fill);
                    this.drawPaths(g, false);
                    g.fill();
                }
                fillRect(x, y, width, height) {
                    const oldPaths = this.paths, oldPath = this.path;
                    this.beginPath();
                    this.moveTo(x, y);
                    this.lineTo(x + width, y);
                    this.lineTo(x + width, y + height);
                    this.lineTo(x, y + height);
                    this.closePath();
                    this.fill();
                    this.paths = oldPaths;
                    this.path = oldPath;
                }
                createRadialGradient(x0, y0, r0, x1, y1, radius) {
                    return new RadialPaint(x1, y1, r0, radius, [...this.state.matrix]);
                }
                fillRadial(paint) {
                    // Runtime radial effects are concentric rings; all backdrop gradients are
                    // baked from the original artwork. Ring bands avoid repeated alpha overlap.
                    if (!paint.stops.length)
                        return;
                    const g = this.graphic(1800), point = this.point(paint.x, paint.y, paint.matrix);
                    if (!g)
                        return;
                    const scale = Math.sqrt(Math.abs(paint.matrix[0] * paint.matrix[3] - paint.matrix[1] * paint.matrix[2]));
                    const rings = 24, step = paint.radius * scale / rings;
                    for (let i = 0; i < rings; i++) {
                        const at = i / (rings - 1);
                        let left = paint.stops[0], right = paint.stops[paint.stops.length - 1];
                        for (let j = 1; j < paint.stops.length; j++)
                            if (paint.stops[j].at >= at) {
                                left = paint.stops[j - 1];
                                right = paint.stops[j];
                                break;
                            }
                        const fraction = clamp01((at - left.at) / Math.max(.001, right.at - left.at));
                        const a = this.rgba(left.color), b = this.rgba(right.color);
                        const color = new cc_1.Color(a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction, a[2] + (b[2] - a[2]) * fraction, (a[3] + (b[3] - a[3]) * fraction) * this.state.alpha);
                        if (!i) {
                            g.fillColor = color;
                            g.circle(point.x, -point.y, step);
                            g.fill();
                        }
                        else {
                            g.strokeColor = color;
                            g.lineWidth = step * 1.04;
                            g.circle(point.x, -point.y, (i + .5) * step);
                            g.stroke();
                        }
                    }
                }
                drawImage(name, x, y, width, height) {
                    const frame = this.frames.get(name);
                    if (!frame || this.state.alpha <= 0)
                        return;
                    if (this.spriteIndex >= DRAW_LIMITS.sprites) {
                        this.droppedCommands++;
                        return;
                    }
                    this.current = null;
                    let slot = this.spritesPool[this.spriteIndex];
                    if (!slot) {
                        const node = this.makeNode('Artwork');
                        const sprite = node.addComponent(cc_1.Sprite);
                        sprite.type = cc_1.Sprite.Type.SIMPLE;
                        sprite.sizeMode = cc_1.Sprite.SizeMode.CUSTOM;
                        sprite.trim = false;
                        slot = { node, sprite, transform: node.getComponent(cc_1.UITransform), blend: '' };
                        this.spritesPool.push(slot);
                    }
                    const reactivated = !slot.node.active;
                    this.spriteIndex++;
                    this.place(slot.node);
                    if (slot.sprite.spriteFrame !== frame)
                        slot.sprite.spriteFrame = frame;
                    const m = this.state.matrix, p = this.point(x + width / 2, y + height / 2);
                    const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
                    slot.node.setPosition(p.x, -p.y, 0);
                    slot.node.angle = -Math.atan2(m[1], m[0]) * RAD_TO_DEG;
                    slot.transform.setContentSize(Math.abs(width) * sx, Math.abs(height) * sy);
                    slot.sprite.color = new cc_1.Color(255, 255, 255, Math.round(this.state.alpha * 255));
                    if (reactivated || slot.blend !== this.state.composite) {
                        slot.blend = this.state.composite;
                        this.blend(slot.sprite, slot.blend === 'lighter');
                    }
                }
                fillText(text, x, y) {
                    if (this.state.alpha <= 0)
                        return;
                    if (this.textIndex >= DRAW_LIMITS.labels) {
                        this.droppedCommands++;
                        return;
                    }
                    this.current = null;
                    let slot = this.textPool[this.textIndex];
                    if (!slot) {
                        const node = this.makeNode('Combat label'), label = node.addComponent(cc_1.Label);
                        label.useSystemFont = true;
                        label.fontFamily = 'sans-serif';
                        label.overflow = cc_1.Label.Overflow.NONE;
                        slot = { node, label, transform: node.getComponent(cc_1.UITransform) };
                        this.textPool.push(slot);
                    }
                    this.textIndex++;
                    this.place(slot.node);
                    const m = this.state.matrix, p = this.point(x, y), size = Number(this.state.font.match(/([\d.]+)px/)?.[1]) || 14;
                    const label = slot.label;
                    label.string = String(text);
                    label.fontSize = size;
                    label.lineHeight = size * 1.25;
                    label.isBold = /bold|[6-9]00/.test(this.state.font);
                    label.color = this.color(this.state.fill);
                    slot.transform.setAnchorPoint(this.state.textAlign === 'center' ? .5 : this.state.textAlign === 'right' ? 1 : 0, .5);
                    slot.node.setPosition(p.x, -p.y + size * .32, 0);
                    slot.node.angle = -Math.atan2(m[1], m[0]) * RAD_TO_DEG;
                    slot.node.setScale(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]), 1);
                }
            };
            exports_1("NativeDraw2D", NativeDraw2D);
        }
    };
});
