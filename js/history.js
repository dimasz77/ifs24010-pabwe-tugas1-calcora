/* ==========================================================
   Calcora – history.js
   Riwayat perhitungan: maks. 50 entri, terbaru di atas, disaring saat dimuat.
   Tidak bergantung pada DOM atau global lain; storage diberikan dari luar.
   Global: window.CalcoraHistory (tanpa ES Modules).
   ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalcoraHistory = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_ENTRIES = 50;
  const STORAGE_KEY = 'history';

  // Ekspresi hanya boleh berisi angka, operator, titik, persen, dan spasi.
  const EXPRESSION_RE = /^[0-9+\-*/×÷−%.\s=]{1,200}$/;
  // Hasil: angka biasa atau notasi ilmiah (mis. -0.5, 1e+21).
  const RESULT_RE = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;

  // Entri valid → objek bersih {expression, result, timestamp}; selain itu null.
  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const { expression, result, timestamp } = raw;
    if (typeof expression !== 'string' || !EXPRESSION_RE.test(expression.trim())) return null;
    if (typeof result !== 'string' || result.length > 40 || !RESULT_RE.test(result)) return null;
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0) return null;
    return { expression: expression.trim(), result, timestamp };
  }

  // Daftar mentah → daftar bersih, urutan dipertahankan, dipotong ke 50.
  function sanitizeList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(sanitizeEntry).filter(Boolean).slice(0, MAX_ENTRIES);
  }

  function createHistory(storage) {
    let entries = [];

    // Muat + saring; tulis ulang bila ada yang dibuang agar data rusak tidak menumpuk.
    (function load() {
      const raw = storage.getJSON(STORAGE_KEY, null);
      entries = sanitizeList(raw);
      if (raw !== null && (!Array.isArray(raw) || raw.length !== entries.length)) {
        storage.setJSON(STORAGE_KEY, entries);
      }
    })();

    const persist = () => storage.setJSON(STORAGE_KEY, entries);

    // Tambah di paling atas. Mengembalikan entri, atau null bila tidak valid.
    function add(expression, result, now) {
      const entry = sanitizeEntry({
        expression,
        result,
        timestamp: typeof now === 'number' ? now : Date.now(),
      });
      if (!entry) return null;
      entries = [entry].concat(entries).slice(0, MAX_ENTRIES);
      persist();
      return entry;
    }

    function clear() {
      entries = [];
      persist();
    }

    return {
      add,
      clear,
      getAll: () => entries.slice(),
      count: () => entries.length,
    };
  }

  return { createHistory, sanitizeEntry, sanitizeList, MAX_ENTRIES, STORAGE_KEY };
});
