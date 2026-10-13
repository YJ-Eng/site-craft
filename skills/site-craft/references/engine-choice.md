# Engine choice

## Decision order

1. **CSS.** Transitions, `@starting-style`, `animation-timeline`, `linear()`, `@property`,
   `sibling-index()`. See `platform-first.md` — most reveal, hover, and stagger jobs live here now.
2. **Web Animations API.** `Element.animate()` for a one-off hand-tuned sequence CSS cannot
   express cleanly (a single multi-step tween, a `finished` promise to await). No dependency.
3. **Exactly one animation engine**, only if steps 1 and 2 cannot do the job. Never load two.
   This matches the rule in `SKILL.md` section 4: one engine per site, at most.

Reach for an engine when the job is genuinely one of: SVG path morphing or motion paths, canvas
or WebGL targets, draggable physics, a long hand-placed timeline with many children, layout
transitions across `display`/flex/grid changes, or (for GSAP specifically) scroll-scrubbed
sequencing tied to element position. Everything else — fades, rises, hovers, simple stagger,
one count-up, one entry animation — is a CSS or WAAPI job; reaching for an engine there just adds
weight for nothing.

## The three engines

### GSAP

Good for: timeline sequencing with many children, scroll-scrubbed animation via ScrollTrigger,
text splitting via SplitText, SVG path drawing via DrawSVG, draggable interactions.

Weight: about 28 / 46 / 49 KB gzip (GSAP 3.x core / core + ScrollTrigger / all three with
SplitText), measured with esbuild + gzip -9 on full, non-tree-shaken files, 2026-10-02.

Licence: https://gsap.com/licensing/ (checked 2026-10-02). Free standard licence, including client
and commercial work, all plugins included. The one restriction is building a visual
animation-builder tool on top of it. Not MIT.

### Anime.js v4

Good for: SVG morphing and motion paths, canvas or WebGL targets, draggable physics, scrambled
text, a long hand-placed timeline, layout transitions across `display`/flex/grid. Dependency-free,
tree-shakeable: import only the modules a job needs.

Weight (Anime.js v4.x, measured 2026-10-02 with esbuild + gzip -9 except where marked estimated):

| Job | Gzip |
|---|---|
| `waapi.animate` only (WAAPI-only entry) | 4.6 KB |
| Typical `animate` + stagger + timeline/scope job | about 14-20 KB (estimated range, not one measured build) |
| Whole library | 42.5 KB gz / 37.5 KB br |

Licence: MIT.

**v3 → v4 renames (from the v4 migration notes as of 2026-10-02; check the current docs before relying on them). An agent writing from memory
will produce v3 code; do not emit the left-hand forms:**

- `import anime from 'animejs'` → `import { animate } from 'animejs'`; `anime({ targets, ... })` →
  `animate(target, { ... })` (target is now the first argument)
- `anime.timeline()` → `createTimeline()`
- `easing` → `ease`; `'easeOutQuad'` → `'outQuad'` (the `ease` prefix is dropped)
- every callback gets an `on` prefix: `update` → `onUpdate`, `begin` → `onBegin`,
  `complete` → `onComplete`
- `loop: n` now counts repeats, not total runs: v3 `loop: 1` (one run) is v4's default (no loop);
  v4 `loop: 1` runs the animation twice

Library defaults an agent should not assume are zero: duration 1000 ms, ease `'out(2)'`
(equivalent to `outQuad`), `autoplay: true`, `composition: 'replace'`. A timeline child with no
explicit position goes at the end of the timeline.

Wrong choice when: the page is static with a tight JS budget (a CSS/WAAPI reveal or hover costs
under 1 KB against about 14-20 KB here); another engine is already loaded (a second engine doubles the
cost); the first screen must work with JS off or on a weak phone and the LCP element is the thing
being animated (Anime.js sets its hidden states in JS, so JS-off shows nothing unless the HTML
already renders the final content); you cannot hand-test reduced motion on every effect (as of
v4.x, 2026-10-02, the string `reduce`/`prefers` appears nowhere in the library's own modules: no
built-in reduced-motion awareness, so every effect needs its own guard); the compositor guarantee
matters (`animate()` runs on the main thread; only `waapi.animate()` can run off-thread, and in
Safari only with a `cubic-bezier` or default CSS ease, as of 2026-10-02); the project is a React or
Vue component app (use that stack's own motion tooling instead).

### Motion (motion.dev, formerly Framer Motion)

Good for: one-shot entrances and press/hover feedback through `animate mini` + `inView` (small
footprint, but only with a bundler — see weight note below); a hybrid `animate` for separate
x/y/scale/rotate timing, CSS-variable animation, sequences and timelines, SVG path drawing,
colour/gradient/mask animation, animating Three.js objects, and scroll-linked animation through
its `scroll()` helper. Vendor-stated: `animate` mini ≈ 2.3 KB, `inView` ≈ 0.5 KB, hybrid
`animate` ≈ 18 KB, `scroll()` ≈ 5.1 KB — all vendor figures, and all only apply with a bundler
doing tree-shaking.

Weight without a bundler (measured 2026-10-02, script-tag / CDN use, gzip): whole library 47.6 KB gz (Bundlephobia
agrees: 47.6 KB); the ESM import chain measured 51–52.5 KB gz; the "mini" build through a CDN
measured 48–49.3 KB gz. The vendor's small mini figures (2.3–2.8 KB) do not apply to a plain
`<script>` tag site — only to a bundled, tree-shaken build. On a static site with no build step,
budget for the full ~48–52 KB gz, not the mini number.

Licence: MIT for the core library. Motion+ is a separate paid product, not covered.

Per Motion's own guidance: CSS or plain JS wins over Motion for simple class-driven fades,
entrances without interruption, spinners and loops, and short fixed stagger lists — reach for
Motion only when the job needs interruptible gesture-driven animation, cross-browser CSS-variable
tweening, or one of the heavier jobs listed above.

## Motion level → engine order

- **0 — none.** Nothing from this file applies. No engine, no WAAPI call.
- **1 — reveals and hover.** CSS: transitions, `@starting-style`, plus at most a few lines of
  `IntersectionObserver` JS as the fallback where native scroll support is missing. No engine,
  usually no WAAPI either.
- **2 — one composed scroll or load moment.** Try CSS scroll-driven animation (gated per
  `platform-first.md`) or one `Element.animate()` call first. Reach for an engine only if that one
  moment needs timeline sequencing, SVG work, or draggable physics that CSS and WAAPI cannot
  express — and then only the one engine that job actually needs.
- **3 — showpiece.** An engine is likely justified if the JS budget allows it. Pick by job, not by
  habit: GSAP if the site already carries it or the showpiece is scroll-scrubbed sequencing;
  Anime.js if the showpiece is SVG/canvas/draggable/layout-transition work and a build step can
  tree-shake it; Motion if the site is already a React/Vue app or the showpiece needs
  interruptible gesture animation. Still exactly one engine, and the hard gates in `SKILL.md`
  section 5 still apply at level 3.
