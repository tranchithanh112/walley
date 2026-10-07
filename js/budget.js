import { inPeriod, daysLeft } from './period.js';

// Dữ liệu thu chi + cách chia "hũ" (4 hũ). Số tiền theo `currency` của dữ liệu.

export const DEFAULT_JARS = [
  { id: 'nec', name: 'Thiết yếu', pct: 50, color: '#4f7cff' },
  { id: 'save', name: 'Tiết kiệm', pct: 20, color: '#17c3a5' },
  { id: 'invest', name: 'Đầu tư', pct: 10, color: '#a162f7' },
  { id: 'play', name: 'Hưởng thụ', pct: 20, color: '#f5a524' },
];

// Hũ "tiêu dùng" (tiền thực sự mất đi). Tiết kiệm & Đầu tư là tiền để dành.
export const SPEND_JARS = new Set(['nec', 'play']);

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Ăn uống', icon: '🍜', type: 'expense', jar: 'nec' },
  { id: 'transport', name: 'Di chuyển', icon: '🛵', type: 'expense', jar: 'nec' },
  { id: 'rent', name: 'Tiền nhà', icon: '🏠', type: 'expense', jar: 'nec' },
  { id: 'bills', name: 'Hóa đơn & điện thoại', icon: '📱', type: 'expense', jar: 'nec' },
  { id: 'health', name: 'Sức khỏe', icon: '💊', type: 'expense', jar: 'nec' },
  { id: 'family', name: 'Gửi gia đình', icon: '👪', type: 'expense', jar: 'nec' },
  { id: 'debtpay', name: 'Trả nợ / trả góp', icon: '💳', type: 'expense', jar: 'nec' },
  { id: 'cafe', name: 'Cafe & đi chơi', icon: '☕', type: 'expense', jar: 'play' },
  { id: 'shopping', name: 'Mua sắm', icon: '🛍️', type: 'expense', jar: 'play' },
  { id: 'travel', name: 'Du lịch', icon: '✈️', type: 'expense', jar: 'play' },
  { id: 'fun', name: 'Giải trí', icon: '🎮', type: 'expense', jar: 'play' },
  { id: 'gift', name: 'Quà tặng', icon: '🎁', type: 'expense', jar: 'play' },
  { id: 'saving', name: 'Gửi tiết kiệm', icon: '🏦', type: 'expense', jar: 'save' },
  { id: 'emergency', name: 'Quỹ dự phòng', icon: '🛟', type: 'expense', jar: 'save' },
  { id: 'invest', name: 'Đầu tư', icon: '📈', type: 'expense', jar: 'invest' },
  { id: 'salary', name: 'Lương', icon: '💼', type: 'income' },
  { id: 'bonus', name: 'Thưởng', icon: '🎉', type: 'income' },
  { id: 'side', name: 'Thu nhập phụ', icon: '💡', type: 'income' },
  { id: 'otherin', name: 'Thu khác', icon: '➕', type: 'income' },
];

export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const monthKey = (d) => String(d).slice(0, 7);
export function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** Dữ liệu mới. Tên ví mặc định theo ngôn ngữ lúc tạo (là dữ liệu người dùng, không dịch lại). */
export function defaultData({ currency = 'VND', lang = 'vi', today = localToday(), now = Date.now() } = {}) {
  return {
    version: 1,
    currency,
    payday: 1,
    jars: DEFAULT_JARS.map((j) => ({ ...j })),
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    recurring: [], // { id, type, amount, cat, wallet, note, day (1–31), every (tháng), startMonth, active }
    wallets: [{ id: 'cash', name: lang === 'en' ? 'Cash' : 'Tiền mặt', type: 'cash', amount: 0, anchorAt: now, anchorDate: today }],
    txs: [], // { id, date, type: expense|income|transfer, amount, cat, wallet, to, note, at, u }
    deleted: {},
    configAt: 0,
    onboarded: false,
  };
}

export function catMap(b) {
  return Object.fromEntries(b.categories.map((c) => [c.id, c]));
}

/** Sinh giao dịch định kỳ còn thiếu tới hôm nay. id cố định → nhiều máy cùng sinh không trùng. */
export function generateRecurring(b, today = localToday()) {
  const have = new Set(b.txs.map((t) => t.id));
  let n = 0;
  for (const r of b.recurring) {
    if (r.active === false) continue;
    const every = Math.max(1, Number(r.every) || 1);
    for (let ym = r.startMonth; ym <= monthKey(today); ym = shiftMonth(ym, every)) {
      const [y, m] = ym.split('-').map(Number);
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const date = `${ym}-${String(Math.min(Math.max(Number(r.day) || 1, 1), last)).padStart(2, '0')}`;
      if (date > today) break;
      const id = `rec:${r.id}:${ym}`;
      if (have.has(id) || b.deleted[id]) continue;
      const now = Date.now();
      b.txs.push({ id, date, type: r.type, amount: Number(r.amount), cat: r.cat, note: r.note || '', wallet: r.wallet || null, to: null, at: now, u: now });
      have.add(id);
      n++;
    }
  }
  return n;
}

/** Đổi ngày lương; khoản lương tự động đang ghi vào ngày lương cũ đi theo ngày mới. */
export function movePayday(b, newDay) {
  for (const r of b.recurring) {
    if (r.type === 'income' && r.cat === 'salary' && Number(r.day) === b.payday) r.day = newDay;
  }
  b.payday = newDay;
}

