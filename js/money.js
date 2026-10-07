// Định dạng và nhập số tiền theo đơn vị của người dùng (VND hoặc USD) và ngôn ngữ đang dùng.

const st = { currency: 'VND', lang: 'vi' };

export function setMoney({ currency, lang }) {
  if (currency) st.currency = currency === 'USD' ? 'USD' : 'VND';
  if (lang) st.lang = lang === 'en' ? 'en' : 'vi';
}
export const currency = () => st.currency;
export const decimals = () => (st.currency === 'USD' ? 2 : 0);
const loc = () => (st.lang === 'en' ? 'en-US' : 'vi-VN');
/** Dấu nhóm nghìn trong ô nhập: 45.000 (tiếng Việt) / 45,000 (tiếng Anh). */
export const amountSep = () => (st.lang === 'en' ? ',' : '.');
const decSep = () => (amountSep() === '.' ? ',' : '.');

export const roundMoney = (v) => (decimals() ? Math.round(v * 100) / 100 : Math.round(v));

export function fmt(v, { compact = false, sign = false } = {}) {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  let s;
  if (compact && st.currency === 'VND' && st.lang === 'vi' && abs >= 1e6) {
    s = abs >= 1e9
      ? `${(abs / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`
      : `${(abs / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  } else {
    const opts = compact && abs >= 1e3
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { minimumFractionDigits: decimals(), maximumFractionDigits: decimals() };
    s = new Intl.NumberFormat(loc(), { style: 'currency', currency: st.currency, ...opts }).format(abs);
  }
  return (v < 0 ? '−' : sign && v > 0 ? '+' : '') + s.replace(/ /g, ' ');
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
  const v = Number(num.split(amountSep()).join('').replace(decSep(), '.'));
  return Number.isFinite(v) ? roundMoney(v) : NaN;
}

const grouped = (raw, sep) => (sep === ',' ? /^[\d,]+$/ : /^[\d.]+$/).test(raw);

/** Ô số tiền: chỉ có chữ số và dấu nhóm → nhóm lại cho dễ đọc; kiểu gõ tắt / số lẻ giữ nguyên. */
export function formatAmountInput(s) {
  const raw = String(s ?? '');
  const sep = amountSep();
  if (!grouped(raw, sep)) return raw;
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
  if (key === '000') return isGrouped ? formatAmountInput(raw + '000') : raw;
  const n = isGrouped ? Number(raw.split(sep).join('')) : Number(raw.replace(',', '.'));
  if (!(n > 0)) return raw;
  return formatAmountInput(String(Math.round(n * (key === 'tr' ? 1e6 : 1e3))));
}
