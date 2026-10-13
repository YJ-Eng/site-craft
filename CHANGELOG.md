# Changelog

## v0.4.0

A review and clean-up release, plus new gates. Full record: `docs/REVIEW.md`.

**Removed** (each with its reason in `docs/REVIEW.md`, section 3):
- `references/recipes-pointer-surface.md`, `references/recipes-text-scroll.md` and all 18
  `demos/`: not loaded by SKILL.md, and 6 demos had verified bugs (an invalid `font`
  shorthand the browser drops, an underline sweep that never moved, a 24 px marquee seam,
  content hidden under reduced motion).
- `references/craft-rules.md`, `anti-default.md`, `signature-moment.md`: folded into SKILL.md;
  `build-spec.md`: deleted; `sources.md`: moved to `docs/SOURCES.md`.
- Unsourced statistics, author-voice wording, an over-specific example and internal test
  history.

**Fixed**:
- `platform-first.md`: the count-up sketch showed 0 with JavaScript off; the `sibling-index()`
  fallback always won; cross-page view transitions used the wrong API; two `var()` fallbacks
  could not work; hover gating and reveal travel now match SKILL.md.
- Scripts: inline JSON-LD and import maps no longer count as JS weight; the npx Playwright
  lookup now takes the newest copy; `SHEET_BYTES_LIMIT_EXCEEDED` and partial-capture failures
  now reach the user; the docs match the code.

**Added**:
- SKILL.md §3: one dominant, subject-specific visual idea per page; the brochure trap (a
  headline over a bare table or card grid); low motion is not an excuse for weak visuals;
  3–4 candidates and the swap, removal and explain tests.
- SKILL.md §4: the dark-surface legibility floor; motion timing, easing and gating numbers;
  pause and flash limits.
- SKILL.md §5: a hard-gate table with a check for every gate: valid HTML, balanced CSS,
  overflow at 10 widths from 300 to 1920 px, one ask per page, target sizes, dark-surface
  legibility, Lighthouse accessibility ≥ 95, reduced motion, JavaScript off, CLS 0, and
  Lighthouse run against a gzip-serving copy.
- SKILL.md §7: the review loop (independent read-only refute, a written ruling per finding,
  at most two fix rounds, hard-gate failures never parked, post-verification on screenshots
  and on behaviour).
- `scripts/page-gates.sh` (overflow, one ask, dark-surface legibility),
  `scripts/css-balance.js` (brace guard), `scripts/gzserve.js` (gzip static server).

**Blind test 2** (details in `docs/TESTS.md`): one brief, two Opus 5.5 builds, three blind
Opus 5.5 judges. The skill page scored 7.94 against 6.17 for the unguided page, and all 3
judges preferred it, which meets the pre-registered rule. The unguided page won "would a
visitor act" with every judge (a real form against a mailto link). This is weak evidence:
one brief, and judges given the skill's own rules.

## v0.3.0

One fix round after the first with-and-without test. A second blind test will run on this
version; the README says so.

- `scripts/motion-capture.sh`: scrub pass. After the usual frames, the two normal-motion runs
  are loaded again and scrolled in 100 px steps, one frame each, into `sheets/<run>-scrub.jpg`.
  Motion that follows the scroll position now shows as a sequence. A run writes five sheets.
- `scripts/motion-capture.sh`: a `MOTION VISIBILITY` line for the phone (`VISIBLE`, `TOO SMALL`,
  `TOO LATE`, `OFF-SCREEN`, `NONE SEEN`, `NOT MEASURED`). It lists what animates and where, and compares load
  frames pixel by pixel. Thresholds were set on the 15 judged pages of the first test.
- Both scripts: a browser preflight. If node, Playwright or Chromium is missing, or Chromium
  cannot start, they print `NOT VERIFIED, browser unavailable` and exit with code 3.
- `SKILL.md`: the rules a one-page build needs are now in the file itself: first phone screen,
  made for this subject, type and colour, motion. Only `platform-first.md` and
  `engine-choice.md` stay on the reading list, each for one specific question. The other
  reference files are kept as background and are no longer loaded for a build.
- `SKILL.md`: what to do when nobody can answer: decide from the brief, log the reason, never
  wait. In a non-interactive run the direction is chosen directly, without writing up
  alternatives. When the brief leaves motion open, the default is level 0–1 unless a visible
  sequence explains the offer better.
