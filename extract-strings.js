// extract-strings.js  (v2 - tự gộp text qua nhiều trang)
//
// Mục đích: Thu thập text tiếng Anh trên một trang của website.
//
// Workflow MỚI (strings/ theo từng trang):
//   1. Mở Edge, vào trang muốn quét (ví dụ: home).
//   2. F12 → tab Console → paste toàn bộ snippet này → Enter.
//      (lần đầu Edge có thể chặn dán code → gõ "allow pasting" Enter rồi dán lại)
//   3. Console hiện: "Trang này: thêm N chuỗi mới. TỔNG: X chuỗi"
//      Clipboard tự động chứa MẢNG JSON các chuỗi vừa quét.
//   4. Mở/tạo file strings/<tên-trang>.json (ví dụ: strings/home.json),
//      dán toàn bộ nội dung clipboard vào, lưu lại.
//   5. TRƯỚC khi sang trang khác, chạy lệnh sau ở Console để reset:
//        localStorage.removeItem("__deepl_extract_strings__")
//      Rồi mở trang kế tiếp và lặp lại từ bước 2 cho file strings/<trang-kế>.json.
//
// Lưu ý: localStorage tích luỹ giữa các lần chạy nếu KHÔNG reset — phù hợp khi
// muốn dồn tất cả vào MỘT file, nhưng KHÔNG phù hợp với workflow per-page mới.

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
  console.log('%c→ Dán clipboard vào strings/<tên-trang>.json (vd: strings/home.json).', 'color:#666');
  console.log('%c→ Trước khi sang trang khác, RESET: localStorage.removeItem("' + STORAGE_KEY + '")', 'color:#666');
  console.log('%c→ Sau khi reset, mở trang kế tiếp và chạy lại snippet này.', 'color:#999');
})();
