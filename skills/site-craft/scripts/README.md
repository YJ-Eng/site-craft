# site-craft scripts

Five tools:

- `motion-capture.sh` sees motion, including with motion turned off.
- `budget-check.sh` measures JS weight, JS-off completeness and reduced-motion
  compliance.
- `page-gates.sh` checks horizontal overflow, a single primary ask, and
  legibility of text on dark backgrounds.
- `css-balance.js` finds unbalanced braces in stylesheets (no browser needed).
- `gzserve.js` serves a directory with gzip, so Lighthouse measures what
  production would serve (no browser needed).

The first three drive a real headless Chromium with Playwright. None installs
anything; each fails with one clear line if a dependency is missing.

If the browser cannot start at all (no Playwright package, no Chromium, or a
sandbox that blocks Chromium), the three browser scripts print
`site-craft: NOT VERIFIED, browser unavailable` and exit with code 3. That
is not a pass and not a fail: nothing was checked. Report the build as "not
verified, browser unavailable".

## What they need

- a `node` binary
- the `playwright` npm package, with its Chromium browser already downloaded
  (`npx playwright install chromium` populates this; the scripts never run
  that install step themselves)
- `ffmpeg` (motion-capture.sh only, to build the contact sheet)

`css-balance.js` and `gzserve.js` need only `node`.

## How the scripts find them

Each resolver checks one env var, then a short list of common locations, in
this order. If none works it prints one line naming what is missing and which
env var to set by hand. A missing node, Playwright package or Chromium binary
ends the run as NOT VERIFIED (exit 3); a missing ffmpeg ends it with exit 2.

| What | Env var | Checked locations, in order |
|---|---|---|
| node | `SITECRAFT_NODE` | `node` on `PATH` |
| playwright package | `SITECRAFT_PLAYWRIGHT_DIR` (a dir whose `node_modules/` has `playwright`, or the parent of a `playwright/` dir) | `./node_modules` under the caller's cwd; `npm root -g`; most recently modified `node_modules/playwright` under `$HOME/.npm/_npx` (populated by any past `npx playwright ...` run) |
| chromium executable | `SITECRAFT_CHROMIUM` | Under `SITECRAFT_BROWSERS_PATH` / `PLAYWRIGHT_BROWSERS_PATH` / `$HOME/.cache/ms-playwright`: the newest `chromium-*/chrome-linux*/chrome`, else the newest `chromium_headless_shell-*/chrome-headless-shell-linux*/chrome-headless-shell` |
| ffmpeg | `SITECRAFT_FFMPEG` | `ffmpeg` on `PATH` |

Each browser script prints the resolved paths to stderr on every run, so a failure
further on is easy to trace back to the wrong binary.

After resolving, each script starts the browser once and closes it (the
preflight, up to 20 s). A missing node, Playwright package or Chromium
binary, or a browser that will not start, ends the run there with the
NOT VERIFIED line and exit code 3.

chrome-headless-shell is accepted as a fallback because it is a valid
`executablePath` for Playwright's headless automation; it is not a
full-featured browser (no extensions, devtools UI, etc.) but screenshot and
scroll automation works the same way through it.

## motion-capture.sh

```
motion-capture.sh <url> [outdir]
```

`outdir` defaults to `./motion-capture-<slug>` in the caller's current
directory, where `<slug>` is the URL with its scheme removed and every run of
characters other than letters, digits, `.`, `_` and `-` collapsed to `-`.

Loads `<url>` three times:

1. desktop, 1440x900, normal motion
2. mobile, 390x844, normal motion
3. mobile, 390x844, reduced motion emulated (`prefers-reduced-motion: reduce`)

Runs 1 and 2 are then loaded once more for the scrub pass (below).

For each run: screenshots at five points timed from DOMContentLoaded (about
80 ms, 200 ms, 400 ms, 900 ms and 1500 ms; each frame's label records the
offset actually reached), to catch reveal-on-load animations before they
finish, then waits for network idle (up to 5 s), then
scrolls down in viewport-height steps (capped at 8 steps) across the full
page, pausing 150 ms and shooting a "mid" frame, then pausing another 400 ms
and shooting a "settled" frame, at each step.

