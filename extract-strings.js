// extract-strings.js  (v2 - tự gộp text qua nhiều trang)
//
// Mục đích: Thu thập TẤT CẢ text tiếng Anh trên website, kể cả khi website có nhiều trang.
// Script này sẽ NHỚ những gì đã quét trước đó (lưu trong localStorage của trình duyệt),
// nên bạn chỉ cần chạy lại trên từng trang khác — nó tự gộp.
//
// Cách dùng:
//   1. Mở Edge, vào trang ĐẦU TIÊN của website
//   2. F12 → tab Console → paste toàn bộ snippet này → Enter
//      (lần đầu Edge có thể chặn dán code → gõ "allow pasting" Enter rồi dán lại)
//   3. Console hiện: "Trang này: thêm N chuỗi mới. TỔNG: X chuỗi"
//   4. Mở trang TIẾP THEO của website → F12 → Console → paste lại snippet → Enter
//      → nó tự cộng dồn vào danh sách cũ
//   5. Lặp lại cho mọi trang con (About, Products, Contact, Blog, ...)
//   6. SAU CÙNG, ở bất kỳ trang nào, dán clipboard (Ctrl+V) vào file strings.json
//   7. (Tuỳ chọn) Để reset và bắt đầu lại từ đầu:
//        localStorage.removeItem("__deepl_extract_strings__")

(function () {
  var STORAGE_KEY = '__deepl_extract_strings__';

  var existing = new Set();
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) JSON.parse(stored).forEach(function (s) { existing.add(s); });
  } catch (e) {}
  var before = existing.size;

  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      var p = n.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      var tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') {
        return NodeFilter.FILTER_REJECT;
      }
      if (p.closest('.lang-inline-card')) return NodeFilter.FILTER_REJECT;
      if (!/[A-Za-zÀ-ỹ]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  var node;
  while ((node = walker.nextNode())) {
    existing.add(node.nodeValue.trim());
  }

  var added = existing.size - before;
  var arr = Array.from(existing).sort();

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}

  var result = JSON.stringify(arr, null, 2);
  if (typeof copy === 'function') {
    copy(result);
  }

  console.log(result);
  console.log(
    '%c✓ Trang này: thêm ' + added + ' chuỗi mới. TỔNG cộng: ' + arr.length + ' chuỗi (đã copy vào clipboard).',
    'color:green;font-weight:bold;font-size:14px'
  );
  console.log('%c→ Mở trang tiếp theo trên website của bạn rồi chạy lại snippet này.', 'color:#666');
  console.log('%c→ Khi đã quét xong tất cả các trang, dán clipboard vào strings.json.', 'color:#666');
  console.log('%c→ Reset (xoá danh sách đã quét, bắt đầu lại): localStorage.removeItem("' + STORAGE_KEY + '")', 'color:#999');
})();