/** Lương dự kiến =tổng khoản thu định kỳ hằng tháng đang bật. */
export function expectedIncome(b) {
  return b.recurring
    .filter((r) => r.type === 'income' && r.active !== false && (Number(r.every) || 1) === 1)
    .reduce((a, r) => a + (Number(r.amount) || 0), 0);
}

/**
 * Tổng hợp 1 kỳ lương. Chuyển tiền giữa ví không tính thu / chi.
 * expected: thu nhập ước tính dùng chia hũ khi kỳ chưa có khoản thu nào (estimated = true).
 */
export function periodSummary(b, p, { expected = 0 } = {}) {
  const cats = catMap(b);
  const txs = b.txs.filter((t) => inPeriod(t.date, p));
  let income = 0;
  let spend = 0;
  let saved = 0;
  const byJar = Object.fromEntries(b.jars.map((j) => [j.id, 0]));
  const byCat = {};
  for (const t of txs) {
    if (t.type === 'transfer') continue;
    const a = Number(t.amount) || 0;
    if (t.type === 'income') { income += a; continue; }
    const jar = cats[t.cat]?.jar || 'nec';
    byJar[jar] = (byJar[jar] || 0) + a;
    byCat[t.cat] = (byCat[t.cat] || 0) + a;
    if (SPEND_JARS.has(jar)) spend += a; else saved += a;
  }
  const estimated = income <= 0 && expected > 0;
  const base = estimated ? expected : income;
  const jars = b.jars.map((j) => {
    const alloc = (base * (Number(j.pct) || 0)) / 100;
    const used = byJar[j.id] || 0;
    return { ...j, alloc, used, left: alloc - used };
  });
  return { period: p, txs, income, base, estimated, spend, saved, savingsRate: income > 0 ? (income - spend) / income : null, jars, byCat };
}

/** Thẻ "Còn tiêu được": hạn mức hũ Thiết yếu + Hưởng thụ trừ đã tiêu. status: noIncome | ok | over. */
export function spendingBudget(S, p, today = localToday()) {
  const jars = S.jars.filter((j) => SPEND_JARS.has(j.id));
  const budget = jars.reduce((a, j) => a + j.alloc, 0);
  const spent = jars.reduce((a, j) => a + j.used, 0);
  const left = budget - spent;
  const status = S.base <= 0 ? 'noIncome' : left < 0 ? 'over' : 'ok';
  const dl = daysLeft(p, today);
  return { budget, spent, left, status, daysLeft: dl, perDay: dl && left > 0 ? left / dl : null };
}

/** "Hôm nay", "Hôm qua", hoặc thứ + ngày/tháng. */
export function dayLabel(date, today = localToday(), loc = 'vi-VN') {
  if (date === today) return 'Hôm nay';
  const y = new Date(today + 'T00:00:00Z');
  y.setUTCDate(y.getUTCDate() - 1);
  if (date === y.toISOString().slice(0, 10)) return 'Hôm qua';
  const s = new Date(date + 'T00:00').toLocaleDateString(loc, { weekday: 'short', day: '2-digit', month: '2-digit' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Hoàn tác xóa: thêm lại bản sao với id mới (dấu xóa của id cũ đã được gộp giữa các máy). */
export function restoreTx(b, t, id) {
  const copy = { ...t, id, at: t.at ?? t.u, u: Date.now() };
  b.txs.push(copy);
  return copy;
}

/** Gộp 2 thiết bị: giao dịch hợp nhất (tôn trọng xóa, bản sửa sau thắng); cấu hình theo configAt mới hơn. */
export function mergeBudget(a, b) {
  if (!a) return b;
  if (!b) return a;
  const cfg = (a.configAt || 0) >= (b.configAt || 0) ? a : b;
  const other = cfg === a ? b : a;
  const deleted = { ...b.deleted, ...a.deleted };
  const txs = new Map();
  for (const t of [...(b.txs || []), ...(a.txs || [])]) {
    if (typeof t?.id !== 'string' || typeof t.date !== 'string') continue; // giao dịch hỏng
    const cur = txs.get(t.id);
    if (!cur || (t.u || 0) > (cur.u || 0)) txs.set(t.id, t);
  }
  const merged = [...txs.values()].filter((t) => !deleted[t.id]).sort((x, y) => x.date.localeCompare(y.date));
  const recurring = cfg.recurring || [];
  // Ví / danh mục chỉ có ở bên thua nhưng còn được dùng → thêm lại (không hợp nhất hết vì xóa không có dấu xóa).
  const keep = (key, refs) => {
    const list = cfg[key] || [];
    const have = new Set(list.map((x) => x?.id));
    const used = new Set(refs.filter(Boolean));
    return [...list, ...(other[key] || []).filter((x) => x && used.has(x.id) && !have.has(x.id))];
  };
  return {
    ...cfg,
    wallets: keep('wallets', [...merged.flatMap((t) => [t.wallet, t.to]), ...recurring.map((r) => r?.wallet)]),
    categories: keep('categories', [...merged.map((t) => t.cat), ...recurring.map((r) => r?.cat)]),
    txs: merged,
    deleted,
    configAt: Math.max(a.configAt || 0, b.configAt || 0),
    onboarded: Boolean(a.onboarded || b.onboarded),
  };
}
