// widget.js v3 — Element-level translation (giữ inline HTML tags trong key).
// Fetch translations.json runtime với cache-bust. Được nạp qua jsDelivr;
// widget.html chỉ chứa CSS + UI + 1 thẻ <script src>.

(function () {
  // currentScript phải capture sync ngay khi script chạy — sau đó có thể null.
  // Khi website builder chèn <script> qua DOM, currentScript = null (async-by-default).
  // Fallback: tìm <script src="...widget.js"> trong DOM.
  function resolveScriptSrc() {
    if (document.currentScript && document.currentScript.src) {
      return document.currentScript.src;
    }
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i].src || '';
      if (/\/widget\.js(\?.*)?$/.test(s)) return s;
    }
    return '';
  }
  var SCRIPT_SRC = resolveScriptSrc();

  var TRANSLATIONS = (typeof window !== 'undefined' && window.WIDGET_TRANSLATIONS) || {};
  var STORAGE_KEY = 'site_lang_deepl';
  var DEFAULT_LANG = 'en';

  // Outermost translatable elements — phải khớp extract-strings.js.
  // div thêm vào để cover card title (vd <div>Lectures</div>); hasDirectText
  // filter sẽ tự loại layout div không có direct text.
  var TRANSLATABLE = 'p,h1,h2,h3,h4,h5,h6,li,button,a,blockquote,label,td,th,dd,dt,summary,figcaption,caption,span,div';

  var originalHTML = new Map();  // Element -> innerHTML ban đầu (English)
  var _widgetWriting = false;    // Guard cho MutationObserver: bỏ qua mutation do widget tự gây ra
  var REVERSE = Object.create(null);  // normalize(value en/vi/no) -> entry

  function normalize(html) {
    return html.replace(/\s+/g, ' ').trim();
  }

  // Reverse-index: map MỌI giá trị (en/vi/no) của mọi entry về chính entry đó.
  // Cho phép resolve bản dịch dù text trên trang đang ở ngôn ngữ nào (source
  // có thể là en, vi, hoặc no — hoặc element bị builder re-render ở trạng thái
  // đã dịch). Ưu tiên entry mà KEY === giá trị (self-identity = source canonical).
  function buildReverseIndex() {
    REVERSE = Object.create(null);
    for (var key in TRANSLATIONS) {
      if (!Object.prototype.hasOwnProperty.call(TRANSLATIONS, key)) continue;
      var entry = TRANSLATIONS[key];
      if (!entry || typeof entry !== 'object') continue;
      var fields = ['en', 'vi', 'no'];
      for (var i = 0; i < fields.length; i++) {
        var v = entry[fields[i]];
        if (typeof v !== 'string' || !v) continue;
        var nv = normalize(v);
        if (!REVERSE[nv] || normalize(key) === nv) REVERSE[nv] = entry;
      }
    }
  }

  // Tìm entry cho 1 key: ưu tiên match trực tiếp key (giữ khả năng phân biệt
  // giữa các entry trùng giá trị, vd Camps vs Các Kì Trại), sau đó mới fallback
  // sang reverse-index (lưới an toàn khi source không phải là key).
  function resolveEntry(key) {
    return TRANSLATIONS[key] || REVERSE[key] || null;
  }

  // Element phải có ít nhất 1 text node child trực tiếp (không nested).
  // Loại trừ trường hợp như <li><a>X</a></li> hoặc <a><img></a> — wrapper
  // không có direct text → để con (a) được walk thay vì gói cả thẻ vào key.
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

  function shouldSkipElement(el) {
    if (!el || !el.parentElement) return true;
    if (el.closest('[data-no-translate]')) return true;
    if (el.closest('.lang-inline-card')) return true;
    if (hasTranslatableAncestor(el)) return true;
    if (!hasDirectText(el)) return true;
    return false;
  }

  // Strict allowlist sanitizer cho bản dịch (Gemini output).
  // Cho phép: <strong>, <em>, <b>, <i>, <u>, <br>, <a href="...">
  // - Strip mọi attribute trừ `href` trên `<a>` (href phải scheme an toàn).
  // - Strip mọi tag khác (giữ text content phía trong).
  var ALLOW = { strong: 1, em: 1, b: 1, i: 1, u: 1, br: 1, a: 1 };
  var SAFE_HREF = /^(https?:\/\/|\/|#|mailto:)/i;
  function sanitizeTranslation(html) {
    if (!html) return '';
    return String(html).replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, function (m, tagRaw, attrs) {
      var tag = tagRaw.toLowerCase();
      if (!ALLOW[tag]) return '';
      var isClose = m.charAt(1) === '/';
      if (isClose) return '</' + tag + '>';
      if (tag === 'br') return '<br>';
      if (tag === 'a') {
        var hrefMatch = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
        if (!hrefMatch) return '<a>';
        var href = hrefMatch[2] != null ? hrefMatch[2]
          : (hrefMatch[3] != null ? hrefMatch[3] : hrefMatch[4]);
        if (!SAFE_HREF.test(href || '')) return '<a>';
        return '<a href="' + String(href).replace(/"/g, '&quot;') + '">';
      }
      return '<' + tag + '>';
    });
  }

  function collectElements(root) {
    var elements = root.querySelectorAll(TRANSLATABLE);
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (shouldSkipElement(el)) continue;
      var html = el.innerHTML;
      if (!html || !html.trim()) continue;
      if (!originalHTML.has(el)) originalHTML.set(el, html);
    }
  }

  function applyLang(lang) {
    collectElements(document.body);
    _widgetWriting = true;
    try {
      originalHTML.forEach(function (origHTML, el) {
        if (!el.isConnected) return;
        var key = normalize(origHTML);
        var entry = resolveEntry(key);
        if (entry && entry[lang]) {
          // Có bản dịch active cho language này (bao gồm cả "en" nếu source là
          // Norwegian/khác và đã có english translation). Apply.
          var safe = sanitizeTranslation(entry[lang]);
          var leading = origHTML.match(/^\s*/)[0];
          var trailing = origHTML.match(/\s*$/)[0];
          var newHTML = leading + safe + trailing;
          if (el.innerHTML !== newHTML) el.innerHTML = newHTML;
        } else if (lang === 'en') {
          // Không có entry.en → fallback: khôi phục origHTML (giả định source là
          // English hoặc user không cần dịch sang EN cho element này).
          if (el.innerHTML !== origHTML) el.innerHTML = origHTML;
        } else if (key) {
          if (!window._missDeepL) window._missDeepL = new Set();
          if (!window._missDeepL.has(key)) {
            window._missDeepL.add(key);
            if (window.console) {
              var preview = key.length > 80 ? key.slice(0, 80) + '…' : key;
              console.warn('[widget] Thiếu bản dịch:', JSON.stringify(preview));
            }
          }
        }
      });
    } finally {
      _widgetWriting = false;
    }

    var buttons = document.querySelectorAll('.lang-inline-card .lang-switcher button');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-lang') === lang) buttons[i].classList.add('active');
      else buttons[i].classList.remove('active');
    }
    document.documentElement.lang = lang === 'no' ? 'nb' : (lang === 'vi' ? 'vi' : 'en');
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.lang-inline-card .lang-switcher button');
    if (!btn) return;
    applyLang(btn.getAttribute('data-lang'));
  });

  function getSavedLang() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; }
    catch (e) { return DEFAULT_LANG; }
  }

  function init() {
    if (!TRANSLATIONS || Object.keys(TRANSLATIONS).length === 0) {
      if (window.console) console.warn('[widget] WIDGET_TRANSLATIONS rỗng — widget chỉ hiển thị tiếng Anh.');
    }
    buildReverseIndex();
    applyLang(getSavedLang());

    if (window.MutationObserver) {
      var debounce;
      var observer = new MutationObserver(function (mutations) {
        if (_widgetWriting) return; // Skip self-triggered mutations
        var hasNew = false;
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].type === 'childList' && mutations[i].addedNodes.length > 0) {
            for (var j = 0; j < mutations[i].addedNodes.length; j++) {
              var n = mutations[i].addedNodes[j];
              if (n.nodeType === 1 || n.nodeType === 3) { hasNew = true; break; }
            }
            if (hasNew) break;
          }
        }
        if (hasNew) {
          clearTimeout(debounce);
          debounce = setTimeout(function () { applyLang(getSavedLang()); }, 150);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function translationsUrl() {
    if (!SCRIPT_SRC) return null;
    var base = SCRIPT_SRC.replace(/widget\.js(\?.*)?$/, '');
    if (base === SCRIPT_SRC) return null;
    return base + 'translations.json?v=' + Date.now();
  }

  function loadTranslations() {
    var url = translationsUrl();
    if (!url || typeof fetch !== 'function') {
      return Promise.resolve();
    }
    // AbortController timeout 8s — fail-soft nếu mạng yếu.
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    return fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          TRANSLATIONS = data;
          try { window.WIDGET_TRANSLATIONS = data; } catch (e) {}
          buildReverseIndex();
        }
      })
      .catch(function (err) {
        if (window.console) console.warn('[widget] Không tải được translations.json:', err && err.message);
      })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  function whenReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  }

  // Chạy fetch và DOMContentLoaded song song; init sau khi cả hai xong.
  var loaded = loadTranslations();
  whenReady(function () { loaded.then(init); });
})();
