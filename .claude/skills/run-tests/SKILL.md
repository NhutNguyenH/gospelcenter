---
name: run-tests
description: Run the project's automated test suite (Jest). Use when the user asks to run tests, check test status, or verify changes after writing new tests. Bootstraps Jest on first run with explicit user confirmation.
---

# run-tests

## Goal
Execute the project's automated test suite and report results clearly.

## Pre-flight checks

### 1. Node version
```bash
node --version
```
Require ≥ 20.6 (matches Node version used elsewhere in the project). If older,
stop and tell the user to upgrade.

### 2. `package.json` exists with a `test` script
```bash
test -f package.json && node -e "process.exit(require('./package.json').scripts?.test ? 0 : 1)"
```
- Exit code 0 → ready to run.
- File missing OR no `test` script → bootstrap (see below).

### 3. `node_modules` populated
```bash
test -d node_modules && echo OK || echo MISSING
```
If missing: run `npm install`.

## Bootstrap (only if no test infra)

Stop and ask the user before running:

> "No test infrastructure detected. I'll set up Jest:
>
> 1. `npm init -y` (if no `package.json`)
> 2. `npm install --save-dev jest jest-environment-jsdom`
> 3. Add `"test": "jest"` to package.json scripts
> 4. Create `__tests__/` directory if absent
>
> Proceed?"

Only proceed on explicit confirmation. These commands mutate the project root
and add ~50MB of `node_modules`.

After bootstrap, point the user at `test-engineer-agent` to write the first
tests:

> "Jest is installed but no tests exist yet. Want me to delegate to
> `test-engineer-agent` to add coverage for `translate-gemini.js`?"

## Run

```bash
npm test 2>&1
```

Stream output. Do not capture and re-print the entire log — let Jest's own
formatting speak.

If Jest is run with `--passWithNoTests` and there are no tests, surface that
clearly. An empty run is not a passing run for reporting purposes.

## Report

```
## Test run

- Total: N tests across F files
- Passing: P
- Failing: Q
- Skipped: S
- Duration: T seconds

### Failures
(only if Q > 0)
- `path/to/test.js:NN` — <test name> — <first line of error>
- (...)

### Next step
(only if Q > 0) Suggest invoking `qa-reviewer-agent` to investigate, or
delegate fix to the orchestrator.
```

If all tests pass, the report is one line: `✅ All N tests passing in T seconds.`

## Failure modes

| Symptom | Action |
|---|---|
| `npm test` exits with `command not found: jest` | `node_modules` corrupt; suggest `rm -rf node_modules && npm install` |
| `SyntaxError` in test file | Don't try to fix; report to user |
| Tests hang for >2 minutes | Likely missing `--detectOpenHandles`; report and ask whether to retry |
| Coverage threshold failures | Treat as test failures; do not silently relax the threshold |

## What this skill does NOT do

- Does not modify test files (that's `test-engineer-agent`).
- Does not modify production code to make tests pass (that's a bug fix, not a
  test run).
- Does not delete `__tests__/` or any file in it.
- Does not pass `--passWithNoTests` silently; an empty test set is a finding,
  not a pass.
- Does not commit any changes — even if Jest creates snapshot files.
