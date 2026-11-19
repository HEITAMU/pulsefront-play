// Real WebKit + official Cocos runtime verification. Test-only observation wrappers
// count work and read clocks; no save edits, private actions, or battle mutations.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { performance } = require('node:perf_hooks');
const { webkit } = require('playwright');

const root = path.resolve(process.env.COCOS_PREVIEW_DIR || (fs.existsSync('cocos-preview') ? 'cocos-preview' : 'pulsefront-cocos-preview'));
const output = path.resolve(process.env.COCOS_QA_OUTPUT || 'browser-performance-audio-results');
const strictSync = process.env.COCOS_QA_ASSERT_SYNC !== '0';
const viewport = { width: 390, height: 844 }, dpr = 3;
const evidence = {
  environment: 'Playwright 1.62.1 WebKit / Linux / Mesa software rendering',
  actualPhoneOrWechat: false,
  viewport, deviceDpr: dpr, expectedCanvasDpr: 2, strictSync,
  input: 'Real canvas mouse events only. No stored progress changes or direct game actions.',
  instrumentation: 'Test-only wrappers invoke original app.update, Graphics.clear, Canvas2D.fillText and Soundtrack.note unchanged; a separate requestAnimationFrame observer records frame intervals.',
  limitations: [
    'Linux software-rendered frame timing is not phone frame-rate evidence.',
    'AudioContext state, gain and scheduled note calls do not constitute listening to physical audio output.',
    'This test does not execute WeChat Developer Tools or WeChat subpackage downloads.',
  ],
  logs: [], errors: [], failedRequests: [], samples: [], captures: [], flow: [],
};
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.scene': 'application/json', '.png': 'image/png' };
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
const quantile = (values, q) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
};
const distribution = values => ({ count: values.length,
  mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
  p50: quantile(values, .5), p95: quantile(values, .95), p99: quantile(values, .99),
  max: values.length ? Math.max(...values) : null });

async function nativePoint(name, scope = null) {
  return page.evaluate(({ name, scope }) => {
    const cc = window.cc, walk = n => [n, ...n.children.flatMap(walk)];
    const scene = cc.director.getScene(), nodes = walk(scene);
    const start = scope ? nodes.find(n => n.name === scope && n.activeInHierarchy) : scene;
    const node = start && walk(start).find(n => n.name === name && n.activeInHierarchy);
    if (!node) throw new Error('Native node not visible: ' + name);
    const rect = node.getComponent(cc.UITransform).getBoundingBoxToWorld();
    const camera = nodes.find(n => n.name === 'Canvas').getComponent(cc.Canvas).cameraComponent;
    const p = camera.worldToScreen(new cc.Vec3(rect.x + rect.width / 2, rect.y + rect.height / 2, 0));
    const box = document.getElementById('GameCanvas').getBoundingClientRect();
    return { x: box.left + p.x / camera.camera.width * box.width,
      y: box.top + (1 - p.y / camera.camera.height) * box.height };
  }, { name, scope });
}
async function clickNative(name, scope) {
  const p = await nativePoint(name, scope); await page.mouse.click(p.x, p.y); return p;
}
const state = () => page.evaluate(() => window.__qaProbe.read());

