import { tr } from './i18n.js';
import { icon } from './icons.js';

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const TOAST_ICON = { ok: 'check', error: 'alert', info: 'info' };

/**
 * Thông báo nhỏ. Tham số 3: số ms, hoặc { ms, action: { label, run } } — vd nút "Hoàn tác".
 * Lỗi hiện lâu hơn và được đọc ngay (role="alert"). Chạm để tắt; tối đa 3 cái cùng lúc.
 */
export function toast(msg, type = 'info', opts = {}) {
  const { ms, action } = typeof opts === 'number' ? { ms: opts } : opts;
  // Bảng (dialog.showModal) nằm trên mọi lớp khác → khi đang mở bảng, hiện thông báo ngay trong bảng
  const box = document.querySelector('dialog[open] .sheet-toasts') || document.getElementById('toasts');
  while (box.children.length >= 3) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = icon(TOAST_ICON[type] || 'info');
  const text = document.createElement('span');
  text.className = 'toast-msg';
  text.textContent = tr(msg);
  el.append(text);
  let timer;
  const close = () => { clearTimeout(timer); el.remove(); };
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = tr(action.label);
    btn.onclick = (e) => { e.stopPropagation(); close(); action.run(); };
    el.append(btn);
  }
  el.onclick = close;
  box.appendChild(el);
  timer = setTimeout(close, ms ?? (action ? 6000 : type === 'error' ? 7000 : 4000));
  return el;
}

export function downloadFile(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
