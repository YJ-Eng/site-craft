#!/usr/bin/env node
// Formats the RESULT line from budget-engine.js into a table + PASS/FAIL
// lines, and exits non-zero if any check fails.
// Usage: node format-budget-result.js <resultJsonFile> <textRatioMin> [budgetScope]
// budgetScope: "all" (default) or "first-party" -- which JS-weight subtotal
// the byte budget is checked against.

const fs = require('fs');

const file = process.argv[2];
const textRatioMin = parseFloat(process.argv[3]);
const budgetScope = process.argv[4] === 'first-party' ? 'first-party' : 'all';

const line = fs
  .readFileSync(file, 'utf8')
  .split('\n')
  .find((l) => l.startsWith('RESULT '));

if (!line) {
  console.error('site-craft: no RESULT line from budget-engine.js (see engine.err)');
  process.exit(1);
}

const r = JSON.parse(line.slice('RESULT '.length));

let anyFail = false;
function kb(n) {
  return n === null || n === undefined ? 'n/a' : n.toLocaleString();
}

console.log('');
console.log('== JS weight (' + r.url + ') ==');
console.log(
  'script url'.padEnd(62) + 'party'.padStart(6) + 'transfer B'.padStart(12) + '  gzip B (recomputed)'.padStart(22)
);
for (const s of r.jsWeight.scripts) {
  const shortUrl = s.url.length > 60 ? s.url.slice(0, 57) + '...' : s.url;
  const partyStr = s.party === 'first' ? '1P' : '3P';
  const transferStr = kb(s.transferBytes) + (s.transferApprox ? '*' : '');
  const gzipStr = s.bodyError ? 'ERROR: ' + s.bodyError : kb(s.gzipBytes);
  console.log(shortUrl.padEnd(62) + partyStr.padStart(6) + transferStr.padStart(12) + '  ' + gzipStr.padStart(20));
}
console.log('-'.repeat(104));
console.log(
  'SUBTOTAL first-party (1P)'.padEnd(68) +
    kb(r.jsWeight.totalTransferFirst).padStart(12) +
    '  ' +
    kb(r.jsWeight.totalGzipFirst).padStart(20)
);
console.log(
  'SUBTOTAL third-party (3P)'.padEnd(68) +
    kb(r.jsWeight.totalTransferThird).padStart(12) +
    '  ' +
    kb(r.jsWeight.totalGzipThird).padStart(20)
);
console.log(
  'TOTAL (1P + 3P)'.padEnd(68) + kb(r.jsWeight.totalTransfer).padStart(12) + '  ' + kb(r.jsWeight.totalGzip).padStart(20)
);
console.log(
  `(first-party = same hostname as the page URL${r.jsWeight.pageHost ? ` -- "${r.jsWeight.pageHost}"` : ''}; a CDN or subdomain on a different hostname counts as third-party)`
);
console.log('* = no CDP encodedDataLength; using Content-Length header or decoded size as an approximation');
if (r.jsWeight.unmeasured > 0) {
  console.log(
    `NOTE: ${r.jsWeight.unmeasured} script body(ies) could not be read (see ERROR rows above: ${r.jsWeight.unmeasuredFirst} first-party, ${r.jsWeight.unmeasuredThird} third-party); excluded from the totals above, so the totals may undercount.`
  );
}

const jsWeightNavFailed = !!r.jsWeight.navError && r.jsWeight.scripts.length === 0;
const scopedTotal = budgetScope === 'first-party' ? r.jsWeight.totalGzipFirst : r.jsWeight.totalGzip;
const scopedUnmeasured = budgetScope === 'first-party' ? r.jsWeight.unmeasuredFirst : r.jsWeight.unmeasured;
const jsWeightPass = !jsWeightNavFailed && scopedTotal <= r.budgetBytes && scopedUnmeasured === 0;
if (jsWeightNavFailed) {
  console.log(`JS WEIGHT (scope: ${budgetScope}): NOT MEASURED -- page load failed (${r.jsWeight.navError}) -> FAIL`);
} else {
  console.log(
    `JS WEIGHT (scope: ${budgetScope}): ${scopedTotal} B gz vs budget ${r.budgetBytes} B gz -> ${jsWeightPass ? 'PASS' : 'FAIL'}` +
      (scopedUnmeasured > 0
        ? ` (FAIL forced: ${scopedUnmeasured} unmeasured script(s) in scope, total is not trustworthy)`
        : '')
  );
}
if (!jsWeightPass) anyFail = true;

