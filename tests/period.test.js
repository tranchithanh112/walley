import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodOf, periodFromKey, shiftPeriod, inPeriod, daysLeft, paydayIn } from '../js/period.js';

test('payday 10: kỳ chạy 10 → 9 tháng sau', () => {
  assert.deepEqual(periodOf('2026-10-07', 10), { key: '2026-09', start: '2026-09-10', end: '2026-10-09' });
  assert.deepEqual(periodOf('2026-10-10', 10), { key: '2026-10', start: '2026-10-10', end: '2026-11-09' });
});

test('payday 1 = tháng dương lịch', () => {
  assert.deepEqual(periodOf('2026-02-15', 1), { key: '2026-02', start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(periodOf('2028-02-29', 1), { key: '2028-02', start: '2028-02-01', end: '2028-02-29' });
});

test('payday 31: tháng ngắn lấy ngày cuối tháng', () => {
  assert.equal(paydayIn(2026, 2, 31), '2026-02-28');
  assert.equal(paydayIn(2028, 2, 31), '2028-02-29');
  assert.deepEqual(periodFromKey('2026-02', 31), { key: '2026-02', start: '2026-02-28', end: '2026-03-30' });
  assert.equal(periodOf('2026-03-30', 31).key, '2026-02');
  assert.equal(periodOf('2026-03-31', 31).key, '2026-03');
  assert.deepEqual(periodFromKey('2026-04', 31), { key: '2026-04', start: '2026-04-30', end: '2026-05-30' });
});

test('kỳ vắt qua năm', () => {
  assert.deepEqual(periodOf('2027-01-05', 10), { key: '2026-12', start: '2026-12-10', end: '2027-01-09' });
  assert.equal(shiftPeriod('2026-12', 1, 10).key, '2027-01');
  assert.equal(shiftPeriod('2027-01', -1, 10).key, '2026-12');
});

test('inPeriod và daysLeft (tính cả hôm nay)', () => {
  const p = periodOf('2026-10-07', 10);
  assert.ok(inPeriod('2026-09-10', p));
  assert.ok(inPeriod('2026-10-09', p));
  assert.ok(!inPeriod('2026-10-10', p));
  assert.equal(daysLeft(p, '2026-10-07'), 3);
  assert.equal(daysLeft(p, '2026-10-09'), 1);
  assert.equal(daysLeft(p, '2026-10-10'), null);
});
