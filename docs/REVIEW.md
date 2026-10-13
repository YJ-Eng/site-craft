# site-craft review — v0.3.0 → v0.4.0

Purpose: read every file of the skill for two things, private or identifying content (lens A)
and slop (lens B), clean both, then fold in new generic rules. This file is the record: what
was found, what was cut and why, what was added.

## 1. Inventory and copy diff

Two copies existed: the repo (v0.3.0) and an older installed copy (v0.2.x). Same 36 files;
21 differed, and the repo was newer for every one of them (build rules inline, decide-and-log
when nobody can answer, browser preflight, scrub pass, author-voice wording removed, invented
example names). The repo is the base for this review; the installed copy is replaced at the
end. The older copy still carried author-voice wording ("owner", "house default") that v0.3.0
had removed.

### Files (36 skill files + 4 repo files)

| File | Bytes | Purpose |
|---|---:|---|
| SKILL.md | 10,265 | the skill: precedence, brief, direction, build rules, gates, verify, removal |
| references/platform-first.md | 9,180 | native CSS / WAAPI path per motion job, support table |
| references/engine-choice.md | 10,233 | when CSS/WAAPI cannot do it: GSAP vs Anime.js vs Motion |
| references/anti-default.md | 7,729 | model defaults and what to do instead |
| references/craft-rules.md | 9,810 | checkable numbers for usability, motion, type, colour |
| references/build-spec.md | 4,710 | pre-build spec template |
| references/signature-moment.md | 7,487 | method for one subject-derived moment |
| references/recipes-pointer-surface.md | 21,941 | pointer/surface patterns (CTA, card, form…) |
| references/recipes-text-scroll.md | 18,667 | text and scroll patterns |
| references/sources.md | 5,023 | what was studied, licences, what may be reused |
| demos/ps-*.html (9) | 3.5–5.2 K each | one pointer/surface recipe each |
| demos/ts-*.html (9) | 3.1–4.7 K each | one text/scroll recipe each |
| scripts/README.md | 20,757 | how to run the checks |
| scripts/budget-check.sh + budget-engine.js + format-budget-result.js | 3.9 + 15.3 + 8.3 K | weight / JS-off / perf budget check |
| scripts/motion-capture.sh + capture-engine.js | 3.3 + 25.0 K | frame capture + motion-visibility verdict |
| scripts/lib.sh | 6.2 K | shared node/Playwright/Chromium resolution + preflight |
| README.md, CHANGELOG.md, LICENSE, .gitignore | | repo plumbing |

### Mechanical checks before the read

- A broad grep for company, person, client, place, currency, server, path and ledger-id terms
  turned up 0 private hits. Matches were model names in the published test (fine), "ledger"
  used as a bookkeeping noun in an invented example, and a few code-comment "we"s.
- A name-denylist check over the text files: PASS (3 shell scripts are not
  text-checkable by that tool, so they were read by eye instead).
- **For the author to decide:** LICENSE names the copyright holder as `YJ-Eng`. MIT needs a holder, and
  the public repo owner is already that handle. Recommendation: keep it. It is the author's
  chosen public name, not leaked private data.

A grep is not a read, so section 2 is a full read of every file.

## 2. Two-lens read: findings

Four read-only review passes took one file set each and read every line: core files, the large
references, the 18 demos and the 7 scripts. The demos reader also ran each demo headless with
reduced motion, with JavaScript off, scrolled and hovered. Every finding was then ruled on.
About 200 rows came back. The table keeps every privacy row (lens A) and every slop row (lens B)
that changed a decision. The many small low-severity rows inside files that were then deleted
whole are not repeated.

**Lens A, privacy and identity: one over-specific example, a handful of author-voice traces, no names.**

