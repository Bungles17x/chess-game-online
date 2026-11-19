/* Gambit — original piece artwork (hand-drawn SVG geometry, no third-party assets). */
(function (global) {
  'use strict';

  var SHAPES = {
    P:
      '<circle cx="22.5" cy="13.6" r="5.6"/>' +
      '<path d="M18.4 19.6h8.2c.7 3.1-.2 5.7-2.1 7.8-1 1.2-1.6 2.5-1.8 3.9h-.4c-.2-1.4-.8-2.7-1.8-3.9-1.9-2.1-2.8-4.7-2.1-7.8z"/>' +
      '<path d="M17.6 31.4h9.8v2.4h-9.8z"/>' +
      '<path d="M14.8 33.9h15.4a2.4 2.4 0 0 1 0 4.8H14.8a2.4 2.4 0 0 1 0-4.8z"/>',

    N:
      '<path d="M13.4 38.2 18.4 30.2 11.6 27.2 13.6 21.4 19.6 17.4 21 11.8 24 16 26.6 12.4 30.4 18.8 33.4 26 32.8 33 31.4 38.2Z"/>' +
      '<circle class="eye" cx="18.9" cy="22.8" r="1.2"/>',

    B:
      '<circle cx="22.5" cy="10.8" r="3.1"/>' +
      '<path d="M22.5 15c-3.4 2.5-5.5 5.6-5.5 8.9 0 3.1 2.4 5.6 5.5 5.6s5.5-2.5 5.5-5.6c0-3.3-2.1-6.4-5.5-8.9z"/>' +
      '<path d="M19.6 23.4h5.8v2.2h-5.8z"/>' +
      '<path d="M16.6 30.6h11.8v3H16.6z"/>' +
      '<path d="M13.8 33.8h17.4a2.4 2.4 0 0 1 0 4.8H13.8a2.4 2.4 0 0 1 0-4.8z"/>',

    R:
      '<path d="M11 9.6h5v3.2h4.3V9.6h5v3.2h4.3V9.6h5v7.8H11z"/>' +
      '<path d="M13.2 17.6h18.6l1.2 3.4v9.4H12v-9.4z"/>' +
      '<path d="M12 30.6h20.2v3.4H12z"/>' +
      '<path d="M11.2 34.2H33.8a2.4 2.4 0 0 1 0 4.8H11.2a2.4 2.4 0 0 1 0-4.8z"/>',

    Q:
      '<circle cx="22.5" cy="8.4" r="2.5"/>' +
      '<circle cx="11.4" cy="13.2" r="2.2"/>' +
      '<circle cx="33.6" cy="13.2" r="2.2"/>' +
      '<path d="M12.6 16.2 14.6 29.4h15.8l2-13.2-6.2 6.2-3.7-8.4-3.7 8.4z"/>' +
      '<path d="M14.6 30.2h15.8v3H14.6z"/>' +
      '<path d="M12.8 33.4h19.4a2.4 2.4 0 0 1 0 4.8H12.8a2.4 2.4 0 0 1 0-4.8z"/>',

    K:
      '<path d="M21.3 4.8h2.4v8.4h-2.4zM18.3 7.4h8.4v2.4h-8.4z"/>' +
      '<path d="M22.5 13.6c-4.2 0-7.4 2.9-7.4 6.6 0 2.2 1 4.1 2.6 5.4h9.6c1.6-1.3 2.6-3.2 2.6-5.4 0-3.7-3.2-6.6-7.4-6.6z"/>' +
      '<path d="M14.4 26.4h16.2v3.2H14.4z"/>' +
      '<path d="M12.6 30h19.8a2.4 2.4 0 0 1 0 4.8H12.6a2.4 2.4 0 0 1 0-4.8z"/>'
  };

  function svg(p, extraClass) {
    var cls = p === p.toUpperCase() ? 'pc-w' : 'pc-b';
    return '<svg class="piece ' + cls + (extraClass ? ' ' + extraClass : '') +
      '" viewBox="0 0 45 45" aria-hidden="true" focusable="false">' +
      SHAPES[p.toUpperCase()] + '</svg>';
  }

  global.PieceArt = { svg: svg, shapes: SHAPES };
})(typeof self !== 'undefined' ? self : window);
