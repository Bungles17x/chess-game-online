/* Gambit — the ban ledger behind the automatic fair-play bans.
 *
 * Kept out of server.js so the ladder and the persistence can be tested on
 * their own. Scores live per address, survive a reconnect, and decay after a
 * day of quiet so an old warning does not haunt a player forever.
 *
 * The file is best-effort: a host with no writable disk (a free Render
 * instance, for one) still bans correctly for the life of the process.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AC = require('./js/anticheat.js');

const DECAY_MS = 24 * 60 * 60 * 1000;

function createModeration(opts) {
  opts = opts || {};
  const rules = opts.rules || AC.RULES;
  const file = opts.file || '';
  const clock = opts.now || Date.now;
  const records = new Map();
  let warnedWrite = false;

  load();

  function blank(ip) {
    const at = clock();
    return { ip, points: 0, findings: {}, bans: [], scored: {}, warned: false, first: at, last: at };
  }

  function get(ip) {
    const key = String(ip || 'local');
    let record = records.get(key);
    if (!record) {
      record = blank(key);
      records.set(key, record);
    }
    /* A day of good behaviour wipes the score, not the ban history. A player
       who has already served a ban keeps their score, so repeat offences keep
       climbing the ladder instead of resetting to a warning. */
    if (!record.bans.length && record.points > 0 && record.last && clock() - record.last > DECAY_MS) {
      record.points = 0;
      record.findings = {};
      record.scored = {};
      record.warned = false;
    }
    return record;
  }

  function code() {
    const hex = (n) => crypto.randomBytes(n).toString('hex').toUpperCase();
    return 'GB-' + hex(2) + '-' + hex(2);
  }

  function findingList(record) {
    return Object.keys(record.findings)
      .map((id) => {
        const meta = AC.FINDINGS[id] || { label: id, detail: '' };
        return {
          id,
          label: meta.label,
          detail: meta.detail,
          count: record.findings[id].count
        };
      })
      .sort((a, b) => (rules.weight[b.id] || 1) * b.count - (rules.weight[a.id] || 1) * a.count);
  }

  function issue(record, verdict, info, at) {
    const list = findingList(record);
    const top = list[0] || { id: 'flood', label: 'Fair-play check', detail: '' };
    const permanent = verdict.action === 'permanent';
    const ban = {
      id: code(),
      reason: top.id,
      reasonLabel: top.label,
      detail: top.detail,
      findings: list,
      points: record.points,
      threshold: rules.permBanAt,
      severity: permanent ? 'permanent' : 'temporary',
      issuedAt: at,
      expiresAt: permanent ? 0 : at + verdict.ms,
      strike: record.bans.length + 1,
      name: String((info && info.name) || '')
    };
    record.bans.push(ban);
    return ban;
  }

  /* Score one finding for an address and sentence it. Returns null when the
     finding is unknown, otherwise { action, points, ban? }. */
  function strike(ip, info) {
    info = info || {};
    const id = String(info.finding || '');
    if (!AC.FINDINGS[id]) return null;

    const at = clock();
    const record = get(ip);
    record.last = at;

    /* Already serving: report that ban instead of minting a new one. */
    const serving = check(ip);
    if (serving) return { action: 'ban', ban: serving, points: record.points, scored: false, existing: true };

    const seen = record.findings[id] || (record.findings[id] = { count: 0, first: at, last: at });
    seen.count++;
    seen.last = at;

    /* A burst is one incident: score the same finding at most once per window. */
    let scored = false;
    if (!record.scored[id] || at - record.scored[id] >= rules.repeatMs) {
      record.scored[id] = at;
      record.points += rules.weight[id] || 1;
      scored = true;
    }

    /* The first scored finding is always a warning, even when its weight
       already reaches the ban tier: one 3-point illegal or timing hit must not
       skip straight to a five-minute pause. After that the ladder decides. */
    const firstWarning = scored && !record.warned;
    if (scored) record.warned = true;

    const verdict = firstWarning
      ? { action: 'warn', ms: 0, label: 'Fair-play warning' }
      : AC.sentence(record.points, record.bans.length, rules);

    if (verdict.action === 'ban' || verdict.action === 'permanent') {
      const ban = issue(record, verdict, info, at);
      persist();
      return { action: 'ban', ban, verdict, points: record.points, scored };
    }

    persist();
    return {
      action: verdict.action === 'warn' ? 'warn' : null,
      verdict,
      points: record.points,
      scored,
      first: firstWarning,
      record
    };
  }

  function check(ip) {
    const record = records.get(String(ip || 'local'));
    if (!record || !record.bans.length) return null;
    const latest = record.bans[record.bans.length - 1];
    if (latest.liftedAt) return null;
    return AC.active(latest, clock()) ? latest : null;
  }

  function lift(id) {
    let found = null;
    records.forEach((record) => {
      record.bans.forEach((ban) => {
        if (ban.id === id && !ban.liftedAt) {
          ban.liftedAt = clock();
          found = ban;
        }
      });
    });
    if (found) persist();
    return found;
  }

  function latest(ip) {
    const record = records.get(String(ip || 'local'));
    if (!record || !record.bans.length) return null;
    const ban = record.bans[record.bans.length - 1];
    return ban.liftedAt ? null : ban;
  }

  /* A ban issued straight from the owner tools: no scoring, same record shape,
     so the page renders it exactly like one the ladder produced. */
  function ban(ip, opts) {
    opts = opts || {};
    const at = clock();
    const record = get(ip);
    record.last = at;

    const permanent = !!opts.permanent;
    const ms = permanent ? 0 : Math.max(60000, Number(opts.ms) || 10 * 60000);
    const recordBan = {
      id: code(),
      reason: 'review',
      reasonLabel: opts.label || 'Owner test ban',
      detail: opts.detail || 'Issued from the owner tools to test the ban screen.',
      findings: findingList(record),
      points: record.points,
      threshold: rules.permBanAt,
      severity: permanent ? 'permanent' : 'temporary',
      issuedAt: at,
      expiresAt: permanent ? 0 : at + ms,
      strike: record.bans.length + 1,
      name: String(opts.name || ''),
      test: true
    };
    record.bans.push(recordBan);
    persist();
    return recordBan;
  }

  /* Owner clean slate: score, findings and bans all go. */
  function reset(ip) {
    const key = String(ip || 'local');
    const had = records.has(key);
    records.delete(key);
    if (had) persist();
    return had;
  }

  /* The owner's view of the ledger: addresses, scores, evidence, live ban. */
  function list() {
    const out = [];
    records.forEach((record) => {
      const live = latest(record.ip);
      if (!live && !record.points) return;
      out.push({
        ip: record.ip,
        points: record.points,
        findings: findingList(record),
        bans: record.bans.length,
        ban: live ? AC.publicBan(live) : null
      });
    });
    return out.sort((a, b) => (b.points || 0) - (a.points || 0));
  }

  function activeBans() {
    const out = [];
    records.forEach((record) => {
      const ban = check(record.ip);
      if (ban) out.push(ban);
    });
    return out.sort((a, b) => b.issuedAt - a.issuedAt);
  }

  function count() { return activeBans().length; }

  function load() {
    if (!file) return;
    let raw;
    try { raw = fs.readFileSync(file, 'utf8'); }
    catch (err) { return; }
    let parsed;
    try { parsed = JSON.parse(raw); } catch (err) { return; }
    const list = Array.isArray(parsed) ? parsed : (parsed && parsed.records);
    if (!Array.isArray(list)) return;

    list.forEach((record) => {
      if (!record || !record.ip) return;
      records.set(String(record.ip), {
        ip: String(record.ip),
        points: Number(record.points) || 0,
        findings: record.findings && typeof record.findings === 'object' ? record.findings : {},
        bans: Array.isArray(record.bans) ? record.bans : [],
        scored: record.scored && typeof record.scored === 'object' ? record.scored : {},
        warned: record.warned === undefined
          ? (Number(record.points) > 0 || (record.bans || []).length > 0)
          : !!record.warned,
        first: Number(record.first) || clock(),
        last: Number(record.last) || clock()
      });
    });
  }

  function persist() {
    if (!file) return false;
    const payload = { version: 1, savedAt: clock(), records: Array.from(records.values()) };
    const dir = path.dirname(file);
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
      fs.renameSync(tmp, file);
      return true;
    } catch (err) {
      if (!warnedWrite) {
        warnedWrite = true;
        console.log('  bans: cannot write ' + file + ' (' + err.code + ') — keeping them in memory');
      }
      return false;
    }
  }

  return {
    rules,
    strike,
    check,
    lift,
    latest,
    ban,
    reset,
    list,
    activeBans,
    count,
    get,
    persist,
    file
  };
}

module.exports = { createModeration, DECAY_MS };
