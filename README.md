# Gambit

A free chess app that runs in the browser with no build step, no framework and no
third-party code. Play the computer, play a friend on one board, play online in a
room, solve puzzles, work through endgames, review finished games with a coach,
and take an adaptive placement test to set your starting rating.

Everything is plain HTML, CSS and JavaScript served by a tiny Node server. There
is no bundler, no npm install, and no external asset of any kind.

## Run it

```bash
node server.js
```

Then open <http://127.0.0.1:8124>. Opening `index.html` from the filesystem works
for single-board play, but online rooms, accounts and the lobby need the server.

Optional: copy `.env.example` to `.env` and fill in either SMTP details or a
Resend API key if you want sign-in codes emailed instead of shown on screen.
Without it the app simply displays the code.

## Published build

<https://bungles17x.github.io/chess-game-online/> is served from the `gh-pages`
branch by GitHub Pages. Pages can only hand out files, so online play there talks
to a hosted copy of `server.js` named in `js/config.js`:

```js
window.GAMBIT_SERVER = 'https://your-server.example';
```

Leave it empty and the page uses whatever origin serves it, which is what you
want locally. When a static copy has no server configured, the Online tab says so
and turns its controls off instead of failing on a socket that cannot exist.

## Hosting the online server (free)

[Render](https://render.com) runs the server on its free plan with no credit
card: Node web services accept WebSockets, there is no connection time limit,
and the instance is 512 MB with 750 hours a month. It spins down after 15
minutes without traffic and takes about a minute to wake.

1. Render dashboard → **New → Web Service**, connect this GitHub repo.
2. Branch: **`gambit-app`**. Runtime: **Node**. Build: `npm install`.
   Start: `node server.js`. Plan: **Free**. Health check path: `/health`.
3. Copy the service URL (`https://something.onrender.com`) into `js/config.js`
   as shown above, and push to `gh-pages`.
4. Optional: set the repository variable `GAMBIT_SERVER_URL` to that URL so
   `.github/workflows/keep-awake.yml` pings `/health` every 10 minutes and the
   free instance stays warm.

`render.yaml` in the repo root describes the same service, so
**New → Blueprint** can create it instead. The client already retries for 90
seconds when the server is waking, and shows a "waking the online server" note.

## What is in here

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `glass.css` | the app shell and the liquid-glass skin |
| `js/engine.js` | chess rules: moves, castling, en passant, promotion, checks, draws |
| `js/ai.js`, `js/ai-worker.js` | negamax search with alpha-beta and quiescence |
| `js/ui.js` | board, screens, online rooms, placement test |
| `js/placement.js`, `js/placement-pool.js` | adaptive Elo test, its position pool and mate search |
| `js/puzzles.js`, `js/drills.js`, `js/openings.js` | puzzle bank, endgame drills, opening names |
| `js/coach.js`, `js/review.js`, `js/explain.js` | move grading, accuracy and written explanations |
| `server.js`, `mailer.js` | static server, online rooms over WebSocket, optional email codes |
| `tools/` | generators for the puzzle and placement data, plus the test suite |

## Tests

Each suite is a plain Node script with no dependencies:

```bash
for f in tools/check-*.js; do node "$f"; done
```

They cover the rules engine (including perft), the search, puzzles, placement,
online protocol, rating, review, drills, achievements, quests, accounts, the
mailer and the error log.

## Copyright and licensing

This project is meant to be free of anyone else's copyrighted material, and it
is:

- **Code** — all of it was written for this project. There are no libraries, no
  vendored snippets, no copied engine or UI code.
- **Artwork** — every piece is hand-written SVG geometry in `js/pieces.js`. There
  are no image files and no icon packs. The favicon and the paper-grain texture
  are inline SVG data URIs written here.
- **Sound** — generated at runtime with the Web Audio API; there are no audio
  files.
- **Fonts** — none are bundled or downloaded. The app uses the operating
  system's own UI font stack.
- **Puzzles and drills** — positions are generated from random material layouts
  and then proven by the engine (`tools/make-puzzles.js`), not copied from any
  puzzle database.
- **Opening names** — the book in `js/openings.js` is a short list of move
  sequences with their common names. Move sequences are facts and the names are
  ordinary chess terminology.
- **Rules of chess** — rules themselves are not copyrightable, and the engine
  implements them from scratch.

Nothing phones home: there is no analytics, no tracking and no third-party
request at runtime. The only outbound call the app can make is your own email
provider, and only if you configure it.

The code is released under the MIT licence, see [LICENSE](LICENSE).

"Gambit" is used here as the name of this project. It is a common chess term;
check your own jurisdiction before using it commercially.
