import { state, commit } from '../store.js';
import { openSheet } from '../sheet.js';
import { localToday, dayLabel, restoreTx, catMap } from '../budget.js';
import { parseAmount, formatAmountInput, applyAmountKey, amountKeys, amountSep, fmt, currency } from '../money.js';
import { walletIcon } from '../wallets.js';
import { esc, uid, toast } from '../util.js';
import { tr, translateDom, locale } from '../i18n.js';

// Bảng ghi / sửa 1 khoản chi, thu hoặc chuyển tiền giữa 2 ví + các phần dùng chung với bảng "khoản tự động" (Cài đặt).

const KIND = { expense: 'chi', income: 'thu', transfer: 'chuyển' };

/** Số tiền có sẵn (khi sửa) → chữ hiện trong ô số tiền. USD không tự nhóm nghìn: chỉ đổi dấu thập phân. */
export function amountText(n) {
  if (currency() !== 'USD') return formatAmountInput(String(n));
  const [i, f] = String(n).split('.');
  return i + (f ? (amountSep() === ',' ? '.' : ',') + f : '');
}

const visibleWallets = () => state.wallets.filter((w) => !w.hidden);

/** Ví dùng lần trước trên máy này. */
export function lastWallet() {
  let id;
  try { id = localStorage.getItem('wl.wallet'); } catch { /* bỏ qua */ }
  const list = visibleWallets();
  return list.some((w) => w.id === id) ? id : list[0]?.id || null;
}

export function walletField(name, label, sel) {
  const list = visibleWallets();
  const cur = state.wallets.find((w) => w.id === sel);
  if (cur?.hidden) list.push(cur); // khoản cũ gắn ví đã ẩn: vẫn hiện để không bị đổi ví khi sửa
  return `<label class="field"><span>${label}</span><select name="${name}">
    ${list.map((w) => `<option value="${esc(w.id)}" ${w.id === sel ? 'selected' : ''}>${walletIcon(w.type)} ${esc(w.name)}</option>`).join('')}
  </select></label>`;
}

/** Ô số tiền chữ to + nút nhanh (000 / nghìn / triệu, hoặc dấu thập phân với USD). */
export function amountField(value = '', autofocus = false) {
  return `<div class="amt">
    <div class="amt-row"><input name="amount" class="amt-input" inputmode="decimal" autocomplete="off" placeholder="0"
      aria-label="Số tiền" value="${esc(value)}" ${autofocus ? 'autofocus' : ''}><span class="amt-cur">${currency() === 'USD' ? '$' : '₫'}</span></div>
    <div class="amt-preview small muted" aria-live="polite"></div>
    <div class="amt-keys">${amountKeys().map(([k, label]) => `<button type="button" data-key="${k}">${esc(label)}</button>`).join('')}</div>
  </div>`;
}

export function bindAmount(root) {
  const input = root.querySelector('.amt-input');
  const preview = root.querySelector('.amt-preview');
  const update = () => {
    const shown = formatAmountInput(input.value);
    if (shown !== input.value) {
      // giữ con trỏ sau đúng số chữ số bên trái nó (dấu chấm tự thêm / bớt không làm con trỏ nhảy về cuối)
      const digits = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
      input.value = shown;
      let i = 0;
      for (let n = 0; i < shown.length && n < digits; i++) if (/\d/.test(shown[i])) n++;
      input.setSelectionRange(i, i);
    }
    const v = parseAmount(input.value);
    // VND: "= 45.000 ₫" chỉ cần khi gõ kiểu tắt (45k, 1,5tr) — gõ số thường thì ô đã tự nhóm nghìn.
    // USD: ô không tự nhóm → hiện khi cách viết chuẩn khác chữ đang gõ (1234 → $1,234.00).
    const show = currency() === 'USD'
      ? fmt(v).replace(/[^\d.,]/g, '') !== input.value
      : /\D/.test(input.value.split(amountSep()).join(''));
    preview.textContent = show && v > 0 ? `= ${fmt(v)}` : '';
    input.classList.remove('invalid');
  };
  input.addEventListener('input', update);
  root.querySelectorAll('[data-key]').forEach((b) => {
    b.onclick = () => { input.value = applyAmountKey(input.value, b.dataset.key); update(); input.focus(); };
  });
  update();
  return input;
}

