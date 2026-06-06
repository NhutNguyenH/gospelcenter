// extract-strings.js  (v3 - element-level extraction)
//
// Mục đích: Thu thập chuỗi tiếng Anh trên website ở MỨC ELEMENT (cả paragraph,
// heading, link, button), bao gồm inline HTML tags (<strong>, <em>, <a>) trong key.
// Giúp Gemini dịch nguyên câu có ngữ pháp đúng — không còn vấn đề fragment vỡ vụn
// như v2 (per-text-node).
//
// Workflow (theo từng trang):
//   1. Mở Edge InPrivate (Ctrl+Shift+N), vào trang PUBLIC (KHÔNG login builder,
//      KHÔNG design mode — tránh nhiễm admin menu).
//   2. Bấm EN để trang về tiếng Anh gốc. ← QUAN TRỌNG, xem quy tắc bên dưới.
//   3. F12 → Console → paste TOÀN BỘ snippet này → Enter.
//      (lần đầu Edge có thể chặn dán code → gõ "allow pasting" Enter rồi dán lại)
//   4. Console hiện: "Trang này: thêm N chuỗi mới. TỔNG: X chuỗi"
//      Clipboard tự động chứa MẢNG JSON các chuỗi vừa quét.
//   5. Mở/tạo file strings/<tên-trang>.json (vd strings/home.json), dán lên,
//      lưu lại.
//   6. TRƯỚC khi sang trang khác, reset state:
//        localStorage.removeItem("__deepl_extract_strings__")
//      Rồi mở trang kế tiếp và lặp lại từ bước 2.
//
// QUY TẮC NGÔN NGỮ (tránh sinh entry trùng):
//   • LUÔN bấm EN trước khi extract, để key luôn ở cùng một mặt bằng ngôn ngữ.
//   • MỖI TRANG chỉ extract MỘT lần. KHÔNG extract lại cùng trang đó ở VI/NO.
//   Lý do: widget key bản dịch theo text gốc của element. Nếu extract cùng một
//   element ở các ngôn ngữ khác nhau, ta tạo ra nhiều key cho cùng một khái niệm
//   (vd "Camps" / "Các Kì Trại" / "Leirer" đều là "camps") → translations.json
//   phình + khó bảo trì. (widget.js có reverse-index đỡ được phần lớn, nhưng
//   vẫn nên extract nhất quán để dữ liệu sạch.)
//
// Lưu ý so với v2: keys có thể chứa tag inline như <strong>cell groups</strong>.
// Đó là chủ đích — widget.js sẽ sanitize và đặt lại qua innerHTML.

(function () {
  var STORAGE_KEY = '__deepl_extract_strings__';

  // Outermost translatable elements. div thêm vào để cover card title
  // (<div>Lectures</div>); hasDirectText filter tự loại layout div không
  // có direct text.
  var TRANSLATABLE = 'p,h1,h2,h3,h4,h5,h6,li,button,a,blockquote,label,td,th,dd,dt,summary,figcaption,caption,span,div';

  var existing = new Set();
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) JSON.parse(stored).forEach(function (s) { existing.add(s); });
  } catch (e) {}
  var before = existing.size;

  function normalize(html) {
    return html.replace(/\s+/g, ' ').trim();
  }

  // True nếu innerHTML chỉ chứa structural tags (<img>, <br>, ...) không có text.
  function isStructuralOnly(html) {
    return !html
      .replace(/<\/?(img|br|hr|input|meta|link|source|track|wbr)\b[^>]*>/gi, '')
      .replace(/\s+/g, '').length;
  }

  // Element phải có ít nhất 1 text node child trực tiếp (không nested).
  // Loại trừ <li><a>X</a></li> hoặc <a><img></a> — để con được walk thay vì
  // gói cả thẻ con vào key của parent.
  function hasDirectText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) return true;
    }
    return false;
  }

  // Ancestor "walking" = matches TRANSLATABLE AND would actually be walked
  // (has direct text). Nếu ancestor không có direct text, nó sẽ bị skip và
  // không nên block walker đi xuống con. Ví dụ <li><a>X</a></li>: <li> sẽ
  // bị skip → <a> KHÔNG có "walking ancestor" → walk <a> bình thường.
  function hasTranslatableAncestor(el) {
    var p = el.parentElement;
    while (p) {
      if (p.matches && p.matches(TRANSLATABLE) && hasDirectText(p)) return true;
      p = p.parentElement;
    }
    return false;
  }

  var elements = document.querySelectorAll(TRANSLATABLE);
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    if (el.closest('[data-no-translate]')) continue;
    if (el.closest('.lang-inline-card')) continue;
    if (hasTranslatableAncestor(el)) continue;
    if (!hasDirectText(el)) continue;
    var html = el.innerHTML;
    if (!html) continue;
    var key = normalize(html);
    if (!key) continue;
    if (isStructuralOnly(key)) continue;
    // Yêu cầu có ít nhất 1 ký tự chữ (loại trừ chuỗi chỉ là số/dấu)
    if (!/[A-Za-zÀ-ỹ]/.test(key)) continue;
    existing.add(key);
  }

  var added = existing.size - before;
  var arr = Array.from(existing).sort();

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}

  var result = JSON.stringify(arr, null, 2);
  if (typeof copy === 'function') copy(result);

  console.log(result);
  console.log(
    '%c✓ Trang này: thêm ' + added + ' chuỗi mới. TỔNG cộng: ' + arr.length + ' chuỗi (đã copy vào clipboard).',
    'color:green;font-weight:bold;font-size:14px'
  );
  console.log('%c→ Dán clipboard vào strings/<tên-trang>.json (vd strings/home.json).', 'color:#666');
  console.log('%c→ Trước khi sang trang khác, RESET: localStorage.removeItem("' + STORAGE_KEY + '")', 'color:#666');
  console.log('%c→ Sau khi reset, mở trang kế tiếp và chạy lại snippet này.', 'color:#999');
})();
