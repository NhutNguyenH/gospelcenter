---
name: update-translation
description: Change an existing translation (vi/no/en) end-to-end — find the entry, sanity-check the proposed wording (spelling, grammatical form, church-context fit, site-wide consistency) and offer alternatives if it is off, then edit, regenerate translations.js, commit, push and purge jsDelivr. Use when the user wants to fix or reword a translation for a string already in translations.json ("đổi bản dịch", "sửa chữ X thành Y", "chữ này dịch sai"). Do NOT use when the English source text on the website itself changed — that needs a re-extract (HOW-TO.md Trường hợp 1).
---

# update-translation

End-to-end automation of **HOW-TO.md Trường hợp 3 / B**: the text on the
website stays the same, only its `vi` / `no` / `en` translation changes.

The user is non-technical and reads Vietnamese. Report in Vietnamese; keep
paths in Windows form when the user has to open something.

## Scope guard — read this first

| User's situation | This skill? |
|---|---|
| "Chữ X dịch sang tiếng Việt nghe kỳ, đổi thành Y" | ✅ Yes |
| "Bản dịch Na Uy của X sai" | ✅ Yes |
| "Trang cellgroup dịch chữ Z chưa chuẩn" | ✅ Yes |
| "Anh vừa đổi text trên builder rồi" | ❌ No — Trường hợp 1, user must re-extract in Edge InPrivate first |
| "Thêm chuỗi mới chưa có trong translations.json" | ❌ No — needs `/translate` (Gemini) or manual entry + user decision |

If the request is out of scope, say so plainly, point at the right HOW-TO
section, and stop. Do not improvise a half-workflow.

## Working directory

Everything runs from `C:\Evidi\Privat\ClaudeCode\WebHoiThanh\deepl-translator`.
All `node tools/...` commands assume that cwd.

---

## Step 1 — Locate the entry

```bash
node tools/find-translation.js "<what the user said>"
```

The search hits the key **and** every `en`/`vi`/`no` value, case-insensitively,
so it works whether the user quotes the English, the Vietnamese or the
Norwegian. It also prints which `strings/<page>.json` each entry came from.

Narrow by page when the user named one:

```bash
node tools/find-translation.js --page cellgroup "<text>"
```

**Rules:**

- **0 hits** → tell the user, show what was searched, suggest a shorter
  fragment. Do NOT create a new entry — that is out of scope.
- **>1 hit** → the tool prints `AMBIGUOUS`. **Stop and ask the user which `[n]`**.
  Duplicate concepts genuinely exist in this project (Camps / Các Kì Trại /
  Leirer are three separate entries). Guessing here silently changes the wrong
  string on a live site.
- **Exactly 1 hit** → continue.

## Step 2 — Validate the wording the user proposed

**Never write the user's replacement text verbatim without checking it first.**
The user is a native Vietnamese speaker writing Norwegian and English for a
public church website; a plausible-looking word is often the wrong form or the
wrong register. Checking costs one step and prevents a wrong word going live.

Check, in this order:

1. **Spelling / orthography** in the target language (Norwegian Bokmål,
   Vietnamese diacritics, English).
2. **Grammatical form** — this is where most errors are. For Norwegian
   especially: number and definiteness are four distinct forms
   (`menighet` / `menigheten` / `menigheter` / `menighetene`). Match the form
   to the **source key**: if `en` is plural, `no` must be plural. Match
   capitalisation to the key too (`CHURCHES` → `MENIGHETER`, not `Menigheter`).
3. **Semantic fit for a church context** — near-synonyms are not
   interchangeable. `kirke` = church building/institution; `menighet` =
   congregation/community. Same for Vietnamese: "Nhóm tế bào" is biological,
   "Nhóm nhỏ" is the religious sense.
4. **Consistency with the rest of the site** — search for the proposed word and
   for the word being replaced:
   ```bash
   node tools/find-translation.js "menighet"
   node tools/find-translation.js "kirke"
   ```
   If the site already uses one term elsewhere (especially in its own official
   name), that settles the register. Introducing a second term for one concept
   is a regression even when each entry is defensible alone.
