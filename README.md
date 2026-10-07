# Walley

Quản lý chi tiêu theo **kỳ lương** cho người đi làm: biết còn tiêu được bao nhiêu tới ngày lương sau.

- Kỳ lương theo ngày nhận lương của bạn (vd 25 → 24 tháng sau), số tiền còn tiêu được mỗi ngày.
- Chia thu nhập vào **4 hũ** (Thiết yếu, Tiết kiệm, Đầu tư, Hưởng thụ — tỷ lệ tùy chỉnh).
- **Ví**: tiền mặt, tài khoản ngân hàng, ví điện tử, **thẻ tín dụng** (nhắc ngày đến hạn), chuyển tiền giữa các ví.
- Khoản tự động hằng tháng (lương, hóa đơn…), báo cáo theo kỳ.
- Tiếng Việt / English, VND / USD, sáng / tối.
- Cài như app (PWA), mở được khi mất mạng. Dữ liệu chỉ nằm trên máy; **sao lưu Google Drive** tùy chọn.

Không có máy chủ, không cần build: HTML + ES modules thuần, deploy tĩnh trên Vercel.

## Chạy trên máy

Cần Node ≥ 18 (không có dependency nào).

```sh
npm run dev    # http://localhost:3000 (áp dụng header CSP như khi deploy)
npm test       # node --test
```

Service worker chỉ chạy trên https nên không hoạt động ở localhost — `tests/sw.test.js` kiểm tra nó trong môi trường giả lập.

## Deploy lên Vercel

1. Import repo vào Vercel, Framework preset: **Other**, để trống Build Command / Output Directory.
2. Deploy. Header bảo mật (CSP…) nằm trong `vercel.json`, không cần cấu hình thêm.
3. Bump `VERSION` in `sw.js` on each deploy that changes JS/CSS (tăng `VERSION` mỗi lần deploy có đổi JS/CSS) — nếu không, máy đã mở app có thể chạy module cũ.

## Bật sao lưu Google Drive

App vẫn chạy đầy đủ khi chưa bật — chỉ ẩn phần sao lưu Google.

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo project mới (vd `walley`).
2. **APIs & Services → Library** → tìm **Google Drive API** → **Enable**.
3. **OAuth consent screen** (Google Auth Platform):
   - User type: **External**.
   - Tên app, email hỗ trợ, logo (`icons/icon-512.png`).
   - App home page: `https://<domain-cua-ban>/`; Privacy policy: `https://<domain-cua-ban>/privacy.html`.
   - Authorized domains: domain gốc của bạn (vd app ở `walley.example.com` → `example.com`). Lưu ý: `vercel.app` là domain dùng chung nên thường không xác minh được — muốn verify thì dùng domain riêng.
   - Scopes: thêm `https://www.googleapis.com/auth/drive.appdata`.
   - Trước khi verify, thêm email của bạn vào **Test users**.
4. **Credentials → Create credentials → OAuth client ID** → Application type **Web application**:
   - Authorized JavaScript origins: `https://<domain-cua-ban>` (thêm `http://localhost:3000` để thử trên máy).
   - Không cần Redirect URI.
5. Dán Client ID vào `js/config.js`:
   ```js
   export const GOOGLE_CLIENT_ID = '1234-abc.apps.googleusercontent.com';
   ```
   (Client ID là thông tin công khai, commit được.)
6. Commit + deploy.
7. Trước khi gửi xác minh: điền email liên hệ trong `privacy.html` (chỗ `<!-- CONTACT_EMAIL -->`).
8. OAuth consent screen → **Publish app** → gửi **brand verification**. `drive.appdata` là scope *non-sensitive* nên chỉ cần xác minh thương hiệu (tên, logo, domain), không phải security assessment.

## Cấu trúc

```
index.html             trang app (mọi thứ render bằng JS)
privacy.html           chính sách quyền riêng tư (vi + en)
manifest.webmanifest   cấu hình PWA
sw.js                  service worker: cache app shell + Chart.js (stale-while-revalidate)
vercel.json            header bảo mật (CSP…)
icons/                 icon.svg (gốc) + PNG 192 / 512 (maskable) / apple-touch 180
css/style.css          toàn bộ giao diện, biến màu sáng / tối
js/app.js              khởi động, điều hướng tab, đăng ký service worker
js/boot.js             áp theme + ngôn ngữ trước khi vẽ trang
js/store.js, idb.js    trạng thái app, lưu IndexedDB
js/period.js           tính kỳ lương
js/budget.js           hũ, ngân sách, khoản tự động
js/wallets.js          ví, số dư, thẻ tín dụng
js/money.js            định dạng tiền VND / USD
js/backup.js           sao lưu Google Drive (appDataFolder)
js/config.js           Google Client ID
js/i18n.js             từ điển vi → en
js/charts.js, icons.js, sheet.js, util.js   biểu đồ, icon, bảng trượt, tiện ích
js/views/              các màn: home, entry, report, wallets, settings, onboarding
scripts/dev.js         dev server tĩnh
tests/                 test node:test
docs/superpowers/      đặc tả thiết kế và kế hoạch
```

## Mô hình dữ liệu

Toàn bộ dữ liệu là một object JSON (ví, danh mục, hũ, giao dịch, khoản tự động, cài đặt) lưu trong IndexedDB và sao lưu nguyên khối thành một file trong Drive. Chi tiết: [`docs/superpowers/specs/2026-10-07-walley-dot-1-design.md`](docs/superpowers/specs/2026-10-07-walley-dot-1-design.md).

## Lộ trình

- **Giai đoạn 1** (hiện tại): kỳ lương, 4 hũ, ví + thẻ tín dụng, báo cáo, sao lưu Google Drive, PWA.
- **Giai đoạn 2**: khoản vay / cho vay, trả góp.
- **Giai đoạn 3**: mục tiêu tiết kiệm.
