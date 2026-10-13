# Blind tests

Each test builds the same made-up briefs with and without the skill and has blind judges score
the pages. Results are written here whether the skill wins or loses.

## Test 2 — v0.4.0 (14 Oct 2026): passed its rule, on one brief

**Setup, written down before any score.** One made-up brief: a two-person furniture
restoration workshop, phone-first, one action, no assets supplied, motion level left to the
builder. Two builds by Claude Opus 5.5: one with no guidance, one following v0.4's SKILL.md
and running its scripts. Which folder got the skill was drawn at random. Three blind Opus 5.5
judges each saw the two pages as P and Q (order re-drawn per judge): first-screen, full-page
and reduced-motion screenshots at 390 and 1440 px, plus the source. Six criteria scored 1–10:
first-screen clarity, a subject-specific visual idea, phone composition, legibility and
accessibility, motion, would a visitor act. Pass rule: the skill page's mean composite is
higher AND at least 2 of 3 judges prefer it.

| Judge | With site-craft | No guidance | Prefers |
|---|---:|---:|---|
| 1 | 8.00 | 6.33 | site-craft |
| 2 | 8.00 | 6.17 | site-craft |
| 3 | 7.83 | 6.00 | site-craft |
| Mean | **7.94** | **6.17** | 3 of 3 |

**What the judges named.** The page with no guidance landed on the look the skill lists as a
model default (cream background, serif headline with an italic accent word, eyebrow labels,
a three-card icon grid). Its drawn chair was cut off on the first phone screen, a decorative
dashed loop ran forever with no pause, hover effects were not limited to pointer devices, and
some labels were around 10–11 px. The skill page put an annotated drawing of the two real
proof points on the first phone screen, ran one load sequence that only plays when motion is
allowed, and passed every scripted gate (Lighthouse mobile 100/100, LCP 0.7 s, CLS 0).
The page with no guidance **won "would a visitor act" with all three judges**: it had a real
quote form with piece choices, a café chair count and a sticky phone button. The skill page
offered only a mailto link. Its load sequence also ran about 1.2 s, over the skill's own
"about 1,000 ms".

**Why this is weak evidence, not proof.**
- n = 1 brief, one builder model, judges from the same model family as the builders.
- Judges were given the skill's own rules (sections 3–5). The rules name the look the
  unguided page chose, so this biases the scoring toward the guided page.
- The guided build had a longer time box (35 vs 25 minutes) and ran a self-review loop; part
  of the gap may be extra effort, not guidance.
- The guided builder read the SKILL.md text from before the last two small wording edits of
  v0.4 (the type-led opening note and "correct before removing").

Next test, if run: several briefs, motion and stack left open, equal time boxes, judges
without the rules, and one judge from a different model family.

## Test 1 — v0.2.2 (3 Oct 2026): no evidence of benefit

Under the rule written before any score existed, site-craft did **not** beat building with no
guidance.

**How the test ran.** Three made-up briefs: a mobile piano tuner, a houseplant soil-moisture
probe, and a roof-and-gutter repair firm. Each was phone-first, with one action, a static page,
motion level 2 and default budgets. There were 15 builds, each blind to the others:

- Claude Opus 5.5 with no guidance, with Anthropic's frontend-design skill, and with site-craft.
- GPT-6 Astra (Codex CLI) with no guidance and with site-craft.

Every page was run through this repo's two scripts and screenshotted at 390 and 1440 px. Two
blind judges, a fresh Opus 5.5 and GPT-6 Astra, scored shuffled, unlabelled pages from 1 to 10
on five measures: first-screen clarity, fit to the subject, mobile composition, motion, and
"reads as generated" (lower is better). The composite score is the mean of five values: the first
four measures and (11 − generated). The pass rule: site-craft's mean beats no guidance's mean for both judges.

| Builder and guidance (3 pages each) | Opus judge | Astra judge |
|---|---|---|
| Opus 5.5, no guidance | 8.40 | 8.87 |
| Opus 5.5 + frontend-design | 7.47 | 7.40 |
| Opus 5.5 + site-craft | 7.60 | 7.87 |
| GPT-6 Astra, no guidance | 5.53 | 7.00 |
| GPT-6 Astra + site-craft | 5.47 | 6.80 |

site-craft against no guidance (6 pages against 6):

| Comparison | Opus judge | Astra judge |
|---|---|---|
| site-craft vs no guidance, both builders | **−0.43** | **−0.60** |
| Opus builder only | −0.80 | −1.00 |
| Astra builder only | −0.07 | −0.20 |
| Opus builder: site-craft vs frontend-design | +0.13 | +0.47 |

Read the result as "no evidence of benefit", not as "worse":

- Page by page, site-craft won, tied and lost 1/2/3 times with the Opus judge and 3/0/3 with
  the Astra judge.
- The largest single loss is the page whose scroll-linked animation the capture cannot show
  (see the gaps below).
- With that page's motion score corrected, both gaps stay negative: −0.32 and −0.45.

Every page from every arm passed the JS budget, made no external requests and had no console
errors (the last two were checked with a one-off browser script during the test). One no-site-craft page failed the JS-off text check. The scripted gates are a floor,
not a measure of taste.

**Gaps this test found, and what v0.3.0 does about each:**

- `motion-capture.sh` scrolled one full viewport per step, so a scroll-linked animation that
  plays over a few hundred pixels showed only its end states. Addressed: the scrub pass.
- The skill let builders ship a motion moment that was too small to matter (a small dot, a
  7° tick) or that sat below the fold on a phone. Addressed twice: a rule in SKILL.md and the
  motion-visibility verdict.
- Inside the Codex sandbox, Chromium could not start, so the Astra builder with site-craft could
  not run the verify step. That is a sandbox limit, not a skill fix; the scripts now say
  `NOT VERIFIED` plainly.
- Judges saw the first screen plus contact-sheet thumbnails, not full pages. Test 2 gave them
  full-page screenshots.
- The briefs already fixed the motion level and budgets, so only the build stage of the skill
  was tested. Test 2 left the motion level open.
