#!/usr/bin/env node
// Internal engine for motion-capture.sh. Not meant to be run by hand.
//
// Loads a page three times (desktop, mobile, mobile+reduced-motion),
// screenshots the load sequence and a stepped scroll of the full page,
// writes every frame as a numbered JPEG, then builds one contact sheet
// per run with ffmpeg (fixed grid, frames in order, oldest first, reading
// left to right then top to bottom).
//
// The two normal-motion runs then get a scrub pass on a fresh page load:
// small scroll steps (100 px by default), one frame each, in a sheet of
// their own, so motion that follows the scroll position shows as a
// sequence instead of only its end state.
//
// During the phone scrub pass the engine also lists what is animating and
// where it sits on the screen, and prints one MOTION VISIBILITY verdict
// (see README.md, "Motion visibility").
//
// Usage: node capture-engine.js <url> <outDir>
// Env: SITECRAFT_CHROMIUM_RESOLVED (chromium executable, optional)
//      SITECRAFT_FFMPEG_RESOLVED   (ffmpeg executable, required)
//      SITECRAFT_SCRUB_STEP_PX, SITECRAFT_SCRUB_MAX_FRAMES,
//      SITECRAFT_MOTION_MIN_AREA_PCT, SITECRAFT_MOTION_MIN_CHANGE_PCT,
//      SITECRAFT_MOTION_MAX_START_Y (all optional, see README.md)
// Prints one summary line per run to stdout, plus machine-readable lines,
// written to engine.log: "RESULT <json>" per run and one
// "MOTION_VISIBILITY <json>" line. Also a readable
// "MOTION VISIBILITY ..." line, and a "SHEET_BYTES_LIMIT_EXCEEDED <file>"
// line if a sheet is over the ~4 MB target (not a hard failure: the frames
// are still usable, only the sheet is harder to attach).

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { chromium } = require('playwright');

const url = process.argv[2];
const outDir = process.argv[3];
const chromiumPath = process.env.SITECRAFT_CHROMIUM_RESOLVED || undefined;
const ffmpegPath = process.env.SITECRAFT_FFMPEG_RESOLVED;

if (!url || !outDir) {
  console.error('usage: node capture-engine.js <url> <outDir>');
  process.exit(2);
}
if (!ffmpegPath) {
  console.error('site-craft: SITECRAFT_FFMPEG_RESOLVED not set (internal error)');
  process.exit(2);
}

function numEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const framesDir = path.join(outDir, 'frames');
const sheetsDir = path.join(outDir, 'sheets');
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(sheetsDir, { recursive: true });

const RUNS = [
  { name: '1440x900', width: 1440, height: 900, reducedMotion: false, scrub: true, motionCheck: false },
  { name: '390x844', width: 390, height: 844, reducedMotion: false, scrub: true, motionCheck: true },
  { name: '390x844-reduced-motion', width: 390, height: 844, reducedMotion: true, scrub: false, motionCheck: false },
];

const MAX_SCROLL_STEPS = 8;
// Load frames are timed from DOMContentLoaded, not from network idle: a
// static page goes idle ~500 ms after load, by which time a short load
// animation has already finished. Each frame waits until its target offset;
// the label records the offset actually reached (screenshots take time).
const LOAD_FRAME_TARGETS_MS = [80, 200, 400, 900, 1500];
const SCROLL_MID_PAUSE_MS = 150;
const SCROLL_SETTLE_PAUSE_MS = 400;
const SHEET_BYTES_TARGET = 4 * 1024 * 1024;

// Scrub pass: one frame per step, top of the page downwards. 48 frames of
// 100 px cover the first 4,700 px of scroll; a longer page is cut off there
// and the summary line says so.
const SCRUB_STEP_PX = Math.round(numEnv('SITECRAFT_SCRUB_STEP_PX', 100));
const SCRUB_MAX_FRAMES = Math.round(numEnv('SITECRAFT_SCRUB_MAX_FRAMES', 48));
const SCRUB_SAMPLE_PAUSE_MS = 90;
const SCRUB_SHOT_PAUSE_MS = 60;

