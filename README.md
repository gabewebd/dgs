# Digital GrowthScale (DGS) Web Platform

Digital GrowthScale is a modern enterprise web platform for AI-powered business operations, automation systems, global staffing, and executive consulting.

---

## 🚀 Overview

The codebase is built with clean semantic HTML5, modern vanilla CSS design systems, lightweight vanilla JavaScript modules, and a pre-rendered HTML includes system. It is optimized for zero-dependency high performance, accessibility, SEO, and GHL (GoHighLevel) compatibility, and this repo is itself deployed to Vercel as a CDN (`dgs-omega.vercel.app`) that serves `css/` and `js/` to every page.

---

## 📂 Project Structure

```text
├── index.html                   # Homepage / Primary Landing Page
├── about.html                   # About & Agency Leadership
├── audit.html                   # Interactive AI Readiness & Ops Audit Tool
├── book-date.html               # Strategy Session / Calendar Booking Flow
├── careers.html                 # Careers & Talent Acquisition Portal
├── contact.html                 # Contact & Inquiry Form
├── faq.html                     # Frequently Asked Questions
├── solutions.html               # Solutions Overview
├── industries.html              # Industries & Verticals Overview
├── growth-hub.html              # Growth Hub (Learn, Implement, Connect)
├── launching-soon.html          # Coming Soon / Feature Preview (bespoke, no shared header/footer)
├── thank-you.html               # Post-submission Conversion Page (GHL-embeddable snippet, no <html>/<head>)
├── 404.html                     # Custom 404 Error Page
│
├── solutions/                   # Solution Deep-Dive Pages
│   ├── intelligent-automation.html
│   ├── crm-funnel-automation.html
│   ├── growth-os-setup.html
│   ├── growth-systems-audit.html
│   ├── remote-staffing-solutions.html
│   ├── recruitment-executive-search.html
│   ├── eor-hr-support.html
│   └── corporate-training.html
│
├── industries/                  # Industry Vertical Pages
│   ├── financial-services.html
│   ├── healthcare.html
│   ├── growing-smes.html
│   ├── logistics.html
│   ├── hospitality.html
│   ├── real-estate.html
│   ├── recruitment.html
│   ├── retail.html
│   ├── construction.html
│   ├── education.html
│   ├── outsourcing.html
│   └── professional-services.html
│
├── growth-hub/                  # Knowledge Base & Playbooks, split by nav pillar
│   ├── learn/                   # Strategic guides & articles
│   ├── implement/               # Operational blueprints & templates
│   └── connect/                 # Ecosystem, partner network & events
│
├── includes/                    # Shared HTML partials (single source of truth)
│   ├── navbar.html              # Global navigation + mobile drawer (build target)
│   └── footer.html              # Global footer (build target)
│
├── css/
│   ├── styles.css               # THE stylesheet: every page loads only this (see its header for the map)
│   ├── dgs-launching-soon.css   # Exception: standalone teaser page keeps its own sheet
│   └── dgs-header-test.css      # Exception: only used by includes/header.html
│
├── js/
│   └── main.js                  # THE script: all DGS JavaScript (shared behaviour, page modules, motion helpers, merged page scripts)
│
├── scripts/
│   └── build-includes.js        # Compiles includes/navbar.html + footer.html into every page
│
├── assets/ / images/            # Brand visuals, icons, and media (production images/fonts/GSAP load from CDNs, see below)
└── docs/ / *.pdf                # Downloadable playbooks & templates
```

---

## 🛠️ Development & Build Workflow

### 1. Prerequisites
- Node.js (v18+)

### 2. Install & Build Includes
The navbar and footer live once in `includes/navbar.html` and `includes/footer.html`. To expand them into every page between the `<!-- dgs:include:navbar:start/end -->` and `<!-- dgs:include:footer:start/end -->` markers:

```bash
npm run build
# or
npm run build:includes
```

*(Both run `node scripts/build-includes.js`.)* The script auto-discovers every `*.html` containing `<header class="dgs-header">` and overwrites the marked block with the current include verbatim — it has no per-page override, so a hand-edited nav/footer will be reverted on the next run. Always edit `includes/navbar.html` / `includes/footer.html`, never a page's inline copy, then re-run the build to sync.

