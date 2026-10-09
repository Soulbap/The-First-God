// Utviklerverktøy: kjører en fast, reproduserbar spillsekvens (scene A–E) og sender canvas-bildet
// til en lokal mottaker for før/etter-sammenligning. Brukes via ?debug; ikke del av spillet.
// Konsoll: await (await import('/tools/scenes.js')).runAll('before')
const send = async (name) => {
  const data = document.getElementById('world').toDataURL('image/jpeg', 0.9);
  await fetch('http://127.0.0.1:5199/?n=' + name, { method: 'POST', body: data });
};

export async function runAll(tag) {
  const T = window.TFG, out = [];
  const C = T.state.settlement.center;
  const shot = async (name, x, y, w) => { T.view(x, y, w); T.tick(2); await send(`${name}-${tag}.jpg`); out.push(name); };
  await shot('A-woodland', C.x - 10, C.y - 30, 600);
  T.give(40, 40); T.buy('first_shelter'); T.advance(30);
  await shot('B-shelter', C.x - 10, C.y - 30, 600);
  T.give(40, 40); T.buy('awakening'); T.advance(10); T.tick(3);
  await shot('C-humans', C.x - 10, C.y - 30, 600);
  await shot('C-humans-close', C.x + 10, C.y + 10, 340);
  for (const id of ['common_fire', 'hands_remember', 'new_home']) { T.give(60, 60); T.buy(id); T.advance(40); }
  T.give(60, 60); T.buy('new_home'); T.advance(90); T.tick(2);
  await shot('D-camp', C.x - 10, C.y - 30, 600);
  await shot('D-camp-close', C.x, C.y, 340);
  T.state.unlocks.zoomArea = true;
  await shot('E-area', C.x, C.y - 40, 1850);
  return out;
}
