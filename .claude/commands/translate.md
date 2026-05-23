---
description: Run the offline translation pipeline (Gemini → translations.json + widget.html). Loads GEMINI_API_KEY from local .env.
---

Invoke the `run-translation-pipeline` skill to regenerate `translations.json`
and `widget.html` from the current `strings.json` using the local Gemini API
key in `.env`.

The skill will:

1. Verify `.env` exists, contains `GEMINI_API_KEY=`, and is gitignored.
2. Verify `strings.json` is a non-empty array.
3. Verify Node ≥ 20.6 (for native `--env-file`).
4. Run `node --env-file=.env translate-gemini.js`, streaming output.
5. Validate that `translations.json` is valid JSON and `widget.html` has
   had its placeholder replaced.
6. Report counts, sizes, and a 3-entry preview.

If any pre-flight check fails, the skill stops and explains what's missing.
The Gemini key is never echoed to the output.
