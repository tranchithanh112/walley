import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { store: { 'wl.lang': 'en' }, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = v; } };
const { tr, setLang } = await import('../js/i18n.js');

test('dịch các câu chính', () => {
  assert.equal(tr('Cài đặt'), 'Settings');
  assert.equal(tr('Hoàn tác'), 'Undo');
  assert.equal(tr('🍜 Ăn uống'), '🍜 Food');
  assert.equal(tr('Danh mục'), 'Categories');
  assert.equal(tr('Đã xóa khoản chi 45.000 ₫'), 'Expense deleted: 45.000 ₫');
  assert.equal(tr('Trang chủ'), 'Home');
  assert.equal(tr('🏠 Tiền nhà'), '🏠 Rent');
});

test('tiếng Việt giữ nguyên', () => {
  setLang('vi');
  assert.equal(tr('Cài đặt'), 'Cài đặt');
  setLang('en');
});
