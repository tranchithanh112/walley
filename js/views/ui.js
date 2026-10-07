// Mẩu giao diện dùng chung giữa các tab.

/** Ô chọn ngày 1–31. */
export const daySelect = (name, sel) => `<select name="${name}">${Array.from({ length: 31 }, (_, i) =>
  `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>Ngày ${i + 1}</option>`).join('')}</select>`;

/** Nhóm nút chọn 1 trong nhiều: data-<attr>="giá trị". cls: lớp thêm (vd 'full'). */
export const seg = (attr, items, cur, cls = '') => `<div class="seg${cls ? ` ${cls}` : ''}">${items.map(([v, label]) =>
  `<button type="button" data-${attr}="${v}" class="${v === cur ? 'on' : ''}" aria-pressed="${v === cur}">${label}</button>`).join('')}</div>`;
