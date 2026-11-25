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
const AC = require('./js/anticheat.js');
const { createModeration } = require('./moderation.js');
const { createMailer, loadEnv } = require('./mailer.js');

const root = __dirname;

/* RESEND_API_KEY and RESEND_FROM can live in .env, outside the source. */
loadEnv(path.join(root, '.env'));

const mailer = createMailer({ env: process.env });
const MAX_BODY = 8192;
const MAX_FRAME = 8192;

/* GAMBIT_AC_STRICT=1 lowers every fair-play threshold. It exists so the ban
   test can walk the whole ladder in a second instead of a fortnight. */
const AC_RULES = AC.withRules(process.env.GAMBIT_AC_STRICT === '1' ? {
  messagesPerWindow: 3,
  chatPerWindow: 2,
  syncPerWindow: 2,
  illegalPerWindow: 1,
  instantMovesPerWindow: 2,
  instantMoveMs: 5000,
  instantMinLegal: 1,
  repeatMs: 0,
  warnAt: 1,
  minBanAt: 4,
  hourBanAt: 5,
  dayBanAt: 7,
  permBanAt: 9
} : null);

/* The owner console is off unless the host sets this. It is never sent to a
   page and never written to the repo. */
const OWNER_KEY = String(process.env.OWNER_KEY || '').trim();

/* Bans are keyed by address and kept on disk when there is a disk. */
const moderation = createModeration({
  file: process.env.GAMBIT_BANS || path.join(root, 'data', 'bans.json'),
  rules: AC_RULES
});
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
    jsonReply(res, 200, { ok: true, rooms: rooms.size, bans: moderation.count(), at: Date.now() });
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

/* Behind a host's proxy the socket address is the proxy, so bans have to key on
   the forwarded chain. Only the last hop is trustworthy: the earlier entries
   are whatever the client chose to send. */
