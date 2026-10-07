import { state, commit, replaceState, serialize, parseBackup } from '../store.js';
import { openSheet } from '../sheet.js';
import { generateRecurring, catMap, monthKey, localToday, shiftMonth, mergeBudget, movePayday, JAR_DESC } from '../budget.js';
import { fmt, parseAmount } from '../money.js';
import { esc, uid, toast, downloadFile } from '../util.js';
import { tr, setLang, getLang, locale } from '../i18n.js';
import * as backup from '../backup.js';
import { amountField, amountText, bindAmount, typeSwitch, bindTypeAndCats, walletField, lastWallet } from './entry.js';

// Tab Cài đặt: kỳ lương, sao lưu Google Drive, khoản tự động, chia thu nhập (tỷ lệ hũ), danh mục, giao diện, dữ liệu.
// Danh sách bấm để sửa trong bảng có nhãn rõ ràng.

const EVERY = { 1: 'Hằng tháng', 2: '2 tháng/lần', 3: '3 tháng/lần', 6: '6 tháng/lần', 12: 'Hằng năm' };
const ICONS = ['🍜', '🍱', '☕', '🧋', '🛒', '🛵', '🚗', '⛽', '🚌', '📱', '💡', '💧', '🏠', '👪', '💊', '🏥', '🎓', '📚', '👕', '🛍️',
  '💄', '✈️', '🎮', '🎬', '🎁', '🐶', '👶', '💳', '🏦', '🛟', '🪙', '📈', '💼', '🎉', '📊', '➕', '💰', '🧾', '🔧', '❤️'];
const THEMES = [['light', 'Sáng'], ['dark', 'Tối'], ['auto', 'Tự động']];