// Motion visibility thresholds, phone run only (see README.md).
// MIN_CHANGE: for motion that plays on load, at least this share of the
// first screen's pixels must change while it plays.
// MIN_AREA: for motion that starts on scroll, the animated things on
// screen, taken together, must cover at least this share of the screen.
// MAX_START_Y: the motion must be on screen and active after at most this
// much scroll (default: one phone screen).
const MOTION_MIN_AREA_PCT = numEnv('SITECRAFT_MOTION_MIN_AREA_PCT', 1);
const MOTION_MIN_CHANGE_PCT = numEnv('SITECRAFT_MOTION_MIN_CHANGE_PCT', 0.4);
const MOTION_MAX_START_Y = Math.round(numEnv('SITECRAFT_MOTION_MAX_START_Y', 844));
const PIXEL_DIFF_LUMA_THRESHOLD = 24;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shot(page, dir, index, label) {
  const file = path.join(dir, `${String(index).padStart(2, '0')}-${label}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
  return { file, label };
}

// Runs inside the page. Lists every animation that is active right now
// (CSS animations and transitions, Web Animations API, scroll-driven
// animations, SVG SMIL) with its target's position on screen, plus the
// share of the screen those targets cover together.
function sampleMotionInPage() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const sy = Math.round(window.scrollY);
  const CELL = 2;
  const cols = Math.ceil(vw / CELL);
  const rows = Math.ceil(vh / CELL);
  const grid = new Uint8Array(cols * rows);
  const items = [];

  const describe = (el) => {
    let s = el.tagName ? el.tagName.toLowerCase() : 'node';
    if (el.id) s += `#${el.id}`;
    const cls = el.getAttribute && el.getAttribute('class');
    if (cls) s += `.${String(cls).trim().split(/\s+/).slice(0, 2).join('.')}`;
    return s.slice(0, 60);
  };

  const add = (el, kind) => {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const x0 = Math.max(0, r.left);
    const x1 = Math.min(vw, r.right);
    const y0 = Math.max(0, r.top);
    const y1 = Math.min(vh, r.bottom);
    const onScreen = x1 > x0 && y1 > y0;
    if (onScreen) {
      const c0 = Math.floor(x0 / CELL);
      const c1 = Math.min(cols, Math.ceil(x1 / CELL));
      const r0 = Math.floor(y0 / CELL);
      const r1 = Math.min(rows, Math.ceil(y1 / CELL));
      for (let ry = r0; ry < r1; ry++) grid.fill(1, ry * cols + c0, ry * cols + c1);
    }
    items.push({
      kind,
      what: describe(el),
      w: Math.round(r.width),
      h: Math.round(r.height),
      docY: Math.round(r.top + sy),
      onScreen,
    });
  };

  for (const a of document.getAnimations()) {
    const eff = a.effect;
    if (!eff || !eff.target) continue;
    let progress = null;
    try {
      progress = eff.getComputedTiming().progress;
    } catch (e) {
      // no timing available: treat as not active
    }
    const tl = a.timeline;
    const tlName = tl && tl.constructor ? tl.constructor.name : '';
    if (/ScrollTimeline|ViewTimeline/.test(tlName)) {
      // Follows the scroll position: active only while part-way through.
      if (progress === null || progress <= 0 || progress >= 1) continue;
      add(eff.target, 'scroll-linked');
    } else {
      if (a.playState !== 'running') continue;
      add(eff.target, 'timed');
    }
  }

  // SVG SMIL is not reported by getAnimations().
  for (const s of document.querySelectorAll('animate, animateTransform, animateMotion')) {
    const svg = s.ownerSVGElement;
    const target = s.targetElement || s.parentElement;
    if (!svg || !target) continue;
    const dur = parseFloat(s.getAttribute('dur') || '');
    const begin = parseFloat(s.getAttribute('begin') || '0') || 0;
    const repeat = s.getAttribute('repeatCount') || s.getAttribute('repeatDur');
    let now = 0;
    try {
      now = svg.getCurrentTime();
    } catch (e) {
      continue;
    }
    const endless = repeat === 'indefinite';
    const reps = endless ? 1 : parseFloat(repeat || '1') || 1;
    const end = Number.isFinite(dur) ? begin + dur * reps : begin + 3;
    if (endless || now <= end) add(target, 'timed');
  }

  let covered = 0;
  for (let i = 0; i < grid.length; i++) covered += grid[i];
  return {
    scrollY: sy,
    coveragePct: (covered * CELL * CELL * 100) / (vw * vh),
    items,
  };
}

