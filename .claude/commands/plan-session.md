---
description: Plan today's session from `.claude/memory.md` and current project state — what to prioritise and in what order.
---

Draft a prioritised plan for today's session.

First read `.claude/memory.md` (especially §1 *Active State* and the
open decisions / blockers in §1 and §4) and inspect the current git
status / diff to see uncommitted work. Then propose an **ordered**
plan with a one-line rationale per item. Prioritise in this order:

1. Unblock anything blocked on a decision (surface the decision to the
   user rather than guessing).
2. Finish in-progress work from §1 before starting new work.
3. New work requested by the user.

Respect the project's load-bearing quirks and hard constraints
(output parity over cleanliness, no auto-commit/PR, fixture
discipline, deterministic tests). For any non-trivial change, fold in
the default workflow from `.claude/CLAUDE.md`: draft plan →
`plan-reviewer` (before code) → implement → `qa-reviewer` →
`test-engineer` if coverage is thin → `pr-reviewer` before PR.

If `$ARGUMENTS` is non-empty, treat it as today's goal/scope and plan
around it. Do NOT start implementing or commit anything — output the
plan and wait for the user to choose what to run.
