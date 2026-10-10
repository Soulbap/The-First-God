// OPUS-09: luftfart og luftmåling. Presisjonsverk og flyverk bygges av ekte materialer og kraft, flyplassen
// bygges autonomt, og fly bruker drivstoff og tid for å gjennomføre målinger. Kartkunnskap øker bare over steder
// som allerede er oppdaget. Planetkameraet låses først etter tilstrekkelig fullførte målinger (se upgrades.js).
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite } from './construction.js';
import { chronicle } from './chronicle.js';

const A = B.aviation;
const done = (s, type) => s.buildings.some((b) => b.complete && b.type === type);
const pending = (s, type) => s.buildings.some((b) => !b.complete && b.type === type);
const afford = (s, cost) => Object.entries(cost).every(([k, n]) => (s.resources[k] || 0) >= n);
const spend = (s, cost) => { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; };

function buildSite(s, type, cost) {
  if (done(s, type) || pending(s, type) || !afford(s, cost)) return;
  const site = findBuildSite(s, type, 'first');
  if (!site) return;
  spend(s, cost);
  startConstruction(s, type, { source: `aviation:${type}`, site, settlementId: 'first' });
}

// Verksteder bygges når kunnskapen finnes og metallverket står. Flyplassen bygges først når flyverket finnes.
function buildAviation(s) {
  const V = s.aviation, I = s.industrial;
  if (I.precision && done(s, 'metalworks')) buildSite(s, 'precision_works', B.industrial.factories.precision_works.cost);
  if (V.enabled && done(s, 'precision_works')) buildSite(s, 'aircraft_works', B.industrial.factories.aircraft_works.cost);
  if (V.enabled && done(s, 'aircraft_works')) buildSite(s, 'airfield', A.airfield.cost);
}

// Oppdrag: en flyvning kan bare gå mot oppdagede, ikke-kartlagte steder innen rekkevidde. Ett fly flyr om gangen.
function flightTarget(s) {
  return s.globe.regions
    // OPUS-11: en luftmåling er noe annet enn sjøkartlegging. Et område som skipene har kartlagt, kan fortsatt måles fra luften (én gang).
    .filter((r) => !r.home && r.state !== 'ukjent' && !r.aerial && r.steps >= 1 && r.steps <= A.flight.maxSteps)
    .sort((a, b) => a.steps - b.steps || a.row - b.row || a.col - b.col)[0] || null;
}

function launchFlight(s) {
  const V = s.aviation, F = A.flight;
  if (s.resources.aircraft < 1 || !done(s, 'airfield') || V.flights.some((f) => f.status === 'flying')) return;
  // Når kommunikasjon er kjent, koordineres flyoppdrag bare gjennom en strømført telegraf.
  if (s.science?.communication && !s.science.telegraphActive) return;
  const r = flightTarget(s); if (!r) return;
  // Rundtur: drivstoffet og tiden dekker begge veier. Ekstra oppdrag krever alltid nytt drivstoff.
  const fuel = 2 * r.steps * F.fuelPerStep;
  if (s.resources.fuel < fuel) return;
  if (V.flightWear >= F.serviceAfter) {
    if (!afford(s, F.service)) return; // flyet står på bakken til vedlikeholdet er betalt
    spend(s, F.service); V.flightWear = 0; V.services++;
  }
  s.resources.fuel -= fuel; V.fuelBurned += fuel; V.flightWear += 1;
  const duration = 2 * r.steps * F.secondsPerStep;
  V.flights.push({ id: s.nextId++, regionId: r.id, steps: r.steps, fuel, status: 'flying', departAt: s.time, arriveAt: s.time + duration });
  s.events.push({ type: 'flightLaunched', regionId: r.id });
}

// Når flyvningen er ferdig, øker kunnskapen ett trinn for det konkrete stedet, og målingen telles.
function completeFlights(s) {
  const V = s.aviation;
  for (const f of V.flights) {
    if (f.status !== 'flying' || s.time < f.arriveAt) continue;
    f.status = 'done';
    const r = s.globe.regions.find((x) => x.id === f.regionId);
    V.flightsDone++;
    if (!V.announcedFlight) { V.announcedFlight = true; chronicle(s, 'aviation:first-flight', 'route', 'Et fly har gjennomført sin første vellykkede reise.', null); }
    if (!r || r.aerial) continue;
    r.aerial = true;
    if (r.knowledge !== 'charted') {
      r.knowledge = r.knowledge === 'discovered' ? 'surveyed' : 'charted';
      s.globe.stats[r.knowledge] = (s.globe.stats[r.knowledge] || 0) + 1;
    }
    V.surveys++;
    s.events.push({ type: 'aerialSurvey', regionId: r.id, knowledge: r.knowledge });
    if (!V.announcedSurvey) { V.announcedSurvey = true; chronicle(s, 'aviation:first-survey', 'explore', 'Flygere har målt et område fra luften. Kartet blir mer presist.', null); }
  }
  if (V.flights.length > 20) V.flights = V.flights.filter((f) => f.status !== 'done');
}

export function stepAviation(s) {
  if (!s.industrial?.enabled) return;
  buildAviation(s);
  completeFlights(s);
  if (s.aviation.surveyEnabled) launchFlight(s);
}
