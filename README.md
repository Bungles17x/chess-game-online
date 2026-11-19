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
branch by GitHub Pages. It is the same app minus what a static host cannot do:
online rooms and emailed sign-in codes need `node server.js`, so those controls
are disabled there (with a note saying why) and everything else — the computer,
puzzles, drills, review, the coach and the Elo test — runs in the browser.

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
