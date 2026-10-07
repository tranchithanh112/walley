import { state, commit } from '../store.js';
import { generateRecurring, localToday, JAR_DESC } from '../budget.js';
import { periodOf } from '../period.js';
import { walletIcon, walletBalance } from '../wallets.js';
import { fmt, parseAmount } from '../money.js';
import { getLang, setLang, tr } from '../i18n.js';
import { esc, toast } from '../util.js';
import * as backup from '../backup.js';
import { amountField, amountText, bindAmount, walletField, lastWallet } from './entry.js';
import { openWallet } from './wallets.js';

// Lần đầu mở app: 4 bước (ngôn ngữ & tiền, lương, ví, chia thu nhập) vẽ thẳng vào trang, không dùng bảng.

const TITLES = ['Ngôn ngữ & đơn vị tiền', 'Lương của bạn', 'Ví của bạn', 'Chia thu nhập'];
let step = 0;
let curChosen = false; // người dùng đã tự chọn đơn vị tiền chưa (chưa → theo ngôn ngữ)
let curInit = false; // đã đặt đơn vị tiền mặc định lần đầu chưa

/** Chưa tự chọn và chưa có giao dịch → đơn vị tiền theo ngôn ngữ. Không lưu; lưu khi bấm Tiếp tục / chọn. */
function defaultCurrency() {
  if (!curChosen && !state.txs.length) state.currency = getLang() === 'vi' ? 'VND' : 'USD';
}

const seg = (attr, items, cur) => `<div class="seg full">${items.map(([v, label]) =>
  `<button type="button" data-${attr}="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${label}</button>`).join('')}</div>`;

export function renderOnboarding(root, ctx) {
  if (!curInit) { curInit = true; defaultCurrency(); }
  const last = step === TITLES.length - 1;
  root.innerHTML = `<form class="ob" novalidate>
    <ol class="ob-dots" aria-label="Bước ${step + 1}/${TITLES.length}">${TITLES.map((_, i) => `<li class="${i === step ? 'on' : ''}"></li>`).join('')}</ol>
    ${step === 0 ? '<p class="ob-intro">Walley giúp bạn biết còn tiêu được bao nhiêu tới kỳ lương sau.</p>' : ''}
    <h2>${TITLES[step]}</h2>
    ${[stepLang, stepSalary, stepWallets, stepJars][step]()}
    <div class="ob-nav">
      ${step ? '<button type="button" class="btn" data-ob="back">Quay lại</button>' : ''}
      <button type="button" class="link" data-ob="skip">Bỏ qua</button>
      <button class="btn primary">${last ? 'Xong' : 'Tiếp tục'}</button>
    </div>
  </form>`;

  const form = root.querySelector('form');
  const goStep = (n) => { step = n; ctx.rerender(); window.scrollTo(0, 0); };
  const finish = () => {
    state.onboarded = true;
    commit({ config: true });
    step = 0;
    ctx.go('home');
    toast('Xong! Bấm + để ghi khoản chi đầu tiên', 'ok');
  };
  const next = () => {
    if (step === 0) commit(); // lưu ngôn ngữ / đơn vị tiền mặc định
    return last ? finish() : goStep(step + 1);
  };
  root.querySelector('[data-ob="back"]')?.addEventListener('click', () => goStep(step - 1));
  root.querySelector('[data-ob="skip"]').onclick = next;

  if (step === 0) bindLang(root, ctx);
  if (step === 1) {
    const input = bindAmount(root);
    form.onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const raw = String(f.get('amount') || '').trim();
      const amount = raw ? parseAmount(raw) : 0; // để trống = chưa nhập lương
      if (!Number.isFinite(amount) || amount < 0) { input.classList.add('invalid'); input.focus(); return toast('Nhập số tiền hợp lệ', 'error'); }
      const n = Number(f.get('payday'));
      state.payday = n;
      // quay lại bước này: bỏ lương cũ cùng khoản đã ghi từ nó rồi tạo lại theo số mới
      state.recurring = state.recurring.filter((r) => r.id !== 'salary');
      state.txs = state.txs.filter((t) => !t.id.startsWith('rec:salary:'));
      if (amount > 0) {
        state.recurring.push({ id: 'salary', type: 'income', amount, cat: 'salary', day: n, every: 1,
          startMonth: periodOf(localToday(), n).start.slice(0, 7), wallet: f.get('wallet'), note: '', active: true });
        generateRecurring(state); // ghi lương kỳ này luôn để "Còn tiêu được" có số ngay
      }
      commit();
      next();
    };
    return;
  }
  if (step === 2) {
    const wctx = { rerender: ctx.rerender };
    root.querySelector('[data-add]').onclick = () => openWallet(null, wctx);
    root.querySelectorAll('[data-w]').forEach((b) => {
      b.onclick = () => { const w = state.wallets.find((x) => x.id === b.dataset.w); if (w) openWallet(w, wctx); };
    });
  }
  if (step === 3) {
    const ids = state.jars.map((j) => j.id);
    const pct = (id) => Math.min(100, Math.max(0, Math.trunc(Number(form.elements[id].value)) || 0));
    const total = () => ids.reduce((a, id) => a + pct(id), 0);
    const out = form.querySelector('.jar-total');
    const paint = () => {
      const t = total();
      out.textContent = tr(t === 100 ? 'Tổng 100% ✓' : `Tổng ${t}% — cần đúng 100%`);
      out.classList.toggle('neg', t !== 100);
    };
    form.addEventListener('input', paint);
    paint();
    form.onsubmit = (e) => {
      e.preventDefault();
      const t = total();
      if (t !== 100) return toast(`Tổng ${t}% — cần đúng 100%`, 'error');
      state.jars = state.jars.map((j) => ({ ...j, pct: pct(j.id) }));
      finish();
    };
    return;
  }
  form.onsubmit = (e) => { e.preventDefault(); next(); };
}

