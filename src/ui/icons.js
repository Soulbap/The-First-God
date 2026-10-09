// Én ikonfamilie: 24×24, strek 1,6 i currentColor med svak flatefyll. Ingen emoji.
const P = {
  wood: '<path class="f" d="M12 2.8 7.2 9.6h2.9L6.3 14.8h3.6l-4.2 5.4h12.6l-4.2-5.4h3.6l-3.8-5.2h2.9z"/><path d="M12 20.2v2"/>',
  stone: '<path class="f" d="M2.8 19.4c.1-4.1 2.4-7.9 6.1-8.8 2.7-.6 4.6.8 5.9 2.5 1.1 1.4 1.7 3 1.7 4.6 0 1-.6 1.7-1.6 1.7z"/><path class="f" d="M16.9 19.4c-.3-2.5.9-4.9 3-5.3 1.4-.2 2.2 1 2.2 2.6 0 1.5-.5 2.7-1.6 2.7z"/><path d="m6.6 14.6 2.1 1.3 1.8-1.9"/>',
  people: '<circle class="f" cx="9" cy="7" r="2.6"/><path class="f" d="M4.3 20.5v-3.4c0-2.6 2.1-4.6 4.7-4.6s4.7 2 4.7 4.6v3.4"/><circle cx="16.4" cy="8.4" r="2.1"/><path d="M15.5 12.7c.3-.1.6-.1.9-.1 2.2 0 4 1.8 4 4v3.9"/>',
  pp: '<circle class="f" cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  insight: '<path class="f" d="M12 2.8c.6 4.6 2.9 7.6 7.6 9.2-4.7 1.6-7 4.6-7.6 9.2-.6-4.6-2.9-7.6-7.6-9.2 4.7-1.6 7-4.6 7.6-9.2z"/>',
  flag: '<path d="M6 21.2V3.6"/><path class="f" d="M6 4.6c3-1.6 5.2 1.6 8.2 0 2.2-1.1 3.8-.6 3.8-.6v8.3s-1.6-.5-3.8.6c-3 1.6-5.2-1.6-8.2 0z"/>',
  ragnarok: '<g class="f"><path d="M12 12.6c-2.6-2.4-2.6-6.6 0-9 2.6 2.4 2.6 6.6 0 9z"/><path d="M12 12.6c-2.6-2.4-2.6-6.6 0-9 2.6 2.4 2.6 6.6 0 9z" transform="rotate(120 12 12.6)"/><path d="M12 12.6c-2.6-2.4-2.6-6.6 0-9 2.6 2.4 2.6 6.6 0 9z" transform="rotate(240 12 12.6)"/></g><circle cx="12" cy="12.6" r="5.4"/>',
  shelter: '<path class="f" d="M12 5.4 4.2 20.2h15.6z"/><path d="m10 2.6 3.8 5.6M14 2.6l-3.8 5.6M12 13.4l-1.8 6.8M12 13.4l1.8 6.8"/>',
  awakening: '<path d="M2.8 18.4h18.4"/><path class="f" d="M6.6 18.4a5.4 5.4 0 0 1 10.8 0z"/><path d="M12 6.2v2.6M5.4 9.2l1.7 1.7M18.6 9.2l-1.7 1.7M2.9 14.6h1.9M19.2 14.6h1.9"/>',
  fire: '<path class="f" d="M12 2.9c.9 3.2 4.6 4.8 4.6 9.2a4.6 4.6 0 0 1-9.2 0c0-2.4 1.2-3.7 2.3-4.9.4 1.6 1 2.5 2.1 2.9-.4-2.7-.3-5 .2-7.2z"/><path d="m4.6 21.2 14.8-3.2M4.6 18l14.8 3.2"/>',
  axe: '<path d="M5.2 20.8 15.6 8"/><path class="f" d="M12.4 6.3c1.6-2.3 4.4-3.6 7.3-3.2-.1 2.9-1.4 5.6-3.7 7.2z"/>',
  hut: '<path class="f" d="M3.4 13.4C5 8 8.2 4.8 12 4.8s7 3.2 8.6 8.6z"/><path d="M5.6 13.4v6.8h12.8v-6.8M10.4 20.2v-3.4a1.6 1.6 0 0 1 3.2 0v3.4"/>',
  storage: '<path class="f" d="M3.2 10.2 12 4.1l8.8 6.1v10.1H3.2z"/><path d="M2.2 10.2h19.6M7 20.3v-7.1M12 20.3v-7.1M17 20.3v-7.1"/>',
  hearth: '<path class="f" d="M4 18.8c2.7-3.8 13.3-3.8 16 0"/><path d="M5.1 20.4h13.8M7 6.2l3 3M17 6.2l-3 3"/><path class="f" d="M12 4c.6 2.2 3.1 3.3 3.1 6.3a3.1 3.1 0 0 1-6.2 0c0-1.6.8-2.5 1.5-3.4.3 1.1.7 1.7 1.4 2-.2-1.8-.2-3.2.2-4.9z"/>',
  explore: '<path d="M4 20 11.2 4l2.5 7.1L21 13.6 4 20z"/><path class="f" d="m11.2 4 2.5 7.1L21 13.6 4 20z"/><path d="m13.7 11.1-3.6 3.6"/>',
  sprout: '<path d="M12 21.2v-9"/><path class="f" d="M12 12.4c0-3.6-2.6-6.2-7.2-6.2 0 3.6 2.6 6.2 7.2 6.2zM12 10.2c0-3.1 2.1-5.7 6.2-5.7 0 3.1-2.1 5.7-6.2 5.7z"/>',
  planks: '<path class="f" d="M3 17h18v3.2H3z"/><path class="f" d="M4 12.9h16V16H4z"/><path class="f" d="M5 8.8h14v3.1H5z"/>',
  cutstone: '<path class="f" d="m4 9 8-4 8 4v7l-8 4-8-4z"/><path d="m4 9 8 4 8-4M12 13v7"/>',
  book: '<path class="f" d="M3.6 5.6c3-1.3 5.6-1 8.4.9 2.8-1.9 5.4-2.2 8.4-.9v13.6c-3-1.3-5.6-1-8.4.9-2.8-1.9-5.4-2.2-8.4-.9z"/><path d="M12 6.5v13.6"/>',
  globe: '<circle class="f" cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.6 2.4 3.8 5.3 3.8 8.6s-1.2 6.2-3.8 8.6c-2.6-2.4-3.8-5.3-3.8-8.6S9.4 5.8 12 3.4z"/>',
  road: '<path class="f" d="M8 20.4 10.4 4h3.2l2.4 16.4z"/><path d="M12 6.4v2.4M12 11v2.6M12 16.2v2.4"/>',
  compass: '<circle cx="12" cy="12" r="8.6"/><path class="f" d="m15.9 8.1-2.3 5.5-5.5 2.3 2.3-5.5z"/>',
  sawmill: '<path class="f" d="M3 17.4h18v3.2H3z"/><path d="M6 17.4V7.6M18 17.4V7.6M6 7.6h12"/><path d="m9.4 17 1.8-9M13 17l1.8-9"/>',
  mason: '<path d="M14.4 4.8l4.8 4.8"/><path class="f" d="m12.2 7 4.8 4.8-2 2-4.8-4.8z"/><path d="M11.2 12.6 4.6 19.2"/>',
  townhouse: '<path class="f" d="M4 20.2V11l8-6.2 8 6.2v9.2z"/><path d="M4 11h16M10 20.2v-5h4v5"/>',
  market: '<path class="f" d="M3.4 9h17.2l-1.6-4.6H5z"/><path d="M5 9v11.2h14V9M9 13.2h6"/>',
  hall: '<path class="f" d="M2.8 10.2 12 4.2l9.2 6z"/><path d="M4.6 10.8v8.4M9.2 10.8v8.4M14.8 10.8v8.4M19.4 10.8v8.4M2.8 19.6h18.4"/>',
  realm: '<path class="f" d="M3.6 20.4V9.6l4.2-2.8 4.2 2.8v10.8z"/><path class="f" d="M12 20.4V12l4.2-2.8 4.2 2.8v8.4z"/><path d="M3.6 20.4h16.8M7.8 6.8V3.6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;

export const hasIcon = (name) => name in P;
