# Memory — gospelcenter translation widget

> Update this file as project state changes. It is the source of truth across
> sessions. Keep entries concise and dated where it matters.

---

## Current Focus

**CDN Refactor — Phase 1**: migrate `gospelcenter` from private+inline to
public-repo + jsDelivr-served `translations.js`/`widget.js`.

Open punch list:

- [ ] **Security pre-scan** of all tracked files + git history for leaked secrets
      (the original `translate-gemini.js` had a hard-coded Gemini key — already
      scrubbed in code, but check git history before going public).
- [ ] **Confirm with user**: switch `NhutNguyenH/gospelcenter` to PUBLIC.
- [ ] **Refactor `translate-gemini.js`** to emit `translations.js`
      (`window.WIDGET_TRANSLATIONS = {...}`) instead of inlining into
      `widget.html`.
- [ ] **Extract `widget.js`** from `widget-template.html`. The HTML shell stays
      tiny; logic moves to a hostable file.
- [ ] **Update `widget.html`** to reference both files via
      `<script src="https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/...">`.
- [ ] **Document the update workflow**: edit local → push → purge URL
      (`https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter/...`).
- [ ] **Decide branch strategy**: `@main` (always-fresh, 12h cache TTL) vs
      version-pinned tags (rollback-safe). Default recommend `@main`.

Phase 2 (deferred): Node crawler that reads `sitemap.xml` and emits `strings.json`
without manual DevTools paste per page. Only relevant for site >30 pages.

---

## Architecture Constraints

- **STRICTLY NO runtime translation API calls in the browser.** The widget's
  data is baked in at build time. Any code that adds `fetch()` to DeepL /
  Gemini / OpenAI / any translation service in browser code is a hard reject
  during review.
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