async function runOne(browser, run) {
  const dir = path.join(framesDir, run.name);
  fs.mkdirSync(dir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: run.width, height: run.height },
    reducedMotion: run.reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();

  let navError = null;
  let t0 = 0;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    t0 = Date.now();
  } catch (e) {
    navError = e.message;
  }

  const frames = [];
  let scrollHeight = 0;
  let steps = 0;

  if (!navError) {
    try {
      let idx = 0;
      for (const target of LOAD_FRAME_TARGETS_MS) {
        const wait = target - (Date.now() - t0);
        if (wait > 0) await sleep(wait);
        const reached = Date.now() - t0;
        frames.push(await shot(page, dir, idx++, `load-t${reached}ms`));
      }
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) {
        // many sites never go idle (analytics beacons, open websockets); proceed anyway
      }

      scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewportH = run.height;
      const rawSteps = Math.max(0, Math.ceil(scrollHeight / viewportH) - 1);
      steps = Math.min(rawSteps, MAX_SCROLL_STEPS);

      for (let s = 1; s <= steps; s++) {
        const y = Math.min(s * viewportH, scrollHeight);
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await sleep(SCROLL_MID_PAUSE_MS);
        frames.push(await shot(page, dir, idx++, `scroll${s}-mid`));
        await sleep(SCROLL_SETTLE_PAUSE_MS);
        frames.push(await shot(page, dir, idx++, `scroll${s}-settled`));
      }
    } catch (e) {
      // A slow/hanging navigation can leave the page half-loaded, so a later
      // screenshot or evaluate call can still throw even though goto's own
      // try/catch above did not catch anything. Record it the same way a
      // goto failure is recorded, instead of letting it abort the whole run.
      navError = e.message;
    }
  }

  await context.close();

  return {
    name: run.name,
    width: run.width,
    height: run.height,
    reducedMotion: run.reducedMotion,
    navError,
    scrollHeightPx: scrollHeight,
    steps,
    frameCount: frames.length,
    frames,
  };
}

// Scrub pass, on a page load of its own so that one-shot reveals have not
// already fired. Returns the scrub frames and, for the phone run, the list
// of motion samples (five during load, then one per scroll step).
async function scrubOne(browser, run) {
  const dir = path.join(framesDir, `${run.name}-scrub`);
  fs.mkdirSync(dir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: run.width, height: run.height },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  const frames = [];
  const samples = [];
  let error = null;
  let maxY = 0;
  let lastY = 0;
  let truncated = false;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const t0 = Date.now();
    for (const target of LOAD_FRAME_TARGETS_MS) {
      const wait = target - (Date.now() - t0);
      if (wait > 0) await sleep(wait);
      if (run.motionCheck) {
        const s = await page.evaluate(sampleMotionInPage);
        samples.push({ phase: 'load', ...s });
      }
    }
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (e) {
      // proceed anyway, as in runOne
    }

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    maxY = Math.max(0, scrollHeight - run.height);
    for (let i = 0; i < SCRUB_MAX_FRAMES; i++) {
      const y = Math.min(i * SCRUB_STEP_PX, maxY);
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
      await sleep(SCRUB_SAMPLE_PAUSE_MS);
      if (run.motionCheck && i > 0) {
        const s = await page.evaluate(sampleMotionInPage);
        samples.push({ phase: 'scroll', ...s });
      }
      await sleep(SCRUB_SHOT_PAUSE_MS);
      frames.push(await shot(page, dir, i, `scrub-y${y}`));
      lastY = y;
      if (y >= maxY) break;
    }
    truncated = lastY < maxY;
  } catch (e) {
    error = e.message;
  }

  await context.close();
  return { frames, samples, error, stepPx: SCRUB_STEP_PX, lastY, maxY, truncated };
}