Every individual frame is saved as a JPEG under `<outdir>/frames/<run>/`.
One contact sheet per run is built with `ffmpeg` (`concat` + `tile` filters:
all frames in order, oldest first, left to right then top to bottom, in a
roughly square grid sized to the frame count) and saved under
`<outdir>/sheets/<run>.jpg`. Unused grid cells (e.g. 15 frames in a 4x4
grid) are left black by `ffmpeg`'s own tile filter, not an error.

The two normal-motion runs then get a **scrub pass** on a fresh page load:
the page is scrolled from the top in 100 px steps, one frame per step, up to
48 frames (the first 4,700 px of scroll; the summary line says when a longer
page was cut off). The frames go under `<outdir>/frames/<run>-scrub/` and
into a sheet of their own, `<outdir>/sheets/<run>-scrub.jpg`. Motion that
follows the scroll position (CSS `animation-timeline`, a scrubbed timeline)
plays over a few hundred pixels of scroll, so the viewport-height steps above
show only its end states; the scrub sheet shows it as a sequence.
`SITECRAFT_SCRUB_STEP_PX` and `SITECRAFT_SCRUB_MAX_FRAMES` change the step
and the cap. A run writes five sheets in all.

Sheets stay small because each frame is scaled down before tiling (300 px
wide for the 1440-viewport sheet, 200 px wide for the 390-viewport sheets),
not because of JPEG compression alone. If a sheet exceeds about 4 MB the
script prints `SHEET_BYTES_LIMIT_EXCEEDED <file>` and still writes the file;
it does not fail the run, since the individual frames are unaffected.

Exit code: 0 if every run loaded the page (read the MOTION VISIBILITY line
for the verdict; it does not change the exit code); 1 if any run failed
(look for a `FAILED` line; the other runs still go ahead); 2 for a
bad argument or no ffmpeg; 3 for NOT VERIFIED, browser unavailable.

What a failed run leaves behind depends on when it failed. If the first page
load fails, that run has no frames and no sheet. If the page loads and a later
step throws (a screenshot or scroll on a page stuck mid-navigation), the frames
already taken are kept and a sheet is built from them, but the run's scrub pass
is skipped; the line then reads `FAILED (...) -- N frames kept, partial
sheet=<file>`. The `MOTION VISIBILITY` line
comes from the phone run's scrub pass, so a phone run that failed (or whose
scrub pass was skipped) prints no `MOTION VISIBILITY` line; a phone scrub pass
that itself errors prints `NOT MEASURED` instead.

### Motion visibility

Just before its final OK line, a run prints a verdict for the phone (390x844), for example:

```
site-craft: MOTION VISIBILITY (phone 390x844): TOO SMALL: on load 0.14% of the first screen's pixels change (needs 0.4%; largest animated thing: g.lever 39 x 64 px); first seen at scroll y=0
```

| Verdict | Meaning |
|---|---|
| `VISIBLE` | Something animates on screen, within one phone screen of scroll, and enough changes to notice. |
| `TOO SMALL` | It animates on screen, but too little changes. |
| `TOO LATE` | The first on-screen animation needs more than 844 px of scroll. |
| `OFF-SCREEN` | An animation ran while its target was not on screen, so nobody sees it play. |
| `NONE SEEN` | No animation found and no pixel change during load. Expected at motion level 0 only. |
| `NOT MEASURED` | The phone scrub pass failed, so nothing was measured. Not a pass. |

How it is measured, during the phone scrub pass:

- At five points during load and after every 100 px scroll step, the engine
  lists what is animating: `document.getAnimations()` (CSS animations and
  transitions, Web Animations API, scroll-driven animations while part-way
  through) plus SVG SMIL elements. For each target it records the size and
  whether it is on screen.
