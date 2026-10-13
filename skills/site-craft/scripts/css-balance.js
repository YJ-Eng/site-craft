#!/usr/bin/env node
// css-balance.js <file-or-dir> [...]
//
// Checks that braces balance in every .css file and in every <style> block
// of every .html file (directories are searched recursively; node_modules
// and dot-directories are skipped). Braces inside /* comments */ and inside
// '...' or "..." strings are ignored; backslash escapes are honoured, and a
// newline ends an unterminated string, as CSS does.
//
// Why: one unbalanced stylesheet can silently swallow every rule after it
// (a whole media-query range disappears) while the page still looks right at
// the width you happened to check.
//
// Output: one line per file checked, then a PASS/FAIL summary.
// Exit codes: 0 all balanced, 1 any imbalance, 2 bad arguments.

'use strict';
const fs = require('fs');
const path = require('path');

// Returns null if balanced, else a message. `firstLine` is the 1-based file
// line of the first character of `text`.
function checkBalance(text, firstLine) {
  let depth = 0;
  let openLine = [];
  let line = firstLine;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      for (let k = i; k < stop; k++) if (text[k] === '\n') line++;
      i = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      i++;
      while (i < n && text[i] !== c && text[i] !== '\n') {
        if (text[i] === '\\' && i + 1 < n) {
          if (text[i + 1] === '\n') line++;
          i += 2;
        } else {
          i++;
        }
      }
      if (i < n && text[i] === c) i++;
      continue; // a newline here is left for the main loop to count
    }
    if (c === '\\') { if (text[i + 1] === '\n') line++; i += 2; continue; }
    if (c === '{') { depth++; openLine.push(line); }
    else if (c === '}') {
      if (depth === 0) return `unmatched "}" at line ${line} (no "{" opens it)`;
      depth--; openLine.pop();
    }
    i++;
  }
  if (depth > 0) {
    return `${depth} unclosed "{" at end of input (innermost opened at line ${openLine[openLine.length - 1]})`;
  }
  return null;
}

function styleBlocks(html) {
  const blocks = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const start = m.index + m[0].indexOf('>') + 1;
    const firstLine = html.slice(0, start).split('\n').length;
    blocks.push({ text: m[1], firstLine });
  }
  return blocks;
}

function collect(target, out) {
  const st = fs.statSync(target);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(target).sort()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      collect(path.join(target, name), out);
    }
  } else if (/\.(css|html?)$/i.test(target)) {
    out.push(target);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node css-balance.js <file-or-dir> [...]');
  process.exit(2);
}
const files = [];
for (const a of args) {
  try { collect(a, files); } catch (e) {
    console.error(`css-balance: cannot read ${a}: ${e.message}`);
    process.exit(2);
  }
}

let failures = 0;
let checked = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const results = [];
  if (/\.css$/i.test(f)) {
    results.push({ label: f, err: checkBalance(src, 1) });
  } else {
    const blocks = styleBlocks(src);
    blocks.forEach((b, idx) => {
      results.push({ label: `${f} <style #${idx + 1}>`, err: checkBalance(b.text, b.firstLine) });
    });
  }
  for (const r of results) {
    checked++;
    if (r.err) { failures++; console.log(`FAIL ${r.label}: ${r.err}`); }
    else console.log(`ok   ${r.label}`);
  }
}

if (checked === 0) {
  console.log('css-balance: no .css files or <style> blocks found');
  process.exit(2);
}
console.log(failures === 0
  ? `css-balance: PASS (${checked} stylesheets balanced)`
  : `css-balance: FAIL (${failures} of ${checked} stylesheets unbalanced)`);
process.exit(failures === 0 ? 0 : 1);
