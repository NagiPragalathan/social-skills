#!/usr/bin/env bash
# Install (or remove) the terse token-saving skills for Claude Code.
#
#   ./install.sh                                  plugin mode: marketplace + plugin, hooks included
#   ./install.sh --skills                         copy skills to ~/.claude/skills (no hooks)
#   ./install.sh --skills --project ~/code/app    copy skills to ~/code/app/.claude/skills
#   ./install.sh --uninstall [--skills [--project DIR]]
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skills_src="$root/plugins/terse/skills"
plugin_id="terse@social-skills"
mode="plugin"
project=""
uninstall=0

while [ $# -gt 0 ]; do
  case "$1" in
    --skills) mode="skills" ;;
    --plugin) mode="plugin" ;;
    --project) project="${2:?--project needs a directory}"; shift ;;
    --uninstall) uninstall=1 ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ "$mode" = "plugin" ]; then
  if ! command -v claude >/dev/null 2>&1; then
    echo "The claude CLI is not on PATH. Inside Claude Code, run instead:"
    echo "  /plugin marketplace add $root"
    echo "  /plugin install $plugin_id"
    echo "Or rerun with --skills."
    exit 1
  fi
  if [ "$uninstall" = 1 ]; then
    exec claude plugin uninstall "$plugin_id"
  fi
  claude plugin marketplace add "$root"
  claude plugin install "$plugin_id"
  echo "Done. Start a new Claude Code session: terse mode is on by default."
  exit 0
fi

if [ -n "$project" ]; then
  dest="$project/.claude/skills"
else
  dest="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills"
fi

for skill in "$skills_src"/*/; do
  name="$(basename "$skill")"
  target="$dest/$name"
  if [ "$uninstall" = 1 ]; then
    if [ -d "$target" ]; then rm -rf "$target"; echo "removed   $target"; fi
    continue
  fi
  mkdir -p "$dest"
  if [ -d "$target" ]; then verb="updated  "; rm -rf "$target"; else verb="installed"; fi
  cp -R "$skill" "$target"
  echo "$verb $target"
done

[ "$uninstall" = 1 ] || echo "Done. Start a new Claude Code session and type /terse (auto-on needs plugin mode)."
