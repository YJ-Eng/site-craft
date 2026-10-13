# Platform first

Open this for a specific motion or layout job, or a browser-support question, before reaching for
a library. Most motion and layout jobs that a JS library used to do now have a native CSS or Web
Animations API path. Native first means less JS, content that survives JS-off, and one less
dependency to license and maintain.

Support data below was compiled 2026-10-02 from the web-features 3.40.1 and MDN browser-compat-data
8.1.4 snapshots (both dated 2026-10-01). Browser ship speed moves fast. Re-check this table when it
is older than about three months, and before a site ships, against current web-features / BCD
data, not from memory.

## Feature support table

Table as checked on 2026-10-02. Firefox 147 / 151 / 154 entries come from that snapshot and have
not been re-verified since.

Chrome and Safari columns give Edge/Chromium and WebKit's own first-shipped version as stated by
the source data. "Core" means the base form of the feature; sub-parts that shipped later are
noted in parentheses.

| Feature | Replaces | Chrome | Safari | Firefox | Status | Fallback / `@supports` test |
|---|---|---|---|---|---|---|
| Scroll-driven animations (`animation-timeline: scroll()/view()`, `animation-range`) | Scroll-scrub tweens, parallax libraries, reveal-on-scroll scripts | 115 | 26 | Not shipped (Nightly-only preview) | Limited availability | `@supports (animation-timeline: view())` + `prefers-reduced-motion: no-preference`; base rule is the finished state |
| View transitions, same-document | Page/panel cross-fade and morph scripts | 111 | 18 | 144 | Newly available | Feature-detect `document.startViewTransition`; call it only if present |
| View transitions, cross-document | Custom page-to-page transition scripts | 126 | 18.2 | Not shipped | Limited availability | Ship `@view-transition { navigation: auto; }` inside `prefers-reduced-motion: no-preference`; unsupported browsers just do a normal navigation |
| `@starting-style` | Opacity/transform "mount" animation scripts | 117 | 17.5 | 129 | Newly available | None needed; unsupported browsers render the resting state directly |
| `transition-behavior: allow-discrete` | Exit-animation scripts for `display`/`dialog`/popover close | 117 (116 in keyframes) | 17.4 (display/content-visibility 18) | 129 (display/content-visibility not supported) | Newly available | Accept an instant close where unsupported; never block content on it |
| `linear()` easing | Spring/bounce easing plugins | 113 | 17.2 | 112 | Widely available | Declare the `cubic-bezier()` transition first and put the `linear()` value inside `@supports (transition-timing-function: linear(0, 1))`; do not rely on line order when the value comes from `var()` (see sketch 3) |
| `@property` typed custom properties | Count-up and gradient-angle tween scripts | 85 | 16.4 | 128 | Newly available | Real text in the HTML; show the counter overlay only when a small script confirms `@property` support (`window.CSSPropertyRule`) and adds `.can-count` (see sketch 4). There is no reliable CSS-only guard for it |
| `interpolate-size` / `calc-size()` | Height-to-auto animation scripts | 129 | Not shipped | Not shipped | Limited availability | Keep a `grid-template-rows: 0fr → 1fr` rule as the base; layer this on top with `@supports` |
| CSS anchor positioning | Tooltip/menu-positioning scripts | 125 (core) | 26 (core; full behavior 27) | 147 (core; full behavior 151) | Limited availability | `@supports (anchor-name: --a)`; keep a normal-flow fallback position |
| Popover API + `dialog` | Modal/dropdown libraries, focus-trap scripts | 114 (popover) / 37 (dialog) | 17 (popover) / 15.4 (dialog) | 125 (popover) / 98 (dialog) | Newly available (popover) | Widely safe to use directly; gate only the exit animation (see `allow-discrete`) |
| Scroll-state container queries | Sticky-header scroll-state scripts | 133 | Not shipped | Not shipped | Limited availability | IntersectionObserver sentinel for the stuck/snapped state elsewhere |
| Container style queries | Theme-by-ancestor-state scripts | 111 | 18 | 151 | Newly available | None needed for the custom-property form |
| `sibling-index()` / `sibling-count()` | JS-written per-child `--i` stagger | 138 | 26.2 | 154 | Newly available | Inline `style="--i: N"` per child as the base; put the `sibling-index()` rule inside `@supports (animation-delay: calc(sibling-index() * 1ms))` |
| `text-wrap: balance` | Manual line-break/`<br>` headline scripts | 114 | 17.5 | 121 | Newly available | None needed; ignored harmlessly where unsupported |
| `text-wrap: pretty` | Widow/orphan-prevention scripts | 117 | 26 | Not supported | Limited availability | None needed; line breaks just differ by engine |
| Relative colour syntax (`oklch(from ...)`, `color(from ...)`) | Hover/variant-shade JS or duplicate hex tokens | 119 | 18 (16.4 partial) | 128 | Newly available | Wrap the `from` declaration in `@supports (color: oklch(from red l c h))`; keep a plain token line outside it (a declaration containing `var()` is not dropped at parse time, so a "hex line first" fallback does not work) |
| `oklch`/`oklab`/`color-mix()` | Colour-mixing and tint/shade JS | 111 | 15.4 (`color-mix` 16.2) | 113 | Widely available | None needed |
| Variable-font axis animation | Weight/width-swap JS, multiple static font files | 62 | 11 | 62 (61 numeric weight) | Widely available | None needed |
| Scroll snap events + `scrollend` | Carousel pager-sync scripts | 129 (snap events) / 114 (`scrollend`) | Snap events not supported / `scrollend` 26.2 | Snap events not supported / `scrollend` 109 | Limited (snap events) / newly available (`scrollend`) | IntersectionObserver + `scrollend` where snap events are missing |
| `content-visibility: auto` | Manual viewport-based render-skipping | 85 | 18 (`auto` value 26) | 125 | Newly available | None needed; set a `contain-intrinsic-size` estimate to avoid a scrollbar jump |
| Web Animations API (`Element.animate`) | Most tween libraries for one-off animations | 36 (full group 75) | 13.1 (full group 14) | 48 (full group 75) | Widely available | None needed |
| `IntersectionObserver` | Scroll-library internals; the universal fallback itself | 51 (58 full) | 12.1 | 55 | Widely available | This *is* the fallback for everything above |
| `prefers-reduced-motion`, `@media (scripting)`, `@supports` | Hand-rolled motion/no-JS detection | 74 / 120 / 28 | 10.1 / 17 / 9 | 63 / 113 / 22 | Widely available | None needed; these are the gates everything else sits inside |
| CSS carousel pieces (`::scroll-marker`, `::scroll-button()`) | Carousel-dot and prev/next-button JS | 135 | Not supported | Not supported | Limited availability | Keep a plain button-and-dot markup fallback; this is a progressive enhancement only |

