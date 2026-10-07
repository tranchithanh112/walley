// Đa ngôn ngữ (vi / en). Giao diện viết bằng tiếng Việt; khi chọn English, sau mỗi lần render
// app dịch các đoạn chữ trong DOM (text, placeholder, title…) theo từ điển bên dưới.
//  - EXACT: câu cố định (so khớp cả đoạn, đã trim)
//  - RULES: câu có số / tên chèn vào (regex, áp dụng lần lượt)
//  - TERMS: tên danh mục / hũ mặc định chen trong câu

let lang = (() => {
  try {
    const l = localStorage.getItem('wl.lang');
    if (l) return l === 'en' ? 'en' : 'vi';
  } catch { /* bỏ qua */ }
  return typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
})();

export const getLang = () => lang;
export const locale = () => (lang === 'en' ? 'en-US' : 'vi-VN');
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'vi';
  try { localStorage.setItem('wl.lang', lang); } catch { /* ignore */ }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

const EXACT = {
  // ---- điều hướng & chung
  'Trang chủ': 'Home', 'Báo cáo': 'Report', 'Ví': 'Wallet', 'Cài đặt': 'Settings', 'Điều hướng': 'Navigation',
  'Danh mục': 'Categories',
  'Trình duyệt đang chặn lưu dữ liệu (chế độ riêng tư?) — dữ liệu sẽ mất khi đóng app.':
    'Your browser is blocking storage (private mode?) — data will be lost when you close the app.',
  'Không lưu được dữ liệu trên máy — bộ nhớ đầy?': "Couldn't save data on this device — storage full?",
  'Cần đăng nhập lại Google để sao lưu': 'Sign in to Google again to back up', 'Đăng nhập': 'Sign in',
  'Chưa sao lưu — sẽ thử lại khi có mạng': 'Not backed up — will retry when online',
  'Chưa sao lưu được lên Google Drive': "Couldn't back up to Google Drive", 'Thử lại': 'Retry',
  '(ví đã xóa)': '(deleted wallet)',

  // ---- tổng hợp / số dư
  'Quỹ dự phòng': 'Emergency fund',
  'Thu': 'Income', 'Để dành & đầu tư': 'Saved & invested',

  // ---- thu chi
  'Chi': 'Expense', 'Lưu tỷ lệ': 'Save ratios', 'Số tiền': 'Amount', 'Ngày': 'Date', 'Ghi chú': 'Note',
  'Thêm danh mục': 'Add category', 'Tên danh mục': 'Category name', 'thu': 'income',
  'Hằng tháng': 'Monthly', '2 tháng/lần': 'Every 2 months', '3 tháng/lần': 'Every 3 months', '6 tháng/lần': 'Every 6 months', 'Hằng năm': 'Yearly',
  'Chọn danh mục': 'Pick a category', 'Nhập số tiền hợp lệ': 'Enter a valid amount',

  // thu chi (giao diện mới)
  'Ghi khoản mới': 'New entry',
  'Ghi khoản đầu tiên': 'Add your first entry', 'Ghi khoản thu': 'Add income',
  'Thu vào': 'Income', 'Tiêu': 'Spent', 'Để dành': 'Saved', 'Hôm qua': 'Yesterday',
  'Còn tiêu được': 'Left to spend', 'Còn lại': 'Left over',
  'Còn tiêu được kỳ này': 'Left to spend this pay period', 'Ước tính theo lương dự kiến': 'Estimated from expected salary',
  'Chuyển tiền': 'Transfer', 'Trả ngay': 'Pay now', 'Đến hạn hôm nay': 'Due today',
  'Chưa có khoản nào trong kỳ này': 'No entries this pay period', 'Kỳ trước': 'Previous period', 'Kỳ sau': 'Next period',
  'Đã tiêu quá': 'Over budget by', 'Xem 4 hũ': 'Show 4 jars', 'Ẩn 4 hũ': 'Hide 4 jars',
  'Ghi lương hoặc thu nhập để biết còn tiêu được bao nhiêu.': 'Add your salary or other income to see how much you can still spend.',
  'nghìn': 'thousand', 'triệu': 'million', 'Đóng': 'Close',
  'Sửa khoản chi': 'Edit expense', 'Sửa khoản thu': 'Edit income', 'Lưu khoản chi': 'Save expense', 'Lưu khoản thu': 'Save income',
  'Lưu thay đổi': 'Save changes', 'Không bắt buộc': 'Optional', 'Xóa khoản này': 'Delete this entry',
  'Nhập số tiền lớn hơn 0': 'Enter an amount greater than 0', 'Chọn ngày': 'Pick a date',
  'Không tìm thấy khoản này — có thể vừa bị xóa trên máy khác': "Couldn't find this entry — it may have just been deleted on another device",
  'Đã cập nhật khoản chi': 'Expense updated', 'Đã cập nhật khoản thu': 'Income updated',
  'Đã khôi phục khoản chi': 'Expense restored', 'Đã khôi phục khoản thu': 'Income restored',
  'Chuyển': 'Transfer', 'Từ ví': 'From', 'Đến ví': 'To', 'Chọn 2 ví khác nhau': 'Pick two different wallets',
  'Lưu khoản chuyển': 'Save transfer', 'Sửa khoản chuyển': 'Edit transfer',
  'Đã cập nhật khoản chuyển': 'Transfer updated', 'Đã khôi phục khoản chuyển': 'Transfer restored',
  'Cần ít nhất 2 ví để chuyển tiền — thêm ví ở tab Ví': 'You need at least 2 wallets to transfer — add one in the Wallet tab',
  '6 kỳ gần nhất': 'Last 6 periods', 'Chưa có khoản tiêu nào trong kỳ.': 'No spending this period.',
  'Chưa có khoản để dành nào trong kỳ.': 'Nothing saved this period.',
  'Tiêu vào đâu': 'Where your money went',
  'Khoản tự động hằng tháng': 'Recurring entries', '+ Thêm': '+ Add', 'Chưa có khoản tự động nào.': 'No recurring entries yet.',
  'Lương, tiền nhà, hóa đơn… tự ghi vào đúng ngày, không cần nhập tay mỗi tháng.': 'Salary, rent, bills… are logged automatically on their day — no need to enter them every month.',
  'Sửa khoản tự động': 'Edit recurring entry', 'Thêm khoản tự động': 'Add recurring entry', 'Xóa khoản tự động': 'Delete recurring entry',
  'Vào ngày': 'Day of month', 'Lặp lại': 'Repeat', 'Bắt đầu từ': 'Starting from',
  'Thay đổi áp dụng cho các lần sau; các khoản đã ghi giữ nguyên.': 'Changes apply from now on; entries already logged stay as they are.',
  'Đã xóa khoản tự động (các khoản đã ghi vẫn giữ)': 'Recurring entry deleted (entries already logged are kept)',
  'Đã khôi phục khoản tự động': 'Recurring entry restored',
  'Chia thu nhập': 'Income split',
  'Mỗi khi có thu nhập, app chia theo tỷ lệ này để tính "Còn tiêu được" và mục tiêu để dành.': 'Whenever income comes in, the app splits it by these ratios to work out "Left to spend" and your savings targets.',
  'chi tiêu cần thiết': 'must-have spending', 'chi cho bản thân': 'spending on yourself', 'tiền để dành': 'money set aside', 'tiền đầu tư': 'money invested',
  'Tổng 100% ✓': 'Total 100% ✓',
  'Đã lưu cách chia thu nhập': 'Income split saved',
  'Sửa danh mục': 'Edit category', 'Xóa danh mục': 'Delete category', 'Biểu tượng': 'Icon', 'Thuộc hũ': 'Jar', 'Ví dụ: Tiền nhà': 'e.g. Rent',
  'Nhập tên danh mục': 'Enter a category name', 'Đã có danh mục tên này': 'A category with this name already exists',
  'Không tìm thấy danh mục này — có thể vừa bị xóa trên máy khác': "Couldn't find this category — it may have just been deleted on another device",

  // ---- chung
  'Hôm nay': 'Today', 'Loại': 'Type',

  // ---- cài đặt
  'Kết nối Google Drive': 'Connect Google Drive', 'Ngắt kết nối': 'Disconnect',
  'Giao diện': 'Appearance', 'Ngôn ngữ': 'Language', 'Chế độ': 'Mode',
  'Tự động': 'Auto', 'Sáng': 'Light', 'Tối': 'Dark',
  'Đã ngắt kết nối': 'Disconnected',
  'Có bản mới — tải lại để cập nhật': "There's a new version — reload to update", 'Tải lại': 'Reload',

  // thông báo thao tác
  'Hoàn tác': 'Undo',

  // ---- ví
  'Tổng tài sản': 'Net worth', 'Đã trừ số đang nợ thẻ tín dụng': 'Credit card debt subtracted',
  'Ví của bạn': 'Your wallets', '+ Thêm ví': '+ Add wallet', 'Thêm ví': 'Add wallet', 'Sửa ví': 'Edit wallet',
  'Tên ví': 'Wallet name', 'Tiền mặt': 'Cash', 'Ngân hàng': 'Bank', 'Ví điện tử': 'E-wallet', 'Thẻ tín dụng': 'Credit card',
  'Số dư hiện tại': 'Current balance', 'Số đang nợ': 'Amount owed', 'Ngày đến hạn thanh toán': 'Payment due day',
  'Số dư thực tế hôm nay (xem trong app ngân hàng)': "Today's actual balance (check your banking app)",
  'Xóa ví': 'Delete wallet', 'Ẩn ví': 'Hide wallet', 'Hiện lại ví': 'Unhide wallet', 'Lưu ví': 'Save wallet',
  'Cần giữ ít nhất 1 ví': 'Keep at least one wallet', 'Đã có ví tên này': 'A wallet with this name already exists',
  'Ví này đang có giao dịch — chỉ ẩn được': 'This wallet has transactions — it can only be hidden',
  'Nhập tên ví': 'Enter a wallet name', 'Giao dịch gần đây': 'Recent transactions', 'Chưa có giao dịch nào': 'No transactions yet',
  'Không tìm thấy ví này — có thể vừa bị xóa trên máy khác': "Couldn't find this wallet — it may have just been deleted on another device",

  // ---- tab cài đặt
  'Kỳ lương': 'Pay period', 'Ngày nhận lương': 'Payday',
  'Kỳ lương tính từ ngày này đến trước ngày nhận lương tháng sau.': "A pay period runs from this day to the day before next month's payday.",
  'Sao lưu Google Drive': 'Google Drive backup', 'Bản này chưa bật sao lưu Google.': 'Google backup is not enabled in this build.',
  'Sao lưu ngay': 'Back up now', 'chưa có': 'never', 'Đã kết nối và sao lưu': 'Connected and backed up', 'Đã sao lưu': 'Backed up',
  'Đã cập nhật dữ liệu từ Google Drive': 'Updated data from Google Drive',
  'Ngắt kết nối Google Drive? Dữ liệu trên máy vẫn giữ nguyên.': 'Disconnect Google Drive? Data on this device stays as it is.',
  'Đơn vị tiền': 'Currency',
  'Đổi đơn vị tiền chỉ đổi ký hiệu, không quy đổi số tiền đã ghi. Tiếp tục?':
    'Changing the currency only changes the symbol — amounts already recorded are not converted. Continue?',
  'Dữ liệu': 'Data', 'Xuất file': 'Export file', 'Nhập file': 'Import file', 'Đã xuất file': 'File exported', 'Đã nhập file': 'File imported',
  'Nhập file sẽ gộp với dữ liệu đang có trên máy, không xóa gì.': 'Importing a file merges it with the data on this device — nothing is deleted.',
  'Gộp dữ liệu trong file với dữ liệu trên máy này?': "Merge the file's data with the data on this device?",
  'File không đúng định dạng của Walley': 'Not a Walley backup file', 'Chính sách quyền riêng tư': 'Privacy policy',
  'Dùng cài đặt trong file (ví, danh mục, hũ, ngày lương, đơn vị tiền)? Chọn Hủy để giữ cài đặt trên máy này.':
    "Use the file's settings (wallets, categories, jars, payday, currency)? Choose Cancel to keep this device's settings.",
  'Đơn vị tiền trong file khác máy này — số tiền không được quy đổi': "The file's currency differs from this device — amounts are not converted",
  // sao lưu (backup.js)
  'App chưa được cấu hình Google': 'The app is not set up for Google',
  'Không tải được Google — kiểm tra mạng': "Couldn't load Google — check your connection",
  'Hết thời gian chờ Google — thử lại': 'Google took too long — try again',
  'Đã đóng cửa sổ Google': 'The Google window was closed', 'Không kết nối được Google': "Couldn't connect to Google",
  'Cần cho phép Walley lưu vào Google Drive để sao lưu': 'Allow Walley to save to Google Drive to back up',
  'Phiên Google đã hết hạn — bấm Sao lưu ngay': 'Google session expired — tap Back up now',

  // ---- lần đầu mở app (onboarding)
  'Walley giúp bạn biết còn tiêu được bao nhiêu tới kỳ lương sau.': 'Walley shows you how much you can still spend until your next payday.',
  'Ngôn ngữ & đơn vị tiền': 'Language & currency', 'Lương của bạn': 'Your salary',
  'Tiếp tục': 'Continue', 'Bỏ qua': 'Skip', 'Quay lại': 'Back', 'Xong': 'Done',
  'Đã dùng Walley trên máy khác? Khôi phục từ Google Drive': 'Used Walley on another device? Restore from Google Drive',
  'Đã khôi phục dữ liệu': 'Data restored', 'Không tìm thấy bản sao lưu — hãy thiết lập mới': 'No backup found — set things up fresh',
  'Bạn nhận lương ngày mấy?': 'Which day of the month do you get paid?', 'Lương mỗi tháng': 'Monthly salary',
  'Lương về ví nào': 'Salary goes to',
  'Nhập số dư hiện tại (đã gồm lương đã nhận) — app tự cộng / trừ khi bạn ghi thu chi.': 'Enter the current balance (including salary already received) — the app adjusts it as you add entries.',
  'Xong! Bấm + để ghi khoản chi đầu tiên': 'All set! Tap + to add your first expense',
};

