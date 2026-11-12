#!/usr/bin/env node
'use strict';
// UserPromptSubmit: track level changes (/terse <level>, "stop terse", ...)
// and, while terse mode is on, add a one-line reminder so long sessions
// do not drift back to verbose replies.

const { loadConfig, getLevel, setLevel, readInput, parseLevel, rules, reminder, emit } = require('./lib');

const SHORT_PROMPT = 40; // plain-language switches only count in short prompts
const OFF_PHRASES = /^(?:please\s+)?(?:stop|disable|turn\s+off|exit|end)\s+terse(?:\s+mode)?[.!]*$|^terse(?:\s+mode)?\s+off[.!]*$|^(?:back\s+to\s+)?(?:normal|verbose)\s+mode[.!]*$/;
const ON_PHRASES = /^(?:please\s+)?(?:be\s+terse|terse\s+mode(?:\s+on)?|terse\s+on|start\s+terse(?:\s+mode)?)[.!]*$/;

// Returns { level, slash } when the prompt changes the level, else null.
function detect(prompt, config) {
  const p = prompt.trim().toLowerCase();

  const slash = p.match(/^\/(?:terse:)?terse(?![\w-])\s*([\w-]*)/);
  if (slash) {
    if (!slash[1]) return { level: config.defaultLevel === 'off' ? 'standard' : config.defaultLevel, slash: true };
    const level = parseLevel(slash[1]);
    return level ? { level, slash: true } : null;
  }

  if (p.length > SHORT_PROMPT) return null;
  if (OFF_PHRASES.test(p)) return { level: 'off', slash: false };
  if (ON_PHRASES.test(p)) return { level: config.defaultLevel === 'off' ? 'standard' : config.defaultLevel, slash: false };
  return null;
}

const config = loadConfig();
const input = readInput();
const change = detect(String(input.prompt || ''), config);

if (change) {
  setLevel(input.session_id, change.level);
  // A slash command loads the skill itself. A plain-language switch does not,
  // so send the full rules with it.
  if (change.level !== 'off' && !change.slash) {
    emit('UserPromptSubmit', `Terse mode switched to "${change.level}".\n\n${rules(change.level)}`);
  }
  process.exit(0);
}

const level = getLevel(input.session_id, config);
if (level !== 'off' && config.reminder) emit('UserPromptSubmit', reminder(level));