// Share of the first screen's pixels that change while the page loads:
// consecutive load frames are compared in a blank browser page (canvas),
// and every pixel whose brightness moves by more than the threshold in any
// pair is counted once. Engine-agnostic: it sees JS, canvas and SMIL motion
// that the animation list cannot.
async function loadChangePct(browser, frames) {
  const loadFrames = frames.filter((f) => f.label.startsWith('load-'));
  if (loadFrames.length < 2) return null;
  const context = await browser.newContext({ viewport: { width: 400, height: 300 } });
  const page = await context.newPage();
  try {
    const urls = loadFrames.map((f) => `data:image/jpeg;base64,${fs.readFileSync(f.file).toString('base64')}`);
    return await page.evaluate(
      async ({ urls, threshold }) => {
        const load = (u) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('frame did not decode'));
            img.src = u;
          });
        const imgs = [];
        for (const u of urls) imgs.push(await load(u));
        const w = imgs[0].naturalWidth;
        const h = imgs[0].naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const luma = (img) => {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          const out = new Float32Array(w * h);
          for (let i = 0, p = 0; i < d.length; i += 4, p++) out[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          return out;
        };
        const touched = new Uint8Array(w * h);
        let prev = luma(imgs[0]);
        for (let k = 1; k < imgs.length; k++) {
          const cur = luma(imgs[k]);
          for (let p = 0; p < cur.length; p++) if (Math.abs(cur[p] - prev[p]) > threshold) touched[p] = 1;
          prev = cur;
        }
        // Count a pixel only if at least 5 of the 9 pixels around it changed
        // too. When an animation ends the browser may redraw text one pixel
        // differently across the whole screen; that is thin, scattered noise,
        // while a thing that really moved changes solid patches.
        let n = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (!touched[p]) continue;
            const around =
              touched[p - w - 1] + touched[p - w] + touched[p - w + 1] +
              touched[p - 1] + 1 + touched[p + 1] +
              touched[p + w - 1] + touched[p + w] + touched[p + w + 1];
            if (around >= 5) n++;
          }
        }
        return (n * 100) / touched.length;
      },
      { urls, threshold: PIXEL_DIFF_LUMA_THRESHOLD }
    );
  } catch (e) {
    return null;
  } finally {
    await context.close();
  }
}

