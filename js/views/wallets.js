import { state, commit } from '../store.js';
import { openSheet } from '../sheet.js';
import { localToday, dayLabel, catMap } from '../budget.js';
import { WALLET_TYPES, walletIcon, walletBalance, setAnchor, netWorth, walletUsage } from '../wallets.js';
import { fmt, parseAmount } from '../money.js';
import { esc, uid, toast } from '../util.js';
import { locale, tr } from '../i18n.js';
import { amountField, amountText, bindAmount, openEntry } from './entry.js';

// Tab Ví: tổng tài sản, danh sách ví; bảng thêm / sửa ví (chốt số dư, ẩn, xóa) + giao dịch gần đây của ví.

const typeName = (type) => WALLET_TYPES.find((t) => t[0] === type)?.[1] || '';
const visibleCount = () => state.wallets.filter((w) => !w.hidden).length;

export function renderWallets(root, ctx) {
  const shown = state.wallets.filter((w) => !w.hidden);
  const hidden = state.wallets.filter((w) => w.hidden);
  const row = (w) => {
    const { balance } = walletBalance(w, state.txs);
    return `<button type="button" class="set-row" data-w="${esc(w.id)}">
      <span class="bd-ic">${walletIcon(w.type)}</span>
      <span class="set-main"><b>${esc(w.name)}</b><small>${typeName(w.type)}</small></span>
      <span class="bd-amt ${balance < 0 ? 'neg' : ''}">${fmt(balance)}</span></button>`;
  };
  root.innerHTML = `
    <div class="card bd-budget">
      <p class="bd-budget-label">Tổng tài sản</p>
      <p class="bd-budget-num">${fmt(netWorth(state.wallets, state.txs))}</p>
      <p class="muted small">Đã trừ số đang nợ thẻ tín dụng</p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Ví của bạn</h3><button type="button" class="btn" data-add>+ Thêm ví</button></div>
      <div class="set-list">${shown.map(row).join('')}</div>
      ${hidden.length ? `<details><summary class="muted small">Ví đã ẩn (${hidden.length})</summary><div class="set-list">${hidden.map(row).join('')}</div></details>` : ''}
    </div>`;
  root.querySelector('[data-add]').onclick = () => openWallet(null, ctx);
  root.querySelectorAll('[data-w]').forEach((b) => {
    b.onclick = () => { const w = state.wallets.find((x) => x.id === b.dataset.w); if (w) openWallet(w, ctx); };
  });
}

/** Tiền vào ví này (+) hay ra (−). */
const into = (t, id) => (t.type === 'transfer' ? t.to === id : t.type === 'income');

function recentTxs(w) {
  const cats = catMap(state);
  const today = localToday();
  const list = state.txs.filter((t) => t.wallet === w.id || t.to === w.id)
    .sort((x, y) => y.date.localeCompare(x.date) || (y.at ?? y.u ?? 0) - (x.at ?? x.u ?? 0))
    .slice(0, 20);
  if (!list.length) return '<p class="muted small">Chưa có giao dịch nào</p>';
  return `<div class="set-list">${list.map((t) => {
    const plus = into(t, w.id);
    const name = t.type === 'transfer' ? 'Chuyển tiền' : cats[t.cat]?.name || '';
    return `<button type="button" class="set-row" data-tx="${esc(t.id)}">
      <span class="set-main"><b>${esc(name)}</b><small>${esc(dayLabel(t.date, today, locale()))}</small></span>
      <span class="bd-amt ${plus ? 'pos' : ''}">${plus ? '+' : '−'}${fmt(Number(t.amount))}</span></button>`;
  }).join('')}</div>`;
}

