---
name: terse-commit
description: >
  Write a short, exact Conventional Commits message from the staged diff,
  reading as little of the diff as needed. Use for /terse-commit, "write a
  commit message", "commit message for this".
argument-hint: "[extra context]"
---

# Terse commit

Write the commit message the diff deserves, and nothing more. Extra context from the user: $ARGUMENTS

## Read the change cheaply

1. `git diff --staged --stat` first. Nothing staged? Say so and stop. Do not stage files unless the user asked.
2. Read full hunks only for files whose purpose the stat line does not make clear. For a large diff, read per file: `git diff --staged -- <path>`.
3. `git log --oneline -8` to match the repo's existing style (type names, scopes, capitalization).

## Subject line

- `<type>(<scope>): <summary>`. Scope is optional.
- Types: feat, fix, perf, refactor, docs, test, build, ci, chore, style, revert.
- Imperative mood: "add", "fix", "drop". Not "added" or "adds".
- Aim for 50 characters. Never over 72. No trailing period.
- Breaking change: add `!` after the type or scope.

## Body: only when it earns its place

Write a body only for:

- a *why* the subject cannot carry,
- breaking changes (`BREAKING CHANGE: ...`) with the migration path,
- security fixes, data migrations and reverts. These always get a body.

Body rules: blank line after the subject, wrap at 72 characters, `-` bullets, issue refs last (`Closes #12`).

## Leave out

- "This commit...", "I", "we", "now", "currently". The diff already shows what changed.
- File-by-file lists the diff already shows.
- Emoji, unless the repo history uses them.

Keep any trailer the project or the environment requires (for example `Co-Authored-By`), exactly as specified.

## Output

Print the message in a code block. Run `git commit` only if the user asked you to commit.

## Examples

Weak: `fix: fixed an issue where the login page was crashing when the user had no email`

Good: `fix(auth): handle users without email on login`

With a body:

```
feat(api)!: rename /v1/orders to /v1/checkout

BREAKING CHANGE: clients must call /v1/checkout. /v1/orders returns
410 Gone from 2027-01-15.
```
