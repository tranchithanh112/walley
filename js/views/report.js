import { state } from '../store.js';
import { periodSummary, catMap, SPEND_JARS, localToday } from '../budget.js';
import { periodOf, shiftPeriod } from '../period.js';
import { bars, PALETTE, loadPalette } from '../charts.js';
import { fmt } from '../money.js';
import { esc } from '../util.js';
import { dm, periodLabel } from './home.js';

// Màn "Báo cáo": tiêu vào đâu, để dành bao nhiêu, 6 kỳ lương gần nhất.

const ui = { key: null, curKey: null };

export function renderReport(root, ctx) {
  const cur = periodOf(localToday(), state.payday);
  if (!ui.key || ui.key === ui.curKey) ui.key = cur.key; // đang xem kỳ hiện tại → theo kỳ mới
  ui.curKey = cur.key;
  if (ui.key > cur.key) ui.key = cur.key;
  const p = shiftPeriod(ui.key, 0, state.payday);
  const S = periodSummary(state, p);
  const cats = catMap(state);
  const rows = Object.entries(S.byCat)
    .map(([id, v]) => ({ id, v, c: cats[id] }))
    .sort((x, y) => y.v - x.v);
  const isSpend = (r) => SPEND_JARS.has(r.c?.jar || 'nec');
  const spendRows = rows.filter(isSpend);
  const saveRows = rows.filter((r) => !isSpend(r));
  const ps = Array.from({ length: 6 }, (_, i) => shiftPeriod(ui.key, i - 5, state.payday));
  const trend = ps.map((q) => periodSummary(state, q));

  root.innerHTML = `
    <div class="bd-head">
      <div class="month-nav">
        <button class="btn" data-shift="-1" aria-label="Kỳ trước">‹</button>
        <b>Kỳ lương ${periodLabel(p)}</b>
        <button class="btn" data-shift="1" aria-label="Kỳ sau" ${ui.key >= cur.key ? 'disabled' : ''}>›</button>
      </div>
    </div>
    ${summaryLine(S)}
    <div class="card">
      <h3>Tiêu vào đâu</h3>
      ${spendRows.length ? barList(spendRows, S.spend) : '<p class="empty">Chưa có khoản tiêu nào trong kỳ.</p>'}
    </div>
    <div class="card">
      <h3>Để dành & đầu tư</h3>
      ${saveRows.length ? barList(saveRows, S.saved) : '<p class="empty">Chưa có khoản để dành nào trong kỳ.</p>'}
    </div>
    <div class="card">
      <h3>6 kỳ gần nhất</h3>
      <div class="chart"><canvas id="bd-trend"></canvas></div>
    </div>`;

  root.querySelectorAll('[data-shift]').forEach((btn) => {
    btn.onclick = () => { ui.key = shiftPeriod(ui.key, Number(btn.dataset.shift), state.payday).key; ctx.rerender(); };
  });

  const canvas = root.querySelector('#bd-trend');
  const draw = () => {
    loadPalette();
    bars(canvas, ps.map((q) => dm(q.start)), [
      { label: 'Thu vào', data: trend.map((m) => m.income), color: PALETTE[2] },
      { label: 'Tiêu', data: trend.map((m) => m.spend), color: PALETTE[3] },
      { label: 'Để dành', data: trend.map((m) => m.saved), color: PALETTE[1] },
    ], { fmt });
  };
  // Chart.js tải async từ CDN: chờ tới ~3s nếu chưa có (dừng nếu canvas đã bị vẽ lại)
  let tries = 0;
  const tick = () => {
    if (!canvas.isConnected) return;
    if (window.Chart) draw();
    else if (tries++ < 30) setTimeout(tick, 100);
  };
  tick();
}

/** Một câu dễ hiểu thay cho công thức "tỷ lệ tiết kiệm". */
function summaryLine(S) {
  if (!(S.income > 0)) return '';
  if (S.spend > S.income) return `<p class="bd-insight neg">Kỳ này bạn tiêu nhiều hơn thu nhập ${fmt(S.spend - S.income)}.</p>`;
  return `<p class="bd-insight">Kỳ này bạn giữ lại được ${Math.round(S.savingsRate * 100)}% thu nhập.</p>`;
}

function barList(rows, total) {
  return `<ul class="bd-bars">${rows.map(({ id, v, c }) => {
    const pct = total > 0 ? (v / total) * 100 : 0;
    return `<li>
      <span class="bd-bars-name">${esc(c?.icon || '•')} ${esc(c?.name || id)}</span>
      <span class="bd-bars-val">${fmt(v)} <small class="muted">${Math.round(pct)}%</small></span>
      <span class="bar"><i style="width:${pct.toFixed(1)}%"></i></span>
    </li>`;
  }).join('')}</ul>`;
}
