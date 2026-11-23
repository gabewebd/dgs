# GHL career post template: paste blocks (dgs-omega)

Job postings (`digitalgrowthscale.com/post/<role>`, linked from /careers) share one GHL
template. Until these blocks are pasted, it loads the retired dgs-assets CDN
(`dgs-common.css`, `dgs-careers-detail.css`, `dgs-careers.css`, `main.js`, `dgs-careers.js`).

| GHL element | Paste this file |
|---|---|
| Custom code 1 | `block-1-header.html` (fonts, styles.css, scope classes, header, opens `<main>` + slot) |
| **Blog Content widget** | (GHL native, leave as is) |
| Custom code 2 | `block-2-after-widget.html` (closes slot/section/main, footer, main.js) |

Only these lines changed from the old blocks:
- **Block 1:** the three dgs-assets `<link>` tags became one dgs-omega `styles.css` link. The class
  script also adds `dgs-css-careers-detail` to `<html>` and `<body>`. `<main>` and the
  section gained `data-dgs-js="careers"`; `<main>` also gained `data-dgs-css`.
- **Block 2:** the two dgs-assets `<script>` tags (plus a stray extra `</script>`) became one
  dgs-omega `main.js`.

What this brings:
- A skeleton loader (short navy hero wireframe, then meta lines, a heading and bullet rows)
  instead of a blank navy screen while GHL loads the posting.

Verified 2026-11-23 on the live /post/content-writer rendered with this swap: desktop matches
today's live page. On phones (<=480px) the hero sits ~32px higher, because styles.css carries
the later "hero looks off on mobile" fix (6.5rem top padding) that the frozen dgs-assets
`dgs-careers-detail.css` never got.

## Check after publishing

Open any job post in a private window. You should see the grey skeleton for a moment, then
the posting fades in. If the page is unstyled, a dgs-assets line is still in one of the blocks.