async function installObservers() {
  await page.evaluate(() => {
    const cc = window.cc, walk = n => [n, ...n.children.flatMap(walk)];
    const scene = cc.director.getScene();
    const app = walk(scene).flatMap(n => n.getComponents(cc.Component)).find(c =>
      c.constructor.name === 'Pulsefront' || (c.audio && c.renderer && typeof c.update === 'function' && c.mode));
    if (!app) throw new Error('Pulsefront component was not found for read-only measurement');
    const counters = { frames: 0, graphicsClears: 0, labelRasterCalls: 0, notes: 0,
      totalNotes: 0, lastNoteAt: null, lastNoteObservedContextTime: null,
      clearsByNode: {}, updateMs: [], rafMs: [], rawDt: [], maxEnemies: 0 };
    const flags = { collecting: false, fillTextAvailable: false };
    const eligible = () => flags.collecting && app.mode === 'playing' && !app.lesson && !!app.battle;
    const previousUpdate = app.update;
    app.update = function (...args) {
      const collect = eligible(), before = performance.now();
      try { return previousUpdate.apply(this, args); }
      finally {
        if (collect) {
          counters.frames++; counters.updateMs.push(performance.now() - before);
          counters.rawDt.push(args[0]); counters.maxEnemies = Math.max(counters.maxEnemies, app.battle?.enemies.length || 0);
        }
      }
    };
    const previousClear = cc.Graphics.prototype.clear;
    cc.Graphics.prototype.clear = function (...args) {
      if (eligible()) {
        counters.graphicsClears++;
        const name = String(this.node?.name || '<unnamed>').replace(/\d+$/, '#');
        counters.clearsByNode[name] = (counters.clearsByNode[name] || 0) + 1;
      }
      return previousClear.apply(this, args);
    };
    if (window.CanvasRenderingContext2D?.prototype.fillText) {
      const previousFillText = window.CanvasRenderingContext2D.prototype.fillText;
      window.CanvasRenderingContext2D.prototype.fillText = function (...args) {
        if (eligible()) counters.labelRasterCalls++;
        return previousFillText.apply(this, args);
      };
      flags.fillTextAvailable = true;
    }
    const previousNote = app.audio.note;
    app.audio.note = function (event, at) {
      counters.totalNotes++;
      if (eligible()) counters.notes++;
      counters.lastNoteAt = at;
      counters.lastNoteObservedContextTime = this.ctx?.currentTime ?? null;
      return previousNote.call(this, event, at);
    };
    let lastRaf = null;
    const observeFrame = timestamp => {
      if (eligible()) {
        if (lastRaf !== null) counters.rafMs.push(timestamp - lastRaf);
        lastRaf = timestamp;
      } else lastRaf = null;
      requestAnimationFrame(observeFrame);
    };
    requestAnimationFrame(observeFrame);
    window.__qaProbe = {
      counters, flags,
      begin() { flags.collecting = true; },
      end() { flags.collecting = false; },
      read() {
        const s = window.pulsefront.snapshot(), b = app.battle, a = app.audio;
        const position = a.position(app.musicElapsed), duration = b?.c.duration ?? a.track?.duration ?? null;
        return { ...s, duration, beat: b?.beatDuration ?? a.track?.beat ?? null,
          clearing: !!b?.clearing, remaining: b ? duration - b.t : null,
          audio: { ...s.audio, position, contextTime: a.ctx?.currentTime ?? null,
            gain: a.music?.gain.value ?? null, masterGain: a.master?.gain.value ?? null,
            level: a.musicLevel(position), trackDuration: a.track?.duration ?? null,
            notes: counters.notes, totalNotes: counters.totalNotes,
            lastNoteAt: counters.lastNoteAt, lastNoteObservedContextTime: counters.lastNoteObservedContextTime,
            activeVoices: a.nodes?.size ?? null },
          measuredFrames: counters.frames, graphicsClears: counters.graphicsClears,
          wallMs: performance.now() };
      },
      visual() {
        const nodes = walk(cc.director.getScene()), home = nodes.find(n => n.name === 'Home');
        const arrows = ['start', 'map', 'support', 'growth', 'hangar', 'music'].map(name => {
          const n = home && walk(home).find(n => n.name === name);
          return { name, count: n ? walk(n).filter(a => a.name === 'NavigationArrow' && a.getComponent(cc.Graphics)).length : 0 };
        });
        const canvas = document.getElementById('GameCanvas'), box = canvas.getBoundingClientRect();
        const title = nodes.map(n => n.getComponent(cc.Label)).find(l => l?.string === '脉冲');
        return { version: window.pulsefront.version, arrows, deviceDpr: devicePixelRatio,
          canvas: { width: canvas.width, height: canvas.height, cssWidth: box.width, cssHeight: box.height },
          title: title ? { configuredFontSize: title.fontSize, actualFontSize: title.actualFontSize,
            texture: title._ttfSpriteFrame?.texture ? [title._ttfSpriteFrame.texture.width, title._ttfSpriteFrame.texture.height] : null } : null,
          cannonNodes: nodes.filter(n => /^Cannon/.test(n.name)).map(n => ({ name: n.name, active: n.activeInHierarchy })) };
      },
    };
  });
}

async function capture(name) {
  await page.screenshot({ path: path.join(output, name + '.png'), scale: 'device', fullPage: false });
  const bytes = fs.readFileSync(path.join(output, name + '.png'));
  const dimensions = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (dimensions[0] !== viewport.width * dpr || dimensions[1] !== viewport.height * dpr) throw new Error('Incorrect screenshot density');
  evidence.captures.push({ name, dimensions, state: await state(), visual: await page.evaluate(() => window.__qaProbe.visual()) });
}

async function awaitNewBeat(previousBeat, timeout = 2500) {
  await page.waitForFunction(previous => {
    const s = window.__qaProbe.read();
    if (s.mode !== 'playing' || s.state !== 'playing') return true;
    const number = Math.round(s.audio.position / s.beat), offset = s.audio.position - number * s.beat;
    // Aim slightly before the beat to leave room for the normal automation
    // transport latency. The game itself decides whether the input is perfect.
    return number > previous && offset >= -.085 && offset <= .025;
  }, previousBeat, { polling: 'raf', timeout });
  const s = await state(); return { s, number: Math.round(s.audio.position / s.beat) };
}