const days = (sel) => Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>Ngày ${i + 1}</option>`).join('');
const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `Tháng ${Number(m)}/${y}`; };
const walletName = (id) => state.wallets.find((w) => w.id === id)?.name;
const usage = (b, catId) => b.txs.filter((t) => t.cat === catId).length + b.recurring.filter((r) => r.cat === catId).length;
const theme = () => { try { return localStorage.getItem('wl.theme') || 'auto'; } catch { return 'auto'; } };
const seg = (attr, items, cur) => `<div class="seg">${items.map(([v, label]) =>
  `<button type="button" data-${attr}="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${label}</button>`).join('')}</div>`;

export function renderSettings(body, ctx) {
  const b = state;
  const cats = catMap(b);
  body.innerHTML = `
    <div class="card">
      <h3>Kỳ lương</h3>
      <label class="field"><span>Ngày nhận lương</span><select name="payday">${days(b.payday)}</select></label>
      <p class="muted small">Kỳ lương tính từ ngày này đến trước ngày nhận lương tháng sau.</p>
    </div>

    <div class="card bk">
      <h3>Sao lưu Google Drive</h3>
      ${backupHtml()}
    </div>

    <div class="card">
      <div class="card-head"><h3>Khoản tự động hằng tháng</h3><button type="button" class="btn" data-add-rec>+ Thêm</button></div>
      <p class="muted small">Lương, tiền nhà, hóa đơn… tự ghi vào đúng ngày, không cần nhập tay mỗi tháng.</p>
      ${b.recurring.length ? `<div class="set-list">${b.recurring.map((r) => recRow(r, cats)).join('')}</div>`
        : '<p class="empty">Chưa có khoản tự động nào.</p>'}
    </div>

    <div class="card">
      <h3>Chia thu nhập</h3>
      <p class="muted small">Mỗi khi có thu nhập, app chia theo tỷ lệ này để tính "Còn tiêu được" và mục tiêu để dành.</p>
      <form id="jar-form" class="set-jars" novalidate>
        ${b.jars.map((j) => `<label class="jar-pct"><span><b>${esc(j.name)}</b> <small class="muted">${JAR_DESC[j.id] || ''}</small></span>
          <span class="pct-input"><input name="${esc(j.id)}" type="number" inputmode="numeric" min="0" max="100" step="1" value="${Number(j.pct) || 0}"><span>%</span></span></label>`).join('')}
        <p class="jar-total" aria-live="polite"></p>
        <button class="btn primary">Lưu tỷ lệ</button>
      </form>
    </div>

    <div class="card">
      <div class="card-head"><h3>Danh mục</h3><button type="button" class="btn" data-add-cat>+ Thêm</button></div>
      ${['expense', 'income'].map((type) => `
        <h4 class="set-group">${type === 'expense' ? 'Chi' : 'Thu'}</h4>
        <div class="set-list">${b.categories.filter((c) => c.type === type).map((c) => catRow(b, c)).join('')}</div>`).join('')}
    </div>

    <div class="card">
      <h3>Giao diện</h3>
      <h4 class="set-group">Ngôn ngữ</h4>${seg('lang', [['vi', 'Tiếng Việt'], ['en', 'English']], getLang())}
      <h4 class="set-group">Chế độ</h4>${seg('mode', THEMES, theme())}
      <h4 class="set-group">Đơn vị tiền</h4>${seg('cur', [['VND', 'VND'], ['USD', 'USD']], b.currency)}
    </div>

    <div class="card">
      <h3>Dữ liệu</h3>
      <p class="muted small">Nhập file sẽ gộp với dữ liệu đang có trên máy, không xóa gì.</p>
      <div class="set-actions">
        <button type="button" class="btn" data-export>Xuất file</button>
        <label class="btn">Nhập file<input type="file" accept="application/json,.json" hidden data-import></label>
      </div>
    </div>

    <p class="set-foot small"><a href="privacy.html">Chính sách quyền riêng tư</a></p>`;

  body.querySelector('[name="payday"]').onchange = (e) => {
    const n = Number(e.target.value);
    movePayday(state, n);
    generateRecurring(state); // ngày lương mới có thể đã qua trong tháng này
    commit({ config: true });
    ctx.rerender();
    toast(`Đã đổi ngày nhận lương thành ngày ${n}`, 'ok');
  };
  bindBackup(body, ctx);
  body.querySelector('[data-add-rec]').onclick = () => openRec(null, ctx);
  body.querySelectorAll('[data-rec]').forEach((x) => {
    x.onclick = () => { const r = state.recurring.find((y) => y.id === x.dataset.rec); if (r) openRec(r, ctx); };
  });
  body.querySelector('[data-add-cat]').onclick = () => openCat(null, ctx);
  body.querySelectorAll('[data-cat-edit]').forEach((x) => {
    x.onclick = () => { const c = state.categories.find((y) => y.id === x.dataset.catEdit); if (c) openCat(c, ctx); };
  });
  bindJars(body.querySelector('#jar-form'), ctx);
  bindAppearance(body, ctx);
  bindData(body, ctx);
}

// ---------- Sao lưu Google Drive ----------

function backupHtml() {
  if (!backup.configured()) return '<p class="muted small">Bản này chưa bật sao lưu Google.</p>';
  if (!backup.connected()) return '<div class="set-actions"><button type="button" class="btn primary" data-bk="connect">Kết nối Google Drive</button></div>';
  const last = backup.lastBackup() ? new Date(backup.lastBackup()).toLocaleString(locale()) : 'chưa có';
  const err = backup.lastBackupError();
  return `<p class="muted small">Sao lưu lần cuối: ${esc(last)}</p>
    ${err ? `<p class="small neg">Lần sao lưu gần nhất bị lỗi: ${esc(err.message || String(err))}</p>` : ''}
    <div class="set-actions">
      <button type="button" class="btn primary" data-bk="sync">Sao lưu ngay</button>
      <button type="button" class="btn danger" data-bk="off">Ngắt kết nối</button>
    </div>`;
}

function bindBackup(root, ctx) {
  const btns = root.querySelectorAll('[data-bk]');
  const run = async (fn) => {
    btns.forEach((x) => { x.disabled = true; }); // khóa nút trong lúc chạy, tránh bấm 2 lần
    try {
      toast(await fn(), 'ok');
    } catch (e) {
      toast(e.message, 'error');
    }
    ctx.rerender();
  };
  const acts = {
    connect: () => run(() => backup.connect(true).then(() => backup.syncNow(true)).then(() => 'Đã kết nối và sao lưu')),
    sync: () => run(() => backup.syncNow(true).then((r) => (r === 'pulled' ? 'Đã cập nhật dữ liệu từ Google Drive' : 'Đã sao lưu'))),
    off: () => {
      if (!confirm('Ngắt kết nối Google Drive? Dữ liệu trên máy vẫn giữ nguyên.')) return;
      backup.disconnect();
      ctx.rerender();
      toast('Đã ngắt kết nối', 'ok');
    },
  };
  btns.forEach((x) => { x.onclick = acts[x.dataset.bk]; });
}

// ---------- Giao diện ----------

function bindAppearance(root, ctx) {
  root.querySelectorAll('[data-lang]').forEach((x) => {
    x.onclick = () => { if (x.dataset.lang === getLang()) return; setLang(x.dataset.lang); location.reload(); };
  });
  root.querySelectorAll('[data-mode]').forEach((x) => {
    x.onclick = () => {
      const t = x.dataset.mode;
      try { localStorage.setItem('wl.theme', t); } catch { /* bỏ qua */ }
      if (t === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', t);
      ctx.rerender();
    };
  });
  root.querySelectorAll('[data-cur]').forEach((x) => {
    x.onclick = () => {
      if (x.dataset.cur === state.currency) return;
      if (state.txs.length && !confirm('Đổi đơn vị tiền chỉ đổi ký hiệu, không quy đổi số tiền đã ghi. Tiếp tục?')) return;
      state.currency = x.dataset.cur;
      commit({ config: true });
      ctx.rerender();
    };
  });
}

// ---------- Dữ liệu ----------

function bindData(root, ctx) {
  root.querySelector('[data-export]').onclick = () => {
    downloadFile(`walley-${localToday()}.json`, serialize(state));
    toast('Đã xuất file', 'ok');
  };
  root.querySelector('[data-import]').onchange = async (e) => {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;
    try {
      let data;
      try {
        data = parseBackup(await file.text());
      } catch (err) {
        throw err instanceof SyntaxError ? new Error('File không đúng định dạng của Walley') : err;
      }
      if (confirm('Gộp dữ liệu trong file với dữ liệu trên máy này?')) {
        const useFile = confirm('Dùng cài đặt trong file (ví, danh mục, hũ, ngày lương, đơn vị tiền)? Chọn Hủy để giữ cài đặt trên máy này.');
        const local = JSON.parse(JSON.stringify(state));
        // ponytail: -1 / MAX để bên được chọn luôn thắng, bất kể configAt trong file
        local.configAt = useFile ? -1 : Number.MAX_SAFE_INTEGER;
        // giữ cài đặt máy: số tiền trong file đổi ký hiệu; dùng cài đặt file: số tiền trên máy đổi ký hiệu
        const diffCur = data.currency !== state.currency && (!useFile || state.txs.length > 0);
        replaceState(mergeBudget(local, data));
        commit({ config: true }); // configAt = bây giờ: lần đồng bộ Drive sau không ghi đè cấu hình vừa chọn
        ctx.rerender();
        toast('Đã nhập file', 'ok');
        if (diffCur) toast('Đơn vị tiền trong file khác máy này — số tiền không được quy đổi', 'info');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
    input.value = ''; // chọn lại đúng file đó lần sau vẫn chạy
  };
}

// ---------- Danh sách ----------

function recRow(r, cats) {
  const c = cats[r.cat];
  const w = r.wallet && walletName(r.wallet);
  return `<button type="button" class="set-row" data-rec="${esc(r.id)}">
    <span class="bd-ic">${esc(c?.icon || '•')}</span>
    <span class="set-main"><b>${esc(c?.name || r.cat)}${r.note ? ` · ${esc(r.note)}` : ''}</b>
      <small>Ngày ${Number(r.day) || 1} · ${EVERY[r.every || 1] || `${Number(r.every) || 1} tháng/lần`}${w ? ` · ${esc(w)}` : ''}</small></span>
    <span class="bd-amt ${r.type === 'income' ? 'pos' : ''}">${r.type === 'income' ? '+' : '−'}${fmt(Number(r.amount))}</span>
  </button>`;
}

function catRow(b, c) {
  const jar = c.type === 'expense' ? b.jars.find((j) => j.id === (c.jar || 'nec'))?.name : '';
  return `<button type="button" class="set-row" data-cat-edit="${esc(c.id)}">
    <span class="bd-ic">${esc(c.icon || '•')}</span>
    <span class="set-main"><b>${esc(c.name)}</b>${jar ? `<small>Hũ ${esc(jar)}</small>` : ''}</span>
    <span class="chev" aria-hidden="true">›</span>
  </button>`;
}

// ---------- Khoản tự động ----------

function openRec(r, ctx) {
  const editing = Boolean(r);
  const ui = { type: r?.type || 'expense', cat: r?.cat || null };
  const nowYm = monthKey(localToday());
  const start = r?.startMonth || nowYm;
  const months = Array.from({ length: 25 }, (_, i) => shiftMonth(nowYm, i - 12));
  if (!months.includes(start)) months.unshift(start); // khoản cũ bắt đầu xa hơn 12 tháng
  openSheet({
    title: editing ? 'Sửa khoản tự động' : 'Thêm khoản tự động',
    body: `<form class="entry" novalidate>
      ${typeSwitch()}
      ${amountField(r ? amountText(r.amount) : '', !editing)}
      <div class="entry-cats"></div>
      <div class="field-row">
        <label class="field"><span>Vào ngày</span><select name="day">${days(Number(r?.day) || state.payday)}</select></label>
        <label class="field"><span>Lặp lại</span><select name="every">
          ${Object.entries(EVERY).map(([k, v]) => `<option value="${k}" ${String(r?.every || 1) === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Bắt đầu từ</span><select name="startMonth">
          ${months.map((m) => `<option value="${esc(m)}" ${m === start ? 'selected' : ''}>${esc(monthLabel(m))}</option>`).join('')}
        </select></label>
        ${walletField('wallet', 'Ví', r?.wallet || lastWallet())}
      </div>
      <label class="field"><span>Ghi chú</span>
        <input name="note" placeholder="Không bắt buộc" autocomplete="off" maxlength="120" value="${esc(r?.note || '')}"></label>
      ${editing ? '<p class="muted small">Thay đổi áp dụng cho các lần sau; các khoản đã ghi giữ nguyên.</p>' : ''}
      <button class="btn primary big">${editing ? 'Lưu thay đổi' : 'Thêm khoản tự động'}</button>
      ${editing ? '<button type="button" class="link danger entry-del">Xóa khoản tự động</button>' : ''}
    </form>`,
    onMount: (el, close) => {
      const form = el.querySelector('form');
      const amount = bindAmount(el);
      const cats = bindTypeAndCats(el, state, ui);
      form.onsubmit = (e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(form));
        const value = parseAmount(f.amount);
        if (!(value > 0)) { amount.classList.add('invalid'); amount.focus(); return toast('Nhập số tiền lớn hơn 0', 'error'); }
        if (!ui.cat) { cats.classList.add('invalid'); return toast('Chọn danh mục', 'error'); }
        const data = {
          type: ui.type, amount: value, cat: ui.cat, note: String(f.note || '').trim(),
          day: Math.min(31, Math.max(1, Number(f.day) || 1)), every: Number(f.every) || 1,
          startMonth: f.startMonth || nowYm, wallet: f.wallet || null, active: true,
        };
        if (editing) {
          const cur = state.recurring.find((x) => x.id === r.id);
          if (!cur) return toast('Không tìm thấy khoản này — có thể vừa bị xóa trên máy khác', 'error');
          Object.assign(cur, data);
        } else {
          state.recurring.push({ id: uid(), ...data });
        }
        const added = generateRecurring(state); // ghi luôn các lần đã đến hạn (tính từ "Bắt đầu từ")
        commit({ config: true });
        close();
        ctx.rerender();
        const name = catMap(state)[ui.cat]?.name || '';
        toast(added ? `Đã lưu khoản tự động ${name} · đã ghi ${added} khoản đến hôm nay` : `Đã lưu khoản tự động ${name}`, 'ok', added ? 7000 : undefined);
      };
      el.querySelector('.entry-del')?.addEventListener('click', () => {
        const i = state.recurring.findIndex((x) => x.id === r.id);
        if (i < 0) return close();
        const [gone] = state.recurring.splice(i, 1);
        commit({ config: true });
        close();
        ctx.rerender();
        toast('Đã xóa khoản tự động (các khoản đã ghi vẫn giữ)', 'ok', {
          action: {
            label: 'Hoàn tác',
            run: () => {
              state.recurring.splice(Math.min(i, state.recurring.length), 0, gone);
              commit({ config: true });
              ctx.rerender();
              toast('Đã khôi phục khoản tự động', 'ok');
            },
          },
        });
      });
    },
  });
}

