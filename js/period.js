// Kỳ lương: từ ngày nhận lương tháng này tới hết ngày trước ngày nhận lương tháng sau.
// key = 'YYYY-MM' của tháng chứa ngày bắt đầu. payday 31 trong tháng ngắn → ngày cuối tháng.

const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1..12
const addMonths = (y, m, n) => {
  const t = y * 12 + (m - 1) + n;
  return [Math.floor(t / 12), (t % 12) + 1];
};
const prevDay = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Ngày nhận lương thực tế trong tháng y-m. */
export function paydayIn(y, m, payday) {
  return `${y}-${pad(m)}-${pad(Math.min(payday, lastDay(y, m)))}`;
}

export function periodFromKey(key, payday) {
  const [y, m] = key.split('-').map(Number);
  const [ny, nm] = addMonths(y, m, 1);
  return { key, start: paydayIn(y, m, payday), end: prevDay(paydayIn(ny, nm, payday)) };
}

export function periodOf(date, payday) {
  const [y, m] = date.split('-').map(Number);
  const [ky, km] = date >= paydayIn(y, m, payday) ? [y, m] : addMonths(y, m, -1);
  return periodFromKey(`${ky}-${pad(km)}`, payday);
}

export function shiftPeriod(key, n, payday) {
  const [y, m] = key.split('-').map(Number);
  const [ny, nm] = addMonths(y, m, n);
  return periodFromKey(`${ny}-${pad(nm)}`, payday);
}

export const inPeriod = (date, p) => date >= p.start && date <= p.end;

/** Số ngày còn lại của kỳ, tính cả hôm nay; null nếu hôm nay không thuộc kỳ. */
export function daysLeft(p, today) {
  if (!inPeriod(today, p)) return null;
  return Math.round((Date.parse(p.end) - Date.parse(today)) / 864e5) + 1;
}
