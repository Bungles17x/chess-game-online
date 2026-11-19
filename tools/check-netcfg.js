/* Checks for the online server address handling. */
'use strict';

var path = require('path');
var N = require(path.join(__dirname, '..', 'js/netcfg.js'));

var failures = 0;
function check(ok, label) {
  if (ok) console.log('ok   ' + label);
  else { failures++; console.log('FAIL ' + label); }
}

var local = { protocol: 'http:', host: '127.0.0.1:8124', hostname: '127.0.0.1' };
var page = { protocol: 'https:', host: 'bungles17x.github.io', hostname: 'bungles17x.github.io' };

check(N.wsUrl('', local) === 'ws://127.0.0.1:8124/ws', 'no server set means the page\u2019s own origin');
check(N.wsUrl('   ', local) === 'ws://127.0.0.1:8124/ws', 'blank space counts as no server');

check(N.wsUrl('https://gambit-online.onrender.com', page) === 'wss://gambit-online.onrender.com/ws',
  'an https server becomes a secure socket');
check(N.wsUrl('https://gambit-online.onrender.com/', page) === 'wss://gambit-online.onrender.com/ws',
  'a trailing slash is ignored');
check(N.wsUrl('http://localhost:9000', page) === 'ws://localhost:9000/ws',
  'plain http becomes a plain socket');
check(N.wsUrl('wss://gambit.example.dev/ws', page) === 'wss://gambit.example.dev/ws',
  'a socket url is left alone');
check(N.wsUrl('wss://gambit.example.dev', page) === 'wss://gambit.example.dev/ws',
  '/ws is appended to a socket origin');
check(N.wsUrl('gambit-online.onrender.com', page) === 'wss://gambit-online.onrender.com/ws',
  'a bare host is assumed to be https');

check(N.isConfigured('') === false && N.isConfigured('  ') === false, 'empty means unconfigured');
check(N.isConfigured('https://x.dev') === true, 'a url means configured');

check(N.httpBase('https://x.dev/ws') === 'https://x.dev', 'the http base drops the socket path');
check(N.httpBase('ws://localhost:9000/ws') === 'http://localhost:9000', 'ws turns into http');

if (failures) {
  console.log('\n' + failures + ' network config check(s) failed');
  process.exit(1);
}
console.log('\nall network config checks passed');
