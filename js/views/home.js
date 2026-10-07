import { state } from '../store.js';
import { periodSummary, spendingBudget, expectedIncome, catMap, dayLabel, localToday, SPEND_JARS } from '../budget.js';
import { periodOf, shiftPeriod } from '../period.js';
import { dueReminders } from '../wallets.js';
import { fmt, decimals } from '../money.js';
import { esc } from '../util.js';
import { locale } from '../i18n.js';
import { openEntry } from './entry.js';

// Trang chủ: kỳ lương đang xem — nhắc trả thẻ, "Còn tiêu được", tổng thu / tiêu / để dành, danh sách theo ngày.

const ui = { key: null, curKey: null, showJars: false };
export const dm = (iso) => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;
export const periodLabel = (p) => `${dm(p.start)} – ${dm(p.end)}`;
const walletName = (id) => state.wallets.find((w) => w.id === id)?.name || '';

/** Lưu / xóa xong: chuyển tới kỳ của khoản đó rồi vẽ lại. */
const afterEntry = (ctx) => ({ date } = {}) => {
  if (date) ui.key = periodOf(date, state.payday).key;
  ctx.rerender();
};

/** Nút + nổi: ghi khoản mới. */
export function openNewEntry(ctx) {
  openEntry({ onDone: afterEntry(ctx) });
}

export function renderHome(root, ctx) {
  const today = localToday();
  const cur = periodOf(today, state.payday);
  if (!ui.key || ui.key === ui.curKey) ui.key = cur.key; // đang xem kỳ hiện tại → theo kỳ mới (qua ngày lương / đổi ngày lương)
  ui.curKey = cur.key;
  if (ui.key > cur.key) ui.key = cur.key; // đổi ngày lương có thể đẩy kỳ đang xem ra tương lai
  const p = shiftPeriod(ui.key, 0, state.payday);
  const isCur = ui.key === cur.key;
  const S = periodSummary(state, p, { expected: isCur ? expectedIncome(state) : 0 });
  const dues = isCur ? dueReminders(state.wallets, state.txs, today) : [];
  // ponytail: cụm hạn để trong span riêng để i18n dịch được cả đoạn
  const dueHtml = dues.map((d) => `<button type="button" class="card due" data-pay="${esc(d.wallet.id)}" data-owed="${d.owed}">
    <span>💳 <b>${esc(d.wallet.name)}</b> · <span>${d.days === 0 ? 'Đến hạn hôm nay' : `Còn ${d.days} ngày tới hạn`}</span> · ${fmt(d.owed)}</span>
    <span class="link">Trả ngay</span></button>`).join('');

  const cats = catMap(state);
  const byDay = new Map();
  for (const t of [...S.txs].sort((x, y) => y.date.localeCompare(x.date) || (y.at ?? y.u ?? 0) - (x.at ?? x.u ?? 0))) {
    if (!byDay.has(t.date)) byDay.set(t.date, []);
    byDay.get(t.date).push(t);
  }

  root.innerHTML = `
    <div class="bd-head">
      <div class="month-nav">
        <button class="btn" data-shift="-1" aria-label="Kỳ trước">‹</button>
        <b>Kỳ lương ${periodLabel(p)}</b>
        <button class="btn" data-shift="1" aria-label="Kỳ sau" ${ui.key >= cur.key ? 'disabled' : ''}>›</button>
      </div>
    </div>
    ${dueHtml}
    ${budgetCard(S, spendingBudget(S, p, today))}
    <div class="bd-sum">
      <span><small>Thu vào</small><b class="pos">${fmt(S.income, { compact: true })}</b></span>
      <span><small>Tiêu</small><b>${fmt(S.spend, { compact: true })}</b></span>
      <span><small>Để dành</small><b>${fmt(S.saved, { compact: true })}</b></span>
    </div>
    ${byDay.size ? [...byDay].map(([d, list]) => `
      <section class="bd-day">
        <h4>${esc(dayLabel(d, today, locale()))}</h4>
        ${list.map((t) => txRow(t, cats)).join('')}
      </section>`).join('') : `
      <div class="card bd-empty">
        <p>Chưa có khoản nào trong kỳ này</p>
        <button type="button" class="btn primary" data-new="expense">Ghi khoản đầu tiên</button>
      </div>`}`;

  const defaultDate = isCur ? today : p.start;
  root.querySelectorAll('[data-shift]').forEach((btn) => {
    btn.onclick = () => { ui.key = shiftPeriod(ui.key, Number(btn.dataset.shift), state.payday).key; ctx.rerender(); };
  });
  root.querySelectorAll('[data-new]').forEach((btn) => {
    btn.onclick = () => openEntry({ type: btn.dataset.new, date: defaultDate, onDone: afterEntry(ctx) });
  });
  root.querySelectorAll('[data-tx]').forEach((btn) => {
    btn.onclick = () => {
      const tx = state.txs.find((t) => t.id === btn.dataset.tx);
      if (tx) openEntry({ tx, onDone: afterEntry(ctx) });
    };
  });
  root.querySelectorAll('[data-pay]').forEach((btn) => {
    btn.onclick = () => openEntry({
      type: 'transfer',
      from: (state.wallets.find((w) => w.type === 'bank' && !w.hidden)
        || state.wallets.find((w) => !w.hidden && w.type !== 'credit' && w.id !== btn.dataset.pay))?.id || null,
      to: btn.dataset.pay,
      amount: Number(btn.dataset.owed),
      onDone: afterEntry(ctx),
    });
  });
  root.querySelector('[data-jars]')?.addEventListener('click', () => { ui.showJars = !ui.showJars; ctx.rerender(); });
}