- Motion that plays **on load** is sized by pixels: consecutive load frames
  are compared, and the share of the first screen's pixels that change must
  reach 0.4% (`SITECRAFT_MOTION_MIN_CHANGE_PCT`). A small part that travels
  counts; a large part that barely moves does not. A pixel counts only if at
  least 5 of the 9 pixels around it changed too, which removes the
  one-pixel text redraw a browser can do when an animation ends.
- Motion that starts **on scroll** is sized by area, because scrolling
  changes every pixel anyway: the animated targets on screen must together
  cover 1% of the screen (`SITECRAFT_MOTION_MIN_AREA_PCT`).
- "Soon enough" is `SITECRAFT_MOTION_MAX_START_Y`, default 844 px of scroll.

The defaults (0.4% changed pixels on load, 1% target area on scroll, start
within 844 px) are a detection floor, deliberately looser than the design
targets in SKILL.md; override them with the env vars above. `VISIBLE` does
not mean the motion is good, only that a visitor can see it.

What it cannot see: motion driven only by script (`requestAnimationFrame`,
canvas) has no animation object, so its size and position are not measured;
it is reported as `VISIBLE (pixels only)` when the load frames change enough,
and missed entirely if it starts on scroll. Hover and focus motion is never
triggered.

### Reading the sheets

This tool does not judge motion, it only makes motion visible to whoever
(or whatever) looks at the sheet next. Compare the third sheet
(`390x844-reduced-motion`) against the second (`390x844`): if they look the
same, reduced motion is probably honoured; if the reduced-motion sheet still
shows things sliding or fading in partway through a frame while the normal
sheet shows the same thing, something is still animating when it should not
be.

## budget-check.sh

```
budget-check.sh <url> [--budget=BYTES] [--text-ratio-min=RATIO]
                      [--budget-scope=all|first-party] [--settle-ms=MS]
```

Env equivalents: `SITECRAFT_JS_BUDGET_GZIP` (default 60,000 bytes),
`SITECRAFT_TEXT_RATIO_MIN` (default `0.95`), `SITECRAFT_JS_BUDGET_SCOPE`
(default `all`), `SITECRAFT_SETTLE_MS` (default `3000`). A flag overrides
the env var.

Three checks, seven page loads per run: one for JS weight, two for the
JS-on/JS-off text comparison, and four for the two reduced-motion measures
(each loads the page with and without reduced motion emulated):

**1. JS weight.** Every network response whose Chrome DevTools Protocol
request type is `Script` (or whose MIME type contains `javascript`),
captured via a CDP `Network` session so that scripts injected after the
`load` event (idle-callback-deferred vendor bundles, lazy chunks) are
caught too, **plus** the text content of every inline JavaScript `<script>` (no `type`,
or `text/javascript`, `application/javascript`, `module`; read from the live
DOM after load). A `<script>` with no `src` makes no network request, so
inline JS would measure 0 B without this. `ld+json`, `importmap` and
`speculationrules` blocks are data, not JS, and are skipped. Each inline
script is listed with a synthetic URL (`inline:script[N]`), counted
first-party, marked `*` (transfer size approximated as its decoded size), and
gzipped the same way a fetched body is. The script waits for `networkidle` (or 5 s, whichever comes
first) and then an extra settle delay before closing the list (see
"Post-load settle window" below). For each script: the transfer size (CDP
`encodedDataLength`, or the `Content-Length` header, or the decoded byte
count, in that preference order — marked with `*` in the table when it is
not the first of those) and a gzip size **recomputed by the script**
(`zlib.gzipSync` on the decoded body, not whatever encoding the server
actually used). Recompressing makes the number comparable across
sites and across what a CDN happens to negotiate (gzip vs. brotli vs.
none), but it means this total can differ from a number measured by `curl
--compressed` against the live, server-compressed bytes; say which method
produced a number when comparing the two.

This check counts every script the page loads, including third-party ones,
because the budget describes what the visitor's browser has to fetch and run.

