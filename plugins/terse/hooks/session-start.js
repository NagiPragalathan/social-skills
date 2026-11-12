#!/usr/bin/env node
'use strict';
// SessionStart (startup, resume, clear, compact): load the terse rules
// unless this session, or the configured default, is "off".

const { getLevel, readInput, rules, emit } = require('./lib');

const input = readInput();
const level = getLevel(input.session_id);
if (level === 'off') process.exit(0);

emit(
  'SessionStart',
  `Terse mode is on for this session at level "${level}" (terse plugin). ` +
    'Apply these rules to every reply until the user runs /terse with another level, ' +
    'or says "stop terse" or "normal mode".\n\n' +
    rules(level),
);