## Reading the table above as a filter

The Status and Fallback columns already say which features need no extra work: "Widely
available" or "Newly available" with a blank or "None needed" fallback can be used directly.
"Limited availability" always means apply the Fallback column's guidance, every time, not just
for a browser you happen to be testing in.

## Own-code sketches

Eight patterns that replace the most JavaScript. Each one assumes the base, no-JS, no-motion
state is the real content: the enhancement only adds movement on top, and all movement sits
inside `@media (prefers-reduced-motion: no-preference)`.

**1. Scroll-driven reveal, with fallback**
```css
.card { opacity: 1; transform: none; } /* base: always visible */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .card { animation: reveal ease-out both; animation-timeline: view(); animation-range: entry 0% entry 100%; }
    @keyframes reveal { from { opacity: 0; transform: translateY(8px); } }
  }
}
```
The timeline ties progress to scroll position; `ease-out` still shapes how the 8 px rise
settles within the entry range, which keeps the reveal consistent with the rule that entrances
ease out.

**2. Entry animation with `@starting-style`**
```css
dialog[open] { opacity: 1; transform: translateY(0); }
@media (prefers-reduced-motion: no-preference) {
  dialog[open] { transition: opacity .2s, transform .2s; }
  @starting-style {
    dialog[open] { opacity: 0; transform: translateY(8px); }
  }
}
```

