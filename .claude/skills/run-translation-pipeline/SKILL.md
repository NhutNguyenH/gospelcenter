---
name: run-translation-pipeline
description: Execute `translate-gemini.js` using the local `.env` to regenerate `translations.json` and `widget.html`. Use when the user asks to regenerate translations, run the pipeline, or refresh widget output after editing `strings.json`.
---

# run-translation-pipeline

## Goal
Safely invoke the offline translation pipeline using the user's local Gemini
API key from `.env`. Never log the key. Verify output validity.

## Pre-flight checks (all must pass)

### 1. `.env` exists and contains the key
```bash
test -f .env && grep -q "^GEMINI_API_KEY=" .env && echo OK || echo "MISSING_KEY"
```
On `MISSING_KEY`: stop and instruct the user:

> "`.env` is missing or has no `GEMINI_API_KEY=` line. Get a free key at
> https://aistudio.google.com/apikey, then add `GEMINI_API_KEY=AIzaSy...` to
> `.env`."

### 2. `.env` is gitignored
```bash
git check-ignore .env > /dev/null 2>&1 && echo OK || echo "NOT_IGNORED"
```
On `NOT_IGNORED`: stop. `.env` is about to be loaded with a secret; if it's
not gitignored, the next commit could leak the key.

> "`.env` is not gitignored. Add `.env` to `.gitignore` before running this
> skill — otherwise the key risks being committed."

### 3. `strings.json` is a non-empty array
```bash
node -e "const a=require('./strings.json'); if(!Array.isArray(a)||a.length===0){console.error('not a non-empty array');process.exit(1)}"
```
On non-zero exit: stop. Tell the user to populate `strings.json` first using
`extract-strings.js` in DevTools.

### 4. Node version ≥ 20.6 (for native `--env-file`)
```bash
node -e "const [maj,min]=process.versions.node.split('.').map(Number); process.exit(maj>20||(maj===20&&min>=6)?0:1)"
```
On non-zero exit: suggest upgrading Node, or fall back to:
```bash
export $(grep -v '^#' .env | xargs) && node translate-gemini.js
```

## Run

```bash
node --env-file=.env translate-gemini.js
```

Stream stdout/stderr. If the script logs anything matching `AIzaSy*`, redact
it in the report (replace with `AIzaSy***`).

## Post-run verification

### `translations.json` is valid JSON and non-empty
```bash
node -e "const t=JSON.parse(require('fs').readFileSync('translations.json','utf8')); if(Object.keys(t).length===0)process.exit(1); console.log('entries:',Object.keys(t).length)"
```

### `widget.html` has had the placeholder replaced
```bash
! grep -q "__TRANSLATIONS_PLACEHOLDER__" widget.html && echo OK || echo "PLACEHOLDER_NOT_REPLACED"
```

### `widget.html` contains the actual data
```bash
grep -q '"vi":' widget.html && grep -q '"no":' widget.html && echo OK || echo "DATA_MISSING"
```

## Report

```
## Translation pipeline run

- Input strings: N (from strings.json)
- API batches sent: B
- Output entries in translations.json: E
- widget.html size: X KB
- translations.json size: Y KB
- Duration: T seconds

### Preview (first 3 entries)
- "English string 1" → vi: "...", no: "..."
- "English string 2" → vi: "...", no: "..."
- "English string 3" → vi: "...", no: "..."

### Sanity checks
- ✅/❌ widget.html placeholder replaced
- ✅/❌ translations.json is valid JSON
- ✅/❌ All input strings have both vi and no translations
```

If `N != E` (some strings missing from output), flag it as a concern — at
least one batch likely failed silently.

## Failure modes

| Symptom | Likely cause | Action |
|---|---|---|
| HTTP 429 from Gemini | Free tier rate limit (15 RPM) | Wait 60s, re-run. If persistent, lower `BATCH_SIZE` in `translate-gemini.js` |
| HTTP 401 / 403 | Invalid or expired API key | Tell user to verify key at https://aistudio.google.com/apikey |
| HTTP 400 with "API key not valid" | Same as 401 | Same |
| `ENOTFOUND` / `ECONNREFUSED` | Network down | Check connectivity; re-run |
| Empty `translations.json` after run | Every batch failed | Re-read script stderr; usually a key or quota problem |
| Translations look wrong (e.g., English back) | Gemini went off-task | Re-run; if persistent, review prompt in `translate-gemini.js` |
| Script hangs >5 minutes | `fetch` timeout missing | Ctrl+C; report to `qa-reviewer-agent` for timeout fix |

## Security guarantees

- This skill **never** prints `process.env.GEMINI_API_KEY` to user-visible
  output.
- This skill **never** writes the key to any file other than the user's
  existing `.env`.
- This skill **refuses** to run if `.env` is not gitignored — protects against
  accidental commit.

## What this skill does NOT do

- Does not call `git add` or commit anything (output files like
  `translations.json` and `widget.html` are intentionally tracked; the user
  decides when to commit).
- Does not modify `strings.json` (input only).
- Does not regenerate `widget-template.html` (template is authored, not
  generated).
- Does not push to GitHub or upload to jsDelivr (deferred to CDN migration).
