'use strict';
// Shared helpers for the terse hooks: config, per-session level, rule text.

const fs = require('fs');
const path = require('path');
const os = require('os');

const LEVELS = ['lite', 'standard', 'max', 'off'];
const DATA_DIR = path.join(os.homedir(), '.claude', 'terse');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const STATE_FILE = path.join(DATA_DIR, 'sessions.json');
const STATE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SKILL_FILE = path.join(__dirname, '..', 'skills', 'terse', 'SKILL.md');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function parseLevel(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  if (LEVELS.includes(v)) return v;
  if (v === 'on' || v === 'normal-terse') return 'standard';
  if (v === 'ultra' || v === 'full') return 'max';
  if (v === 'light') return 'lite';
  if (v === 'false' || v === 'disabled' || v === 'none') return 'off';
  return null;
}

// Settings: ~/.claude/terse/config.json, overridden by TERSE_LEVEL.
function loadConfig() {
  const file = readJson(CONFIG_FILE, {});
  return {
    defaultLevel: parseLevel(process.env.TERSE_LEVEL) || parseLevel(file.defaultLevel) || 'standard',
    reminder: file.reminder !== false,
    subagents: file.subagents !== false,
  };
}

function getLevel(sessionId, config = loadConfig()) {
  const state = readJson(STATE_FILE, {});
  const entry = sessionId && state[sessionId];
  return (entry && parseLevel(entry.level)) || config.defaultLevel;
}

function setLevel(sessionId, level) {
  if (!sessionId) return;
  const now = Date.now();
  const state = readJson(STATE_FILE, {});
  for (const [id, entry] of Object.entries(state)) {
    if (!entry || now - (entry.updated || 0) > STATE_TTL_MS) delete state[id];
  }
  state[sessionId] = { level, updated: now };
  try {
    writeJson(STATE_FILE, state);
  } catch {
    // State is a convenience. Never break the session over it.
  }
}

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Body of the terse SKILL.md (one source of truth for the rules).
function rules(level) {
  try {
    const text = fs.readFileSync(SKILL_FILE, 'utf8').replace(/\r\n/g, '\n');
    return text.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/\$ARGUMENTS/g, level).trim();
  } catch {
    return 'Answer first. Cut filler, preamble and recaps. Keep code, commands, paths, errors, numbers and negations exact.';
  }
}

function reminder(level) {
  return `Terse mode ${level}: answer first, no filler, keep code/paths/errors/numbers/negations exact.`;
}

function emit(eventName, context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName, additionalContext: context },
  }));
}

module.exports = { LEVELS, parseLevel, loadConfig, getLevel, setLevel, readInput, rules, reminder, emit };
