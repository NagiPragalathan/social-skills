# terse: spend fewer tokens in Claude Code

`terse` is a Claude Code plugin that cuts token usage without dropping information. It does three things:

- **Shorter replies.** Claude answers first and drops openers, recaps and padding. Code, commands, paths, errors, numbers and negations stay exact.
- **Leaner reads.** Claude greps before it reads, reads line ranges instead of whole files, and trims command output.
- **Smaller standing context.** It compresses the memory files (`CLAUDE.md` and similar) that load into every session.

Once the plugin is installed, terse mode is on in every session. You don't need to type anything.

| Example question | Output tokens |
|---|---:|
| "Why does git push fail with 'rejected (non-fast-forward)'?" without terse | 835 |
| Same question with terse (standard level) | **393** |

That is a single run on Claude Haiku, so treat it as an illustration, not a benchmark. Savings depend on the model and the task. See [Measure it yourself](#measure-it-yourself).

## What's inside

| Part | What it does |
|---|---|
| `/terse [lite\|standard\|max\|off]` | Sets the reply style for the session. On by default at `standard`. |
| `/terse-commit` | Writes a Conventional Commits message from the staged diff. It reads `--stat` first and only opens hunks it needs. |
| `/terse-review [target]` | Reviews code with one line per finding: `path:line [severity] problem. fix.` |
| `/terse-compress <file>` | Shrinks a prose file such as `CLAUDE.md`. It backs the file up first and checks that code, URLs and paths survived. |
| Hooks | Turn terse on at session start and after compaction, remind Claude on each prompt, and ask subagents for dense reports. |

### Levels

| Level | Style |
|---|---|
| `lite` | Complete sentences, no filler. Good for people new to a codebase. |
| `standard` | Short sentences and fragments, answer in the first line. The default. |
| `max` | Fragments only, each fact once. |
| `off` | Normal Claude. "stop terse" and "normal mode" also work. |

Terse always switches back to full sentences for security warnings, destructive actions, ordered steps, and questions to you. Anything it writes to files (code comments, commits, docs, PRs) keeps that file type's normal conventions.

## Install

**Requirement:** Node.js 18+ on `PATH` for the hooks and for `/terse-compress`. The other skills work without Node.

### Option A: from a Git repo (recommended for a team)

The plugin is published at [github.com/NagiPragalathan/social-skills](https://github.com/NagiPragalathan/social-skills). Each person runs the following inside Claude Code:

```
/plugin marketplace add NagiPragalathan/social-skills
/plugin install terse@social-skills
```

From a terminal, the same commands are:

```
claude plugin marketplace add NagiPragalathan/social-skills
claude plugin install terse@social-skills
```


### Option B: turn it on for everyone working in a repo

Commit this to the project's `.claude/settings.json`. Teammates are prompted to install the plugin when they open the project.

```json
{
  "extraKnownMarketplaces": {
    "social-skills": {
      "source": { "source": "github", "repo": "NagiPragalathan/social-skills" }
    }
  },
  "enabledPlugins": {
    "terse@social-skills": true
  }
}
```

### Option C: from a local copy

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

```bash
# macOS / Linux / Git Bash
./install.sh
```

Alternatively, inside Claude Code run `/plugin marketplace add C:\path\to\social-skills`, then `/plugin install terse@social-skills`.

### Option D: skills only (no plugin system, no hooks)

```powershell
.\install.ps1 -Mode skills                                   # your user
.\install.ps1 -Mode skills -Scope project -ProjectDir <repo> # commit into a repo
```

```bash
./install.sh --skills
./install.sh --skills --project <repo>
```

In this mode nothing turns on by itself. Type `/terse` at the start of a session.

Start a new session after installing.

## Settings

Create `~/.claude/terse/config.json` (all keys optional):

```json
{
  "defaultLevel": "standard",
  "reminder": true,
  "subagents": true
}
```

| Key | Meaning |
|---|---|
| `defaultLevel` | Level for new sessions: `lite`, `standard`, `max` or `off`. With `off`, terse runs only when someone types `/terse`. |
| `reminder` | Adds a one-line reminder (about 20 tokens) to each prompt so long sessions don't drift back to verbose replies. |
| `subagents` | Asks subagents for dense final reports, which the main agent then reads as input. |

The environment variable `TERSE_LEVEL` overrides `defaultLevel`, for example `TERSE_LEVEL=off` for a single run.

Level changes are remembered per session in `~/.claude/terse/sessions.json`. Entries older than 14 days are pruned. `/terse-compress` backups go to `~/.claude/terse/backups/`.

## Measure it yourself

- `claude plugin details terse` shows the plugin's own overhead: about 250 tokens of skill descriptions in every session, plus about 950 tokens of rules once per session, which are cached after the first turn.
- Run the same prompt with and without the plugin and compare `usage.output_tokens`:

  ```
  claude -p "<question>" --output-format json --plugin-dir ./plugins/terse
  claude -p "<question>" --output-format json
  ```

- In an interactive session, `/cost` shows the session total.

Where it saves most: long chatty sessions, explanations, reviews and subagent-heavy work. Where it saves little: tasks that are mostly code edits, because code is never shortened.

## Uninstall

```
/plugin uninstall terse@social-skills
```

Or run `.\install.ps1 -Uninstall`, or `.\install.ps1 -Mode skills -Uninstall` if you used Option D.

## Layout

```
.claude-plugin/marketplace.json     marketplace "social-skills"
plugins/terse/
  .claude-plugin/plugin.json
  skills/terse/SKILL.md             reply rules (one source; hooks read it too)
  skills/terse-commit/SKILL.md
  skills/terse-review/SKILL.md
  skills/terse-compress/SKILL.md
  skills/terse-compress/scripts/guard.js   backup + verification
  hooks/hooks.json                  SessionStart, SubagentStart, UserPromptSubmit
  hooks/*.js
install.ps1, install.sh
```

To change the rules, edit `plugins/terse/skills/terse/SKILL.md`, bump `version` in both `plugin.json` and `marketplace.json`, and push. Teammates pick up the change with `/plugin marketplace update social-skills`.
