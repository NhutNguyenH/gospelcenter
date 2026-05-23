# Orchestration — gospelcenter translation widget

## Project at a glance

Static offline translation widget that replaces GTranslate on a website builder
platform. The user is non-technical and uses Microsoft Edge.

**Pipeline (build time):**
```
extract-strings.js (DevTools)  →  strings.json
        ↓
node --env-file=.env translate-gemini.js
        ↓
translations.json  +  widget.html
        ↓
paste into platform's HTML embed widget
```

**Pipeline (runtime — in the browser):**
The widget reads a pre-baked `TRANSLATIONS` constant, walks text nodes via
`TreeWalker`, swaps `nodeValue`s on click, and observes DOM mutations for
SPA-like content. **No translation API is ever called from the browser.**

**Current phase:** CDN refactor — move repo public, host `translations.js` +
`widget.js` via jsDelivr. See `memory.md` for the open punch list.

## Key files

| File | Role |
|---|---|
| `extract-strings.js` | DevTools snippet, gathers EN text from live pages, merges across pages via `localStorage` |
| `translate-gemini.js` | Node CLI, calls Gemini 2.5 Flash, writes `translations.json` + `widget.html` |
| `translate.js` | DeepL alternative (kept as fallback) |
| `widget-template.html` | Shell HTML/CSS/JS with `__TRANSLATIONS_PLACEHOLDER__` |
| `widget.html` | Final output to paste into platform |
| `strings.json` | Input array of English strings |
| `translations.json` | Editable mid-step `{ "EN": { vi, no } }` |
| `.env` | `GEMINI_API_KEY=...` (gitignored, never committed) |

## Delegation guide

When the user's request matches a row, route the work to the named agent via
the `Agent` tool. Don't replicate the agent's job yourself.

| User request shape | Delegate to | `subagent_type` |
|---|---|---|
| "Review my changes", "look at this PR", "check the diff" | PR reviewer | `pr-reviewer-agent` |
| "Is this plan safe?", "review my CDN migration approach", "before I go public…" | Migration architect | `migration-architect-agent` |
| "Deep review of `extract-strings.js`", "audit `translate-gemini.js`", "what could go wrong here" | QA reviewer | `qa-reviewer-agent` |
| "Add tests", "test this function", "what's the test coverage" | Test engineer | `test-engineer-agent` |

For everything else (small edits, questions, running scripts), handle it
yourself. Don't over-delegate — agents are for focused multi-step work.

## Skills available

| Skill | Use when |
|---|---|
| `run-translation-pipeline` | User wants to regenerate translations / `widget.html` |
| `run-tests` | User wants to execute the test suite |

Invoke skills via the Skill tool with the exact name.

## Slash commands available

| Command | Effect |
|---|---|
| `/translate` | Invokes `run-translation-pipeline` |
| `/review-diff` | Invokes `pr-reviewer-agent` on current `git diff` |

## Hard constraints (never violate)

1. **No runtime translation API calls in the browser.** This is THE
   architectural rule of this project. Inline data only.
2. **API keys live in `.env` only.** No hard-coding, no logging, no CLI argv.
3. **Repo visibility check before publishing.** Before flipping private→public,
   scan all tracked files (and ideally history) for `AIzaSy[A-Za-z0-9_-]{30,}`
   and similar patterns.
4. **Non-technical user.** Give Windows-friendly instructions, use Edge for any
   browser steps, use Notepad-friendly file paths (`C:\...`).

## When in doubt

Read `.claude/memory.md` for current focus, decisions made, and open questions.
Update memory when state changes — it's the source of truth across sessions.
