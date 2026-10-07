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

test('báo cáo theo kỳ', () => {
  assert.equal(tr('Kỳ này bạn giữ lại được 25% thu nhập.'), 'This period you kept 25% of your income.');
  assert.equal(tr('Kỳ này bạn tiêu nhiều hơn thu nhập $50.'), 'This period you spent $50 more than you earned.');
  assert.equal(tr('6 kỳ gần nhất'), 'Last 6 periods');
  assert.equal(tr('Chưa có khoản tiêu nào trong kỳ.'), 'No spending this period.');
  assert.equal(tr('Chưa có khoản để dành nào trong kỳ.'), 'Nothing saved this period.');
  assert.equal(tr('Tiêu vào đâu'), 'Where your money went');
  assert.equal(tr('Để dành & đầu tư'), 'Saved & invested');
  assert.equal(tr('Thu vào'), 'Income');
  assert.equal(tr('Tiêu'), 'Spent');
  assert.equal(tr('Để dành'), 'Saved');
});

test('tiếng Việt giữ nguyên', () => {
  setLang('vi');
  assert.equal(tr('Cài đặt'), 'Cài đặt');
  setLang('en');
});

test('tab ví', () => {
  assert.equal(tr('Tổng tài sản'), 'Net worth');
  assert.equal(tr('Thẻ tín dụng'), 'Credit card');
  assert.equal(tr('Số dư thực tế hôm nay (xem trong app ngân hàng)'), "Today's actual balance (check your banking app)");
  assert.equal(tr('Ví đã ẩn (2)'), 'Hidden wallets (2)');
  assert.equal(tr('Đã thêm ví Techcombank'), 'Wallet added: Techcombank');
  assert.equal(tr('Đã lưu ví Thẻ VIB'), 'Wallet saved: Thẻ VIB');
  assert.equal(tr('Đã xóa ví Momo'), 'Wallet deleted: Momo');
  assert.equal(tr('Đã ẩn ví Momo'), 'Wallet hidden: Momo');
  assert.equal(tr('Đã khôi phục ví Momo'), 'Wallet restored: Momo');
  assert.equal(tr('Ngày 15'), 'Day 15');
  assert.equal(tr('Cần giữ ít nhất 1 ví'), 'Keep at least one wallet');
  assert.equal(tr('Ví này đang có giao dịch — chỉ ẩn được'), 'This wallet has transactions — it can only be hidden');
});

test('tab cài đặt', () => {
  assert.equal(tr('Đã đổi ngày nhận lương thành ngày 10'), 'Payday changed to day 10');
  assert.equal(tr('Sao lưu lần cuối: 10/7/2026, 9:00:00 AM'), 'Last backup: 10/7/2026, 9:00:00 AM');
  assert.equal(tr('Sao lưu lần cuối: chưa có'), 'Last backup: never');
  assert.equal(tr('chưa có'), 'never');
  assert.equal(tr('Ngày nhận lương'), 'Payday');
  assert.equal(tr('Kỳ lương'), 'Pay period');
  assert.equal(tr('Bản này chưa bật sao lưu Google.'), 'Google backup is not enabled in this build.');
  assert.equal(tr('Đã xuất file'), 'File exported');
  assert.equal(tr('Đã nhập file'), 'File imported');
  assert.equal(tr('Đơn vị tiền'), 'Currency');
  assert.equal(tr('Chính sách quyền riêng tư'), 'Privacy policy');
  assert.equal(tr('Google Drive lỗi 403'), 'Google Drive error 403');
  assert.equal(tr('File không đúng định dạng của Walley'), 'Not a Walley backup file');
  assert.equal(tr('Phiên Google đã hết hạn — bấm Sao lưu ngay'), 'Google session expired — tap Back up now');
  assert.equal(tr('Đã lưu khoản tự động Lương · đã ghi 2 khoản đến hôm nay'), 'Recurring entry saved: Salary · 2 entries logged up to today');
  assert.equal(tr('Tháng 10/2026'), 'Oct 2026');
  assert.equal(tr('Hũ Thiết yếu'), 'Jar Essentials');
  assert.equal(tr('Dùng cài đặt trong file (ví, danh mục, hũ, ngày lương, đơn vị tiền)? Chọn Hủy để giữ cài đặt trên máy này.'),
    "Use the file's settings (wallets, categories, jars, payday, currency)? Choose Cancel to keep this device's settings.");
  assert.equal(tr('Đơn vị tiền trong file khác máy này — số tiền không được quy đổi'), "The file's currency differs from this device — amounts are not converted");
});

test('onboarding', () => {
  assert.equal(tr('Walley giúp bạn biết còn tiêu được bao nhiêu tới kỳ lương sau.'), 'Walley shows you how much you can still spend until your next payday.');
  assert.equal(tr('Bước 2/4'), 'Step 2 of 4');
  assert.equal(tr('Ngôn ngữ & đơn vị tiền'), 'Language & currency');
  assert.equal(tr('Lương của bạn'), 'Your salary');
  assert.equal(tr('Ví của bạn'), 'Your wallets');
  assert.equal(tr('Chia thu nhập'), 'Income split');
  assert.equal(tr('Tiếp tục'), 'Continue');
  assert.equal(tr('Bỏ qua'), 'Skip');
  assert.equal(tr('Quay lại'), 'Back');
  assert.equal(tr('Xong'), 'Done');
  assert.equal(tr('Đã dùng Walley trên máy khác? Khôi phục từ Google Drive'), 'Used Walley on another device? Restore from Google Drive');
  assert.equal(tr('Đã khôi phục dữ liệu'), 'Data restored');
  assert.equal(tr('Không tìm thấy bản sao lưu — hãy thiết lập mới'), 'No backup found — set things up fresh');
  assert.equal(tr('Bạn nhận lương ngày mấy?'), 'Which day of the month do you get paid?');
  assert.equal(tr('Lương mỗi tháng'), 'Monthly salary');
  assert.equal(tr('Lương về ví nào'), 'Salary goes to');
  assert.equal(tr('Nhập số dư hiện tại để app tự cộng / trừ khi bạn ghi thu chi.'), 'Enter current balances so the app can add / subtract as you record entries.');
  assert.equal(tr('Tổng 90% — cần đúng 100%'), 'Total 90% — must be exactly 100%');
  assert.equal(tr('Xong! Bấm + để ghi khoản chi đầu tiên'), 'All set! Tap + to add your first expense');
});