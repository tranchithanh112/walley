import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, parseBackup, serialize } from '../js/store.js';

test('normalize: thêm trường thiếu, giữ dữ liệu có sẵn', () => {
  const d = normalize({ currency: 'USD', txs: [{ id: 'a', date: '2026-10-01', type: 'expense', amount: 1 }], payday: 10 });
  assert.equal(d.currency, 'USD');
  assert.equal(d.payday, 10);
  assert.equal(d.txs.length, 1);
  assert.equal(d.jars.length, 4);
  assert.ok(Array.isArray(d.wallets));
});

test('normalize: ép payday, currency, deleted về giá trị hợp lệ', () => {
  assert.equal(normalize({ payday: 0 }).payday, 1);
  assert.equal(normalize({ payday: 45 }).payday, 31);
  assert.equal(normalize({ payday: '10' }).payday, 10);
  assert.equal(normalize({ payday: '10.7' }).payday, 10);
  assert.equal(normalize({ currency: 'EUR' }).currency, 'VND');
  assert.deepEqual(normalize({ deleted: null }).deleted, {});
});

test('normalize: bỏ giao dịch hỏng và phần tử không hợp lệ', () => {
  const ok = { id: 'ok', date: '2026-10-01', type: 'income', amount: 5 };
  const d = normalize({
    txs: [ok, null, 'x', { ...ok, id: 1 }, { ...ok, date: '1/10/2026' }, { ...ok, type: 'gift' },
      { ...ok, amount: 0 }, { ...ok, amount: -1 }, { ...ok, amount: '5' }, { ...ok, amount: NaN }],
    wallets: [{ id: 'w' }, null, 3, { name: 'no id' }],
    categories: [{ id: 'c' }, 'bad', { id: 2 }],
    recurring: [{ id: 'r' }, null],
    jars: [{ id: 'nec', pct: 100 }, 'x'],
  });
  assert.deepEqual(d.txs.map((t) => t.id), ['ok']);
  assert.deepEqual(d.wallets.map((w) => w.id), ['w']);
  assert.deepEqual(d.categories.map((c) => c.id), ['c']);
  assert.equal(d.recurring.length, 1);
  assert.equal(d.jars.length, 1);
});

test('parseBackup: file có giao dịch hỏng vẫn nhập được, bỏ giao dịch đó', () => {
  const data = { ...normalize({}), txs: [{ id: 'ok', date: '2026-10-01', type: 'expense', amount: 1 }, { id: 'bad', date: 'x', type: 'expense', amount: 1 }] };
  assert.deepEqual(parseBackup(serialize(data)).txs.map((t) => t.id), ['ok']);
});

test('parseBackup: nhận file của Walley, từ chối file lạ', () => {
  const text = serialize({ ...normalize({}), payday: 5 });
  assert.equal(parseBackup(text).payday, 5);
  assert.throws(() => parseBackup('{"hello":1}'), /không đúng định dạng/);
  assert.throws(() => parseBackup('{"app":"walley","data":"x"}'), /không đúng định dạng/);
  assert.throws(() => parseBackup('not json'));
});
