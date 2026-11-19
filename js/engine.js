/* Gambit — original chess rules engine (no third-party code).
 * Board index 0 = a8 ... 63 = h1.  Uppercase = white, lowercase = black.
 */
(function (global) {
  'use strict';

  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var FILES = 'abcdefgh';
  var KNIGHT_DELTAS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var ALLDIR = DIAG.concat(ORTHO);

  function rowOf(i) { return i >> 3; }
  function colOf(i) { return i & 7; }
  function colorOf(p) { return p == null ? null : (p === p.toUpperCase() ? 'w' : 'b'); }
  function sqName(i) { return FILES[i & 7] + (8 - (i >> 3)); }
  function nameSq(s) {
    if (!s || s === '-') return -1;
    var f = FILES.indexOf(s.charAt(0));
    var r = Number(s.charAt(1));
    if (f < 0 || !(r >= 1 && r <= 8)) return -1;
    return (8 - r) * 8 + f;
  }
  function isLight(i) { return ((i >> 3) + (i & 7)) % 2 === 0; }

  function mkMove(from, to, piece, extra) {
    var m = {
      from: from, to: to, piece: piece, captured: null,
      promo: null, castle: null, ep: false, double: false
    };
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }

  function Chess(fen) {
    this.trackKeys = true;
    this.load(fen || START_FEN);
  }

  Chess.prototype.load = function (fen) {
    var parts = String(fen).trim().split(/\s+/);
    var rows = parts[0].split('/');
    var board = new Array(64).fill(null);
    var i = 0;
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r].charAt(c);
        if (ch >= '1' && ch <= '8') i += Number(ch);
        else board[i++] = ch;
      }
    }
    this.board = board;
    this.turn = parts[1] === 'b' ? 'b' : 'w';
    this.castling = { K: false, Q: false, k: false, q: false };
    var rights = parts[2] || '-';
    if (rights !== '-') {
      for (var j = 0; j < rights.length; j++) {
        if (rights.charAt(j) in this.castling) this.castling[rights.charAt(j)] = true;
      }
    }
    this.ep = nameSq(parts[3]);
    this.halfmove = Number(parts[4] || 0) || 0;
    this.fullmove = Number(parts[5] || 1) || 1;
    this.kings = { w: board.indexOf('K'), b: board.indexOf('k') };
    this.history = [];
    this.keys = [];
    if (this.trackKeys) this.keys.push(this.positionKey());
  };

  Chess.prototype.fen = function () {
    var out = '', empty = 0;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = this.board[r * 8 + c];
        if (!p) { empty++; continue; }
        if (empty) { out += empty; empty = 0; }
        out += p;
      }
      if (empty) { out += empty; empty = 0; }
      if (r < 7) out += '/';
    }
    var cast = '';
    if (this.castling.K) cast += 'K';
    if (this.castling.Q) cast += 'Q';
    if (this.castling.k) cast += 'k';
    if (this.castling.q) cast += 'q';
    return out + ' ' + this.turn + ' ' + (cast || '-') + ' ' +
      (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.halfmove + ' ' + this.fullmove;
  };

  Chess.prototype.positionKey = function () {
    var f = this.fen().split(' ');
    return f[0] + ' ' + f[1] + ' ' + f[2] + ' ' + f[3];
  };

  /* ---------- attacks ---------- */

  Chess.prototype.isAttacked = function (sq, by) {
    if (sq < 0 || sq > 63) return false;
    var b = this.board, r = rowOf(sq), c = colOf(sq), dr, dc, rr, cc, i;
    var pawn = by === 'w' ? 'P' : 'p';
    var pr = by === 'w' ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      if (c > 0 && b[pr * 8 + c - 1] === pawn) return true;
      if (c < 7 && b[pr * 8 + c + 1] === pawn) return true;
    }
    var knight = by === 'w' ? 'N' : 'n';
    for (i = 0; i < 8; i++) {
      dr = KNIGHT_DELTAS[i][0]; dc = KNIGHT_DELTAS[i][1];
      rr = r + dr; cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === knight) return true;
    }
    var king = by === 'w' ? 'K' : 'k';
    for (i = 0; i < 8; i++) {
      dr = ALLDIR[i][0]; dc = ALLDIR[i][1];
      rr = r + dr; cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === king) return true;
    }
    var rq = by === 'w' ? 'RQ' : 'rq';
    var bq = by === 'w' ? 'BQ' : 'bq';
    for (i = 0; i < 4; i++) {
      dr = ORTHO[i][0]; dc = ORTHO[i][1];
      rr = r + dr; cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        var p = b[rr * 8 + cc];
        if (p) { if (rq.indexOf(p) >= 0) return true; break; }
        rr += dr; cc += dc;
      }
    }
    for (i = 0; i < 4; i++) {
      dr = DIAG[i][0]; dc = DIAG[i][1];
      rr = r + dr; cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        var q = b[rr * 8 + cc];
        if (q) { if (bq.indexOf(q) >= 0) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  };

  /* ---------- move generation ---------- */

  Chess.prototype.pseudoMoves = function (color) {
    color = color || this.turn;
    var b = this.board, moves = [];
    var enemy = color === 'w' ? 'b' : 'w';
    for (var from = 0; from < 64; from++) {
      var p = b[from];
      if (!p || colorOf(p) !== color) continue;
      var type = p.toUpperCase();
      var r = rowOf(from), c = colOf(from);

      if (type === 'P') {
        var dir = color === 'w' ? -8 : 8;
        var startRow = color === 'w' ? 6 : 1;
        var lastRow = color === 'w' ? 0 : 7;
        var one = from + dir;
        if (!b[one]) {
          if (rowOf(one) === lastRow) {
            moves.push(mkMove(from, one, p, { promo: 'Q' }));
            moves.push(mkMove(from, one, p, { promo: 'R' }));
            moves.push(mkMove(from, one, p, { promo: 'B' }));
            moves.push(mkMove(from, one, p, { promo: 'N' }));
          } else {
            moves.push(mkMove(from, one, p));
            if (r === startRow && !b[one + dir]) {
              moves.push(mkMove(from, one + dir, p, { double: true }));
            }
          }
        }
        for (var d = -1; d <= 1; d += 2) {
          var cc = c + d;
          if (cc < 0 || cc > 7) continue;
          var to = one + d;
          if (to < 0 || to > 63) continue;
          var tp = b[to];
          if (tp && colorOf(tp) === enemy) {
            if (rowOf(to) === lastRow) {
              moves.push(mkMove(from, to, p, { promo: 'Q' }));
              moves.push(mkMove(from, to, p, { promo: 'R' }));
              moves.push(mkMove(from, to, p, { promo: 'B' }));
              moves.push(mkMove(from, to, p, { promo: 'N' }));
            } else {
              moves.push(mkMove(from, to, p));
            }
          } else if (!tp && to === this.ep) {
            moves.push(mkMove(from, to, p, { ep: true }));
          }
        }
        continue;
      }

      if (type === 'N' || type === 'K') {
        var deltas = type === 'N' ? KNIGHT_DELTAS : ALLDIR;
        for (var k = 0; k < 8; k++) {
          var nr = r + deltas[k][0], nc = c + deltas[k][1];
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          var nt = nr * 8 + nc, np = b[nt];
          if (np && colorOf(np) === color) continue;
          moves.push(mkMove(from, nt, p));
        }
        if (type === 'K') {
          var home = color === 'w' ? 60 : 4;
          if (from === home && !this.isAttacked(home, enemy)) {
            var kRight = color === 'w' ? this.castling.K : this.castling.k;
            var qRight = color === 'w' ? this.castling.Q : this.castling.q;
            var rook = color === 'w' ? 'R' : 'r';
            if (kRight && b[home + 3] === rook && !b[home + 1] && !b[home + 2] &&
              !this.isAttacked(home + 1, enemy) && !this.isAttacked(home + 2, enemy)) {
              moves.push(mkMove(from, home + 2, p, { castle: 'k' }));
            }
            if (qRight && b[home - 4] === rook && !b[home - 1] && !b[home - 2] && !b[home - 3] &&
              !this.isAttacked(home - 1, enemy) && !this.isAttacked(home - 2, enemy)) {
              moves.push(mkMove(from, home - 2, p, { castle: 'q' }));
            }
          }
        }
        continue;
      }

      var dirs = type === 'B' ? DIAG : type === 'R' ? ORTHO : ALLDIR;
      for (var s = 0; s < dirs.length; s++) {
        var sr = r + dirs[s][0], sc = c + dirs[s][1];
        while (sr >= 0 && sr < 8 && sc >= 0 && sc < 8) {
          var si = sr * 8 + sc, sp = b[si];
          if (sp) {
            if (colorOf(sp) !== color) moves.push(mkMove(from, si, p));
            break;
          }
          moves.push(mkMove(from, si, p));
          sr += dirs[s][0]; sc += dirs[s][1];
        }
      }
    }
    return moves;
  };

  Chess.prototype.inCheck = function (color) {
    color = color || this.turn;
    var k = this.kings[color];
    if (k < 0) return false;
    return this.isAttacked(k, color === 'w' ? 'b' : 'w');
  };

  Chess.prototype.legalMoves = function (color) {
    color = color || this.turn;
    var out = [], pseudo = this.pseudoMoves(color);
    var enemy = color === 'w' ? 'b' : 'w';
    for (var i = 0; i < pseudo.length; i++) {
      var m = pseudo[i];
      this.make(m);
      if (!this.isAttacked(this.kings[color], enemy)) out.push(m);
      this.unmake();
    }
    return out;
  };

  /* ---------- make / unmake ---------- */

  Chess.prototype.make = function (m) {
    var b = this.board;
    var color = colorOf(m.piece);
    var undo = {
      move: m,
      ep: this.ep,
      castling: { K: this.castling.K, Q: this.castling.Q, k: this.castling.k, q: this.castling.q },
      halfmove: this.halfmove,
      fullmove: this.fullmove,
      captured: null,
      capturedSq: -1
    };

    if (m.ep) {
      var capSq = m.to + (color === 'w' ? 8 : -8);
      undo.captured = b[capSq];
      undo.capturedSq = capSq;
      b[capSq] = null;
    } else if (b[m.to]) {
      undo.captured = b[m.to];
      undo.capturedSq = m.to;
    }

    b[m.to] = m.promo ? (color === 'w' ? m.promo : m.promo.toLowerCase()) : m.piece;
    b[m.from] = null;

    if (m.castle === 'k') {
      b[m.from + 1] = b[m.from + 3];
      b[m.from + 3] = null;
    } else if (m.castle === 'q') {
      b[m.from - 1] = b[m.from - 4];
      b[m.from - 4] = null;
    }

    if (m.piece === 'K') this.kings.w = m.to;
    else if (m.piece === 'k') this.kings.b = m.to;

    var cr = this.castling;
    if (m.piece === 'K') { cr.K = false; cr.Q = false; }
    if (m.piece === 'k') { cr.k = false; cr.q = false; }
    if (m.from === 63 || m.to === 63) cr.K = false;
    if (m.from === 56 || m.to === 56) cr.Q = false;
    if (m.from === 7 || m.to === 7) cr.k = false;
    if (m.from === 0 || m.to === 0) cr.q = false;

    this.ep = m.double ? m.from + (color === 'w' ? -8 : 8) : -1;
    this.halfmove = (m.piece.toUpperCase() === 'P' || undo.captured) ? 0 : this.halfmove + 1;
    if (color === 'b') this.fullmove++;
    this.turn = color === 'w' ? 'b' : 'w';
    this.history.push(undo);
    if (this.trackKeys) this.keys.push(this.positionKey());
  };

  Chess.prototype.unmake = function () {
    var undo = this.history.pop();
    if (!undo) return;
    var m = undo.move, b = this.board;
    var color = colorOf(m.piece);

    b[m.from] = m.piece;
    b[m.to] = null;
    if (undo.captured) b[undo.capturedSq] = undo.captured;

    if (m.castle === 'k') {
      b[m.from + 3] = b[m.from + 1];
      b[m.from + 1] = null;
    } else if (m.castle === 'q') {
      b[m.from - 4] = b[m.from - 1];
      b[m.from - 1] = null;
    }

    if (m.piece === 'K') this.kings.w = m.from;
    else if (m.piece === 'k') this.kings.b = m.from;

    this.ep = undo.ep;
    this.castling = undo.castling;
    this.halfmove = undo.halfmove;
    this.fullmove = undo.fullmove;
    this.turn = color;
    if (this.trackKeys) this.keys.pop();
  };

  /* ---------- notation ---------- */

  Chess.prototype.san = function (m, legal) {
    var base;
    if (m.castle) {
      base = m.castle === 'k' ? 'O-O' : 'O-O-O';
    } else {
      var type = m.piece.toUpperCase();
      var s = '';
      var isCapture = m.ep || !!this.board[m.to];
      if (type !== 'P') {
        s += type;
        var others = (legal || this.legalMoves()).filter(function (x) {
          return x.to === m.to && x.from !== m.from && x.piece === m.piece;
        });
        if (others.length) {
          var sameFile = others.some(function (x) { return colOf(x.from) === colOf(m.from); });
          var sameRank = others.some(function (x) { return rowOf(x.from) === rowOf(m.from); });
          if (!sameFile) s += FILES.charAt(colOf(m.from));
          else if (!sameRank) s += String(8 - rowOf(m.from));
          else s += sqName(m.from);
        }
      } else if (isCapture) {
        s += FILES.charAt(colOf(m.from));
      }
      if (isCapture) s += 'x';
      s += sqName(m.to);
      if (m.promo) s += '=' + m.promo;
      base = s;
    }

    this.make(m);
    var check = this.inCheck(this.turn);
    var hasMoves = this.legalMoves(this.turn).length > 0;
    this.unmake();
    return base + (check ? (hasMoves ? '+' : '#') : '');
  };

  /* ---------- status ---------- */

  Chess.prototype.isCheckmate = function () {
    return this.inCheck() && this.legalMoves().length === 0;
  };
  Chess.prototype.isStalemate = function () {
    return !this.inCheck() && this.legalMoves().length === 0;
  };
  Chess.prototype.isFiftyMove = function () { return this.halfmove >= 100; };
  Chess.prototype.isThreefold = function () {
    if (!this.keys.length) return false;
    var key = this.keys[this.keys.length - 1], n = 0;
    for (var i = 0; i < this.keys.length; i++) if (this.keys[i] === key) n++;
    return n >= 3;
  };
  Chess.prototype.insufficientMaterial = function () {
    var minors = [], others = 0;
    for (var i = 0; i < 64; i++) {
      var p = this.board[i];
      if (!p) continue;
      var t = p.toUpperCase();
      if (t === 'K') continue;
      if (t === 'B' || t === 'N') minors.push({ t: t, light: isLight(i) });
      else others++;
    }
    if (others) return false;
    if (minors.length <= 1) return true;
    if (minors.length >= 2) {
      var allBishops = minors.every(function (m) { return m.t === 'B'; });
      if (allBishops) return minors.every(function (m) { return m.light === minors[0].light; });
    }
    return false;
  };

  Chess.prototype.perft = function (depth) {
    if (depth === 0) return 1;
    var moves = this.legalMoves();
    if (depth === 1) return moves.length;
    var n = 0, wasTracked = this.trackKeys;
    this.trackKeys = false;
    for (var i = 0; i < moves.length; i++) {
      this.make(moves[i]);
      n += this.perft(depth - 1);
      this.unmake();
    }
    this.trackKeys = wasTracked;
    return n;
  };

  function moveToUci(m) {
    return sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : '');
  }

  function fromUci(uci, legal) {
    for (var i = 0; i < legal.length; i++) if (moveToUci(legal[i]) === uci) return legal[i];
    return null;
  }

  function hasMatingMaterial(board, color) {
    var pawn = color === 'w' ? 'P' : 'p';
    var rook = color === 'w' ? 'R' : 'r';
    var queen = color === 'w' ? 'Q' : 'q';
    var bishop = color === 'w' ? 'B' : 'b';
    var knight = color === 'w' ? 'N' : 'n';
    var b = 0, n = 0;
    for (var i = 0; i < 64; i++) {
      var p = board[i];
      if (!p) continue;
      if (p === pawn || p === rook || p === queen) return true;
      if (p === bishop) b++;
      if (p === knight) n++;
    }
    if (b >= 2) return true;
    if (b >= 1 && n >= 1) return true;
    return false;
  }

  var api = {
    Chess: Chess,
    START_FEN: START_FEN,
    FILES: FILES,
    sqName: sqName,
    nameSq: nameSq,
    colOf: colOf,
    rowOf: rowOf,
    isLight: isLight,
    colorOf: colorOf,
    moveToUci: moveToUci,
    fromUci: fromUci,
    hasMatingMaterial: hasMatingMaterial
  };

  global.Engine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
