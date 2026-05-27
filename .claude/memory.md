# Memory — gospelcenter translation widget

> Update this file as project state changes. It is the source of truth across
> sessions. Keep entries concise and dated where it matters.

---

## Current Focus

**v3 element-level translation: READY TO PUSH** (2026-05-27).
Toàn bộ code + data đã sẵn sàng commit. Detail xem session log dưới.

State của working tree:
- `widget.js`, `extract-strings.js`, `translate-gemini.js`: v3 element-level
- `.claude/rules/vanilla-js-widget.md`: rule innerHTML đã update
- `strings/home.json` (43 entries) + `strings/cellgroup.json` (33 entries):
  đã filter admin chrome
- `translations.json` + `translations.js`: 65 entries
  (49 từ flash-lite run + 4 manual NO fix + 16 nav merge từ HEAD)
- `test-local.html`: bỏ ref đến translations.js

Cần làm: anh `git add/commit/push` + purge jsDelivr 3 file (translations.json,
translations.js, widget.js). KHÔNG re-run `/translate` (sẽ overwrite nav merge).

---

## Previous: CDN Refactor — Phase 1 (DONE)

Pushed `884e1ad`, 2026-05-26. jsDelivr `@main` sẽ cache ~12h; dùng purge URL
trong section "How to update the website" để refresh ngay.

Done in current session:

- [x] **Per-page input split** (Option B from migration-architect). `strings.json`
      replaced with `strings/<page>.json`. `translate-gemini.js` now reads ALL
      `.json` files in `strings/`, gộp + dedupe, then translates. Starter file:
      `strings/home.json` (21 chuỗi gốc). `extract-strings.js` workflow updated
      to require `localStorage` reset between pages.
- [x] **Security pre-scan**: grep `git ls-files` + `git log --all -p` for
      `AIzaSy[A-Za-z0-9_-]{30,}`, `sk-[A-Za-z0-9]{20,}`, `DeepL-Auth-Key`. All
      hits in tracked files and history are doc regex patterns or template
      literals (`${API_KEY}` in `translate.js:29`). No literal secrets.
- [x] **Refactor `translate-gemini.js`** — emits `translations.js`
      (`window.WIDGET_TRANSLATIONS = {...}`) + `translations.json` atomically
      (`.tmp` → `renameSync`). No longer touches `widget.html`. Adds
      `AbortController` 30s timeout per project rule.
- [x] **Extract `widget.js`** from the old `widget-template.html`. Reads
      `window.WIDGET_TRANSLATIONS`, fail-soft if missing.
- [x] **Update `widget.html`** to a static shell referencing
      `https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/translations.js`
      and `.../widget.js` (in that order — translations must load first).
- [x] **`widget-template.html` deleted** (no more template substitution).
- [x] **`test-local.html`** added for pre-push browser sanity check (relative
      paths, NOT jsDelivr).
- [x] **Branch strategy decided**: `@main` (always-fresh, 12h jsDelivr cache,
      manual purge URL when faster refresh is needed).
- [x] **PR review by `pr-reviewer-agent`**: PASS, no blockers; 4 suggestions
      (3 fixed in-session; 1 deferred — see below).

User-gated steps:

- [x] **Repo flipped to PUBLIC** by user on 2026-05-23 (done manually in Edge,
      before this session resumed). `NhutNguyenH/gospelcenter` is now
      world-readable — confirmed safe by earlier secret scan (tracked files +
      history clean). jsDelivr can now fetch as soon as commits land.
- [x] **`git push` after commit** — done 2026-05-26 (commit `884e1ad`).
      One-off exception requested by user; **default preference remains**:
      user runs `git add` / `commit` / `push` themselves. Orchestrator must
      ask before running git write commands in future sessions.

Deferred follow-up (recorded as known debt):

- [ ] **Batch retry/backoff in `translate-gemini.js`**. Project rule
      (`vanilla-js-widget.md`) requires exponential backoff (3 retries, 1s base,
      doubling) on 429/5xx, then skip the batch (do not crash). Current code
      `process.exit(1)`s on first batch failure. At current scale (21 strings =
      1 batch) the partial-progress loss is moot; raise priority when the
      project crosses ~80 strings (≥ 2 batches).

