// Ví: tiền mặt, ngân hàng, ví điện tử, thẻ tín dụng (số dư âm = đang nợ).
// amount là số dư "chốt" lần gần nhất; số dư hiện tại = chốt + các giao dịch ghi SAU mốc chốt.
import { localToday } from './budget.js';

export const WALLET_TYPES = [
  ['cash', 'Tiền mặt', '💵'],
  ['bank', 'Ngân hàng', '🏦'],
  ['ewallet', 'Ví điện tử', '📲'],
  ['credit', 'Thẻ tín dụng', '💳'],
];
export const walletIcon = (type) => WALLET_TYPES.find((t) => t[0] === type)?.[2] || '👛';

function afterAnchor(t, w) {
  if (!w.anchorDate) return false;
  // at = lúc ghi lần đầu (u đổi mỗi lần sửa → không dùng, kẻo sửa xong bị trừ lần nữa)
  return t.date > w.anchorDate || (t.date === w.anchorDate && (t.at ?? t.u ?? 0) > (w.anchorAt || 0));
}

export function walletBalance(w, txs) {
  let delta = 0;
  let count = 0;
  for (const t of txs || []) {
    if (!afterAnchor(t, w)) continue;
    const a = Number(t.amount) || 0;
    let d = 0;
    if (t.type === 'transfer') {
      if (t.wallet === w.id) d -= a;
      if (t.to === w.id) d += a;
    } else if (t.wallet === w.id) {
      d = t.type === 'income' ? a : -a;
    }
    if (d) { delta += d; count++; }
  }
  return { balance: (Number(w.amount) || 0) + delta, delta, count };
}

/** Chốt số dư mới (người dùng vừa đối chiếu với ngân hàng). */
export function setAnchor(w, amount, now = Date.now(), today = localToday()) {
  w.amount = amount;
  w.anchorAt = now;
  w.anchorDate = today;
}

export const netWorth = (wallets, txs) => wallets.reduce((a, w) => a + walletBalance(w, txs).balance, 0);

/** Ngày đến hạn thanh toán kế tiếp tính từ hôm nay (gồm cả hôm nay). */
export function nextDue(dueDay, today) {
  const at = (y, m) => {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(dueDay, last)).padStart(2, '0')}`;
  };
  const [y, m] = today.split('-').map(Number);
  const cur = at(y, m);
  return cur >= today ? cur : m === 12 ? at(y + 1, 1) : at(y, m + 1);
}

/** Thẻ tín dụng đang nợ và sắp tới hạn (≤ within ngày). */
export function dueReminders(wallets, txs, today, within = 5) {
  const out = [];
  for (const w of wallets) {
    if (w.type !== 'credit' || !w.dueDay || w.hidden) continue;
    const { balance } = walletBalance(w, txs);
    if (balance >= 0) continue;
    const due = nextDue(Number(w.dueDay), today);
    const days = Math.round((Date.parse(due) - Date.parse(today)) / 864e5);
    if (days <= within) out.push({ wallet: w, owed: -balance, due, days });
  }
  return out;
}

/** Số giao dịch + khoản định kỳ đang dùng ví (ví còn dùng thì chỉ ẩn được, không xóa). */
export function walletUsage(b, id) {
  return b.txs.filter((t) => t.wallet === id || t.to === id).length + b.recurring.filter((r) => r.wallet === id).length;
}