async function completeTutorial(fire) {
  let s = await state();
  while (s.lesson === 0) {
    await page.mouse.click(fire.x, fire.y, { delay: 70 }); await page.waitForTimeout(110); s = await state();
  }
  if (s.lesson === 1) {
    await page.mouse.move(fire.x, fire.y); await page.mouse.down(); await page.waitForTimeout(650);
    await page.mouse.move(fire.x - 62, fire.y - 5, { steps: 8 });
    await page.mouse.move(fire.x + 62, fire.y - 5, { steps: 16 });
    await page.mouse.up();
    await page.waitForFunction(() => window.__qaProbe.read().lesson >= 2, undefined, { timeout: 6000 });
  }
  await page.mouse.move(fire.x, fire.y);
  let prior = -1;
  for (let tries = 0; tries < 18; tries++) {
    s = await state(); if (s.lesson === null) break;
    if (s.lesson === 3) {
      await page.waitForFunction(() => window.__qaProbe.read().lesson === null, undefined, { timeout: 6000 });
      break;
    }
    const next = await awaitNewBeat(prior); prior = next.number;
    await page.mouse.click(fire.x, fire.y, { delay: 25 });
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => {
    const s = window.__qaProbe.read(); return s.mode === 'playing' && s.lesson === null && s.level === 1;
  }, undefined, { timeout: 6000 });
  evidence.flow.push({ step: 'tutorial-complete-by-real-input', state: await state() });
}

