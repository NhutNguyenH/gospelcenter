// widget.js — Logic dịch text trong DOM. Đọc bản dịch từ window.WIDGET_TRANSLATIONS.
// Được nạp qua jsDelivr; widget.html chỉ chứa CSS + UI + 2 thẻ <script src>.

(function () {
  var TRANSLATIONS = (typeof window !== 'undefined' && window.WIDGET_TRANSLATIONS) || {};
  var STORAGE_KEY = 'site_lang_deepl';
  var DEFAULT_LANG = 'en';

  var originals = new Map();

  function shouldSkipNode(node) {
    var p = node.parentElement;
    if (!p) return true;
    if (p.closest('[data-no-translate]')) return true;
    if (p.closest('.lang-inline-card')) return true;
    var tag = p.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return true;
    return false;
  }

  function collectTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (shouldSkipNode(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var node;
    while ((node = walker.nextNode())) {
      if (!originals.has(node)) originals.set(node, node.nodeValue);
    }
  }

  function applyLang(lang) {
    collectTextNodes(document.body);
    originals.forEach(function (origText, node) {
      if (!node.isConnected) return;
      if (lang === 'en') {
        if (node.nodeValue !== origText) node.nodeValue = origText;
        return;
      }
      var key = origText.trim();
      var entry = TRANSLATIONS[key];
      if (entry && entry[lang]) {
        var leading = origText.match(/^\s*/)[0];
        var trailing = origText.match(/\s*$/)[0];
        node.nodeValue = leading + entry[lang] + trailing;
      } else if (key) {
        if (!window._missDeepL) window._missDeepL = new Set();
        if (!window._missDeepL.has(key)) {
          window._missDeepL.add(key);
          if (window.console) console.warn('[widget] Thiếu bản dịch:', JSON.stringify(key));
        }
      }
    });

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
    applyLang(getSavedLang());

    if (window.MutationObserver) {
      var debounce;
      var observer = new MutationObserver(function (mutations) {
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