| File | Line | Quote (≤ 20 words) | Ruling and fix |
|---|---|---|---|
| references/recipes-text-scroll.md | 200 | (an example app type) | **Over-specific example.** File deleted. |
| references/recipes-text-scroll.md | 3-6 | "built from the project's private research records … the code is ours" | Private-records disclosure. File deleted. |
| references/sources.md | 21-25 | "recorded in the project's private research notes" | Replaced by a public reference list in docs/SOURCES.md. |
| README.md | 35-36 | "built from private research records that are not part of this repo" | Cut, along with the internal pipeline description. |
| README.md, scripts/README.md | several | "one real production page (name withheld) … 2026-10-02 … before the v0.3.0 scrub" | Insider test history. Cut. |
| references/recipes-pointer-surface.md | 56, 131 | "the study record's 8px", "which the record itself flags" | Dangling private references. File deleted. |
| references/engine-choice.md | 42, 110, 164 | "per the study's calibration check" | Rewritten as a neutral measurement note. |
| references/anti-default.md | 7, 104 | "judges named on a real build", "even with our own recipe" | Author voice. File folded and deleted. |
| scripts/budget-engine.js | 91-98 | "every demo in this repo" | Comment rewritten. |
| SKILL.md | 76 | "Roof repair illustration" | A fixture from the first test brief. Now "Hero illustration". |
| SKILL.md | 3 | "client proposal page" | Reads as agency work. Now "product or service page". |
| SKILL.md | 164 | "or that a judge names as a problem" | Internal process wording. Rewritten as the general review loop in section 7. |
| LICENSE | 3 | "Copyright (c) 2026 YJ-Eng" | **The author decides**. Recommendation: keep it (see section 1). |
| demos (12 names) | | Tarnwick, Quellmont, Pellam & Wick, Cedarplan… | Invented, but plausibly real. Moot, because the demos are deleted. |



**Lens B, slop: the decisive rows.**

| File | Line | Quote (≤ 20 words) | Ruling and fix |
|---|---|---|---|
| SKILL.md | 62-63 | "The other files under references/ are background from earlier versions; do not load them" | **7 of 9 references were shipped dead weight.** Fold or delete (section 3). |
| SKILL.md | §4 vs §5 | contrast, JS-off, reduced motion and primary action stated twice | Each stated once now: §5 is the gate table, §4 says how to build. |
| SKILL.md | 113 | "The 8 px entrance convention" | Never defined in a loaded file. Now defined in §4. |
| SKILL.md | 107-111 | "by 422 px … 80 px above … ~3,300 … 40 px" | Unsourced, and the script floor uses different numbers. Cut; the script's verdict is the check. |
| SKILL.md | 137-139 | "Lighthouse ≥ 90, LCP, INP, CLS" | No check was named. The §5 table now gives one for every gate. |
| demos/ps-cta-hover, ps-form-focus, ps-press-feedback | 27-64 | `font:600 16px/1 inherit;` | **Invalid shorthand; the browser drops it** (inputs render at 13.33 px Arial). Verified headless. |
| demos/ps-cta-hover + recipe | 67-75 | `transform:scaleX(1); transform-origin:right` | The underline "sweep" never animates. Verified. |
| demos/ps-logo-marquee + recipe | 25-41 | `gap:48px` … `translateX(-50%)` | The loop jumps 24 px every cycle. Verified. |
| demos/ps-feature-grid | 79-83 | un-classed `.tile` | Two tiles render 1/6 wide and leave holes in the bento. Verified. |
| demos/ts-reveal-preset + recipe | 44-59 | `html.js .reveal{opacity:0}` outside the motion query | **Content stays hidden under reduced motion**, against the skill's own hard gate. Verified. |
| demos/ps-photo-card, ps-feature-grid | 36-47 | hover `translateY` outside the motion query | Moves under reduced motion. Verified. |
| demos/ts-statement-scroll | 55-63 | the same range on every `.word` | No per-word progression, and body text is dimmed to 35% opacity. |
| demos/ts-pinned-sequence | 48-76 | white caption on a pale scrim; animates `inset` | About 2.5:1 contrast in light theme; animates layout properties; the range depends on page length. |
| references/recipes-text-scroll.md | 321-353 | "eyebrow, headline, sub copy, call to action" | Prescribes the exact stack SKILL.md warns against, and hides the primary action for about 0.9 s. |
| references/craft-rules.md | 20-22, 46 | "Nothing in the first viewport changes on its own." "never pinned on mobile" | Contradicts SKILL.md levels 2–3 and two recipes. |
| references/craft-rules.md | 12, 25, 30, 100, 136 | "57% above the fold", "78% … against 42%", "best-known public jury" | Unsourced statistics. Dropped. |
| references/platform-first.md | 85-93 | count-up `content: counter(n)` | **JavaScript off shows 0.** Fixed. |
| references/platform-first.md | 95-100 | `var(--i,0)` declared after `sibling-index()` | The fallback always wins. Fixed. |
| references/platform-first.md | 102-112 | `startViewTransition(() => location.href = url)` | Wrong API for cross-page transitions. Replaced with `@view-transition`. |
| references/platform-first.md | 121-128 | "keep the hex line first" before a `var()` relative colour | The fallback cannot work, because `var()` defers validity. Now uses `@supports`. |
| references/engine-choice.md | 26-30, 155-166 | "version not resolved", "were not measured" | Research residue. Cut; sizes stated as dated ranges. |
| references/build-spec.md | whole | not loaded; "24px rise" vs "translateY(8px)"; "CLS target (0)" vs 0.1 | Contradicts itself and SKILL.md. Deleted. |
| scripts/README.md | 93-96 | "prints SHEET_BYTES_LIMIT_EXCEEDED to stdout" | It went to engine.log. The code now surfaces it. |
| scripts/README.md | 31 | "newest node_modules/playwright" | The code took the lexicographically last path. The code now takes the newest. |
| scripts/budget-engine.js | 100 | `script:not([src])` | Counted JSON-LD and import maps as JS weight. Now JS types only. |
| README.md | 88-147 | 60-line first-test report | Moved to docs/TESTS.md; README keeps a short honest summary. |

