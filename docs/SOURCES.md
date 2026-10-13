# Sources and licences

All text and code in this repo were written from scratch. Nothing below was copied; this lists what was read and under which licence.

Rule followed: learn the timings and the structure, write the code yourself. Do not copy a source's sentences or source code into a site. Free tiers only; paid libraries and paid prompt packs were not used.

Licences last checked 2026-10-02. A line marked "unconfirmed" means the licence was not read from that source's own primary page (terms page unreadable, or only a secondary page was checked); treat it as not cleared until it is re-checked.

| Source | What it is | Licence | Fits a static site | May reuse | May not reuse |
|---|---|---|---|---|---|
| Uiverse (`uiverse-io/galaxy` repo) | Thousands of small HTML+CSS UI elements (buttons, cards, loaders, inputs); no JavaScript in a sampled set; repo frozen since 2024-09-02 | MIT on the repo (LICENSE file, GitHub API). Live-site terms unconfirmed (site returned 403) | Yes, after cleanup: sampled files lacked reduced-motion rules and often used `transition: all`; rewrite the transition and add a reduced-motion rule | The element's structure and timing, rewritten; the "From Uiverse.io by \<user\>" credit line kept in the file; the MIT notice kept in a third-party notices file | Elements added to the live site after 2024-09-02 (unconfirmed); any per-file licence beyond MIT (unconfirmed) |
| React Bits | Free copy-paste animated React components; no page-level blocks in the free tier | MIT + Commons Clause (author's own wording): commercial and client use is fine; redistributing the components themselves, alone or bundled or ported, is not | Partly: a minority of components need no dependency beyond React; the rest need a canvas or 3D dependency | The documented timing and easing values, in your own words; the general technique, written from scratch from own-words notes, with no component source copied or ported | The component source files themselves, copied or ported into any language, stored or shared as a library or kit |
| Anime.js | Dependency-free JS animation engine, v4; modular, tree-shakeable | MIT (LICENSE.md, package.json) | Yes for the library code, but the full bundle is large; use only if no other engine is loaded, and only the modules actually used | The npm package and its code, with the MIT notice; the public API and migration notes, in your own words | Anything from the marketing site itself (home page script, fonts, logo animation): it has no stated licence |
| Aceternity UI (free tier only) | Free copy-paste React/Tailwind components; the larger block and template library is paid | Proprietary licence page: unlimited client end-products allowed, including sold or distributed ones. A separate terms page says not to reproduce or copy site material; unconfirmed how the two pages reconcile | No: built for React + an animation library, not a static site | Ideas and measurements taken from the rendered free demos, described in your own words | Any component source code; nothing from the paid blocks or templates |
| GSAP | Animation engine | No-charge licence: free for commercial and client work, all plugins included, per https://gsap.com/licensing/. The only restriction is building a visual animation-builder tool on top of it | Yes | The library as used; its documented API and timing functions | n/a |
| Motion (motion.dev, formerly Framer Motion) | Animation library for vanilla JS, React, and Vue; a separate product ("Motion+") sells extra examples and audits | Core library: MIT. Motion+ examples and audits: paid, not used | Partly: the full bundle is large; only the smallest entry points (for example a mini animate function) fit a tight JS budget | The MIT-licensed core library code if it is the chosen engine; its documented API, in your own words | Motion+ content (paid, not studied) |

## Public references behind the usability, motion and type rules

The browser-support table in `platform-first.md` comes from web-features and browser-compat-data,
and the contrast, target-size, pause and flash rules come from WCAG 2.2. The other numbers in
`SKILL.md` (8 px reveals, 30–80 ms stagger steps, 100–200 ms hover, 13.5 px on dark, and the
budgets) are working defaults drawn from general practice and the references below, not
figures from one cited study; a site's own brief may override them:

- Nielsen Norman Group usability research: https://www.nngroup.com/articles/
- MDN Web Docs: https://developer.mozilla.org/
- web-features: https://github.com/web-platform-dx/web-features
- MDN browser-compat-data (BCD): https://github.com/mdn/browser-compat-data
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