// Danh mục & hũ mặc định (xuất hiện chen trong chuỗi, vd "🍜 Ăn uống", "Hũ Thiết yếu").
// Cụm dài đứng trước cụm ngắn trùng phần đầu (vd "Trả nợ / trả góp" trước "Trả nợ").
const TERMS = [
  ['Hóa đơn & điện thoại', 'Bills & phone'], ['Cafe & đi chơi', 'Coffee & going out'], ['Gửi tiết kiệm', 'Savings deposit'],
  ['Trả nợ / trả góp', 'Debt / installments'], ['Thu nhập phụ', 'Side income'], ['Gửi gia đình', 'Family support'],
  ['Quỹ dự phòng', 'Emergency fund'], ['Tiền nhà', 'Rent'],
  ['Ăn uống', 'Food'], ['Di chuyển', 'Transport'], ['Sức khỏe', 'Health'], ['Trả nợ', 'Debt payment'], ['Mua sắm', 'Shopping'],
  ['Du lịch', 'Travel'], ['Giải trí', 'Entertainment'], ['Quà tặng', 'Gifts'], ['Thu khác', 'Other income'],
  ['Thưởng', 'Bonus'], ['Lương', 'Salary'], ['Danh mục', 'Categories'],
  ['Thiết yếu', 'Essentials'], ['Tiết kiệm', 'Savings'], ['Đầu tư', 'Investing'], ['Hưởng thụ', 'Fun'],
  ['Hũ ', 'Jar '],
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RULES = [
  [/^Tháng (\d+)\/(\d+)$/, (m, a, y) => `${MONTHS[a - 1]} ${y}`],
  [/^vượt (.+)$/, 'over by $1'], [/^còn (.+)$/, '$1 left'],
  [/^Đã lưu khoản thu (.+)$/, 'Income saved: $1'], [/^Đã lưu khoản chi (.+)$/, 'Expense saved: $1'],
  [/^Tổng tỷ lệ đang là (\d+)%, cần bằng 100%$/, 'Ratios add up to $1%, they must equal 100%'],
  // các câu "Đã … khoản / ví / danh mục" phải đứng trước 3 câu chung ở cuối
  [/^Đã tiêu (\d+)% ngân sách$/, 'Spent $1% of budget'], [/^Đã tiêu (.+) \/ (.+)$/, 'Spent $1 / $2'],
  [/^≈ (.+) mỗi ngày$/, '≈ $1 a day'], [/^đã để (.+) \/ mục tiêu (.+)$/, 'saved $1 / target $2'],
  [/Tự động hằng tháng/g, 'Recurring'],
  [/^Kỳ lương (.+)$/, 'Pay period $1'],
  [/^Còn (\d+) ngày tới lương$/, (m, n) => `${n} ${n === '1' ? 'day' : 'days'} to payday`],
  [/^Còn (\d+) ngày tới hạn$/, (m, n) => `Due in ${n} ${n === '1' ? 'day' : 'days'}`],
  [/^Kỳ này bạn giữ lại được (\d+)% thu nhập\.$/, 'This period you kept $1% of your income.'],
  [/^Kỳ này bạn tiêu nhiều hơn thu nhập (.+)\.$/, 'This period you spent $1 more than you earned.'],
  [/^Ngày (\d+)(?: · (Hằng tháng|Hằng năm|(\d+) tháng\/lần))?( · .+)?$/, (m, d, e, n, rest = '') =>
    `Day ${d}` + (e ? ` · ${e === 'Hằng tháng' ? 'Monthly' : e === 'Hằng năm' ? 'Yearly' : `Every ${n} months`}` : '') + rest],
  [/^Danh mục (thu|chi)$/, (m, k) => `${k === 'thu' ? 'Income' : 'Expense'} category`],
  [/^Đã xóa khoản (chi|thu|chuyển) (.+)$/, (m, k, v) => `${{ chi: 'Expense', thu: 'Income', 'chuyển': 'Transfer' }[k]} deleted: ${v}`],
  [/^Đã chuyển (.+) · (.+) → (.+)$/, 'Transferred $1 · $2 → $3'],
  [/^Đã lưu khoản tự động (.+?)(?: · đã ghi (\d+) khoản đến hôm nay)?$/, (m, name, n) =>
    `Recurring entry saved: ${name}` + (n ? ` · ${n} ${n === '1' ? 'entry' : 'entries'} logged up to today` : '')],
  [/^Ví đã ẩn \((\d+)\)$/, 'Hidden wallets ($1)'],
  [/^Đã (lưu|thêm|xóa|ẩn|khôi phục) ví (.+)$/, (m, v, n) =>
    `Wallet ${{ 'lưu': 'saved', 'thêm': 'added', 'xóa': 'deleted', 'ẩn': 'hidden', 'khôi phục': 'restored' }[v]}: ${n}`],
  [/^Đã (lưu|thêm|xóa|khôi phục) danh mục (.+)$/, (m, v, n) =>
    `Category ${{ 'lưu': 'saved', 'thêm': 'added', 'xóa': 'deleted', 'khôi phục': 'restored' }[v]}: ${n}`],
  [/^Không xóa được: còn (\d+) khoản dùng danh mục này$/, (m, n) =>
    `Can't delete: ${n} ${n === '1' ? 'entry still uses' : 'entries still use'} this category`],
  [/^Tổng (\d+)% — cần đúng 100%$/, 'Total $1% — must be exactly 100%'],
  [/^Đã đổi ngày nhận lương thành ngày (\d+)$/, 'Payday changed to day $1'],
  [/^Bước (\d+)\/(\d+)$/, 'Step $1 of $2'],
  [/^Lần sao lưu gần nhất bị lỗi: (.+)$/, 'Last backup failed: $1'],
  [/^Sao lưu lần cuối: (.+)$/,(m, v) => `Last backup: ${v === 'chưa có' ? 'never' : v}`],
  [/^Google Drive lỗi (\d+)$/, 'Google Drive error $1'],
  [/^Đã khôi phục (.+)$/, 'Restored $1'],
  [/^Đã thêm (.+)$/, 'Added $1'],
  [/^Đã xóa (.+)$/, 'Deleted $1'],
];

const TERMS_RE = TERMS.map(([vi, en]) => [new RegExp(vi.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'g'), en]);

/** Dịch 1 chuỗi (giữ nguyên khoảng trắng đầu/cuối). */
export function tr(s) {
  if (lang === 'vi' || s == null) return s;
  const str = String(s);
  const core = str.trim();
  if (!core) return str;
  let out = EXACT[core];
  if (out == null) {
    if (!/[À-ỹ]/i.test(core)) return str; // không có dấu tiếng Việt → giữ nguyên
    out = core;
    for (const [re, rep] of RULES) {
      if (re.test(out)) {
        re.lastIndex = 0;
        out = out.replace(re, rep);
      }
      re.lastIndex = 0;
    }
    for (const [re, en] of TERMS_RE) out = out.replace(re, en);
  }
  return str.replace(core, out);
}

const ATTRS = ['placeholder', 'title', 'aria-label', 'label'];

/** Dịch toàn bộ chữ trong 1 vùng DOM. */
export function translateDom(root) {
  if (lang === 'vi' || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (n.parentElement?.closest('script,style,code')) continue;
    const v = tr(n.nodeValue);
    if (v !== n.nodeValue) n.nodeValue = v;
  }
  for (const el of [root, ...root.querySelectorAll('[placeholder],[title],[aria-label],optgroup[label]')]) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) {
        const t = tr(v);
        if (t !== v) el.setAttribute(a, t);
      }
    }
  }
}

// confirm / prompt dùng chuỗi tiếng Việt trong code → dịch khi hiển thị
if (typeof window !== 'undefined' && window.confirm) {
  const nativeConfirm = window.confirm.bind(window);
  const nativePrompt = window.prompt.bind(window);
  window.confirm = (m) => nativeConfirm(tr(m));
  window.prompt = (m, d) => nativePrompt(tr(m), d);
  document.documentElement.lang = lang;
}
