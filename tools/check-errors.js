/* Checks for the error log and the global handlers. */
'use strict';

var path = require('path');
var E = require(path.join(__dirname, '..', 'js/errors.js'));

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
    removeItem: function (k) { delete map[k]; }
  };
}

var clock = 1750000000000;
var store = memory();
var log = E.create({ storage: store, now: function () { return clock; }, limit: 3 });

check(E.messageOf(new Error('boom')) === 'boom', 'an Error gives its message');
check(E.messageOf('plain') === 'plain', 'a string is used as the message');
check(E.messageOf(null) === 'Unknown error', 'null becomes a friendly message');
check(E.messageOf(undefined) === 'Unknown error', 'undefined becomes a friendly message');
check(E.safe(function () { return 7; }, 0) === 7, 'safe returns the result');
check(E.safe(function () { throw new Error('x'); }, 'fallback') === 'fallback', 'safe swallows a throw');
var seen = null;
E.safe(function () { throw new Error('reported'); }, null, function (err) { seen = err; });
check(seen && seen.message === 'reported', 'safe reports the error to the caller');

var entry = log.capture(new Error('first problem'), 'play screen');
check(entry.message === 'first problem', 'the error message is captured');
check(entry.where === 'play screen', 'the context is captured');
check(log.count() === 1, 'one entry is stored');
check(log.entries()[0].message === 'first problem', 'entries can be read back');

var again = log.capture(new Error('first problem'), 'play screen');
check(log.count() === 1, 'the same problem is not stored twice');
check(again.count === 2, 'the repeat is counted instead');

clock += 1500;
log.capture(new Error('first problem'), 'play screen');
check(log.entries()[0].count === 3, 'repeats keep counting');

log.capture('second problem', 'puzzles');
log.capture('third problem', 'analysis');
check(log.count() === 3, 'three different problems are kept');

log.capture('fourth problem', 'review');
check(log.count() === 3, 'the log stops at the limit');
check(log.entries()[0].message === 'fourth problem', 'the newest problem comes first');
check(log.entries().some(function (e) { return e.message === 'first problem'; }) === false,
  'the oldest problem falls off the end');

var notified = [];
var off = log.subscribe(function (e) { notified.push(e); });
log.capture('watched problem', 'test');
check(notified.length === 1 && notified[0].message === 'watched problem', 'subscribers hear about new problems');
off();
log.capture('after unsubscribe', 'test');
check(notified.length === 1, 'unsubscribing stops the updates');

log.clear();
check(log.count() === 0, 'clearing empties the log');

var handlers = {};
var fakeWindow = {
  addEventListener: function (name, fn) { handlers[name] = fn; }
};
var installed = E.create({ storage: memory(), now: function () { return clock; } });
check(installed.install(fakeWindow).ok === true, 'the handlers install on a window');
check(typeof handlers.error === 'function', 'a window error handler is registered');
check(typeof handlers.unhandledrejection === 'function', 'a promise rejection handler is registered');

handlers.error({ message: 'Uncaught TypeError', filename: 'ui.js', lineno: 42, error: new Error('Uncaught TypeError') });
check(installed.count() === 1, 'a window error is recorded');
check(installed.entries()[0].where.indexOf('ui.js:42') >= 0, 'the file and line are recorded');

handlers.unhandledrejection({ reason: new Error('Promise blew up') });
check(installed.count() === 2, 'an unhandled rejection is recorded');
check(installed.entries()[0].message === 'Promise blew up', 'the rejection reason is recorded');
check(/promise/.test(installed.entries()[0].where), 'the entry is marked as a promise failure');

var noTarget = installed.install({});
check(noTarget.ok === false, 'installing without an event target fails politely');

var full = {
  getItem: function () { return null; },
  setItem: function () { throw new Error('QuotaExceededError'); },
  removeItem: function () {}
};
var noStore = E.create({ storage: full });
var still = noStore.capture(new Error('cannot save'));
check(still.message === 'cannot save', 'capture still works when storage is full');
check(noStore.count() === 0, 'a full storage does not crash the reporter');

console.log('');
if (failures) {
  console.log(failures + ' check' + (failures === 1 ? '' : 's') + ' failed');
  process.exit(1);
}
console.log('all error checks passed');
