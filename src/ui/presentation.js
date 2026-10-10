// GUI-02: liten, deterministisk kø mellom simuleringshendelser og HUD.
// Holder presentasjon ute av simuleringen og lar aldri to meldinger dekke hverandre.
import { upgradeById } from '../data/upgrades.js';

const MAX_PENDING = 4;
const IMPORTANT_DISCOVERIES = new Set(['first_shelter', 'awakening', 'common_fire']);

export function classifyPresentation(event) {
  if (event.type === 'milestone') {
    const major = event.id === 'settlement' || event.id === 'first_village';
    return { key: `milestone:${event.id}`, priority: major ? 4 : 3,
      kind: major ? 'major' : 'significant', icon: 'flag', kicker: 'Milepæl', title: event.title, text: event.text };
  }
  if (event.type === 'discovered') {
    const def = upgradeById(event.id);
    if (!def) return null;
    const significant = IMPORTANT_DISCOVERIES.has(event.id);
    return { key: `discovered:${event.id}`, priority: significant ? 2 : 1,
      kind: significant ? 'significant' : 'minor', icon: def.icon, kicker: 'Ny innsikt', title: def.name,
      text: significant ? def.world : '' };
  }
  if (event.type === 'chronicle') {
    // Bare de stille, minnerike hendelsene blir en liten melding; resten leses i Kronikk-panelet.
    if (!['found', 'outpost', 'explore', 'route', 'stage', 'sacred', 'festival'].includes(event.kind)) return null;
    return { key: `chronicle:${event.text}`, priority: 1, kind: 'minor', icon: 'book', kicker: 'Kronikk', title: event.text, text: '' };
  }
  if (event.type === 'selected') {
    const def = upgradeById(event.id);
    return def ? { key: `selected:${event.id}:${event.at || 0}`, priority: 0, kind: 'minor', icon: def.icon,
      kicker: 'Valgt', title: def.name, text: def.world } : null;
  }
  return null;
}

export class PresentationCoordinator {
  constructor(limit = MAX_PENDING) { this.limit = limit; this.pending = []; this.shown = new Set(); this.active = null; }
  push(events) {
    for (const event of events) {
      const item = classifyPresentation(event);
      if (!item || this.shown.has(item.key) || this.active?.key === item.key || this.pending.some((x) => x.key === item.key)) continue;
      this.pending.push(item);
    }
    this.pending.sort((a, b) => b.priority - a.priority || a.key.localeCompare(b.key));
    if (this.pending.length > this.limit) this.pending.length = this.limit;
    return this.next();
  }
  next() {
    if (this.active || !this.pending.length) return null;
    this.active = this.pending.shift();
    this.shown.add(this.active.key);
    return this.active;
  }
  dismiss() { this.active = null; return this.next(); }
  reset() { this.pending = []; this.shown.clear(); this.active = null; }
}