Each script is also tagged first-party (`1P`) or third-party (`3P`):
first-party means the same hostname as the page URL; everything else,
including a CDN or a different subdomain of the same company, is
third-party (a narrower reading than eTLD+1, chosen because it needs no
public-suffix list and is simple to state). `data:`/`blob:` scripts have no
hostname and count as first-party. The table shows both subtotals and the
combined total. `--budget-scope` picks which number the byte budget is
checked against: `all` (default) or
`first-party` (ignore third-party script weight entirely). Whichever scope
is in effect, only unmeasured (`ERROR`) scripts *within that scope* force a
FAIL — an unreadable third-party body does not fail a first-party-scoped
budget, and vice versa — so the exit code always matches what the printed
number actually covers.

**Post-load settle window.** The 3 s (default) wait after `load`/
`networkidle`, before the JS-weight script list is closed out, is what
catches a vendor bundle or lazy chunk injected late (after an idle
callback, a timer, or a deferred `<script>`). `--settle-ms` overrides it;
the window actually used is printed twice: the shell wrapper prints
`site-craft: settle-after-load=Nms` (its resolved flag/env value) and the
measuring engine prints `site-craft: settle-after-load window = Nms`, so a
mismatch between what was requested and what ran would be visible.

**2. JS-off.** Loads the page twice, once with JavaScript enabled and once
with it disabled (`javaScriptEnabled: false` on the browser context — the
page genuinely cannot run its own scripts; this is not `noscript`-tag
detection), and reads `document.body.innerText` both times. `innerText`
reflects what is actually laid out and visible, not hidden or
`display:none` markup. Reports both character counts and the off/on ratio;
PASS if the ratio is at least `--text-ratio-min` (default 0.95 — i.e. JS-off
text is at least 95% as long as JS-on text). A ratio above 1.0 is normal and
not a failure (JS can shorten visible text, e.g. by replacing a long
fallback with a shorter formatted value).

**3. Reduced motion — two independent measures.** Both run with
`prefers-reduced-motion: reduce` emulated and again without it, and both
check after load and after scrolling down one viewport height. The overall
REDUCED MOTION check PASSes only if **both** measures show no motion in the
reduced-motion run at both checkpoints; either one failing fails the whole
check (see `OVERALL: FAIL` reasoning text).

- **Measure A — Web Animations API.** Counts `document.getAnimations()`
  entries whose `playState` is `running` or `pending`.
  Can see: CSS `animation`/`transition` properties and JS code that
  explicitly uses `element.animate()`.
  Cannot see: a script-driven animation library that moves styles every
  frame via `requestAnimationFrame` and direct style/transform writes (the
  default mode of some popular animation libraries, independent of whether
  they also offer an optional WAAPI-backed mode) — that kind of animation
  produces zero entries here even while it is visibly animating on screen.
  A PASS from measure A alone means "no WAAPI animation is active", not
  "nothing is moving".