// ---------- Danh mục ----------

function openCat(c, ctx) {
  const editing = Boolean(c);
  const ui = { type: c?.type || 'expense', icon: c?.icon || ICONS[0] };
  const icons = c?.icon && !ICONS.includes(c.icon) ? [c.icon, ...ICONS] : ICONS; // giữ biểu tượng tự gõ trước đây
  openSheet({
    title: editing ? 'Sửa danh mục' : 'Thêm danh mục',
    body: `<form class="entry" novalidate>
      ${editing ? `<p class="muted small">Danh mục ${c.type === 'income' ? 'thu' : 'chi'}</p>` : typeSwitch()}
      <label class="field"><span>Tên danh mục</span>
        <input name="name" placeholder="Ví dụ: Tiền nhà" autocomplete="off" maxlength="40" value="${esc(c?.name || '')}" ${editing ? '' : 'autofocus'}></label>
      <div class="field"><span>Biểu tượng</span>
        <div class="icon-grid" role="radiogroup" aria-label="Biểu tượng">${icons.map((i) => `
          <button type="button" data-icon="${esc(i)}" role="radio" aria-checked="${i === ui.icon}" class="${i === ui.icon ? 'on' : ''}">${esc(i)}</button>`).join('')}</div></div>
      <fieldset class="field jar-field">
        <legend>Thuộc hũ</legend>
        ${state.jars.map((j) => `<label class="radio-row"><input type="radio" name="jar" value="${esc(j.id)}" ${(c?.jar || 'nec') === j.id ? 'checked' : ''}>
          <span><b>${esc(j.name)}</b> <small class="muted">${JAR_DESC[j.id] || ''}</small></span></label>`).join('')}
      </fieldset>
      <button class="btn primary big">${editing ? 'Lưu thay đổi' : 'Thêm danh mục'}</button>
      ${editing ? '<button type="button" class="link danger entry-del">Xóa danh mục</button>' : ''}
    </form>`,
    onMount: (el, close) => {
      const form = el.querySelector('form');
      const name = form.elements.name;
      const jarField = el.querySelector('.jar-field');
      const showJar = () => { jarField.hidden = ui.type !== 'expense'; }; // danh mục thu không thuộc hũ nào
      const types = el.querySelectorAll('[data-type]');
      const markType = () => types.forEach((y) => {
        y.classList.toggle('on', y.dataset.type === ui.type);
        y.setAttribute('aria-pressed', String(y.dataset.type === ui.type));
      });
      types.forEach((x) => { x.onclick = () => { ui.type = x.dataset.type; markType(); showJar(); }; });
      markType();
      showJar();
      el.querySelectorAll('[data-icon]').forEach((x) => {
        x.onclick = () => {
          ui.icon = x.dataset.icon;
          el.querySelectorAll('[data-icon]').forEach((y) => {
            y.classList.toggle('on', y === x);
            y.setAttribute('aria-checked', String(y === x));
          });
        };
      });
      name.addEventListener('input', () => name.classList.remove('invalid'));

      form.onsubmit = (e) => {
        e.preventDefault();
        const n = name.value.trim();
        if (!n) { name.classList.add('invalid'); name.focus(); return toast('Nhập tên danh mục', 'error'); }
        const type = editing ? c.type : ui.type;
        if (state.categories.some((x) => x.type === type && x.id !== c?.id && x.name.trim().toLowerCase() === n.toLowerCase())) {
          name.classList.add('invalid');
          return toast('Đã có danh mục tên này', 'error');
        }
        const jar = type === 'expense' ? new FormData(form).get('jar') || 'nec' : undefined;
        if (editing) {
          const cur = state.categories.find((x) => x.id === c.id);
          if (!cur) return toast('Không tìm thấy danh mục này — có thể vừa bị xóa trên máy khác', 'error');
          Object.assign(cur, { name: n, icon: ui.icon, jar });
        } else {
          state.categories.push({ id: uid(), name: n, icon: ui.icon, type, jar });
        }
        commit({ config: true });
        close();
        ctx.rerender();
        toast(editing ? `Đã lưu danh mục ${n}` : `Đã thêm danh mục ${n}`, 'ok');
      };

      el.querySelector('.entry-del')?.addEventListener('click', () => {
        const used = usage(state, c.id);
        if (used) return toast(`Không xóa được: còn ${used} khoản dùng danh mục này`, 'error');
        const i = state.categories.findIndex((x) => x.id === c.id);
        if (i < 0) return close();
        const [gone] = state.categories.splice(i, 1);
        commit({ config: true });
        close();
        ctx.rerender();
        toast(`Đã xóa danh mục ${gone.name}`, 'ok', {
          action: {
            label: 'Hoàn tác',
            run: () => {
              state.categories.splice(Math.min(i, state.categories.length), 0, gone);
              commit({ config: true });
              ctx.rerender();
              toast(`Đã khôi phục danh mục ${gone.name}`, 'ok');
            },
          },
        });
      });
    },
  });
}

// ---------- Chia thu nhập ----------

function bindJars(form, ctx) {
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
    if (t !== 100) return toast(`Tổng tỷ lệ đang là ${t}%, cần bằng 100%`, 'error');
    state.jars = state.jars.map((j) => ({ ...j, pct: pct(j.id) }));
    commit({ config: true });
    ctx.rerender();
    toast('Đã lưu cách chia thu nhập', 'ok');
  };
}
