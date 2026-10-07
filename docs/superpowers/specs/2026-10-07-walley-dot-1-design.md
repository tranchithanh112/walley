# Walley — Đợt 1: Ví + Thu chi theo kỳ lương + Sao lưu Google

**Ngày:** 2026-10-07
**Trạng thái:** Đã duyệt thiết kế, chờ review spec

## 1. Mục tiêu

App quản lý chi tiêu phổ thông cho **người đi làm có lương**, người lạ dùng được, không cần kiến thức tài chính.
Tách từ phần Thu chi của repo `ifinance` (bản cá nhân có crypto / chứng khoán).

Lộ trình:
- **Đợt 1 (spec này):** ví (gồm thẻ tín dụng), thu chi theo kỳ lương, 4 hũ, sao lưu Google Drive, Việt / Anh, PWA.
- Đợt 2: cho vay / đi vay (spec riêng).
- Đợt 3: mục tiêu tiết kiệm (spec riêng).

Ngoài phạm vi đợt 1: crypto, chứng khoán, server / API riêng, nhiều tiền tệ cùng lúc, thông báo đẩy, chia sẻ sổ nhiều người.

## 2. Kiến trúc

- HTML + ES modules thuần, **không bước build**. Test bằng `node --test`.
- Deploy tĩnh lên **Vercel**. Không có thư mục `api/`, không biến môi trường bí mật.
- **PWA:** `manifest.webmanifest` + `sw.js` (cache app shell, mở offline, "Thêm vào Màn hình chính").
- Dữ liệu: 1 object trong **IndexedDB**, sao lưu thành 1 file JSON trên Google Drive.
- Cách dựng: **copy có chọn lọc từ `ifinance`** rồi dọn phần đầu tư, sau đó thêm phần mới.

```
index.html, manifest.webmanifest, sw.js, privacy.html
css/style.css            1 theme, sáng / tối / tự động
js/app.js                điều hướng tab, khởi động
js/store.js              đọc / ghi state, autosave
js/idb.js                (từ ifinance)
js/i18n.js               (từ ifinance) vi + en
js/util.js               (từ ifinance) esc, toast, định dạng
js/sheet.js              (từ ifinance) bảng trượt <dialog>
js/budget.js             (từ ifinance) hũ, danh mục, khoản định kỳ, mergeBudget
js/period.js             MỚI — kỳ lương
js/wallets.js            MỚI — số dư ví, chuyển tiền, thẻ tín dụng
js/money.js              MỚI — định dạng / nhập tiền theo VND hoặc USD
js/backup.js             MỚI — Google Drive appDataFolder (dựa trên phần Google của sync.js)
js/views/onboarding.js   MỚI
js/views/home.js         (từ budget.js view, đổi sang kỳ lương)
js/views/entry.js        (từ budget-entry.js, thêm Chuyển)
js/views/report.js       (từ budget-report.js, theo kỳ lương)
js/views/wallets.js      MỚI
js/views/settings.js     MỚI (gọn)
tests/*.test.js
```

Bỏ khi copy: Binance, futures, PnL, chứng khoán, Fmarket, `api/`, mật khẩu app / session, TOTP, Dropbox, theme phụ, điểm sức khỏe tài chính, danh mục "Nạp crypto" / "Mua CK / quỹ" / "Lãi đầu tư".

## 3. Dữ liệu

```js
{
  version: 1,
  currency: 'VND' | 'USD',   // mặc định: VND nếu ngôn ngữ trình duyệt là vi, ngược lại USD
  payday: 1..31,             // ngày nhận lương, mặc định 1
  jars: [{ id, name, pct }],                 // nec 50, save 20, invest 10, play 20 (như ifinance)
  categories: [{ id, name, icon, type, jar }],
  recurring: [{ id, type, amount, cat, wallet, note, day, every, startMonth, active }],
  wallets: [{
    id, name,
    type: 'cash' | 'bank' | 'ewallet' | 'credit',
    amount, anchorAt, anchorDate,            // số dư chốt (cơ chế anchor của ifinance)
    dueDay,                                   // chỉ với credit: ngày đến hạn thanh toán 1..31
    hidden,                                   // ví đã ẩn (không xóa được ví còn giao dịch)
  }],
  txs: [{
    id, date: 'YYYY-MM-DD',
    type: 'expense' | 'income' | 'transfer',
    amount,                                   // > 0, theo `currency`; USD làm tròn 2 số lẻ
    cat,                                      // expense / income
    wallet,                                   // ví nguồn (expense, transfer) hoặc ví nhận (income)
    to,                                       // chỉ transfer: ví nhận
    note, at, u,                              // at = lúc tạo, u = lúc sửa gần nhất
  }],
  deleted: { [txId]: ms },
  configAt: ms,
  onboarded: boolean,
}
```