function budgetCard(S, sb) {
  if (sb.status === 'noIncome') {
    return `<div class="card bd-budget">
      <p class="bd-budget-label">Còn tiêu được</p>
      <p class="bd-budget-hint">Ghi lương hoặc thu nhập để biết còn tiêu được bao nhiêu.</p>
      <button type="button" class="btn" data-new="income">Ghi khoản thu</button>
    </div>`;
  }
  const over = sb.status === 'over';
  const pct = sb.budget > 0 ? Math.min(100, (sb.spent / sb.budget) * 100) : 100;
  const level = over ? 'over' : pct >= 85 ? 'warn' : '';
  const perDay = sb.perDay && (decimals() ? Math.floor(sb.perDay) : Math.round(sb.perDay / 1000) * 1000);
  return `<div class="card bd-budget ${level}">
    <p class="bd-budget-label">${over ? 'Đã tiêu quá' : sb.daysLeft ? 'Còn tiêu được kỳ này' : 'Còn lại'}</p>
    <p class="bd-budget-num">${fmt(Math.abs(sb.left))}</p>
    ${S.estimated ? '<small class="muted">Ước tính theo lương dự kiến</small>' : ''}
    <div class="bar" role="img" aria-label="Đã tiêu ${Math.round(pct)}% ngân sách"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div class="bd-budget-foot">
      <span>Đã tiêu ${fmt(sb.spent, { compact: true })} / ${fmt(sb.budget, { compact: true })}</span>
      ${perDay ? `<span>≈ ${fmt(perDay, { compact: true })} mỗi ngày</span>` : ''}
    </div>
    ${sb.daysLeft ? `<p class="bd-budget-foot"><span>Còn ${sb.daysLeft} ngày tới lương</span></p>` : ''}
    <button type="button" class="link bd-jars-btn" data-jars aria-expanded="${ui.showJars}">${ui.showJars ? 'Ẩn 4 hũ' : 'Xem 4 hũ'}</button>
    ${ui.showJars ? jarsList(S) : ''}
  </div>`;
}

function jarsList(S) {
  return `<ul class="bd-jars">${S.jars.map((j) => {
    const spend = SPEND_JARS.has(j.id);
    const over = spend && j.left < 0;
    const note = !spend ? `đã để ${fmt(j.used, { compact: true })} / mục tiêu ${fmt(j.alloc, { compact: true })}`
      : over ? `vượt ${fmt(-j.left, { compact: true })}` : `còn ${fmt(j.left, { compact: true })}`;
    const pct = j.alloc > 0 ? Math.min(100, (j.used / j.alloc) * 100) : 0;
    return `<li>
      <span class="bd-jar-name">${esc(j.name)}</span>
      <span class="bd-jar-note ${over ? 'neg' : ''}">${note}</span>
      <span class="bar"><i style="width:${pct.toFixed(1)}%;background:${over ? 'var(--neg)' : /^#[0-9a-fA-F]{3,8}$/.test(j.color) ? j.color : 'var(--accent)'}"></i></span>
    </li>`;
  }).join('')}</ul>`;
}

function txRow(t, cats) {
  if (t.type === 'transfer') return `<button type="button" class="bd-tx" data-tx="${esc(t.id)}">
    <span class="bd-ic">⇄</span>
    <span class="bd-tx-main"><b>Chuyển tiền</b><small>${esc(walletName(t.wallet))} → ${esc(walletName(t.to))}${t.note ? ' · ' + esc(t.note) : ''}</small></span>
    <span class="bd-amt">${fmt(Number(t.amount))}</span></button>`;
  const c = cats[t.cat];
  const sub = [t.note, t.id.startsWith('rec:') ? 'Tự động hằng tháng' : '', t.wallet ? walletName(t.wallet) : ''].filter(Boolean);
  return `<button type="button" class="bd-tx" data-tx="${esc(t.id)}">
    <span class="bd-ic">${esc(c?.icon || '•')}</span>
    <span class="bd-tx-main"><b>${esc(c?.name || t.cat)}</b>${sub.length ? `<small>${sub.map(esc).join(' · ')}</small>` : ''}</span>
    <span class="bd-amt ${t.type === 'income' ? 'pos' : ''}">${t.type === 'income' ? '+' : '−'}${fmt(Number(t.amount))}</span>
  </button>`;
}
