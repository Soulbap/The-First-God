// Bounded trigger for rendererens avledede miljølag. Den eier ingen dekor eller
// spillregel: hvert nytt lag blir alltid utregnet fra gjeldende trær, bygg og slitasje.
export const ECOLOGY_REFRESH_SECONDS = 10;

export function stepEcology(state, dt) {
  const eco = state.ecology;
  eco.refreshTimer += dt;
  if (eco.refreshTimer < ECOLOGY_REFRESH_SECONDS) return false;
  eco.refreshTimer %= ECOLOGY_REFRESH_SECONDS;
  eco.revision++;
  state.events.push({ type: 'ecologyRefresh', revision: eco.revision });
  return true;
}
