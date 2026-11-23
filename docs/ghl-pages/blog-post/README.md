# GHL blog post template: paste blocks (dgs-omega)

Every Growth Hub post (`digitalgrowthscale.com/post/...`) shares one GHL blog post
template. Until these blocks are pasted, that template loads the retired dgs-assets
CDN (frozen `cdn-version` branch), so fixes on `main` never reach the posts.

Template layout in GHL, top to bottom:

| GHL element | Paste this file |
|---|---|
| Custom code 1 | `block-1-header.html` (fonts, styles.css, scope classes, progress bar, header, opens `<main>`) |
| Custom code 2 | `block-2-before-widget.html` (opens the post section + slot) |
| **Blog Content widget** | (GHL native, leave as is) |
| Custom code 3 | `block-3-after-widget.html` (closes slot/section, Keep Reading, CTA, closes `</main>`, back-to-top) |
| Custom code 4 | `block-4-footer.html` (footer + main.js) |

Replace each code box's whole content with its file. Compared with the old blocks,
only these lines changed:
- **Block 1:** the two dgs-assets `<link>` tags became one dgs-omega `styles.css` link. The
  class script now also adds `dgs-css-growth-article` to `<html>` and `<body>`, so the page is
  styled from first paint. `<main>` gained `data-dgs-js="growth-article"` and `data-dgs-css`.
- **Block 2:** the section gained `data-dgs-js="growth-article"`, a backup in case GHL drops the `<main>`.
- **Block 3:** comment text only.
- **Block 4:** the two dgs-assets `<script>` tags became one dgs-omega `main.js`.

What this brings:
- A skeleton loader (navy hero wireframe, then TOC and paragraph lines) instead of
  the blank navy screen while GHL loads the post.
- "On this page" spacing that matches /cookie-policy. GHL's own
  `.blog-html-container-single ul { display: block }` was collapsing the list.

Verified 2026-11-23 on the live founder-dependency post rendered with this swap: the hero,
body, TOC, Keep Reading, CTA and footer match today's live page. Visible differences:
the even TOC spacing, the CTA's faint "SCALE" watermark (current site CTA design), and
the teal back-to-top button after scrolling.

## Check after publishing

Open any post in a private window. You should see the grey skeleton for a moment,
then the post fades in, and the "On this page" items should be evenly spaced.
If the page is unstyled, a dgs-assets line is still in one of the blocks.
