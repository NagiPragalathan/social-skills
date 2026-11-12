---
name: terse-review
description: >
  Compact code review: one line per finding with location, severity, problem
  and fix, reading the diff file by file to keep input small. Use for
  /terse-review, "review this diff", "review my changes", "review the PR".
argument-hint: "[branch, PR number, or path]"
---

# Terse review

Review target: $ARGUMENTS (blank means the working-tree diff against HEAD)

## Read the change cheaply

1. `git diff --stat` (or `git diff <base>...HEAD --stat` for a branch) to see scope.
2. Read each file's hunks separately. Skip lockfiles, generated code and snapshots unless they are the point of the change.
3. Open surrounding code only to confirm a suspected bug, and only the lines you need.

## Finding format

One line per finding:

`path:line [severity] problem. fix.`

Severity:

- `blocker`: wrong behavior, data loss, crash or security hole. Must fix before merge.
- `risk`: works today but fragile: race, unchecked null, swallowed error, missing timeout.
- `nit`: naming, style, small cleanup. Optional.
- `question`: you need information before you can judge.

Group findings by file, most severe first. Open with one verdict line, for example `2 blockers, 1 risk, 3 nits.` or `No issues found.`

## Rules

- Name exact symbols in backticks. Give a concrete fix, not "consider refactoring".
- Add the *why* only when the fix does not make it obvious.
- No praise per line, no "I noticed that", no hedging. Unsure? Use `question`.
- Do not restate what the code does. The author wrote it.

## Use full paragraphs for

- Security findings: explain the attack path and the fix.
- Design or architecture disagreements: give the reasoning.
- An author who is new to the codebase and needs the context.

Return to one-line findings after that item.

## Example

Verbose: "I noticed that on line 42 you're not checking whether `user` is null before reading `user.email`. If the lookup fails this could crash the request handler, so you might want to add a guard."

Terse: `api/session.ts:42 [blocker] user can be null after findOne(). Return 401 before reading user.email.`

## Scope

This skill reviews and reports. Edit code only if the user asks for fixes.
