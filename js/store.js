import { idbGet, idbSet } from './idb.js';
import { defaultData } from './budget.js';

// `state` = dữ liệu người dùng (lưu IndexedDB, sao lưu Google Drive, xuất / nhập file).

export const state = defaultData();
const listeners = new Set();

/** Ghép dữ liệu đọc được lên bộ mặc định: thiếu trường thì thêm, có rồi giữ nguyên. */
export function normalize(obj) {
  const d = { ...defaultData(), ...(obj || {}) };
  for (const k of ['jars', 'categories', 'recurring', 'wallets', 'txs']) if (!Array.isArray(d[k])) d[k] = defaultData()[k];
  if (!d.deleted || typeof d.deleted !== 'object') d.deleted = {};
  d.payday = Math.min(31, Math.max(1, Math.trunc(Number(d.payday)) || 1));
  d.currency = d.currency === 'USD' ? 'USD' : 'VND';
  return d;
}

export const serialize = (d) => JSON.stringify({ app: 'walley', exportedAt: Date.now(), data: d });

export function parseBackup(text) {
  const obj = JSON.parse(text);
  if (obj?.app !== 'walley' || !obj.data) throw new Error('File không đúng định dạng của Walley');
  return normalize(obj.data);
}

export function replaceState(obj) {
  const d = normalize(obj);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, d);
  persist();
}

export let storageOk = true;

export async function loadState() {
  try {
    const saved = await idbGet('data');
    replaceState(saved || defaultData());
  } catch {
    storageOk = false; // chế độ riêng tư / trình duyệt chặn IndexedDB: app vẫn chạy, nhưng không lưu
    replaceState(defaultData());
  }
}

let timer;
function persist() {
  if (!storageOk) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    idbSet('data', JSON.parse(JSON.stringify(state))).catch(() => {
      storageOk = false;
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('wl:save-failed'));
    });
  }, 200);
}

/** Gọi sau mỗi thay đổi. config = đổi cấu hình (ví, hũ, danh mục, ngày lương…) → gộp giữa các máy theo lần sửa sau cùng. */
export function commit({ config = false } = {}) {
  if (config) state.configAt = Date.now();
  persist();
  listeners.forEach((fn) => fn());
}

export const onCommit = (fn) => listeners.add(fn);
