import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { maxRoadLevel, roadCost } from '../src/sim/streets.js';
import { invGet } from '../src/sim/inventory.js';
const s = createGame(20261009), bot = makeBot();
for (let i = 0; i < 9000 * 60; i++) { step(s); bot.act(s); if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone'); }
for (const S of s.settlements) console.log(S.id, S.stage, 'max', maxRoadLevel(s, S), 'pop', S.population.length, 'job', JSON.stringify(S.roadJob), 'stone', invGet(s, S.id, 'stone'), JSON.stringify(S.stock), S.state);
