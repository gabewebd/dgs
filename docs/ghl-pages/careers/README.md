# GHL /careers page: paste blocks (dgs-omega)

The live /careers page is 5 GHL custom-code blocks with the native Careers blog widget
between blocks 3 and 4. Until these are pasted it loads the retired dgs-assets CDN
(`dgs-common.css`, `dgs-solution-detail.css`, `dgs-careers.css`, `main.js`).

| GHL element | What to do |
|---|---|
| Custom code 1 (top) | Replace with `block-1-top.html` |
| Custom code 2 (header) | Leave as is (no CDN links, matches the repo) |
| Custom code 3 (hero → Open Roles slot) | Replace with `block-3-hero-to-widget.html` |
| **Careers blog widget** | GHL native, leave as is |
| Custom code 4 (hiring process → final CTA) | Leave as is (no CDN links) |
| Custom code 5 (footer + scripts) | Replace with `block-5-footer.html` |

What changed:
- **Block 1:** three dgs-assets stylesheets became one dgs-omega `styles.css`. The class
  script now adds `dgs-page dgs-css-solution-detail dgs-css-careers` (styles.css scopes the
  page to those) to `<html>` and `<body>`; the old one only added `dgs-page`.
- **Block 3:** only the `<main>` tag: added `data-dgs-js="careers"` (turns on main.js's
  careers module, which flattens the widget's grid cards) and `data-dgs-css`.
- **Block 5:** latest footer (newsletter iframe `loading="lazy"`), dgs-omega `main.js`, and
  the two GSAP 3.12.5 tags removed: main.js loads GSAP 3.13 itself, so they were a duplicate.

## Check after publishing

Open /careers in a private window. If the page is unstyled, a dgs-assets line is still in
one of the blocks.
