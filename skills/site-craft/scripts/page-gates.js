#!/usr/bin/env node
// page-gates.js <url> [--widths a,b,c] [--ask-selector CSS] [--json]
//
// Three layout/legibility gates on a real page load. Each prints PASS/FAIL
// lines with the worst offenders (at most 8). Exit 1 if any gate fails.
//
//  a) OVERFLOW: at each width (height 900), after load + 800 ms, visible
//     elements whose box sticks out of the viewport (right > width + 1 or
//     left < -1), and documentElement.scrollWidth > width. An element inside
//     an ancestor that clips (overflow hidden/clip/auto/scroll) and itself
//     fits in the viewport is not counted. Gate: 0 offenders at every width.
//  b) ONE ASK: at 1440 and 390, inside <main> (or <body> without a main),
//     filled actions: <a> or <button> that is visible, at least 32 px tall,
//     and whose background colour is mostly opaque and differs from the
//     background behind it (a gradient background-image also counts as
//     filled). Grouped by destination (href for links, text for buttons).
//     Gate: at most 1 distinct destination (the same ask may repeat).
//     --ask-selector replaces the detection with an explicit selector.
//  c) DARK LEGIBILITY: at 390 and 1440, every visible element with its own
//     text node, its font size, colour and effective background (first
//     ancestor background-colour with alpha > 0.5; an ancestor background
//     image makes it UNKNOWN and skipped). Dark = background relative
//     luminance < 0.2. On dark: FAIL if font size < 13.5 px, FAIL if contrast
//     < 7:1 for text under 24 px (4.5:1 from 24 px up); WARN if <p>/<li> text
//     is under 16 px.
//
// Env: SITECRAFT_CHROMIUM_RESOLVED (chromium executable, optional).
// Exit codes: 0 all gates pass, 1 any gate fails or the page cannot load,
// 2 bad arguments, 3 NOT VERIFIED: the browser could not start.

'use strict';
const { chromium } = require('playwright');

const DEFAULT_WIDTHS = [300, 320, 360, 390, 414, 768, 1024, 1280, 1440, 1920];
const HEIGHT = 900;
const SETTLE_MS = 800;
const MAX_LISTED = 8;

function usage() {
  console.error('usage: node page-gates.js <url> [--widths 300,320,...] [--ask-selector CSS] [--json]');
  process.exit(2);
}

let url = '';
let widths = DEFAULT_WIDTHS;
let askSelector = '';
let asJson = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') asJson = true;
  else if (a === '--widths' || a.startsWith('--widths=')) {
    const v = a === '--widths' ? argv[++i] : a.slice('--widths='.length);
    widths = String(v || '').split(',').map((x) => Number(x.trim()));
    if (!widths.length || widths.some((w) => !Number.isInteger(w) || w < 200 || w > 4000)) {
      console.error('page-gates: --widths must be comma-separated integers between 200 and 4000');
      process.exit(2);
    }
  } else if (a === '--ask-selector' || a.startsWith('--ask-selector=')) {
    askSelector = a === '--ask-selector' ? argv[++i] : a.slice('--ask-selector='.length);
    if (!askSelector) usage();
  } else if (a.startsWith('--')) {
    console.error(`page-gates: unknown flag ${a}`);
    process.exit(2);
  } else url = a;
}
if (!url) usage();
if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
  console.error('page-gates: url must include a scheme, e.g. http://127.0.0.1:8080/');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- in-page functions (serialised into the browser) ----------------------

function inPageOverflow(width) {
  const clipVals = ['hidden', 'clip', 'auto', 'scroll'];
  const fits = (r) => r.right <= width + 1 && r.left >= -1;
  const visible = (el, cs, r) =>
    cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    if (cls.length) s += '.' + cls.slice(0, 2).join('.');
    return s;
  };
  const clippedByFittingAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (clipVals.includes(cs.overflowX) && fits(p.getBoundingClientRect())) return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!visible(el, cs, r)) continue;
    if (fits(r)) continue;
    if (clippedByFittingAncestor(el)) continue;
    offenders.push({
      el: describe(el), left: Math.round(r.left), right: Math.round(r.right),
      over: Math.round(Math.max(r.right - width, -r.left)),
    });
  }
  offenders.sort((a, b) => b.over - a.over);
  return { scrollWidth: document.documentElement.scrollWidth, count: offenders.length, offenders: offenders.slice(0, 8) };
}

