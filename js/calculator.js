/* ==========================================================
   Calcora – calculator.js
   Logika murni (tanpa DOM, tanpa eval/new Function).
   Dapat dipakai di browser (window.CalcoraCalculator) dan Node.js (require).
   Alur: string ekspresi → tokenize → parse (AST) → evaluate → bulatkan.
   ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalcoraCalculator = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Konstanta & galat ---------- */
  const MAX_DIGITS = 15;        // maksimum digit per angka pada penyunting
  const RESULT_PRECISION = 15;  // digit signifikan hasil akhir

  const ERRORS = {
    DIV_BY_ZERO: 'Tidak bisa membagi dengan nol',
    INVALID_EXPRESSION: 'Ekspresi tidak valid',
    UNDEFINED_RESULT: 'Hasil tidak terdefinisi',
  };

  class CalcError extends Error {
    constructor(code) {
      super(ERRORS[code]);
      this.name = 'CalcError';
      this.code = code;
    }
  }

  const fail = (code) => { throw new CalcError(code); };

  /* ---------- Normalisasi simbol tampilan ---------- */
  // Ekspresi internal memakai + - * / %; tampilan memakai + − × ÷ %.
  const toInternal = (s) => String(s).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const toDisplay = (s) => String(s).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');

  /* ---------- 1. Tokenizer ---------- */
  // Token: {type:'num', value} atau {type:'op', value:'+'|'-'|'*'|'/'|'%'}
  function tokenize(input) {
    const src = toInternal(input);
    const tokens = [];
    const numberRe = /\d+\.?\d*|\.\d+/y;   // "5", "5.", "5.25", ".5"
    let i = 0;

    while (i < src.length) {
      const ch = src[i];
      if (ch === ' ') { i++; continue; }
      if ('+-*/%'.includes(ch)) {
        tokens.push({ type: 'op', value: ch });
        i++;
        continue;
      }
      numberRe.lastIndex = i;
      const m = numberRe.exec(src);
      if (!m) fail('INVALID_EXPRESSION');           // karakter asing atau "." sendirian
      tokens.push({ type: 'num', value: parseFloat(m[0]) });
      i += m[0].length;                              // "1.2.3" → 1.2 lalu .3 → ditolak parser
    }
    return tokens;
  }

  /* ---------- 2. Parser (recursive descent) ----------
     expression := term (('+'|'-') term)*          ← kiri ke kanan
     term       := unary (('*'|'/') unary)*        ← kiri ke kanan, lebih tinggi
     unary      := ('-'|'+') unary | postfix
     postfix    := number '%'*                      ← persen = dibagi 100
  */
  function parse(tokens) {
    let pos = 0;
    const isOp = (t, ops) => t && t.type === 'op' && ops.includes(t.value);

    function parseExpression() {
      let node = parseTerm();
      while (isOp(tokens[pos], '+-')) {
        const op = tokens[pos++].value;
        node = { type: 'binary', op, left: node, right: parseTerm() };
      }
      return node;
    }

    function parseTerm() {
      let node = parseUnary();
      while (isOp(tokens[pos], '*/')) {
        const op = tokens[pos++].value;
        node = { type: 'binary', op, left: node, right: parseUnary() };
      }
      return node;
    }

    function parseUnary() {
      if (isOp(tokens[pos], '+-')) {
        const op = tokens[pos++].value;
        return { type: 'unary', op, arg: parseUnary() };
      }
      return parsePostfix();
    }

    function parsePostfix() {
      const tok = tokens[pos];
      if (!tok || tok.type !== 'num') fail('INVALID_EXPRESSION');
      pos++;
      let node = { type: 'num', value: tok.value };
      while (isOp(tokens[pos], '%')) {
        pos++;
        node = { type: 'percent', arg: node };
      }
      return node;
    }

    if (tokens.length === 0) fail('INVALID_EXPRESSION');
    const ast = parseExpression();
    if (pos < tokens.length) fail('INVALID_EXPRESSION');   // sisa token, mis. "1.2.3"
    return ast;
  }

  /* ---------- Pembulatan desimal ---------- */
  // Jumlah angka di belakang koma pada representasi desimal sebuah angka.
  function decimalsOf(n) {
    const s = String(n);
    const [mant, exp] = s.split('e');
    const frac = (mant.split('.')[1] || '').length;
    return Math.max(0, frac - (exp ? Number(exp) : 0));
  }

  // Bulatkan ke d desimal (dilewati bila tak berarti/terlalu besar).
  function roundTo(n, d) {
    if (!Number.isFinite(n) || d > 20) return n;
    return Number(n.toFixed(d));
  }

  // Pembulatan akhir untuk hasil yang ditampilkan.
  function roundResult(n) {
    if (n === 0) return 0;                          // juga menghapus -0
    return Number(n.toPrecision(RESULT_PRECISION));
  }

  /* ---------- 3. Evaluator ---------- */
  function checkFinite(n) {
    if (!Number.isFinite(n)) fail('UNDEFINED_RESULT');
    return n;
  }

  function evalNode(node) {
    switch (node.type) {
      case 'num':
        return node.value;
      case 'unary': {
        const v = evalNode(node.arg);
        return node.op === '-' ? -v : v;
      }
      case 'percent': {
        const v = evalNode(node.arg);
        return checkFinite(roundTo(v / 100, decimalsOf(v) + 2));
      }
      case 'binary': {
        const a = evalNode(node.left);
        const b = evalNode(node.right);
        const da = decimalsOf(a), db = decimalsOf(b);
        switch (node.op) {
          // Bulatkan sesuai jumlah desimal operand agar 0.1 + 0.2 = 0.3
          case '+': return checkFinite(roundTo(a + b, Math.max(da, db)));
          case '-': return checkFinite(roundTo(a - b, Math.max(da, db)));
          case '*': return checkFinite(roundTo(a * b, da + db));
          case '/':
            if (b === 0) fail('DIV_BY_ZERO');       // termasuk 0 ÷ 0
            return checkFinite(a / b);
        }
      }
    }
    return fail('INVALID_EXPRESSION');
  }

  /* ---------- API hitung ---------- */
  function formatNumber(n) {
    return String(roundResult(n));
  }

  /**
   * Hitung ekspresi.
   * Sukses → { ok: true, value: number, text: string }
   * Galat  → { ok: false, code: 'DIV_BY_ZERO'|'INVALID_EXPRESSION'|'UNDEFINED_RESULT', message }
   */
  function evaluate(expression) {
    try {
      const value = roundResult(checkFinite(evalNode(parse(tokenize(expression)))));
      return { ok: true, value, text: String(value) };
    } catch (err) {
      if (err instanceof CalcError) return { ok: false, code: err.code, message: err.message };
      throw err;                                     // bug sungguhan jangan disembunyikan
    }
  }

  /* ---------- Penyunting input ----------
     Semua fungsi murni: menerima string ekspresi, mengembalikan string baru.
     Masukan yang ditolak mengembalikan string yang sama (tidak berubah). */
  const OP_RE = /[+\-*/]$/;
  const trailingNumber = (e) => /\d*\.?\d*$/.exec(e)[0];

  // Digit 0–9. Menolak "007" (0 awal diganti) dan angka lebih dari 15 digit.
  function inputDigit(expr, digit) {
    if (!/^[0-9]$/.test(String(digit))) return expr;
    if (expr.endsWith('%')) return expr;             // "50%7" tidak valid
    const cur = trailingNumber(expr);
    if (cur === '0') return expr.slice(0, -1) + digit;
    if (cur.replace('.', '').length >= MAX_DIGITS) return expr;
    return expr + digit;
  }

  // Titik desimal. Menolak "1.2.3"; awal angka menjadi "0.".
  function inputDecimal(expr) {
    if (expr.endsWith('%')) return expr;
    const cur = trailingNumber(expr);
    if (cur.includes('.')) return expr;
    return cur === '' ? expr + '0.' : expr + '.';
  }

  // Operator + - * / (juga ÷ × −). Operator beruntun saling menggantikan.
  function inputOperator(expr, op) {
    op = toInternal(op);
    if (!'+-*/'.includes(op) || op.length !== 1) return expr;
    let e = expr.endsWith('.') ? expr.slice(0, -1) : expr;  // "5." → "5"
    if (OP_RE.test(e)) e = e.replace(/[+\-*/]+$/, '');      // ganti operator lama
    if (e === '') return op === '-' ? '-' : expr;           // hanya minus unary di awal
    return e + op;
  }

  // Persen: hanya setelah angka.
  function inputPercent(expr) {
    const e = expr.endsWith('.') ? expr.slice(0, -1) : expr;
    return /\d$/.test(e) ? e + '%' : expr;
  }

  // DEL: hapus satu karakter terakhir.
  function deleteLast(expr) {
    return expr.slice(0, -1);
  }

  // AC: kosongkan.
  function clearAll() {
    return '';
  }

  // ±: balik tanda angka terakhir (beserta persennya).
  function toggleSign(expr) {
    const m = /(\d+\.?\d*|\.\d+)(%*)$/.exec(expr);
    if (!m) return expr;                              // belum ada angka
    const before = expr.slice(0, m.index);
    const hasUnaryMinus =
      before.endsWith('-') && (before.length === 1 || OP_RE.test(before.slice(0, -1)));
    return hasUnaryMinus
      ? before.slice(0, -1) + m[0]
      : before + '-' + m[0];
  }

  // Dipakai tombol "=": buang operator/titik yang menggantung ("5+" → "5").
  function stripTrailingOperator(expr) {
    return expr.replace(/[+\-*/.]+$/, '');
  }

  return {
    ERRORS, CalcError,
    tokenize, parse, evaluate, formatNumber, toDisplay, toInternal,
    inputDigit, inputDecimal, inputOperator, inputPercent,
    deleteLast, clearAll, toggleSign, stripTrailingOperator,
  };
});