function banKey(req) {
  const chain = String(req.headers['x-forwarded-for'] || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const ip = chain.length ? chain[chain.length - 1] : clientIp(req);
  return ip.replace(/^::ffff:/, '');
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

function addClient(socket, ip) {
  const client = {
    socket,
    ip: ip || 'local',
    name: '',
    guard: AC.createGuard(AC_RULES),
    buf: Buffer.alloc(0),
    frag: Buffer.alloc(0),
    room: null,
    seat: null,
    closed: false,
    ban: null
  };
  clients.add(client);

  socket.on('data', (chunk) => {
    client.buf = Buffer.concat([client.buf, chunk]);
    drain(client);
  });
  socket.on('error', () => closeClient(client));
  socket.on('close', () => closeClient(client));
  socket.on('end', () => closeClient(client));
  return client;
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

    if (len > MAX_FRAME) { closeClient(client); return; }

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
  if (client.banClose) { clearTimeout(client.banClose); client.banClose = null; }
  clients.delete(client);
  leaveRoom(client);
  try { client.socket.destroy(); } catch (err) { /* gone */ }
}

/* ---------------- fair play ---------------- */

function warnDetail(id, points) {
  const meta = AC.FINDINGS[id] || { label: 'Fair play', detail: '' };
  const next = (Number(points) || 0) + 1 >= AC_RULES.minBanAt
    ? ' Another finding pauses online play.'
    : ' Points add up; enough of them pause online play.';
  return meta.label + ' — ' + meta.detail + next;
}

/* Score the findings a guard just reported. A warning is a message; a ban is
   the end of the connection, with the opponent awarded the game. */
function strike(client, ids) {
  if (!client || client.ban) return;
  const list = ids || [];

  for (let i = 0; i < list.length; i++) {
    const out = moderation.strike(client.ip, { finding: list[i], name: client.name || '' });
    if (!out) continue;

    if (out.action === 'ban') {
      banClient(client, out.ban);
      return;
    }

    if (out.action === 'warn' && out.scored) {
      send(client, {
        t: 'warn',
        message: out.verdict.label,
        detail: warnDetail(list[i], out.points),
        points: out.points
      });
    }
  }
}

/* A ban's length in words, for the message the other seat reads. */
function banTerm(ban) {
  if (!ban || ban.severity === 'permanent') return 'a permanent ban';
  const mins = Math.round((Number(ban.expiresAt) - Number(ban.issuedAt)) / 60000);
  if (mins >= 24 * 60) return 'a 24-hour ban';
  if (mins >= 60) return 'a 1-hour ban';
  return 'a ' + Math.max(1, mins) + '-minute ban';
}

function banClient(client, ban) {
  if (!client || client.ban) return;
  client.ban = ban;

  /* A ban mid-game is a loss: the other seat gets the point, not a hang. The
     result carries a plain-language note so the opponent is told the player
     was removed and why, not just that the game ended. */
  const room = client.room;
  const opponent = room && client.seat ? room.seats[other(client.seat)] : null;
  if (room && client.seat && opponent && !room.result) {
    const who = room.names[client.seat] || 'Your opponent';
    const note = ban.test
      ? who + ' was removed from online play by the owner (' + banTerm(ban) + ').'
      : who + ' was banned for fair play (' + banTerm(ban) + ').';
    room.result = { code: other(client.seat), reason: 'fair play', note };
    broadcast(room, { t: 'end', result: room.result });
    broadcast(room, { t: 'notice', message: note });
    pushLobby();
  }

  send(client, { t: 'banned', ban: AC.publicBan(ban) });
  console.log('  fair play: ' + ban.id + ' ' + ban.severity + ' ban for ' + client.ip);

  /* An authenticated owner keeps the connection: undoing a test ban is the
     whole point. Everyone else gets the frame, then the socket goes away. */
  if (client.owner) return;
  client.banClose = setTimeout(() => closeClient(client), 4000);
  if (client.banClose.unref) client.banClose.unref();
}

/* A player's own standing: points and the public ladder, never the address or
   anyone else's record. */
function standingFor(ip) {
  const record = moderation.get(ip);
  const current = moderation.check(ip);
  return {
    t: 'standing',
    points: record.points,
    warnAt: AC_RULES.warnAt,
    minBanAt: AC_RULES.minBanAt,
    hourBanAt: AC_RULES.hourBanAt,
    dayBanAt: AC_RULES.dayBanAt,
    permBanAt: AC_RULES.permBanAt,
    warned: !!record.warned,
    ban: current ? AC.publicBan(current) : null
  };
}

/* A player's report about the other seat. It is private: the accused is never
   told, and only the owner's status carries the list. */
function handleReport(client, msg) {
  const room = client.room;
  if (!room || !client.seat) return send(client, { t: 'error', message: 'Join a game before reporting.' });

  const accusedSeat = other(client.seat);
  /* The seat can be empty: a disconnect must not make the report impossible. */
  const accused = room.seats[accusedSeat]
    ? room.names[accusedSeat]
    : (room.lastNames && room.lastNames[accusedSeat]);
  if (!accused) return send(client, { t: 'error', message: 'There is no opponent to report.' });

  const reason = String(msg.reason || '');
  /* A plain lookup would also accept 'constructor' and friends. */
  const label = Object.prototype.hasOwnProperty.call(REPORT_REASONS, reason) ? REPORT_REASONS[reason] : '';
  if (!label) return send(client, { t: 'error', message: 'Pick a reason for the report.' });

  const now = Date.now();
  const rate = reportRate.get(client.ip) || { count: 0, since: now };
  if (now - rate.since > REPORT_WINDOW_MS) { rate.count = 0; rate.since = now; }
  if (rate.count >= REPORTS_PER_WINDOW) {
    return send(client, { t: 'error', message: 'Too many reports. Try again in a few minutes.' });
  }
  rate.count++;
  reportRate.set(client.ip, rate);

  const note = String(msg.note || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
  const report = {
    id: 'RP-' + crypto.randomBytes(2).toString('hex').toUpperCase(),
    at: now,
    room: room.code,
    reporter: room.names[client.seat] || 'Player',
    accused,
    reason,
    label,
    note
  };
  reports.push(report);
  if (reports.length > REPORTS_MAX) reports.shift();

  console.log('  report: ' + report.id + ' ' + report.reporter + ' -> ' + report.accused + ' (' + report.label + ')');
  send(client, { t: 'reportOk', id: report.id });
}

/* ---------------- owner tools ---------------- */

function ownerMatches(input) {
  if (!OWNER_KEY) return false;
  const given = crypto.createHash('sha256').update(String(input || '')).digest();
  const real = crypto.createHash('sha256').update(OWNER_KEY).digest();
  return crypto.timingSafeEqual(given, real);
}

/* Wrong-key attempts are counted per address, so a new socket does not reset
   the count. Memory only: an owner lockout need not survive a restart. */
const ownerFails = new Map();

function ownerStatus(client) {
  const record = moderation.get(client.ip);
  const current = moderation.check(client.ip);
  return {
    ip: client.ip,
    points: record.points,
    threshold: AC_RULES.permBanAt,
    warnAt: AC_RULES.warnAt,
    minBanAt: AC_RULES.minBanAt,
    hourBanAt: AC_RULES.hourBanAt,
    dayBanAt: AC_RULES.dayBanAt,
    bans: record.bans.length,
    ban: current ? AC.publicBan(current) : null,
    reports: reports.slice(-20).reverse(),
    findings: Object.keys(record.findings).map((id) => ({
      id,
      label: (AC.FINDINGS[id] && AC.FINDINGS[id].label) || id,
      count: record.findings[id].count,
      weight: AC_RULES.weight[id] || 0
    })),
    server: {
      rooms: rooms.size,
      strict: process.env.GAMBIT_AC_STRICT === '1',
      uptime: Math.round(process.uptime()),
      ledger: moderation.file ? path.basename(moderation.file) : 'memory'
    }
  };
}

function ownerOk(client, payload) {
  send(client, Object.assign({ t: 'owner', ok: true, status: ownerStatus(client) }, payload));
}

/* A refused caller gets the reason and nothing else: the status object names an
   address and describes its record, so it is for authenticated eyes only. */
function ownerNo(client, error) {
  send(client, { t: 'owner', ok: false, error });
}

/* The owner console over the existing socket: the same ledger and the same ban
   path the automatic system uses, so what is tested is what ships. */
function handleOwner(client, msg) {
  if (!OWNER_KEY) {
    return ownerNo(client, 'Owner tools are off on this server. Set OWNER_KEY in its environment.');
  }

  const now = Date.now();
  const fail = ownerFails.get(client.ip) || { tries: 0, until: 0 };

  if (fail.until && now < fail.until) {
    const mins = Math.max(1, Math.ceil((fail.until - now) / 60000));
    return ownerNo(client, 'Too many wrong keys. Owner tools are locked for ' + mins + ' min.');
  }

  if (!ownerMatches(msg.key)) {
    fail.tries++;
    if (fail.tries >= 5) {
      fail.tries = 0;
      fail.until = now + 10 * 60000;
    }
    ownerFails.set(client.ip, fail);
    return ownerNo(client, 'That key is not right.');
  }

  ownerFails.delete(client.ip);
  client.owner = true;
  /* A banned owner may still drive the tools from this connection. */
  if (client.banClose) { clearTimeout(client.banClose); client.banClose = null; }

  const action = String(msg.action || 'status');
  const me = client.ip;
  const label = cleanName(msg.name) || 'Owner test';

  if (action === 'status') return ownerOk(client, { action: 'status' });

  if (action === 'strike') {
    if (moderation.check(me)) return ownerNo(client, 'Already banned. Lift it before scoring another finding.');
    const finding = String(msg.finding || 'illegal');
    const out = moderation.strike(me, { finding, name: label });
    if (!out) return ownerNo(client, 'Unknown finding.');

    if (out.action === 'ban') {
      ownerOk(client, { action: 'strike', points: out.points, verdict: out.verdict.label, banId: out.ban.id });
      banClient(client, out.ban);
      return;
    }
    return ownerOk(client, { action: 'strike', points: out.points, verdict: out.verdict.label || 'No warning yet' });
  }

  if (action === 'ban') {
    if (moderation.check(me)) return ownerNo(client, 'Already banned. Lift it first.');
    const record = moderation.ban(me, {
      permanent: !!msg.permanent,
      ms: Number(msg.ms) || undefined,
      name: label
    });
    ownerOk(client, { action: 'ban', banId: record.id, permanent: record.severity === 'permanent' });
    banClient(client, record);
    return;
  }

  if (action === 'lift') {
    /* With a reference the panel can lift any address's ban, not just the
       caller's; without one it keeps the original "lift mine" behaviour. */
    const wanted = String(msg.banId || '').trim();
    const current = wanted
      ? moderation.lift(wanted)
      : (moderation.check(me) || moderation.latest(me));
    if (!current) {
      return ownerNo(client, wanted ? 'That ban is not active any more.' : 'Nothing to lift on this address.');
    }
    if (!wanted) moderation.lift(current.id);
    if (client.ban && client.ban.id === current.id) client.ban = null;
    if (client.banClose) { clearTimeout(client.banClose); client.banClose = null; }
    return ownerOk(client, { action: 'lift', banId: current.id });
  }

  if (action === 'reset') {
    moderation.reset(me);
    client.ban = null;
    if (client.banClose) { clearTimeout(client.banClose); client.banClose = null; }
    return ownerOk(client, { action: 'reset' });
  }

  if (action === 'list') {
    return ownerOk(client, {
      action: 'list',
      count: moderation.count(),
      bans: moderation.activeBans().map(AC.publicBan),
      records: moderation.list()
    });
  }

  return ownerNo(client, 'Unknown owner action.');
}

/* ---------------- rooms ---------------- */

const rooms = new Map();

/* Player reports are kept in memory only: they name two players and are for the
   owner to read, not for scoring and not for automatic action. */
const REPORTS_MAX = 100;
const REPORTS_PER_WINDOW = 3;
const REPORT_WINDOW_MS = 10 * 60 * 1000;
const REPORT_REASONS = {
  engine: 'Engine or outside help',
  stall: 'Stalling or refusing to play',
  abuse: 'Abusive chat',
  other: 'Something else'
};
const reports = [];
const reportRate = new Map();

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
    client.name = room.names[seat];
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
      /* Keep the last real name so the other seat can still report this player
         after a disconnect. */
      if (room.names[color] && room.names[color] !== 'Waiting\u2026') {
        room.lastNames = room.lastNames || { w: '', b: '' };
        room.lastNames[color] = room.names[color];
      }
      room.seats[color] = null;
      room.names[color] = 'Waiting\u2026';
      left = true;
    }
  });
  if (left) {
    room.drawOffer = null;
    room.rematch = { w: false, b: false };
    /* Once there is a result the seat change is just state; a "left" notice
       would talk over the result card. A banned player leaves this way. */
    if (!room.result) broadcast(room, { t: 'left' });
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
  if (!msg || typeof msg !== 'object') return;

  /* Owner tools have to work on a banned connection: undoing the test is the
     point, and the key is checked before anything happens. */
  if (msg.t === 'owner') {
    handleOwner(client, msg);
    return;
  }

  /* Reading your own points is not traffic; it must not count as a message. */
  if (msg.t === 'standing') {
    send(client, standingFor(client.ip));
    return;
  }

  if (client.ban) return;

  strike(client, client.guard.note('message'));
  if (client.ban) return;

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
      client.name = newRoom.names[seat];
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
      strike(client, client.guard.note('sync'));
      if (client.ban) return;
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
      client.name = cleanName(msg.name) || client.name;
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
      client.name = name;

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
      const think = room.started ? Math.max(0, Date.now() - room.turnSince) : 0;
      const move = E.fromUci(String(msg.uci || ''), legal);

      if (!move) {
        strike(client, client.guard.note('illegal'));
        if (client.ban) return;
        return send(client, { t: 'error', message: 'Illegal move.' });
      }

      strike(client, client.guard.note('move', { thinkMs: think, legal: legal.length }));
      if (client.ban) return;

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

    case 'report':
      handleReport(client, msg);
      return;

    case 'chat': {
      if (!room) return;
      const text = String(msg.text || '').slice(0, 200).trim();
      if (!text) return;
      strike(client, client.guard.note('chat'));
      if (client.ban) return;
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

  /* The handshake is completed even for a banned address: the page can then
     show the ban screen instead of an unexplained connection failure. */
  const client = addClient(socket, banKey(req));
  const ban = moderation.check(client.ip);
  if (ban) banClient(client, ban);
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
