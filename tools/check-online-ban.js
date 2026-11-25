/* Integration test for the automatic fair-play ban.
 *
 * Starts its own server on port 8131 with GAMBIT_AC_STRICT=1 (tiny thresholds),
 * floods it, and checks the warning, the ban frame and the refusal afterwards.
 * Runs no other test's state: the ban file lives in a temp directory.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const WS = globalThis.WebSocket;
if (!WS) {
  console.error('This Node build has no global WebSocket.');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const port = 8131;
const OWNER = 'test-owner-key';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gambit-ban-'));
const bansFile = path.join(dir, 'bans.json');
let failures = 0;
let serverOut = '';

function check(ok, label, detail) {
  if (ok) {
    console.log('PASS  ' + label);
  } else {
    failures++;
    console.log('FAIL  ' + label + (detail ? '  -> ' + detail : ''));
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function health() {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 800 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (err) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function waitFor(fn, ms, label) {
  const until = Date.now() + (ms || 6000);
  while (Date.now() < until) {
    const value = await fn();
    if (value) return value;
    await sleep(80);
  }
  throw new Error('timed out waiting for ' + label);
}

function client() {
  const ws = new WS('ws://127.0.0.1:' + port + '/ws');
  const seen = [];
  const closed = { value: false };

  ws.addEventListener('message', (ev) => {
    try { seen.push(JSON.parse(ev.data)); } catch (err) { /* ignore */ }
  });
  ws.addEventListener('close', () => { closed.value = true; });

  return {
    ws,
    seen,
    closed,
    open: new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', () => reject(new Error('socket error')));
    }),
    send(obj) { ws.send(JSON.stringify(obj)); },
    /* Consume what is matched, so a later wait does not read the same frame. */
    wait(pred, ms, label) {
      return waitFor(() => {
        const at = seen.findIndex(pred);
        return at >= 0 ? seen.splice(at, 1)[0] : null;
      }, ms, label);
    }
  };
}