Phase 2 (deferred): Node crawler that reads `sitemap.xml` and emits
`strings/<page>.json` automatically. Only relevant for site >30 pages.

Phase 2 (deferred): Node crawler that reads `sitemap.xml` and emits `strings.json`
without manual DevTools paste per page. Only relevant for site >30 pages.

---

## How to update the website (workflow reference)

After Phase 1 CDN refactor, the website's `widget.html` is pasted ONCE. To
change translations or add strings:

1. (Optional) Quét chuỗi mới từ trang website: chạy `extract-strings.js`
   trong DevTools console của Edge, dán clipboard vào
   `strings/<page>.json` tương ứng. Reset `localStorage` giữa các trang.
2. Edit `strings/*.json` directly nếu chỉ muốn thêm/xoá chuỗi thủ công.
3. Run `/translate` (or `node --env-file=.env translate-gemini.js`) →
   regenerates `translations.js` + `translations.json`.
4. (Optional) Test locally: trong PowerShell từ thư mục dự án,
   `python -m http.server 8000`, mở Edge tới
   `http://localhost:8000/test-local.html`, bấm EN/VI/NO để kiểm tra.
5. Commit + push:
   ```
   git add strings/ translations.json translations.js
   git commit -m "Update translations"
   git push
   ```
6. Cache jsDelivr refresh sau ~12h. Để refresh ngay, mở các URL sau
   trong Edge (mỗi URL sẽ chạy trong 1-2s rồi xong):
   - `https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/translations.js`
   - `https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/widget.js`
     (chỉ cần khi anh sửa `widget.js`)
7. Verify: mở
   `https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/translations.js`
   trong Edge — phải thấy bản dịch mới nhất.

If `widget.html` itself changes (CSS/UI tweak), anh phải copy lại nội dung
`widget.html` và dán lại vào website builder — chỉ những lần thay đổi
shell mới cần re-paste.

---

## Architecture Constraints

- **STRICTLY NO runtime translation API calls in the browser.** The widget's
  data is baked in at build time. Any code that adds `fetch()` to DeepL /
  Gemini / OpenAI / any translation service in browser code is a hard reject
  during review. (Note: `widget.js` DOES `fetch()` our OWN `translations.json`
  from jsDelivr at runtime for cache-busting purposes — this is static data,
  not a translation API call, and is allowed.)
- **Browser code is vanilla JS, ES6+.** No framework runtime. No bundler. No
  transpilation. Must execute as-is when pasted into a website builder's HTML
  embed widget.
