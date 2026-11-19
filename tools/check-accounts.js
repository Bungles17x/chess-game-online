/* Checks for local accounts, codes and password handling. */
'use strict';

var path = require('path');
var A = require(path.join(__dirname, '..', 'js/accounts.js'));

var failures = 0;
function check(ok, label) {
  if (ok) console.log('ok   ' + label);
  else { failures++; console.log('FAIL ' + label); }
}

function memory() {
  var map = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
    setItem: function (k, v) { map[k] = String(v); },
    removeItem: function (k) { delete map[k]; },
    raw: map
  };
}

function broken() {
  return {
    getItem: function () { return null; },
    setItem: function () { throw new Error('QuotaExceededError'); },
    removeItem: function () {}
  };
}

function later(ms) { clock += ms; }

var clock = 1750000000000;
var mails = [];

function fresh(options) {
  var opts = options || {};
  return A.create({
    storage: opts.storage || memory(),
    now: function () { return clock; },
    onMail: function (mail) { mails.push(mail); }
  });
}

function codeOf(store, email) {
  var list = JSON.parse(store.__store ? store.__store.getItem('gambit.accounts') : '[]');
  for (var i = 0; i < list.length; i++) if (list[i].emailLower === email) return list[i].code ? list[i].code.value : '';
  return '';
}

function storeWithMemory() {
  var mem = memory();
  var api = A.create({ storage: mem, now: function () { return clock; }, onMail: function (m) { mails.push(m); } });
  api.__store = mem;
  return api;
}