async function runStage(fire) {
  await page.evaluate(() => window.__qaProbe.begin());
  const wallStart = performance.now();
  let priorBeat = -1, paused = false, mouseHeld = false;
  while (performance.now() - wallStart < 165000) {
    let s = await state();
    if (s.mode === 'result' || s.state !== 'playing') { evidence.finalBattle = s; break; }
    if (s.mode !== 'playing') throw new Error('Unexpected interruption during stage: ' + JSON.stringify(s));
    if (!paused && s.time >= 18) {
      if (mouseHeld) { await page.mouse.up(); mouseHeld = false; }
      await clickNative('pause', 'Topbar');
      await page.waitForFunction(() => window.__qaProbe.read().mode === 'paused');
      const before = await state(); await page.waitForTimeout(500); const after = await state();
      if (Math.abs(after.time - before.time) > .001 || Math.abs(after.audio.position - before.audio.position) > .05)
        throw new Error('Pause failed to freeze battle and music position');
      await clickNative('resume');
      await page.waitForFunction(() => window.__qaProbe.read().mode === 'playing');
      const resumed = await state();
      evidence.pauseResume = { before, after, resumed, passed: true };
      paused = true; priorBeat = Math.round(resumed.audio.position / resumed.beat) - 1;
      await page.mouse.move(fire.x, fire.y);
      continue;
    }
    const next = await awaitNewBeat(priorBeat); priorBeat = next.number; s = next.s;
    if (s.mode !== 'playing' || s.state !== 'playing') { evidence.finalBattle = s; break; }
    // Hold between beats for ordinary auto-fire, then release/press on each beat.
    // These are the same public input events available to a player.
    if (mouseHeld) await page.mouse.up();
    await page.mouse.move(fire.x, fire.y); await page.mouse.down(); mouseHeld = true;
    s = await state();
    evidence.samples.push(s);
  }
  if (mouseHeld) await page.mouse.up();
  await page.evaluate(() => window.__qaProbe.end());
  evidence.elapsedWallMs = performance.now() - wallStart;
  if (!evidence.finalBattle) evidence.finalBattle = await state();
  const counters = await page.evaluate(() => ({ ...window.__qaProbe.counters, flags: window.__qaProbe.flags }));
  evidence.performance = {
    note: 'Same-environment diagnostic measurements; not phone fps and not a GPU benchmark.',
    frames: counters.frames, updateMs: distribution(counters.updateMs), rafMs: distribution(counters.rafMs),
    rawDt: distribution(counters.rawDt), graphicsClears: counters.graphicsClears,
    graphicsClearsPerFrame: counters.frames ? counters.graphicsClears / counters.frames : null,
    clearsByNode: counters.clearsByNode, labelRasterCalls: counters.labelRasterCalls,
    labelRasterCallsPerFrame: counters.frames ? counters.labelRasterCalls / counters.frames : null,
    fillTextAvailable: counters.flags.fillTextAvailable, maxEnemies: counters.maxEnemies,
    scheduledMusicNotes: counters.notes,
  };
  const active = evidence.samples.filter(s => s.mode === 'playing' && s.audio.state === 'running' && s.lesson === null);
  const drift = active.map(s => s.audio.position - s.time);
  const tail = active.filter(s => s.remaining >= 6 && s.remaining <= 12 && !s.clearing);
  evidence.clock = { samples: drift.length, maxAbsDrift: drift.length ? Math.max(...drift.map(Math.abs)) : null,
    minDrift: drift.length ? Math.min(...drift) : null, maxDrift: drift.length ? Math.max(...drift) : null,
    tailWindow: '6–12 seconds before the authored stage duration, before the intentional 5-second fade',
    tailSamples: tail.length, tailGainMinimum: tail.length ? Math.min(...tail.map(s => s.audio.gain)) : null,
    tailFirst: tail[0] || null, tailLast: tail[tail.length - 1] || null,
    tailNewNotes: tail.length ? tail[tail.length - 1].audio.notes - tail[0].audio.notes : 0 };
  evidence.checks = {
    realAudioContextRunning: active.length > 10,
    pauseResume: !!evidence.pauseResume?.passed,
    fullStageReached: evidence.finalBattle.time >= evidence.finalBattle.duration - .25,
    tailCovered: tail.length >= 3,
    musicPresentInTail: tail.length >= 3 && tail.every(s => s.audio.gain > .1 && s.audio.masterGain > .1) && evidence.clock.tailNewNotes > 0,
    clocksStayedAligned: drift.length > 10 && evidence.clock.maxAbsDrift <= .15,
  };
  if (!evidence.checks.realAudioContextRunning || !evidence.checks.pauseResume) throw new Error('Audio or pause prerequisites failed');
  if (strictSync && Object.values(evidence.checks).some(v => !v)) throw new Error('Stage/audio verification failed: ' + JSON.stringify(evidence.checks));
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    browser = await webkit.launch({ headless: false });
    page = await browser.newPage({ viewport, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    page.on('console', m => { if (evidence.logs.length < 250) evidence.logs.push({ type: m.type(), text: m.text() }); });
    page.on('pageerror', e => evidence.errors.push(e.stack || String(e)));
    page.on('requestfailed', r => evidence.failedRequests.push({ url: r.url(), error: r.failure() }));
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__smokeReady || window.__smokeErrors?.length, undefined, { timeout: 45000 });
    evidence.startup = await page.evaluate(() => ({ ready: window.__smokeReady, stage: window.__smokeStage, errors: window.__smokeErrors }));
    if (!evidence.startup.ready || evidence.startup.errors?.length) throw new Error('Startup failed');
    await installObservers(); await capture('home-dpr3');
    const visual = evidence.captures[0].visual;
    if (visual.arrows.some(a => a.count !== 1)) throw new Error('Home navigation arrows were lost');
    if (visual.deviceDpr !== 3 || visual.canvas.width / visual.canvas.cssWidth < 1.9) throw new Error('Framebuffer density regressed');
    evidence.homeVisual = visual;
    await clickNative('start', 'Home');
    await page.waitForFunction(() => { const s = window.__qaProbe.read(); return s.mode === 'playing' || !!s.panel; });
    if ((await state()).mode !== 'playing') await clickNative('briefing-go');
    await page.waitForFunction(() => window.__qaProbe.read().mode === 'playing');
    const fire = await nativePoint('CannonVisual'); evidence.cannonPoint = fire;
    await capture('cannon-idle-dpr3');
    await page.mouse.move(fire.x, fire.y); await page.mouse.down(); await capture('cannon-held-dpr3');
    if (!(await state()).held) throw new Error('Cannon did not enter held state');
    await page.mouse.up(); await page.waitForTimeout(260); await capture('cannon-released-dpr3');
    if ((await state()).held) throw new Error('Cannon stayed held after release');
    await completeTutorial(fire);
    await runStage(fire);
    await capture('stage-end-dpr3');
    evidence.runtimeErrors = await page.evaluate(() => window.__smokeErrors);
    if (evidence.errors.length || evidence.failedRequests.length || evidence.runtimeErrors.length) throw new Error('Runtime or network errors occurred');
    evidence.result = 'passed';
  } catch (error) {
    evidence.result = 'failed'; evidence.failure = error.stack || String(error); process.exitCode = 1;
    if (page) {
      evidence.failureState = await state().catch(() => null);
      await page.screenshot({ path: path.join(output, 'failure.png'), scale: 'device', timeout: 3000 }).catch(() => {});
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ result: evidence.result, checks: evidence.checks, clock: evidence.clock,
      performance: evidence.performance, failure: evidence.failure, failureState: evidence.failureState }, null, 2));
  }
})();