Quy tắc:
- Ngôn ngữ và sáng / tối là lựa chọn **riêng từng máy** (localStorage), không nằm trong dữ liệu sao lưu.
- Khoản định kỳ chọn ngày 1–31; tháng ngắn hơn → ngày cuối tháng.
- `transfer` trừ ví `wallet`, cộng ví `to`; **không** tính thu / chi, **không** vào hũ, **không** vào báo cáo.
- Ví `credit` có số dư âm = đang nợ. Chi bằng thẻ là `expense` bình thường (tính vào hũ ngày tiêu). Trả sao kê = `transfer` ngân hàng → thẻ.
- Đổi `currency` khi đã có dữ liệu: **chỉ đổi nhãn, không quy đổi**, có hộp xác nhận cảnh báo.
- Gộp 2 thiết bị: `mergeBudget` của ifinance (giao dịch hợp nhất theo `id`, bản có `u` mới hơn thắng, tôn trọng `deleted`; cấu hình theo `configAt` mới hơn — cấu hình gồm cả `wallets`, `payday`, `currency`).

## 4. Cách tính

### 4.1 Kỳ lương — `period.js` (hàm thuần)
- `periodOf(date, payday) → { start, end, key }`. Ví dụ payday 10: kỳ `2026-10-10 … 2026-11-09`, `key = '2026-10'` (tháng chứa `start`).
- Tháng không có ngày `payday` (vd 31 trong tháng 2) → ngày cuối tháng đó.
- `shiftPeriod(key, n, payday)`, `daysLeft(period, today)` (tính cả hôm nay).
- `payday = 1` ≡ tháng dương lịch.
- Đổi `payday` chỉ đổi cách nhóm hiển thị; giao dịch lưu theo ngày nên không phải sửa dữ liệu.

### 4.2 Hũ trong kỳ
- Thu nhập kỳ = tổng `income` có `date` trong kỳ.
- Nếu kỳ chưa có thu → dùng **lương dự kiến** = tổng khoản định kỳ `income` đang bật, kèm nhãn "ước tính".
- Hạn mức hũ = thu nhập kỳ × `pct / 100`. Đã dùng = tổng `expense` trong kỳ có danh mục thuộc hũ.
- **Còn tiêu được** = Σ(hạn mức − đã dùng) của hũ Thiết yếu + Hưởng thụ. **Mỗi ngày** = còn tiêu được / `daysLeft` (không âm).
- Khoản định kỳ sinh theo `day` riêng của từng khoản (như ifinance). Khoản "Lương" tạo ở onboarding có `day = payday`.

### 4.3 Ví — `wallets.js`
- Số dư = `amount` (chốt) + Σ thu − Σ chi − Σ chuyển đi + Σ chuyển đến, chỉ các giao dịch sau mốc chốt (`afterAnchor` của ifinance).
- Tổng tài sản = Σ số dư mọi ví (thẻ âm tự trừ).
- **Nhắc thẻ tín dụng:** thẻ có số dư < 0 và còn ≤ 5 ngày tới `dueDay` kế tiếp (ngày 31 → cuối tháng). Bấm nhắc → mở bảng Chuyển, điền sẵn: từ ví ngân hàng đầu tiên → thẻ, số tiền = |số dư thẻ|.

### 4.4 Tiền — `money.js`
- VND: không số lẻ, `1.250.000 ₫` (vi) / `₫1,250,000` (en); bàn phím nhập có nút `000`.
- USD: 2 số lẻ, `$1,250.00`; bàn phím có nút dấu thập phân và `000`.
- Dùng `Intl.NumberFormat` theo `lang` + `currency`.

## 5. Màn hình