## 3. What was deleted, and why

| Deleted | Why |
|---|---|
| references/recipes-pointer-surface.md (21.9 KB) | Not loaded by SKILL.md. 10 recipes of CSS a current model writes unprompted. 6 have a verified bug or a false claim. Contains a private research log ("Records skipped"). |
| references/recipes-text-scroll.md (18.7 KB) | Not loaded. Held the one over-specific example. 4 of 9 recipes contradict SKILL.md: they hide or dim body text, delay the primary action, pin on mobile, or prescribe the template stack. |
| demos/ (18 files, 77 KB) | Only the two deleted recipe files used them. 6 broken, 3 partly broken; an agent copying a demo would ship the bug. Fixing 9 demos for a library nobody loads is cost with no reader. |
| references/craft-rules.md | Not loaded. The checkable timing, easing, gating and WCAG 2.2.2/2.3.1 rules are folded into SKILL.md §4. The rest was duplicates, contradictions, or unsourced statistics. |
| references/anti-default.md | Not loaded, about 80% a duplicate of SKILL.md §4. The 3 unique lines (accountable person, one-curve fades, secondary text on dark) are folded in. |
| references/signature-moment.md | Not loaded, and it duplicated SKILL.md §3. Its removal test, explain test, 3–4 candidates and mechanism ladder are folded into §3. |
| references/build-spec.md | Not loaded. It contradicted itself and SKILL.md (24 px vs 8 px, CLS 0 vs 0.1), and claimed checks no script made. |
| references/sources.md | A licence ledger, not build guidance. Moved out of the skill to docs/SOURCES.md, without the unsourced counts and the row for a product that was never studied. |

The skill folder goes from 36 files (about 290 KB) to SKILL.md, 2 references and 11 scripts.
The first blind test found that more guidance made pages worse. A smaller skill that agents
actually load is the point.

## 4. What was added

Listed in `CHANGELOG.md` under v0.4.0: the visual-idea and brochure-trap rules, the
dark-surface floor, the gate table with a check per gate, the review loop, and three scripts
(page-gates, css-balance, gzserve). An independent design reviewer read the SKILL.md diff
twice. Its round-one changes softened "one object per page" into "one dominant visual idea",
so the rule does not force a drawn gadget onto every page; round two let type-led openings
skip the illustration steps and made "correct before removing" the rule. A fresh read-only
refuter then read the whole cleaned tree. Its 30 findings were fixed before release.

## 5. Open for the next version

- The guided test page lost "would a visitor act" to the unguided one: a real form with
  choices beat a mailto link. SKILL.md says nothing about how good the action's own
  mechanism should be.
- The guided builder broke the skill's own "about 1,000 ms" moment limit (it ran about
  1.2 s), and no script checks moment duration.
- Linux-only browser lookup in `scripts/lib.sh`.
- The LICENSE holder name (section 1).
