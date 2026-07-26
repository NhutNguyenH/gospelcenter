# Memory — gospelcenter translation widget

> Update this file as project state changes. It is the source of truth across
> sessions. Keep entries concise and dated where it matters.

---

## Current Focus

**v3 element-level translation + en field + feature-branch test workflow: LIVE**
(cuối ngày 2026-05-27).

Production trên `https://gospelcenter.net/` đang chạy widget hoàn chỉnh. Dịch
được mọi element visible: nav, card grid, paragraph với `<strong>` inline,
footer (kể cả Norwegian-source như Adresse/Kontakt).

Còn 2 warning vô hại (chỉ hiện khi user login admin):
- `"Logg inn"` (admin login button)
- `"Du har ulagrede data..."` (admin unsaved-changes warning)

### Cấu hình stable hiện tại

- **URL jsDelivr trong widget.html / widget-subpage.html**: `@HEAD` (sau khi
  `@main` rồi `@latest` đều bị stale tại các thời điểm trong ngày).
- **Walker rule** (widget.js + extract-strings.js):
  - `hasDirectText(el)` PHẢI return true mới walk
  - `hasTranslatableAncestor(el)` chỉ block nếu ancestor cũng matches
    TRANSLATABLE AND `hasDirectText(ancestor)` true
  - TRANSLATABLE selector: `p, h1-h6, li, button, a, blockquote, label, td,
    th, dd, dt, summary, figcaption, caption, span, div`
- **Sanitizer**: regex-based allowlist `{strong, em, b, i, u, br, a}`, strip
  attrs (trừ `href` trên `<a>` với scheme validation), strip mọi tag khác.
- **translations.json**: 66 entries. 8/66 có field `en` (Norwegian-source
  visible: Adresse [2 variant], Kontakt, Husgrupper, Organisasjonsnummer,
  Kontonummer, Vipps, phone). Các entry còn lại không có `en` → widget fallback
  về restore origHTML khi click EN (OK vì source đã là English).
- **translate-gemini.js**:
  - Model: `gemini-2.5-flash-lite` (free 1000/ngày)
  - Schema: `{en, vi, no}` đều required
  - MERGE mode: load translations.json cũ, chỉ dịch key chưa đủ en+vi+no
  - BATCH_SIZE=20, MAX_RETRIES=3 với backoff 1s/2s/4s
- **Test workflow** (HOW-TO.md):
  - Local: `python -m http.server 8000` → `test-local.html`
  - Feature branch: tạo branch → push → `widget-test.html` đổi URL
    `@<branch-name>` → paste vào trang `/test-widget` trong builder

### Cập nhật 2026-06-06 (cuối session)

- **Recently completed**: reverse-index trong `widget.js:38-66` (build index +
  `resolveEntry`) đã LIVE — user xác nhận trang chủ chọn VI dịch đúng. Docs
  (extract-strings.js header, HOW-TO.md) đã thêm quy tắc "bấm EN + extract 1
  lần/trang". 203 entries trong translations.json (đủ en+vi+no).
- **In progress / blocker**: trang Oslo (`gospelcenter.net/churches/europe/oslo`)
  KHÔNG dịch khi điều hướng từ trang chủ. Root cause = trang đó CHƯA dán script
  widget (mỗi trang trong builder phải dán riêng). CÙNG domain gospelcenter.net
  → localStorage chia sẻ được, không phải vấn đề cross-domain.
- **Immediate next steps**: user dán `widget.html` (khuyến nghị — có nút EN/VI/NO
  vì khách có thể vào thẳng Oslo) hoặc `widget-subpage.html` vào trang Oslo /
  template chung của subsite Oslo → Save + Publish → test InPrivate. Verify bằng
  `Object.keys(window.WIDGET_TRANSLATIONS||{}).length` trên trang Oslo.

### Cập nhật 2026-07-25 — skill `update-translation` + git policy override

- **Git policy CHANGED (user-approved 2026-07-25)**: quy tắc cũ "user tự chạy
  git add/commit/push, agent KHÔNG chạy thay" (2026-05-23) vẫn là **default**,
  NHƯNG có 1 ngoại lệ: skill `update-translation` được phép `git add` (đúng 2
  file `translations.json` + `translations.js`) + `commit` + `push` + purge
  jsDelivr — **sau khi hỏi và user xác nhận trong conversation**. User chọn
  "Dừng xác nhận trước khi push", KHÔNG chọn full-auto. Ngoài phạm vi Trường
  hợp B → quay về default.
- **Skill mới `update-translation`** (`.claude/skills/update-translation/`,
  command `/update-text`). Tự động hoá HOW-TO Trường hợp 3/B: tìm → sửa →
  regen → test browser thật → hỏi → commit/push/purge/verify CDN. Phạm vi
  CHỈ Trường hợp B; từ chối Trường hợp A (đổi text trên builder → cần
  re-extract) và từ chối thêm key mới (cần Gemini).
