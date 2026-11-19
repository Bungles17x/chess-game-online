/* Gambit server: static files + online play over WebSocket (no dependencies).
 * Usage: node server.js   ->  http://127.0.0.1:8124
 *
 * Rooms are authoritative: the server keeps a Chess instance per room, checks
 * legality, owns the clocks and decides results. Clients only render state.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const E = require('./js/engine.js');
const { createMailer, loadEnv } = require('./mailer.js');

const root = __dirname;

/* RESEND_API_KEY and RESEND_FROM can live in .env, outside the source. */
loadEnv(path.join(root, '.env'));

const mailer = createMailer({ env: process.env });
const MAX_BODY = 8192;
const requestedPort = Number(process.env.PORT);
const port = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 8124;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

/* ---------------- static files ---------------- */

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch (err) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('bad request'); return; }

  /* Used by hosts' health checks and by the keep-awake job. */
  if (urlPath === '/health') {
    jsonReply(res, 200, { ok: true, rooms: rooms.size, at: Date.now() });
    return;
  }

  if (urlPath === '/api/send-code') {
    handleSendCode(req, res).catch(() => {
      if (!res.headersSent) jsonReply(res, 500, { ok: false, error: 'The mail request failed.' });
      else res.end();
    });
    return;
  }

  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.resolve(root, rel);

  if (!file.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

/* ---------------- verification email endpoint ---------------- */

function jsonReply(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function clientIp(req) {
  return (req.socket && req.socket.remoteAddress) || 'local';
}

/* The page posts from its own origin; anything else is refused. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; }
  catch (err) { return false; }
}

function readJson(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    let done = false;
    const finish = (value) => { if (!done) { done = true; resolve(value); } };

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        finish({ error: 'The request body is too large.' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { finish({ value: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }); }
      catch (err) { finish({ error: 'The request body was not valid JSON.' }); }
    });
    req.on('error', () => finish({ error: 'The request body could not be read.' }));
  });
}

async function handleSendCode(req, res) {
  if (req.method !== 'POST') {
    jsonReply(res, 405, { ok: false, error: 'Use POST for this endpoint.' });
    return;
  }
  if (!sameOrigin(req)) {
    jsonReply(res, 403, { ok: false, error: 'Cross-origin requests are not allowed.' });
    return;
  }
  if (!/^application\/json/i.test(req.headers['content-type'] || '')) {
    jsonReply(res, 415, { ok: false, error: 'Send JSON.' });
    return;
  }

  const read = await readJson(req);
  if (read.error) {
    jsonReply(res, 400, { ok: false, error: read.error });
    return;
  }

  const body = read.value || {};
  if (!body || typeof body !== 'object') {
    jsonReply(res, 400, { ok: false, error: 'Send a JSON object.' });
    return;
  }

  const out = await mailer.sendCode({
    email: body.email,
    code: body.code,
    name: body.name,
    purpose: body.purpose,
    key: clientIp(req) + '|' + String(body.email || '').toLowerCase()
  });

  jsonReply(res, out.status || (out.ok ? 200 : 502), {
    ok: !!out.ok,
    configured: out.configured !== false,
    error: out.error || '',
    retryAfter: out.retryAfter || 0
  });
}

/* ---------------- websocket plumbing ---------------- */

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(key) {
  return crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
}

function frame(payload, opcode) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf8');
  const len = body.length;
  const op = opcode || 1;
  let head;
  if (len < 126) {
    head = Buffer.alloc(2);
    head[1] = len;
  } else if (len < 65536) {
    head = Buffer.alloc(4);
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  head[0] = 0x80 | op;
  return Buffer.concat([head, body]);
}

function send(client, obj) {
  if (!client || client.closed) return;
  try { client.socket.write(frame(JSON.stringify(obj))); } catch (err) { /* gone */ }
}

const clients = new Set();

function addClient(socket) {
  const client = { socket, buf: Buffer.alloc(0), frag: Buffer.alloc(0), room: null, seat: null, closed: false };
  clients.add(client);

  socket.on('data', (chunk) => {
    client.buf = Buffer.concat([client.buf, chunk]);
    drain(client);
  });
  socket.on('error', () => closeClient(client));
  socket.on('close', () => closeClient(client));
  socket.on('end', () => closeClient(client));
}

function drain(client) {
  for (;;) {
    const b = client.buf;
    if (b.length < 2) return;

    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;

    if (len === 126) {
      if (b.length < 4) return;
      len = b.readUInt16BE(2);
      off = 4;
    } else if (len === 127) {
      if (b.length < 10) return;
      len = Number(b.readBigUInt64BE(2));
      off = 10;
    }

    const maskLen = masked ? 4 : 0;
    if (b.length < off + maskLen + len) return;

    let payload = b.subarray(off + maskLen, off + maskLen + len);
    if (masked) {
      const mask = b.subarray(off, off + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    }
    client.buf = b.subarray(off + maskLen + len);

    if (opcode === 8) { closeClient(client); return; }
    if (opcode === 9) { try { client.socket.write(frame(payload, 10)); } catch (err) { /* gone */ } continue; }
    if (opcode === 10) continue;

    if (opcode === 1 || opcode === 0) {
      client.frag = Buffer.concat([client.frag, payload]);
      if (!fin) continue;
      const text = client.frag.toString('utf8');
      client.frag = Buffer.alloc(0);
      let msg;
      try { msg = JSON.parse(text); } catch (err) { continue; }
      onMessage(client, msg);
    }
  }
}

function closeClient(client) {
  if (client.closed) return;
  client.closed = true;
  clients.delete(client);
  leaveRoom(client);
  try { client.socket.destroy(); } catch (err) { /* gone */ }
}

/* ---------------- rooms ---------------- */

const rooms = new Map();

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function clampInt(value, lo, hi, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function cleanName(name) {
  return String(name || '').replace(/[^\w \-'.]/g, '').trim().slice(0, 18);
}

function other(color) { return color === 'w' ? 'b' : 'w'; }

function createRoom(cfg) {
  let code;
  do { code = makeCode(); } while (rooms.has(code));

  const base = clampInt(cfg.base, 0, 7200, 300);
  const inc = clampInt(cfg.inc, 0, 180, 0);
  const room = {
    code,
    chess: new E.Chess(),
    base,
    inc,
    seats: { w: null, b: null },
    names: { w: 'Waiting\u2026', b: 'Waiting\u2026' },
    clocks: { w: base * 1000, b: base * 1000 },
    turnSince: Date.now(),
    started: false,
    result: null,
    sans: [],
    chat: [],
    drawOffer: null,
    rematch: { w: false, b: false }
  };
  rooms.set(code, room);
  return room;
}

function members(room) {
  const out = [];
  clients.forEach((c) => {
    if (c.room === room && !c.closed) out.push(c);
  });
  return out;
}

function roomInfo(room) {
  return {
    code: room.code,
    w: room.names.w,
    b: room.names.b,
    open: !room.seats.w || !room.seats.b,
    base: room.base,
    inc: room.inc,
    live: room.started && !room.result,
    result: room.result ? room.result.code : null,
    moves: room.sans.length,
    watchers: members(room).filter((c) => !c.seat).length
  };
}

function listRooms() {
  return Array.from(rooms.values())
    .filter((r) => members(r).length > 0)
    .map(roomInfo)
    .sort((x, y) => (Number(y.live) - Number(x.live)) || (x.code < y.code ? -1 : 1))
    .slice(0, 48);
}

function pushLobby() {
  const list = listRooms();
  clients.forEach((c) => {
    if (c.lobby && !c.closed) send(c, { t: 'rooms', rooms: list });
  });
}

function bothPresent(room) {
  return !!(room.seats.w && room.seats.b);
}

function clocksLeft(room) {
  const c = { w: room.clocks.w, b: room.clocks.b };
  if (room.base > 0 && room.started && !room.result && bothPresent(room)) {
    const t = room.chess.turn;
    c[t] = Math.max(0, c[t] - (Date.now() - room.turnSince));
  }
  return c;
}

function stateFor(room, client) {
  return {
    t: 'state',
    code: room.code,
    seat: client.seat || null,
    base: room.base,
    inc: room.inc,
    fen: room.chess.fen(),
    sans: room.sans,
    turn: room.chess.turn,
    names: room.names,
    present: { w: room.names.w !== 'Waiting\u2026', b: room.names.b !== 'Waiting\u2026' },
    clocks: clocksLeft(room),
    result: room.result,
    chat: room.chat.slice(-40)
  };
}

function sendState(room) {
  members(room).forEach((c) => send(c, stateFor(room, c)));
}

function broadcast(room, payload) {
  members(room).forEach((c) => send(c, payload));
}

function detectResult(chess) {
  if (!chess.legalMoves().length) {
    if (chess.inCheck()) {
      return { code: chess.turn === 'w' ? 'b' : 'w', reason: 'checkmate' };
    }
    return { code: 'd', reason: 'stalemate' };
  }
  if (chess.isFiftyMove()) return { code: 'd', reason: 'fifty-move rule' };
  if (chess.isThreefold()) return { code: 'd', reason: 'threefold repetition' };
  if (chess.insufficientMaterial()) return { code: 'd', reason: 'insufficient material' };
  return null;
}

function joinRoom(client, rawCode, name) {
  const code = String(rawCode || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) { send(client, { t: 'error', message: 'Room ' + code + ' was not found.' }); return; }

  if (client.room === room) { sendState(room); return; }
  leaveRoom(client);

  let seat = null;
  if (!room.seats.b && room.names.b === 'Waiting\u2026') seat = 'b';
  else if (!room.seats.w && room.names.w === 'Waiting\u2026') seat = 'w';
  else if (!room.seats.w) seat = 'w';
  else if (!room.seats.b) seat = 'b';

  client.room = room;
  client.seat = seat;
  if (seat) {
    room.seats[seat] = client;
    room.names[seat] = cleanName(name) || (seat === 'w' ? 'White' : 'Black');
  }

  if (bothPresent(room) && !room.result) room.turnSince = Date.now();

  sendState(room);
  broadcast(room, { t: 'notice', message: (cleanName(name) || 'A player') + (seat ? ' joined' : ' is spectating') });
  pushLobby();
}

function leaveRoom(client) {
  const room = client.room;
  client.room = null;
  if (!room) return;

  let left = false;
  ['w', 'b'].forEach((color) => {
    if (room.seats[color] === client) {
      room.seats[color] = null;
      room.names[color] = 'Waiting\u2026';
      left = true;
    }
  });
  if (left) {
    room.drawOffer = null;
    room.rematch = { w: false, b: false };
    broadcast(room, { t: 'left' });
    sendState(room);
  }
  client.seat = null;
  if (!members(room).length) rooms.delete(room.code);
  pushLobby();
}

function resetRoom(room) {
  room.chess = new E.Chess();
  room.sans = [];
  room.result = null;
  room.drawOffer = null;
  room.rematch = { w: false, b: false };
  room.clocks = { w: room.base * 1000, b: room.base * 1000 };
  room.turnSince = Date.now();
  room.started = false;
  sendState(room);
}

/* ---------------- protocol ---------------- */

function onMessage(client, msg) {
  const room = client.room;

  switch (msg.t) {
    case 'create': {
      if (client.room) leaveRoom(client);
      const newRoom = createRoom(msg);
      let seat = msg.color === 'b' ? 'b' : msg.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : 'w';
      client.room = newRoom;
      client.seat = seat;
      newRoom.seats[seat] = client;
      newRoom.names[seat] = cleanName(msg.name) || 'Player';
      newRoom.turnSince = Date.now();
      sendState(newRoom);
      pushLobby();
      return;
    }

    case 'join':
      joinRoom(client, msg.code, msg.name);
      return;

    case 'leave':
      leaveRoom(client);
      send(client, { t: 'left' });
      return;

    case 'sync':
      if (room) sendState(room);
      return;

    case 'lobby':
      client.lobby = true;
      send(client, { t: 'rooms', rooms: listRooms() });
      return;

    case 'unlobby':
      client.lobby = false;
      return;

    case 'watch': {
      const watched = rooms.get(String(msg.code || '').toUpperCase().trim());
      if (!watched) return send(client, { t: 'error', message: 'That room has closed.' });
      leaveRoom(client);
      client.room = watched;
      client.seat = null;
      sendState(watched);
      send(client, { t: 'notice', message: 'Watching room ' + watched.code });
      broadcast(watched, { t: 'notice', message: (cleanName(msg.name) || 'A spectator') + ' is watching' });
      pushLobby();
      return;
    }

    case 'quick': {
      if (client.room) leaveRoom(client);
      const base = clampInt(msg.base, 0, 7200, 300);
      const inc = clampInt(msg.inc, 0, 180, 0);
      const name = cleanName(msg.name) || 'Player';

      let target = null;
      rooms.forEach((r) => {
        if (target) return;
        if (!r.quick || r.base !== base || r.inc !== inc || r.result) return;
        if (r.seats.w && !r.seats.b) target = r;
      });

      if (target) {
        client.room = target;
        client.seat = 'b';
        target.seats.b = client;
        target.names.b = name;
        target.turnSince = Date.now();
        sendState(target);
        broadcast(target, { t: 'notice', message: name + ' joined' });
        pushLobby();
      } else {
        const room = createRoom({ base, inc });
        room.quick = true;
        client.room = room;
        client.seat = 'w';
        room.seats.w = client;
        room.names.w = name;
        room.turnSince = Date.now();
        sendState(room);
        send(client, { t: 'notice', message: 'Looking for an opponent\u2026' });
        pushLobby();
      }
      return;
    }

    case 'move': {
      if (!room || !client.seat) return send(client, { t: 'error', message: 'Join a game first.' });
      if (room.result) return send(client, { t: 'error', message: 'The game is over.' });
      if (!bothPresent(room)) return send(client, { t: 'error', message: 'Waiting for an opponent.' });
      if (room.chess.turn !== client.seat) return send(client, { t: 'error', message: 'Not your turn.' });

      const legal = room.chess.legalMoves();
      const move = E.fromUci(String(msg.uci || ''), legal);
      if (!move) return send(client, { t: 'error', message: 'Illegal move.' });

      const now = Date.now();
      const mover = room.chess.turn;
      if (room.base > 0) {
        const spent = room.started ? Math.max(0, now - room.turnSince) : 0;
        room.clocks[mover] = Math.max(0, room.clocks[mover] - spent);
        room.clocks[mover] += room.inc * 1000;
      }

      const san = room.chess.san(move, legal);
      room.chess.make(move);
      room.sans.push(san);
      room.started = true;
      room.turnSince = now;
      room.drawOffer = null;
      room.result = detectResult(room.chess);

      if (room.result && room.base > 0 && room.clocks[mover] === 0) room.result = null;

      broadcast(room, {
        t: 'move',
        uci: E.moveToUci(move),
        san: san,
        fen: room.chess.fen(),
        turn: room.chess.turn,
        clocks: clocksLeft(room),
        result: room.result
      });
      pushLobby();
      return;
    }

    case 'resign': {
      if (!room || !client.seat || room.result) return;
      const winner = other(client.seat);
      room.result = { code: winner, reason: 'resignation' };
      broadcast(room, { t: 'end', result: room.result });
      pushLobby();
      return;
    }

    case 'draw': {
      if (!room || !client.seat || room.result) return;
      if (msg.offer) {
        room.drawOffer = client.seat;
        const opp = room.seats[other(client.seat)];
        if (opp) send(opp, { t: 'drawOffer' });
        send(client, { t: 'notice', message: 'Draw offered.' });
      } else if (msg.accept) {
        if (room.drawOffer && room.drawOffer !== client.seat) {
          room.result = { code: 'd', reason: 'agreement' };
          broadcast(room, { t: 'end', result: room.result });
          pushLobby();
        }
      } else if (msg.decline) {
        room.drawOffer = null;
        const opp = room.seats[other(client.seat)];
        if (opp) send(opp, { t: 'drawDeclined' });
      }
      return;
    }

    case 'rematch': {
      if (!room || !client.seat || !room.result) return;
      room.rematch[client.seat] = true;
      const opp = room.seats[other(client.seat)];
      if (opp) send(opp, { t: 'notice', message: room.names[client.seat] + ' wants a rematch.' });
      if (room.rematch.w && room.rematch.b) resetRoom(room);
      else sendState(room);
      pushLobby();
      return;
    }

    case 'chat': {
      if (!room) return;
      const text = String(msg.text || '').slice(0, 200).trim();
      if (!text) return;
      const entry = { from: room.names[client.seat] || 'Spectator', text, seat: client.seat };
      room.chat.push(entry);
      if (room.chat.length > 80) room.chat.shift();
      broadcast(room, { t: 'chat', chat: room.chat.slice(-40) });
      return;
    }

    default:
      return;
  }
}

/* Clock arbitration: the server owns flag falls. */
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room) => {
    if (!room.started || room.result || room.base === 0 || !bothPresent(room)) return;
    const turn = room.chess.turn;
    if (room.clocks[turn] - (now - room.turnSince) > 0) return;
    room.clocks[turn] = 0;
    const winner = other(turn);
    room.result = { code: winner, reason: 'time' };
    broadcast(room, { t: 'end', result: room.result, clocks: room.clocks });
  });
}, 500).unref();

server.on('upgrade', (req, socket) => {
  if (!/^\/ws(\?|$)/.test(req.url || '')) { socket.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + acceptKey(key)
  ].join('\r\n') + '\r\n\r\n');
  socket.setNoDelay(true);
  addClient(socket);
});

server.listen(port, '0.0.0.0', () => {
  console.log('Gambit server: http://127.0.0.1:' + port);
  console.log('  email delivery: ' + (mailer.configured()
    ? 'on via ' + mailer.transport() + ' as ' + mailer.sender()
    : 'off (add SMTP_USER + SMTP_PASS, or RESEND_API_KEY, to .env)'));
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('  on your network: http://' + net.address + ':' + port);
      }
    });
  });
});