async function main() {
  /* ---------- validation ---------- */
  check(A.emailProblem('nope') !== null, 'an address without an @ is rejected');
  check(A.emailProblem('a@b') !== null, 'an address without a dotted domain is rejected');
  check(A.emailProblem(' Sam@Example.com ') === null, 'a normal address passes');
  check(A.normalizeEmail(' Sam@Example.COM ') === 'sam@example.com', 'emails normalise to lower case');
  check(A.passwordProblem('short1', 'a@b.co') !== null, 'short passwords are rejected');
  check(A.passwordProblem('onlyletters', 'a@b.co') !== null, 'passwords without a number are rejected');
  check(A.passwordProblem('12345678', 'a@b.co') !== null, 'passwords without a letter are rejected');
  check(A.passwordProblem('sammy1234', 'sammy@x.co') !== null, 'the email name inside the password is rejected');
  check(A.passwordProblem('quiet9lake', 'sam@x.co') === null, 'a decent password passes');
  check(A.nameProblem('') !== null, 'an empty name is rejected');
  check(A.nameProblem('x') !== null, 'a one-letter name is rejected');
  check(A.nameProblem('Ada Lovelace') === null, 'a normal name passes');
  check(A.nameProblem('<script>') !== null, 'markup in the name is rejected');
  check(A.codeProblem('12345') !== null, 'a five-digit code is rejected');
  check(A.codeProblem('123456') === null, 'a six-digit code passes');
  check(A.strength('').score === 0, 'an empty password scores zero');
  check(A.strength('abc12345').score < A.strength('Abc12345!xyz').score, 'longer mixed passwords score higher');
  check(A.initials('Ada Lovelace') === 'AL', 'initials come from both names');
  check(A.initials('Sam') === 'S', 'a single name gives one initial');
  check(A.redact('sam@example.com') === 's\u2022\u2022\u2022@example.com', 'emails are redacted for display');
  check(A.secondsUntil(1000, 400) === 1, 'a partial second waits one tick');
  check(A.secondsUntil(1000, 2000) === 0, 'a past time waits nothing');
  check(A.checkCode(null, '123456', clock).ok === false, 'a missing code record is not accepted');

  /* ---------- sign up ---------- */
  var store = storeWithMemory();
  var bad = await store.signUp({ name: 'A', email: 'sam@example.com', password: 'quiet9lake' });
  check(bad.ok === false && bad.field === 'name', 'sign up reports a bad name on the name field');

  bad = await store.signUp({ name: 'Sam', email: 'not-an-email', password: 'quiet9lake' });
  check(bad.ok === false && bad.field === 'email', 'sign up reports a bad email on the email field');

  bad = await store.signUp({ name: 'Sam', email: 'sam@example.com', password: 'short' });
  check(bad.ok === false && bad.field === 'password', 'sign up reports a weak password');

  mails = [];
  var up = await store.signUp({ name: 'Sam Fisher', email: 'Sam@Example.com', password: 'quiet9lake' });
  check(up.ok === true && up.pending === true, 'a valid sign up creates a pending account');
  check(up.account.verified === false, 'the new account starts unverified');
  check(/^\d{6}$/.test(up.code.code), 'the mail carries a six-digit code');
  check(mails.length === 1 && mails[0].purpose === 'verify', 'the verification mail is delivered once');
  check(up.account.hash === undefined && up.account.salt === undefined, 'the stored account does not expose the hash');
  check(store.count() === 1, 'one account is stored');
  check(store.current() === null, 'signing up does not sign you in before verification');

  var dupe = await store.signUp({ name: 'Sam Again', email: 'sam@example.COM', password: 'quiet9lake' });
  check(dupe.ok === false && dupe.field === 'email', 'the same email cannot sign up twice');

  /* ---------- verification ---------- */
  var early = await store.signIn({ email: 'sam@example.com', password: 'quiet9lake' });
  check(early.ok === false && early.needsVerify === true, 'an unverified account cannot sign in yet');

  var wrong = store.verify({ email: 'sam@example.com', code: '000000' });
  check(wrong.ok === false && wrong.field === 'code', 'a wrong code is reported on the code field');

  var right = store.verify({ email: 'sam@example.com', code: up.code.code });
  check(right.ok === true && right.account.verified === true, 'the right code verifies the account');
  check(store.current() && store.current().name === 'Sam Fisher', 'verifying signs the account in');

  /* ---------- sessions and sign in ---------- */
  store.signOut();
  check(store.current() === null, 'signing out clears the session');

  var wrongPw = await store.signIn({ email: 'sam@example.com', password: 'nope-nope1' });
  check(wrongPw.ok === false && wrongPw.field === 'password', 'a wrong password is reported');
  check(wrongPw.remaining === 4, 'a wrong password reports the tries left');

  var good = await store.signIn({ email: 'sam@example.com', password: 'quiet9lake' });
  check(good.ok === true && good.account.email === 'Sam@Example.com', 'the right password signs in');
  check(store.current() !== null, 'the signed-in account is remembered');

  var unknown = await store.signIn({ email: 'ghost@example.com', password: 'quiet9lake' });
  check(unknown.ok === false && unknown.error === 'Email or password is not right.',
    'an unknown email gets the same message as a wrong password');

  /* ---------- lockout ---------- */
  var locked = storeWithMemory();
  await locked.signUp({ name: 'Lock Test', email: 'lock@example.com', password: 'quiet9lake' });
  var code = codeOf(locked, 'lock@example.com');
  locked.verify({ email: 'lock@example.com', code: code });
  locked.signOut();
  var attempt = null;
  for (var i = 0; i < 5; i++) {
    attempt = await locked.signIn({ email: 'lock@example.com', password: 'wrong-pass1' });
  }
  check(attempt.locked === true, 'five wrong passwords lock the account');
  check(/Pause/.test(attempt.error), 'the lockout message says to pause');

  var duringLock = await locked.signIn({ email: 'lock@example.com', password: 'quiet9lake' });
  check(duringLock.ok === false && duringLock.locked === true, 'the right password is refused during the lockout');

  later(61000);
  var afterLock = await locked.signIn({ email: 'lock@example.com', password: 'quiet9lake' });
  check(afterLock.ok === true, 'the lockout expires and sign in works again');

  /* ---------- resending codes ---------- */
  var resendStore = storeWithMemory();
  var resendUp = await resendStore.signUp({ name: 'Resend Test', email: 'resend@example.com', password: 'quiet9lake' });
  var wait = resendStore.resend('resend@example.com');
  check(wait.ok === false && wait.wait > 0, 'a new code has to wait out the cooldown');
  check(resendStore.resendWait('resend@example.com') > 0, 'the cooldown is reported for the countdown');
  later(A.CODE_COOLDOWN + 1000);
  var resent = resendStore.resend('resend@example.com');
  check(resent.ok === true && resent.code.code !== resendUp.code.code, 'after the cooldown a fresh code is made');
  check(resent.wait === A.CODE_COOLDOWN / 1000, 'the resend reports the next cooldown');

  later(11 * 60 * 1000);
  var expired = resendStore.verify({ email: 'resend@example.com', code: resent.code.code });
  check(expired.ok === false && expired.reason === 'expired', 'codes expire after ten minutes');

  /* ---------- password reset ---------- */
  var reset = storeWithMemory();
  await reset.signUp({ name: 'Reset Test', email: 'reset@example.com', password: 'quiet9lake' });
  var verifyCode = codeOf(reset, 'reset@example.com');
  reset.verify({ email: 'reset@example.com', code: verifyCode });
  reset.signOut();

  var ghost = reset.beginReset('nobody@example.com');
  check(ghost.ok === true && ghost.sent === false, 'a reset for an unknown email answers without revealing it');

  later(A.CODE_COOLDOWN + 1000);
  var begin = reset.beginReset('reset@example.com');
  check(begin.ok === true && begin.sent === true && /^\d{6}$/.test(begin.code.code), 'a known email gets a reset code');

  var badReset = await reset.resetPassword({
    email: 'reset@example.com', code: '000000', password: 'newpass123'
  });
  check(badReset.ok === false && badReset.field === 'code', 'a wrong reset code is refused');

  var weakReset = await reset.resetPassword({
    email: 'reset@example.com', code: begin.code.code, password: 'short'
  });
  check(weakReset.ok === false && weakReset.field === 'password', 'the new password is validated too');

  var doneReset = await reset.resetPassword({
    email: 'reset@example.com', code: begin.code.code, password: 'newpass123'
  });
  check(doneReset.ok === true, 'the right reset code sets the new password');
  check(reset.current() !== null, 'a password reset signs you in');

  reset.signOut();
  var oldPw = await reset.signIn({ email: 'reset@example.com', password: 'quiet9lake' });
  check(oldPw.ok === false, 'the old password stops working');
  var newPw = await reset.signIn({ email: 'reset@example.com', password: 'newpass123' });
  check(newPw.ok === true, 'the new password works');

  /* ---------- profile ---------- */
  var profile = storeWithMemory();
  await profile.signUp({ name: 'Profile Test', email: 'profile@example.com', password: 'quiet9lake' });
  profile.verify({ email: 'profile@example.com', code: codeOf(profile, 'profile@example.com') });

  var badName = profile.updateName('x');
  check(badName.ok === false && badName.field === 'name', 'a bad display name is refused');
  check(profile.updateName('Ada Byron').ok === true, 'a good display name is saved');
  check(profile.current().name === 'Ada Byron', 'the session shows the new name');

  var prefs = profile.setPrefs({ notify: false, reminders: false, bogus: true });
  check(prefs.ok === true && prefs.account.prefs.notify === false, 'notification preferences are saved');
  check(prefs.account.prefs.reminders === false && prefs.account.prefs.achievements === true,
    'only the keys you pass change');
  check(prefs.account.prefs.bogus === undefined, 'unknown preference keys are ignored');

  var badCurrent = await profile.changePassword({ currentPassword: 'wrong-pass1', password: 'newpass123' });
  check(badCurrent.ok === false && badCurrent.field === 'currentPassword', 'the current password must match');
  var changed = await profile.changePassword({ currentPassword: 'quiet9lake', password: 'newpass123' });
  check(changed.ok === true, 'the password can be changed');
  profile.signOut();
  var withNew = await profile.signIn({ email: 'profile@example.com', password: 'newpass123' });
  check(withNew.ok === true, 'the changed password signs in');

  /* ---------- deleting ---------- */
  var wrongDelete = await profile.deleteAccount('nope-nope1');
  check(wrongDelete.ok === false, 'deleting needs the right password');
  var deleted = await profile.deleteAccount('newpass123');
  check(deleted.ok === true, 'the account can be deleted');
  check(profile.count() === 0, 'no account is left behind');
  check(profile.current() === null, 'deleting signs you out');

  /* ---------- storage failures ---------- */
  var failing = A.create({ storage: broken(), now: function () { return clock; } });
  var failed = await failing.signUp({ name: 'Full Disk', email: 'full@example.com', password: 'quiet9lake' });
  check(failed.ok === false && /storage/i.test(failed.error), 'a storage failure is reported, not thrown');

  console.log('');
  if (failures) {
    console.log(failures + ' check' + (failures === 1 ? '' : 's') + ' failed');
    process.exit(1);
  }
  console.log('all account checks passed');
}

main().catch(function (err) {
  console.error('FAIL crashed: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
