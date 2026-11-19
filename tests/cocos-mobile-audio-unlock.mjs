import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';

// Run the actual compiled Cocos audio module with a fake browser/WebAudio host.
// The timeout is shortened only in this isolated test environment.
const source = readFileSync(new URL('../cocos-preview/scripts/core/audio.js', import.meta.url), 'utf8');
const exported = {};
const getTrack = () => ({ level: 1, key: 40, beat: 0.5, bars: 1, duration: 2, byStep: Array.from({ length: 16 }, () => []) });
const moduleHost = {
  register(deps, declare) {
    const module = declare((key, value) => { exported[key] = value; }, { id: 'audio-test' });
    module.setters.forEach((setter, i) => setter(i === 1 ? { createAudioContext: () => null } :
      i === 3 ? { getTrack, frequency: () => 440, stepTime: () => 0 } : {}));
    module.execute();
  }
};
runInNewContext(source, {
  System: moduleHost,
  setTimeout: (callback, ms) => setTimeout(callback, Math.min(ms, 20)),
  clearTimeout,
  setInterval,
  clearInterval,
  console,
});
new Script(readFileSync(new URL('../cocos-preview/scripts/Pulsefront.js', import.meta.url), 'utf8'));

function fakeAudioContext() {
  const ctx = { state: 'suspended', sampleRate: 48000, currentTime: 5, warmups: 0, resumes: 0, allow: false, destination: {} };
  const gainParam = () => ({
    value: 1, setValueAtTime() {}, setTargetAtTime() {},
    linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}
  });
  ctx.createGain = () => ({ gain: gainParam(), connect() {}, disconnect() {} });
  ctx.createDynamicsCompressor = () => ({
    threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {}, disconnect() {}
  });
  ctx.createBuffer = (channels, length) => ({ getChannelData: () => new Float32Array(length) });
  ctx.createBufferSource = () => ({ connect() {}, disconnect() {}, start() { ctx.warmups++; } });
  ctx.resume = () => { ctx.resumes++; if (ctx.allow) ctx.state = 'running'; return Promise.resolve(); };
  ctx.close = () => { ctx.state = 'closed'; };
  return ctx;
}

const ctx = fakeAudioContext();
let allocations = 0;
const audio = new exported.Soundtrack({ createContext: () => { allocations++; return ctx; } });
assert.equal(await audio.unlock(), false, 'autoplay blocked until gesture');
assert.equal(audio.ctx, ctx, 'blocked audio context must survive for retry');
audio.start(1);
assert.equal(audio.running, false, 'suspended context must not schedule music');
ctx.allow = true;
assert.equal(await audio.unlock(), true, 'next authorized gesture recovers sound');
assert.equal(allocations, 1, 'must reuse the same audio context');
assert.ok(ctx.warmups >= 2, 'each retry must start a silent WebAudio source');
audio.running = true;
audio.origin = 3;
assert.equal(audio.position(7), 2, 'audio clock is authoritative when running');
ctx.state = 'interrupted';
assert.equal(audio.position(7), 7, 'clock falls back when interrupted');
assert.equal(audio.phase(.25), .25, 'beat clock also falls back');
ctx.state = 'suspended';
ctx.allow = false;
assert.equal(await audio.unlock(), false, 'failed retry does not imply success');
assert.equal(audio.ctx, ctx, 'failed retry does not dispose the context');

const pending = fakeAudioContext();
pending.resume = () => new Promise(() => {});
const stalled = new exported.Soundtrack({ createContext: () => pending });
const startedAt = Date.now();
assert.equal(await stalled.unlock(), false, 'indefinitely pending resume must fail boundedly');
assert.ok(Date.now() - startedAt < 800, 'resume timeout must not freeze the menu');

const boot = readFileSync(new URL('../cocos-preview/boot.js', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../cocos-preview/scripts/Pulsefront.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../cocos-preview/index.html', import.meta.url), 'utf8');
assert.match(html, /boot\.js\?v=[^"']+-mobile-audio1/);
assert.match(boot, /Pulsefront\.js\?v=[^"']+-mobile-audio1/);
assert.match(controller, /core\/audio\.js\?v=[^"']+-mobile-audio1/);
assert.match(controller, /platform\/Platform\.js\?v=[^"']+-mobile-audio1/);
assert.match(source, /platform\/Platform\.js\?v=[^"']+-mobile-audio1/);
console.log('Cocos mobile audio unlock/retry/fallback/cache smoke: PASS');
