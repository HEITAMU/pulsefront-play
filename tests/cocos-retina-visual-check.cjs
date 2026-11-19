// Real WebKit visual regression capture. Run in the existing Playwright + Mesa CI.
// Input uses page.mouse only; evaluate callbacks read runtime/scene diagnostics.
// No private game action is called, no save or gameplay state is injected.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { performance } = require('node:perf_hooks');
const { webkit } = require('playwright');
const root = path.resolve(process.env.COCOS_PREVIEW_DIR || (fs.existsSync('cocos-preview') ? 'cocos-preview' : 'pulsefront-cocos-preview'));
const output = path.resolve(process.env.COCOS_QA_OUTPUT || 'browser-check-results');
const viewport = { width: 390, height: 844 }, dpr = 3;
const requireArrows = process.env.REQUIRE_NAVIGATION_ARROWS !== '0';
// Cocos 3.8.8's official Web backend caps its device DPR at 2. Screenshots are
// still full device DPR3; record that distinction rather than claiming 3x canvas.
const minimumBackingRatio = Number(process.env.MIN_BACKING_RATIO || '1.9');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.scene': 'application/json', '.png': 'image/png' };
const evidence = { browser: 'Playwright WebKit on Ubuntu with Mesa rendering', viewport, requestedDpr: dpr,
  inputMethod: 'Mouse press/move/release through the real canvas input path; no private game actions',
  screenshotScale: 'device; 1170 x 2532 pixels; no resize', webCanvasExpectedDpr: 2,
  logs: [], errors: [], requests: [], captures: [] };
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + name, name.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
  });
});
let browser, page;
const snapshot = () => page.evaluate(() => window.pulsefront?.snapshot?.());
async function nativePoint(name, scope = null) {
  // Project actual native UI bounds through its rendering camera. Canvas backing
  // dimensions may differ from CSS size and the engine's logical screen DPR.
  return page.evaluate(({ name, scope }) => {
    const cc = window.cc, scene = cc.director.getScene();
    const walk = n => [n, ...n.children.flatMap(walk)];
    const nodes = walk(scene), canvasNode = nodes.find(n => n.name === 'Canvas');
    const start = scope ? nodes.find(n => n.name === scope && n.activeInHierarchy) : scene;
    if (!start) throw new Error('Native scope missing: ' + scope);
    const node = walk(start).find(n => n.name === name && n.activeInHierarchy);
    if (!node) throw new Error('Native node missing: ' + name);
    const transform = node.getComponent(cc.UITransform);
    const rect = transform.getBoundingBoxToWorld();
    const camera = canvasNode.getComponent(cc.Canvas).cameraComponent;
    const point = camera.worldToScreen(new cc.Vec3(rect.x + rect.width / 2, rect.y + rect.height / 2, 0));
    const canvas = document.getElementById('GameCanvas'), box = canvas.getBoundingClientRect();
    const size = camera.camera;
    return { x: box.left + point.x / size.width * box.width, y: box.top + (1 - point.y / size.height) * box.height,
      node: name, worldBounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, camera: { width: size.width, height: size.height } };
  }, { name, scope });
}
async function clickNative(name, scope = null) { const p = await nativePoint(name, scope); await page.mouse.click(p.x, p.y); return p; }
async function readMetrics() {
  return page.evaluate(() => {
    const cc = window.cc, canvas = document.getElementById('GameCanvas'), rect = canvas.getBoundingClientRect();
    const walk = n => [n, ...n.children.flatMap(walk)], scene = cc.director.getScene();
    const nodes = walk(scene), home = nodes.find(n => n.name === 'Home' && n.activeInHierarchy);
    const labels = nodes.filter(n => n.activeInHierarchy).map(n => n.getComponent(cc.Label)).filter(Boolean).map(l => {
      // These fields are read-only diagnostic observations of Cocos 3.8.8's TTF
      // assembler. Nothing in the engine or game's render state is changed.
      const data = l._assemblerData, frame = l._ttfSpriteFrame, world = l.node.worldScale;
      return { text: l.string, parent: l.node.parent?.name, horizontalAlign: l.horizontalAlign, verticalAlign: l.verticalAlign, fontSize: l.fontSize, actualFontSize: l.actualFontSize,
        lineHeight: l.lineHeight, fontFamily: l.fontFamily, worldScale: { x: world.x, y: world.y },
        ttfCanvas: data?.canvas ? { width: data.canvas.width, height: data.canvas.height } : null,
        texture: frame?.texture ? { width: frame.texture.width, height: frame.texture.height } : null };
    });
    const entries = ['start', 'map', 'support', 'growth', 'hangar', 'music'];
    const arrows = home ? entries.map(id => {
      const button = walk(home).find(n => n.name === id && n.activeInHierarchy);
      const arrows = button ? walk(button).filter(n => n.name === 'NavigationArrow' && n.activeInHierarchy) : [];
      return { id, buttonFound: !!button, arrowCount: arrows.length, graphicsCount: arrows.filter(n => !!n.getComponent(cc.Graphics)).length };
    }) : [];
    return { version: window.pulsefront?.version, devicePixelRatio: window.devicePixelRatio,
      canvas: { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height,
        backingRatioX: canvas.width / rect.width, backingRatioY: canvas.height / rect.height },
      engineScreen: { devicePixelRatio: cc.screen?.devicePixelRatio, resolutionScale: cc.screen?.resolutionScale,
        windowSize: cc.screen?.windowSize, resolution: cc.screen?.resolution },
      designResolution: cc.view.getDesignResolutionSize(), visibleSize: cc.view.getVisibleSize(), arrows, labels, arrowNodes: nodes.filter(n => /NavigationArrow|CannonDirectionArrows|CannonSwipeLeft|CannonSwipeRight/.test(n.name)).map(n => n.name) };
  });
}
async function capture(name, inputStart, inputEvent = 'press') {
  const requestedAt = performance.now();
  await page.screenshot({ path: path.join(output, name + '.png'), scale: 'device', fullPage: false });
  const completedAt = performance.now();
  const png = fs.readFileSync(path.join(output, name + '.png'));
  const pixels = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  if (pixels.width !== page.viewportSize().width * dpr || pixels.height !== page.viewportSize().height * dpr) throw new Error('Screenshot was not captured at full DPR: ' + JSON.stringify(pixels));
  const entry = { name, pixels, inputEvent: inputStart == null ? null : inputEvent,
    screenshotRequestedMsAfterInput: inputStart == null ? null : requestedAt - inputStart,
    screenshotCompletedMsAfterInput: inputStart == null ? null : completedAt - inputStart,
    state: await snapshot(), metrics: await readMetrics() };
  evidence.captures.push(entry); return entry;
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    browser = await webkit.launch({ headless: false });
    page = await browser.newPage({ viewport, deviceScaleFactor: dpr, isMobile: true, hasTouch: true,
      ...(process.env.COCOS_QA_VIDEO === '0' ? {} : { recordVideo: { dir: path.join(output, 'video'), size: viewport } }) });
    page.on('console', m => evidence.logs.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', e => evidence.errors.push(e.stack || String(e)));
    page.on('requestfailed', req => evidence.requests.push({ url: req.url(), failure: req.failure() }));
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__smokeReady || window.__smokeErrors?.length, undefined, { timeout: 45000 });
    evidence.startup = await page.evaluate(() => ({ ready: window.__smokeReady, stage: window.__smokeStage, errors: window.__smokeErrors }));
    if (!evidence.startup.ready || evidence.startup.errors?.length) throw new Error('Startup failed: ' + JSON.stringify(evidence.startup));
    await page.waitForTimeout(500);
    const home = await capture('home-dpr3');
    evidence.homeArrows = home.metrics.arrows;
    if (requireArrows && (home.metrics.arrows.length !== 6 || home.metrics.arrows.some(a => !a.buttonFound || a.arrowCount !== 1 || a.graphicsCount !== 1)))
      throw new Error('Home must have one independent native NavigationArrow per entry: ' + JSON.stringify(home.metrics.arrows));
    const backing = home.metrics.canvas;
    if (home.metrics.devicePixelRatio !== dpr || backing.backingRatioX < minimumBackingRatio || backing.backingRatioY < minimumBackingRatio)
      throw new Error('Retina backing resolution is below target: ' + JSON.stringify(home.metrics));
    if (process.env.COCOS_QA_MENU_CAPTURE === '1') {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.waitForTimeout(400); await capture('home-compact-dpr3');
      await page.setViewportSize(viewport); await page.waitForTimeout(400);
      for (const entry of ['map', 'support', 'growth', 'hangar', 'music']) {
        await clickNative(entry, 'Home');
        await page.waitForFunction(() => !!window.pulsefront.snapshot().panel);
        await page.waitForTimeout(200); await capture('menu-' + entry + '-dpr3');
        if (entry === 'support') {
          const first = await page.evaluate(() => {
            const cc = window.cc, walk = n => [n, ...n.children.flatMap(walk)];
            return walk(cc.director.getScene()).find(n => n.activeInHierarchy && n.name.startsWith('support-') && n.getComponent(cc.UITransform)?.width < 200)?.name;
          });
          if (!first) throw new Error('No visible support card');
          await clickNative(first); await page.waitForTimeout(250); await capture('menu-support-detail-dpr3');
          await clickNative('close-panel'); await page.waitForTimeout(250);
        }
        await clickNative('close-panel');
        await page.waitForFunction(() => !window.pulsefront.snapshot().panel);
        await page.waitForTimeout(150);
      }
    }
    evidence.startClick = await clickNative('start', 'Home');
    await page.waitForFunction(() => window.pulsefront.snapshot().mode === 'playing' || !!window.pulsefront.snapshot().panel);
    if ((await snapshot()).mode !== 'playing') { await capture('briefing-dpr3'); evidence.briefingClick = await clickNative('briefing-go'); }
    await page.waitForFunction(() => window.pulsefront.snapshot().mode === 'playing');
    await page.waitForTimeout(200);
    await capture('cannon-idle-dpr3');
    const fire = await nativePoint('CannonVisual'); evidence.cannonPoint = fire;
    await page.mouse.move(fire.x, fire.y); const pressStart = performance.now(); await page.mouse.down();
    // Capture immediately, with no artificial delay. Timings are recorded because
    // software-rendered CI may finish a screenshot after the first recoil frames.
    const initial = await capture('cannon-press-initial-dpr3', pressStart);
    if (!initial.state.held) throw new Error('The real mouse press did not enter held state');
    await page.waitForTimeout(Math.max(0, 450 - (performance.now() - pressStart)));
    const held = await capture('cannon-held-dpr3', pressStart);
    if (!held.state.held) throw new Error('Held feedback ended before mouse release');
    await page.mouse.up();
    await capture('cannon-release-initial-dpr3', performance.now(), 'release');
    await page.waitForTimeout(260); const released = await capture('cannon-release-settled-dpr3');
    if (released.state.held) throw new Error('Mouse release left the cannon held');
    // The initial press is one tutorial tap. Two further real taps enter its
    // horizontal sway step; capture its text instruction and the held state.
    for (let i = 0; i < 2; i++) { await page.mouse.click(fire.x, fire.y, { delay: 80 }); await page.waitForTimeout(120); }
    await page.waitForFunction(() => window.pulsefront.snapshot().lesson >= 1);
    await capture('tutorial-horizontal-hint-dpr3');
    await page.mouse.move(fire.x, fire.y); await page.mouse.down(); await page.waitForTimeout(400);
    await page.mouse.move(fire.x - 58, fire.y - 8, { steps: 10 });
    await page.mouse.move(fire.x + 58, fire.y - 8, { steps: 16 });
    await capture('cannon-right-direction-dpr3');
    await page.mouse.up(); await page.waitForFunction(() => !window.pulsefront.snapshot().held);
    evidence.final = await page.evaluate(() => ({ state: window.pulsefront.snapshot(), errors: window.__smokeErrors }));
    if (evidence.errors.length || evidence.final.errors.length || evidence.requests.length) throw new Error('Browser errors occurred during visual checks');
    console.log('DPR3 Cocos visual flow passed');
  } catch (error) {
    evidence.failure = error.stack || String(error); console.error(evidence.failure); process.exitCode = 1;
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), scale: 'device', timeout: 3000 }).catch(() => {});
  } finally {
    const video = page?.video();
    if (browser) await browser.close();
    if (video) {
      const videoPath = await video.path();
      evidence.video = { path: path.relative(output, videoPath), width: viewport.width, height: viewport.height,
        note: 'Motion evidence at CSS viewport resolution; PNG screenshots retain device DPR3.' };
    }
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ startup: evidence.startup, homeArrows: evidence.homeArrows,
      captures: evidence.captures.map(c => ({ name: c.name, held: c.state?.held, pixels: c.pixels, canvas: c.metrics.canvas })),
      errors: evidence.errors, failure: evidence.failure, video: evidence.video }, null, 2));
    await new Promise(resolve => server.close(resolve));
  }
})();
