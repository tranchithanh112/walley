// Service worker: mở app tức thì từ bản đã lưu (stale-while-revalidate), đồng thời tải bản mới ở nền
// cho lần mở sau. Chỉ cache file cùng domain + thư viện CDN — không bao giờ cache Google (đăng nhập, Drive).
// Tăng VERSION mỗi lần deploy có đổi JS/CSS → cache cũ bị dọn, không còn module cũ lẫn với trang mới.
const VERSION = '2';
const CACHE = `walley-shell-v${VERSION}`;
// Thư viện bên ngoài (Chart.js) cũng được lưu để mở app không phải chờ mạng.
// Lưu ý: SW tự fetch nên domain phải có trong connect-src của CSP.
const CDN = ['https://cdn.jsdelivr.net/'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); // dọn cache bản cũ
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !CDN.some((p) => req.url.startsWith(p))) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Trang (navigate): bỏ query để luôn dùng chung 1 bản đã lưu; giữ đường dẫn để privacy.html không bị thay bằng trang chính
    const key = req.mode === 'navigate' ? new Request(url.origin + url.pathname) : req;
    const cached = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
    // Chỉ trang chính ('/' hoặc '/index.html') mới so sánh để báo bản mới — privacy.html đổi không cần tải lại app
    const mainPage = req.mode === 'navigate' && /\/(index\.html)?$/.test(url.pathname);
    const before = mainPage && cached ? cached.clone() : null; // để so sánh, vì `cached` sẽ trả cho trang
    const network = fetch(req)
      .then(async (res) => {
        if (res.ok || res.type === 'opaque') {
          // Trang chính đổi nội dung → báo app có bản mới (hiện nút tải lại)
          if (before && res.ok) {
            const [a, b] = await Promise.all([before.text(), res.clone().text()]);
            if (a !== b) (await self.clients.matchAll()).forEach((c) => c.postMessage('update-ready'));
          }
          await cache.put(key, res.clone());
        }
        return res;
      })
      .catch(() => null);
    if (cached) {
      e.waitUntil(network); // cập nhật nền
      return cached;
    }
    const res = await network;
    if (res) return res;
    // Mất mạng: chỉ trang chính mới dùng bản đã lưu — không bao giờ trả HTML thay cho script
    return (req.mode === 'navigate' && (await cache.match('./'))) || Response.error();
  })());
});
