/* Send one real verification email to prove delivery works.
 * Usage: node tools/send-test-email.js you@example.com
 * Reads RESEND_API_KEY and RESEND_FROM from .env; never prints the key.
 */
'use strict';

const path = require('path');
const { createMailer, loadEnv } = require(path.join(__dirname, '..', 'mailer.js'));

loadEnv(path.join(__dirname, '..', '.env'));

const to = String(process.argv[2] || '').trim();
if (!to) {
  console.error('Usage: node tools/send-test-email.js you@example.com');
  process.exit(2);
}

const mailer = createMailer({ env: process.env });
if (!mailer.configured()) {
  console.error('No mail transport is configured in .env. Add SMTP_USER + SMTP_PASS (or RESEND_API_KEY) and try again.');
  process.exit(1);
}

const code = String(Math.floor(100000 + Math.random() * 900000));

mailer.sendCode({ email: to, code: code, name: 'Gambit', purpose: 'verify' }).then((out) => {
  console.log(JSON.stringify({
    ok: !!out.ok,
    status: out.status,
    transport: mailer.transport(),
    from: mailer.sender(),
    to: to,
    id: out.id || '',
    error: out.error || ''
  }, null, 2));
  process.exit(out.ok ? 0 : 1);
}).catch((err) => {
  console.error('Send crashed: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
