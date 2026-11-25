/* Unit checks for the fair-play detector, the sentence ladder and the ledger.
 * No server needed.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const AC = require('../js/anticheat.js');
const { createModeration } = require('../moderation.js');

let failures = 0;

function check(ok, label, detail) {
  if (ok) {
    console.log('PASS  ' + label);
  } else {
    failures++;
    console.log('FAIL  ' + label + (detail ? '  -> ' + detail : ''));
  }
}

/* ---------------- guard: clean traffic stays quiet ---------------- */

const clean = AC.createGuard(AC.withRules());
let cleanHits = [];
for (let i = 0; i < 60; i++) {
  const at = 1000 + i * 1500;
  cleanHits = cleanHits.concat(clean.note('message', { now: at }));
  cleanHits = cleanHits.concat(clean.note('move', { now: at, thinkMs: 2400, legal: 30 }));
  if (i % 5 === 0) cleanHits = cleanHits.concat(clean.note('chat', { now: at }));
}
check(cleanHits.length === 0, 'a normal game raises no findings', JSON.stringify(cleanHits));

/* ---------------- guard: each signal fires on its own ---------------- */

function flood(limit) {
  const g = AC.createGuard(AC.withRules({ messagesPerWindow: limit }));
  let hits = [];
  for (let i = 0; i < limit; i++) hits = hits.concat(g.note('message', { now: 1000 + i }));
  const before = hits.length;
  const after = g.note('message', { now: 1000 + limit });
  return { before, after };
}

const f = flood(5);
check(f.before === 0 && f.after.indexOf('flood') >= 0, 'message flooding fires only past the window limit');

const chatGuard = AC.createGuard(AC.withRules({ chatPerWindow: 3 }));
let chatHits = [];
for (let i = 0; i < 4; i++) chatHits = chatHits.concat(chatGuard.note('chat', { now: 1000 + i }));
check(chatHits.indexOf('chat') >= 0, 'chat spam fires past its own limit');

const syncGuard = AC.createGuard(AC.withRules({ syncPerWindow: 2 }));
let syncHits = [];
for (let i = 0; i < 3; i++) syncHits = syncHits.concat(syncGuard.note('sync', { now: 1000 + i }));
check(syncHits.indexOf('sync') >= 0, 'state scraping fires past its own limit');

const illegalGuard = AC.createGuard(AC.withRules({ illegalPerWindow: 2 }));
let illegalHits = [];
for (let i = 0; i < 3; i++) illegalHits = illegalHits.concat(illegalGuard.note('illegal', { now: 1000 + i }));
check(illegalHits.indexOf('illegal') >= 0, 'illegal moves fire past their own limit');

/* ---------------- guard: machine-speed timing ---------------- */

function instantRun(count, think, legal, span) {
  const g = AC.createGuard(AC.withRules({
    instantMovesPerWindow: 4,
    instantMoveMs: 200,
    instantMinLegal: 12,
    instantWindowMs: span || 60000
  }));
  let hits = [];
  for (let i = 0; i < count; i++) {
    hits = hits.concat(g.note('move', { now: 1000 + i * 50, thinkMs: think, legal }));
  }
  return hits;
}

check(instantRun(3, 90, 30).length === 0, 'three quick moves are not enough to flag');
check(instantRun(4, 90, 30).indexOf('instant') >= 0, 'a run of instant moves is flagged');
check(instantRun(10, 4000, 30).length === 0, 'slow moves are never flagged');
check(instantRun(10, 90, 8).length === 0, 'near-forced positions are not treated as instant play');

const spread = AC.createGuard(AC.withRules({
  instantMovesPerWindow: 3,
  instantMoveMs: 200,
  instantMinLegal: 12,
  instantWindowMs: 10000
}));
let spreadHits = [];
for (let i = 0; i < 6; i++) spreadHits = spreadHits.concat(spread.note('move', { now: 1000 + i * 6000, thinkMs: 90, legal: 30 }));
check(spreadHits.length === 0, 'quick moves spread over a minute are not flagged');

/* ---------------- sentence ladder ---------------- */

function act(points, prior) { return AC.sentence(points, prior || 0).action; }

check(act(0) === null && act(1) === null, 'low scores are not punished');
check(act(2) === 'warn', 'two points is a warning');
check(AC.sentence(3, 0).action === 'ban' && AC.sentence(3, 0).ms === AC.RULES.minBanMs,
  'three points is a 5-minute ban');
check(AC.sentence(6, 0).ms === AC.RULES.hourBanMs, 'six points is an hour');
check(AC.sentence(11, 0).ms === AC.RULES.dayBanMs, 'eleven points is a day');
check(AC.sentence(30, 0).action === 'permanent', 'thirty points is permanent');
check(AC.sentence(3, 9).ms === AC.RULES.minBanMs, 'the score alone decides the tier');

/* ---------------- ban helpers ---------------- */

check(AC.formatLeft(45000) === '45 seconds', 'seconds are spelled out', AC.formatLeft(45000));
check(AC.formatLeft(30 * 60000) === '30 minutes', 'minutes are spelled out', AC.formatLeft(30 * 60000));
check(AC.formatLeft(24 * 3600000) === '24 hours', 'hours are spelled out', AC.formatLeft(24 * 3600000));
check(AC.formatLeft(72 * 3600000) === '3 days', 'days are spelled out', AC.formatLeft(72 * 3600000));

const now = 5000000;
check(AC.active({ expiresAt: now + 1000 }, now) === true, 'a running ban is active');
check(AC.active({ expiresAt: now - 1 }, now) === false, 'an expired ban is not');
check(AC.active({ expiresAt: 0 }, now) === true, 'a permanent ban never expires');
check(AC.expiresIn({ expiresAt: now + 5000 }, now) === 5000, 'remaining time is exact');