// Colour helpers shared by the ask and legibility passes.
const COLOR_HELPERS = `
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (str) => {
    const m = /^rgba?\\(([^)]+)\\)$/.exec(str.trim());
    if (m) {
      const parts = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
      if (parts.length >= 3 && parts.every((x) => !Number.isNaN(x))) {
        return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
      }
    }
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000'; cx.fillStyle = str; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const WHITE = { r: 255, g: 255, b: 255, a: 1 };
  // Effective opaque-ish background behind (or at) el. { color, unknown }.
  const backdrop = (el, includeSelf) => {
    for (let p = includeSelf ? el : el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const c = parse(cs.backgroundColor);
      const hasImage = cs.backgroundImage && cs.backgroundImage !== 'none';
      if (hasImage) return { color: null, unknown: true };
      if (c.a > 0.5) return { color: over(c, WHITE), unknown: false };
    }
    return { color: WHITE, unknown: false };
  };
  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).filter(Boolean) : [];
    if (cls.length) s += '.' + cls.slice(0, 2).join('.');
    return s;
  };
  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && r.width > 0 && r.height > 0;
  };
`;

const inPageAsk = new Function('selector', `
  ${COLOR_HELPERS}
  const root = document.querySelector('main') || document.body;
  const found = [];
  const nodes = selector ? root.ownerDocument.querySelectorAll(selector) : root.querySelectorAll('a, button');
  for (const el of nodes) {
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    let how = 'selector';
    if (!selector) {
      if (r.height < 32) continue;
      const cs = getComputedStyle(el);
      const bg = parse(cs.backgroundColor);
      const behind = backdrop(el, false);
      const gradient = /gradient/.test(cs.backgroundImage || '');
      if (bg.a > 0.5) {
        const base = behind.color || WHITE;
        const o = over(bg, base);
        const dist = Math.abs(o.r - base.r) + Math.abs(o.g - base.g) + Math.abs(o.b - base.b);
        if (dist < 30 && !behind.unknown) continue;
        how = 'fill';
      } else if (gradient) {
        how = 'gradient';
      } else continue;
    }
    const text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
    let dest;
    const href = el.tagName === 'A' ? el.getAttribute('href') : null;
    if (href && href !== '#' && !/^javascript:/i.test(href)) dest = 'link ' + el.href;
    else dest = 'text "' + text.toLowerCase() + '"';
    found.push({ dest, el: label(el), text, how, h: Math.round(r.height) });
  }
  return found;
`);

const inPageLegibility = new Function(`
  ${COLOR_HELPERS}
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'HEAD', 'META', 'LINK', 'TEMPLATE', 'OPTION']);
  const out = { dark: [], light: 0, unknown: 0 };
  for (const el of document.body.querySelectorAll('*')) {
    if (SKIP.has(el.tagName)) continue;
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\\s+/g, ' ').trim();
    if (!own) continue;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (fg.a === 0) { out.unknown++; continue; }
    const bd = backdrop(el, true);
    if (bd.unknown) { out.unknown++; continue; }
    const bg = bd.color;
    if (lum(bg) >= 0.2) { out.light++; continue; }
    const size = parseFloat(cs.fontSize);
    const eff = over(fg, bg);
    out.dark.push({
      tag: el.tagName.toLowerCase(), text: own.slice(0, 40), size: Math.round(size * 10) / 10,
      contrast: Math.round(ratio(eff, bg) * 100) / 100,
    });
  }
  return out;
`);

// ---- run ------------------------------------------------------------------

async function withPage(browser, width, fn) {
  const context = await browser.newContext({ viewport: { width, height: HEIGHT } });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await sleep(SETTLE_MS);
    return await fn(page);
  } finally {
    await context.close();
  }
}

