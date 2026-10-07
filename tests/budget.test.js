import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultData, generateRecurring, periodSummary, spendingBudget, expectedIncome, mergeBudget, restoreTx, dayLabel,
} from '../js/budget.js';
import { periodOf } from '../js/period.js';

const tx = (id, date, type, amount, cat, extra = {}) => ({ id, date, type, amount, cat, wallet: 'cash', u: 1, at: 1, ...extra });

test('defaultData: 4 hũ 50/20/10/20, ví Tiền mặt, không có danh mục crypto / CK', () => {
  const d = defaultData({ currency: 'USD', lang: 'en', today: '2026-10-07', now: 5 });
  assert.equal(d.currency, 'USD');
  assert.deepEqual(d.jars.map((j) => [j.id, j.pct]), [['nec', 50], ['save', 20], ['invest', 10], ['play', 20]]);
  assert.equal(d.wallets.length, 1);
  assert.equal(d.wallets[0].name, 'Cash');
  assert.equal(d.wallets[0].anchorDate, '2026-10-07');
  assert.ok(!d.categories.some((c) => ['crypto', 'stock', 'invincome'].includes(c.id)));
  assert.equal(d.onboarded, false);
});

test('periodSummary: theo kỳ lương, bỏ qua chuyển tiền', () => {
  const b = defaultData();
  b.txs = [
    tx('i', '2026-09-10', 'income', 20e6, 'salary'),
    tx('a', '2026-10-01', 'expense', 3e6, 'food'),
    tx('b', '2026-10-09', 'expense', 1e6, 'cafe'),
    tx('s', '2026-10-02', 'expense', 2e6, 'saving'),
    { id: 't', date: '2026-10-03', type: 'transfer', amount: 5e6, wallet: 'bank', to: 'card', u: 1 },
    tx('next', '2026-10-10', 'expense', 9e6, 'food'), // kỳ sau
  ];
  const S = periodSummary(b, periodOf('2026-10-07', 10));
  assert.equal(S.income, 20e6);
  assert.equal(S.spend, 4e6);
  assert.equal(S.saved, 2e6);
  assert.equal(S.estimated, false);
  assert.equal(S.txs.length, 5); // gồm cả chuyển tiền (để hiện trong danh sách)
  assert.equal(S.jars.find((j) => j.id === 'nec').alloc, 10e6);
});

test('spendingBudget: còn tiêu được, mỗi ngày, ước tính khi chưa có lương', () => {
  const b = defaultData();
  b.recurring.push({ id: 'sal', type: 'income', amount: 20e6, cat: 'salary', day: 10, every: 1, startMonth: '2026-11', active: true });
  b.txs = [tx('a', '2026-10-01', 'expense', 3e6, 'food')];
  const p = periodOf('2026-10-07', 10);
  assert.equal(expectedIncome(b), 20e6);
  const S = periodSummary(b, p, { expected: expectedIncome(b) });
  assert.equal(S.estimated, true);
  const sb = spendingBudget(S, p, '2026-10-07');
  assert.equal(sb.budget, 14e6); // (50 + 20)% của 20tr
  assert.equal(sb.left, 11e6);
  assert.equal(sb.daysLeft, 3);
  assert.equal(Math.round(sb.perDay), Math.round(11e6 / 3));
  assert.equal(sb.status, 'ok');
  const none = spendingBudget(periodSummary(defaultData(), p), p, '2026-10-07');
  assert.equal(none.status, 'noIncome');
});

test('generateRecurring: ngày 31 rơi vào cuối tháng ngắn, gắn ví', () => {
  const b = defaultData();
  b.recurring.push({ id: 'r', type: 'income', amount: 1, cat: 'salary', day: 31, every: 1, startMonth: '2026-01', wallet: 'bank', active: true });
  generateRecurring(b, '2026-03-31');
  assert.deepEqual(b.txs.map((t) => t.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.equal(b.txs[0].wallet, 'bank');
  assert.equal(b.txs[0].to, null);
  assert.equal(generateRecurring(b, '2026-03-31'), 0);
});

test('mergeBudget: hợp nhất giao dịch, cấu hình (gồm ví, ngày lương) theo configAt', () => {
  const a = defaultData();
  const c = defaultData();
  a.txs.push(tx('phone', '2026-10-01', 'expense', 1, 'food'));
  c.txs.push(tx('pc', '2026-10-02', 'expense', 2, 'food'), tx('old', '2026-10-03', 'expense', 3, 'food'));
  a.deleted.old = 5;
  c.payday = 10; c.wallets.push({ id: 'bank', name: 'VCB', type: 'bank', amount: 0 }); c.configAt = 10;
  const m = mergeBudget(a, c);
  assert.deepEqual(m.txs.map((t) => t.id), ['phone', 'pc']);
  assert.equal(m.payday, 10);
  assert.equal(m.wallets.length, 2);
});

test('mergeBudget: cấu hình thua vẫn giữ ví / danh mục mà giao dịch, khoản tự động còn dùng', () => {
  const local = defaultData();
  const remote = defaultData();
  local.wallets.push({ id: 'vcb', name: 'VCB', type: 'bank', amount: 0 }, { id: 'unused', name: 'X', type: 'bank', amount: 0 });
  local.categories.push({ id: 'pet', name: 'Thú cưng', type: 'expense', jar: 'nec' }, { id: 'gym', name: 'Gym', type: 'expense', jar: 'nec' });
  local.txs.push({ ...tx('a', '2026-10-01', 'expense', 1, 'pet'), wallet: 'vcb' });
  remote.recurring.push({ id: 'r', type: 'expense', amount: 1, cat: 'gym', wallet: 'cash', day: 1, every: 1, startMonth: '2026-10' });
  remote.configAt = 10;
  const m = mergeBudget(local, remote);
  const ids = (xs) => xs.map((x) => x.id);
  assert.ok(ids(m.wallets).includes('vcb'));
  assert.ok(!ids(m.wallets).includes('unused'));
  assert.ok(ids(m.categories).includes('pet'));
  assert.ok(ids(m.categories).includes('gym'));
  assert.equal(m.wallets.length, remote.wallets.length + 1);
});

test('mergeBudget: giao dịch hỏng không làm lỗi', () => {
  const a = defaultData();
  const b = defaultData();
  a.txs.push({ id: 1 }, null, { id: 'x' }, tx('ok', '2026-10-01', 'expense', 1, 'food'));
  const m = mergeBudget(a, b);
  assert.deepEqual(m.txs.map((t) => t.id), ['ok']);
});

test('restoreTx giữ thời điểm ghi gốc', () => {
  const copy = restoreTx({ txs: [] }, { id: 'x', at: 7, u: 9 }, 'y');
  assert.equal(copy.id, 'y');
  assert.equal(copy.at, 7);
});

test('dayLabel', () => {
  assert.equal(dayLabel('2026-10-06', '2026-10-06'), 'Hôm nay');
  assert.equal(dayLabel('2026-09-30', '2026-10-01'), 'Hôm qua');
});