function stepLang() {
  return `<div class="field"><span>Ngôn ngữ</span>${seg('lang', [['vi', 'Tiếng Việt'], ['en', 'English']], getLang())}</div>
    <div class="field"><span>Đơn vị tiền</span>${seg('cur', [['VND', 'VND'], ['USD', 'USD']], state.currency)}</div>
    ${backup.configured() ? '<button type="button" class="link" data-restore>Đã dùng Walley trên máy khác? Khôi phục từ Google Drive</button>' : ''}`;
}

function bindLang(root, ctx) {
  root.querySelectorAll('[data-lang]').forEach((x) => {
    x.onclick = () => {
      const l = x.dataset.lang;
      if (l === getLang()) return;
      setLang(l);
      const cash = state.wallets.find((w) => w.id === 'cash');
      if (cash && ['Tiền mặt', 'Cash'].includes(cash.name)) cash.name = l === 'en' ? 'Cash' : 'Tiền mặt';
      defaultCurrency();
      commit();
      ctx.rerender();
    };
  });
  root.querySelectorAll('[data-cur]').forEach((x) => {
    x.onclick = () => {
      curChosen = true;
      state.currency = x.dataset.cur;
      commit();
      ctx.rerender();
    };
  });
  const restore = root.querySelector('[data-restore]');
  if (restore) restore.onclick = async () => {
    restore.disabled = true;
    try {
      await backup.connect(true);
      await backup.syncNow(true);
      if (state.onboarded) { toast('Đã khôi phục dữ liệu', 'ok'); ctx.go('home'); }
      else toast('Không tìm thấy bản sao lưu — hãy thiết lập mới', 'info');
    } catch (e) {
      toast(e.message, 'error');
    }
    restore.disabled = false;
  };
}

function stepSalary() {
  const sal = state.recurring.find((r) => r.id === 'salary');
  return `<label class="field"><span>Bạn nhận lương ngày mấy?</span><select name="payday">
      ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${state.payday === i + 1 ? 'selected' : ''}>Ngày ${i + 1}</option>`).join('')}
    </select></label>
    <div class="field"><span>Lương mỗi tháng</span>${amountField(sal ? amountText(sal.amount) : '')}</div>
    ${walletField('wallet', 'Lương về ví nào', sal?.wallet || lastWallet())}`;
}

function stepWallets() {
  return `<p class="muted">Nhập số dư hiện tại (đã gồm lương đã nhận) — app tự cộng / trừ khi bạn ghi thu chi.</p>
    <div class="set-list">${state.wallets.filter((w) => !w.hidden).map((w) => `<button type="button" class="set-row" data-w="${esc(w.id)}">
      <span class="bd-ic">${walletIcon(w.type)}</span>
      <span class="set-main"><b>${esc(w.name)}</b></span>
      <span class="bd-amt">${fmt(walletBalance(w, state.txs).balance)}</span></button>`).join('')}</div>
    <button type="button" class="btn" data-add>+ Thêm ví</button>`;
}

function stepJars() {
  return `<div class="set-jars">${state.jars.map((j) => `<label class="jar-pct"><span><b>${esc(j.name)}</b> <small class="muted">${JAR_DESC[j.id] || ''}</small></span>
      <span class="pct-input"><input name="${esc(j.id)}" type="number" inputmode="numeric" min="0" max="100" step="1" value="${Number(j.pct) || 0}"><span>%</span></span></label>`).join('')}
    <p class="jar-total" aria-live="polite"></p></div>`;
}
