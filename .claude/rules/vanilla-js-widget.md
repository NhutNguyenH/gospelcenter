# Rules: vanilla-js-widget

Hard rules for code in this repo. These are non-negotiable defaults — any
deviation must be called out and justified in the PR description.

## Browser code (`widget.html`, future `widget.js`)

### MUST

- **Vanilla JavaScript ES6+**, targeting evergreen browsers (Chrome, Edge,
  Firefox, Safari — last two versions). No transpilation, no polyfills.
- **No framework**: no React, Vue, Svelte, Alpine, jQuery. The widget is a
  single inline `<script>` / single external `<script src>`.
- **No bundler**: no webpack, Vite, Rollup, esbuild. Code ships as-is.
- **Build-time data only**: translations come from a baked-in
  `window.WIDGET_TRANSLATIONS` (or equivalent) object. The browser fetches
  nothing translation-related at runtime.
- **Respect `[data-no-translate]`**: any element with this attribute, and
  all its descendants, must be skipped by the translator.
- **SPA-friendly**: use `MutationObserver` to detect DOM changes on
  platforms that swap content without full page reloads.
- **Persist user choice** in `localStorage` under a namespaced key
  (`site_lang_deepl` currently). Read on load; write on toggle.
- **Idempotent**: re-running the translation pass on already-translated
  text must be a no-op (track translated nodes via `WeakSet` or sentinel
  attribute).
- **Fail-soft**: if `WIDGET_TRANSLATIONS` is missing or empty, the widget
  must not throw — it should silently leave the page in English.

### MUST NOT

- **No translation API calls** from the browser (no `fetch` to Gemini,
  DeepL, Google Translate, OpenAI, or any other LLM/translation service).
  This is the single hardest line in the project.
- **No `eval`, `new Function`, `setTimeout(string, ...)`**, or any other
  dynamic code execution. Inline `<script>` only.
- **No PII or analytics** beacons. The widget is a translator, not a
  tracker.
- **No blocking work >50ms** on language switch. Long DOM walks must be
  chunked via `requestIdleCallback` or yielded with
  `setTimeout(..., 0)`.
- **No third-party CDNs for libraries**. Only jsDelivr serving *our own
  GitHub repo* is acceptable (per migration plan). No cdnjs/unpkg/etc.
- **No `innerHTML` with translated strings**. Use `textContent` to avoid
  XSS if a translation happens to contain HTML-like characters.

## Node code (`translate-gemini.js`, helpers)

### MUST

- **Keys from `process.env` only**. Never inline an API key, never read
  it from a non-`.env` file, never log it. The script should fail loudly
  if `process.env.GEMINI_API_KEY` is missing.
- **Exponential backoff** on 429 and 5xx: 3 retries, base delay 1000ms,
  doubling each attempt. After 3 failures, surface the error and skip
  the batch (do not crash the whole run).
- **`AbortController` timeout of 30 seconds** on every `fetch`. A hung
  connection must not stall the pipeline.
- **Defensive response shape validation**: after `JSON.parse`, verify the
  response is an array of `{ vi, no }` objects with the expected length.
  Reject malformed batches; do not corrupt `translations.json`.
- **Atomic file writes**: write to `path.tmp`, then `fs.renameSync` to
  `path`. Crash-resistant — readers never see a half-written file.
- **Progress emission**: log `batch N/M` to stdout before each call.
  Long-running scripts that look hung erode trust.
- **CommonJS**: `require`/`module.exports`. No ESM until the project
  migrates wholesale.
- **Node ≥ 20.6**: required for native `--env-file` support.

### MUST NOT

- **No silent `catch`**: every `catch` block must either log or re-throw.
  `catch (e) {}` is banned.
- **No sync I/O on files >1MB**: `translations.json` could grow.
  Use `fs.promises.readFile` / `writeFile` once it's large enough to
  matter. Below 1MB, sync is fine for simplicity.
- **No globally-installed CLI assumptions**: do not `require('jest')` or
  similar. Tools come from `node_modules` only.
- **No writing outside the project directory**. Output paths are
  relative and within `cwd`.
- **No `child_process.exec` with user input**. If shelling out becomes
  necessary, use `execFile` with an argv array.
