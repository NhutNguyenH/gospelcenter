# Memory — gospelcenter translation widget

> Update this file as project state changes. It is the source of truth across
> sessions. Keep entries concise and dated where it matters.

---

## Current Focus

**CDN Refactor — Phase 1**: COMPLETE and pushed to `origin/main`
(`884e1ad`, 2026-05-26). jsDelivr `@main` sẽ cache ~12h; dùng purge URL
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