**3. Settling curve with `linear()` for a hover**
```css
:root { --ease-settle: linear(0, 0.36 12%, 0.68 28%, 0.88 48%, 0.97 72%, 1); } /* never passes 1 */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .pop { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1); } /* fallback: plain ease-out */
  .pop:hover { transform: scale(1.04); }
  @supports (transition-timing-function: linear(0, 1)) {
    .pop { transition-timing-function: var(--ease-settle); }
  }
}
```
The `cubic-bezier()` line is the fallback and sits outside the `linear()` test: a declaration
containing `var()` is not dropped at parse time, so putting `var(--ease-settle)` on a later line
would not protect an engine without `linear()`. Only the `@supports` block can.
Generate the stop list once from an easing tool, store it in one custom property, and reuse it
instead of hand-writing a new curve per element. For a hover, keep the curve at or below 1 (no
overshoot) and the duration at or under 200 ms; save overshooting springs for large, deliberate
moments.

**4. Count-up that starts and ends on the real number**
```html
<p class="stat"><span class="num">480</span> projects shipped</p>
```
```css
@property --n { syntax: '<integer>'; initial-value: 480; inherits: false; } /* default = final value */
@keyframes count-up { from { --n: 0; } }
@media (prefers-reduced-motion: no-preference) {
  .can-count .num { position: relative; color: transparent; font-variant-numeric: tabular-nums;
         counter-reset: n var(--n); animation: count-up 1.2s ease-out; }
  .can-count .num::after { content: counter(n); position: absolute; inset: 0; color: var(--ink, CanvasText); }
}
```
```js
// Browsers without @property: keep the overlay off, so the real HTML number stays visible.
if (window.CSSPropertyRule) document.documentElement.classList.add('can-count');
```
The figure is real text in the HTML, so JS-off, reduced motion, print and any browser without
`@property` all show 480 and never run the overlay. Without `@property`, `--n` is not an integer
(it is an unregistered token stream), `counter-reset` would be invalid and the counter would
show 0 over the transparent text, which is why the overlay rules wait for `.can-count`. The count
runs only under `no-preference`, animating from 0 up to the default. For a figure below the
fold, add `animation-timeline: view()` inside the same `@supports` gate as sketch 1.

**5. Stagger with `sibling-index()`, with fallback**
```css
/* base: set style="--i: 0", "--i: 1", ... per child */
.item { animation-delay: calc(var(--i, 0) * 60ms); }
@supports (animation-delay: calc(sibling-index() * 1ms)) {
  /* sibling-index() is 1-based; subtract 1 to match the 0-based --i */
  .item { animation-delay: calc((sibling-index() - 1) * 60ms); }
}
```
The fallback comes first and the `@supports` rule second, so the native version wins only where
it exists. Keep the `animation` itself inside the `no-preference` gate.

**6. View transition between pages, with a no-support path**
```css
/* in the CSS of BOTH pages (same origin) */
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
}
.hero-image { view-transition-name: hero; } /* same name, once per page, on the shared element */
```
No JavaScript is needed for multi-page navigation. Unsupported browsers do a normal navigation.
`document.startViewTransition(() => updateDom())` is for same-document DOM updates only (a tab
switch, a filter); feature-detect it before calling.

**7. `text-wrap: balance` for headlines**
```css
h1, h2, figcaption { text-wrap: balance; }
```
No script, no test. Ignored where unsupported; the headline just wraps the old way.

**8. Relative colour for a hover shade**
```css
:root { --brand: oklch(62% 0.19 255); --brand-hover: oklch(54% 0.19 255); }
.btn { background: var(--brand); }
.btn:hover { background: var(--brand-hover); }
@supports (color: oklch(from red l c h)) {
  .btn:hover { background: oklch(from var(--brand) calc(l - 0.08) c h); }
}
```
A declaration containing `var()` is not dropped at parse time, so listing a hex line first does
not protect an engine without relative colour support. The `@supports` test does: unsupporting
engines keep the plain token line and still get a sensible hover state.