function legibilityVerdicts(d) {
  const fails = [];
  const warns = [];
  for (const t of d.dark) {
    const need = t.size >= 24 ? 4.5 : 7;
    const why = [];
    if (t.size < 13.5) why.push(`size ${t.size}px < 13.5`);
    if (t.contrast < need) why.push(`contrast ${t.contrast}:1 < ${need}:1`);
    if (why.length) fails.push(Object.assign({ why: why.join('; ') }, t));
    else if ((t.tag === 'p' || t.tag === 'li') && t.size < 16) warns.push(Object.assign({ why: `size ${t.size}px < 16 for body text` }, t));
  }
  const key = (t) => t.contrast;
  fails.sort((a, b) => key(a) - key(b));
  warns.sort((a, b) => a.size - b.size);
  return { fails, warns };
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.SITECRAFT_CHROMIUM_RESOLVED || undefined });
  } catch (e) {
    console.log('site-craft: NOT VERIFIED, browser unavailable');
    console.error(`site-craft: Chromium did not start: ${String(e && e.message || e).split('\n')[0]}`);
    process.exit(3);
  }

  const report = { url, overflow: [], ask: {}, legibility: {} };
  const lines = [];
  let failed = false;
  const say = (s) => lines.push(s);

  try {
    // a) overflow
    const bad = [];
    for (const w of widths) {
      const r = await withPage(browser, w, (page) => page.evaluate(inPageOverflow, w));
      report.overflow.push(Object.assign({ width: w }, r));
      if (r.count > 0 || r.scrollWidth > w) bad.push({ w, r });
    }
    if (bad.length === 0) {
      say(`PASS OVERFLOW: 0 offenders at ${widths.length} widths (${widths.join(', ')})`);
    } else {
      failed = true;
      for (const { w, r } of bad) {
        const sw = r.scrollWidth > w ? `, scrollWidth ${r.scrollWidth} > ${w}` : '';
        say(`FAIL OVERFLOW at ${w}px: ${r.count} offender${r.count === 1 ? '' : 's'}${sw}`);
        for (const o of r.offenders.slice(0, MAX_LISTED)) say(`       ${o.el}  left ${o.left}, right ${o.right} (${o.over}px past the edge)`);
      }
      const ok = widths.filter((w) => !bad.some((b) => b.w === w));
      if (ok.length) say(`     clean at: ${ok.join(', ')}`);
    }

    // b) one ask
    for (const w of [1440, 390]) {
      const found = await withPage(browser, w, (page) => page.evaluate(inPageAsk, askSelector));
      const groups = new Map();
      for (const f of found) {
        if (!groups.has(f.dest)) groups.set(f.dest, []);
        groups.get(f.dest).push(f);
      }
      report.ask[w] = { destinations: [...groups.keys()], actions: found };
      const n = groups.size;
      const verdict = n <= 1 ? 'PASS' : 'FAIL';
      if (n > 1) failed = true;
      say(`${verdict} ONE ASK at ${w}px: ${n} distinct destination${n === 1 ? '' : 's'} among ${found.length} filled action${found.length === 1 ? '' : 's'}${askSelector ? ' (selector override)' : ''}`);
      let shown = 0;
      for (const [dest, items] of groups) {
        if (shown++ >= MAX_LISTED) break;
        const f = items[0];
        say(`       ${dest}  x${items.length}  e.g. ${f.el} "${f.text}" (${f.how}, ${f.h}px tall)`);
      }
    }
    if (!report.ask[1440].destinations.length && !report.ask[390].destinations.length) {
      say('     note: no filled action found; if the page has one, pass --ask-selector to name it');
    }

    // c) dark legibility
    for (const w of [390, 1440]) {
      const d = await withPage(browser, w, (page) => page.evaluate(inPageLegibility));
      const v = legibilityVerdicts(d);
      report.legibility[w] = { darkTexts: d.dark.length, lightTexts: d.light, unknown: d.unknown, fails: v.fails.length, warns: v.warns.length, worst: v.fails.slice(0, MAX_LISTED), warnList: v.warns.slice(0, MAX_LISTED) };
      const counts = `${d.dark.length} dark-background texts, ${d.light} light, ${d.unknown} unknown (image/transparent, skipped)`;
      if (d.dark.length === 0) {
        say(`PASS DARK LEGIBILITY at ${w}px: no text on a dark background found (${counts})`);
        continue;
      }
      if (v.fails.length) failed = true;
      say(`${v.fails.length ? 'FAIL' : 'PASS'} DARK LEGIBILITY at ${w}px: ${v.fails.length} fail, ${v.warns.length} warn of ${counts}`);
      for (const t of v.fails.slice(0, MAX_LISTED)) say(`       FAIL <${t.tag}> "${t.text}" ${t.size}px, ${t.contrast}:1 (${t.why})`);
      for (const t of v.warns.slice(0, Math.max(0, MAX_LISTED - Math.min(MAX_LISTED, v.fails.length)))) say(`       WARN <${t.tag}> "${t.text}" ${t.size}px, ${t.contrast}:1 (${t.why})`);
    }
  } catch (e) {
    console.error(`site-craft: page-gates could not complete: ${String(e && e.message || e).split('\n')[0]}`);
    await browser.close().catch(() => {});
    process.exit(1);
  }
  await browser.close().catch(() => {});

  report.pass = !failed;
  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    for (const l of lines) console.log(l);
    console.log(failed ? 'PAGE GATES: FAIL' : 'PAGE GATES: PASS');
  }
  process.exit(failed ? 1 : 0);
})();
