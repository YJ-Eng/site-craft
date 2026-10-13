# site-craft

A portable Agent Skill for building marketing websites and landing pages: a company site, a
product or service page, a small-business site. It is not for app dashboards or data-chart
work.

It works with any coding agent that reads the Agent Skills format. SKILL.md's process does not
depend on one vendor's tools. Only its verify step names the reference scripts' stack (node,
Playwright with Chromium, ffmpeg), and it says to use the project's own equivalent check
instead where one exists. Without that stack, the scripts report "not verified" rather than a
pass (see `scripts/README.md`).

## What it does

- **Brief:** asks only for what is missing (audience, the one action, real copy, stack, a
  motion level from 0 to 3), or decides and logs the reason when nobody can answer.
- **Direction:** one dominant, subject-specific visual idea per page, found from the subject's
  own nouns and verbs and tested for swap, removal and explanation. It names the brochure trap (a headline over a table
  of facts) and the looks current models reach for unprompted.
- **Build rules:** the first phone screen, dark-surface legibility, and motion timing and
  gating. Low motion is not an excuse for weak visuals.
- **Hard gates with a check for each:** valid HTML, balanced stylesheets, zero overflow at
  ten widths from 300 to 1920 px, one ask per page, contrast and focus, Lighthouse accessibility ≥ 95, reduced
  motion, JavaScript off, CLS 0, JS ≤ 60,000 bytes gzip, Lighthouse performance ≥ 90 and
  LCP ≤ 2.5 s measured on a gzip-serving copy.
- **Review loop:** an independent read-only reviewer, a written ruling on each finding, at most
  two fix rounds, then post-verification on fresh 390 px, 1440 px and reduced-motion
  screenshots.

## Folder layout

```
skills/site-craft/
  SKILL.md                  the process: brief, direction, build rules, gates, verify, review loop
  references/
    platform-first.md       native CSS / Web Animations API path per job, browser-support table
    engine-choice.md        when CSS and WAAPI cannot do it: which one animation engine
  scripts/                  checks; see scripts/README.md
    motion-capture.sh       contact sheets across load and scroll + a motion-visibility verdict
    budget-check.sh         JS weight, JavaScript-off completeness, reduced-motion compliance
    page-gates.sh           overflow at 10 widths, one ask per page, dark-surface legibility
    css-balance.js          refuses stylesheets whose braces do not balance
    gzserve.js              static server that gzips like production, for Lighthouse
docs/
  REVIEW.md                 the v0.4 review: what was found, cut and added, and why
  TESTS.md                  blind with/without tests and their results
  SOURCES.md                what was read while writing this, and under which licence
```

## Install it for an agent

Copy or clone the `skills/site-craft` folder into that agent's own skills directory. The exact
directory name varies by agent and by version; check that agent's documentation for where it
reads skills from.

## Make triggering more reliable

Auto-discovery can miss a skill. Add one pointer line to the project's own `AGENTS.md` or
`CLAUDE.md`:

```
For any page design or motion work, load the site-craft skill first.
```

## Does it help?

Be sceptical. The first blind test (v0.2.2) found no evidence that the design guidance beat
building with no guidance. The second (v0.4.0) passed its pre-registered rule: 7.94 against
6.17, with 3 of 3 blind judges preferring the guided page. But that was one brief, with judges
given the skill's own rules, and the unguided page still won on "would a visitor act". Details
and caveats are in `docs/TESTS.md`. The verification scripts are useful as a checking tool
either way.

## Licence

MIT (see `LICENSE`). All text and code are original. The libraries that were read while writing
it are listed in `docs/SOURCES.md` with their licence terms; none of their code or text is
included.
