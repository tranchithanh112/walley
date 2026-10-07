import { fmt as fmtMoney } from './money.js';
import { tr } from './i18n.js';

// Bảng màu phân loại — lấy theo theme đang chọn (biến CSS --chart), xem loadPalette()
export const PALETTE = ['#b8905f', '#e3c48d', '#3aa99f', '#e05a5a', '#8c7b6b', '#5b8def', '#c46f3d', '#4caf7a', '#a06cb4', '#a89b8c'];

/** Cập nhật PALETTE (tại chỗ) theo theme hiện tại; gọi trước mỗi lần render. */
export function loadPalette() {
  const v = css('--chart');
  const list = v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (list.length >= 4) PALETTE.splice(0, PALETTE.length, ...list);
}

const charts = new Map();

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function mount(canvas, config) {
  if (!window.Chart || !canvas) return;
  config.options ||= {};
  // dịch nhãn (legend / tooltip) theo ngôn ngữ đang chọn
  config.data.labels = config.data.labels?.map((l) => tr(l));
  for (const d of config.data.datasets) if (d.label) d.label = tr(d.label);
  charts.get(canvas.id)?.destroy();
  charts.set(canvas.id, new window.Chart(canvas, config));
}

/** Biểu đồ cột nhóm (vd thu / chi theo kỳ). fmt để đổi cách hiện số. */
export function bars(canvas, labels, datasets, { fmt = fmtMoney } = {}) {
  mount(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((d, i) => ({ backgroundColor: d.color || PALETTE[i], borderRadius: 3, maxBarThickness: 28, ...d })),
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { ticks: { color: css('--muted') }, grid: { display: false } },
        y: { ticks: { color: css('--muted'), callback: (v) => fmt(v, { compact: true }) }, grid: { color: css('--grid') } },
      },
      plugins: {
        legend: { labels: { color: css('--text'), boxWidth: 10 } },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.raw)}` } },
      },
    },
  });
}
