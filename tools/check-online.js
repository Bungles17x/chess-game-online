/* Two-client integration test for online play.
 * Needs the server running:  node server.js
 */
'use strict';

const WS = globalThis.WebSocket;
if (!WS) {
  console.error('This Node build has no global WebSocket.');
  process.exit(1);
}

const URL = process.env.GAMBIT_WS || 'ws://127.0.0.1:8124/ws';
let failures = 0;

function check(ok, label, detail) {
  if (ok) {
    console.log('PASS  ' + label);
  } else {
    failures++;
    console.log('FAIL  ' + label + (detail ? '  -> ' + detail : ''));
  }
}

function client(tag) {
  const ws = new WS(URL);
  const queue = [];
  const waiters = [];

  function pump() {
    for (let i = 0; i < waiters.length; i++) {
      const w = waiters[i];
      const idx = queue.findIndex(w.pred);
      if (idx >= 0) {
        const msg = queue.splice(idx, 1)[0];
        clearTimeout(w.timer);
        waiters.splice(i, 1);
        i--;
        w.resolve(msg);
      }
    }
  }

  ws.addEventListener('message', (ev) => {
    try { queue.push(JSON.parse(ev.data)); } catch (err) { /* ignore */ }
    pump();
  });

  return {
    ws,
    tag,
    send(obj) { ws.send(JSON.stringify(obj)); },
    open: new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    }),
    next(pred, label, ms) {
      return new Promise((resolve, reject) => {
        const idx = queue.findIndex(pred);
        if (idx >= 0) { resolve(queue.splice(idx, 1)[0]); return; }
        const w = { pred, resolve };
        w.timer = setTimeout(() => {
          const at = waiters.indexOf(w);
          if (at >= 0) waiters.splice(at, 1);
          reject(new Error(tag + ': timed out waiting for ' + label + ' | queued: ' + JSON.stringify(queue)));
        }, ms || 5000);
        waiters.push(w);
      });
    },
    close() { try { ws.close(); } catch (err) { /* ignore */ } }
  };
}

