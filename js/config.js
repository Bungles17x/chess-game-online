/* Gambit — published build settings.
 *
 * Online play needs the Gambit server. Left empty, the page talks to whatever
 * origin serves it, which is right when you run `node server.js` yourself.
 *
 * For a hosted copy (GitHub Pages, any static host) point this at the server
 * you deployed, for example:
 *
 *   window.GAMBIT_SERVER = 'https://gambit-online.onrender.com';
 *
 * http(s) or ws(s) both work; /ws is appended if you leave it off.
 */
/* A page served from this machine uses the server on this machine, so
   `node server.js` needs no edit. The published page keeps the deployed one. */
window.GAMBIT_SERVER = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? ''
  : 'https://chess-game-online-u34h.onrender.com';