**Onboarding** (lần đầu, mỗi bước có "Bỏ qua"):
1. Ngôn ngữ + đơn vị tiền.
2. Ngày nhận lương + mức lương → tạo khoản định kỳ "Lương".
3. Ví: có sẵn "Tiền mặt"; thêm ngân hàng / ví điện tử / thẻ tín dụng, nhập số dư hiện tại (thẻ: số đang nợ + ngày đến hạn).
4. Tỷ lệ 4 hũ (mặc định 50 / 20 / 10 / 20).

**Tab dưới:** Trang chủ · Báo cáo · Ví · Cài đặt. **Nút +** nổi.

| Màn | Nội dung |
|---|---|
| Trang chủ | Thẻ "Còn tiêu được kỳ này" + mỗi ngày + "còn X ngày tới lương"; thanh tiến độ 4 hũ; nhắc thẻ tín dụng; giao dịch kỳ này nhóm theo ngày; chuyển kỳ trước / sau |
| Nút + | Bảng nhập (số tiền trên cùng, lưới danh mục). Chế độ **Chi · Thu · Chuyển**; Chuyển hiện "Từ ví → Đến ví" thay danh mục. Bấm giao dịch để sửa, xóa có Hoàn tác |
| Báo cáo | Theo kỳ lương: tiêu vào đâu (theo danh mục / hũ), để dành bao nhiêu, 6 kỳ gần nhất |
| Ví | Danh sách ví + số dư, tổng tài sản; bấm ví → giao dịch của ví, chốt số dư, sửa ví; ví còn giao dịch chỉ ẩn được, không xóa |
| Cài đặt | Ngày lương, hũ, danh mục, khoản định kỳ, ngôn ngữ, tiền tệ, sáng / tối, Google sao lưu, xuất / nhập file JSON |

Giữ từ ifinance: hệ thống toast thành công / lỗi, Hoàn tác khi xóa, bảng trượt bám `visualViewport` (không bị bàn phím iOS che).

## 6. Sao lưu Google

- **Google Identity Services** (token client), scope `https://www.googleapis.com/auth/drive.appdata` — file `walley.json` trong thư mục ẩn của app.
- Không bắt đăng nhập; app chạy đầy đủ không cần Google.
- Token giữ trong `sessionStorage` (≈ 1 giờ, không lưu lâu dài); hết hạn → xin lại im lặng (`prompt: ''`). Trình duyệt có thể chặn cửa sổ Google khi không có thao tác bấm → sao lưu tạm dừng tới khi người dùng bấm "Sao lưu ngay" (giới hạn của mô hình không có server).
- **Tự sao lưu:** debounce 3 giây sau thay đổi; luôn tải bản trên Drive → `mergeBudget` → ghi.
- Mở app / quay lại tab: tải và gộp nếu đã kết nối.
- Mất mạng / lỗi: dữ liệu vẫn trên máy, hiện "Chưa sao lưu", thử lại khi `online`.
- Máy mới: kết nối Google → có file → khôi phục (gộp với dữ liệu onboarding nếu có).

**Việc ngoài code (chủ app tự làm):** domain riêng; `privacy.html` (vi + en); OAuth consent screen + gửi xác minh thương hiệu trên Google Cloud Console; thêm domain vào Authorized JavaScript origins. `drive.appdata` không thuộc nhóm nhạy cảm → không cần thẩm định bảo mật.

## 7. Lỗi

- Mọi thao tác ghi dữ liệu / mạng báo thành công hoặc lỗi bằng toast (như ifinance).
- File nhập không hợp lệ → báo lỗi, không ghi đè.
- IndexedDB không dùng được (chế độ riêng tư) → banner cảnh báo dữ liệu không được lưu.

## 8. Kiểm thử (`node --test`)

- `period.js`: payday 1 / 10 / 31, tháng 2 năm nhuận / không nhuận, kỳ vắt qua năm, `daysLeft`.
- `wallets.js`: thu / chi / chuyển, thẻ âm, chốt số dư, nhắc đến hạn (ngày 31, vắt tháng).
- Hũ theo kỳ: có thu, chưa có thu (ước tính), transfer không vào hũ.
- `money.js`: định dạng + nhập VND / USD.
- `mergeBudget` với ví + transfer.
- Mang theo test liên quan từ ifinance (`budget.test.js`, `i18n.test.js`).
