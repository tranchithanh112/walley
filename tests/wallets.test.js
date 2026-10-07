import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walletBalance, setAnchor, netWorth, nextDue, dueReminders, walletUsage } from '../js/wallets.js';

const bank = () => ({ id: 'bank', name: 'VCB', type: 'bank', amount: 10e6, anchorAt: 100, anchorDate: '2026-10-01' });
const card = () => ({ id: 'card', name: 'Visa', type: 'credit', amount: -2e6, anchorAt: 100, anchorDate: '2026-10-01', dueDay: 15 });

test('số dư: thu / chi / chuyển sau mốc chốt', () => {
  const txs = [
    { id: '0', date: '2026-09-30', type: 'income', amount: 9e9, wallet: 'bank', at: 50 }, // trước mốc
    { id: '1', date: '2026-10-02', type: 'income', amount: 20e6, wallet: 'bank', at: 200 },
    { id: '2', date: '2026-10-03', type: 'expense', amount: 1e6, wallet: 'card', at: 300 },
    { id: '3', date: '2026-10-04', type: 'transfer', amount: 3e6, wallet: 'bank', to: 'card', at: 400 },
  ];
  assert.equal(walletBalance(bank(), txs).balance, 10e6 + 20e6 - 3e6);
  assert.equal(walletBalance(card(), txs).balance, -2e6 - 1e6 + 3e6);
  assert.equal(netWorth([bank(), card()], txs), 27e6);
});

test('chốt số dư: giao dịch cùng ngày ghi trước lúc chốt không tính lại', () => {
  const w = bank();
  setAnchor(w, 5e6, 1000, '2026-10-05');
  const txs = [
    { id: 'a', date: '2026-10-05', type: 'expense', amount: 1e5, wallet: 'bank', at: 900, u: 2000 },
    { id: 'b', date: '2026-10-05', type: 'expense', amount: 2e5, wallet: 'bank', at: 1100 },
  ];
  assert.equal(walletBalance(w, txs).balance, 5e6 - 2e5);
});

test('nextDue: ngày đến hạn kế tiếp (31 → cuối tháng)', () => {
  assert.equal(nextDue(15, '2026-10-07'), '2026-10-15');
  assert.equal(nextDue(15, '2026-10-15'), '2026-10-15');
  assert.equal(nextDue(15, '2026-10-16'), '2026-11-15');
  assert.equal(nextDue(31, '2026-02-10'), '2026-02-28');
  assert.equal(nextDue(5, '2026-12-20'), '2027-01-05');
});

test('dueReminders: thẻ âm và còn ≤ 5 ngày', () => {
  const r = dueReminders([bank(), card()], [], '2026-10-11');
  assert.equal(r.length, 1);
  assert.equal(r[0].wallet.id, 'card');
  assert.equal(r[0].days, 4);
  assert.equal(r[0].owed, 2e6);
  assert.equal(dueReminders([card()], [], '2026-10-01').length, 0); // còn 14 ngày
  const paid = { ...card(), amount: 0 };
  assert.equal(dueReminders([paid], [], '2026-10-11').length, 0);
});

test('walletUsage: đếm giao dịch + khoản định kỳ dùng ví', () => {
  const b = { txs: [{ wallet: 'bank' }, { wallet: 'x', to: 'bank' }], recurring: [{ wallet: 'bank' }] };
  assert.equal(walletUsage(b, 'bank'), 3);
  assert.equal(walletUsage(b, 'none'), 0);
});
