# Frontend architecture (October 2026 consolidation)

## One stylesheet, one script

Every page in this repo loads:

```html
<!-- CDN (use this line when pasting into GHL): <link rel="stylesheet" href="https://dgs-assets.vercel.app/css/styles.css"> -->
<link rel="stylesheet" href="../css/styles.css">
...
<!-- CDN (use this line when pasting into GHL): <script src="https://dgs-assets.vercel.app/js/main.js"></script> -->
<script src="../js/main.js"></script>
```

Both are local paths relative to the page's folder (`css/` and `js/` at the root, `../` one level down, `../../` in `growth-hub/<pillar>/`), so pages run from this checkout with local CSS and JS. Each CDN line is kept, commented out, directly above its local line. GHL cannot resolve local paths, so when pasting a page into GHL, swap each pair (uncomment the CDN line, remove the local one). Third-party files with no local copy (Google Fonts, Lenis CSS/JS, GHL's `form_embed.js`) still load from their own CDNs, and GSAP is lazy-loaded by `main.js`.

### `css/styles.css`

| Part | Contents |
|---|---|
| A. Foundation | Former `dgs-common.css`: tokens, reset/base, typography 3.1, layout, sections, buttons and links, navbar + mobile drawer, footer, shared components, forms, reveal utilities, GHL-safe isolation layer. Kept in its proven source order because later blocks are deliberate override layers. |
| B. Design System 4.0 | Motion tokens (`--ease-out-expo`, `--ease-draw`, `--ease-soft`, `--dur-1..4`), layer tokens (`--z-*`), `.dgs-sr-only`, and the engagement-journey strip. |
| C. Page sections | One section per former page sheet (C01 to C24, listed in the file header), scoped so it only applies where that page opts in. |
| D. Guarantees | Reduced-motion and keyboard-focus rules that must win over everything above. |

**Page scoping.** Every rule in Part C carries a zero-specificity suffix on its subject:

```css
.dgs-hero-title:where(.dgs-css-index, .dgs-css-index *) { ... }
```

Pages opt in on `<body>`: `<body class="dgs-page dgs-css-solution-detail">`. Because `:where()` adds no specificity and the sections are ordered to reproduce each page's old load order, every page resolves exactly the cascade it had when the sheets were separate. The class list is mirrored on `<main data-dgs-css="...">`; `main.js` copies it back onto `<body>` if a host platform rewrites the body's classes.

To add page-only CSS, add it inside that page's Part C section with the same suffix. A new page gets a new Part C section and a new `dgs-css-<name>` body class.

### `js/main.js`

Shared behaviour (nav, drawer, header, Lenis, GSAP loader, reveal, FAQ, counters, carousels) followed by:

- **Shared helpers**: `dgsWhenReady`, `dgsLegacyScript`, `dgsModule` (isolates each module with try/catch), page-scope restore.
- **Consolidated page modules**: the former `dgs-events-gallery.js`, `dgs-growth-insights.js`, `dgs-assessment.js`, `dgs-legal.js`, `dgs-premium-viz.js`, and the former inline scripts from about, audit, contact, growth-hub (jump nav pin, coming-soon modal), growth-hub playbooks/event (anchor smooth-scroll), home (promise list), and industries (tabs, case library, card visuals). Each module only acts when its markup exists.
- **Motion helpers** (`dgsOnFirstView`, `DGS_EASE`) and the **engagement journey** (`#dgs-sol-csr`) controller.
- **Merged page scripts** (end of the file): the former `dgs-growth-article.js` (Growth Hub article template, share bar, previous/next), `dgs-careers.js` (Careers listing and detail), `launching-soon.js`, and launching-soon's two inline scripts (auto-redirect, logo sweep). That code was written for its own pages (it scrolls to the top on load and watches the whole page for GHL re-renders), so each section runs only on pages that opt in with `data-dgs-js` on `<main>`:

  | `data-dgs-js` | Pages |
  |---|---|
  | `growth-article` | `growth-hub/**` articles and playbooks, `ghl-blog.html`, `growth-hub.html` |
  | `careers` | `career-main-layout.html`, `career-blog.html` |
  | `launching-soon` | `launching-soon.html` |

