// Định dạng và nhập số tiền theo đơn vị của người dùng (VND hoặc USD) và ngôn ngữ đang dùng.

const st = { currency: 'VND', lang: 'vi' };

export function setMoney({ currency, lang }) {
  if (currency) st.currency = currency === 'USD' ? 'USD' : 'VND';
  if (lang) st.lang = lang === 'en' ? 'en' : 'vi';
}
export const currency = () => st.currency;
export const decimals = () => (st.currency === 'USD' ? 2 : 0);
// USD luôn theo kiểu Mỹ ($1,250.00) ở mọi ngôn ngữ; VND theo ngôn ngữ.
const loc = () => (st.lang === 'en' || st.currency === 'USD' ? 'en-US' : 'vi-VN');
/** Dấu nhóm nghìn trong ô nhập: 45.000 (VND tiếng Việt) / 45,000 (tiếng Anh hoặc USD). */
export const amountSep = () => (loc() === 'en-US' ? ',' : '.');
const decSep = () => (amountSep() === '.' ? ',' : '.');

export const roundMoney = (v) => (decimals() ? Math.round(v * 100) / 100 : Math.round(v));

export function fmt(v, { compact = false, sign = false } = {}) {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const r = roundMoney(v); // dấu theo giá trị đã làm tròn: -0,004 USD hiện $0.00
  let s;
  const full = () => new Intl.NumberFormat(loc(), { style: 'currency', currency: st.currency, minimumFractionDigits: decimals(), maximumFractionDigits: decimals() }).format(abs);
  if (compact && loc() === 'en-US' && abs >= 1e3) {
    s = new Intl.NumberFormat(loc(), { style: 'currency', currency: st.currency, notation: 'compact', maximumFractionDigits: 1 }).format(abs);
  } else if (compact && st.lang === 'vi' && st.currency === 'VND' && abs >= 1e6) {
    s = Number((abs / 1e6).toFixed(1)) >= 1000
      ? `${(abs / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`
      : `${(abs / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  } else s = full();
  return (r < 0 ? '−' : sign && r > 0 ? '+' : '') + s.replace(/\u00a0/g, ' ');
}

const UNITS = { k: 1e3, n: 1e3, nghìn: 1e3, ngàn: 1e3, tr: 1e6, triệu: 1e6, m: 1e6, tỷ: 1e9, ty: 1e9, b: 1e9 };

/** "45k", "1,5tr", "150.000", "12.50" (USD) → số; không hợp lệ → NaN. */
export function parseAmount(input) {
  const s = String(input ?? '').trim().toLowerCase().replace(/\s+/g, '').replace(/đ|vnd|₫|\$|usd/g, '');
  if (!s) return NaN;
  const m = s.match(/^([\d.,]+)(k|n|nghìn|ngàn|tr|triệu|m|tỷ|ty|b)?$/);
  if (!m) return NaN;
  const [, num, unit] = m;
  if (unit) return roundMoney(Number(num.replace(',', '.')) * UNITS[unit]); // "1.5tr" và "1,5tr" đều là 1,5 triệu
  if (!decimals()) return Number(num.replace(/[.,]/g, ''));
  const g = amountSep(), d = decSep();
  let t = num;
  const gs = t.split(g);
  if (!t.includes(d) && gs.length === 2 && gs[1].length !== 3) t = t.replace(g, d); // "12.5" (vi) / "1,5" (en) = số lẻ
  const G = `\\${g}`, D = `\\${d}`;
  if (!/\d/.test(t) || !(new RegExp(`^\\d{1,3}(${G}\\d{3})*(${D}\\d*)?$`).test(t) || new RegExp(`^\\d*(${D}\\d*)?$`).test(t))) return NaN;
  const v = Number(t.split(g).join('').replace(d, '.'));
  return Number.isFinite(v) ? roundMoney(v) : NaN;
}

const grouped = (raw, sep) => (sep === ',' ? /^[\d,]+$/ : /^[\d.]+$/).test(raw);

/** Ô số tiền: chỉ có chữ số và dấu nhóm → nhóm lại cho dễ đọc; kiểu gõ tắt / số lẻ giữ nguyên. */
export function formatAmountInput(s) {
  const raw = String(s ?? '');
  const sep = amountSep();
  if (st.currency === 'USD' || !grouped(raw, sep)) return raw; // USD: gõ sao giữ vậy (nhóm lại làm mơ hồ dấu thập phân)
  return raw.split(sep).join('').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** Phím nhanh dưới ô số tiền: [mã, nhãn]. */
export const amountKeys = () => (st.currency === 'USD'
  ? [['dot', decSep()], ['000', '000']]
  : [['000', '000'], ['k', 'nghìn'], ['tr', 'triệu']]);

export function applyAmountKey(s, key) {
  const raw = String(s ?? '').trim();
  const sep = amountSep();
  if (key === 'dot') return raw.includes(decSep()) ? raw : (raw || '0') + decSep();
  if (!raw) return '';
  const isGrouped = grouped(raw, sep);
  if (key === '000' && st.currency === 'USD') return raw.includes(decSep()) ? raw : raw.split(sep).join('') + '000';
  if (key === '000') return isGrouped ? formatAmountInput(raw + '000') : raw;
  const n = isGrouped ? Number(raw.split(sep).join('')) : Number(raw.replace(',', '.'));
  if (!(n > 0)) return raw;
  return formatAmountInput(String(Math.round(n * (key === 'tr' ? 1e6 : 1e3))));
}
