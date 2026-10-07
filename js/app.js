import { state, loadState, commit, onCommit, storageOk } from './store.js';
import { generateRecurring, localToday } from './budget.js';
import { setMoney } from './money.js';
import { getLang, translateDom, setLang } from './i18n.js';
import { icon } from './icons.js';
import { toast, showFlash } from './util.js';
import * as backup from './backup.js';
import { renderHome, openNewEntry } from './views/home.js';
import { renderReport } from './views/report.js';
import { renderWallets } from './views/wallets.js';
import { renderSettings } from './views/settings.js';
import { renderOnboarding } from './views/onboarding.js';

const TABS = [
  ['home', 'Trang chủ', 'home'],
  ['report', 'Báo cáo', 'chart'],
  ['wallets', 'Ví', 'wallet'],
  ['settings', 'Cài đặt', 'gear'],
];
const VIEWS = {}; // id → (root, ctx) => void
let onboarding = null; // (root, ctx) => void
let tab = TABS.some(([id]) => id === location.hash.slice(1)) ? location.hash.slice(1) : 'home';

export const ctx = { rerender: () => render(), go: (t) => go(t) };
export const registerView = (id, fn) => { VIEWS[id] = fn; };
export const registerOnboarding = (fn) => { onboarding = fn; };
registerView('home', renderHome);
registerView('report', renderReport);
registerView('wallets', renderWallets);
registerView('settings', renderSettings);
registerOnboarding(renderOnboarding);

function go(t) {
  tab = t;
  history.replaceState(null, '', '#' + t);
  render();
  window.scrollTo(0, 0);
}

function render() {
  setMoney({ currency: state.currency, lang: getLang() });
  const root = document.getElementById('view');
  const nav = document.getElementById('nav');
  const fab = document.getElementById('fab');
  const first = !state.onboarded && onboarding;
  nav.hidden = fab.hidden = Boolean(first);
  if (first) onboarding(root, ctx);
  else (VIEWS[tab] || ((r) => { r.innerHTML = '<p>Walley</p>'; }))(root, ctx);
  nav.innerHTML = TABS.map(([id, label, ic]) =>
    `<button type="button" data-tab="${id}" class="${id === tab ? 'on' : ''}" aria-current="${id === tab ? 'page' : 'false'}">${icon(ic)}<span>${label}</span></button>`).join('');
  nav.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => go(b.dataset.tab); });
  translateDom(document.body);
}

let backupTimer;
function scheduleBackup() {
  if (!backup.connected()) return;
  clearTimeout(backupTimer);
  backupTimer = setTimeout(autoSync, 3000);
}

// Phiên Google hết hạn: hiện thanh nhắc; bấm "Đăng nhập" (thao tác người dùng → popup Google được phép mở).
function showLogin(on) {
  const b = document.getElementById('login-banner');
  b.hidden = !on;
  if (!on) return;
  b.innerHTML = '<span>Cần đăng nhập lại Google để sao lưu</span><button type="button" class="btn">Đăng nhập</button>';
  b.querySelector('button').onclick = () => backup.syncNow(true).then(() => { showLogin(false); render(); }, (e) => toast(e.message, 'error'));
  translateDom(b);
}

// Sao lưu nền thất bại: hiện "Chưa sao lưu" (spec §6/§7); ẩn khi lần sau thành công.
function showSyncError(on) {
  const b = document.getElementById('login-banner');
  b.hidden = !on;
  if (!on) return;
  b.innerHTML = navigator.onLine
    ? '<span>Chưa sao lưu được lên Google Drive</span><button type="button" class="btn">Thử lại</button>'
    : '<span>Chưa sao lưu — sẽ thử lại khi có mạng</span>';
  const btn = b.querySelector('button');
  if (btn) btn.onclick = () => backup.syncNow(true).then((r) => { showSyncError(false); if (r === 'pulled') render(); }, (e) => toast(e.message, 'error'));
  translateDom(b);
}

async function autoSync() {
  if (!backup.connected()) return;
  try {
    const r = await backup.syncNow();
    if (r === 'login') showLogin(true); else showSyncError(false);
    if (r === 'pulled') {
      if (generateRecurring(state, localToday())) commit(); // dữ liệu kéo về có thể có khoản tự động mới
      render();
    }
  } catch (e) {
    console.warn('Walley auto-sync:', e);
    showSyncError(true);
  }
}

async function init() {
  setLang(getLang());
  await loadState();
  if (!storageOk) {
    const b = document.getElementById('banner');
    b.hidden = false;
    b.textContent = 'Trình duyệt đang chặn lưu dữ liệu (chế độ riêng tư?) — dữ liệu sẽ mất khi đóng app.';
  }
  window.addEventListener('wl:save-failed', () => toast('Không lưu được dữ liệu trên máy — bộ nhớ đầy?', 'error'));
  if (generateRecurring(state, localToday())) commit();
  document.getElementById('fab').innerHTML = icon('plus');
  document.getElementById('fab').onclick = () => openNewEntry(ctx);
  onCommit(scheduleBackup);
  render();
  showFlash();
  autoSync();
  window.addEventListener('online', scheduleBackup);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (generateRecurring(state, localToday())) { commit(); render(); } // app mở qua ngày mới
    autoSync();
  });
}

init();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // App mở từ bản đã lưu; khi có bản mới thì báo để tải lại
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data === 'update-ready') toast('Có bản mới — tải lại để cập nhật', 'info', { ms: 15000, action: { label: 'Tải lại', run: () => location.reload() } });
  });
}