- `SKILL.md`: level 2 means one coordinated sequence (several parts may take part). The moment
  has design targets on a phone: where it starts, how much changes, and that it shows a
  before and after. The 8 px entrance convention applies to ordinary reveals only.
- `SKILL.md` section 6: read the `MOTION VISIBILITY` line as a floor, not a pass mark; report
  `not verified, browser unavailable` when the scripts could not run.

## v0.2.2

- With-and-without test, run 2026-10-03, result written into the README: no evidence of benefit
  over building with no guidance (composite gap −0.43 with the Opus judge, −0.60 with the GPT-6
  Astra judge; the pass rule needed a positive gap from both). The design guidance is cut back:
  no further building until a re-test.
- `scripts/motion-capture.sh`: the load frames are now timed from DOMContentLoaded (about +80,
  +200, +400, +900 and +1500 ms) rather than from network idle, so short load animations are
  caught before they finish. Each frame's label records the offset actually reached.
- Known gap, not fixed: the scroll steps are one full viewport each, so scroll-linked motion
  that plays over a few hundred pixels shows only its end states.

## v0.2.1

- Moved `demos/` inside `skills/site-craft/` so the installed skill carries its demos.
- Repo published under MIT (`LICENSE`); README states the untested status and the name clash.

## v0.2

- Added `references/craft-rules.md`: checkable usability, motion, type, layout, colour and focus
  rules, in the order they outrank each other.
- Added `references/signature-moment.md`: a method for inventing one subject-tied hero moment,
  with swap/removal/explain tests, instead of picking an effect from a catalogue.
- Added `references/build-spec.md`: the build-spec format an agent fills in once per site before
  writing section code.
- Added `references/platform-first.md`: a native CSS/Web Animations API feature-support table and
  ready `@supports` fallbacks, to check before reaching for a library.
- Added `references/engine-choice.md`: when (and which) of GSAP, Anime.js v4, or Motion to use,
  with measured shipped weights and v3→v4 Anime.js migration notes.
- Added `references/recipes-pointer-surface.md` and `references/recipes-text-scroll.md`:
  measured, demoed recipes for CTAs, cards, forms, backdrops, headlines, stats and scroll
  moments.
- Added `demos/`: one working, standalone HTML file per shipped recipe, each checked against
  `scripts/motion-capture.sh` and `scripts/budget-check.sh`.
- Extended `scripts/budget-engine.js` to measure inline `<script>` content (previously 0 B for
  every demo, since all of them ship JS inline rather than as a separate file).
- `SKILL.md`: added a pointer to every reference file with when to load it, added the
  signature-moment step to the Directions section, folded craft-rules.md's numeric gates (INP,
  CLS, touch target, one primary action) into the hard-gates section, and gave the verify
  section the scripts' real invocations.
- Fixed: primary CTA demo lost all hover/focus feedback under
  `prefers-reduced-motion: reduce` — the state-change rule is no longer nested inside the
  reduced-motion gate, only the transition is.
- Fixed: feature-grid recipe's claim that focus-visible gets "the identical lift" as hover was
  false in the shipped demo (focus got only an outline) — demo and recipe now match.
- Fixed: logo-marquee recipe claimed `:focus-within` pauses the loop; no element inside the
  marquee was ever focusable, so this was dead CSS — the claim and the dead rule are removed; the
  checkbox's own `:checked` path is the real keyboard path.
- Removed visible "Studied in: <library>" footers from all nine pointer-surface demo pages —
  attribution now lives only in `references/recipes-pointer-surface.md`, not in shipped page
  content.

## v0.1

- Initial skill text (`SKILL.md`): brief, directions, build rules, hard gates, verify step,
  removal rule.
- `references/anti-default.md`: judge-named weaknesses plus vendor-documented model defaults and
  library looks to avoid.
- `references/sources.md`: libraries studied and their licence terms.
- `scripts/`: `motion-capture.sh` / `capture-engine.js` (contact-sheet screenshots across load and
  scroll, normal and reduced motion) and `budget-check.sh` / `budget-engine.js` (JS weight, JS-off
  text completeness, reduced-motion compliance), plus shared resolver helpers in `lib.sh`.
