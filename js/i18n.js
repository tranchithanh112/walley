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
  'Thu chi': 'Budget', 'Danh mục': 'Categories', 'Thêm': 'Add', 'Xóa': 'Delete', 'Sửa': 'Edit',
  'Lưu': 'Save', 'Hủy': 'Cancel', 'Mở': 'Open', 'Thu gọn': 'Collapse', 'Mặc định': 'Default', 'Lên': 'Up', 'Xuống': 'Down',
  'Tiền tệ hiển thị': 'Display currency', 'Giao diện sáng / tối': 'Light / dark mode',
  'Ghi thu chi': 'Add transaction', 'Ẩn / hiện số dư': 'Hide / show balances', 'Ẩn số dư': 'Hide balances', 'Hiện số dư': 'Show balances',
  'Trình duyệt đang chặn lưu dữ liệu (chế độ riêng tư?) — dữ liệu sẽ mất khi đóng app.':
    'Your browser is blocking storage (private mode?) — data will be lost when you close the app.',
  'Không lưu được dữ liệu trên máy — bộ nhớ đầy?': "Couldn't save data on this device — storage full?",
  'Cần đăng nhập lại Google để sao lưu': 'Sign in to Google again to back up', 'Đăng nhập': 'Sign in',

  // ---- tổng hợp / số dư
  'Tỷ lệ tiết kiệm': 'Savings rate', 'Quỹ dự phòng': 'Emergency fund', 'Tháng này': 'This month',
  'Sửa số dư': 'Edit balance', 'Thu': 'Income', 'Tiêu dùng': 'Spending', 'Để dành & đầu tư': 'Saved & invested', 'Khác': 'Other',

  // ---- thu chi
  'Tháng trước': 'Previous month', 'Tháng sau': 'Next month', 'Chi': 'Expense',
  'Số tiền — vd 45k, 1.2tr': 'Amount — e.g. 45k, 1.2m', 'Ghi chú (tuỳ chọn)': 'Note (optional)',
  'Tự cộng/trừ vào tài khoản': 'Auto-apply to account', 'Không trừ vào tài khoản': "Don't apply to an account",
  'Thu nhập': 'Income', 'Thiết yếu + Hưởng thụ': 'Essentials + Fun', 'Chưa phân bổ': 'Unallocated',
  'Thu − tiêu − để dành': 'Income − spending − saved', '(Thu − tiêu dùng) / thu': '(Income − spending) / income',
  'Các hũ tháng này': 'Jars this month', 'Chi theo danh mục': 'Spending by category', 'Chưa có khoản chi.': 'No expenses yet.',
  '6 tháng gần nhất': 'Last 6 months', 'Giao dịch': 'Transactions', 'định kỳ': 'recurring',
  'Chưa có giao dịch trong tháng.': 'No transactions this month.',
  'Thiết lập hũ, khoản định kỳ & danh mục': 'Jars, recurring items & categories',
  'Lưu tỷ lệ': 'Save ratios', 'Quỹ dự phòng mục tiêu (tháng)': 'Emergency fund target (months)',
  'Khoản định kỳ (tự thêm mỗi tháng)': 'Recurring items (added automatically)',
  'Khoản': 'Item', 'Số tiền': 'Amount', 'Ngày': 'Date', 'Chu kỳ': 'Frequency', 'Từ tháng': 'From month',
  'Chưa có — vd Lương ngày 5, Netflix 3 tháng/lần.': 'None yet — e.g. salary on the 5th, Netflix every 3 months.',
  'Số tiền (vd 15tr)': 'Amount (e.g. 15m)', 'Ngày trong tháng (1–28)': 'Day of month (1–28)',
  'Tháng trả lần đầu (tính từ đó theo chu kỳ)': 'First payment month (repeats from there)', 'Ghi chú': 'Note',
  'Thêm danh mục': 'Add category', 'Tên danh mục': 'Category name', 'thu': 'income',
  'Hằng tháng': 'Monthly', '2 tháng/lần': 'Every 2 months', '3 tháng/lần': 'Every 3 months', '6 tháng/lần': 'Every 6 months', 'Hằng năm': 'Yearly',
  'Chọn danh mục': 'Pick a category', 'Số tiền không hợp lệ': 'Invalid amount',
  'Số tiền không hợp lệ (vd 45k, 1.2tr, 150000)': 'Invalid amount (e.g. 45k, 1.2m, 150000)', 'Số không hợp lệ': 'Invalid number',
  'Đã lưu tỷ lệ hũ': 'Jar ratios saved',
  'Xóa khoản định kỳ này? (Các giao dịch đã sinh vẫn được giữ)': 'Delete this recurring item? (Existing transactions are kept)',

  // bảng sửa số dư
  'Nhập số dư thực tế hiện tại (xem trong app ngân hàng). Các khoản thu chi ghi sau lúc này sẽ tự cộng / trừ vào số dư.':
    'Enter the actual current balance (check your banking app). Entries recorded after this are added / subtracted automatically.',
  'Nhập số tiền hợp lệ': 'Enter a valid amount',
  'Không tìm thấy tài khoản này — có thể vừa bị xóa trên máy khác': 'Account not found — it may have just been deleted on another device',

  // thu chi (giao diện mới)
  'Thiết lập': 'Setup', '+ Ghi khoản mới': '+ New entry', 'Ghi khoản mới': 'New entry',
  'Ghi khoản đầu tiên': 'Add your first entry', 'Ghi khoản thu': 'Add income',
  'Thu vào': 'Income', 'Tiêu': 'Spent', 'Để dành': 'Saved', 'Hôm qua': 'Yesterday',
  'Còn tiêu được': 'Left to spend', 'Còn tiêu được tháng này': 'Left to spend this month', 'Còn lại': 'Left over',
  'Còn tiêu được kỳ này': 'Left to spend this pay period', 'Ước tính theo lương dự kiến': 'Estimated from expected salary',
  'Chuyển tiền': 'Transfer', 'Trả ngay': 'Pay now', 'Đến hạn hôm nay': 'Due today',
  'Chưa có khoản nào trong kỳ này': 'No entries this pay period', 'Kỳ trước': 'Previous period', 'Kỳ sau': 'Next period',
  'Đã tiêu quá': 'Over budget by', 'Xem 4 hũ': 'Show 4 jars', 'Ẩn 4 hũ': 'Hide 4 jars',
  'Ghi lương hoặc thu nhập để biết còn tiêu được bao nhiêu.': 'Add your salary or other income to see how much you can still spend.',
  'Tài khoản': 'Account', 'nghìn': 'thousand', 'triệu': 'million', 'Đóng': 'Close',
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
  'Tiêu vào đâu': 'Where your money went', 'Chưa có khoản tiêu nào trong tháng.': 'No spending this month.',
  'Chưa có khoản để dành nào trong tháng.': 'Nothing saved or invested this month.',
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
  'Quỹ dự phòng nên đủ mấy tháng chi tiêu': 'Emergency fund target (months of spending)', 'Tổng 100% ✓': 'Total 100% ✓',
  'Số tháng quỹ dự phòng phải từ 1 đến 24': 'Emergency fund months must be between 1 and 24', 'Đã lưu cách chia thu nhập': 'Income split saved',
  'Sửa danh mục': 'Edit category', 'Xóa danh mục': 'Delete category', 'Biểu tượng': 'Icon', 'Thuộc hũ': 'Jar', 'Ví dụ: Tiền nhà': 'e.g. Rent',
  'Nhập tên danh mục': 'Enter a category name', 'Đã có danh mục tên này': 'A category with this name already exists',
  'Không tìm thấy danh mục này — có thể vừa bị xóa trên máy khác': "Couldn't find this category — it may have just been deleted on another device",

  // ---- chung
  'Tất cả': 'All', 'Hôm nay': 'Today', 'Tên': 'Name', 'Tiền tệ': 'Currency', 'Tổng': 'Total', 'Loại': 'Type',
  'Chưa có giao dịch.': 'No transactions yet.', 'Chi tiết': 'Details', 'Chi tiêu': 'Spending',
  'Kết nối': 'Connect', 'Đang tải…': 'Loading…',

  // ---- cài đặt
  'Kết nối Google Drive': 'Connect Google Drive', 'Ngắt kết nối': 'Disconnect', 'Đồng bộ ngay': 'Sync now',
  'Sao lưu thủ công': 'Manual backup', 'Xuất JSON': 'Export JSON', 'Nhập JSON': 'Import JSON',
  'Xóa toàn bộ dữ liệu': 'Delete all data', 'Giao diện': 'Appearance', 'Ngôn ngữ': 'Language', 'Chế độ': 'Mode',
  'Tự động': 'Auto', 'Sáng': 'Light', 'Tối': 'Dark',
  'Đã kết nối Google Drive': 'Google Drive connected', 'Đã ngắt kết nối': 'Disconnected', 'Đã nhận dữ liệu từ cloud': 'Received data from cloud',
  'Đã tải lên cloud': 'Uploaded to cloud', 'Đã đồng bộ': 'In sync',
  'Đã lưu cài đặt': 'Settings saved', 'Đã nhập dữ liệu': 'Data imported',
  'Giao diện: theo hệ thống': 'Mode: follow system', 'Giao diện: sáng': 'Mode: light', 'Giao diện: tối': 'Mode: dark',
  'File JSON không đúng định dạng': 'Invalid JSON file', 'Chưa có Google Client ID': 'Missing Google Client ID',
  'Đã có bản mới — chạm để cập nhật': 'A new version is available — tap to update',

  // thông báo thao tác
  'Hoàn tác': 'Undo', 'Đã hoàn tác': 'Undone', 'Nhập tên': 'Enter a name',
  'Đã xóa dữ liệu trên thiết bị này': 'Data on this device deleted',
  'Dữ liệu trên máy này sẽ bị thay bằng dữ liệu trong file. Tiếp tục?': "This device's data will be replaced with the file's data. Continue?",
  'File không phải JSON hợp lệ': 'The file is not valid JSON',
  'Đã xóa toàn bộ dữ liệu trên máy này': 'All data on this device deleted',
  'Đã khôi phục giao dịch': 'Transaction restored',
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
  [/^(.+) so với tháng trước$/, '$1 vs last month'],
  [/^Để dành & đầu tư (.+)$/, 'Saved & invested $1'],
  [/^của (.+)$/, 'of $1'],
  // thời gian tương đối & đơn vị
  [/(\d+) phút trước/g, '$1 min ago'], [/(\d+) giờ trước/g, '$1 h ago'], [/(\d+) ngày trước/g, '$1 d ago'],
  [/vừa xong/g, 'just now'], [/chưa bao giờ/g, 'never'],
  [/^Tháng (\d+)\/(\d+)$/, (m, a, y) => `${MONTHS[a - 1]} ${y}`],
  [/^([\d.,]+) tháng$/, '$1 months'],
  [/^TB (\d+) tháng gần nhất$/, 'Avg of last $1 months'],
  [/^Thu (.+) · tiêu (.+)$/, 'In $1 · spent $2'],
  [/^Cập nhật (.+)$/, 'Updated $1'],
  [/%\/năm/g, '%/yr'], [/\/th$/, '/mo'],
  // thu chi
  [/^Chia thu nhập (.+) theo tỷ lệ$/, 'Splitting income $1 by ratio'],
  [/^vượt mục tiêu (.+)$/, 'above target by $1'], [/^vượt (.+)$/, 'over by $1'], [/^còn (.+)$/, '$1 left'], [/^cần thêm (.+)$/, '$1 to go'],
  [/ · hạn mức$/, ' · limit'], [/ · mục tiêu$/, ' · target'],
  [/^(\d+) khoản$/, '$1 items'],
  [/^\(tổng (\d+)%( — cần bằng 100%)?\)$/, (m, a, b) => `(total ${a}%${b ? ' — must equal 100%' : ''})`],
  [/^Tỷ lệ các hũ$/, 'Jar ratios'],
  [/^Đã lưu khoản thu (.+)$/, 'Income saved: $1'], [/^Đã lưu khoản chi (.+)$/, 'Expense saved: $1'],
  [/^Tổng tỷ lệ đang là (\d+)%, cần bằng 100%$/, 'Ratios add up to $1%, they must equal 100%'],
  [/^(\d+) tháng$/, '$1 months'],
  // bảng sửa số dư
  [/^Sửa số dư · (.+)$/, 'Edit balance · $1'], [/^Số tiền \((\w+)\)$/, 'Amount ($1)'],
  [/^Lỗi: (.+)$/, 'Error: $1'],
  // thông báo thao tác (cụ thể trước, chung sau)
  [/^Đã xuất file (.+)$/, 'Exported $1'],
  [/^Đã cập nhật số dư (.+)$/, 'Updated balance of $1'],
  // thu chi (giao diện mới) — các câu "Đã … khoản / danh mục" phải đứng trước 3 câu chung bên dưới
  [/^Chưa có khoản nào trong tháng (\d+)\/(\d{4})$/, (m, a, y) => `No entries in ${MONTHS[a - 1]} ${y}`],
  [/^Đã tiêu (\d+)% ngân sách$/, 'Spent $1% of budget'], [/^Đã tiêu (.+) \/ (.+)$/, 'Spent $1 / $2'],
  [/^≈ (.+) mỗi ngày$/, '≈ $1 a day'], [/^đã để (.+) \/ mục tiêu (.+)$/, 'saved $1 / target $2'],
  [/Tự động hằng tháng/g, 'Recurring'],
  [/^Kỳ lương (.+)$/, 'Pay period $1'],
  [/^Còn (\d+) ngày tới lương$/, (m, n) => `${n} ${n === '1' ? 'day' : 'days'} to payday`],
  [/^Còn (\d+) ngày tới hạn$/, (m, n) => `Due in ${n} ${n === '1' ? 'day' : 'days'}`],
  [/^Tháng này bạn giữ lại được (\d+)% thu nhập\.$/, 'This month you kept $1% of your income.'],
  [/^Tháng này bạn tiêu nhiều hơn thu nhập (.+)\.$/, 'This month you spent $1 more than you earned.'],
  [/^Ngày (\d+)(?: · (Hằng tháng|Hằng năm|(\d+) tháng\/lần))?( · .+)?$/, (m, d, e, n, rest = '') =>
    `Day ${d}` + (e ? ` · ${e === 'Hằng tháng' ? 'Monthly' : e === 'Hằng năm' ? 'Yearly' : `Every ${n} months`}` : '') + rest],
  [/^Danh mục (thu|chi)$/, (m, k) => `${k === 'thu' ? 'Income' : 'Expense'} category`],
  [/^Đã xóa khoản (chi|thu|chuyển) (.+)$/, (m, k, v) => `${{ chi: 'Expense', thu: 'Income', 'chuyển': 'Transfer' }[k]} deleted: ${v}`],
  [/^Đã chuyển (.+) · (.+) → (.+)$/, 'Transferred $1 · $2 → $3'],
  [/^Đã lưu khoản tự động (.+?)(?: · đã ghi (\d+) khoản đến hôm nay)?$/, (m, name, n) =>
    `Recurring entry saved: ${name}` + (n ? ` · ${n} ${n === '1' ? 'entry' : 'entries'} logged up to today` : '')],
  [/^Đã (lưu|thêm|xóa|khôi phục) danh mục (.+)$/, (m, v, n) =>
    `Category ${{ 'lưu': 'saved', 'thêm': 'added', 'xóa': 'deleted', 'khôi phục': 'restored' }[v]}: ${n}`],
  [/^Không xóa được: còn (\d+) khoản dùng danh mục này$/, (m, n) =>
    `Can't delete: ${n} ${n === '1' ? 'entry still uses' : 'entries still use'} this category`],
  [/^Tổng (\d+)% — cần đúng 100%$/, 'Total $1% — must be exactly 100%'],
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