- **Measure B — visible-motion screenshot diff (engine-agnostic).**
  At each checkpoint, takes two PNG screenshots `VISUAL_DIFF_GAP_MS` (500 ms)
  apart with scrolling stopped and compares them byte-for-byte (Playwright's
  PNG screenshots of an unchanged page are deterministic, so "no visible
  change" means literally identical bytes). Before comparing, every
  `<video>` element is hidden with an injected stylesheet, so a playing
  video's own frame-by-frame change cannot register as motion here — video
  autoplay is a separate, already-known concern, not what this check is
  for; `prefers-reduced-motion` does not pause video either way. A blinking
  text caret is never triggered because this check never focuses an
  editable element, so there is nothing to explicitly filter there.
  Can see: anything that visibly changes on screen regardless of mechanism
  — CSS, WAAPI, `requestAnimationFrame`, a JS animation library (GSAP and
  similar included), canvas redraws, SVG SMIL.
  Cannot see: *what* moved, *which* element caused it, or motion confined
  to a region outside the current 1280x800 viewport. A single coincidental
  pixel-identical pair of frames from a genuinely animating page is not a
  realistic failure mode at a 500 ms gap, but it is a theoretical blind
  spot worth naming.

Prints a table (JS weight) and a PASS/FAIL line per check, then
`OVERALL: PASS` or `OVERALL: FAIL`. If a page load fails outright for any of
the seven loads, the affected check(s) print `NOT MEASURED -- page load
failed (...)` and count as FAIL — never a silent PASS from the zeroed-out
numbers a failed load would otherwise produce.

Exit code: 0 if every check passed; 1 if any check failed (or could not be
measured); 2 for a bad argument; 3 for NOT VERIFIED, browser unavailable.

## page-gates.sh

```
page-gates.sh <url> [--widths 300,320,360,390,414,768,1024,1280,1440,1920]
                    [--ask-selector CSS] [--json]
```

Three gates; each prints PASS/FAIL lines with the worst offenders (at most 8).
Each width or viewport is a fresh page load, followed by an 800 ms wait.

**1. OVERFLOW.** At each width (viewport height 900), lists visible elements
whose box has `right > width + 1` or `left < -1`, and checks that
`documentElement.scrollWidth` does not exceed the width. An element inside an
ancestor that clips (`overflow` hidden, clip, auto or scroll) and itself fits
in the viewport is not counted. Gate: 0 offenders at every width. Why: a
layout that holds at the one width you looked at can still push the page
sideways at 300 or 414.

**2. ONE ASK.** At 1440 and 390, inside `<main>` (or `<body>` if there is no
`main`), finds "filled" actions: `<a>` or `<button>` that is visible, at
least 32 px tall, whose background colour is more than 50% opaque and differs
from the background behind it (a gradient background-image also counts).
Actions are grouped by destination: the resolved `href` for a link, the text
for a button or a link with no real `href`. Gate: at most 1 distinct
destination per viewport; the same ask repeated is fine. The detection is a
heuristic (a large filled card that is a link counts as an action), so the
output lists what it found for a human to overrule. Detection counts filled
actions of 32 px or taller only. This gate does not check the 44 px filled
action height or the 24 px minimum control size that SKILL.md section 5 sets;
those are checked by Lighthouse and by looking at the page. `--ask-selector <css>`
replaces detection with an explicit selector.

**3. DARK LEGIBILITY.** At 390 and 1440, for every visible element with its
own text: font size, colour, and the effective background (the first ancestor
background colour with alpha above 0.5; if an ancestor on the way has a
background image the text is counted as unknown and skipped). Background
relative luminance below 0.2 counts as dark. On dark: FAIL if the font size is
under 13.5 px; FAIL if contrast is under 7:1 for text under 24 px (4.5:1 from
24 px up); WARN (not a failure) if `<p>` or `<li>` text is under 16 px. Prints
the counts and the worst 8.

`--json` prints one JSON object with everything measured instead of the
lines. Exit codes: 0 all gates pass, 1 any gate fails (or the page does not
load), 2 bad arguments, 3 NOT VERIFIED, browser unavailable.

## css-balance.js

```
node css-balance.js <file-or-dir> [...]
```

For every `.css` file, and every `<style>` block in every `.html` file
(directories are searched recursively; `node_modules` and dot-directories are
skipped), counts `{` and `}` outside `/* comments */` and outside `'...'` and
`"..."` strings (backslash escapes honoured; a newline ends an unterminated
string, as CSS does). Reports the first `}` with no matching `{` as
`file:line`, or the number of `{` still open at the end. One unbalanced
stylesheet can silently swallow every rule after it, so a whole media-query
range disappears while the page still works at the width you checked.

Prints one line per stylesheet and a PASS/FAIL summary. Exit codes: 0 all
balanced, 1 any imbalance, 2 bad arguments.

## gzserve.js

```
node gzserve.js <root-dir> [port=8080]
```

A static server on `127.0.0.1` that gzips text types (`text/*`, JavaScript,
JSON, SVG) when the request sends `Accept-Encoding: gzip`, sets
`Content-Length`, `Vary: Accept-Encoding` and `Cache-Control: no-store`,
serves `index.html` for a directory, answers 404 for anything missing and 403
for a path that escapes the root (the path is normalised and checked against
the root prefix; symlinks that lead out are refused too). Run it until you
kill it.

Why: Lighthouse against a plain dev server that does not compress measures a
slower page than production serves. Point Lighthouse at this twin instead:

```
node gzserve.js ./dist 8080 &
lighthouse http://127.0.0.1:8080/ ...
```

## What these scripts do not check

- Lighthouse performance and accessibility scores
- LCP, INP and CLS
- contrast ratios outside dark backgrounds (page-gates.sh checks only text on
  dark backgrounds)
- `:focus-visible` styling
- touch target sizes

Run Lighthouse for these (against the `gzserve.js` twin, so compression
matches production). `page-gates.sh` covers
horizontal overflow, the single-ask rule and dark-background legibility;
`css-balance.js` covers stylesheet brace balance.

## Files

- `lib.sh` — the four resolver functions, the browser preflight and the
  NOT VERIFIED exit, sourced by the three browser scripts.
- `page-gates.js` — the Playwright automation behind `page-gates.sh`.
- `capture-engine.js` / `budget-engine.js` — the Playwright automation,
  invoked by the matching `.sh` with `NODE_PATH` set to the resolved
  playwright directory and the resolved binaries passed through env vars.
  Not meant to be run by hand (no argument validation beyond "did I get a
  URL").
- `format-budget-result.js` — turns `budget-engine.js`'s one JSON line into
  the printed table and PASS/FAIL lines, and sets the process exit code.

Runtime depends on the page and is dominated by fixed waits, not measured
here. `motion-capture.sh` makes 5 page loads (3 runs plus 2 scrub passes) and
up to 96 scrub frames (48 per scrub pass), plus the load and scroll frames.
`budget-check.sh` makes 7 page loads (1 JS weight, 2 JS-on/JS-off, 4 for the
two reduced-motion measures) and waits the settle window on the first.

## Limitations

- Scroll steps are capped at 8 regardless of page length, to bound runtime
  and frame count; a very long page will not get a frame for every
  viewport-height of content. The scrub pass is capped at 48 frames.
- The five load-sequence screenshot timings (80/200/400/900/1500 ms) are fixed,
  not adaptive; an animation that finishes faster or slower than that
  window may be under- or over-represented in the load frames.
- `budget-check.sh`'s JS-weight total only includes scripts whose body CDP
  could read back (`Network.getResponseBody`); a script whose body could
  not be read is listed with an `ERROR` in the gzip column, excluded from
  the total, and forces the JS-weight check (in whichever scope it falls
  under) to FAIL rather than silently under-counting.
- The first-party/third-party split is by exact hostname match against the
  page URL, not by registrable domain (eTLD+1); a same-company CDN on a
  different subdomain counts as third-party.
- Measure B (visible-motion screenshot diff) runs at a fixed 1280x800
  viewport, independent of the viewport motion-capture.sh uses; a layout
  that only animates at a different breakpoint will not be caught by it.
  It also only samples two points in time per checkpoint, 500 ms apart — an
  animation that happens to be between visually-identical frames at both
  samples (unlikely, but possible for e.g. a very slow looping fade) would
  not register as motion.
- The browser scripts launch a fresh browser context per run/check, so cookies,
  cache and any login state do not carry over between the five
  motion-capture page loads (three runs plus two scrub passes) or the seven
  budget-check loads; this is deliberate
  (each load should see the page the way a first-time visitor would) but it
  means neither tool can test a flow that needs to stay logged in.
- Linux only: the Chromium lookup in lib.sh knows Linux paths; on macOS or
  Windows set the binary path with `SITECRAFT_CHROMIUM`.
