// Áp sáng / tối và ngôn ngữ trước khi vẽ trang.
(function () {
  try {
    var d = document.documentElement;
    var t = localStorage.getItem('wl.theme');
    if (t === 'light' || t === 'dark') d.setAttribute('data-theme', t);
    var l = localStorage.getItem('wl.lang') || ((navigator.language || '').toLowerCase().indexOf('vi') === 0 ? 'vi' : 'en');
    d.lang = l;
  } catch (e) {}
})();
