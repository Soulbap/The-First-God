// Spillerbot: spiller som en spiller (klikker i starten, kjøper bare det som er tilgjengelig).
// Setter aldri milepælsflagg og gir seg aldri ressurser. Fungerer både i Node og i nettleseren (?debug).
import { clickNode, step } from '../src/sim/game.js';
import { purchase, upgradeStatus } from '../src/sim/economy.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { isDiscovered } from '../src/sim/discovery.js';

export function makeBot() {
  let nextBuy = 0, nextClick = 0;
  const bought = [];
  return {
    bought,
    // Kalles etter hvert simuleringssteg (billig: arbeid skjer bare en gang i sekundet).
    act(s) {
      if (s.time < 40 && s.time >= nextClick) {
        nextClick = s.time + 0.5;
        const tree = s.nodes.find((n) => n.kind === 'tree' && n.state === 'alive' && n.growth >= 0.3);
        const rock = s.nodes.find((n) => n.kind === 'rock' && n.stone > 0);
        if (s.resources.wood <= s.resources.stone * 1.6 && tree) clickNode(s, tree.id); else if (rock) clickNode(s, rock.id);
      }
      if (s.time < nextBuy) return;
      nextBuy = s.time + 1;
      for (const def of UPGRADES) {
        if (upgradeStatus(s, def) === 'available' && isDiscovered(s, def) && purchase(s, def.id).ok) bought.push({ t: s.time, id: def.id });
      }
    },
  };
}

// Spill fram til en milepæl er nådd (eller tiden går ut). Returnerer sann når milepælen ble nådd.
export function playTo(s, bot, milestone, maxSeconds = 14400) {
  const end = s.time + maxSeconds;
  while (s.milestones[milestone] == null && s.time < end) {
    step(s);
    if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
    bot.act(s);
  }
  return s.milestones[milestone] != null;
}