- **2 script trong `tools/`** (đặt trong subdir, KHÔNG ở root, để không bị
  jsDelivr phục vụ nhầm): `find-translation.js` (search theo key hoặc bất kỳ
  giá trị en/vi/no, báo page + flag AMBIGUOUS), `regen-translations-js.js`
  (rebuild translations.js từ json, format y hệt `writeOutputs()`, atomic,
  refuse khi json rỗng/hỏng).
- **Bước test browser local đã BỎ (user quyết 2026-07-25)**: từng có
  `make-test-fixture.js` + `serve.js` + Playwright bấm EN/VI/NO. User thấy
  "chậm mà tốn thời gian" cho thay đổi cỡ 1 từ, và tự verify trên trang thật.
  2 script đó ĐÃ XOÁ. **Không dựng lại** trừ khi user yêu cầu. An toàn giờ dựa
  vào Step 2 (kiểm tra từ) + `git diff` + regen (2 file sinh từ 1 nguồn nên
  không thể lệch nhau).
- **Step 2 mới — kiểm tra từ vựng (user yêu cầu 2026-07-25)**: KHÔNG ghi thẳng
  từ user đưa. Phải check chính tả, dạng ngữ pháp (số/định-bất định tiếng Na
  Uy), hợp ngữ cảnh nhà thờ, và nhất quán với site. Lệch → đưa 2–4 phương án
  kèm lý do, user chọn. Không tự sửa, không từ chối. Kinh nghiệm: **trực giác
  của user về CHỌN TỪ NÀO thường đúng; cái sai là DẠNG của từ.**
- **Bug thật đã fix khi build**: `translations.js` committed bị **lệch** với
  `translations.json` ở 2 entry `Gudstjeneste`/`Gudstjenester` (js còn
  "Service"/"Buổi lễ", json đã là "Worship Service"/"Buổi thờ phượng" — user
  sửa tay json mà quên regen js). Impact thấp (widget.js fetch json runtime,
  js chỉ là back-compat fallback) nhưng chứng minh đúng lý do skill này tồn
  tại. Đã regen, **chưa commit**.
