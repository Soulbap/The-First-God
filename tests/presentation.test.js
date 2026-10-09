import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPresentation, PresentationCoordinator } from '../src/ui/presentation.js';

test('oppdagelser klassifiseres med høyere vekt for de første livsendringene', () => {
  assert.equal(classifyPresentation({ type: 'discovered', id: 'first_shelter' }).kind, 'significant');
  assert.equal(classifyPresentation({ type: 'discovered', id: 'hands_remember' }).kind, 'minor');
  assert.equal(classifyPresentation({ type: 'milestone', id: 'settlement', title: 'x', text: 'x' }).kind, 'major');
});

test('milepæl vinner over samtidig oppdagelse, og resten vises etterpå uten overlapp', () => {
  const p = new PresentationCoordinator();
  const active = p.push([
    { type: 'discovered', id: 'hands_remember' },
    { type: 'milestone', id: 'first_fire', title: 'Første ild', text: 'x' },
    { type: 'discovered', id: 'common_fire' },
  ]);
  assert.equal(active.key, 'milestone:first_fire');
  assert.equal(p.next(), null, 'aktiv melding blokkerer overlapping');
  assert.equal(p.dismiss().key, 'discovered:common_fire');
  assert.equal(p.dismiss().key, 'discovered:hands_remember');
});

test('duplikater forkastes og køen er avgrenset', () => {
  const p = new PresentationCoordinator(2);
  const active = p.push([
    { type: 'discovered', id: 'hands_remember' },
    { type: 'discovered', id: 'hands_remember' },
    { type: 'discovered', id: 'new_home' },
    { type: 'discovered', id: 'awakening' },
  ]);
  assert.equal(active.key, 'discovered:awakening');
  assert.equal(p.pending.length, 1, 'grensen gjelder samlet aktiv melding og ventende kø');
});

test('Ragnarok rydder aktiv og ventende presentasjonstilstand', () => {
  const p = new PresentationCoordinator();
  p.push([{ type: 'discovered', id: 'awakening' }, { type: 'discovered', id: 'new_home' }]);
  p.reset();
  assert.equal(p.active, null);
  assert.deepEqual(p.pending, []);
  assert.equal(p.next(), null);
});