const secret = AC.publicBan({
  id: 'GB-1', ip: '10.0.0.1', points: 9, threshold: 30, findings: [], severity: 'temporary'
});
check(secret.ip === undefined, 'a public ban does not leak the address');

/* ---------------- the ledger ---------------- */

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gambit-anticheat-'));
const file = path.join(dir, 'bans.json');
let clock = 1000000;
const mod = createModeration({ file, now: () => clock });

const first = mod.strike('203.0.113.9', { finding: 'chat', name: 'Tester' });
check(first.action === 'warn' && first.points === 1 && first.first === true,
  'the first scored finding always warns', String(first.points));

clock += 31000;
const second = mod.strike('203.0.113.9', { finding: 'chat' });
check(second.action === 'warn' && second.points === 2, 'the ladder still warns at two points', String(second.points));

clock += 31000;
const third = mod.strike('203.0.113.9', { finding: 'flood' });
check(third.action === 'ban' && third.ban.severity === 'temporary', 'four points is a 5-minute ban');
check(third.ban.expiresAt === clock + AC.RULES.minBanMs, 'the ban carries an expiry');
check(third.ban.findings.length === 2 && third.ban.strike === 1, 'the record lists the evidence');

check(mod.check('203.0.113.9') !== null, 'the address is now blocked');
check(mod.check('203.0.113.10') === null, 'another address is untouched');

const reloaded = createModeration({ file, now: () => clock });
check(reloaded.check('203.0.113.9') !== null, 'the ban survives a restart');

const banned = reloaded.check('203.0.113.9');
reloaded.lift(banned.id);
check(reloaded.check('203.0.113.9') === null, 'lifting a ban unblocks the address');
check(reloaded.get('203.0.113.9').bans.length === 1, 'a lifted ban stays in the history');

/* a burst is one incident, not one per message */
const burst = createModeration({ file: '', now: () => clock });
burst.strike('198.51.100.4', { finding: 'chat' });
burst.strike('198.51.100.4', { finding: 'chat' });
burst.strike('198.51.100.4', { finding: 'chat' });
check(burst.get('198.51.100.4').points === 1, 'repeated findings inside the window score once');
check(burst.get('198.51.100.4').findings.chat.count === 3, 'but every occurrence is counted');

/* a clean player's score fades after a day */
const fading = createModeration({ file: '', now: () => clock });
fading.strike('198.51.100.5', { finding: 'chat' });
clock += 25 * 3600000;
fading.strike('198.51.100.5', { finding: 'chat' });
check(fading.get('198.51.100.5').points === 1, 'a day of quiet resets the score', String(fading.get('198.51.100.5').points));

/* repeat bans climb the ladder to permanent */
const ladder = createModeration({ file: '', now: () => clock });
const ip = '198.51.100.77';
let bans = 0;
let lastBan = null;
for (let i = 0; i < 40; i++) {
  clock += 31000;
  const out = ladder.strike(ip, { finding: 'illegal' });
  if (out && out.action === 'ban' && !out.existing) {
    bans++;
    lastBan = out.ban;
    if (out.ban.expiresAt) clock = out.ban.expiresAt + 1000;
    else break;
  }
}
check(bans === 9, 'the points ladder ends in a permanent ban', String(bans));
check(lastBan && lastBan.severity === 'permanent' && lastBan.expiresAt === 0,
  'the last ban is permanent', lastBan && lastBan.severity);
check(ladder.get(ip).bans.length === bans, 'every ban is kept in the history');

/* The first finding gets a warning even when it is already over the ban tier. */
const grace = createModeration({ file: '', now: () => clock });
const heavy = grace.strike('198.51.100.88', { finding: 'illegal' });
check(heavy.action === 'warn' && heavy.points === 3 && heavy.first === true,
  'a 3-point first finding warns instead of banning', heavy.action + '/' + heavy.points);
check(grace.check('198.51.100.88') === null, 'the first warning blocks nothing');
clock += 31000;
const afterGrace = grace.strike('198.51.100.88', { finding: 'chat' });
check(afterGrace.action === 'ban' && afterGrace.ban.severity === 'temporary',
  'the next finding after the first warning bans', afterGrace.action);

/* ---------------- owner actions ---------------- */

const ownerMod = createModeration({ file: '', now: () => clock });
const testBan = ownerMod.ban('203.0.113.55', { ms: 600000, name: 'Owner' });
check(testBan.severity === 'temporary' && testBan.expiresAt === clock + 600000,
  'an owner ban carries its duration');
check(ownerMod.check('203.0.113.55') !== null, 'an owner ban blocks the address');
check(ownerMod.latest('203.0.113.55').id === testBan.id, 'the latest ban is available for lifting');
check(ownerMod.list().some((row) => row.ban && row.ban.id === testBan.id), 'the owner list shows the ban');

const permBan = ownerMod.ban('203.0.113.56', { permanent: true });
check(permBan.severity === 'permanent' && permBan.expiresAt === 0, 'an owner ban can be permanent');

ownerMod.lift(testBan.id);
check(ownerMod.check('203.0.113.55') === null, 'an owner test ban can be lifted');

ownerMod.reset('203.0.113.55');
check(ownerMod.get('203.0.113.55').points === 0 && ownerMod.get('203.0.113.55').bans.length === 0,
  'reset leaves a blank record');

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) { /* ignore */ }

console.log(failures ? '\n' + failures + ' fair-play check(s) FAILED' : '\nall fair-play checks passed');
process.exit(failures ? 1 : 0);
