/* Gambit — verification email delivery.
 *
 * Two transports, both server-side and dependency-free:
 *   1. SMTP through your own mailbox (e.g. Gmail) with an app password.
 *   2. Resend's HTTP API with an API key.
 * SMTP wins when both are configured. With neither, nothing is sent and the
 * page falls back to showing the code locally, so the app still works offline.
 */
'use strict';

const tls = require('tls');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/* Read KEY=value lines into process.env without overriding real env vars. */
function loadEnv(file, fsImpl) {
  const fs = fsImpl || require('fs');
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (err) { return false; }
  text.split(/\r?\n/).forEach((line) => {
    const clean = line.trim();
    if (!clean || clean.charAt(0) === '#') return;
    const at = clean.indexOf('=');
    if (at < 1) return;
    const key = clean.slice(0, at).trim();
    let value = clean.slice(at + 1).trim();
    if (value.length > 1 && (value.charAt(0) === '"' || value.charAt(0) === "'")) {
      if (value.charAt(value.length - 1) === value.charAt(0)) value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
  return true;
}

function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bodyFor(input) {
  const hello = input.name ? 'Hi ' + input.name + ',' : 'Hi,';
  const reset = input.kind === 'reset';
  const subject = reset ? 'Reset your Gambit password' : 'Your Gambit verification code';
  const lead = reset ? 'Use this code to set a new Gambit password:' : 'Here is your Gambit verification code:';

  const text = [
    hello,
    '',
    lead + ' ' + input.code,
    '',
    'It expires in 10 minutes. If you did not ask for it, ignore this email.',
    '',
    '\u2014 Gambit'
  ].join('\n');

  const html = '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f1ea;' +
    'font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#262421">' +
    '<div style="max-width:440px;margin:0 auto;padding:24px;background:#ffffff;border-radius:12px">' +
    '<div style="font-size:20px;font-weight:700">Gambit</div>' +
    '<p style="margin:2px 0 18px;font-size:12px;color:#6f6a63">Free chess, on your device.</p>' +
    '<p style="margin:0 0 10px;font-size:14px">' + esc(hello) + '</p>' +
    '<p style="margin:0 0 12px;font-size:14px">' + esc(lead) + '</p>' +
    '<div style="padding:16px;border-radius:8px;background:#f4f1ea;text-align:center;' +
    'font-size:30px;font-weight:700;letter-spacing:8px">' + esc(input.code) + '</div>' +
    '<p style="margin:16px 0 0;font-size:12px;color:#6f6a63">It expires in 10 minutes. ' +
    'If you did not ask for this, ignore this email.</p>' +
    '</div></body></html>';

  return { subject, text, html };
}

/* "Gambit <hello@example.com>" -> "hello@example.com". */
function addressOf(value, fallback) {
  const text = String(value == null ? '' : value).trim();
  const angled = /<([^>]+)>/.exec(text);
  const address = (angled ? angled[1] : text).trim();
  return EMAIL_RE.test(address) ? address : (fallback || '');
}

function encodeHeader(text) {
  const value = String(text == null ? '' : text);
  return /^[\x20-\x7E]*$/.test(value)
    ? value
    : '=?UTF-8?B?' + Buffer.from(value, 'utf8').toString('base64') + '?=';
}

/* Full RFC 5322 message, plain text plus HTML alternative. */
function buildMessage(input) {
  const boundary = 'gambit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const messageId = '<' + boundary + '@gambit.local>';
  const lines = [
    'From: ' + input.from,
    'To: ' + input.to,
    'Subject: ' + encodeHeader(input.subject),
    'Date: ' + new Date().toUTCString(),
    'Message-ID: ' + messageId,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.text,
    '--' + boundary,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.html,
    '--' + boundary + '--'
  ];
  return { data: lines.join('\r\n'), messageId: messageId };
}

/* SMTP DATA needs lines starting with a dot escaped. */
function dotStuff(message) {
  return String(message).split('\r\n').map(function (line) {
    return line.charAt(0) === '.' ? '.' + line : line;
  }).join('\r\n');
}

/* Minimal implicit-TLS SMTP client: greeting, AUTH LOGIN, one message. */
function smtpDeliver(opts) {
  return new Promise(function (resolve) {
    let settled = false;
    let socket;

    const finish = function (result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { if (socket) socket.destroy(); } catch (err) { /* already gone */ }
      resolve(result);
    };

    const timer = setTimeout(function () {
      finish({ ok: false, error: 'The mail server did not answer in time.' });
    }, opts.timeout || 20000);

    try {
      socket = tls.connect({ host: opts.host, port: opts.port, servername: opts.host });
    } catch (err) {
      finish({ ok: false, error: 'Could not open a secure connection to ' + opts.host + '.' });
      return;
    }

    socket.setEncoding('utf8');
    socket.on('error', function (err) {
      finish({ ok: false, error: 'Could not reach ' + opts.host + ' (' + (err.code || err.message) + ').' });
    });
    socket.on('close', function () {
      finish({ ok: false, error: 'The mail server closed the connection early.' });
    });

    let buffer = '';
    let pending = null;
    let multi = [];

    socket.on('data', function (chunk) {
      buffer += chunk;
      let at;
      while ((at = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, at);
        buffer = buffer.slice(at + 2);
        if (/^\d{3}-/.test(line)) { multi.push(line); continue; }
        const reply = { code: Number(line.slice(0, 3)), lines: multi.concat(line) };
        multi = [];
        if (pending) {
          const waiter = pending;
          pending = null;
          waiter(reply);
        }
      }
    });

    function read() {
      return new Promise(function (res) { pending = res; });
    }

    function send(line) {
      socket.write(line + '\r\n');
      return read();
    }

    socket.once('secureConnect', function () {
      (async function () {
        let reply;

        reply = await read();
        if (!reply || reply.code !== 220) {
          return finish({ ok: false, error: 'The mail server refused the connection.' });
        }

        reply = await send('EHLO gambit.local');
        if (reply.code !== 250) return finish({ ok: false, error: 'The mail server rejected EHLO.' });

        reply = await send('AUTH LOGIN');
        if (reply.code !== 334) {
          return finish({ ok: false, error: 'The mail server does not allow password login on this port.' });
        }

        reply = await send(Buffer.from(opts.user, 'utf8').toString('base64'));
        if (reply.code !== 334) return finish({ ok: false, error: 'The mail server rejected the username.' });

        reply = await send(Buffer.from(opts.pass, 'utf8').toString('base64'));
        if (reply.code !== 235) {
          return finish({ ok: false, error: 'Login was refused. Check SMTP_USER and the app password in SMTP_PASS.' });
        }

        reply = await send('MAIL FROM:<' + opts.fromAddress + '>');
        if (reply.code !== 250) {
          return finish({ ok: false, error: 'The sender address was refused. Use the same address as SMTP_USER.' });
        }

        reply = await send('RCPT TO:<' + opts.to + '>');
        if (reply.code !== 250 && reply.code !== 251) {
          return finish({
            ok: false,
            error: 'The recipient was refused: ' + reply.lines.join(' ').slice(0, 150)
          });
        }

        reply = await send('DATA');
        if (reply.code !== 354) return finish({ ok: false, error: 'The server would not accept a message body.' });

        socket.write(dotStuff(opts.message).replace(/\r\n$/, '') + '\r\n.\r\n');
        reply = await read();
        if (reply.code !== 250) {
          return finish({
            ok: false,
            error: 'The message was rejected: ' + reply.lines.join(' ').slice(0, 150)
          });
        }

        socket.write('QUIT\r\n');
        finish({ ok: true, messageId: opts.messageId || '' });
      })().catch(function (err) {
        finish({ ok: false, error: 'The mail server dropped the connection (' + (err && err.message) + ').' });
      });
    });
  });
}

function smtpConfig(env) {
  const user = String(env.SMTP_USER || '').trim();
  const pass = String(env.SMTP_PASS || '');
  if (!user || !pass) return null;
  return {
    host: String(env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(env.SMTP_PORT) || 465,
    user: user,
    pass: pass,
    from: String(env.SMTP_FROM || user).trim()
  };
}

function createMailer(options) {
  const opts = options || {};
  const env = opts.env || process.env;
  const now = opts.now || Date.now;
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const smtpSend = opts.smtpSend || smtpDeliver;
  const limit = opts.limit || 5;
  const windowMs = opts.windowMs || 10 * 60 * 1000;
  const timeoutMs = opts.timeoutMs || 12000;
  const hits = new Map();

  function transport() {
    if (smtpConfig(env)) return 'smtp';
    const key = typeof env.RESEND_API_KEY === 'string' ? env.RESEND_API_KEY.trim() : '';
    return key ? 'resend' : 'none';
  }

  function configured() {
    return transport() !== 'none';
  }

  function sender() {
    const smtp = smtpConfig(env);
    if (smtp) return smtp.from;
    return (env.RESEND_FROM || 'Gambit <onboarding@resend.dev>').trim();
  }

  /* At most `limit` codes per key per window. */
  function allow(key) {
    const stamp = now();
    let list = hits.get(key);
    if (!list) {
      list = [];
      hits.set(key, list);
    }
    for (let i = list.length - 1; i >= 0; i--) {
      if (stamp - list[i] > windowMs) list.splice(i, 1);
    }
    if (list.length >= limit) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((windowMs - (stamp - list[0])) / 1000))
      };
    }
    list.push(stamp);
    return { ok: true, retryAfter: 0 };
  }

  async function sendCode(input) {
    const data = input || {};
    const email = String(data.email == null ? '' : data.email).trim();
    const code = String(data.code == null ? '' : data.code).trim();
    const name = String(data.name == null ? '' : data.name).trim().slice(0, 40);
    const kind = data.purpose === 'reset' ? 'reset' : 'verify';

    if (!EMAIL_RE.test(email)) {
      return { ok: false, status: 400, configured: configured(), error: 'That email address does not look right.' };
    }
    if (!/^\d{6}$/.test(code)) {
      return { ok: false, status: 400, configured: configured(), error: 'The code must be six digits.' };
    }
    if (!configured()) {
      return {
        ok: false,
        status: 503,
        configured: false,
        error: 'Email is not set up on this server. Add SMTP_USER and SMTP_PASS to .env.'
      };
    }

    const gate = allow(String(data.key || email).slice(0, 200));
    if (!gate.ok) {
      return {
        ok: false,
        status: 429,
        configured: true,
        retryAfter: gate.retryAfter,
        error: 'Too many codes requested. Try again in ' + gate.retryAfter + 's.'
      };
    }

    const mail = bodyFor({ email, code, name, kind });
    const smtp = smtpConfig(env);

    if (smtp) {
      const fromAddress = addressOf(smtp.from, smtp.user);
      const built = buildMessage({ from: smtp.from, to: email, subject: mail.subject, text: mail.text, html: mail.html });
      const out = await smtpSend({
        host: smtp.host,
        port: smtp.port,
        user: smtp.user,
        pass: smtp.pass,
        fromAddress: fromAddress,
        to: email,
        message: built.data,
        messageId: built.messageId,
        timeout: timeoutMs
      });
      if (!out || !out.ok) {
        return {
          ok: false,
          status: 502,
          configured: true,
          error: (out && out.error) || 'The mail server refused the message.'
        };
      }
      return { ok: true, status: 200, configured: true, id: out.messageId || '' };
    }

    if (typeof fetchImpl !== 'function') {
      return { ok: false, status: 500, configured: true, error: 'This server cannot make outbound requests.' };
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    let res;
    try {
      res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.RESEND_API_KEY.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: sender(), to: [email], subject: mail.subject, text: mail.text, html: mail.html }),
        signal: controller ? controller.signal : undefined
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      return { ok: false, status: 502, configured: true, error: 'The email service could not be reached.' };
    }
    if (timer) clearTimeout(timer);

    let payload = null;
    try { payload = await res.json(); } catch (err) { payload = null; }

    if (!res.ok) {
      let reason = payload && (payload.message || payload.error) ? String(payload.message || payload.error) : '';
      if (res.status === 401 || res.status === 403) {
        reason = 'The email service rejected the API key or sender. Check RESEND_API_KEY and RESEND_FROM.';
      } else if (res.status === 429) {
        reason = 'The email service is rate limiting. Try again shortly.';
      } else if (!reason) {
        reason = 'The email service refused the message (HTTP ' + res.status + ').';
      }
      return { ok: false, status: 502, configured: true, error: reason.slice(0, 200) };
    }

    return { ok: true, status: 200, configured: true, id: payload && payload.id ? String(payload.id) : '' };
  }

  return {
    configured,
    transport,
    sender,
    allow,
    sendCode,
    windowMs,
    reset: function () { hits.clear(); }
  };
}

module.exports = { createMailer, bodyFor, buildMessage, addressOf, smtpConfig, loadEnv, EMAIL_RE };