The about leadership carousel and industries tabs no longer use inline `onclick` attributes: `main.js` listens for clicks on the existing `data-card`, `data-dot` and `data-industry-tab` attributes, plus `data-dgs-leader="prev|next"` on the arrows. The `switchLeader`/`switchIndustryPane` globals stay for already-published pages that still use `onclick`.

Load-once safety: a module stands down when the page still loads its old standalone file (`dgsLegacyScript`), and former inline-script modules only run on pages built for the consolidated assets. The merged page scripts share a run-once flag (`window.__dgsGrowthArticleRan`, `__dgsCareersRan`, `__dgsLaunchingSoonRan`) with their standalone copies, so whichever loads first runs and the other stands down. Already-published GHL pages that still carry the old tags or inline copies therefore never double-initialise.

### What is still outside `main.js`

| Item | Why |
|---|---|
| Third-party scripts: GHL `form_embed.js` (`api.faithph.ai`, `link.msgsndr.com`), Lenis (`unpkg`), GSAP (lazy-loaded by `main.js`) | Not DGS code; loaded from their providers. |
| `<script type="application/ld+json">` blocks | Structured data for search engines, not JavaScript. |
| Growth Hub GHL loader (`growth-hub.html`) | Kept commented out above the local `main.js` tag. GHL drops plain `<script src>` tags on that published page, so the GHL paste must use the small inline loader instead. |
| `services.html` | Redirect stub. Its inline redirect was redundant (the page already has a meta refresh, and `vercel.json` redirects `/services`), so it was removed rather than moved. The page loads no JS. |
| `css/dgs-launching-soon.css` | Standalone teaser page with its own nav/footer; it never loaded the shared foundation. |
| `scripts/*.js`, `netlify/functions/*.js` | Node build tools and a serverless function, not browser code. |

### Legacy files

`css/dgs-*.css` (other than launching-soon) and every `js/*.js` file other than `main.js` are frozen and marked as legacy in their first lines. No page in this repo loads them. They stay deployed only because pages already pasted into GHL, and the GHL-native blog and careers templates configured inside GHL, still link those URLs. `dgs-growth-article.js`, `dgs-careers.js` and `launching-soon.js` are copies of the matching `main.js` sections with the same run-once guard; edit `main.js`, not them. Delete the legacy files once every live GHL page has been re-pasted from this repo and the GHL templates load `main.js` (with the matching `data-dgs-js` attribute added to those templates).

## Solution pages: Who it is for, KPIs we track, CSR journey

**Who it is for** (`#dgs-sol-who`) and **KPIs we track** (`#dgs-sol-kpis`) use the original `.dgs-pv-panel` widgets: the people panel cycles through the roles and shows each role's in-practice card (shared block in `main.js`, "PEOPLE / IN-PRACTICE PANEL"), and the KPI scorecard counts up on first view (`premium-viz-legacy` module). Their CSS is Part C sections C17 (solution-detail) and C18 (premium-viz, formerly `css/dgs-premium-viz.css`); solution pages carry both `dgs-css-solution-detail` and `dgs-css-premium-viz`.

**Your CSR journey, engagement strip.** `main.js` (`engagement-journey`) adds `.dgs-sol-journey` to `#dgs-sol-csr`. On first view each connector draws to the next stage, which lights up together with its numbered step card; afterwards hovering a card lights its stage and the other way round. It needs no markup changes, so already-published pages get the same draw. Without JS, or under reduced motion, it is the static strip.


## Publishing to GHL

1. Push to `main`: Vercel redeploys `dgs-assets.vercel.app`, so `styles.css` and `main.js` go live for any page that links them.
2. Re-paste each page's HTML into GHL, using the commented CDN stylesheet and script lines in place of the local ones (a local `../css/...` or `../js/...` path loads nothing on GHL). On `growth-hub.html` use the commented inline loader. Until a page is re-pasted it keeps using the legacy files and its old markup.
3. After all pages are re-pasted, delete the legacy files.