/** Lưới danh mục (thấy hết, không cuộn ngang). */
export function catGrid(b, type, sel) {
  return `<div class="cat-grid" role="radiogroup" aria-label="Danh mục">${b.categories.filter((c) => c.type === type).map((c) => `
    <button type="button" class="cat-btn ${c.id === sel ? 'on' : ''}" data-cat="${esc(c.id)}" role="radio" aria-checked="${c.id === sel}">
      <span class="cat-ic">${esc(c.icon || '•')}</span><span class="cat-name">${esc(c.name)}</span></button>`).join('')}</div>`;
}

/**
 * Nút Chi | Thu (| Chuyển) + lưới danh mục, vẽ lại khi đổi lựa chọn. ui = { type, cat } (sửa tại chỗ).
 * onChange() sau mỗi lần vẽ (vd đổi chữ trên nút Lưu).
 */
export function bindTypeAndCats(el, b, ui, onChange = () => {}) {
  const box = el.querySelector('.entry-cats');
  const paint = () => {
    el.querySelectorAll('[data-type]').forEach((x) => {
      x.classList.toggle('on', x.dataset.type === ui.type);
      x.setAttribute('aria-pressed', String(x.dataset.type === ui.type));
    });
    const transfer = ui.type === 'transfer';
    // bảng khoản tự động (Cài đặt) dùng lại hàm này nhưng không có 2 khối ví bên dưới → ?.
    el.querySelectorAll('.entry-transfer').forEach((x) => { x.hidden = !transfer; });
    const wallet = el.querySelector('.entry-wallet');
    if (wallet) wallet.hidden = transfer;
    box.hidden = transfer;
    box.classList.remove('invalid');
    box.innerHTML = transfer ? '' : catGrid(b, ui.type, ui.cat);
    translateDom(box);
    box.querySelectorAll('[data-cat]').forEach((x) => {
      // đổi trạng thái tại chỗ (không vẽ lại lưới) để giữ focus bàn phím và để trình đọc màn hình đọc được lựa chọn
      x.onclick = () => {
        ui.cat = x.dataset.cat;
        box.classList.remove('invalid');
        box.querySelectorAll('[data-cat]').forEach((y) => {
          y.classList.toggle('on', y === x);
          y.setAttribute('aria-checked', String(y === x));
        });
      };
    });
    onChange();
  };
  el.querySelectorAll('[data-type]').forEach((x) => {
    x.onclick = () => {
      if (ui.type === x.dataset.type) return;
      ui.type = x.dataset.type;
      ui.cat = null; // danh mục chi và thu khác nhau → chọn lại
      paint();
    };
  });
  paint();
  return box;
}

export const typeSwitch = (withTransfer = false) => `<div class="seg full entry-type">
  <button type="button" data-type="expense">Chi</button><button type="button" data-type="income">Thu</button>
  ${withTransfer ? '<button type="button" data-type="transfer">Chuyển</button>' : ''}</div>`;

const FEW_WALLETS = 'Cần ít nhất 2 ví để chuyển tiền — thêm ví ở tab Ví';

/**
 * Bảng ghi / sửa 1 khoản. tx có sẵn = sửa. type / date / from / to / amount: mặc định cho khoản mới.
 * onDone({ date }) sau khi lưu / xóa / hoàn tác — thường là vẽ lại tab.
 */