### 3. Local Development
Serve the files locally using any static file server:

```bash
# Using Python
python -m http.server 3000

# Or using npx serve
npx serve .
```

---

## 🚢 Deployment

### CDN assets (Vercel)
This repo is deployed to Vercel as `dgs-omega.vercel.app` (the old `dgs-assets.vercel.app` project is no longer used). Every page loads exactly one stylesheet, `styles.css`, and one DGS script, `main.js` (plus third-party scripts such as GHL forms and Lenis), so editing `css/`/`js/` here and pushing to `main` updates the CDN that the live (GHL-hosted) site pulls from:

```html
<link rel="stylesheet" href="https://dgs-omega.vercel.app/css/styles.css">
<script src="https://dgs-omega.vercel.app/js/main.js"></script>
```

In this repo both are local relative paths (`css/styles.css`, `../js/main.js`, ...) with a CDN line kept commented out directly above each. When pasting a page into GHL, use the `dgs-omega.vercel.app` URLs above instead, since GHL cannot resolve local paths. (The commented lines inside the pages still show the old `dgs-assets.vercel.app` host; swap it for `dgs-omega.vercel.app`.) See `docs/frontend-architecture.md` for details and the remaining exceptions. Images are served from `https://assets.cdn.filesafe.space/...`, fonts from Google Fonts, and GSAP/Lenis from Cloudflare/unpkg.

1. Import the repository into your Vercel dashboard.
2. Build Settings:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `.` (Root)
3. Deploy. Clean URL routing and rewrites are handled by `vercel.json` (`cleanUrls: true` plus redirects/rewrites for `/resources`, `/services`, `/social-hub`, `/careers-embed`).

### Deploying on Netlify
1. Connect the repository or drag and drop into Netlify.
2. Configuration is pre-wired via `netlify.toml`:
   - **Build Command**: `npm run build:includes`
   - **Publish Directory**: `.`

### Page-scoped styles
Page-only CSS lives in Part C of `styles.css`, one section per former page sheet, scoped with a zero-specificity suffix: `.selector:where(.dgs-css-<name>, .dgs-css-<name> *)`. A page opts in by listing the scope classes on `<body>` (e.g. `<body class="dgs-page dgs-css-solution-detail">`); the same list is mirrored on `<main data-dgs-css="...">` so `main.js` can restore it if a host rewrites `<body>`. The 8 solution pages don't depend on that: their sections (solution-detail, premium-viz) also match inside `<main data-dgs-css>`, so they stay styled in GHL even before `main.js` runs.

### Publishing to GHL
The old per-page files (`dgs-*.css`, `dgs-*.js`) have been removed, so every GHL page and GHL-side template must load `styles.css` + `main.js` from `dgs-omega.vercel.app`. Growth Hub article/playbook templates also need `data-dgs-js="growth-article"` on `<main>`, and careers templates `data-dgs-js="careers"`, so the matching part of `main.js` runs.

### GHL (GoHighLevel) pages
Pages are designed to be pasted directly into GHL's Custom HTML / page builder. Because GHL owns `<body>` on paste, `styles.css` (Part A) carries a dedicated "GHL-SAFE ISOLATION LAYER" block (scoped to `.dgs-header` / `.dgs-main-content` / `.dgs-footer`, guarded with `:not([class])`) so base typography/spacing still applies without the usual `.dgs-page` wrapper.

---

## 🎨 Design System & Brand Palette

The platform runs on "Digital GrowthScale Framework 3.0" tokens defined in `css/styles.css` (Part A `:root`, plus the Design System 4.0 motion/layer tokens in Part B):

| Token | Hex | Usage |
|---|---|---|
| **Deep Navy** | `#0A1F33` | 60% — structural backgrounds and surfaces |
| **Growth Teal** | `#00B39F` | 15% — brand accent, hovers, secondary emphasis |
| **Electric Blue** | `#2D7FF9` | 10% — interactive and informational accents |
| **Signal Amber** | `#F5A623` | Reserved strictly for primary conversion CTAs, never decorative |

**Typography**:
- Headlines: `Sora` (falls back to `Manrope`)
- Body & Interface: `Inter` (falls back to `Work Sans`)

---

## 📄 License & Ownership

© 2026 Digital GrowthScale. All rights reserved.
