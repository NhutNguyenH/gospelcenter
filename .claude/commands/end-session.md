---
description: Wrap up the session — append progress, current state, next steps, and key decisions to `.claude/memory.md`.
---

Before ending the session, update the project memory at
`.claude/memory.md` so the next session can resume cleanly.

Follow memory.md's hard rules: **append only** within the fixed five
sections (do NOT rewrite or restructure), date every entry
`YYYY-MM-DD`, strike through outdated entries instead of deleting,
reference `file:line` instead of pasting code, and do not duplicate
the auto-memory under `~/.claude/projects/.../memory/`.

Append, mapping each item to its section:

1. **What was completed this session** → §1 *Active State & Current
   Focus* ("Recently completed (YYYY-MM-DD)").
2. **Current state of each in-progress part** → §1 ("In progress" /
   "Active branch").
3. **Next steps / blockers** → §1 ("Immediate next steps").
4. **Important decisions & the reason** → §2 *Architectural & Design
   Decisions* (or §3/§4 if testing/environment). Use the format
   `YYYY-MM-DD → decision → why → consequences → reversible?`.
5. **Hand-off for the next agent** → §5 with
   `### YYYY-MM-DD — <agent> → <next or "all"> — <topic>` (≤5 bullets).

Only record decisions and discoveries — trivial code edits do not
warrant a memory update. If `$ARGUMENTS` is non-empty, treat it as a
summary hint of what this session covered and weave it in.

Do NOT commit or push. Report back a short bullet list of exactly
what you appended and to which sections.
