# Digital GrowthScale (DGS) Web Platform

Digital GrowthScale is a modern enterprise web platform for AI-powered business operations, automation systems, global staffing, and executive consulting.

---

## 🚀 Overview

The codebase is built with clean semantic HTML5, modern vanilla CSS design systems, lightweight vanilla JavaScript modules, and a pre-rendered HTML includes system. It is optimized for zero-dependency high performance, accessibility, SEO, and GHL (GoHighLevel) compatibility, and this repo is itself deployed to Vercel as a CDN (`dgs-assets.vercel.app`) that serves `css/` and `js/` to every page.

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
├── css/                         # Modular Stylesheets & Design System
│   ├── dgs-common.css           # Core tokens (Framework 3.0), base rules, GHL-safe isolation layer
│   └── dgs-[page].css           # Page-specific styles
│
├── js/                          # Client scripts
│   ├── main.js                  # Nav/drawer, sticky+hide header, scroll dispatcher, reveal-on-scroll
│   └── dgs-*.js                 # Page-specific modules (assessment, careers, growth article, etc.)
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
This repo is deployed to Vercel as `dgs-assets.vercel.app`. Every page's `<link>`/`<script>` tags point at `https://dgs-assets.vercel.app/css/*.css` and `.../js/*.js`, so editing `css/`/`js/` here and pushing updates the CDN that the live (GHL-hosted) site pulls from. Images are served from `https://assets.cdn.filesafe.space/...`, fonts from Google Fonts, and GSAP/Lenis from Cloudflare/unpkg.

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

### GHL (GoHighLevel) pages
Pages are designed to be pasted directly into GHL's Custom HTML / page builder. Because GHL owns `<body>` on paste, `dgs-common.css` carries a dedicated "GHL-SAFE ISOLATION LAYER" block (scoped to `.dgs-header` / `.dgs-main-content` / `.dgs-footer`, guarded with `:not([class])`) so base typography/spacing still applies without the usual `.dgs-page` wrapper.

---

## 🎨 Design System & Brand Palette

The platform runs on "Digital GrowthScale Framework 3.0" tokens defined in `css/dgs-common.css` `:root`:

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
