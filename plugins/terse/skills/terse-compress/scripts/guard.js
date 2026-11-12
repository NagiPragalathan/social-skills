#!/usr/bin/env node
'use strict';
// Helper for the terse-compress skill.
//   guard.js backup <file>                 copy the file to a safe backup folder
//   guard.js check <original> <compressed> verify nothing exact-match was lost
// Exit codes: 0 pass, 1 check failed, 2 refused or bad usage.

const fs = require('fs');
const path = require('path');
const os = require('os');

const BACKUP_DIR = path.join(os.homedir(), '.claude', 'terse', 'backups');
const PROSE_EXT = new Set(['.md', '.mdx', '.markdown', '.txt', '.rst', '']);
const SECRET_EXT = new Set(['.pem', '.key', '.p12', '.pfx', '.crt', '.cer', '.jks', '.keystore']);
const SECRET_NAME = /(^|[._-])(env|secrets?|credentials?|passwords?|netrc|npmrc|pypirc|id_rsa|id_ed25519)([._-]|$)/i;
const SECRET_TEXT = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
];
const STRENGTH_WORDS = ['not', 'never', 'no', "don't", 'must', 'only', 'always', 'except', 'unless', 'without'];
const FILE_EXT = 'md|mdx|json|jsonc|ya?ml|toml|ini|cfg|conf|js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|kt|rb|php|cs|sh|ps1|sql|css|scss|html|lock|txt|env|xml|gradle|tf';

function fail(message, code = 2) {
  process.stderr.write(message + '\n');
  process.exit(code);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
}

function approxTokens(text) {
  return Math.ceil(text.length / 4);
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ---------- backup ----------

function backup(file) {
  if (!file) fail('usage: guard.js backup <file>');
  const abs = path.resolve(file);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) fail(`REFUSED: not a file: ${abs}`);

  const base = path.basename(abs);
  const ext = path.extname(base).toLowerCase();
  if (SECRET_EXT.has(ext) || SECRET_NAME.test(base)) fail(`REFUSED: ${base} looks like a secrets file.`);
  if (!PROSE_EXT.has(ext)) fail(`REFUSED: "${ext}" is not a prose file. Allowed: .md .mdx .markdown .txt .rst or no extension.`);

  const text = readText(abs);
  if (SECRET_TEXT.some((re) => re.test(text))) fail(`REFUSED: ${base} contains what looks like a private key or access token.`);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const parent = path.basename(path.dirname(abs)) || 'root';
  const dest = path.join(BACKUP_DIR, `${timestamp()}-${parent}-${base}`);
  fs.copyFileSync(abs, dest);

  console.log(`BACKUP ${dest}`);
  console.log(`size ~${approxTokens(text)} tokens`);
}

// ---------- check ----------

function dedent(lines) {
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut).replace(/[ \t]+$/, '')).join('\n');
}

// Split markdown into fenced code blocks and the remaining prose.
function splitFences(text) {
  const blocks = [];
  const prose = [];
  let fence = null;
  let buf = [];
  for (const line of text.split('\n')) {
    if (!fence) {
      const open = line.match(/^\s*(`{3,}|~{3,})/);
      if (open) {
        fence = open[1];
        buf = [line];
      } else {
        prose.push(line);
      }
      continue;
    }
    buf.push(line);
    const close = new RegExp(`^\\s*\\${fence[0]}{${fence.length},}\\s*$`);
    if (close.test(line)) {
      blocks.push(dedent(buf));
      fence = null;
      buf = [];
    }
  }
  if (fence) blocks.push(dedent(buf));
  return { blocks, prose: prose.join('\n') };
}

function collect(re, text, group = 1, clean = (s) => s) {
  const found = new Set();
  for (const m of text.matchAll(re)) {
    const value = clean(m[group]);
    if (value) found.add(value);
  }
  return found;
}

function extract(text) {
  const { blocks, prose } = splitFences(text);
  const inline = collect(/(`+)([^`\n](?:.*?[^`\n])?)\1(?!`)/g, prose, 2, (s) => s.trim());
  // Remove inline code before looking for URLs and paths, so nothing is counted twice.
  const bare = prose.replace(/(`+)([^`\n](?:.*?[^`\n])?)\1(?!`)/g, ' ');
  const urls = collect(/\bhttps?:\/\/[^\s<>()[\]`'"]+/g, bare, 0, (s) => s.replace(/[.,;:!?]+$/, ''));
  const links = collect(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, bare);
  const files = collect(new RegExp(`(?:^|[\\s(])((?:~|\\.{1,2})?/?(?:[\\w.-]+/)*[\\w-][\\w.-]*\\.(?:${FILE_EXT}))(?=$|[\\s),.;:!?])`, 'gm'), bare);
  for (const u of urls) for (const f of [...files]) if (u.includes(f)) files.delete(f);
  for (const l of links) files.delete(l);
  const headings = (prose.match(/^#{1,6}\s+\S/gm) || []).length;
  const lower = prose.toLowerCase();
  const strength = {};
  for (const w of STRENGTH_WORDS) {
    const re = new RegExp(`(^|[^\\w'])${w}(?![\\w'])`, 'g');
    strength[w] = (lower.match(re) || []).length;
  }
  return { blocks, inline, urls, links, files, headings, strength };
}

function preview(s, n = 50) {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n) + '...' : one;
}

function check(originalFile, compressedFile) {
  if (!originalFile || !compressedFile) fail('usage: guard.js check <original> <compressed>');
  const original = readText(path.resolve(originalFile));
  const compressed = readText(path.resolve(compressedFile));
  const a = extract(original);
  const b = extract(compressed);

  const missing = [];
  const blockSet = new Set(b.blocks);
  a.blocks.forEach((blk, i) => {
    if (!blockSet.has(blk)) missing.push(`code block #${i + 1}: "${preview(blk)}"`);
  });
  for (const v of a.inline) if (!b.inline.has(v)) missing.push(`inline code: \`${v}\``);
  for (const v of a.urls) if (!b.urls.has(v)) missing.push(`url: ${v}`);
  for (const v of a.links) if (!b.links.has(v) && !b.urls.has(v)) missing.push(`link target: ${v}`);
  for (const v of a.files) if (!compressed.includes(v)) missing.push(`file or path: ${v}`);

  const warnings = [];
  if (b.headings < a.headings) warnings.push(`headings: ${a.headings} -> ${b.headings}. Confirm no section was dropped.`);
  for (const w of STRENGTH_WORDS) {
    if (b.strength[w] < a.strength[w]) {
      warnings.push(`"${w}" appears ${a.strength[w]} -> ${b.strength[w]} times. Confirm every rule kept its strength.`);
    }
  }

  const before = approxTokens(original);
  const after = approxTokens(compressed);
  const pct = before ? Math.round(((before - after) / before) * 100) : 0;
  if (after >= before) warnings.push('compressed file is not smaller than the original.');

  if (missing.length) {
    console.log(`FAIL ${missing.length} item(s) missing or changed. Restore each exactly as in the original:`);
    for (const m of missing) console.log(`  - ${m}`);
  } else {
    console.log(`PASS ~${before} -> ~${after} tokens (${pct >= 0 ? '-' : '+'}${Math.abs(pct)}%)`);
  }
  if (warnings.length) {
    console.log('warnings (review, not failures):');
    for (const w of warnings) console.log(`  - ${w}`);
  }
  process.exit(missing.length ? 1 : 0);
}

// ---------- main ----------

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'backup') backup(args[0]);
else if (cmd === 'check') check(args[0], args[1]);
else fail('usage: guard.js backup <file> | guard.js check <original> <compressed>');
