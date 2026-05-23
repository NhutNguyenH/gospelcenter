---
description: Run pr-reviewer-agent against the current git diff (or a supplied revision range). Flags secrets, runtime API calls in browser code, and other risky patterns before commit.
argument-hint: "[revision-range]  e.g. main..HEAD, HEAD~3..HEAD, or empty for working-tree diff"
---

Launch the `pr-reviewer-agent` to review changes.

**Range to review**: `$ARGUMENTS` (if empty, the agent reviews the working-tree
diff: `git diff` for unstaged + `git diff --cached` for staged).

The agent will:

1. Run the appropriate `git diff` command for the requested range.
2. Scan the diff for:
   - Hardcoded secrets (`AIzaSy*`, `sk-*`, `DeepL-Auth-Key`, etc.)
   - `fetch`/`XMLHttpRequest` calls in browser-code files (forbidden)
   - References to `process.env.*` leaking into browser code
   - `.env` being added to the working tree
   - Any change to `.gitignore` that removes secret-protecting entries
3. Produce a verdict (✅ ship / ⚠️ address findings / 🛑 block) and a
   findings list with severity (BUG / CONCERN / NIT).

The agent does NOT commit, push, or modify code — it only reports.

Common invocations:

- `/review-diff` — review uncommitted local changes
- `/review-diff main..HEAD` — review everything on this branch vs main
- `/review-diff HEAD~1..HEAD` — review just the last commit
