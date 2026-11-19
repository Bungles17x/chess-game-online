/* Gambit — local accounts with passwords and email verification.
 *
 * Everything stays on this device: accounts live in localStorage and the
 * password is stretched with PBKDF2 before it is written. There is no mail
 * server, so a verification code is handed back to the page as a "mail" object
 * that the UI shows in a local inbox. It is a real code flow, not a real email.
 */
(function (global) {
  'use strict';

  var MIN_PASSWORD = 8;
  var MAX_PASSWORD = 200;
  var CODE_TTL = 10 * 60 * 1000;
  var CODE_COOLDOWN = 30 * 1000;
  var CODE_TRIES = 5;
  var LOGIN_TRIES = 5;
  var LOGIN_LOCK = 60 * 1000;
  var ITERATIONS = 120000;
  var ACCOUNTS_KEY = 'gambit.accounts';
  var SESSION_KEY = 'gambit.session';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  var PREF_KEYS = ['notify', 'reminders', 'achievements'];

  /* ---------------- validation ---------------- */

  function normalizeEmail(email) {
    return String(email == null ? '' : email).trim().toLowerCase();
  }

  function emailProblem(email) {
    var e = String(email == null ? '' : email).trim();
    if (!e) return 'Enter your email address.';
    if (e.length > 160) return 'That email address is too long.';
    if (!EMAIL_RE.test(e)) return 'That email address does not look right.';
    return null;
  }

  function passwordProblem(password, email) {
    var pw = String(password == null ? '' : password);
    if (!pw) return 'Enter a password.';
    if (pw.length < MIN_PASSWORD) return 'Use at least ' + MIN_PASSWORD + ' characters.';
    if (pw.length > MAX_PASSWORD) return 'That password is too long.';
    if (!/[a-z]/i.test(pw)) return 'Add at least one letter.';
    if (!/\d/.test(pw)) return 'Add at least one number.';
    var local = normalizeEmail(email).split('@')[0];
    if (local && local.length >= 3 && pw.toLowerCase().indexOf(local) !== -1) {
      return 'Do not put the name from your email in the password.';
    }
    return null;
  }

  function nameProblem(name) {
    var n = String(name == null ? '' : name).trim();
    if (!n) return 'Pick a display name.';
    if (n.length < 2) return 'That name is too short.';
    if (n.length > 24) return 'Keep the name to 24 characters or fewer.';
    if (!/^[\w][\w .'-]*$/i.test(n)) return 'Use letters, numbers, spaces, dots, dashes and apostrophes only.';
    return null;
  }

  function codeProblem(code) {
    var c = String(code == null ? '' : code).trim();
    if (!c) return 'Enter the 6-digit code.';
    if (!/^\d{6}$/.test(c)) return 'The code is six digits.';
    return null;
  }

  /* Rough password score for the strength meter: 0 (empty) to 4 (strong). */
  function strength(password) {
    var pw = String(password == null ? '' : password);
    if (!pw) return { score: 0, label: 'Empty' };
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score++;
    if (pw.length < 6) score = Math.min(score, 1);
    score = Math.max(0, Math.min(4, score));
    return { score: score, label: ['Empty', 'Weak', 'Fair', 'Good', 'Strong'][score] };
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  }

  function redact(email) {
    var e = normalizeEmail(email);
    var at = e.indexOf('@');
    if (at < 1) return e;
    return e.slice(0, 1) + '\u2022\u2022\u2022' + e.slice(at);
  }

  /* ---------------- codes ---------------- */

  function newCode(now, purpose) {
    var value = String(Math.floor(Math.random() * 900000) + 100000);
    return {
      value: value,
      purpose: purpose || 'verify',
      sentAt: now,
      expires: now + CODE_TTL,
      tries: 0
    };
  }

  function checkCode(rec, input, now) {
    if (!rec) return { ok: false, reason: 'none', message: 'Send yourself a code first.' };
    if (now > rec.expires) return { ok: false, reason: 'expired', message: 'That code has expired. Send a new one.' };
    if (rec.tries >= CODE_TRIES) return { ok: false, reason: 'locked', message: 'Too many wrong codes. Send a new one.' };
    var bad = codeProblem(input);
    if (bad) return { ok: false, reason: 'format', message: bad };
    if (String(input).trim() !== rec.value) return { ok: false, reason: 'wrong', message: 'That code does not match.' };
    return { ok: true };
  }

  function secondsUntil(time, now) {
    return Math.max(0, Math.ceil((time - now) / 1000));
  }

  /* ---------------- hashing ---------------- */

  function bytesToHex(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return out;
  }

  function hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function randomHex(api, bytes) {
    var buf = new Uint8Array(bytes);
    api.getRandomValues(buf);
    return bytesToHex(buf);
  }

  function sameHash(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  async function hashPassword(api, password, saltHex, iterations) {
    var enc = new TextEncoder();
    var key = await api.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    var bits = await api.subtle.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: iterations, hash: 'SHA-256' },
      key,
      256
    );
    return bytesToHex(new Uint8Array(bits));
  }

  /* ---------------- store ---------------- */

  function publicAccount(rec) {
    if (!rec) return null;
    return {
      id: rec.id,
      name: rec.name,
      email: rec.email,
      verified: !!rec.verified,
      createdAt: rec.createdAt,
      prefs: Object.assign({ notify: true, reminders: true, achievements: true }, rec.prefs || {})
    };
  }

  function create(options) {
    var opts = options || {};
    var store = opts.storage;
    var nowFn = opts.now || function () { return Date.now(); };
    var cryptoApi = opts.crypto || global.crypto;

    if (!store) throw new Error('Accounts needs a storage object.');

    function now() { return nowFn(); }

    function onMail(mail) {
      if (typeof opts.onMail === 'function') {
        try { opts.onMail(mail); } catch (err) { /* a mail listener must not break sign-up */ }
      }
    }

    function readAccounts() {
      var list = null;
      try { list = JSON.parse(store.getItem(ACCOUNTS_KEY) || '[]'); } catch (err) { list = null; }
      return Array.isArray(list) ? list : [];
    }

    function writeAccounts(list) {
      try {
        store.setItem(ACCOUNTS_KEY, JSON.stringify(list));
        return true;
      } catch (err) {
        return false;
      }
    }

    function find(list, email) {
      var want = normalizeEmail(email);
      for (var i = 0; i < list.length; i++) {
        if (list[i].emailLower === want) return list[i];
      }
      return null;
    }

    function readSessionId() {
      try { return String(store.getItem(SESSION_KEY) || ''); } catch (err) { return ''; }
    }

    function writeSession(id) {
      try {
        if (id) store.setItem(SESSION_KEY, id);
        else store.removeItem(SESSION_KEY);
        return true;
      } catch (err) {
        return false;
      }
    }

    function current() {
      var id = readSessionId();
      if (!id) return null;
      var list = readAccounts();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return publicAccount(list[i]);
      }
      return null;
    }

    function rawCurrent() {
      var id = readSessionId();
      if (!id) return null;
      var list = readAccounts();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
      return null;
    }

    function saveRecord(rec) {
      var list = readAccounts();
      var wrote = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === rec.id) {
          list[i] = rec;
          wrote = writeAccounts(list);
          break;
        }
      }
      return wrote;
    }

    function storageFailure() {
      return { ok: false, error: 'This browser could not save the account. Storage may be full or blocked.' };
    }

    async function makeSecret(password, api) {
      var salt = randomHex(api, 16);
      var hash = await hashPassword(api, password, salt, ITERATIONS);
      return { salt: salt, hash: hash, iterations: ITERATIONS };
    }

    function canHash() {
      return !!(cryptoApi && cryptoApi.subtle && typeof cryptoApi.subtle.deriveBits === 'function' && global.TextEncoder);
    }

    function hashingFailure() {
      return { ok: false, error: 'This browser cannot hash passwords, so accounts are unavailable.' };
    }

    /* ---------- sign up ---------- */

    async function signUp(input) {
      var data = input || {};
      var name = String(data.name == null ? '' : data.name).trim();
      var email = String(data.email == null ? '' : data.email).trim();
      var password = String(data.password == null ? '' : data.password);

      var bad = nameProblem(name);
      if (bad) return { ok: false, field: 'name', error: bad };
      bad = emailProblem(email);
      if (bad) return { ok: false, field: 'email', error: bad };
      bad = passwordProblem(password, email);
      if (bad) return { ok: false, field: 'password', error: bad };

      var list = readAccounts();
      if (find(list, email)) {
        return { ok: false, field: 'email', error: 'An account with that email already exists. Sign in instead.' };
      }
      if (!canHash()) return hashingFailure();

      var secret;
      try { secret = await makeSecret(password, cryptoApi); }
      catch (err) { return { ok: false, error: 'Could not secure the password. Try again.' }; }

      var stamp = now();
      var code = newCode(stamp, 'verify');
      var rec = {
        id: 'u' + stamp.toString(36) + Math.random().toString(36).slice(2, 7),
        name: name,
        email: email,
        emailLower: normalizeEmail(email),
        salt: secret.salt,
        hash: secret.hash,
        iterations: secret.iterations,
        verified: false,
        createdAt: stamp,
        failed: 0,
        lockedUntil: 0,
        code: code,
        reset: null,
        prefs: { notify: true, reminders: true, achievements: true }
      };

      list.push(rec);
      if (!writeAccounts(list)) return storageFailure();

      var mail = {
        to: email,
        subject: 'Verify your Gambit email',
        purpose: 'verify',
        code: code.value,
        sentAt: stamp,
        expires: code.expires
      };
      onMail(mail);

      return { ok: true, pending: true, email: email, code: mail, account: publicAccount(rec) };
    }

    /* ---------- verification ---------- */

    function verify(input) {
      var data = input || {};
      var list = readAccounts();
      var rec = find(list, data.email);
      if (!rec) return { ok: false, error: 'No account is waiting on that email. Create one first.' };
      if (rec.verified) {
        writeSession(rec.id);
        return { ok: true, account: publicAccount(rec), already: true };
      }

      var stamp = now();
      var check = checkCode(rec.code, data.code, stamp);
      if (!check.ok) {
        if (rec.code && check.reason === 'wrong') rec.code.tries = (rec.code.tries || 0) + 1;
        if (!writeAccounts(list)) return storageFailure();
        return { ok: false, field: 'code', error: check.message, reason: check.reason };
      }

      rec.verified = true;
      rec.code = null;
      rec.verifiedAt = stamp;
      if (!writeAccounts(list)) return storageFailure();
      writeSession(rec.id);
      return { ok: true, account: publicAccount(rec) };
    }

    function resend(email) {
      var list = readAccounts();
      var rec = find(list, email);
      if (!rec) return { ok: false, error: 'No account is waiting on that email.' };
      if (rec.verified) return { ok: false, error: 'That email is already verified.' };

      var stamp = now();
      if (rec.code && stamp - rec.code.sentAt < CODE_COOLDOWN) {
        return {
          ok: false,
          wait: secondsUntil(rec.code.sentAt + CODE_COOLDOWN, stamp),
          error: 'Wait before asking for another code.'
        };
      }

      rec.code = newCode(stamp, 'verify');
      if (!writeAccounts(list)) return storageFailure();
      var mail = {
        to: rec.email,
        subject: 'Your new Gambit code',
        purpose: 'verify',
        code: rec.code.value,
        sentAt: stamp,
        expires: rec.code.expires
      };
      onMail(mail);
      return { ok: true, code: mail, wait: CODE_COOLDOWN / 1000 };
    }

    function resendWait(email) {
      var rec = find(readAccounts(), email);
      if (!rec || !rec.code || !rec.code.sentAt) return 0;
      return secondsUntil(rec.code.sentAt + CODE_COOLDOWN, now());
    }

    /* ---------- sign in ---------- */

    async function signIn(input) {
      var data = input || {};
      var email = String(data.email == null ? '' : data.email).trim();
      var password = String(data.password == null ? '' : data.password);

      if (!email) return { ok: false, field: 'email', error: 'Enter your email address.' };
      if (!password) return { ok: false, field: 'password', error: 'Enter your password.' };
      var bad = emailProblem(email);
      if (bad) return { ok: false, field: 'email', error: bad };
      if (!canHash()) return hashingFailure();

      var list = readAccounts();
      var rec = find(list, email);
      var stamp = now();

      if (rec && rec.lockedUntil && rec.lockedUntil > stamp) {
        return {
          ok: false,
          field: 'password',
          locked: true,
          wait: secondsUntil(rec.lockedUntil, stamp),
          error: 'Too many attempts. Pause for ' + secondsUntil(rec.lockedUntil, stamp) + 's, then try again.'
        };
      }

      if (!rec) {
        /* Same work as a real check so a missing email does not answer faster. */
        try { await hashPassword(cryptoApi, password, '00112233445566778899aabbccddeeff', ITERATIONS); }
        catch (err) { return { ok: false, error: 'Could not check that password. Try again.' }; }
        return { ok: false, field: 'password', error: 'Email or password is not right.' };
      }

      var guess;
      try { guess = await hashPassword(cryptoApi, password, rec.salt, rec.iterations || ITERATIONS); }
      catch (err) { return { ok: false, error: 'Could not check that password. Try again.' }; }

      if (!sameHash(guess, rec.hash)) {
        rec.failed = (rec.failed || 0) + 1;
        var left = LOGIN_TRIES - rec.failed;
        if (left <= 0) {
          rec.failed = 0;
          rec.lockedUntil = stamp + LOGIN_LOCK;
          writeAccounts(list);
          return {
            ok: false,
            field: 'password',
            locked: true,
            wait: LOGIN_LOCK / 1000,
            error: 'Too many attempts. Pause for ' + LOGIN_LOCK / 1000 + 's, then try again.'
          };
        }
        writeAccounts(list);
        return {
          ok: false,
          field: 'password',
          remaining: left,
          error: 'Email or password is not right. ' + left + ' ' + (left === 1 ? 'try' : 'tries') + ' left.'
        };
      }

      if (!rec.verified) {
        var pendingMail = null;
        if (!rec.code) {
          rec.code = newCode(stamp, 'verify');
          writeAccounts(list);
          pendingMail = {
            to: rec.email,
            subject: 'Verify your Gambit email',
            purpose: 'verify',
            code: rec.code.value,
            sentAt: stamp,
            expires: rec.code.expires
          };
          onMail(pendingMail);
        }
        return {
          ok: false,
          needsVerify: true,
          email: rec.email,
          code: pendingMail,
          error: 'Verify your email before signing in.'
        };
      }

      rec.failed = 0;
      rec.lockedUntil = 0;
      rec.lastSeen = stamp;
      if (!writeAccounts(list)) return storageFailure();
      writeSession(rec.id);
      return { ok: true, account: publicAccount(rec) };
    }

    function signOut() {
      writeSession('');
      return { ok: true };
    }

    /* ---------- password reset ---------- */

    function beginReset(email) {
      var bad = emailProblem(email);
      if (bad) return { ok: false, field: 'email', error: bad };

      var list = readAccounts();
      var rec = find(list, email);
      var stamp = now();
      var generic = { ok: true, sent: !!rec, email: String(email).trim() };

      if (!rec) return generic;
      if (rec.reset && stamp - rec.reset.sentAt < CODE_COOLDOWN) {
        generic.wait = secondsUntil(rec.reset.sentAt + CODE_COOLDOWN, stamp);
        generic.sent = true;
        return generic;
      }

      rec.reset = newCode(stamp, 'reset');
      if (!writeAccounts(list)) return storageFailure();
      var mail = {
        to: rec.email,
        subject: 'Reset your Gambit password',
        purpose: 'reset',
        code: rec.reset.value,
        sentAt: stamp,
        expires: rec.reset.expires
      };
      generic.code = mail;
      generic.wait = CODE_COOLDOWN / 1000;
      onMail(mail);
      return generic;
    }

    async function resetPassword(input) {
      var data = input || {};
      var list = readAccounts();
      var rec = find(list, data.email);
      var genericError = 'That code is not right for this email.';

      if (!rec || !rec.reset) {
        return { ok: false, field: 'code', error: 'Ask for a reset code first.' };
      }
      if (!canHash()) return hashingFailure();

      var stamp = now();
      var check = checkCode(rec.reset, data.code, stamp);
      if (!check.ok) {
        if (check.reason === 'wrong') rec.reset.tries = (rec.reset.tries || 0) + 1;
        writeAccounts(list);
        return { ok: false, field: 'code', error: check.reason === 'expired' ? check.message : genericError };
      }

      var bad = passwordProblem(data.password, rec.email);
      if (bad) return { ok: false, field: 'password', error: bad };

      var secret;
      try { secret = await makeSecret(data.password, cryptoApi); }
      catch (err) { return { ok: false, error: 'Could not secure the new password. Try again.' }; }

      rec.salt = secret.salt;
      rec.hash = secret.hash;
      rec.iterations = secret.iterations;
      rec.reset = null;
      rec.code = null;
      rec.verified = true;
      rec.failed = 0;
      rec.lockedUntil = 0;
      if (!writeAccounts(list)) return storageFailure();
      writeSession(rec.id);
      return { ok: true, account: publicAccount(rec) };
    }

    /* ---------- signed-in profile ---------- */

    async function changePassword(input) {
      var data = input || {};
      var rec = rawCurrent();
      if (!rec) return { ok: false, error: 'Sign in first.' };
      if (!data.currentPassword) return { ok: false, field: 'currentPassword', error: 'Enter your current password.' };
      if (!canHash()) return hashingFailure();

      var check;
      try { check = await hashPassword(cryptoApi, String(data.currentPassword), rec.salt, rec.iterations || ITERATIONS); }
      catch (err) { return { ok: false, error: 'Could not check that password. Try again.' }; }
      if (!sameHash(check, rec.hash)) return { ok: false, field: 'currentPassword', error: 'That password is not right.' };

      var bad = passwordProblem(data.password, rec.email);
      if (bad) return { ok: false, field: 'password', error: bad };

      var secret;
      try { secret = await makeSecret(data.password, cryptoApi); }
      catch (err) { return { ok: false, error: 'Could not secure the new password. Try again.' }; }

      rec.salt = secret.salt;
      rec.hash = secret.hash;
      rec.iterations = secret.iterations;
      if (!saveRecord(rec)) return storageFailure();
      return { ok: true, account: publicAccount(rec) };
    }

    function updateName(name) {
      var rec = rawCurrent();
      if (!rec) return { ok: false, error: 'Sign in first.' };
      var bad = nameProblem(name);
      if (bad) return { ok: false, field: 'name', error: bad };
      rec.name = String(name).trim();
      if (!saveRecord(rec)) return storageFailure();
      return { ok: true, account: publicAccount(rec) };
    }

    function setPrefs(partial) {
      var rec = rawCurrent();
      if (!rec) return { ok: false, error: 'Sign in first.' };
      var next = Object.assign({ notify: true, reminders: true, achievements: true }, rec.prefs || {});
      var keys = Object.keys(partial || {});
      for (var i = 0; i < keys.length; i++) {
        if (PREF_KEYS.indexOf(keys[i]) === -1) continue;
        next[keys[i]] = !!partial[keys[i]];
      }
      rec.prefs = next;
      if (!saveRecord(rec)) return storageFailure();
      return { ok: true, account: publicAccount(rec) };
    }

    async function deleteAccount(password) {
      var rec = rawCurrent();
      if (!rec) return { ok: false, error: 'Sign in first.' };
      if (!password) return { ok: false, field: 'password', error: 'Enter your password to delete the account.' };
      if (!canHash()) return hashingFailure();

      var check;
      try { check = await hashPassword(cryptoApi, String(password), rec.salt, rec.iterations || ITERATIONS); }
      catch (err) { return { ok: false, error: 'Could not check that password. Try again.' }; }
      if (!sameHash(check, rec.hash)) return { ok: false, field: 'password', error: 'That password is not right.' };

      var list = readAccounts().filter(function (a) { return a.id !== rec.id; });
      if (!writeAccounts(list)) return storageFailure();
      writeSession('');
      return { ok: true };
    }

    return {
      MIN_PASSWORD: MIN_PASSWORD,
      CODE_TTL: CODE_TTL,
      CODE_COOLDOWN: CODE_COOLDOWN,
      CODE_TRIES: CODE_TRIES,
      LOGIN_TRIES: LOGIN_TRIES,
      signUp: signUp,
      verify: verify,
      resend: resend,
      resendWait: resendWait,
      signIn: signIn,
      signOut: signOut,
      current: current,
      beginReset: beginReset,
      resetPassword: resetPassword,
      changePassword: changePassword,
      updateName: updateName,
      setPrefs: setPrefs,
      deleteAccount: deleteAccount,
      pending: function (email) {
        var rec = find(readAccounts(), email);
        return rec ? publicAccount(rec) : null;
      },
      count: function () { return readAccounts().length; }
    };
  }

  /* ---------------- demo data (used by the UI when no account exists) ---------------- */

  var api = {
    MIN_PASSWORD: MIN_PASSWORD,
    CODE_TTL: CODE_TTL,
    CODE_COOLDOWN: CODE_COOLDOWN,
    CODE_TRIES: CODE_TRIES,
    LOGIN_TRIES: LOGIN_TRIES,
    LOGIN_LOCK: LOGIN_LOCK,
    create: create,
    normalizeEmail: normalizeEmail,
    emailProblem: emailProblem,
    passwordProblem: passwordProblem,
    nameProblem: nameProblem,
    codeProblem: codeProblem,
    checkCode: checkCode,
    newCode: newCode,
    strength: strength,
    initials: initials,
    redact: redact,
    secondsUntil: secondsUntil,
    publicAccount: publicAccount
  };

  global.Accounts = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