(async () => {
  const a = client('alice');
  const b = client('bob');
  await Promise.all([a.open, b.open]);

  a.send({ t: 'create', name: 'Alice', base: 180, inc: 2, color: 'w' });
  const room = await a.next((m) => m.t === 'state', 'room state');
  check(room.seat === 'w', 'creator is seated as White');
  check(/^[A-Z0-9]{5}$/.test(room.code), 'room code is 5 characters', room.code);
  check(room.present.w === true && room.present.b === false, 'room starts waiting for an opponent');
  check(room.base === 180 && room.inc === 2, 'time control echoed back');

  b.send({ t: 'join', code: room.code.toLowerCase(), name: 'Bob' });
  const bobState = await b.next((m) => m.t === 'state', 'join state');
  const aliceSees = await a.next((m) => m.t === 'state' && m.present.b, 'alice sees join');
  check(bobState.seat === 'b', 'opponent is seated as Black');
  check(aliceSees.names.w === 'Alice' && aliceSees.names.b === 'Bob', 'names exchanged');
  check(aliceSees.present.w && aliceSees.present.b, 'both players present');

  a.send({ t: 'move', uci: 'e2e4' });
  const mvA = await a.next((m) => m.t === 'move', 'alice move');
  const mvB = await b.next((m) => m.t === 'move', 'bob move');
  check(mvA.san === 'e4' && mvB.san === 'e4', 'move replayed as e4 on both clients');
  check(mvA.turn === 'b' && mvB.turn === 'b', 'turn passes to Black');
  check(mvA.clocks.w === 180000 + 2000, 'increment added to White', JSON.stringify(mvA.clocks));
  check(typeof mvA.fen === 'string' && mvA.fen.indexOf(' b ') > 0, 'fen broadcast');

  a.send({ t: 'move', uci: 'd2d4' });
  const notTurn = await a.next((m) => m.t === 'error', 'not your turn error');
  check(/Not your turn/.test(notTurn.message), 'server rejects moving out of turn', notTurn.message);

  b.send({ t: 'move', uci: 'a7a8' });
  const badTurn = await b.next((m) => m.t === 'error', 'illegal move error');
  check(/Illegal/.test(badTurn.message), 'server rejects illegal moves', badTurn.message);

  b.send({ t: 'move', uci: 'e7e5' });
  await a.next((m) => m.t === 'move', 'black replies');
  const reply = await b.next((m) => m.t === 'move', 'black replies echoed');
  check(reply.san === 'e5', 'black move accepted');

  a.send({ t: 'chat', text: 'good luck' });
  const chat = await b.next((m) => m.t === 'chat', 'chat');
  const lastChat = chat.chat[chat.chat.length - 1];
  check(lastChat.text === 'good luck' && lastChat.from === 'Alice', 'chat is delivered with sender', JSON.stringify(lastChat));

  b.send({ t: 'draw', offer: true });
  await a.next((m) => m.t === 'drawOffer', 'draw offer');
  a.send({ t: 'draw', accept: true });
  const endA = await a.next((m) => m.t === 'end', 'draw end (alice)');
  const endB = await b.next((m) => m.t === 'end', 'draw end (bob)');
  check(endA.result.code === 'd' && endB.result.code === 'd', 'draw by agreement ends the game');

  a.send({ t: 'rematch' });
  const partial = await a.next((m) => m.t === 'state', 'rematch partial state');
  check(partial.result && partial.result.code === 'd', 'rematch needs both players');
  b.send({ t: 'rematch' });
  const fresh = await a.next((m) => m.t === 'state' && m.sans.length === 0, 'rematch reset');
  check(fresh.result === null && fresh.sans.length === 0, 'both players reset the board');

  a.send({ t: 'chat', text: '<img src=x onerror=alert(1)>' });
  const raw = await b.next((m) => m.t === 'chat', 'raw chat');
  check(raw.chat[raw.chat.length - 1].text.indexOf('<img') === 0, 'chat text is passed through verbatim (client renders as text)');

  a.send({ t: 'move', uci: 'd2d4' });
  await a.next((m) => m.t === 'move', 'move after rematch');

  b.close();
  const leftMsg = await a.next((m) => m.t === 'left' || (m.t === 'state' && !m.present.b), 'opponent left');
  check(leftMsg.t === 'left' || !leftMsg.present.b, 'opponent departure is announced');

  a.send({ t: 'lobby' });
  const lobby = await a.next((m) => m.t === 'rooms', 'room list');
  const mine = lobby.rooms.find((r) => r.code === room.code);
  check(!!mine, 'room appears in the lobby list');
  check(mine && mine.open === true, 'room with a free seat is listed as open');
  check(mine && mine.moves === 1, 'lobby reports the move count', mine && String(mine.moves));

  const c = client('carol');
  await c.open;
  c.send({ t: 'watch', code: room.code, name: 'Carol' });
  const watchState = await c.next((m) => m.t === 'state', 'spectator state');
  check(watchState.seat === null, 'watcher joins as a spectator');
  check(watchState.sans.length === 1, 'spectator receives the move history', String(watchState.sans.length));
  c.close();

  const d = client('dave');
  const e = client('erin');
  await Promise.all([d.open, e.open]);
  d.send({ t: 'quick', name: 'Dave', base: 60, inc: 0 });
  const dState = await d.next((m) => m.t === 'state', 'quick host state');
  e.send({ t: 'quick', name: 'Erin', base: 60, inc: 0 });
  const eState = await e.next((m) => m.t === 'state', 'quick guest state');
  check(dState.seat === 'w' && eState.seat === 'b', 'quick match seats both players');
  check(dState.code === eState.code, 'quick match pairs into one room', dState.code + '/' + eState.code);
  const hostSees = await d.next((m) => m.t === 'state' && m.present.b, 'host sees guest');
  check(hostSees.names.b === 'Erin', 'quick match exchanges names');

  d.send({ t: 'resign' });
  const resignEnd = await e.next((m) => m.t === 'end', 'resign end');
  check(resignEnd.result.code === 'b' && resignEnd.result.reason === 'resignation',
    'resignation carries a result code', JSON.stringify(resignEnd.result));

  d.close();
  e.close();

  a.close();
  await new Promise((r) => setTimeout(r, 250));

  console.log(failures ? '\n' + failures + ' online check(s) FAILED' : '\nall online checks passed');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error('\nonline check crashed:', err.message);
  process.exit(1);
});
