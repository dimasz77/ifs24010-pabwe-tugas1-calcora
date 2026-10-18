// Jalankan: node tests/app.test.js   (menguji storage, history, dan logika status app)
const assert = require('node:assert/strict');
const { createStorage } = require('../js/storage.js');
const H = require('../js/history.js');
const App = require('../js/app.js');

let n = 0;
const t = (fn) => { fn(); n++; };

/* ---------- storage ---------- */
const fakeBackend = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; }, removeItem: (k) => { delete d[k]; }, _d: d };
};
const throwing = { getItem() { throw new Error('x'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } };

t(() => { const s = createStorage({ backend: fakeBackend() }); assert.equal(s.setItem('a', 'b'), true); assert.equal(s.getItem('a'), 'b'); });
t(() => { const b = fakeBackend(); createStorage({ backend: b }).setItem('a', '1'); assert.ok('calcora:a' in b._d); });
t(() => { const s = createStorage({ backend: null }); assert.equal(s.setItem('a', 'm'), false); assert.equal(s.getItem('a'), 'm'); assert.equal(s.isPersistent(), false); });
t(() => { const s = createStorage({ backend: throwing }); assert.equal(s.getItem('zz'), null); assert.equal(s.setItem('k', 'v'), false); assert.equal(s.getItem('k'), 'v'); s.removeItem('k'); assert.equal(s.getItem('k'), null); });
t(() => { const s = createStorage({ backend: fakeBackend({ 'calcora:j': '{rusak' }) }); assert.deepEqual(s.getJSON('j', [1]), [1]); });
t(() => { const s = createStorage({ backend: fakeBackend({ 'calcora:j': 'null' }) }); assert.equal(s.getJSON('j', 'def'), 'def'); });
t(() => { const s = createStorage({ backend: fakeBackend() }); assert.equal(s.getJSON('none', 7), 7); assert.equal(s.setJSON('o', { a: 1 }), true); assert.deepEqual(s.getJSON('o', null), { a: 1 }); });
t(() => { const s = createStorage({ backend: null }); const c = {}; c.c = c; assert.equal(s.setJSON('c', c), false); });

/* ---------- history ---------- */
const good = (i) => ({ expression: `${i}+1`, result: String(i + 1), timestamp: 1000 + i });
t(() => { const h = H.createHistory(createStorage({ backend: null })); assert.equal(h.count(), 0); });
t(() => {
  const h = H.createHistory(createStorage({ backend: null }));
  h.add('1+1', '2', 1); h.add('2×3', '6', 2);
  assert.deepEqual(h.getAll().map((e) => e.result), ['6', '2']);   // terbaru di atas
});
t(() => {
  const h = H.createHistory(createStorage({ backend: null }));
  for (let i = 0; i < 60; i++) h.add(`${i}+1`, String(i + 1), i);
  assert.equal(h.count(), 50);
  assert.equal(h.getAll()[0].result, '60');
  assert.equal(h.getAll()[49].result, '11');
});
t(() => {
  const bad = [null, 5, 'x', {}, { ...good(1), expression: '<img onerror=x>' }, { ...good(1), result: 'abc' },
    { ...good(1), result: 'Infinity' }, { ...good(1), timestamp: 'now' }, { ...good(1), timestamp: NaN },
    { ...good(1), expression: 5 }, { ...good(1), result: '1'.repeat(41) }];
  const s = createStorage({ backend: fakeBackend({ 'calcora:history': JSON.stringify([good(1), ...bad, good(2)]) }) });
  const h = H.createHistory(s);
  assert.deepEqual(h.getAll().map((e) => e.result), ['2', '3']);
  assert.equal(s.getJSON('history', null).length, 2);               // data bersih ditulis ulang
});
t(() => { const h = H.createHistory(createStorage({ backend: fakeBackend({ 'calcora:history': '{"a":1}' }) })); assert.equal(h.count(), 0); });
t(() => { const h = H.createHistory(createStorage({ backend: fakeBackend({ 'calcora:history': 'rusak' }) })); assert.equal(h.count(), 0); });
t(() => {
  const big = Array.from({ length: 80 }, (_, i) => good(i));
  const h = H.createHistory(createStorage({ backend: fakeBackend({ 'calcora:history': JSON.stringify(big) }) }));
  assert.equal(h.count(), 50);
});
t(() => { const h = H.createHistory(createStorage({ backend: null })); assert.equal(h.add('<b>', '1'), null); assert.equal(h.add('1+1', 'x'), null); assert.equal(h.count(), 0); });
t(() => {
  const b = fakeBackend(); const h = H.createHistory(createStorage({ backend: b })); h.add('1+1', '2');
  const h2 = H.createHistory(createStorage({ backend: b })); assert.equal(h2.count(), 1);   // bertahan antar sesi
  h2.clear(); assert.equal(H.createHistory(createStorage({ backend: b })).count(), 0);
});

/* ---------- app: status & tampilan ---------- */
function run(seq, state = App.initialState()) {
  const entries = [];
  for (const k of seq.split(' ')) {
    const [a, v] = App.keyToAction(k === 'AC' ? 'Escape' : k === 'DEL' ? 'Backspace' : k === '=' ? 'Enter' : k === '±' ? '~' : k) || (k === '±' ? ['negate', '±'] : [null]);
    const out = App.step(state, a, v); state = out.state; if (out.entry) entries.push(out.entry);
  }
  return { state, view: App.viewOf(state), entries };
}
t(() => { const r = run('2 + 3 * 4 ='); assert.equal(r.view.result, '14'); assert.equal(r.view.expression, '2+3×4 ='); assert.equal(r.entries.length, 1); assert.deepEqual(r.entries[0], { expression: '2+3×4', result: '14' }); });
t(() => { const r = run('0 . 1 + 0 . 2 ='); assert.equal(r.view.result, '0.3'); });
t(() => { const r = run('5 / 0 ='); assert.equal(r.view.isError, true); assert.equal(r.view.result, 'Tidak bisa membagi dengan nol'); assert.equal(r.entries.length, 0); });
t(() => { const r = run('5 / 0 = DEL 2 ='); assert.equal(r.view.result, '2.5'); });           // galat bisa diperbaiki dengan DEL
t(() => { const r = run('5 + ='); assert.equal(r.view.result, '5'); });                          // operator menggantung dibuang
t(() => { const r = run('= ='); assert.equal(r.entries.length, 0); assert.equal(r.view.result, '0'); });
t(() => { const r = run('2 + 3 = ='); assert.equal(r.entries.length, 1); });                     // "=" ganda tidak menggandakan riwayat
t(() => { const r = run('2 + 3 = * 4 ='); assert.equal(r.view.result, '20'); });                 // lanjut dari hasil
t(() => { const r = run('2 + 3 = 7'); assert.equal(r.view.result, '7'); assert.equal(r.view.expression, ''); }); // angka baru memulai ulang
t(() => { const r = run('0 0 7'); assert.equal(r.view.result, '7'); });
t(() => { const r = run('1 . 2 . 3'); assert.equal(r.view.result, '1.23'); });
t(() => { const r = run('9 AC'); assert.equal(r.view.result, '0'); assert.equal(r.state.expr, ''); });
t(() => { const r = run('5 ±'); assert.equal(r.view.result, '−5'); });
t(() => { const r = run('5 - 3 ±'); assert.equal(r.view.result, '−3'); assert.equal(r.view.expression, '5−−3'); });
t(() => { const r = run('5 0 %'); assert.equal(r.view.result, '50%'); });
t(() => { const r = run('2 0 0 + 1 0 % ='); assert.equal(r.view.result, '200.1'); });
t(() => { const r = run('5 + 5 = ±'); assert.equal(r.view.result, '−10'); });
t(() => { const r = run('5 *'); assert.equal(r.view.result, '5'); assert.equal(r.view.expression, '5×'); });
t(() => { const r = run('7 - 9 ='); assert.equal(r.view.result, '−2'); assert.equal(r.entries[0].result, '-2'); });

// hasil bernotasi ilmiah tetap bisa dilanjutkan
t(() => { assert.equal(App.toPlainString('1e+21'), '1000000000000000000000'); assert.equal(App.toPlainString('1e-7'), '0.0000001'); assert.equal(App.toPlainString('-0.5'), '-0.5'); });
t(() => {
  const r = run('9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 * 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 =');
  assert.equal(r.view.isError, false);
  const r2 = run('+ 1 =', r.state);
  assert.equal(r2.view.isError, false);
});

// keyboard
t(() => {
  const map = { '5': ['number', '5'], ',': ['decimal', '.'], '.': ['decimal', '.'], '+': ['operator', '+'], x: ['operator', '*'],
    '/': ['operator', '/'], '%': ['percent', '%'], Enter: ['equals', '='], '=': ['equals', '='], Backspace: ['delete', 'DEL'],
    Escape: ['clear', 'AC'], Delete: ['clear', 'AC'] };
  for (const [k, v] of Object.entries(map)) assert.deepEqual(App.keyToAction(k), v, k);
  for (const k of ['a', 'F5', 'Shift', ' ', 'Tab', '10']) assert.equal(App.keyToAction(k), null, k);
});

// tema
t(() => {
  assert.equal(App.resolveTheme('dark', false), 'dark');
  assert.equal(App.resolveTheme('light', true), 'light');
  assert.equal(App.resolveTheme(null, true), 'dark');
  assert.equal(App.resolveTheme(null, false), 'light');
  assert.equal(App.resolveTheme('biru', true), 'dark');
});

console.log(`Semua ${n} kasus uji lulus.`);
