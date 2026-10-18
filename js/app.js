/* ==========================================================
   Calcora – app.js
   Penghubung UI: keypad (event delegation), keyboard, riwayat, tema.
   Logika status (step/viewOf) murni sehingga bisa diuji di Node.js.
   Urutan <script>: storage.js, history.js, calculator.js, app.js
   ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./calculator.js'), require('./storage.js'), require('./history.js'));
  } else {
    root.CalcoraApp = factory(root.CalcoraCalculator, root.CalcoraStorage, root.CalcoraHistory);
  }
})(typeof self !== 'undefined' ? self : this, function (Calc, Store, Hist) {
  'use strict';

  if (!Calc || !Store || !Hist) {
    throw new Error('Calcora: muat storage.js, history.js, dan calculator.js sebelum app.js.');
  }

  const THEME_KEY = 'theme';
  const CALC_ACTIONS = ['number', 'decimal', 'operator', 'percent', 'negate', 'delete', 'clear', 'equals'];

  /* ---------- Logika status (murni) ---------- */
  // expr: ekspresi internal (+ - * / %), equation: ekspresi yang baru dihitung.
  const initialState = () => ({ expr: '', justEvaluated: false, equation: '', error: null });

  // Hasil bernotasi ilmiah (1e+21) tidak bisa dilanjutkan sebagai ekspresi → jadikan desimal biasa.
  function toPlainString(text) {
    if (!/e/i.test(text)) return text;
    const n = Number(text);
    if (Math.abs(n) >= 1) return BigInt(n).toString();
    return n.toFixed(20).replace(/0+$/, '').replace(/\.$/, '') || '0';
  }

  /**
   * Satu langkah input. Mengembalikan { state, entry }.
   * entry != null berarti perhitungan sukses dan perlu dicatat ke riwayat.
   */
  function step(state, action, value) {
    if (action === 'clear') return { state: initialState(), entry: null };

    if (action === 'equals') {
      if (state.justEvaluated) return { state, entry: null };       // "=" berulang tidak menggandakan riwayat
      const e = Calc.stripTrailingOperator(state.expr);
      if (e === '') return { state, entry: null };
      const r = Calc.evaluate(e);
      if (!r.ok) {
        return { state: { expr: e, justEvaluated: false, equation: '', error: r.message }, entry: null };
      }
      const shown = Calc.toDisplay(e);
      return {
        state: { expr: toPlainString(r.text), justEvaluated: true, equation: shown, error: null },
        entry: { expression: shown, result: r.text },
      };
    }

    // Mengetik angka setelah "=" memulai ekspresi baru; operator melanjutkan dari hasil.
    let expr = state.expr;
    if ((action === 'number' || action === 'decimal') && state.justEvaluated) expr = '';

    let next;
    switch (action) {
      case 'number':   next = Calc.inputDigit(expr, value); break;
      case 'decimal':  next = Calc.inputDecimal(expr); break;
      case 'operator': next = Calc.inputOperator(expr, value); break;
      case 'percent':  next = Calc.inputPercent(expr); break;
      case 'negate':   next = Calc.toggleSign(expr); break;
      case 'delete':   next = Calc.deleteLast(expr); break;
      default: return { state, entry: null };
    }
    return { state: { expr: next, justEvaluated: false, equation: '', error: null }, entry: null };
  }

  // Angka (dengan tanda) yang sedang diketik; "0" bila belum ada.
  function currentOperand(expr) {
    const re = /\d+\.?\d*%*|\.\d+%*/g;
    let last = null, m;
    while ((m = re.exec(expr)) !== null) last = m;
    if (!last) return '0';
    const before = expr.slice(0, last.index);
    const negative = before.endsWith('-') && (before.length === 1 || /[+\-*/]$/.test(before.slice(0, -1)));
    return (negative ? '−' : '') + last[0];
  }

  // Teks untuk dua baris layar.
  function viewOf(state) {
    if (state.error) {
      return { expression: Calc.toDisplay(state.expr), result: state.error, isError: true };
    }
    if (state.justEvaluated) {
      return { expression: state.equation + ' =', result: Calc.toDisplay(state.expr), isError: false };
    }
    const compound = state.expr !== '' && !/^-?[\d.]+$/.test(state.expr);
    return {
      expression: compound ? Calc.toDisplay(state.expr) : '',
      result: currentOperand(state.expr),
      isError: false,
    };
  }

  /* ---------- Keyboard ---------- */
  function keyToAction(key) {
    if (/^[0-9]$/.test(key)) return ['number', key];
    switch (key) {
      case '.': case ',': return ['decimal', '.'];          // koma numpad keyboard Indonesia
      case '+': case '-': case '*': case '/': return ['operator', key];
      case 'x': case 'X': return ['operator', '*'];
      case '%': return ['percent', '%'];
      case 'Enter': case '=': return ['equals', '='];
      case 'Backspace': return ['delete', 'DEL'];
      case 'Escape': case 'Delete': return ['clear', 'AC'];
      default: return null;
    }
  }

  /* ---------- Tema ---------- */
  // Pilihan tersimpan menang; bila belum ada, ikuti prefers-color-scheme.
  function resolveTheme(saved, prefersDark) {
    if (saved === 'light' || saved === 'dark') return saved;
    return prefersDark ? 'dark' : 'light';
  }

  /* ---------- Penghubung DOM ---------- */
  function init() {
    const $ = (id) => document.getElementById(id);
    const appRoot = document.querySelector('.app');
    const keypad = document.querySelector('.keypad');
    const els = {
      display: $('display'), expression: $('expression'), result: $('result'),
      list: $('history-list'), count: $('history-count'), empty: $('history-empty'),
      clearBtn: $('history-clear'), themeBtn: $('theme-toggle'),
    };
    if (!appRoot || !keypad || !els.result) return;

    const storage = Store.createStorage();
    const history = Hist.createHistory(storage);
    let state = initialState();

    /* Tema */
    const html = document.documentElement;
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const readSavedTheme = () => {
      const v = storage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    };
    function applyTheme(theme) {
      html.setAttribute('data-theme', theme);
      if (els.themeBtn) els.themeBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    function toggleTheme() {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storage.setItem(THEME_KEY, next);
    }
    applyTheme(resolveTheme(readSavedTheme(), !!(mq && mq.matches)));
    if (mq) {
      const onSystemChange = () => {
        if (!readSavedTheme()) applyTheme(resolveTheme(null, mq.matches));
      };
      if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
      else if (mq.addListener) mq.addListener(onSystemChange);
    }

    /* Render */
    function renderDisplay() {
      const v = viewOf(state);
      els.expression.textContent = v.expression || '\u00A0';
      els.result.textContent = v.result;
      els.display.classList.toggle('display--error', v.isError);
    }

    // Seluruh isi dibuat dengan createElement + textContent (tanpa innerHTML).
    function renderHistory() {
      const items = history.getAll();
      while (els.list.firstChild) els.list.removeChild(els.list.firstChild);
      items.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'history__item';
        const expr = document.createElement('span');
        expr.className = 'history__item-expression';
        expr.textContent = item.expression + ' =';
        const res = document.createElement('span');
        res.className = 'history__item-result';
        res.textContent = Calc.toDisplay(item.result);
        li.appendChild(expr);
        li.appendChild(res);
        els.list.appendChild(li);
      });
      els.count.textContent = items.length + ' entri';
      els.empty.hidden = items.length > 0;
      els.clearBtn.disabled = items.length === 0;
    }

    /* Aksi */
    function dispatch(action, value) {
      if (action === 'toggle-theme') return toggleTheme();
      if (action === 'clear-history') { history.clear(); return renderHistory(); }
      if (CALC_ACTIONS.indexOf(action) === -1) return;
      const out = step(state, action, value);
      state = out.state;
      if (out.entry && history.add(out.entry.expression, out.entry.result)) renderHistory();
      renderDisplay();
    }

    // Satu listener untuk semua tombol ber-data-action (event delegation).
    appRoot.addEventListener('click', (e) => {
      const btn = e.target.closest ? e.target.closest('[data-action]') : null;
      if (!btn || !appRoot.contains(btn)) return;
      dispatch(btn.dataset.action, btn.dataset.value);
      // Klik mouse: lepas fokus agar Enter berikutnya berarti "=", bukan menekan tombol itu lagi.
      if (e.detail > 0 && keypad.contains(btn)) btn.blur();
    });

    function flashKey(action, value) {
      const btn = keypad.querySelector('[data-action="' + action + '"][data-value="' + value + '"]');
      if (!btn) return;
      btn.classList.add('is-pressed');
      setTimeout(() => btn.classList.remove('is-pressed'), 120);
    }

    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest) {
        if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
        // Tombol yang sedang fokus (navigasi Tab) tetap diaktifkan Enter/Spasi secara bawaan.
        if (t.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
      }
      const mapped = keyToAction(e.key);
      if (!mapped) return;
      e.preventDefault();                                  // mis. "/" membuka pencarian cepat di Firefox
      if (e.repeat && mapped[0] === 'equals') return;
      dispatch(mapped[0], mapped[1]);
      flashKey(mapped[0], mapped[1]);
    });

    renderDisplay();
    renderHistory();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  return { step, viewOf, initialState, keyToAction, resolveTheme, toPlainString, currentOperand };
});