// Turns the motion samples into one verdict for the phone run.
//   VISIBLE     something animates on screen, soon enough and big enough
//   TOO SMALL   it animates on screen, but too little changes to notice
//   TOO LATE    the first on-screen animation needs more than MAX_START_Y of scroll
//   OFF-SCREEN  animations ran, but never while their target was on screen
//   NONE SEEN   no animation found and no pixel change during load
// (NOT MEASURED is set by the caller when the scrub pass itself failed.)
// "Big enough" is measured two ways. Motion that plays on load is judged by
// how many of the first screen's pixels change (a small part that moves a
// long way counts; a large part that barely moves does not). Motion that
// starts on scroll is judged by how much of the screen its targets cover,
// because scrolling itself changes every pixel.
function judgeMotion(samples, changePct) {
  const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const biggestOf = (items) => items.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
  const thing = (it) => `${it.what} ${it.w} x ${it.h} px`;
  let firstY = null;
  let loadThing = null;
  let scrollPeak = null;
  let late = null;
  let offScreen = null;

  for (const s of samples) {
    const on = s.items.filter((it) => it.onScreen);
    const off = s.items.filter((it) => !it.onScreen);
    if (off.length && !offScreen) offScreen = { scrollY: s.scrollY, item: off[0] };
    if (!on.length) continue;
    if (firstY === null) firstY = s.scrollY;
    const big = biggestOf(on);
    if (s.phase === 'load') {
      if (!loadThing || big.w * big.h > loadThing.w * loadThing.h) loadThing = big;
    } else if (s.scrollY <= MOTION_MAX_START_Y) {
      if (!scrollPeak || s.coveragePct > scrollPeak.coveragePct) {
        scrollPeak = { scrollY: s.scrollY, coveragePct: s.coveragePct, item: big };
      }
    } else if (!late) {
      late = { scrollY: s.scrollY, item: big };
    }
  }

  const change = changePct === null ? null : Math.round(changePct * 100) / 100;
  const base = {
    minChangePct: MOTION_MIN_CHANGE_PCT,
    minAreaPct: MOTION_MIN_AREA_PCT,
    maxStartY: MOTION_MAX_START_Y,
    loadChangePct: change,
    firstOnScreenScrollY: firstY,
    loadThing,
    scrollPeak,
  };

  if (loadThing || scrollPeak) {
    const loadOk = loadThing && (change === null || change >= MOTION_MIN_CHANGE_PCT);
    const scrollOk = scrollPeak && scrollPeak.coveragePct >= MOTION_MIN_AREA_PCT;
    const parts = [];
    if (loadThing) {
      parts.push(
        `on load ${change === null ? 'an unmeasured share' : `${change.toFixed(2)}%`} of the first screen's pixels change ` +
          `(needs ${MOTION_MIN_CHANGE_PCT}%; largest animated thing: ${thing(loadThing)})`
      );
    }
    if (scrollPeak) {
      parts.push(
        `on scroll the animated things cover ${fmt(scrollPeak.coveragePct)}% of the screen at scroll y=${scrollPeak.scrollY} ` +
          `(needs ${MOTION_MIN_AREA_PCT}%; largest: ${thing(scrollPeak.item)})`
      );
    }
    const verdict = loadOk || scrollOk ? 'VISIBLE' : 'TOO SMALL';
    return { ...base, verdict, line: `${verdict}: ${parts.join('; ')}; first seen at scroll y=${firstY}` };
  }
  if (late) {
    return {
      ...base,
      verdict: 'TOO LATE',
      line:
        `TOO LATE: the first on-screen animation starts at scroll y=${late.scrollY} (${thing(late.item)}); ` +
        `it must start within ${MOTION_MAX_START_Y} px of scroll`,
    };
  }
  if (offScreen) {
    return {
      ...base,
      verdict: 'OFF-SCREEN',
      line:
        `OFF-SCREEN: an animation ran while its target was not on screen ` +
        `(${thing(offScreen.item)} at page y=${offScreen.item.docY}, scroll y=${offScreen.scrollY}); nobody sees it play`,
    };
  }
  // No animation object anywhere: motion driven by script or canvas can
  // still show up as changed pixels during load.
  if (change !== null && change >= MOTION_MIN_CHANGE_PCT) {
    return {
      ...base,
      verdict: 'VISIBLE',
      line:
        `VISIBLE (pixels only): ${change.toFixed(2)}% of the first screen's pixels change during load; ` +
        'no CSS, Web Animations or SMIL animation was found, so size and position were not measured',
    };
  }
  return {
    ...base,
    verdict: 'NONE SEEN',
    line: 'NONE SEEN: no animation found and no pixel change during load (expected at motion level 0 only)',
  };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 16 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

// Builds one contact sheet from frames, oldest-first, in a fixed grid.
// Grid cells beyond the frame count are left black by ffmpeg's tile filter.
async function buildSheet(frames, outFile, aspectIsPortrait) {
  const n = frames.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const thumbWidth = aspectIsPortrait ? 200 : 300;

  const args = ['-y'];
  for (const f of frames) args.push('-i', f.file);

  const scaleLabels = [];
  let filter = '';
  frames.forEach((_, i) => {
    filter += `[${i}:v]scale=${thumbWidth}:-2[s${i}];`;
    scaleLabels.push(`[s${i}]`);
  });
  filter += `${scaleLabels.join('')}concat=n=${n}:v=1:a=0,tile=${cols}x${rows}`;

  args.push('-filter_complex', filter, '-frames:v', '1', '-q:v', '3', outFile);
  await runFfmpeg(args);
}

(async () => {
  const launchOpts = { headless: true };
  if (chromiumPath) launchOpts.executablePath = chromiumPath;

  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (e) {
    console.error(`site-craft: chromium launch failed: ${e.message}`);
    process.exit(1);
  }

  const results = [];
  let motion = null;
  try {
    for (const run of RUNS) {
      const result = await runOne(browser, run);
      if (run.scrub && !result.navError) {
        const scrub = await scrubOne(browser, run);
        result.scrub = scrub;
        if (run.motionCheck && !scrub.error) {
          const changePct = await loadChangePct(browser, result.frames);
          motion = judgeMotion(scrub.samples, changePct);
        } else if (run.motionCheck) {
          motion = { verdict: 'NOT MEASURED', line: `NOT MEASURED: the phone scrub pass failed (${scrub.error})` };
        }
      }
      results.push(result);
    }
  } catch (e) {
    console.error(`site-craft: capture failed: ${e.message}`);
    await browser.close().catch(() => {});
    process.exit(1);
  }
  await browser.close();

  let navFailedAny = false;
  for (const result of results) {
    const sheetFile = path.join(sheetsDir, `${result.name}.jpg`);
    const isPortrait = result.height > result.width;
    let sheetBytes = 0;
    if (result.frames.length > 0) {
      try {
        await buildSheet(result.frames, sheetFile, isPortrait);
      } catch (e) {
        console.error(`site-craft: contact sheet failed for ${result.name}: ${e.message}`);
        process.exit(1);
      }
      sheetBytes = fs.statSync(sheetFile).size;
      if (sheetBytes > SHEET_BYTES_TARGET) console.log(`SHEET_BYTES_LIMIT_EXCEEDED ${sheetFile}`);
      result.sheetFile = sheetFile;
    } else {
      result.sheetFile = null;
    }
    result.sheetBytes = sheetBytes;

    const scrub = result.scrub;
    let scrubNote = '';
    if (scrub) {
      scrub.sheetFile = null;
      scrub.frameCount = scrub.frames.length;
      if (scrub.error) {
        scrubNote = `; scrub FAILED (${scrub.error})`;
      } else if (scrub.frames.length > 0) {
        const scrubSheet = path.join(sheetsDir, `${result.name}-scrub.jpg`);
        try {
          await buildSheet(scrub.frames, scrubSheet, isPortrait);
        } catch (e) {
          console.error(`site-craft: scrub sheet failed for ${result.name}: ${e.message}`);
          process.exit(1);
        }
        if (fs.statSync(scrubSheet).size > SHEET_BYTES_TARGET) console.log(`SHEET_BYTES_LIMIT_EXCEEDED ${scrubSheet}`);
        scrub.sheetFile = scrubSheet;
        scrubNote =
          `; scrub ${scrub.frames.length} frames every ${scrub.stepPx} px, y=0..${scrub.lastY}` +
          (scrub.truncated ? ` (page scrolls to ${scrub.maxY}; cut off)` : '') +
          `, sheet=${scrubSheet}`;
      }
      delete scrub.samples;
    }

    console.log(`RESULT ${JSON.stringify(result)}`);
    if (result.navError) {
      navFailedAny = true;
      console.log(
        `${result.name}: FAILED (${result.navError}) -- ` +
          (result.frameCount ? `${result.frameCount} frames kept, partial sheet=${sheetFile}` : 'no frames captured, no sheet built')
      );
    } else {
      console.log(
        `${result.name}: ${result.frameCount} frames, scrollHeight=${result.scrollHeightPx}px, ` +
          `steps=${result.steps}, sheet=${sheetFile} (${sheetBytes} bytes)${scrubNote}`
      );
    }
  }

  if (motion) {
    console.log(`MOTION_VISIBILITY ${JSON.stringify(motion)}`);
    console.log(`MOTION VISIBILITY (phone 390x844): ${motion.line}`);
  }

  if (navFailedAny) {
    console.error('site-craft: at least one run failed to load the page; see FAILED TO LOAD lines above');
    process.exitCode = 1;
  }
})();