(async () => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: Object.assign({}, process.env, {
      PORT: String(port),
      GAMBIT_BANS: bansFile,
      GAMBIT_AC_STRICT: '1',
      OWNER_KEY: OWNER
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', (d) => { serverOut += d.toString(); });
  server.stderr.on('data', (d) => { serverOut += d.toString(); });
  server.on('error', (err) => { serverOut += '\nspawn error: ' + err.message; });
  server.on('exit', (code, signal) => {
    serverOut += '\nserver exited: code=' + code + ' signal=' + signal;
  });

  try {
    const boot = await waitFor(health, 10000, 'the server to come up');
    check(!!boot && boot.ok === true, 'the test server starts');
    check(boot && boot.bans === 0, 'it starts with no bans', String(boot && boot.bans));

    const a = client();
    await a.open;

    /* Five lookups is already over the strict window of three. */
    for (let i = 0; i < 8; i++) a.send({ t: 'lobby' });

    const warn = await a.wait((m) => m.t === 'warn', 5000, 'a fair-play warning');
    check(warn.message === 'Fair-play warning', 'the first offence warns', warn.message);
    check(/Another flag/.test(warn.detail || ''), 'the warning explains what comes next', warn.detail);

    const banned = await a.wait((m) => m.t === 'banned', 5000, 'a ban frame');
    check(/^GB-[0-9A-F]{4}-[0-9A-F]{4}$/.test(banned.ban.id), 'the ban has a reference', banned.ban.id);
    check(banned.ban.severity === 'temporary', 'the first ban is temporary', banned.ban.severity);
    check(banned.ban.expiresAt > banned.ban.issuedAt, 'it carries an expiry', JSON.stringify(banned.ban.expiresAt));
    check(banned.ban.ip === undefined, 'the payload hides the address');
    check((banned.ban.findings || []).some((f) => f.id === 'flood'), 'the payload lists the finding');
    check(Array.isArray(banned.ban.findings) && banned.ban.findings[0].label, 'findings have readable labels');

    await waitFor(() => a.closed.value, 7000, 'the socket to close');
    check(a.closed.value, 'a banned connection is closed');

    const b = client();
    await b.open;
    const again = await b.wait((m) => m.t === 'banned', 4000, 'the ban on reconnect');
    check(again.ban.id === banned.ban.id, 'reconnecting is refused with the same reference');
    await waitFor(() => b.closed.value, 7000, 'the second socket to close');

    const after = await health();
    check(after && after.bans === 1, 'the health check reports the ban', String(after && after.bans));
    check(fs.existsSync(bansFile), 'the ban ledger is written to disk');

    const ledger = JSON.parse(fs.readFileSync(bansFile, 'utf8'));
    const saved = (ledger.records || []).find((r) => (r.bans || []).length);
    check(!!saved && saved.points >= 4, 'the ledger keeps the score', saved && String(saved.points));
    check(!!saved && saved.bans[0].id === banned.ban.id, 'the ledger keeps the reference');

    /* --- owner tools, still on a banned address --- */
    const admin = client();
    await admin.open;

    const onConnect = await admin.wait((m) => m.t === 'banned', 4000, 'the ban on connect');
    check(onConnect.ban.id === banned.ban.id, 'a banned address is told why when it connects');

    admin.send({ t: 'owner', key: 'wrong-key', action: 'status' });
    const refused = await admin.wait((m) => m.t === 'owner' && !m.ok, 4000, 'the key refusal');
    check(/key is not right/i.test(refused.error || ''), 'a wrong owner key is refused', refused.error);
    check(refused.status === undefined, 'a refusal does not leak the record');

    admin.send({ t: 'owner', key: OWNER, action: 'status' });
    const state = await admin.wait((m) => m.t === 'owner' && m.ok, 4000, 'owner status');
    check(!!(state.status && state.status.ban), 'the owner sees the live ban', JSON.stringify(state.status));

    admin.send({ t: 'owner', key: OWNER, action: 'lift' });
    const lift = await admin.wait((m) => m.t === 'owner' && m.action === 'lift', 4000, 'owner lift');
    check(lift.ok === true, 'the owner can lift a ban mid-block');
    check((await health()).bans === 0, 'lifting clears the ban count');

    admin.send({ t: 'owner', key: OWNER, action: 'ban' });
    const manual = await admin.wait((m) => m.t === 'owner' && m.action === 'ban', 4000, 'owner test ban');
    check(manual.ok && /^GB-/.test(manual.banId), 'the owner can issue a test ban', manual.banId);

    const manualFrame = await admin.wait((m) => m.t === 'banned', 4000, 'the test ban frame');
    check(manualFrame.ban.id === manual.banId, 'the test ban reaches the screen');
    check(manualFrame.ban.reasonLabel === 'Owner test ban', 'the test ban is labelled as a test', manualFrame.ban.reasonLabel);

    admin.send({ t: 'owner', key: OWNER, action: 'lift' });
    const liftAgain = await admin.wait((m) => m.t === 'owner' && m.action === 'lift', 4000, 'second lift');
    check(liftAgain.ok === true, 'a test ban can be lifted again');

    admin.send({ t: 'owner', key: OWNER, action: 'reset' });
    const cleared = await admin.wait((m) => m.t === 'owner' && m.action === 'reset', 4000, 'a clean record');
    check(cleared.ok && cleared.status.points === 0, 'reset clears the score before the strike test');

    admin.send({ t: 'owner', key: OWNER, action: 'strike', finding: 'illegal' });
    const firstStrike = await admin.wait((m) => m.t === 'owner' && m.action === 'strike', 4000, 'a scored finding');
    check(firstStrike.points === 3, 'a scored finding adds its weight', String(firstStrike.points));

    admin.send({ t: 'owner', key: OWNER, action: 'strike', finding: 'illegal' });
    await admin.wait((m) => m.t === 'banned', 4000, 'the ladder ban');
    check(true, 'scoring past the strict threshold bans');

    admin.send({ t: 'owner', key: OWNER, action: 'reset' });
    const reset = await admin.wait((m) => m.t === 'owner' && m.action === 'reset', 4000, 'owner reset');
    check(reset.ok && reset.status.points === 0, 'reset clears the score');
    check((await health()).bans === 0, 'reset also clears the ban');
  } catch (err) {
    failures++;
    console.log('FAIL  ' + err.message);
    if (serverOut) console.log('\n--- server output ---\n' + serverOut);
  } finally {
    server.kill();
    await sleep(200);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) { /* ignore */ }
  }

  console.log(failures ? '\n' + failures + ' ban check(s) FAILED' : '\nall ban checks passed');
  process.exit(failures ? 1 : 0);
})();
