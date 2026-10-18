// Jalankan: node js/calculator.test.js
const assert = require('node:assert/strict');
const C = require('../js/calculator.js');

let passed = 0;
const test = (name, fn) => { fn(); passed++; };

// --- Evaluator: nilai ---
const values = [
  ['2+3*4', 14], ['10-4-3', 3], ['100/10/5', 2], ['8/2*3', 12], ['2*3+4*5', 26],
  ['6÷3×2−1', 3], ['0.1+0.2', 0.3], ['0.1+0.2-0.3', 0], ['0.1*3', 0.3], ['1/3*3', 1],
  ['50%', 0.5], ['200+10%', 200.1], ['200*10%', 20], ['5%%', 0.0005], ['-50%', -0.5],
  ['-5+3', -2], ['2*-3', -6], ['2--3', 5], ['--5', 5], ['5.', 5], ['.5+.5', 1],
  ['0.7+0.1', 0.8], ['1.1*1.1', 1.21], ['999999999999999+1', 1e15], ['0-0', 0],
];
for (const [expr, want] of values) {
  test(expr, () => {
    const r = C.evaluate(expr);
    assert.equal(r.ok, true, expr);
    assert.equal(r.value, want, expr);
  });
}

// --- Evaluator: galat ---
const errors = [
  ['5/0', 'DIV_BY_ZERO'], ['0/0', 'DIV_BY_ZERO'], ['1/(0)', 'INVALID_EXPRESSION'],
  ['', 'INVALID_EXPRESSION'], ['5+', 'INVALID_EXPRESSION'], ['*5', 'INVALID_EXPRESSION'],
  ['5**2', 'INVALID_EXPRESSION'], ['1.2.3', 'INVALID_EXPRESSION'], ['1..2', 'INVALID_EXPRESSION'],
  ['.', 'INVALID_EXPRESSION'], ['%5', 'INVALID_EXPRESSION'], ['5+%', 'INVALID_EXPRESSION'],
  ['2 3', 'INVALID_EXPRESSION'], ['abc', 'INVALID_EXPRESSION'], ['alert(1)', 'INVALID_EXPRESSION'],
  [Array(21).fill('999999999999999').join('*'), 'UNDEFINED_RESULT'],
];
for (const [expr, code] of errors) {
  test('galat ' + expr.slice(0, 20), () => {
    const r = C.evaluate(expr);
    assert.equal(r.ok, false);
    assert.equal(r.code, code);
    assert.equal(r.message, C.ERRORS[code]);
  });
}

// --- Penyunting ---
const editor = [
  [() => C.inputDigit('', '0'), '0'],
  [() => C.inputDigit('0', '0'), '0'],
  [() => C.inputDigit('0', '7'), '7'],
  [() => C.inputDigit('5+0', '7'), '5+7'],
  [() => C.inputDigit('0.', '0'), '0.0'],
  [() => C.inputDigit('50%', '7'), '50%'],
  [() => C.inputDigit('12', 'x'), '12'],
  [() => C.inputDigit('123456789012345', '6'), '123456789012345'],
  [() => C.inputDecimal(''), '0.'],
  [() => C.inputDecimal('5+'), '5+0.'],
  [() => C.inputDecimal('1.2'), '1.2'],
  [() => C.inputDecimal('1.2+3'), '1.2+3.'],
  [() => C.inputDecimal('5%'), '5%'],
  [() => C.inputOperator('5', '+'), '5+'],
  [() => C.inputOperator('5+', '×'), '5*'],
  [() => C.inputOperator('5*-', '+'), '5+'],
  [() => C.inputOperator('5.', '-'), '5-'],
  [() => C.inputOperator('', '+'), ''],
  [() => C.inputOperator('', '-'), '-'],
  [() => C.inputOperator('-', '+'), '-'],
  [() => C.inputOperator('5', '^'), '5'],
  [() => C.inputOperator('50%', '/'), '50%/'],
  [() => C.inputPercent('50'), '50%'],
  [() => C.inputPercent('5+'), '5+'],
  [() => C.inputPercent(''), ''],
  [() => C.deleteLast('12+3'), '12+'],
  [() => C.deleteLast(''), ''],
  [() => C.clearAll(), ''],
  [() => C.toggleSign('3'), '-3'],
  [() => C.toggleSign('-3'), '3'],
  [() => C.toggleSign('5+3'), '5+-3'],
  [() => C.toggleSign('5-3'), '5--3'],
  [() => C.toggleSign('5--3'), '5-3'],
  [() => C.toggleSign('50%'), '-50%'],
  [() => C.toggleSign('5+'), '5+'],
  [() => C.toggleSign(''), ''],
  [() => C.stripTrailingOperator('5+'), '5'],
  [() => C.stripTrailingOperator('5.'), '5'],
  [() => C.toDisplay('6/3*2-1'), '6÷3×2−1'],
];
for (const [fn, want] of editor) {
  test(String(fn), () => assert.equal(fn(), want));
}

// Simulasi ketik: 1 . 2 . 3 → "1.2" ; 0 0 7 → "7"
test('ketik 1.2.3', () => {
  let e = '';
  for (const k of ['1', '.', '2', '.', '3']) e = k === '.' ? C.inputDecimal(e) : C.inputDigit(e, k);
  assert.equal(e, '1.23');
});
test('ketik 007', () => {
  let e = '';
  for (const k of ['0', '0', '7']) e = C.inputDigit(e, k);
  assert.equal(e, '7');
});

console.log(`Semua ${passed} kasus uji lulus.`);
