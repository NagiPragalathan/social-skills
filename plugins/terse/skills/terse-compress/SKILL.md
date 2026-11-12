---
name: terse-compress
description: >
  Shrink a prose file that Claude re-reads every session (CLAUDE.md,
  AGENTS.md, rules, notes, todo lists) so it costs fewer input tokens. Makes
  a backup first and runs a check that code, commands, paths and URLs
  survived unchanged. Use for /terse-compress <file>.
argument-hint: "<path-to-file>"
disable-model-invocation: true
---

# Terse compress

File to compress: $ARGUMENTS

Files such as CLAUDE.md are loaded into every session. Each word you remove saves tokens in every future conversation. Meaning must not change.

## Steps

1. **Need a path.** If no file path was given, ask for one. Do not compress text pasted into the chat.
2. **Prose only.** Accept `.md`, `.mdx`, `.txt`, `.rst`, or a file with no extension that holds prose. Refuse code and config files (`.js`, `.py`, `.json`, `.yaml`, `.toml`, and so on): rewording them breaks them.
3. **Back up.** Run:
   `node "${CLAUDE_SKILL_DIR}/scripts/guard.js" backup "<absolute path>"`
   It refuses files that look like secrets and prints the backup path. If it refuses, stop and tell the user why.
4. **Rewrite the file in place**, following the rules below.
5. **Check.** Run:
   `node "${CLAUDE_SKILL_DIR}/scripts/guard.js" check "<backup path>" "<absolute path>"`
   - `PASS`: report the result line it prints.
   - `FAIL`: put back each listed item exactly as the original had it, then check again.
   - Still failing after two fixes: copy the backup over the file, and tell the user nothing was changed.
6. **Report** in one or two lines: tokens before and after, and the backup path. The user can restore with a copy from that path.

## Keep exactly

- Fenced code blocks and `inline code`.
- Commands, file paths, URLs, link targets, environment variables.
- Names of tools, libraries, people, projects. Numbers, versions, dates.
- Heading structure. Heading text may be shortened.
- Rule strength: must, never, always, only, do not, except, unless. "Never X" must stay "never X".

## Cut

- Politeness and padding: "Please", "Make sure to", "It is important to note that", "Remember that".
- Hedges: "generally", "you may want to", "it is usually a good idea to".
- Explanations of things any developer already knows.
- Repeated rules. Keep the clearer copy, and only when both mean the same thing.

## Reshape

- Paragraphs become bullets: one rule per bullet, imperative mood.
- Drop articles and filler verbs where the line still reads in one pass.
- Use short words: "use" for "make use of", "to" for "in order to".

## Never

- Change what a rule means, or merge two rules that have different conditions.
- Drop a rule, a warning or an example because it seems unimportant.
- Add content, opinions, or notes about the compression to the file.

## Example

Before:

> Please make sure that you always run the linter before you commit any changes, because otherwise the CI pipeline will fail. It's also important to note that you should never commit directly to the `main` branch.

After:

> - Run linter before every commit. CI fails otherwise.
> - Never commit directly to `main`.
