#!/usr/bin/env node
// find-translation.js — locate entries in translations.json by any language.
//
// Usage:
//   node tools/find-translation.js "Cell Groups"
//   node tools/find-translation.js --exact "Camps"
//   node tools/find-translation.js --page cellgroup "group"
//   node tools/find-translation.js --json "Camps"
//
// Matches case-insensitively against the KEY and against every en/vi/no value,
// so the user can name a string in whichever language they happen to see on
// the site. Reports which strings/<page>.json each hit came from.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'translations.json');
const STRINGS_DIR = path.join(ROOT, 'strings');

function parseArgs(argv) {
  const opts = { exact: false, page: null, json: false, query: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--exact') opts.exact = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--page') opts.page = argv[++i];
    else if (opts.query === null) opts.query = a;
  }
  return opts;
}

// Which strings/<page>.json files contain this key verbatim?
function loadPageIndex() {
  const index = new Map(); // key -> [page, ...]
  if (!fs.existsSync(STRINGS_DIR)) return index;
  for (const file of fs.readdirSync(STRINGS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const page = file.replace(/\.json$/, '');
    let arr;
    try {
      arr = JSON.parse(fs.readFileSync(path.join(STRINGS_DIR, file), 'utf8'));
    } catch (e) {
      process.stderr.write(`WARN: strings/${file} is not valid JSON (${e.message})\n`);
      continue;
    }
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      if (typeof s !== 'string') continue;
      if (!index.has(s)) index.set(s, []);
      if (!index.get(s).includes(page)) index.get(s).push(page);
    }
  }
  return index;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.query) {
    process.stderr.write('Usage: node tools/find-translation.js [--exact] [--json] [--page <name>] "<text>"\n');
    process.exit(2);
  }

  const translations = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const pageIndex = loadPageIndex();
  const needle = opts.query.toLowerCase();

  const hits = [];
  for (const key of Object.keys(translations)) {
    const entry = translations[key] || {};
    const fields = { key, en: entry.en, vi: entry.vi, no: entry.no };
    const matchedIn = [];
    for (const [field, value] of Object.entries(fields)) {
      if (typeof value !== 'string') continue;
      const hay = value.toLowerCase();
      const isMatch = opts.exact ? hay === needle : hay.includes(needle);
      if (isMatch) matchedIn.push(field);
    }
    if (matchedIn.length === 0) continue;

    const pages = pageIndex.get(key) || [];
    if (opts.page && !pages.includes(opts.page)) continue;

    hits.push({ key, entry, matchedIn, pages });
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(hits, null, 2) + '\n');
    return;
  }

  if (hits.length === 0) {
    console.log(`No match for ${JSON.stringify(opts.query)} in translations.json (${Object.keys(translations).length} entries).`);
    console.log('Try a shorter fragment, or drop --exact.');
    process.exit(1);
  }

  console.log(`${hits.length} match(es) for ${JSON.stringify(opts.query)}:\n`);
  hits.forEach((h, i) => {
    const preview = h.key.length > 90 ? h.key.slice(0, 90) + '…' : h.key;
    console.log(`[${i}] key: ${JSON.stringify(preview)}`);
    console.log(`    en: ${JSON.stringify(h.entry.en)}`);
    console.log(`    vi: ${JSON.stringify(h.entry.vi)}`);
    console.log(`    no: ${JSON.stringify(h.entry.no)}`);
    console.log(`    matched in: ${h.matchedIn.join(', ')}`);
    console.log(`    pages: ${h.pages.length ? h.pages.join(', ') : '(not in any strings/*.json — manually added entry)'}`);
    console.log('');
  });

  if (hits.length > 1) {
    console.log('AMBIGUOUS — more than one entry matched. Ask the user which [n] to edit before changing anything.');
  }
}

main();