- **Skill phải nằm ở CẢ 2 chỗ**: session hay được mở ở workspace root
  `WebHoiThanh`, mà Claude Code chỉ nạp `.claude/` của thư mục đang mở → skill
  đặt trong `deepl-translator/.claude/` KHÔNG thấy được từ root ("Unknown
  command: /update-text"). Fix: thêm `WebHoiThanh/.claude/skills/
  update-translation/SKILL.md` dạng **pointer mỏng** (cd sang deepl-translator
  rồi đọc SKILL.md thật) + `WebHoiThanh/.claude/commands/update-text.md`.
  Pointer KHÔNG duplicate nội dung → không drift. Áp dụng cho mọi skill tương
  lai của sub-project.
- **Lần chạy thật đầu tiên (2026-07-25)**: user yêu cầu "Hội Thánh → Menighet".
  Step 1 ra 3 hit → hỏi. Step 2 phát hiện: (a) user ĐÚNG về từ — cả site chỉ
  có 2 chỗ dùng `kirke`, chính là 2 chuỗi này, trong khi tên chính thức là
  `Den Vietnamesiske Baptistmenigheten i Oslo` → nav đang lệch với tên hội
  thánh; (b) `Menighet` sai DẠNG — nguồn `Churches` số nhiều → phải
  `Menigheter`. User chọn `Menigheter`. Commit `1e7e0aa`, push, purge OK,
  CDN verify OK: `CHURCHES.no = MENIGHETER`, `Churches.no = Menigheter`.
- **Lần chạy thứ 2 (2026-07-25) — `Lectures`**: user hỏi "Forelesninger có đúng
  không?". Sai: `forelesning` = bài giảng ĐẠI HỌC. Dấu hiệu nhận ra: cặp
  `Kurs` + `Forelesninger` trên trang chủ đọc ra như trường học, không phải hội
  thánh → bản dịch máy không biết ngữ cảnh. User chọn `Taler`, nhưng
  **collision check bắt được**: đã có entry `Taler` (Speeches / Bài phát biểu)
  trên CÙNG trang chủ → 2 nhãn trùng + rủi ro reverse-index tra nhầm entry khi
  builder re-render (đúng lớp bug Camps/Các Kì Trại). User đổi sang
  `Undervisning`. Đồng thời `en` "Lectures" → "Sermons" (key giữ nguyên
  "Lectures" vì đó là HTML thật trên trang). Commit `5d6bdc5`, CDN verify OK.
- **Step 2 giờ có mục 5 — COLLISION CHECK**: trước khi ghi, luôn chạy
  `find-translation.js --exact "<giá trị mới>"`. Trùng → dừng, báo, đưa phương
  án khác. Đây là check bắt lỗi thật, không phải formality.
- **Purge PHẢI dùng `node -e` + fetch, KHÔNG dùng WebFetch tool**: WebFetch
  cache 15 phút/URL → lần purge thứ 2 trong cùng session trả lại y nguyên
  response cũ (cùng `id`, cùng `timestamp`) và trông như thành công dù chưa
  purge gì. Phát hiện 2026-07-25. Luôn kiểm `timestamp` có phải vừa mới không.
### Audit toàn bộ bản dịch (2026-07-25) — commit `b1acf1f`

- **Lỗi hệ thống đã xác định**: bản dịch máy chọn từ đúng nghĩa từ điển nhưng
  **sai ngữ vực** — học thuật/doanh nghiệp thay vì nhà thờ. `Forelesninger`,
  `Kirker`, `Trening`, `Emner` đều cùng một lớp lỗi. Khi audit bản dịch mới,
  tìm theo dấu hiệu này chứ không phải theo "sai nghĩa".
- **Mẹo phát hiện nhanh**: đọc các nhãn nav CẠNH NHAU. `Kurs` + `Forelesninger`
  đọc ra như trường đại học; `Kurs` + `Undervisning` đọc ra như hội thánh.
  Từ đứng một mình có thể đúng nhưng cả cụm sai ngữ vực.
- **Đã sửa (no)**: `Trening`→`Opplæring`, `Emner`→`Temaer`, `Jobber`→
  `Jobbmuligheter`, `Studere i utlandet`→`Utenlandsstudier`, `Nyhetsfeed`→
  `Nyhetsstrøm`, `celle-grupper`→`cellegrupper` (danh từ ghép Bokmål viết
  LIỀN — lỗi chính tả thật trên 2 đoạn văn public), `Husgrupper`→`Cellegrupper`.
- **Đã sửa (vi)**: `Evangelisering` từ "Tin Lành" (= Phúc Âm, sai) → "Chứng đạo".
  Camps thống nhất "Các Kì Trại", Courses "Các Khóa Học", cell group "nhóm tế
  bào" — mỗi khái niệm trước đó có 3 biến thể. Mảnh tên hội thánh chia lại theo
  trật tự từ tiếng Việt. Bỏ phần lặp trong "Khóa học tiếng Việt (Khóa học
  tiếng Việt)".
- **Nguyên tắc chọn từ rút ra**: khi một khái niệm có nhiều biến thể, **key
  bằng tiếng Việt/Na Uy chính là chữ hội thánh tự viết trên trang** → ưu tiên
  nó hơn bản máy dịch. Đã áp dụng cho Camps (`Các Kì Trại`), Courses (`Các Khóa
  Học`), Evangelism (`Truyền giáo`).
- **Collision suýt xảy ra**: user muốn `Mission` vi = "Truyền giáo" nhưng
  `Evangelisering` vừa được đặt đúng giá trị đó, và cả hai cùng nằm trên trang
  Oslo. Hỏi lại → user xác nhận là HAI mục khác nhau → tách thành `Mission` =
  "Truyền giáo" / `Evangelisering` = "Chứng đạo". **Luôn chạy collision check
  ngay cả khi giá trị mới do chính mình vừa đề xuất ở bước trước.**
- **Trạng thái collision**: còn 15 nhóm trùng-giá-trị-khác-bản-dịch, **13 là
  admin chrome** sẽ biến mất ở Giai đoạn B. Còn lại là cặp gương vô hại
  (`Cell Groups`/`Husgrupper`, `Newsfeed`/`Nyhetsstrøm` — chỉ khác hoa/thường
  ở `en`).
### Dọn admin chrome (2026-07-25) — commit `b0a5e66`. XONG.

- User re-extract trang chủ trong InPrivate → **25 chuỗi sạch**. `home.json`
  156→25, `translations.json` 203→**101**. 103 entry admin bị xoá.
- **Bấm EN KHÔNG còn khôi phục nguyên bản** kể từ khi thêm field `en`:
  `applyLang` ghi đè bằng `entry.en` (widget.js:144-151). Bằng chứng: bản
  extract mới trả về `"Sermons"` chứ không phải key thật `"Lectures"`, và
  `"Log in"` chứ không phải `"Logg inn"`. Quy tắc "bấm EN trước khi extract"
  trong HOW-TO có TRƯỚC tính năng `en` → giờ không còn đảm bảo key nhất quán.
  **Hệ quả cho lần sau: bản extract KHÔNG phải danh sách key thật.**
- **Lỗi suýt xoá mất footer** — cách tính đầu tiên của em sai 2 chỗ:
  1. Reverse-index xây kiểu "giá trị đầu tiên thắng" nên `Temaer.en="Topics"`
     chiếm chỗ, khiến chính key `Topics` bị xếp vào diện xoá. `widget.js` ưu
     tiên key trước (`TRANSLATIONS[key] || REVERSE[key]`) — phải copy đúng.
  2. Do extract ở trạng thái tiếng Anh, các entry **nguồn Na Uy** (`Kontakt`,
     `Kurs`, `Leirer`, `Nyheter`, `OM OSS`, `Kalender`, `Kontonummer`) không
     xuất hiện dưới key thật → trông như không dùng → suýt bị xoá.
  **Cách đúng đã dùng: union-find gom entry thành CỤM KHÁI NIỆM** (2 entry
  cùng cụm nếu chia sẻ bất kỳ giá trị key/en/vi/no), rồi giữ trọn cụm nào
  được bản extract chạm tới. Không bao giờ khớp key cứng.
- **Tên hội thánh phải giữ tay**: `Den Vietnamesiske` +
  `Baptistmenigheten i Oslo` KHÔNG có trong bản extract mới (có thể đã thành
  ảnh, hoặc nằm trong phần tử walker bỏ qua). Giữ lại thủ công.
- **Thêm entry đồng nhất cho email footer** (`gospelcenter.oslo@gmail.com`,
  en=vi=no): key cũ là dạng bọc `<span><a mailto>`, walker hiện tại sinh text
  trần → nếu không thêm sẽ có cảnh báo `Thiếu bản dịch` GIẢ trong Console,
  che mất cảnh báo thật lúc verify.
- **Regression check bắt buộc sau khi xoá**: mọi chuỗi trong `strings/*.json`
  phải resolve được → 92/92 OK. Nhóm trùng-giá-trị-khác-bản-dịch: 15 → 12
  (số còn lại là cặp số ít/số nhiều mà tiếng Việt gộp làm một — vô hại).
- **`tools/check-logged-out.js`** (mới): snippet DevTools chạy TRƯỚC
  `extract-strings.js`. Cần vì `extract-strings.js` quét toàn bộ DOM và
  **không lọc theo hiển thị** — menu admin đang ẩn vẫn bị bắt, nên "nhìn màn
  hình thấy sạch" không có nghĩa là an toàn. Đó chính là cách `home.json` hỏng.
- **Pending**: user review + commit các file tooling (`tools/*`, `.claude/
  skills/update-translation/`, `.claude/commands/update-text.md`, `.gitignore`,
  `.claude/CLAUDE.md`, `HOW-TO.md`, `memory.md`). `translations.json` +
  `translations.js` ĐÃ commit + push (`1e7e0aa`).

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
- **Per-page widget embed.** Mỗi trang trong website builder là riêng biệt;
  widget chỉ dịch trang nào có dán script. Trang con KHÔNG tự kế thừa widget của
  trang chủ trừ khi cùng template/header.

### Design decisions (dated)

- **2026-06-06 → reverse-index trong widget.js (`widget.js:38-66`, `resolveEntry`)
  → why**: source text trên trang có thể ở bất kỳ ngôn ngữ nào (en/vi/no) hoặc
  bị builder re-render ở trạng thái đã dịch; match cứng theo key gốc làm element
  ship sai ngôn ngữ không khớp → không dịch. **Consequences**: dịch độc lập ngôn
  ngữ source; direct-key vẫn ưu tiên để phân biệt entry cùng nghĩa khác bản dịch.
  **Reversible?** Có — gỡ `resolveEntry`, quay lại `TRANSLATIONS[key]`.
- **2026-06-06 → khuyến nghị dán `widget.html` (có nút EN/VI/NO) lên subsite Oslo
  thay vì `widget-subpage.html` → why**: khách có thể vào thẳng trang Oslo
  (Google/link trực tiếp), localStorage rỗng → không có nút thì kẹt tiếng Anh.
  **Consequences**: switcher xuất hiện trên cả Oslo. **Reversible?** Có — đổi
  sang widget-subpage nếu Oslo luôn được vào qua trang chủ.

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

### 2026-06-06 — orchestrator → all — trang Oslo chưa dịch + reverse-index live
- Reverse-index (`widget.js`) đã push + purge + verify LIVE (trang chủ VI OK).
- **Open**: trang Oslo `gospelcenter.net/churches/europe/oslo` chưa dán widget →
  không dịch. Cùng domain nên localStorage chia sẻ; chỉ cần dán widget vào trang
  Oslo / template subsite. Chờ user dán + test, rồi verify
  `Object.keys(window.WIDGET_TRANSLATIONS||{}).length` trên trang Oslo.
- curl tới gospelcenter.net trả 404 cho request non-browser → KHÔNG dùng curl để
  verify nội dung trang; phải nhờ user kiểm tra trong Edge (DevTools).
- Part 3 (dọn 13 nhóm entry trùng en) user chọn **để sau** — reverse-index làm
  chúng vô hại; bảng phân loại có trong session log lần 3.
- Pending push lớn (tích luỹ): widget.js reverse-index ĐÃ push; các thay đổi
  extract-strings.js header + HOW-TO + memory chưa chắc đã push — kiểm tra
  `git status` đầu session sau.

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
- **2026-06-06 (lần 4)**: **Reverse-index deployed + chẩn đoán trang Oslo không
  dịch.** User push + purge `widget.js` (reverse-index từ lần 3) → xác nhận trang
  chủ chọn VI dịch đúng (nav CÁC HỘI THÁNH/VỀ CHÚNG TÔI OK). Sau đó báo: điều
  hướng từ trang chủ sang trang Oslo (`gospelcenter.net/churches/europe/oslo`)
  thì KHÔNG dịch. Chẩn đoán (curl bị CMS chặn, trả 404 cho non-browser nên không
  fetch verify được — đây là known quirk): trang Oslo là **subsite riêng** (nav
  GUDSTJENESTER/HUSGRUPPER/CALENDAR/BARN/UNGDOM/HENDELSER/OM OSS, branding "Trung
  Tâm Tin Lành Oslo") CHƯA dán script widget. Mỗi trang builder phải dán riêng.
  URL cùng domain `gospelcenter.net` → localStorage `site_lang_deepl` chia sẻ
  được (KHÔNG phải vấn đề cross-domain). Đã hướng dẫn user dán widget vào trang
  Oslo. **Chưa xác nhận fix** (chờ user dán + test). `widget.html` margin user
  chỉnh 70px→80px (cosmetic, không ảnh hưởng logic).
- **2026-06-06 (lần 3)**: **Reverse-index trong widget.js — dịch độc lập với
  ngôn ngữ source.** User báo "Các Kì Trại" không dịch đúng. Root cause: cùng
  khái niệm "camps" có 3 entry trùng (Camps/Các Kì Trại/Leirer) do extract cùng
  element ở 3 trạng thái ngôn ngữ khác nhau qua các session. Widget match bằng
  key=innerHTML gốc → trên trang public element chỉ ship 1 ngôn ngữ → các entry
  ngôn ngữ khác thành vô dụng. Phân tích: 203 entries, 26 key-vs-value collision,
  13 nhóm trùng `en`.
  **Fix (widget.js)**: thêm `REVERSE` index (map mọi giá trị en/vi/no → entry,
  ưu tiên self-identity key===value) + `resolveEntry(key)` = `TRANSLATIONS[key]
  || REVERSE[key]`. `applyLang` dùng resolveEntry thay vì lookup trực tiếp.
  Direct-key vẫn ưu tiên (phân biệt Camps vs Các Kì Trại vì khác vi); reverse là
  lưới an toàn cho element re-render ở trạng thái đã dịch. `buildReverseIndex()`
  gọi trong init() + sau fetch trong loadTranslations(). Verify: 7/7 ad-hoc unit
  test pass (direct-key priority + reverse fallback + unknown→null).
  **Docs**: extract-strings.js header + HOW-TO.md thêm quy tắc "LUÔN bấm EN +
  extract 1 lần/trang" để giảm sinh entry trùng.
  **Part 3 — dedup (chưa làm, chờ user)**: 13 nhóm trùng. Đa số vô hại (vi+no
  giống nhau, chỉ khác source key — reverse-index làm tương đương). Nhóm khác
  bản dịch cần user quyết: Camps (vi Trại/Các Kì Trại/Trại hè), Courses
  (Khóa học/Các Khóa Học), Evangelism (Tin Lành/Truyền giáo), Topics (no
  Temaer/Emner). KHÔNG auto-xoá. Pending: user push + purge widget.js (@HEAD).
- **2026-06-06 (lần 2)**: **Thêm trang Oslo. 203 translations.**
  User extract trang Oslo lần đầu vào `strings/oslo.json` (445 chuỗi) nhưng
  ~90% là admin module catalog của CMS Cornerstone (mô tả module "Vis en
  liste...", "Karusell...", tên tính năng SMS/faktura/kundereskontro). Heuristic
  filter KHÔNG lọc sạch được vì admin labels là plain Norwegian text (không có
  `cs-*` marker). Em flag + đề nghị re-extract. User tự re-extract lại thành
  `strings/oslo-home.json` (34 chuỗi sạch, 0 admin chrome — chỉ còn 2 chuỗi
  admin vô hại `Logg inn` + `Du har ulagrede data`). `/translate`: 27 chuỗi
  mới, 2 batch OK. **Final: 203 entries, 100% en+vi+no.** Vietnamese-source
  cũng dịch đúng (Các Khóa Học → en=Courses, Truyền giáo → en=Evangelism).
  **Bài học**: extract trang trong admin/login mode → nhiễm nặng admin catalog;
  LUÔN extract trong InPrivate/logout. Pending: user push + purge.
- **2026-06-06**: **home.json re-extract ~~sạch~~ (có nav) + 176 translations.**
  User re-extract `strings/home.json` đúng cách (InPrivate/logout) → 156 chuỗi,
  ~~0 admin chrome~~, CÓ đủ nav labels (CHURCHES, About Us, Cell Groups, Mission,
  Lectures, ...).
  > **SAI — sửa 2026-07-25**: `home.json` KHÔNG sạch. Audit toàn bộ phát hiện
  > ~120/156 chuỗi là menu quản trị Cornerstone (`Kundereskontro`,
  > `Aldersfordelt saldoliste`, `Fakturajournaler`, `Kontoplan`,
  > `Svindelforebygging`, `Spørreundersøkelser`, `Standardverdier for
  > modulvinduer`…). Chỉ ~70/203 entry trong `translations.json` là nội dung
  > công khai. Cách đo: lấy `oslo-home.json` + `cellgroup.json` (66 chuỗi user
  > đã tự re-extract sạch) làm mốc → 126 chuỗi chỉ-có-trong-home là phần nhiễm. Trước khi chạy phát hiện `translations.json` bị **0 byte**
  (truncate, có thể do atomic write bị ngắt giữa chừng) → khôi phục từ
  `translations.js` (parse `window.WIDGET_TRANSLATIONS`, 66 entries còn nguyên).
  Chạy `/translate`: 110 chuỗi mới, 6/6 batch OK, content-based mapping giữ
  alignment đúng. **Final: 176 entries, 100% đủ en+vi+no.** Nav labels giờ nằm
  TRONG strings/home.json → `/translate` tự sinh, KHÔNG cần merge tay nữa
  (giải quyết debt "16 nav dễ mất" của các session trước). Pending: user push
  + purge. **Recovery tip**: nếu translations.json hỏng, rebuild từ
  translations.js qua regex `window\.WIDGET_TRANSLATIONS\s*=\s*(\{...\})`.
- **2026-05-27 (lần 6) — BUG off-by-one mapping + fix content-based**:
  Chạy `/translate` để fill `en` field cho các entry còn thiếu. Phát hiện
  **lỗi nghiêm trọng**: translate-gemini.js map kết quả Gemini theo INDEX
  (`results[idx]`), nhưng flash-lite đôi khi gom/tách chuỗi (vd batch trả 21
  object cho 20 input, hoặc tách 1 paragraph thành 2) → toàn bộ entry sau điểm
  lệch bị gán SAI value. Triệu chứng: `"Artikkel"` → en=`"Administrator"`,
  `"Kalender"` → en=`"Join a cell group"` (lệch 1 ô).
  **Fix**:
  + Schema thêm field `source` (required) — Gemini phải copy input verbatim.
  + Prompt: "treat each input as ONE indivisible unit, never split/merge,
    source MUST be byte-for-byte copy".
  + Mapping: build `Map(source → {en,vi,no})`, align lại theo nội dung input
    thay vì index. Nếu thiếu source nào → reject batch (throw) → không corrupt.
  + Revert translations.json về HEAD sạch trước khi chạy lại.
  Sau fix: 42/42 chuỗi dịch đúng, alignment perfect (Artikkel→Article,
  Kalender→Calendar, Folk→People). Final: 66 entries, 50 đủ en+vi+no, 16 nav
  chỉ vi+no (fallback EN restore origHTML — OK vì source English).
  **Bài học**: KHÔNG map LLM batch output theo index. Luôn echo source +
  map theo nội dung. Pending: user push translations.json + translations.js +
  translate-gemini.js, purge jsDelivr.
- **2026-05-27 (END OF DAY — tổng kết)**: Toàn bộ thay đổi trong ngày, theo
  thứ tự đã làm:

  **1. Walker bug round 1 — `hasDirectText` filter**
  Per-element walker capture innerHTML cả wrapper (`<a><img>`, `<a><div>logo</div></a>`)
  làm key sai. Fix: thêm `hasDirectText(el)` check — element chỉ được walk
  nếu có text node child trực tiếp.

  **2. Walker bug round 2 — `hasTranslatableAncestor` + direct text**
  Nav `<li><a>CHURCHES</a><ul>...</ul></li>` không dịch vì `<li>` skip (no
  direct text) NHƯNG `<a>` cũng skip (block bởi `<li>` ancestor matches
  TRANSLATABLE). Fix: ancestor chỉ block nếu chính nó có direct text (= sẽ
  thật sự được walk).

  **3. Walker bug round 3 — thêm `<div>` vào TRANSLATABLE**
  Card grid `<div>Lectures</div>` không được walk. `hasDirectText` filter
  đảm bảo div layout không có text vẫn skip an toàn.

  **4. Filter admin chrome trong strings/*.json**
  User re-extract trong admin mode → `strings/home.json` lẫn `cellgroup.json`
  bị nhiễm 100+ chuỗi admin (`cs-menu-link`, `_module/...`). Heuristic filter:
  drop `cs-*`, `_module/`, `onclick=`, `aria-haspopup`, long HTML có nhiều
  class. Kết quả: home 125→43, cellgroup 102→33.

  **5. Model swap + retry logic**
  Gemini `gemini-2.5-flash` quota free tier siết xuống 20/ngày. Switch sang
  `gemini-2.5-flash-lite` (1000/ngày). Thêm `MAX_RETRIES=3` với exponential
  backoff 1s/2s/4s. Giảm `BATCH_SIZE 40→20`. Guard: nếu 0 batch thành công
  KHÔNG ghi file.

  **6. Manual fix Norwegian + nav merge**
  Flash-lite lazy → copy English source vào field `no` cho chuỗi ngắn (4 entry:
  Activities, Newsfeed, Topics, Join a cell group). Fix tay trong
  translations.json. Sau đó merge 16 nav key cũ (CHURCHES, About Us, etc.) từ
  translations.json HEAD trước để không lose.

  **7. jsDelivr @main → @latest → @HEAD migration**
  `@main` resolution stale rất tệ (đôi khi >1h serve commit cũ). Đổi sang
  `@latest`. Sau cũng stale. Cuối ngày đổi tiếp sang `@HEAD` (đang fresh nhất).
  HOW-TO ghi rõ nếu `@HEAD` lag thì fallback dùng `@<sha>` cụ thể.

  **8. `en` field + MERGE mode**
  User báo footer Norwegian-source (Adresse) không dịch sang VI (key cũ có
  outer `<span>` nhưng walker mới capture không có), và click EN không restore
  thật sự English. Fix:
  - widget.js: bỏ special-case `lang==='en' → restoreOrig`, dùng unified
    `entry[lang]` lookup; fallback restore origHTML nếu `entry.en` không có.
  - translations.json: thêm key `<b>Adresse</b>...` mới (no outer span) +
    patch tay `en` field cho 7 Norwegian-source entry visible.
  - translate-gemini.js: schema thêm `en` required; prompt cứng hơn với
    Example A/B (English-source vs Norwegian-source); MERGE mode load
    translations.json cũ, chỉ dịch key thiếu field → preserve manual edits +
    nav merge.

  **9. Test workflow + widget-test.html**
  Tạo `widget-test.html` (variant của widget.html với viền đỏ "TEST", URL
  template `@feature/test` để user đổi thành branch thật). HOW-TO.md thêm
  section "Test workflow" với 2 cách: Local (`test-local.html` + http.server)
  và Feature branch (CDN test trên trang `/test-widget`). Có bảng "Khi nào
  dùng cách nào".

  **Commits đẩy production hôm nay** (theo `git log --oneline`):
  - `89b8ed0 Add en field + MERGE mode in translate-gemini.js; fix Adresse key`
  - `30338e4 update HowTo`
  - `8ccdd5a Use @latest instead of @main to bypass jsDelivr branch resolution lag`
  - `736582c fix bug` (walker round 2 + div selector)
  - `c51c929 Walker: hasTranslatableAncestor must also check direct text`
  - `85c443d Walker: skip elements without direct text (avoid wrapping)`
  - `b6be0fd Element-level translation refactor (v3) + retry/backoff + filtered strings`
  (Còn pending push: widget-test.html + HOW-TO test workflow section +
  widget.html/subpage.html đổi sang @HEAD)

  **Kết quả cuối ngày**: production hoạt động đầy đủ. Test InPrivate trên
  `gospelcenter.net` + `husgrupper`: nav, card grid, paragraphs với `<strong>`,
  footer Adresse/Kontakt/... đều dịch đúng EN/VI/NO.

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
- **2026-05-27 (lần 5)**: **Thêm `en` field + MERGE mode cho translate-gemini.js.**
  User báo "Adresse" trong footer không dịch sang VI dù translations.json có
  vi="Địa chỉ". Nguyên nhân: key cũ trong T là `<span><b>Adresse</b>...</span>`
  (extract từ walker v2 outermost rule), nhưng walker mới (sau hasDirectText
  fix) walk `<span>` trực tiếp → innerHTML là `<b>Adresse</b>...` (không có
  wrapping `<span>`). Mismatch → no translation.
  Cũng user yêu cầu thêm field `en` để click EN có thể dịch active sang tiếng
  Anh cho các element có source Norwegian (Adresse, Kontakt, Husgrupper,
  Organisasjonsnummer, Kontonummer, Vipps, phone).
  Fix:
  + `widget.js`: bỏ special case `if (lang==='en') restoreOrig`. Dùng unified
    lookup `entry[lang]` cho all langs. Fallback restore origHTML nếu
    `entry.en` không có (backward compat).
  + `translations.json`: thêm key mới `<b>Adresse</b>...` (không có wrapping
    span) với en/vi/no đầy đủ. Giữ luôn key cũ với en field add vào (back-
    compat nếu browser cache cũ).
  + Patch tay `en` field cho 7 Norwegian-source entry visible: Kontakt,
    Husgrupper, Organisasjonsnummer, Kontonummer, Vipps, phone, Adresse.
  + `translate-gemini.js`:
    * Schema thêm `en` (required + description "verbatim nếu source đã English")
    * Prompt thêm CRITICAL rule + Example A/B (English source → en=source,
      Norwegian source → en=translated). Cảnh báo không copy source vào field
      sai ngôn ngữ.
    * MERGE mode: load existing translations.json, chỉ dịch key chưa đầy đủ
      en+vi+no. Preserve manual edits + nav merge cũ. Refactor file write
      vào helper `writeOutputs()` để có sort keys (stable git diff).
  Total entries: 65 → 66 (thêm 1 Adresse no-span variant). 7/66 entries có
  en field, còn 58 entries chưa có. User có thể chạy `/translate` để Gemini
  fill nốt — merge mode đảm bảo không lose existing.
- **2026-05-27 (lần 4 — DONE)**: **Card grid `<div>` selector + jsDelivr
  `@main` lag workaround.** Sau push walker bug round 2:
  + Card grid (LECTURES/COURSES/...) vẫn English vì DOM là `<div>Lectures</div>`,
    `<div>` không có trong TRANSLATABLE. Fix: thêm `<div>` vào selector.
    `hasDirectText` filter đảm bảo chỉ walk div có text trực tiếp.
  + Cellgroup paragraph 1+3 (có `<strong>`) vẫn English — sau push fix `<div>`
    + clear browser cache thì tự dịch (root cause là widget cũ chưa fully
      loaded sau purge, không liên quan `<strong>`).
  + **jsDelivr `@main` resolution stuck**: sau push, `cdn.jsdelivr.net/.../@main/widget.js`
    serve commit cũ b6be0fd (8238 bytes) thay vì latest 736582c (9271 bytes).
    Mặc dù data API metadata BIẾT commit mới. Verified `@latest` URL serve
    bản đúng latest. **Fix**: đổi `widget.html` + `widget-subpage.html` sang
    `@latest`. User re-paste 1 lần. Từ đó trở đi không bao giờ phải đụng vào
    `@main` nữa.
  Final result: cả 3 issue đã fix. Production hoạt động đầy đủ.
- **2026-05-27 (lần 3)**: **Walker bug round 3 — `<div>` không trong selector.**
  Card grid `<div>Lectures</div>` không được walk. Fix: thêm `<div>` vào
  TRANSLATABLE list trong cả `widget.js` và `extract-strings.js`. Safety:
  `hasDirectText` filter loại bỏ layout div không có text trực tiếp.
- **2026-05-27 (lần 2 — sau push hasDirectText)**: **Walker bug round 2 —
  hasTranslatableAncestor không check direct text.** User test sau hasDirectText
  fix: chỉ còn 5 warning (down từ 50+), admin chrome gone, nhưng CHURCHES/ABOUT
  US nav vẫn English **và không có warning**. Trace: `<li><a>CHURCHES</a><ul>...
  </ul></li>` — `<li>` skip (no direct text), nhưng `<a>` cũng skip vì
  `hasTranslatableAncestor` thấy `<li>` match TRANSLATABLE → CẢ HAI bị skip.
  Fix: `hasTranslatableAncestor` chỉ block nếu ancestor `matches(TRANSLATABLE)`
  AND `hasDirectText(ancestor)`. Trace lại: `<li>` không có direct text →
  không count là walking ancestor → `<a>` walk → key="CHURCHES" match ✓
  Pending: user push widget.js + extract-strings.js, purge widget.js jsDelivr,
  test InPrivate.
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