5. **Collision check — run this last, right before writing:**
   ```bash
   node tools/find-translation.js --exact "<proposed value>"
   ```
   If another entry already carries that exact value, **stop and report**. Two
   consequences, both real:
   - The live page shows the same label twice for two different things.
   - `widget.js` `buildReverseIndex()` maps every en/vi/no value back to an
     entry, and a self-identity key wins. So if the builder re-renders the
     element while it is already translated, `resolveEntry` can resolve to the
     *other* entry and ship the wrong translation on the next language switch —
     the Camps / Các Kì Trại class of bug from 2026-05.

   Caught live on 2026-07-25: the user picked `Taler` for `Lectures`, but a
   separate `Taler` (Speeches / Bài phát biểu) entry already existed on the same
   home page. Offer collision-free alternatives and let the user re-pick.

**If everything checks out**, say so in one line and continue to Step 3.

**If anything is off**, do NOT silently "fix" it and do NOT refuse. Report what
is wrong in one or two sentences, then offer **2–4 concrete alternatives** with
the trade-off spelled out, and let the user choose. Show the evidence (the
`find-translation.js` hits) — the user knows the church's own language habits
better than you do, and a term that looks inconsistent may be deliberate.

Frame it as a check, not a correction: the user's instinct about *which word*
is usually right; it is the *form* that tends to be wrong.

## Step 3 — Edit `translations.json`

Use `Edit` on `translations.json`. Change **only** the language field(s) the
user asked for.

Guardrails:

- Never touch the **key** — it must stay byte-identical to the page's
  `innerHTML`, or the widget stops matching it entirely.
- Never touch `strings/*.json` — those are extraction inputs, not translations.
- Never run `/translate` here. Merge mode would skip complete entries anyway,
  and a full run burns Gemini quota for nothing.
- If the user's new wording is itself in the wrong language for the field
  (e.g. Vietnamese text going into `no`), flag it before writing.

## Step 4 — Regenerate `translations.js`

```bash
node tools/regen-translations-js.js
```

Rebuilds `translations.js` from `translations.json` with the exact format
`translate-gemini.js` produces (sorted keys, 2-space JSON, atomic `.tmp` +
rename). It refuses to write if `translations.json` is empty or malformed, and
warns about entries missing an `en`/`vi`/`no` field.

If it reports drift in entries the user did NOT ask about, that means
`translations.js` was already stale relative to `translations.json` from an
earlier hand-edit. Say so in the report — do not hide it. It is a fix, but the
user should know it is riding along in the commit.

## Step 5 — Show the diff, then go

**No local browser test.** The user removed it on 2026-07-25: too slow for the
size of the change, and they verify on the live site themselves anyway. Do not
reintroduce a local server, a fixture page, or Playwright here.

The safety net is Step 2 (wording check) plus the fact that
`regen-translations-js.js` derives both output files from one source, so they
cannot disagree. Confirm the new value actually landed:

```bash
git diff --stat translations.json translations.js
git diff translations.json
```

The diff must show only the language field(s) the user asked for. If it shows a
changed **key**, or an entry nobody asked about (other than known
already-stale drift from Step 4), STOP and report — do not commit.

**Approval:** when the user picked the wording in Step 2, that choice IS the
go-ahead. Do not ask a second time. Only stop for a fresh confirmation if the
diff contains something they did not choose.

The user's standing default (memory.md, 2026-05-23) is that they run git
themselves. This skill is the **one agreed exception**, and only for Trường
hợp B. Anything else → back to the default.

## Step 6 — Commit + push

Only the two generated files. The repo often has unrelated dirty files
(`widget.html`, `.claude/memory.md`) — never `git add -A`, never `git add .`.

```bash
git add translations.json translations.js
git commit -m "Update <ngôn ngữ> translation for \"<key preview>\""
git push
```

Commit directly to `main`: jsDelivr `@HEAD` serves it and that is this
project's documented flow for translation-only changes (HOW-TO.md). Feature
branches are for widget logic, not wording.

