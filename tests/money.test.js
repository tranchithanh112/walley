import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setMoney, fmt, parseAmount, formatAmountInput, applyAmountKey, amountKeys, roundMoney } from '../js/money.js';

const sp = (s) => s.replace(/\s/g, ' ');

test('fmt VND / USD theo ngôn ngữ', () => {
  setMoney({ currency: 'VND', lang: 'vi' });
  assert.equal(sp(fmt(1250000)), '1.250.000 ₫');
  assert.equal(sp(fmt(-45000)), '−45.000 ₫');
  assert.equal(fmt(1500000, { compact: true }), '1,5 tr');
  assert.equal(fmt(2300000000, { compact: true }), '2,3 tỷ');
  assert.equal(fmt(20000, { sign: true }).startsWith('+'), true);
  setMoney({ currency: 'VND', lang: 'en' });
  assert.equal(sp(fmt(1250000)), '₫1,250,000');
  setMoney({ currency: 'USD', lang: 'en' });
  assert.equal(fmt(1250), '$1,250.00');
  assert.equal(fmt(12.5), '$12.50');
  assert.equal(fmt(1500, { compact: true }), '$1.5K');
  assert.equal(fmt(NaN), '—');
  setMoney({ currency: 'USD', lang: 'vi' }); // USD luôn hiện kiểu Mỹ
  assert.equal(fmt(1250), '$1,250.00');
  assert.equal(fmt(1500, { compact: true }), '$1.5K');
});

test('roundMoney: VND số nguyên, USD 2 số lẻ', () => {
  setMoney({ currency: 'VND', lang: 'vi' });
  assert.equal(roundMoney(1234.6), 1235);
  setMoney({ currency: 'USD', lang: 'en' });
  assert.equal(roundMoney(12.345), 12.35);
});

test('parseAmount VND (giữ cách gõ của ifinance)', () => {
  setMoney({ currency: 'VND', lang: 'vi' });
  assert.equal(parseAmount('45k'), 45000);
  assert.equal(parseAmount('1.2tr'), 1200000);
  assert.equal(parseAmount('1,5tr'), 1500000);
  assert.equal(parseAmount('150.000'), 150000);
  assert.equal(parseAmount('150,000đ'), 150000);
  assert.equal(parseAmount('2 triệu'), 2000000);
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount('')));
});

test('parseAmount USD có số lẻ', () => {
  setMoney({ currency: 'USD', lang: 'en' });
  assert.equal(parseAmount('12.50'), 12.5);
  assert.equal(parseAmount('1,250.75'), 1250.75);
  assert.equal(parseAmount('$9.999'), 10);
  assert.equal(parseAmount('1.5k'), 1500);
  setMoney({ currency: 'USD', lang: 'vi' }); // USD nhập kiểu Mỹ (nhóm ',' lẻ '.') ở cả 2 ngôn ngữ
  assert.equal(parseAmount('1,250.75'), 1250.75);
  assert.ok(Number.isNaN(parseAmount('1.250,75')));
  assert.equal(parseAmount('12.5'), 12.5);
  assert.equal(parseAmount('12,5'), 12.5); // dấu lẻ loi không đủ 3 số → vẫn là số lẻ
  assert.equal(parseAmount('1,234'), 1234);
  setMoney({ currency: 'USD', lang: 'en' });
  assert.equal(parseAmount('1,5'), 1.5);
  assert.ok(Number.isNaN(parseAmount('1,2,3')));
  assert.ok(Number.isNaN(parseAmount('.')));
});

test('fmt compact tiếng Việt và dấu', () => {
  setMoney({ currency: 'VND', lang: 'vi' });
  assert.equal(fmt(999999999, { compact: true }), '1 tỷ');
  assert.ok(!/Tr|N/.test(fmt(999999, { compact: true })));
  assert.ok(!fmt(1000, { compact: true }).includes(' N'));
  setMoney({ currency: 'USD', lang: 'en' });
  assert.equal(fmt(-0.004), '$0.00');
  assert.equal(fmt(0.004, { sign: true }), '$0.00');
});

test('ô số tiền: nhóm nghìn, phím nhanh', () => {
  setMoney({ currency: 'VND', lang: 'vi' });
  assert.equal(formatAmountInput('45000'), '45.000');
  assert.equal(formatAmountInput('007'), '7');
  assert.equal(formatAmountInput('45k'), '45k');
  assert.equal(applyAmountKey('45', '000'), '45.000');
  assert.equal(applyAmountKey('1,5', 'tr'), '1.500.000');
  assert.deepEqual(amountKeys(), [['000', '000'], ['k', 'nghìn'], ['tr', 'triệu']]);
  setMoney({ currency: 'VND', lang: 'en' });
  assert.equal(formatAmountInput('45000'), '45,000');
  assert.equal(applyAmountKey('1.5', 'tr'), '1,500,000');
  setMoney({ currency: 'USD', lang: 'en' });
  assert.equal(formatAmountInput('1250'), '1250');
  assert.equal(formatAmountInput('12.5'), '12.5');
  assert.equal(applyAmountKey('12', 'dot'), '12.');
  assert.equal(applyAmountKey('12.5', 'dot'), '12.5');
  assert.deepEqual(amountKeys(), [['dot', '.'], ['000', '000']]);
  assert.equal(applyAmountKey('1,250', '000'), '1250000');
  assert.equal(parseAmount('1250000'), 1250000);
  assert.equal(applyAmountKey('12.5', '000'), '12.5');
  setMoney({ currency: 'USD', lang: 'vi' });
  assert.equal(applyAmountKey('1,250', '000'), '1250000');
  assert.deepEqual(amountKeys(), [['dot', '.'], ['000', '000']]);
});