console.log('');
console.log('== JS-off text completeness ==');
console.log(`JS-on visible text:  ${r.textLengths.jsOnChars} chars (document.body.innerText)`);
console.log(`JS-off visible text: ${r.textLengths.jsOffChars} chars (document.body.innerText, same page, JS disabled)`);
const ratio = r.textLengths.ratio;
console.log(`Ratio (off/on): ${ratio === null ? 'n/a (no JS-on text measured)' : ratio.toFixed(3)}`);
const textNavFailed = !!r.textLengths.jsOnNavError || !!r.textLengths.jsOffNavError;
if (textNavFailed) {
  console.log(
    `JS-OFF: NOT MEASURED -- page load failed (on: ${r.textLengths.jsOnNavError || 'ok'}; off: ${
      r.textLengths.jsOffNavError || 'ok'
    }) -> FAIL`
  );
  anyFail = true;
} else {
  const jsOffPass = ratio !== null && ratio >= textRatioMin;
  console.log(`JS-OFF: ratio ${ratio === null ? 'n/a' : ratio.toFixed(3)} vs minimum ${textRatioMin} -> ${jsOffPass ? 'PASS' : 'FAIL'}`);
  if (!jsOffPass) anyFail = true;
}

console.log('');
console.log('== Reduced motion: measure A -- Web Animations API (document.getAnimations()) ==');
console.log('                after load   after scroll');
console.log(
  'reduced-motion  ' +
    String(r.animations.reduced.afterLoad).padStart(10) +
    '   ' +
    String(r.animations.reduced.afterScroll).padStart(12)
);
console.log(
  'no-preference   ' +
    String(r.animations.normal.afterLoad).padStart(10) +
    '   ' +
    String(r.animations.normal.afterScroll).padStart(12)
);
console.log(
  'Can see: CSS animation/transition and explicit element.animate() calls, running or pending. ' +
    'Cannot see: anything driven by requestAnimationFrame with direct style writes, or by a JS ' +
    'animation library that does not use the Web Animations API (the default mode of some popular ' +
    'libraries) -- those animate with zero entries here.'
);

console.log('');
console.log('== Reduced motion: measure B -- visible-motion screenshot diff (engine-agnostic) ==');
const vm = (moved) => (moved === null ? 'n/a' : moved ? 'MOVED' : 'still');
console.log('                after load   after scroll');
console.log(
  'reduced-motion  ' +
    vm(r.visualMotion.reduced.afterLoadMoved).padStart(10) +
    '   ' +
    vm(r.visualMotion.reduced.afterScrollMoved).padStart(12)
);
console.log(
  'no-preference   ' +
    vm(r.visualMotion.normal.afterLoadMoved).padStart(10) +
    '   ' +
    vm(r.visualMotion.normal.afterScrollMoved).padStart(12)
);
console.log(
  `(two screenshots ${r.visualMotion.reduced.diffGapMs || r.visualMotion.normal.diffGapMs || '?'}ms apart, scrolling ` +
    'stopped, compared byte-for-byte; <video> is hidden before comparing so video playback cannot ' +
    'cause a false MOVED, and no editable element is ever focused so a blinking caret cannot either.'
);
console.log(
  'Can see: anything that visibly changes on screen, from any mechanism (CSS, WAAPI, ' +
    'requestAnimationFrame, a JS animation library, canvas, SVG SMIL). Cannot see: what moved, ' +
    'which element caused it, or motion confined to a region outside the current viewport.'
);

const animNavFailed = !!r.animations.reduced.navError || !!r.animations.normal.navError;
const visualNavFailed = !!r.visualMotion.reduced.navError || !!r.visualMotion.normal.navError;
console.log('');
if (animNavFailed || visualNavFailed) {
  console.log(
    `REDUCED MOTION: NOT MEASURED -- page load failed (WAAPI reduced: ${r.animations.reduced.navError || 'ok'}; ` +
      `WAAPI normal: ${r.animations.normal.navError || 'ok'}; visual-diff reduced: ${
        r.visualMotion.reduced.navError || 'ok'
      }; visual-diff normal: ${r.visualMotion.normal.navError || 'ok'}) -> FAIL`
  );
  anyFail = true;
} else {
  const waapiPass = r.animations.reduced.afterLoad === 0 && r.animations.reduced.afterScroll === 0;
  const visualPass = r.visualMotion.reduced.afterLoadMoved === false && r.visualMotion.reduced.afterScrollMoved === false;
  const reducedMotionPass = waapiPass && visualPass;
  let why = '';
  if (!reducedMotionPass) {
    const bits = [];
    if (!waapiPass) bits.push('WAAPI animation still running/pending');
    if (!visualPass) bits.push('visible motion detected by screenshot diff');
    why = ` (${bits.join('; ')})`;
  }
  console.log(
    `REDUCED MOTION: ${reducedMotionPass ? 'both measures show no motion with reduced motion' : 'motion detected with reduced motion' + why} -> ${reducedMotionPass ? 'PASS' : 'FAIL'}`
  );
  if (!reducedMotionPass) anyFail = true;
}

console.log('');
console.log(`site-craft: settle-after-load window used for JS weight = ${r.settleAfterLoadMs}ms`);
if (r.jsWeight.navError) console.log(`NOTE: navigation warning during JS-weight load: ${r.jsWeight.navError}`);

console.log(anyFail ? 'OVERALL: FAIL' : 'OVERALL: PASS');
process.exit(anyFail ? 1 : 0);
