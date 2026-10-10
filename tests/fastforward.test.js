// Headless fast-forward: harnessen må gi samme autoritative utfall som den vanlige steg-løkken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/sim/game.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { makeBot } from '../tools/bot.js';
import { runSeed, fingerprint } from '../tools/fastforward.mjs';

const plain = (seed, seconds, withBot) => {
  const s = createGame(seed), bot = makeBot();
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    step(s);
    if (withBot) bot.act(s);
    if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
  }
  return s;
};

test('fast-forward: samme frø og tid gir identisk autoritativ tilstand som steg-løkken (med bot)', () => {
  const direct = plain(701, 240, true);
  const harness = runSeed({ seed: 701, seconds: 240, bot: true, keepState: true }).final;
  assert.equal(fingerprint(harness), fingerprint(direct));
});

test('fast-forward: to kjøringer med samme frø er deterministiske', () => {
  const a = runSeed({ seed: 4242, seconds: 120, bot: true, keepState: true }).final;
  const b = runSeed({ seed: 4242, seconds: 120, bot: true, keepState: true }).final;
  assert.equal(fingerprint(a), fingerprint(b));
});

test('fast-forward: lagring midt i kjøringen endrer ikke videre utfall (uten bot, fordi boten har egne timere)', () => {
  const uninterrupted = plain(20261009, 180, false);
  const first = createGame(20261009);
  for (let i = 0; i < Math.round(90 * 60); i++) step(first);
  const restored = deserialize(serialize(first));
  for (let i = 0; i < Math.round(90 * 60); i++) step(restored);
  assert.equal(fingerprint(restored), fingerprint(uninterrupted));
});

test('fast-forward: stopper tidlig når målmilepælen er nådd og rapporterer tid og gjennomstrømning', () => {
  const r = runSeed({ seed: 701, seconds: 14400, until: 'industry', bot: true });
  assert.ok(r.firstAt.industry != null, 'industri nås');
  assert.ok(r.simSeconds < 14400, 'stopper før full tid');
  assert.ok(r.simHoursPerWallSec > 0 && r.wallMs > 0, 'rapporterer gjennomstrømning');
});
