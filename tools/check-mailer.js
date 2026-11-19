/* Checks for verification email delivery (no network is used). */
'use strict';

var path = require('path');
var M = require(path.join(__dirname, '..', 'mailer.js'));

var failures = 0;
function check(ok, label) {
  if (ok) console.log('ok   ' + label);
  else { failures++; console.log('FAIL ' + label); }
}

var clock = 1750000000000;
var calls = [];

function makeFetch(reply) {
  return function (url, init) {
    calls.push({ url: url, init: init });
    return Promise.resolve({
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: function () { return Promise.resolve(reply.body || {}); }
    });
  };
}

function mailer(env, fetchImpl, opts) {
  var extra = opts || {};
  return M.createMailer({
    env: env,
    fetchImpl: fetchImpl,
    smtpSend: extra.smtpSend,
    now: function () { return clock; },
    limit: extra.limit || 5,
    windowMs: extra.windowMs || 600000
  });
}

async function main() {
  /* ---------- templates ---------- */
  var verify = M.bodyFor({ code: '123456', name: 'Ada', kind: 'verify' });
  check(/verification code/i.test(verify.subject), 'a verify mail has the right subject');
  check(verify.text.indexOf('123456') >= 0, 'the code appears in the plain text');
  check(verify.text.indexOf('Hi Ada,') >= 0, 'the name is used in the greeting');
  check(verify.html.indexOf('123456') >= 0, 'the code appears in the HTML');

  var reset = M.bodyFor({ code: '654321', name: '', kind: 'reset' });
  check(/reset/i.test(reset.subject), 'a reset mail says reset');
  check(/password/i.test(reset.text), 'a reset mail talks about the password');
  check(reset.text.indexOf('Hi,') >= 0, 'without a name the greeting stays neutral');

  var nasty = M.bodyFor({ code: '111111', name: '<script>alert(1)</script>', kind: 'verify' });
  check(nasty.html.indexOf('<script>') === -1, 'markup in the display name is escaped');
  check(nasty.html.indexOf('&lt;script&gt;') >= 0, 'the escaped name is still readable');

  /* ---------- validation without a key ---------- */
  calls = [];
  var off = mailer({}, makeFetch({ status: 200 }));
  check(off.configured() === false, 'no key means delivery is off');
  check(off.sender() === 'Gambit <onboarding@resend.dev>', 'the default test sender is used');

  var offSend = await off.sendCode({ email: 'ada@example.com', code: '123456' });
  check(offSend.ok === false && offSend.configured === false, 'sending without a key reports it is not set up');
  check(offSend.status === 503, 'the unconfigured status is 503');
  check(calls.length === 0, 'no network call is made without a key');

  /* ---------- validation ---------- */
  var ready = mailer({ RESEND_API_KEY: 're_test_key' }, makeFetch({ status: 200, body: { id: 'mail_1' } }));
  check(ready.configured() === true, 'a key turns delivery on');

  calls = [];
  var badEmail = await ready.sendCode({ email: 'not-an-email', code: '123456' });
  check(badEmail.ok === false && badEmail.status === 400, 'a bad address is refused');

  var badCode = await ready.sendCode({ email: 'ada@example.com', code: '12' });
  check(badCode.ok === false && badCode.status === 400, 'a bad code is refused');
  check(calls.length === 0, 'validation failures never reach the network');

  /* ---------- a real send ---------- */
  ready.reset();
  var sent = await ready.sendCode({ email: 'gambitchessservices@gmail.com', code: '246810', name: 'Ada', purpose: 'verify' });
  check(sent.ok === true && sent.status === 200, 'a valid request is accepted');
  check(sent.id === 'mail_1', 'the provider message id is passed back');
  check(calls.length === 1 && calls[0].url === 'https://api.resend.com/emails', 'the Resend endpoint is called once');

  var payload = JSON.parse(calls[0].init.body);
  check(payload.to.length === 1 && payload.to[0] === 'gambitchessservices@gmail.com', 'the mail goes to the requested address');
  check(payload.from === 'Gambit <onboarding@resend.dev>', 'the default sender is used');
  check(payload.subject.indexOf('verification') >= 0, 'the subject is set');
  check(payload.text.indexOf('246810') >= 0, 'the code is in the message body');
  check(calls[0].init.headers.Authorization === 'Bearer re_test_key', 'the key is sent as a bearer token');
  check(payload.html.indexOf('246810') >= 0, 'the HTML part carries the code too');

  var custom = mailer({ RESEND_API_KEY: 'k', RESEND_FROM: 'Gambit <hello@gambit.test>' }, makeFetch({ status: 200 }));
  await custom.sendCode({ email: 'ada@example.com', code: '123456' });
  check(JSON.parse(calls[calls.length - 1].init.body).from === 'Gambit <hello@gambit.test>', 'RESEND_FROM overrides the sender');

  /* ---------- provider and network failures ---------- */
  var rejected = mailer({ RESEND_API_KEY: 'bad' }, makeFetch({ status: 401, body: { message: 'Invalid API key' } }));
  var rejectedOut = await rejected.sendCode({ email: 'ada@example.com', code: '123456' });
  check(rejectedOut.ok === false && rejectedOut.status === 502, 'a rejected key is a friendly failure');
  check(/RESEND_API_KEY|sender/.test(rejectedOut.error), 'the error says which setting to check');
  check(rejectedOut.error.indexOf('bad') === -1, 'the key value is never echoed');

  var throttled = mailer({ RESEND_API_KEY: 'k' }, makeFetch({ status: 429, body: {} }));
  var throttledOut = await throttled.sendCode({ email: 'ada@example.com', code: '123456' });
  check(throttledOut.ok === false && /rate limiting/i.test(throttledOut.error), 'a provider rate limit is explained');

  var broken = mailer({ RESEND_API_KEY: 'k' }, function () { return Promise.reject(new Error('offline')); });
  var brokenOut = await broken.sendCode({ email: 'ada@example.com', code: '123456' });
  check(brokenOut.ok === false && brokenOut.status === 502, 'a network failure is reported, not thrown');
  check(/could not be reached/i.test(brokenOut.error), 'the network error is explained');

  /* ---------- throttling ---------- */
  var limited = mailer({ RESEND_API_KEY: 'k' }, makeFetch({ status: 200 }), { limit: 2, windowMs: 60000 });
  var first = await limited.sendCode({ email: 'a@example.com', code: '111111' });
  var second = await limited.sendCode({ email: 'a@example.com', code: '111111' });
  var third = await limited.sendCode({ email: 'a@example.com', code: '111111' });
  check(first.ok && second.ok, 'the first codes inside the window go out');
  check(third.ok === false && third.status === 429, 'the third code in the window is throttled');
  check(third.retryAfter > 0 && third.retryAfter <= 60, 'the throttle reports a retry time');

  clock += 61000;
  var afterWindow = await limited.sendCode({ email: 'a@example.com', code: '111111' });
  check(afterWindow.ok === true, 'the window rolls over and sending works again');

  /* ---------- SMTP transport (no email service) ---------- */
  var smtpCalls = [];
  var smtpEnv = {
    SMTP_USER: 'gambitchessservices@gmail.com',
    SMTP_PASS: 'app-password',
    SMTP_FROM: 'Gambit <gambitchessservices@gmail.com>'
  };
  var smtpOk = function (opts) {
    smtpCalls.push(opts);
    return Promise.resolve({ ok: true, messageId: '<abc@gambit.local>' });
  };
  var viaSmtp = mailer(smtpEnv, makeFetch({ status: 500 }), { smtpSend: smtpOk });
  check(viaSmtp.transport() === 'smtp', 'SMTP credentials select the SMTP transport');
  check(viaSmtp.configured() === true, 'SMTP credentials count as configured');
  check(viaSmtp.sender() === 'Gambit <gambitchessservices@gmail.com>', 'the SMTP from address is used');

  var smtpOut = await viaSmtp.sendCode({ email: 'gambitchessservices@gmail.com', code: '135790' });
  check(smtpOut.ok === true && smtpOut.status === 200, 'a valid request goes out over SMTP');
  check(smtpCalls.length === 1, 'the SMTP client is called once');
  var handoff = smtpCalls[0];
  check(handoff.fromAddress === 'gambitchessservices@gmail.com', 'the envelope sender is read from the display name');
  check(handoff.to === 'gambitchessservices@gmail.com', 'the recipient reaches the SMTP client');
  check(handoff.message.indexOf('135790') >= 0, 'the code is in the SMTP message');
  check(/Subject: Your Gambit verification code/.test(handoff.message), 'the SMTP message has a subject');
  check(/multipart\/alternative/.test(handoff.message), 'the SMTP message carries text and HTML parts');
  check(/^<.+@gambit\.local>$/.test(handoff.messageId), 'a message id is generated');
  check(handoff.user === 'gambitchessservices@gmail.com', 'the mailbox user is passed to the client');

  var smtpFail = mailer(smtpEnv, makeFetch({ status: 200 }), {
    smtpSend: function () { return Promise.resolve({ ok: false, error: 'Login was refused.' }); }
  });
  var smtpFailOut = await smtpFail.sendCode({ email: 'a@example.com', code: '123456' });
  check(smtpFailOut.ok === false && smtpFailOut.status === 502, 'an SMTP failure is reported, not thrown');
  check(/Login/.test(smtpFailOut.error), 'the SMTP error text is passed through');

  var halfSmtp = mailer({ SMTP_USER: 'a@example.com' }, makeFetch({ status: 200 }), { smtpSend: smtpOk });
  check(halfSmtp.configured() === false, 'a username without a password is not configured');

  check(M.addressOf('Gambit <x@y.co>') === 'x@y.co', 'the bracketed sender address is extracted');
  check(M.addressOf('x@y.co') === 'x@y.co', 'a bare sender address is accepted');
  check(M.addressOf('nonsense', 'fallback@x.co') === 'fallback@x.co', 'a bad sender falls back');

  var built = M.buildMessage({
    from: 'Gambit <x@y.co>', to: 'z@y.co',
    subject: 'Your Gambit verification code', text: 'code 111111', html: '<b>code 111111</b>'
  });
  check(built.messageId.charAt(0) === '<', 'buildMessage makes a message id');
  check(built.data.indexOf('To: z@y.co') >= 0, 'the message has a To header');
  check(built.data.indexOf('code 111111') >= 0, 'the message body is included');

  console.log('');
  if (failures) {
    console.log(failures + ' check' + (failures === 1 ? '' : 's') + ' failed');
    process.exit(1);
  }
  console.log('all mailer checks passed');
}

main().catch(function (err) {
  console.error('FAIL crashed: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
