const assert = require('node:assert/strict');
const { test } = require('node:test');
const { webcrypto } = require('node:crypto');
const { Clarity } = require('../dist/plugin.cjs.js');

// Exercise the shipped bundle with the real Microsoft wrapper and a DOM stub.
// Scripts are recorded, never fetched; no analytics leave this test process.
const scripts = [
  {
    parentNode: {
      insertBefore(node) {
        scripts.push(node);
      },
    },
  },
];
global.window = { crypto: webcrypto };
global.document = {
  getElementById: (id) => scripts.find((node) => node.id === id) ?? null,
  createElement: () => ({}),
  getElementsByTagName: () => scripts,
};
const calls = () => (window.clarity?.q ?? []).map((entry) => Array.from(entry));

test('web bridge public contract', async (t) => {
  await t.test('requires initialization before sending data', async () => {
    await assert.rejects(Clarity.sendCustomEvent({ name: 'click' }), { code: 'NOT_INITIALIZED' });
    assert.equal(calls().length, 0);
  });
  await t.test('rejects malformed initialization without injecting a tag', async () => {
    for (const options of [{ projectId: '' }, { projectId: '../bad' }, { projectId: 'demo123', logLevel: 'invalid' }]) {
      await assert.rejects(Clarity.initialize(options), { code: 'INVALID_ARGUMENT' });
    }
    assert.equal(scripts.length, 1);
  });
  await t.test('injects one project tag and rejects reinitialization', async () => {
    await Clarity.initialize({ projectId: 'demo123', logLevel: 'verbose' });
    assert.equal(scripts[1].src, 'https://www.clarity.ms/tag/demo123?ref=npm');
    assert.equal(scripts[1].async, 1);
    await assert.rejects(Clarity.initialize({ projectId: 'other123' }), { code: 'ALREADY_INITIALIZED' });
    assert.equal(scripts.length, 2);
  });
  await t.test('session-first identify creates a stable anonymous user and preserves both IDs', async () => {
    await Clarity.setCustomSessionId({ customSessionId: 'session-a' });
    const first = calls().at(-1);
    assert.equal(first[0], 'identify');
    assert.match(first[1], /^[0-9a-f-]{36}$/);
    assert.equal(first[2], 'session-a');
    await Clarity.setCustomSessionId({ customSessionId: 'session-b' });
    assert.equal(calls().at(-1)[1], first[1]);
    await Clarity.setCustomUserId({ customUserId: 'user-a' });
    assert.deepEqual(calls().at(-1).slice(0, 3), ['identify', 'user-a', 'session-b']);
    await Clarity.setCustomSessionId({ customSessionId: 'session-c' });
    assert.deepEqual(calls().at(-1).slice(0, 3), ['identify', 'user-a', 'session-c']);
  });
  await t.test('forwards tags, events and screen mapping', async () => {
    await Clarity.setCustomTag({ key: 'tier', value: ['free', 'trial'] });
    assert.deepEqual(calls().at(-1), ['set', 'tier', ['free', 'trial']]);
    await Clarity.sendCustomEvent({ name: 'button_click' });
    assert.deepEqual(calls().at(-1), ['event', 'button_click']);
    await Clarity.setCurrentScreenName({ name: 'Home' });
    assert.deepEqual(calls().at(-1), ['set', 'screen', 'Home']);
    await Clarity.setCurrentScreenName({ name: null });
    assert.deepEqual(calls().at(-1), ['set', 'screen', '']);
  });
  await t.test('uses exact consentV2 keys and never grants omitted ads consent', async () => {
    await Clarity.consent({ analyticsStorage: true });
    assert.deepEqual(calls().at(-1), ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }]);
    await Clarity.consent({ analyticsStorage: false, adsStorage: true });
    assert.deepEqual(calls().at(-1), ['consentv2', { ad_Storage: 'granted', analytics_Storage: 'denied' }]);
  });
  await t.test('rejects invalid arguments without forwarding SDK calls', async () => {
    const before = calls().length;
    const invalid = [
      () => Clarity.setCustomUserId({ customUserId: ' ' }),
      () => Clarity.setCustomSessionId({ customSessionId: 'a'.repeat(256) }),
      () => Clarity.setCustomTag({ key: 'key', value: [] }),
      () => Clarity.setCustomTag({ key: 'key', value: ['valid', 42] }),
      () => Clarity.setCustomTag({ key: 'key', value: [' '] }),
      () => Clarity.sendCustomEvent({ name: 'a'.repeat(255) }),
      () => Clarity.setCurrentScreenName({}),
      () => Clarity.setCurrentScreenName({ name: 42 }),
      () => Clarity.consent({ analyticsStorage: 'true' }),
      () => Clarity.consent({ analyticsStorage: true, adsStorage: null }),
    ];
    for (const run of invalid) await assert.rejects(run(), { code: 'INVALID_ARGUMENT' });
    assert.equal(calls().length, before);
    await Clarity.sendCustomEvent({ name: 'a'.repeat(254) });
    await Clarity.setCustomUserId({ customUserId: 'a'.repeat(255) });
  });
  await t.test('reports native-only APIs as unavailable', async () => {
    for (const method of ['pause', 'resume', 'isPaused', 'startNewSession', 'getCurrentSessionUrl']) {
      await assert.rejects(Clarity[method](), { code: 'UNAVAILABLE' });
    }
    await assert.rejects(
      Clarity.addListener('sessionStarted', () => {}),
      { code: 'UNAVAILABLE' },
    );
    await Clarity.removeAllListeners();
  });
});
