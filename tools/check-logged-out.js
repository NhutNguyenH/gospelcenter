// check-logged-out.js — DevTools snippet. CHẠY TRƯỚC extract-strings.js.
//
// Vì sao cần: extract-strings.js quét TOÀN BỘ DOM và không lọc theo hiển thị
// (xem extract-strings.js dòng 84-99). Menu quản trị Cornerstone dù đang ẩn
// hoặc thu gọn vẫn bị bắt vào strings/*.json. Đó chính là lý do
// strings/home.json có ~120 mục admin (Kundereskontro, Fakturajournaler,
// Kontoplan...) dù lúc extract nhìn màn hình thấy "sạch".
//
// Cách dùng:
//   1. Mở Edge InPrivate (Ctrl+Shift+N) → vào trang public.
//   2. F12 → Console → dán TOÀN BỘ file này → Enter.
//      (Edge chặn dán lần đầu → gõ  allow pasting  rồi Enter, dán lại)
//   3. Chỉ chạy extract-strings.js khi thấy dòng XANH "AN TOÀN".

(function () {
  // Các nhãn chỉ xuất hiện khi đã đăng nhập builder. Đây là những chuỗi đã
  // thực sự lọt vào strings/home.json trong lần extract hỏng trước đó.
  var ADMIN_WORDS = [
    'Kundereskontro', 'Fakturajournaler', 'Kontoplan', 'Aldersfordelt saldoliste',
    'Svindelforebygging', 'Designmodus', 'Spørreundersøkelser', 'Medlemsavgifter',
    'Logg ut', 'Min konto', 'Innboks', 'Utforsker', 'Systemmeldinger',
    'Standardverdier for modulvinduer', 'Eksporter fødselsnummer',
  ];

  var html = document.body.innerHTML;
  var found = ADMIN_WORDS.filter(function (w) { return html.indexOf(w) !== -1; });

  // Cornerstone gắn tiền tố cs- lên phần tử của giao diện quản trị.
  var csEls = document.querySelectorAll('[class^="cs-"], [class*=" cs-"]').length;
  var modules = (html.match(/_module\//g) || []).length;

  console.log('--- Kiểm tra trước khi extract ---');
  console.log('Nhãn admin tìm thấy trong DOM :', found.length ? found.join(', ') : 'không có');
  console.log('Phần tử class cs-*            :', csEls);
  console.log('Tham chiếu _module/           :', modules);

  if (found.length || csEls > 0 || modules > 0) {
    console.log(
      '%c❌ KHÔNG AN TOÀN — trang đang có giao diện quản trị trong DOM.\n' +
      'ĐỪNG extract. Hãy đóng hết cửa sổ InPrivate, mở lại cửa sổ InPrivate MỚI,\n' +
      'gõ thẳng địa chỉ trang public (đừng bấm từ tab builder), rồi chạy lại kiểm tra này.',
      'color:#c00;font-weight:bold;font-size:14px'
    );
  } else {
    console.log(
      '%c✅ AN TOÀN — không thấy dấu vết quản trị. Chạy extract-strings.js được rồi.',
      'color:green;font-weight:bold;font-size:14px'
    );
  }
})();