export function openWallet(w, ctx) {
  const editing = Boolean(w);
  const type0 = w?.type || 'bank';
  const balance0 = editing ? walletBalance(w, state.txs).balance : 0;
  const balLabel = (type) => (type === 'credit' ? 'Số đang nợ'
    : editing ? 'Số dư thực tế hôm nay (xem trong app ngân hàng)' : 'Số dư hiện tại');
  const dueDay0 = Number(w?.dueDay) || 1;
  const canDelete = editing && walletUsage(state, w.id) === 0 && (visibleCount() >= 2 || w.hidden);
  const action = !editing ? '' : canDelete
    ? '<button type="button" class="link danger w-del">Xóa ví</button>'
    : `<button type="button" class="link w-hide">${w.hidden ? 'Hiện lại ví' : 'Ẩn ví'}</button>`;

  openSheet({
    title: editing ? 'Sửa ví' : 'Thêm ví',
    body: `<form class="entry" novalidate>
      <label class="field"><span>Tên ví</span>
        <input name="name" maxlength="40" autocomplete="off" required value="${esc(w?.name || '')}"></label>
      <fieldset class="field"><legend>Loại</legend>
        ${WALLET_TYPES.map(([id, label, ic]) => `<label class="radio-row"><input type="radio" name="type" value="${id}" ${id === type0 ? 'checked' : ''}> ${ic} <span>${label}</span></label>`).join('')}
      </fieldset>
      <div class="field"><span class="w-bal-label">${balLabel(type0)}</span>
        ${amountField(editing ? amountText(Math.abs(balance0)) : '')}</div>
      <label class="field w-due" ${type0 === 'credit' ? '' : 'hidden'}><span>Ngày đến hạn thanh toán</span>
        <select name="dueDay">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${i + 1 === dueDay0 ? 'selected' : ''}>Ngày ${i + 1}</option>`).join('')}</select></label>
      <button class="btn primary big">${editing ? 'Lưu ví' : 'Thêm ví'}</button>
      ${action}
    </form>
    ${editing ? `<h4>Giao dịch gần đây</h4>${recentTxs(w)}` : ''}`,
    onMount: (el, close) => {
      const form = el.querySelector('form');
      const amountInput = bindAmount(el);
      const amount0 = amountInput.value; // chỉ chốt lại khi người dùng sửa ô số dư (thẻ dư có không bị đổi dấu)
      const label = el.querySelector('.w-bal-label');
      const due = el.querySelector('.w-due');
      form.querySelectorAll('[name="type"]').forEach((r) => {
        r.onchange = () => {
          due.hidden = r.value !== 'credit';
          label.textContent = tr(balLabel(r.value));
        };
      });

      form.onsubmit = (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const name = String(f.get('name') || '').trim();
        const nameInput = form.elements.name;
        if (!name) { nameInput.focus(); return toast('Nhập tên ví', 'error'); }
        const key = name.toLowerCase();
        if (state.wallets.some((x) => x.id !== w?.id && x.name.trim().toLowerCase() === key)) {
          nameInput.focus();
          return toast('Đã có ví tên này', 'error');
        }
        const type = f.get('type');
        const raw = String(f.get('amount') || '').trim();
        const value = raw ? parseAmount(raw) : 0; // để trống = 0
        if (!Number.isFinite(value)) {
          amountInput.classList.add('invalid');
          amountInput.focus();
          return toast('Nhập số tiền hợp lệ', 'error');
        }
        const amount = type === 'credit' ? -Math.abs(value) : value;
        const dueDay = type === 'credit' ? Number(f.get('dueDay')) : null;
        if (editing) {
          const cur = state.wallets.find((x) => x.id === w.id);
          if (!cur) return toast('Không tìm thấy ví này — có thể vừa bị xóa trên máy khác', 'error');
          Object.assign(cur, { name, type, dueDay });
          if (amountInput.value !== amount0) setAnchor(cur, amount, Date.now(), localToday());
        } else {
          const nw = { id: uid(), name, type, dueDay, hidden: false };
          setAnchor(nw, amount, Date.now(), localToday());
          state.wallets.push(nw);
        }
        commit({ config: true });
        close();
        ctx.rerender();
        toast(editing ? `Đã lưu ví ${name}` : `Đã thêm ví ${name}`, 'ok');
      };

      el.querySelectorAll('[data-tx]').forEach((b) => {
        b.onclick = () => {
          const t = state.txs.find((x) => x.id === b.dataset.tx);
          if (!t) return;
          close();
          openEntry({ tx: t, onDone: ctx.rerender });
        };
      });

      el.querySelector('.w-hide')?.addEventListener('click', () => {
        const cur = state.wallets.find((x) => x.id === w.id);
        if (!cur) return;
        if (!cur.hidden && visibleCount() <= 1) return toast('Cần giữ ít nhất 1 ví', 'error');
        cur.hidden = !cur.hidden;
        commit({ config: true });
        close();
        ctx.rerender();
        toast(cur.hidden ? `Đã ẩn ví ${cur.name}` : `Đã khôi phục ví ${cur.name}`, 'ok');
      });

      el.querySelector('.w-del')?.addEventListener('click', () => {
        const i = state.wallets.findIndex((x) => x.id === w.id);
        if (i < 0) return;
        const cur = state.wallets[i];
        if (!cur.hidden && visibleCount() <= 1) return toast('Cần giữ ít nhất 1 ví', 'error');
        state.wallets.splice(i, 1);
        commit({ config: true });
        close();
        ctx.rerender();
        toast(`Đã xóa ví ${cur.name}`, 'ok', {
          action: {
            label: 'Hoàn tác',
            run: () => {
              state.wallets.splice(Math.min(i, state.wallets.length), 0, cur);
              commit({ config: true });
              ctx.rerender();
              toast(`Đã khôi phục ví ${cur.name}`, 'ok');
            },
          },
        });
      });
    },
  });
}
