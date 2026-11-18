System.register(["cc"], function (exports_1, context_1) {
    "use strict";
    var cc_1, configured, densityFrame, densityRaw, densityCache;
    var __moduleName = context_1 && context_1.id;
    /** Report device and engine density separately: Creator 3.8.8 Web caps DPR at 2. */
    function displayDensity() {
        const scope = globalThis;
        const raw = Number(scope.devicePixelRatio || scope.window?.devicePixelRatio) || 0;
        const frame = cc_1.director.getTotalFrames(), viewScaleX = cc_1.view.getScaleX(), viewScaleY = cc_1.view.getScaleY();
        if (densityCache && frame === densityFrame && raw === densityRaw && viewScaleX === densityCache.viewScaleX && viewScaleY === densityCache.viewScaleY)
            return densityCache;
        const engineDpr = Math.max(1, Number(cc_1.screen.devicePixelRatio) || 1);
        const deviceDpr = Math.max(1, raw || engineDpr);
        densityFrame = frame;
        densityRaw = raw;
        return densityCache = { deviceDpr, engineDpr, viewScaleX, viewScaleY };
    }
    exports_1("displayDensity", displayDensity);
    /**
     * Rasterize system-font Labels at sufficient density without changing layout.
     * The 3.8.8 TTF assembler caps enlarged fonts below 100 logical pixels at a
     * 100-pixel raster font. An explicitly larger font, box and line height plus
     * reciprocal Node scale avoids that cap using public APIs on Web and WeChat.
     * The Web framebuffer keeps the official DPR policy; this improves text
     * textures and does not claim to turn a DPR-2 framebuffer into DPR 3.
     */
    function configureLabelClarity(label, options) {
        const fontSize = Math.max(1, options.fontSize);
        const { deviceDpr, engineDpr, viewScaleX } = displayDensity();
        const engineFontScale = Math.max(1, Math.abs(viewScaleX));
        let rasterScale = Math.max(1, Math.min(2, deviceDpr / engineDpr));
        const plannedFont = fontSize * rasterScale;
        if (plannedFont < 100 && plannedFont * engineFontScale > 100) {
            rasterScale = 100 / fontSize;
        }
        // Keep the authored (pre-view-scale) canvas box within the engine's 2048 cap.
        // The assembler can then reduce its own view scale for unusually wide text.
        if (options.width && options.width > 0)
            rasterScale = Math.min(rasterScale, Math.max(1, 2048 / options.width));
        if (options.height && options.height > 0)
            rasterScale = Math.min(rasterScale, Math.max(1, 2048 / options.height));
        const rasterFont = fontSize * rasterScale;
        label.fontSize = Math.abs(rasterFont - 100) < 0.000001 ? 100 : rasterFont;
        label.lineHeight = options.lineHeight * rasterScale;
        if (options.width !== undefined && options.height !== undefined) {
            label.node.getComponent(cc_1.UITransform).setContentSize(options.width * rasterScale, options.height * rasterScale);
        }
        label.node.setScale((options.scaleX ?? 1) / rasterScale, (options.scaleY ?? 1) / rasterScale, 1);
        configured.set(label, { ...options, fontSize, rasterScale });
    }
    exports_1("configureLabelClarity", configureLabelClarity);
    /** Read-only, public-API metrics for the DPR-3 visual check. */
    function labelClarityDiagnostics(label) {
        const config = configured.get(label);
        const size = label.node.getComponent(cc_1.UITransform)?.contentSize;
        return {
            text: label.string,
            authoredFontSize: config?.fontSize ?? label.fontSize,
            rasterScale: config?.rasterScale ?? 1,
            configuredFontSize: label.fontSize,
            actualRasterFontSize: label.actualFontSize,
            lineHeight: label.lineHeight,
            nodeScaleX: label.node.scale.x,
            nodeScaleY: label.node.scale.y,
            contentWidth: size?.width ?? 0,
            contentHeight: size?.height ?? 0,
            ...displayDensity(),
        };
    }
    exports_1("labelClarityDiagnostics", labelClarityDiagnostics);
    return {
        setters: [
            function (cc_1_1) {
                cc_1 = cc_1_1;
            }
        ],
        execute: function () {
            configured = new WeakMap();
            densityFrame = -1;
            densityRaw = 0;
            densityCache = null;
        }
    };
});
