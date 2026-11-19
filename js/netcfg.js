/* Gambit — where online play connects (original code, no dependencies).
 *
 * An empty server URL means "the page's own origin", which is what
 * `node server.js` serves. The published copy on a static host sets
 * window.GAMBIT_SERVER in js/config.js instead.
 */
(function (global) {
  'use strict';

  function clean(raw) {
    return String(raw == null ? '' : raw).trim().replace(/\/+$/, '');
  }

  function isConfigured(raw) {
    return clean(raw) !== '';
  }

  function wsUrl(raw, loc) {
    var base = clean(raw);

    if (!base) {
      var proto = loc && loc.protocol === 'https:' ? 'wss:' : 'ws:';
      var host = loc && loc.host ? loc.host : '127.0.0.1:8124';
      return proto + '//' + host + '/ws';
    }

    var url;
    if (/^wss?:\/\//i.test(base)) url = base;
    else if (/^https?:\/\//i.test(base)) url = base.replace(/^http/i, 'ws');
    else url = 'wss://' + base;

    return url + (/\/ws$/i.test(url) ? '' : '/ws');
  }

  function httpBase(raw) {
    var base = clean(raw);
    if (!base) return '';
    return base.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/ws$/i, '');
  }

  global.GambitNet = { wsUrl: wsUrl, httpBase: httpBase, isConfigured: isConfigured };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.GambitNet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