- **Node code targets Node 20.6+** (for native `--env-file` flag).
- **Build output must be idempotent.** Re-running `translate-gemini.js` on the
  same `strings.json` should produce stable `translations.json` (within
  Gemini's variance — temperature 0 used in script).
- **Widget must be SPA-friendly.** A `MutationObserver` (debounce ≥150ms)
  re-applies the active language to dynamically added nodes.
- **Respect `data-no-translate`.** Elements with this attribute (and their
  descendants) are exempt from translation — used for the "Language" label and
  flag buttons.

---

## Security

- **`GEMINI_API_KEY` lives ONLY in `.env`.** Never hard-coded, never logged,
  never passed via argv.
- **`.env` is gitignored.** Verified via `git check-ignore .env`. Re-verify
  after any `.gitignore` edit.
- **Pre-publish secret scan.** Before flipping repo to public, run:
  ```bash
  grep -rE "AIzaSy[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9]{20,}|DeepL-Auth-Key" \
    $(git ls-files) 2>/dev/null
  ```
  Also check history: `git log --all -p | grep -E "AIzaSy[A-Za-z0-9_-]{30,}"`.
- **Past leak (resolved-in-code, not-in-history)**: original
  `translate-gemini.js:17` had hardcoded key `AIzaSyCuNDMDzIWrM-...`. The key
  was scrubbed before the initial commit, so git history is clean. The user
  should still **revoke** that key at
  https://aistudio.google.com/apikey — it appeared in chat logs.
- **No PII in browser code.** The widget reads no user identifiers; only
  `localStorage["site_lang_deepl"]` (a language code: `en`/`vi`/`no`).

---

## Translation State

**Languages**: English (source) → Vietnamese (`vi`), Norwegian Bokmål (`no`).

**Model**: `gemini-2.5-flash`, temperature 0, response schema enforced.

**Batch size**: 40 strings per request. Free tier: 15 RPM, 1500/day — plenty
for this project (current strings.json: ~21 strings).

### Quality notes (review periodically)

| English | Vietnamese | Norwegian | Note |
|---|---|---|---|
| Cell Groups | Nhóm tế bào | Cellegrupper | VI literal = biological cells. Religious "small groups" context wants "Nhóm nhỏ" or "Tổ tế bào". Confirm with user. |
| CHURCHES | NHÀ THỜ | KIRKER | All-caps preserved correctly. |
| Newsfeed | Bảng tin | Nyhetsstrøm | Good. |
| SMS | SMS | SMS | Acronym preserved correctly. |
| Activities | Hoạt động | Aktiviteter | Good. |
| Mission | Sứ mệnh | Misjon | "Sứ mệnh" is corporate-mission flavour. Religious "Mission" (missionary work) wants "Sứ mạng" or "Truyền giáo". Confirm. |

### Edge cases to remember

- **Whitespace-only text nodes**: filtered out by `extract-strings.js`.
- **Leading/trailing whitespace on translated nodes**: preserved by widget
  (`widget.html` lines 124–126 match leading/trailing `\s*` and re-wrap).
- **DOM mutations**: observed with 150ms debounce.
- **HTML-encoding by website builders**: some platforms auto-encode pasted
  HTML, turning Vietnamese characters into `&#7873;` entities. If this happens,
  user must paste into a different widget type (Custom HTML / Embed Code, not
  Rich Text).
- **Inline elements split text**: `<p>Click <a>here</a> to learn more</p>`
  becomes 3 text nodes (`Click `, `here`, ` to learn more`), each translated
  in isolation. Gemini may produce awkward concatenations. Acceptable trade-off
  for now.

---

## Agent Hand-off Notes

### Orchestrator → `pr-reviewer-agent`
- Always include the diff range in the prompt. Default: `git diff` + `git diff --staged`.
- For pre-publish reviews (going public), include history too:
  `git log --all -p`.
- The agent's report goes back to the user verbatim — keep it brief.

### Orchestrator → `migration-architect-agent`
- Pass the plan in full. Architect critiques, does not rewrite.
- Always include the 12h cache TTL fact when reviewing CDN plans — easy to miss.
- If the plan touches secrets, also delegate to `pr-reviewer-agent` for a
  parallel security pass.

### `qa-reviewer-agent` → `test-engineer-agent`
- Don't ask for "tests for this file" — too vague. Specify the function and
  the scenario (e.g., "test `chunk(arr, size)` with `arr.length < size`").
- Test engineer will NOT refactor production code. If the file is monolithic
  and untestable, test engineer reports back; orchestrator decides next step.

### Test engineer → orchestrator
- The project has no test infrastructure yet. First run requires
  `npm init -y && npm i -D jest` + a `test` script in package.json.
- Get explicit user confirmation before scaffolding (it mutates the project root).

---

## Session log (recent)

- **2026-05-23**: Initial commit pushed to `https://github.com/NhutNguyenH/gospelcenter`
  (private). 8 files. `.env` and `session_export.*` excluded.
- **2026-05-23**: API key removed from `translate-gemini.js`, replaced with
  placeholder. User created local `.env` with new key. Pipeline verified
  loadable via `node --env-file=.env`.
- **2026-05-23**: `.claude/` scaffolding created (this file).
- **2026-05-23**: Per-page input split implemented (Phương án B từ migration-architect).
  `strings.json` → `strings/home.json`. `translate-gemini.js` đọc tất cả file trong
  `strings/`, gộp + dedupe trước khi gọi Gemini. Output (`translations.json` +
  `widget.html`) giữ nguyên format inline. `extract-strings.js` comments updated
  cho workflow per-page (reset `localStorage` giữa các trang).
- **2026-05-23**: CDN refactor (Phase 1) complete in code. `widget.js` tách khỏi
  `widget-template.html`; `translate-gemini.js` emit `translations.js` (atomic
  ghi qua `.tmp` + rename) thay vì inline vào `widget.html`. `widget.html` thành
  shell tĩnh với 2 thẻ `<script src>` từ jsDelivr `@main`. `widget-template.html`
  xoá. Thêm `AbortController` timeout 30s. Verification: static checks pass,
  `python3 -m http.server` phục vụ tất cả assets (200), `pr-reviewer-agent` pass
  với 4 suggestion (3 đã fix, 1 batch-backoff defer).
- **2026-05-23**: User confirmed repo `NhutNguyenH/gospelcenter` **đã flip
  PUBLIC** từ trước. User cũng nói thẳng: commit + push để user tự làm, em
  KHÔNG chạy `git add/commit/push` thay. Local Edge test recipe đã giao cho
  user trước đó.
- **2026-05-26**: User one-off request: orchestrator chạy `git add/commit/push`
  cho commit Phase 1 (`884e1ad`). Push lên `origin/main` thành công. User
  chọn giữ nguyên default ("anh tự làm") — lần sau vẫn phải hỏi trước khi
  chạy git write commands.
- **2026-05-26**: **Cache-bust refactor** — `widget.js` không còn đọc inline
  `window.WIDGET_TRANSLATIONS`; nó derive base URL từ `document.currentScript.src`,
  rồi `fetch('translations.json?v=' + Date.now(), { cache: 'no-store' })` với
  AbortController timeout 8s. Init chạy sau khi cả fetch xong + DOMContentLoaded.
  Lý do: browser cache 7 ngày của jsDelivr khiến khách thấy bản dịch cũ —
  giờ chỉ còn jsDelivr edge cache 12h (purge URL vẫn dùng được). HTML files
  (`widget.html`, `widget-subpage.html`, `test-local.html`) bỏ thẻ
  `<script src=".../translations.js">`. `translate-gemini.js` vẫn emit
  `translations.js` làm back-compat fallback. Anh phải **re-paste**
  `widget.html` + `widget-subpage.html` vào website builder vì shell đổi.
- **2026-05-26**: **Bug fix — `document.currentScript = null` khi website
  builder chèn script dynamically.** Sau cache-bust refactor user báo
  "không dịch được"; `Object.keys(window.WIDGET_TRANSLATIONS).length` ra 0
  trên trang public. Builder chèn `<script>` qua DOM (createElement +
  appendChild) → script "async by default" theo HTML spec → bên trong IIFE
  `document.currentScript = null` → `SCRIPT_SRC = ''` → `translationsUrl()`
  return null → fetch không chạy → TRANSLATIONS rỗng. Fix trong `widget.js`:
  `resolveScriptSrc()` ưu tiên `document.currentScript`, fallback
  `document.getElementsByTagName('script')` reverse-scan tìm `src` match
  `/\/widget\.js(\?.*)?$/`. Sau khi user push commit, cần purge jsDelivr
  (`https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/widget.js`) +
  hard refresh Edge để bypass browser cache 7 ngày của jsDelivr asset.
- **2026-05-26**: **Element-level translation refactor (v3) — code DONE,
  chưa push.** Lý do: bug ngữ pháp per-text-node với inline `<strong>` trên
  trang cellgroup (chi tiết ở Current Focus). 3 file core đổi:
  + `extract-strings.js` v3: walk `<p, h1-6, li, button, a, blockquote,
    label, td, th, dd, dt, summary, figcaption, caption, span>`, key =
    `innerHTML.trim()` normalize whitespace. Filter `hasTranslatableAncestor`
    để chỉ giữ outermost. Bỏ qua `data-no-translate`, `.lang-inline-card`,
    structural-only elements (chỉ chứa `<img>`/`<br>`/...).
  + `translate-gemini.js`: prompt bổ sung instruction "Input may contain
    inline HTML tags: `<strong>, <em>, <b>, <i>, <u>, <br>, <a>`. PRESERVE
    these tags EXACTLY...". Còn lại không đổi (schema, batch, retry, timeout).
  + `widget.js` v3: `originalHTML` Map (Element → innerHTML), `applyLang`
    set `el.innerHTML = sanitizeTranslation(entry[lang])`. Sanitizer
    regex-based với allowlist `{strong, em, b, i, u, br, a}`, strip mọi attr
    trừ `href` trên `<a>` (validate scheme `http|https|/|#|mailto:`).
    Observer guard bằng cờ `_widgetWriting` (KHÔNG disconnect/reconnect).
    Idempotent qua `if (el.innerHTML !== newHTML)` short-circuit.
  + `.claude/rules/vanilla-js-widget.md`: rule "No innerHTML" thay bằng
    "innerHTML only via sanitizeTranslation()" với chi tiết allowlist.
  Plan đã pass `migration-architect-agent` review (4 fix apply trước khi
  code). Sanity: 15/15 regression test pass cho sanitizer (script, javascript:,
  iframe, onclick, span/img strip, canonical `Our <strong>cell groups</strong>`).
  **Pending**: user re-extract home + cellgroup trên public site, /translate
  regenerate, push toàn bộ, purge 3 file trên jsDelivr (translations.json,
  translations.js, widget.js).
- **2026-05-26 (cuối ngày)**: User re-extract nhưng trong **website builder
  admin mode** (đang login) → cả `strings/home.json` (125 entries) lẫn
  `strings/cellgroup.json` (102 entries) chứa toàn `<a class="cs-menu-link">
  ... <ul class="level-1">...</ul>` (admin chrome của "ChurchSoft" hoặc tương
  tự). User chấp nhận "miễn dịch đúng là được" → em chạy /translate. Đụng
  **quota daily**: Google đã siết Gemini free tier xuống `20 req/ngày` cho
  `gemini-2.5-flash` (memory cũ ghi 1500 — đã outdated). Mỗi 503 retry cũng
  count vào quota → cạn sau ~25 attempts.
  + Thêm `MAX_RETRIES=3` + exponential backoff 1s/2s/4s trên 429/503/5xx +
    AbortError trong `translate-gemini.js` (xử lý debt cũ trong vanilla-js-
    widget.md, raise priority khi >80 strings).
  + Giảm `BATCH_SIZE 40→20` (key dài hơn vì element-level innerHTML).
  + Add guard: nếu 0 batch thành công, KHÔNG ghi file → translations.json cũ
    được bảo toàn. Nếu partial (>0 nhưng <expected), warn.
  + Plan: chờ quota reset (UTC midnight ≈ 07:00 VN), chạy /translate lại,
    sau đó push toàn bộ (widget v3 + extract v3 + translate-gemini v3 + rule
    + strings + translations). Production hiện tại vẫn chạy widget v2 +
    translations cũ → không bị ảnh hưởng.
  + **Cảnh báo chưa giải quyết cho lần chạy mai**: input có ~227 strings,
    nhiều chuỗi là HTML admin menu 1000+ chars. Sanitizer của widget strip
    toàn bộ class/attr → admin menu sẽ mất CSS khi bấm VI/NO (chỉ ảnh hưởng
    user logged-in). Nếu user muốn input sạch, em có thể lọc admin chrome
    bằng heuristic (`cs-menu-link`, `_module/`, ...) trước khi run.
- **2026-05-27**: **Element-level v3 translations regenerated; v3 deployment
  ready.** Tiếp tục từ memory hôm trước.
  + **Filter admin chrome**: ghi đè `strings/home.json` (125→43) và
    `strings/cellgroup.json` (102→33) bằng filter heuristic (drop `cs-*`
    classes, `_module/` URLs, `onclick=`, `aria-haspopup`, long HTML với
    >2 class attrs, `cs-context-close`, `cs-toolbar-icon`). Sau dedupe còn
    49 chuỗi unique.
  + **Model swap**: `gemini-2.5-flash` quota free tier giờ chỉ **20 req/ngày**
    (memory cũ ghi 1500 — Google đã siết). `gemini-2.0-flash` bị Google chặn
    hẳn free tier cho project này (`limit: 0`). Switch sang
    `gemini-2.5-flash-lite` (free tier 1000/ngày).
  + **Flash-lite quality issue**: lite "đoán" English ngắn đã sẵn Norwegian
    → copy nguyên vào cột no. Paragraph dài (có context) dịch tốt. Sửa prompt
    cứng hơn: thêm "CRITICAL — Both vi AND no MUST be actual translations",
    "no field MUST be Norwegian Bokmål, NOT a copy of the English input",
    với example. Sau khi rerun: 4 short entry vẫn lỗi (Activities, Newsfeed,
    Topics, Join a cell group). Em **fix tay** 4 entry này trong
    `translations.json` (regenerate `translations.js` atomic).
  + **Legacy nav merge**: Filter làm mất 16 nav label (About Us, CHURCHES,
    Cell Groups, Mission, ...) khỏi strings/home.json. Em merge từ HEAD
    translations.json (vi/no đã có sẵn từ run trước) vào translations.json
    mới. V3 widget walk `<a>CHURCHES</a>` cho key = "CHURCHES" plain text,
    byte-identical với key cũ → match được. Skip 8 obsolete fragment keys
    ("Our", "cell groups", "spiritual family", "Oslo, Ski, and Brumunddal",
    paragraph fragments) — chúng không match v3 DOM walks. **Final state**:
    65 entries trong translations.json (49 từ run + 16 merged).
  + **Risk khi user re-run /translate sau này**: translate-gemini.js OVERWRITE
    translations.json hoàn toàn. 16 nav key sẽ bị mất nếu strings/home.json
    chưa có. **Workaround**: hoặc user re-extract home.json sạch (qua
    InPrivate Edge, logged out) để nav strings vào lại home.json, hoặc giữ
    nguyên translations.json hiện tại (đừng /translate cho tới khi cần).
  + **Pending**: user `git add/commit/push` + purge jsDelivr 3 file
    (translations.json, translations.js, widget.js).
- **2026-05-27 (sau khi user push v3)**: **Walker bug — outermost rule captures
  wrappers.** User test trang public, console đầy "Thiếu bản dịch" cho:
  `<a role="menuitem">CHURCHES</a>...`, `<img class="image-element">...`,
  `<div id="logoblock_home">...`. Nguyên nhân: nav cấu trúc
  `<li><a role="menuitem" class="item1">CHURCHES</a></li>`. Rule v3 cũ
  "walk outermost translatable" → walk `<li>` → key = innerHTML cả `<a>` với
  toàn bộ attribute → không match key "CHURCHES" trong translations.json.
  Tương tự `<a><img></a>` và `<a><div>logo</div></a>` cho logo block.
  **Fix**: thêm filter `hasDirectText(el)` vào `shouldSkipElement` của
  `widget.js` (và mirror trong `extract-strings.js`). Element được walk
  CHỈ KHI có ít nhất 1 text node child trực tiếp (không nested). Logic:
  + `<li><a>CHURCHES</a></li>` → `<li>` không direct text → skip → `<a>` walk
    (có direct text "CHURCHES") → key = "CHURCHES" match translations ✓
  + `<p>Our <strong>cell</strong> groups</p>` → `<p>` có direct text "Our "
    → walk → key = innerHTML giữ `<strong>` ✓ (giữ behavior cũ)
  + `<a><img></a>` → `<a>` không direct text → skip, không cảnh báo ✓
  **Trade-off**: 5 entry footer admin trong strings/home.json (`<span>Bilde</span>`,
  `<span><b>Adresse</b>...</span>`, ...) sẽ không match nữa vì new walker
  capture inner `<span>` thay vì wrapping. Acceptable — toàn admin chrome
  hoặc Norwegian footer (NO=source, vẫn hiển thị đúng cho NO mode).
  **Pending**: user push widget.js + extract-strings.js + memory.md, purge
  widget.js trên jsDelivr, hard refresh test public site.
