#!/usr/bin/env node
'use strict';
// SubagentStart: a subagent's report is read back by the main agent as input
// tokens, so ask for a dense report whenever the session is in terse mode.

const { loadConfig, getLevel, readInput, emit } = require('./lib');

const config = loadConfig();
const input = readInput();
const level = getLevel(input.session_id, config);
if (level === 'off' || !config.subagents) process.exit(0);

emit(
  'SubagentStart',
  'Your final report is read by another agent and costs tokens. Make it dense: ' +
    'lead with the answer or result; cite `path:line` instead of pasting code; ' +
    'quote only the decisive line of an error or log; skip narration of the steps you took. ' +
    'Keep every name, path, number and negation exact. ' +
    'Keep files you write to their normal conventions.',
);
