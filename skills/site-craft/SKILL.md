---
name: site-craft
description: Use when asked to build, design, redesign, restyle, animate, or review a website, web page, landing page, or hero section (company site, product or service page, small-business site). Not for app dashboards or data-visualization/chart work. Guides the brief and the visual direction, sets motion and performance budgets, names the looks current models default to, and verifies the build with screenshots, scripted gates and an independent review before anything ships.
---

# site-craft

## 1. Precedence

1. The site's own direction file or design brief outranks this skill.
2. A hard gate (section 5) outranks taste, and outranks the site's direction.
3. Usability outranks polish and motion everywhere in this skill.
4. This skill outranks an agent's own default habits.

## 2. Brief

Before writing any code, get answers to what the request and the site's own files do not
already answer. Ask in one message, only for what is missing:

- Audience, and the one action the page should get them to take.
- Real copy and real subject matter. Do not build against placeholder text or a stock subject.
- Stack: static HTML/CSS/JS, or a build step (Astro, Vite, Next, or similar), decided by the
  requirement. Both are allowed.
- Motion level, 0-3:
  - 0 — none. No animation beyond native browser behavior.
  - 1 — reveals and hover. Supporting content fades or rises in once; interactive elements
    respond to hover or focus.
  - 2 — one composed scroll or load moment. A single sequence tied to scroll position or page
    load, built with intent; several parts may take part in it. Nothing else is animated
    beyond interaction feedback.
  - 3 — showpiece. The site leads with motion as its main device.
  Task-focused, business-to-business and compliance audiences usually sit at 0–1; leisure and
  showcase audiences can carry more.
- Budgets, if they need to differ from the defaults in section 5.

**When nobody can answer** (a scripted or non-interactive run, or the request says to decide
yourself): do not ask and do not wait. Decide each missing item from the brief and write the
decision, with a one-line reason, in the site's direction file. When the brief leaves motion
open, choose 0–1 unless a visible sequence explains the offer better; choose 2 for that
sequence, and 3 only when motion is central to the brief.

## 3. Direction

Unless the site already has a locked direction: in a non-interactive run, or when the user
asks you to decide, choose one directly and do not write up alternatives. Otherwise, propose 3
distinct directions, one line each, and wait for a pick. Either way, record the background and
accent hexes, the type choice, the composition, the page's dominant visual idea (below) and why they fit
this subject in the site's direction file.

**One dominant visual idea per page.** The opening has one subject-specific thing the eye
lands on first: a real photograph of the product or the work, a drawn artefact from the subject
(the printout, the device, the form, the route), or evidence shown as the thing itself (the
before and after, the matched totals). Choose its medium and scale from what the visitor needs
to understand; there is no fixed hero proportion. A strong typographic composition can be that
idea when the words are the offer.

**The brochure trap.** A headline over a bare table of facts, a stat strip or a card grid, with
nothing shown, reads as generated however good the copy is. Low motion must not mean weak visual
presence: earn presence through imagery, type, composition or evidence that clarifies the offer.
Check: look at the 390 px and 1440 px first screens and say in four words what the eye lands on
and what it proves. If the answer is "a heading and some cards", rework it.

**Finding the visual idea and the moment.** Use these steps to find the visual idea at every
level, and the signature moment at levels 2–3. For a type-led opening, steps 1, 2 and 4 (swap
test) are enough; do not add an illustration it does not need.

1. Write the subject in one sentence: who the visitor is, what they hand over, what changes for
   them when this business does its job.
2. Name the subject's own nouns and verbs, then the one state change the buyer is paying for
   (out of tune → in tune; leaking → sealed; two totals → matched).
3. Write 3–4 candidates (artefact + verb + what it proves) before picking one.
4. Test the pick:
   - Swap: if it, or the whole first screen, could sit unchanged on an unrelated business's
     site, it fails.
   - Removal: with the motion deleted, the static end state still makes the argument.
   - Explain: say in one sentence what the visitor learns from it faster than from text.
5. Place it after the claim, never instead of it. The headline, one supporting line and the
   primary action stay readable on the first phone screen while it plays.
6. Use the lightest mechanism that shows it: a CSS state change on a drawn artefact; inline SVG
   with CSS or the Web Animations API; a short muted video with a poster; canvas or WebGL last,
   with a written byte budget.

## 4. Build rules