Verify the push landed:

```bash
git log --oneline -1 && git status --porcelain
```

## Step 7 — Purge jsDelivr

**Use `node -e` with `fetch`, NOT the WebFetch tool.** WebFetch caches per URL
for 15 minutes, so a second purge in the same session replays the first
response — same `id`, same `timestamp` — and looks like a fresh success when
nothing was purged. Observed 2026-07-25.

```bash
node -e "
(async () => {
  for (const f of ['translations.json','translations.js']) {
    const r = await fetch('https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/'+f);
    const d = await r.json();
    const p = d.paths['/gh/NhutNguyenH/gospelcenter@HEAD/'+f];
    console.log(f, '| status:', d.status, '| throttled:', p.throttled, '| ts:', d.timestamp, '| id:', d.id);
  }
})();
"
```

`translations.json` is the one that actually matters — `widget.js` fetches it at
runtime with a cache-bust query. `translations.js` is a back-compat fallback,
but purge it too so the two never drift on the CDN.

Sanity-check the `timestamp` is from *now*. If `throttled` is `true`, read
`throttlingReset` and either wait that many seconds and retry, or tell the user
the exact time to retry. Do not claim the purge succeeded when it was throttled
or when the response was a replay.

## Step 8 — Verify on the CDN

```bash
node -e "fetch('https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/translations.json?v='+Date.now()).then(r=>r.json()).then(d=>console.log(JSON.stringify(d['<KEY>'],null,2)))"
```

The new value must come back. If it is still the old one, the edge cache has
not rolled over yet — say so and give the user the retry command. Do NOT
report success on an unverified purge.

`@HEAD` is deliberate. Do not switch to `@main` or `@latest` — both were
observed serving hour-stale commits (memory.md, 2026-05-27).

## Final report (Vietnamese)

```
## Đã update bản dịch

**Chuỗi:** "<key>"
**Đổi:** <lang> "<cũ>" → "<mới>"
**Trang bị ảnh hưởng:** <pages từ find-translation>

### Kiểm tra
- ✅/❌ Từ vựng + ngữ pháp: <kết luận ngắn từ Step 2>
- ✅/❌ Commit + push: <sha>
- ✅/❌ Purge jsDelivr: translations.json, translations.js
- ✅/❌ CDN trả về giá trị mới

### Anh cần làm gì thêm
Đóng + mở lại cửa sổ InPrivate trong Edge → vào <URL trang> → bấm <lang>.
(Browser cache của anh có thể giữ bản cũ tới 7 ngày; InPrivate mới bypass được.)
```

Always end with that last line — the CDN being correct does not mean the
user's own browser will show the change.

## Failure modes

| Symptom | Cause | Action |
|---|---|---|
| `find-translation.js` → 0 hits | User quoted text that is not a key/value, or paraphrased | Ask for the exact wording seen on the page; try a 2–3 word fragment |
| `AMBIGUOUS` | Genuine duplicate entries (Camps/Các Kì Trại/Leirer) | Ask which `[n]`. Never guess |
| `regen` → "translations.json is EMPTY" | Atomic write was interrupted at some point | Do NOT overwrite. Rebuild from `translations.js`: parse `window.WIDGET_TRANSLATIONS`, restore, then retry |
| `git diff` shows a changed **key**, not just a value | Edit hit the wrong line | Revert with `git checkout -- translations.json`, redo Step 3 |
| Purge `"throttled": true` | jsDelivr rate limit | Wait `throttlingReset` seconds, retry. Do not report success |
| CDN still old after purge | Edge cache lag | Retry after ~30s; if persistent, tell the user — do not silently pass |

## What this skill never does

- Never runs `/translate` or calls Gemini (no quota use, no re-translation).
- Never edits `strings/*.json`, `widget.js`, `widget.html`, or `extract-strings.js`.
- Never `git add -A` / `git add .` — only the two generated files.
- Never writes the user's proposed wording without the Step 2 check first.
- Never spins up a local server or browser to test — removed 2026-07-25.
- Never claims a purge or CDN verification that did not actually return the new value.
