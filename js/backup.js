import { mergeBudget } from './budget.js';
import { state, replaceState, serialize, parseBackup } from './store.js';
import { GOOGLE_CLIENT_ID } from './config.js';

// Sao lưu 1 file walley.json vào thư mục ẩn của app trên Google Drive (scope drive.appdata).
// Token giữ trong sessionStorage (≈ 1 giờ); hết hạn thì xin lại im lặng, thất bại → người dùng bấm "Sao lưu ngay".

const FILE = 'walley.json';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const LS = 'wl.google'; // { connected, fileId, last }

const loc = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
const saveLoc = (o) => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch { /* bỏ qua */ } };

export const configured = () => Boolean(GOOGLE_CLIENT_ID);
export const connected = () => Boolean(loc().connected);
export const lastBackup = () => loc().last || 0;

/** JSON.stringify không phụ thuộc thứ tự khóa. */
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

const withTimeout = (p, ms, msg) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(msg)), ms);
  p.then(resolve, reject).finally(() => clearTimeout(t));
});

/**
 * Gộp dữ liệu máy này với bản trên Drive; cho biết bên nào cần ghi lại.
 * firstSync: máy chưa từng đồng bộ → cấu hình trên Drive thắng (khôi phục), giao dịch vẫn hợp nhất.
 */
export function reconcile(local, remote, { firstSync = false } = {}) {
  const base = JSON.parse(JSON.stringify(local));
  if (firstSync && remote) base.configAt = -1; // ponytail: -1 để cấu hình remote thắng cả khi configAt hòa
  const merged = mergeBudget(base, remote);
  const text = stable(merged);
  return { merged, localChanged: text !== stable(local), remoteChanged: !remote || text !== stable(remote) };
}

let gis;
function loadGis() {
  gis ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Không tải được Google — kiểm tra mạng'));
    document.head.appendChild(s);
  });
  return withTimeout(gis, 20000, 'Không tải được Google — kiểm tra mạng').catch((e) => { gis = null; throw e; });
}

const session = () => { try { return JSON.parse(sessionStorage.getItem('wl.gtoken') || 'null'); } catch { return null; } };

/** interactive = true: người dùng vừa bấm nút (được mở popup đồng ý). */
export async function connect(interactive = true) {
  if (!configured()) throw new Error('App chưa được cấu hình Google');
  await loadGis();
  await withTimeout(new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error) return reject(new Error(r.error_description || r.error));
        if (!window.google.accounts.oauth2.hasGrantedAllScopes?.(r, SCOPE)) return reject(new Error('Cần cho phép Walley lưu vào Google Drive để sao lưu'));
        sessionStorage.setItem('wl.gtoken', JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in - 60) * 1000 }));
        resolve();
      },
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Đã đóng cửa sổ Google' : 'Không kết nối được Google')),
    });
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  }), 120000, 'Hết thời gian chờ Google — thử lại');
  saveLoc({ ...loc(), connected: true });
}

export function disconnect() {
  const t = session();
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t.token, () => {});
  sessionStorage.removeItem('wl.gtoken');
  saveLoc({ last: loc().last });
}

async function token() {
  const s = session();
  if (s && s.exp > Date.now()) return s.token;
  await connect(false);
  return session().token;
}

async function api(url, { allow404, ...opts } = {}) {
  const r = await fetch(url, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${await token()}` } });
  if (r.status === 401) { sessionStorage.removeItem('wl.gtoken'); throw new Error('Phiên Google đã hết hạn — bấm Sao lưu ngay'); }
  if (allow404 && r.status === 404) return null;
  if (!r.ok) throw new Error(`Google Drive lỗi ${r.status}`);
  return r;
}

async function fileId() {
  const l = loc();
  if (l.fileId) return l.fileId;
  const q = encodeURIComponent(`name='${FILE}'`);
  const r = await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)&orderBy=createdTime`);
  const id = (await r.json()).files?.[0]?.id || null;
  if (id) saveLoc({ ...loc(), fileId: id });
  return id;
}

async function download() {
  const id = await fileId();
  if (!id) return null;
  const r = await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { allow404: true });
  if (!r) { saveLoc({ ...loc(), fileId: null }); return null; } // file đã bị xóa → lần upload sau tạo mới
  return r.text();
}

async function upload(text) {
  const id = await fileId();
  if (id) {
    await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: text,
    }).catch((e) => { saveLoc({ ...loc(), fileId: null }); throw e; });
    return;
  }
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name: FILE, parents: ['appDataFolder'] })], { type: 'application/json' }));
  form.append('file', new Blob([text], { type: 'application/json' }));
  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', body: form });
  saveLoc({ ...loc(), fileId: (await r.json()).id });
}

let queue = Promise.resolve();
/**
 * Tải bản trên Drive, gộp với máy này, ghi lại bên nào thiếu. Xếp hàng, không chạy chồng.
 * interactive = true chỉ khi người dùng vừa bấm nút. Trả về 'off' | 'login' | 'pulled' | 'pushed' | 'same'.
 */
export function syncNow(interactive = false) {
  const go = () => doSync(interactive);
  const run = queue.then(go, go);
  queue = run.catch(() => {});
  return run;
}

async function doSync(interactive) {
  if (!connected()) return 'off';
  const s = session();
  if (!interactive && !(s && s.exp > Date.now())) return 'login';
  const firstSync = !loc().last;
  const text = await download();
  const remote = text ? parseBackup(text) : null;
  const { merged, localChanged, remoteChanged } = reconcile(state, remote, { firstSync });
  if (localChanged) replaceState(merged);
  if (remoteChanged) await upload(serialize(merged));
  saveLoc({ ...loc(), last: Date.now() });
  return localChanged ? 'pulled' : remoteChanged ? 'pushed' : 'same';
}