export function openEntry({ tx = null, type = 'expense', date = null, from = null, to = null, amount = null, onDone = () => {} } = {}) {
  const editing = Boolean(tx);
  const ui = { type: tx?.type || type, cat: tx?.cat || null };
  const title = () => (editing ? `Sửa khoản ${KIND[ui.type]}` : 'Ghi khoản mới');
  const fromSel = tx ? tx.wallet : from || lastWallet();
  // mặc định "Đến ví" khác "Từ ví"
  const toSel = tx?.type === 'transfer' ? tx.to : to || visibleWallets().find((w) => w.id !== fromSel)?.id || '';
  // khoản chuyển cũ gắn ví đã ẩn vẫn sửa được (2 ô chọn vẫn hiện ví đó)
  const few = visibleWallets().length < 2 && tx?.type !== 'transfer';
  openSheet({
    title: title(),
    body: `<form class="entry" novalidate>
      ${typeSwitch(true)}
      ${amountField(tx ? amountText(tx.amount) : amount ? amountText(amount) : '', !editing)}
      <div class="entry-cats"></div>
      <div class="field-row entry-transfer" hidden>
        ${walletField('from', 'Từ ví', fromSel)}
        ${walletField('to', 'Đến ví', toSel)}
      </div>
      ${few ? `<p class="small muted entry-transfer" hidden>${FEW_WALLETS}</p>` : ''}
      <label class="field"><span>Ghi chú</span>
        <input name="note" placeholder="Không bắt buộc" autocomplete="off" maxlength="120" value="${esc(tx?.note || '')}"></label>
      <div class="field-row">
        <label class="field"><span>Ngày <small class="day-hint muted"></small></span>
          <input name="date" type="date" required value="${esc(tx?.date || date || localToday())}"></label>
        <div class="entry-wallet">${walletField('wallet', 'Ví', tx ? tx.wallet : lastWallet())}</div>
      </div>
      <button class="btn primary big entry-save"></button>
      ${editing ? '<button type="button" class="link danger entry-del">Xóa khoản này</button>' : ''}
    </form>`,
    onMount: (el, close) => {
      const form = el.querySelector('form');
      const amountInput = bindAmount(el);
      const save = el.querySelector('.entry-save');
      const cats = bindTypeAndCats(el, state, ui, () => {
        save.textContent = tr(editing ? 'Lưu thay đổi' : `Lưu khoản ${KIND[ui.type]}`);
        el.querySelector('#sheet-title').textContent = tr(title());
      });
      const dateInput = form.elements.date;
      const hint = el.querySelector('.day-hint');
      const showHint = () => {
        const l = dayLabel(dateInput.value, localToday(), locale());
        hint.textContent = l === 'Hôm nay' || l === 'Hôm qua' ? `(${tr(l)})` : '';
      };
      dateInput.addEventListener('input', showHint);
      showHint();

      form.onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const value = parseAmount(f.get('amount'));
        if (!(value > 0)) {
          amountInput.classList.add('invalid');
          amountInput.focus();
          return toast('Nhập số tiền lớn hơn 0', 'error');
        }
        const transfer = ui.type === 'transfer';
        if (transfer && few) return toast(FEW_WALLETS, 'error');
        if (transfer && f.get('from') === f.get('to')) return toast('Chọn 2 ví khác nhau', 'error');
        if (!transfer && !ui.cat) {
          cats.classList.add('invalid');
          return toast('Chọn danh mục', 'error');
        }
        const d = f.get('date');
        if (!d) return toast('Chọn ngày', 'error');
        const note = String(f.get('note') || '').trim();
        const now = Date.now();
        let data;
        if (transfer) {
          data = { date: d, type: 'transfer', amount: value, cat: null, wallet: f.get('from'), to: f.get('to'), note, u: now };
        } else {
          const wallet = f.get('wallet');
          data = { date: d, type: ui.type, amount: value, cat: ui.cat, wallet, to: null, note, u: now };
          // nhớ ví cho lần ghi sau — chỉ khi ghi mới, sửa khoản cũ không đổi mặc định
          if (!editing) try { localStorage.setItem('wl.wallet', wallet); } catch { /* bỏ qua */ }
        }
        if (editing) {
          const cur = state.txs.find((t) => t.id === tx.id);
          if (!cur) return toast('Không tìm thấy khoản này — có thể vừa bị xóa trên máy khác', 'error');
          cur.at ??= cur.u; // lúc ghi gốc (khoản cũ chưa có at) — giữ nguyên để số dư ví không trừ lại
          Object.assign(cur, data);
        } else {
          state.txs.push({ id: uid(), ...data, at: now });
        }
        commit();
        close();
        onDone({ date: d });
        if (editing) return toast(`Đã cập nhật khoản ${KIND[ui.type]}`, 'ok');
        if (transfer) {
          const name = (id) => state.wallets.find((w) => w.id === id)?.name || '';
          return toast(`Đã chuyển ${fmt(value)} · ${name(data.wallet)} → ${name(data.to)}`, 'ok');
        }
        toast(`Đã lưu khoản ${KIND[ui.type]} ${fmt(value)} · ${catMap(state)[ui.cat]?.name || ''}`, 'ok');
      };

      el.querySelector('.entry-del')?.addEventListener('click', () => {
        const cur = state.txs.find((t) => t.id === tx.id) || tx;
        state.txs = state.txs.filter((t) => t.id !== cur.id);
        state.deleted[cur.id] = Date.now(); // dấu xóa: máy khác đồng bộ về cũng không "hồi sinh"
        commit();
        close();
        onDone({ date: cur.date });
        toast(`Đã xóa khoản ${KIND[cur.type]} ${fmt(cur.amount)}`, 'ok', {
          action: {
            label: 'Hoàn tác',
            run: () => {
              restoreTx(state, cur, uid());
              commit();
              onDone({ date: cur.date });
              toast(`Đã khôi phục khoản ${KIND[cur.type]}`, 'ok');
            },
          },
        });
      });
    },
  });
}
