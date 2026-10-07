import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from '../js/backup.js';
import { defaultData } from '../js/budget.js';

test('reconcile: biết bên nào cần cập nhật', () => {
  const a = defaultData({ now: 1, today: '2026-10-01' });
  const same = reconcile(a, JSON.parse(JSON.stringify(a)));
  assert.equal(same.localChanged, false);
  assert.equal(same.remoteChanged, false);

  const remote = JSON.parse(JSON.stringify(a));
  remote.txs.push({ id: 'r', date: '2026-10-02', type: 'expense', amount: 1, cat: 'food', u: 1 });
  const local = JSON.parse(JSON.stringify(a));
  local.txs.push({ id: 'l', date: '2026-10-03', type: 'expense', amount: 1, cat: 'food', u: 1 });
  const r = reconcile(local, remote);
  assert.deepEqual(r.merged.txs.map((t) => t.id), ['r', 'l']);
  assert.equal(r.localChanged, true);
  assert.equal(r.remoteChanged, true);
  assert.equal(reconcile(local, null).remoteChanged, true);
});

test('reconcile: khác thứ tự khóa không tính là thay đổi', () => {
  const a = defaultData({ now: 1, today: '2026-10-01' });
  const reversed = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(a))).reverse());
  const r = reconcile(a, reversed);
  assert.equal(r.localChanged, false);
  assert.equal(r.remoteChanged, false);
});

test('reconcile: firstSync: cấu hình trên Drive thắng khi máy mới khôi phục', () => {
  const base = defaultData({ now: 1, today: '2026-10-01' });
  const local = { ...JSON.parse(JSON.stringify(base)), onboarded: true, configAt: 999, payday: 1 };
  local.txs.push({ id: 'l', date: '2026-10-03', type: 'expense', amount: 1, cat: 'food', u: 1 });
  const remote = { ...JSON.parse(JSON.stringify(base)), configAt: 5, payday: 10 };
  remote.wallets = [...remote.wallets, { id: 'extra', name: 'Extra' }];
  remote.txs.push({ id: 'r', date: '2026-10-02', type: 'expense', amount: 1, cat: 'food', u: 1 });

  const f = reconcile(local, remote, { firstSync: true });
  assert.equal(f.merged.payday, 10);
  assert.deepEqual(f.merged.wallets, remote.wallets);
  assert.deepEqual(f.merged.txs.map((t) => t.id), ['r', 'l']);
  assert.equal(f.localChanged, true);

  const n = reconcile(local, remote);
  assert.equal(n.merged.payday, 1);
});