Use this file for the build. Open `references/platform-first.md` for a specific motion or
layout job or a browser-support question, and `references/engine-choice.md` only when CSS and
the Web Animations API cannot do the job. Neither overrides this file.

Effects are allowed when they fit the brief. Nothing here bans an effect outright; section 7
says when one comes out.

**First phone screen (390 × 844).**
- It says what this is, who it is for and what to do. Keep the headline short enough to read
  in one glance.
- The primary action (section 5) is on the first phone screen. Every other link reads visibly
  lighter.
- Give the offer's distinguishing evidence a readable place in the first 844 px alongside the
  claim and action. Crop supporting scenery and reduce preceding whitespace before shrinking it.
- Keep prices attached to their supplied currency and unit, and make a phone number used for
  conversion prominent, readable and tappable. Remove internal asset captions such as "Hero
  illustration".
- Compose the phone layout on its own terms. Do not stack a desktop layout.

**Made for this subject, not generated.**
- Write headings that name the offer, answer a buyer's question or explain a specific benefit.
  Delete interchangeable reassurance and slogan pairs.
- Choose a dominant composition from what the buyer needs to inspect or understand. Changing
  colours and nouns on the same eyebrow → slogan → button → illustration stack does not
  establish a new direction.
- Avoid template chrome unless the brief or subject calls for it: eyebrow labels with dots,
  01/02/03 on things that are not a sequence, pill clusters, stat strips, gradient blobs, a
  three-card icon grid.
- Avoid the looks current models reach for unprompted: cream with a serif and an italic accent
  word; purple-to-blue gradient; dark with neon glow; everything fading up on one identical
  curve. When web fonts are not allowed, build hierarchy from size, weight and spacing.
- Where trust matters, name and show the person accountable for the work.
- Vary rhythm and density section by section; one repeated section formula reads as a template.

**Type and colour.** Body text is at least 16 px; aim for 45–75 characters per line on wider
screens, allowing shorter lines on phones. Never shrink text to meet a character count. Display
line-height 1.0 to 1.15.

**Dark surfaces.** On dark backgrounds, small and secondary text that passes 4.5:1 can still
read as faint, so the ratio is not proof of legibility; inspect it at its intended size. Default
floor on dark: running text near-white, lead paragraphs 18 px or more, captions and panel text
16 px, nothing under 13.5 px, small labels in a light tint rather than mid-grey.
`scripts/page-gates.sh` checks the size and contrast floor; your eyes check the rest.

**Motion.** Restraint in motion, not in content. Visibility targets and moment timing apply to
signature moments at levels 2–3; the rest applies at every level.
- At level 2, build one coordinated sequence; several parts may take part. Keep necessary
  interaction feedback; omit unrelated decorative animation.
- At 390 × 844, the moment starts on load or within the first half-screen of scroll, with the
  changing region fully visible. It shows a meaningful before → after or reveals useful
  information, large enough to see at normal phone size; sliding a whole illustration into view
  does not qualify by itself. `scripts/motion-capture.sh` reports whether it is visible.
- The moment runs up to about 1,000 ms (or follows the scroll), plays once, eases out, never
  blocks input, and ends in the page's real state. Body text stays visible from first paint:
  reveal supporting graphics, not paragraphs, and never the headline or the primary action.
- Ordinary reveals travel about 8 px and never start from `scale(0)`. Hover and press respond
  in 100–200 ms; nothing triggered by direct input runs over 500 ms. Entrances and input
  responses ease out; linear is for constant motion only. Stagger steps of 30–80 ms.
- Animate `transform` and `opacity` (`clip-path` and `filter` sparingly); never
  `transition: all`. Gate hover motion behind `(hover: hover) and (pointer: fine)`.
- CSS first, then the Web Animations API, then at most one animation engine per site. Put
  `animation-timeline` behind `@supports`, with the base state fully visible without it.
- Base CSS has no motion; motion is added inside `(prefers-reduced-motion: no-preference)`, so
  reduced motion and JavaScript off both show the finished state.
- Anything that moves for more than 5 s beside other content gets a visible, keyboard-reachable
  pause. Nothing flashes more than 3 times a second.

## 5. Hard gates and defaults

Always hard, no exception:

