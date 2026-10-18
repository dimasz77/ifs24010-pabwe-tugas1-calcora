/* ==========================================================
   Calcora – storage.js
   Pembungkus localStorage: aman dari galat (mode privat, kuota penuh,
   akses diblokir di file://) dengan cadangan di memori.
   Global: window.CalcoraStorage (tanpa ES Modules).
   ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalcoraStorage = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Cari localStorage yang benar-benar bisa dipakai; null bila tidak bisa.
  function detectBackend() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const probe = '__calcora_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (err) {
      return null;
    }
  }

  /**
   * options.backend : objek bergaya localStorage (opsional, untuk pengujian; null = hanya memori)
   * options.prefix  : awalan kunci (bawaan 'calcora:')
   */
  function createStorage(options) {
    const opts = options || {};
    const prefix = typeof opts.prefix === 'string' ? opts.prefix : 'calcora:';
    const backend = 'backend' in opts ? opts.backend : detectBackend();
    const memory = new Map();   // cadangan bila localStorage tidak tersedia / gagal menulis

    function getItem(key) {
      const k = prefix + key;
      if (memory.has(k)) return memory.get(k);
      if (!backend) return null;
      try {
        const v = backend.getItem(k);
        return v === undefined ? null : v;
      } catch (err) {
        return null;
      }
    }

    // Mengembalikan true bila tersimpan permanen, false bila hanya di memori.
    function setItem(key, value) {
      const k = prefix + key;
      const v = String(value);
      if (backend) {
        try {
          backend.setItem(k, v);
          memory.delete(k);
          return true;
        } catch (err) { /* kuota penuh dll. → jatuh ke memori */ }
      }
      memory.set(k, v);
      return false;
    }

    function removeItem(key) {
      const k = prefix + key;
      memory.delete(k);
      if (!backend) return;
      try { backend.removeItem(k); } catch (err) { /* abaikan */ }
    }

    // Data hilang atau rusak (bukan JSON valid) → nilai bawaan.
    function getJSON(key, fallback) {
      const raw = getItem(key);
      if (raw === null) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed === null ? fallback : parsed;
      } catch (err) {
        return fallback;
      }
    }

    function setJSON(key, value) {
      let text;
      try { text = JSON.stringify(value); } catch (err) { return false; }
      if (text === undefined) return false;
      return setItem(key, text);
    }

    return {
      getItem, setItem, removeItem, getJSON, setJSON,
      isPersistent: () => backend !== null,
    };
  }

  return { createStorage };
});
