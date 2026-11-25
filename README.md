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
| `server.js`, `mailer.js`, `moderation.js` | static server, online rooms over WebSocket, optional email codes, the ban ledger |
| `js/anticheat.js` | fair-play detector and ban ladder, shared by the server and the page |
| `tools/` | generators for the puzzle and placement data, plus the test suite |

## Testing the fair play system

The server scores traffic, not people: message floods, chat spam, repeated
`sync`, illegal moves and machine-speed play. Three ways to see it working,
from safest to most real.

### Automated

```bash
node tools/check-anticheat.js     # the detector, the ladder and the ledger
node tools/check-online-ban.js    # starts its own server on :8131 with tiny
                                  # thresholds and walks warning -> ban -> lift
```

Neither one touches the deployed server or your own address.

### Fair-play points

Every confirmed finding adds 1–3 points to the address. The first scored
finding is always a warning, whatever its weight, so a single 3-point illegal or
machine-timing hit cannot skip to a ban. After that the ladder is 3 (a 5-minute
ban), 6 (1 hour), 11 (24 hours) and 30 (permanent), with 2 as the warning band.
Points never touch offline play, puzzles, stats or rating. The profile shows the
rule and the ladder even at zero points, and when a ban lands mid-game the game
ends with a note naming the banned player and the length of the ban. The
player-facing rules live in `terms.html`.

### The owner panel (live)

The panel is not linked anywhere in the player UI. It lives at `#owner` and only
renders after the server accepts the key, so a visitor never sees it.

1. Give the server a key. Locally: copy `.env.example` to `.env` and set
   `OWNER_KEY=` to any long random string. On Render: **Environment → add
   `OWNER_KEY` → save**, which redeploys the service.
2. Restart the local server, or wait for the Render deploy.
3. Open `https://…/#owner` (or `http://127.0.0.1:8124/#owner`), paste the key
   and press **Unlock**. The key is kept in this browser only; the nav grows an
   **Owner** tab until you press **Lock panel**. On phones that tab sits first
   in the bottom dock, so you can always come back to the panel.

What is on it:

| Card | What it does |
| --- | --- |
| Your record | risk score and meter, bans, live ban countdown, findings with their weights |
| Server | rooms, strict mode, uptime and the ledger file |
| Test bans | 10 minutes, 1 hour, 24 hours, permanent; preview, lift, reset |
| Score a finding | one Strike per detector finding, scored with the real weights |
| Active bans | every live ban with its reference, reason, time left and a Lift button |
| Watchlist | every address with points or bans, its findings and its state |
| Session log | what this browser did this session |

Test bans are real bans: the block, the countdown and the ban screen are the
ones players get. Lift them from the panel or from the ban screen's **Owner
tools** row. Lift buttons in **Active bans** work on any address, not just
yours.

Five wrong keys lock the panel for ten minutes, and the key is only ever sent to
your own server. With no `OWNER_KEY` set, the server refuses every owner action
and the panel says so.

`js/config.js` sends a page served from `localhost` or `127.0.0.1` to the local
server automatically, so `node server.js` plus `http://127.0.0.1:8124/#owner`
uses the `OWNER_KEY` in `.env`. The published page still talks to the deployed
server, which needs the same key in its environment.

### A hostile client, with the thresholds turned down

```bash
GAMBIT_AC_STRICT=1 node server.js
node -e "const w=new WebSocket('ws://127.0.0.1:8124/ws');w.onopen=()=>{for(let i=0;i<20;i++)w.send(JSON.stringify({t:'lobby'}))};w.onmessage=e=>console.log(e.data)"
```

The first command lowers the ladder to a handful of messages; the second is a
client that does nothing but flood. You should see a warning, then a ban frame,
then the socket close. **Reset my record** clears it, or delete
`data/bans.json`. `GAMBIT_BANS` points the ledger at a different file.

The live server's disk is not permanent on a free host, so bans survive a
restart only until the next deploy there.

## Tests

Each suite is a plain Node script with no dependencies:

```bash
for f in tools/check-*.js; do node "$f"; done
```

They cover the rules engine (including perft), the search, puzzles, placement,
online protocol, fair play and its ban ledger, rating, review, drills,
achievements, quests, accounts, the mailer and the error log.

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