| Gate | Pass | Check |
|---|---|---|
| Valid HTML | 0 errors | `npx html-validate <page>` |
| Stylesheets balanced | every `{` closed | `node scripts/css-balance.js <dir>` |
| No horizontal overflow | 0 elements past the viewport at 300, 320, 360, 390, 414, 768, 1024, 1280, 1440, 1920 px | `scripts/page-gates.sh <url>` |
| One ask per page | at most one distinct primary action (the same ask may repeat, e.g. hero and close) | `scripts/page-gates.sh <url>` |
| Target size | the primary action at least 44 px tall; no control under 24 px | Lighthouse accessibility + look |
| Dark-surface legibility | on dark: nothing under 13.5 px, contrast 7:1 under 24 px | `scripts/page-gates.sh <url>` |
| Contrast and focus | WCAG 2.2 AA; focus visible via `:focus-visible` | Lighthouse accessibility, then Tab through the page |
| Accessibility score | Lighthouse accessibility at least 95 | Lighthouse |
| Reduced motion | nothing moves; the end state shows | `scripts/budget-check.sh <url>` + reduced-motion screenshots |
| JavaScript off | content complete and readable | `scripts/budget-check.sh <url>` |
| Layout shift | CLS 0 in a lab run of a static page | Lighthouse |

Budget defaults for a static site, unless the brief sets different numbers:

- Added JavaScript: at most 60,000 bytes gzip (`scripts/budget-check.sh`).
- Mobile Lighthouse performance: at least 90. Largest Contentful Paint: at most 2.5 s.
  Interaction to Next Paint: at most 200 ms, measured from real visitors (p75) after launch;
  no lab check stands in for it.
- Run Lighthouse against a server that compresses (gzip) like a production server. A plain dev
  server that does not compress reports a slower page than the real one; use
  `node scripts/gzserve.js <build-dir> <port>` and point Lighthouse at it.

## 6. Verify

- Run the gates in section 5. Flags and details are in `scripts/README.md`. The scripts need
  `node`, the `playwright` package with Chromium, and `ffmpeg` for motion capture; the other
  checks use `html-validate` and `lighthouse` (both run with `npx`). If the
  project has an equivalent check, use that instead.
- Take screenshots at 390 px and 1440 px, and at 390 px with reduced motion emulated. Look at
  them: say what the eye lands on first, read every line on dark surfaces at arm's length.
- Run `scripts/motion-capture.sh <url>` and look at the contact sheets, not only the
  screenshots. The `-scrub` sheets step through the page 100 px at a time, so motion that
  follows the scroll shows as a sequence.
- At levels 2–3, inspect the phone's `MOTION VISIBILITY` result. `VISIBLE` is only a detection
  floor: the change must be understandable at normal phone size without hunting for it.
  Investigate other verdicts, fix real defects or missed capture timing, and rerun. Watch
  playback for pacing; sheets alone cannot verify smoothness.
- If a script prints `NOT VERIFIED, browser unavailable` (exit code 3), or there is no browser
  at all, report exactly that: "not verified, browser unavailable". Never report a pass you did
  not see.

## 7. Review loop and removal

The builder is the worst judge of its own page. Before calling a page done:

1. **Refute.** Hand a fresh, read-only reviewer (another agent or model that did not build the
   page) the 390 px, 1440 px and reduced-motion screenshots, the motion contact sheets, the page
   source and sections 3–5 of this file. Ask what a visitor understands first, what evidence
   supports the offer, and which one addition, removal or adjustment would most improve the
   page ("none" is an allowed answer). Then: list every rule this page breaks, with the element
   and the fix. Tell it to report a doubtful finding rather than drop it.
2. **Rule.** For each finding, write accept, part-accept or reject, with one line of reason.
   Reviewers are wrong sometimes; a rejection needs a reason, not a preference.
3. **Fix**, then rerun the gates. At most two fix rounds per finding. A taste finding still
   open after two rounds goes on a parked list for the person who owns the site, with what was
   tried. A hard-gate failure is never parked: simplify, replace the effect, or escalate.
4. **Post-verify** visual fixes on fresh 390 px, 1440 px and reduced-motion screenshots, and
   behavioural fixes (keyboard, motion, JavaScript off) through the interaction, the playback or
   the scripted check. The code diff alone proves nothing.

An effect that fails a hard gate, or that an accepted finding names, is corrected as the
finding says; remove it or replace it with a cheaper one when correction cannot meet the gates.
Write the reason into the site's direction file so the next build on this site does not repeat
it.

## 8. Sources

Write original component code and copy. Do not copy text or code from component libraries, and
do not use paid libraries.
