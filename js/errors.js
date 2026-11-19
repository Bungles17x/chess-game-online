/* Gambit — error capture and the friendly error banner.
 *
 * Keeps the page usable when a handler throws: the error is recorded with a
 * time, a short message and where it happened, listeners are told, and the UI
 * shows a dismissible banner instead of dying silently.
 */
(function (global) {
  'use strict';

  var KEY = 'gambit.errors';
  var LIMIT = 40;

  function messageOf(error) {
    if (error == null) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error.message) return String(error.message);
    try { return String(error); } catch (err) { return 'Unknown error'; }
  }

  function whereOf(error) {
    if (!error || !error.stack) return '';
    var line = String(error.stack).split('\n')[1] || '';
    return line.trim().slice(0, 120);
  }

  function trim(text, max) {
    var s = String(text == null ? '' : text);
    return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
  }

  function safe(fn, fallback, onError) {
    try {
      return fn();
    } catch (err) {
      if (typeof onError === 'function') {
        try { onError(err); } catch (ignored) { /* never rethrow from the reporter */ }
      }
      return fallback;
    }
  }

  function create(options) {
    var opts = options || {};
    var store = opts.storage || null;
    var limit = opts.limit || LIMIT;
    var listeners = [];
    var clock = opts.now || function () { return Date.now(); };

    function read() {
      if (!store) return [];
      try {
        var list = JSON.parse(store.getItem(KEY) || '[]');
        return Array.isArray(list) ? list : [];
      } catch (err) {
        return [];
      }
    }

    function write(list) {
      if (!store) return false;
      try {
        store.setItem(KEY, JSON.stringify(list));
        return true;
      } catch (err) {
        return false;
      }
    }

    function emit(entry, list) {
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](entry, list); } catch (err) { /* a listener must not break the reporter */ }
      }
    }

    function capture(error, context) {
      var message = trim(messageOf(error), 300);
      var where = trim(context || whereOf(error), 140);
      var list = read();
      var found = null;

      for (var i = 0; i < list.length; i++) {
        if (list[i].message === message && list[i].where === where) { found = list[i]; break; }
      }

      if (found) {
        found.count = (found.count || 1) + 1;
        found.at = clock();
        list = list.filter(function (e) { return e !== found; });
        list.unshift(found);
        write(list);
        emit(found, list);
        return found;
      }

      var entry = { id: 'e' + clock().toString(36), at: clock(), message: message, where: where, count: 1 };
      list.unshift(entry);
      if (list.length > limit) list = list.slice(0, limit);
      write(list);
      emit(entry, list);
      return entry;
    }

    function entries() { return read(); }
    function count() { return read().length; }

    function clear() {
      write([]);
      emit(null, []);
      return { ok: true };
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (f) { return f !== fn; });
      };
    }

    function install(target) {
      var host = target || global;
      if (!host || !host.addEventListener) return { ok: false, error: 'No event target to watch.' };

      host.addEventListener('error', function (ev) {
        var message = ev && ev.error ? messageOf(ev.error) : messageOf(ev && ev.message);
        var where = ev && ev.filename ? ev.filename + ':' + (ev.lineno || 0) : '';
        capture(ev && ev.error ? ev.error : message, where);
      });

      host.addEventListener('unhandledrejection', function (ev) {
        var reason = ev && ev.reason;
        capture(reason, 'unhandled promise' + (whereOf(reason) ? ' ' + whereOf(reason) : ''));
      });

      return { ok: true };
    }

    return {
      capture: capture,
      entries: entries,
      count: count,
      clear: clear,
      subscribe: subscribe,
      install: install
    };
  }

  var api = {
    KEY: KEY,
    create: create,
    messageOf: messageOf,
    whereOf: whereOf,
    safe: safe
  };

  global.ErrorLog = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
