const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { webkit } = require('playwright');
const root = path.resolve('cocos-preview');
const output = path.resolve('browser-check-results');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.scene': 'application/json', '.png': 'image/png' };
const evidence = { browser: 'Playwright WebKit on Ubuntu with Mesa software rendering', logs: [], errors: [], requests: [] };
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + name, name.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await webkit.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 420, height: 840 }, deviceScaleFactor: 1 });
    page.on('console', m => evidence.logs.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', e => evidence.errors.push(e.stack || String(e)));
    page.on('requestfailed', req => evidence.requests.push({ url: req.url(), failure: req.failure() }));
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__smokeReady || window.__smokeErrors?.length, undefined, { timeout: 45000 }).catch(e => evidence.errors.push(String(e)));
    evidence.state = await page.evaluate(() => ({ ready: !!window.__smokeReady, stage: window.__smokeStage, startupErrors: window.__smokeErrors, webgl: window.__pulsefrontWebGL, diagnostics: window.pulsefront?.snapshot?.(), status: document.querySelector('#status')?.innerText }));
    await page.screenshot({ path: path.join(output, 'startup.png') });
    if (!evidence.state.ready) throw new Error('Cocos startup failed: ' + JSON.stringify(evidence.state));
    await page.waitForTimeout(1000);
    evidence.afterFrames = await page.evaluate(() => ({ errors: window.__smokeErrors, diagnostics: window.pulsefront?.snapshot?.(), frames: window.cc?.director?.getTotalFrames?.() }));
    if (evidence.afterFrames.errors?.length || !evidence.afterFrames.diagnostics) throw new Error('First frames failed');
    console.log('Cocos real WebKit startup passed', JSON.stringify(evidence.state));
  } catch (error) {
    evidence.failure = error.stack || String(error);
    console.error(evidence.failure);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
