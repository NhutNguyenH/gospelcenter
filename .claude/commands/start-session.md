---
description: Catch up at the start of a session — read `.claude/memory.md` and report where the project is, what's next, and what to watch out for.
---

Read the project memory at `.claude/memory.md` before doing anything
else. Scan every section: §1 *Active State* (branch / what just
changed), §2 *Architectural & Design Decisions* (load-bearing quirks,
DI, serialisation), §3 *Testing Strategies*, §4 *Environment & Known
Issues*, and §5 *Agent Hand-off Notes*. Also glance at
`.claude/CLAUDE.md` "Load-bearing quirks" and the hard constraints for
supporting context.

Then report back concisely (in Vietnamese), three parts:

1. **Dự án đang ở đâu** — branch in flight, what was last completed,
   anything in progress.
2. **Bước tiếp theo là gì** — immediate next steps and any open
   decisions / blockers from §1 and §4.
3. **Có gì cần chú ý** — load-bearing quirks, hard constraints
   (output parity, no auto-commit, fixture discipline), and any
   pending hand-off notes in §5.

This is read-only — do NOT change code, fixtures, or memory. Before
relying on any file/line a memory entry names, verify it still exists
(memory reflects what was true when written). If `$ARGUMENTS` is
non-empty, treat it as a focus area and bias the report toward it.
