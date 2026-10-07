import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, parseBackup, serialize } from '../js/store.js';

test('normalize: thêm trường thiếu, giữ dữ liệu có sẵn', () => {
  const d = normalize({ currency: 'USD', txs: [{ id: 'a' }], payday: 10 });
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

test('parseBackup: nhận file của Walley, từ chối file lạ', () => {
  const text = serialize({ ...normalize({}), payday: 5 });
  assert.equal(parseBackup(text).payday, 5);
  assert.throws(() => parseBackup('{"hello":1}'), /không đúng định dạng/);
  assert.throws(() => parseBackup('{"app":"walley","data":"x"}'), /không đúng định dạng/);
  assert.throws(() => parseBackup('not json'));
});
