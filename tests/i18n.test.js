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
  assert.equal(tr('Đã chuyển 50.000 ₫ · A → B'), 'Transferred 50.000 ₫ · A → B');
  assert.equal(tr('Đã xóa khoản chuyển 50.000 ₫'), 'Transfer deleted: 50.000 ₫');
  assert.equal(tr('Lưu khoản chuyển'), 'Save transfer');
});

test('trang chủ theo kỳ lương', () => {
  assert.equal(tr('Kỳ lương 25/9 – 24/10'), 'Pay period 25/9 – 24/10');
  assert.equal(tr('Còn tiêu được kỳ này'), 'Left to spend this pay period');
  assert.equal(tr('Còn 1 ngày tới lương'), '1 day to payday');
  assert.equal(tr('Còn 12 ngày tới lương'), '12 days to payday');
  assert.equal(tr('Còn 1 ngày tới hạn'), 'Due in 1 day');
  assert.equal(tr('Còn 3 ngày tới hạn'), 'Due in 3 days');
  assert.equal(tr('Đến hạn hôm nay'), 'Due today');
  assert.equal(tr('Trả ngay'), 'Pay now');
  assert.equal(tr('Chuyển tiền'), 'Transfer');
  assert.equal(tr('Ước tính theo lương dự kiến'), 'Estimated from expected salary');
  assert.equal(tr('Chưa có khoản nào trong kỳ này'), 'No entries this pay period');
  assert.equal(tr('Kỳ trước'), 'Previous period');
  assert.equal(tr('Kỳ sau'), 'Next period');
  assert.equal(tr('còn $1.2K'), '$1.2K left');
  assert.equal(tr('≈ $40 mỗi ngày'), '≈ $40 a day');
  assert.equal(tr('Đã tiêu 45% ngân sách'), 'Spent 45% of budget');
  assert.equal(tr('Đã tiêu $1.2K / $3K'), 'Spent $1.2K / $3K');
  assert.equal(tr('đã để $0 / mục tiêu $600'), 'saved $0 / target $600');
  assert.equal(tr('vượt $50'), 'over by $50');
});

test('tiếng Việt giữ nguyên', () => {
  setLang('vi');
  assert.equal(tr('Cài đặt'), 'Cài đặt');
  setLang('en');
});
