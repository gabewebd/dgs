# GHL blog post template: move to dgs-omega (one-time re-paste)

Every Growth Hub post (`digitalgrowthscale.com/post/...`) shares one GHL blog post
template. As of 2026-11-23 that template still loads the retired dgs-assets CDN
(frozen `cdn-version` branch), so fixes on `main` never reach the posts. These three
edits switch it to `styles.css` + `main.js` on dgs-omega, like Growth Hub. After this,
post fixes go live as soon as `main` deploys, with no more GHL pastes.

What this switch brings:
- A skeleton loader (navy hero wireframe, then TOC and paragraph lines) instead of
  the blank navy screen while GHL loads the post.
- "On this page" spacing that matches /cookie-policy. GHL's own
  `.blog-html-container-single ul { display: block }` was collapsing the list.

Verified 2026-11-23: the live founder-dependency post, rendered with only these swaps,
looks the same as today's live page on desktop and mobile.

## Edit 1: top custom-code block (the one with the header)

Replace these two lines:

```html
<link rel="stylesheet" href="https://dgs-assets.vercel.app/css/dgs-common.css">
<link rel="stylesheet" href="https://dgs-assets.vercel.app/css/dgs-growth-article.css">
```

with:

```html
<link rel="stylesheet" href="https://dgs-omega.vercel.app/css/styles.css">
<script>document.documentElement.classList.add('dgs-css-growth-article');</script>
```

In the same block, replace:

```html
<script>
  document.body.classList.add('dgs-page');
</script>
```

with:

```html
<script>document.body.classList.add('dgs-page', 'dgs-css-growth-article');</script>
```

## Edit 2: the small block right above the Blog Content widget

Change only the opening tag:

```html
<section class="dgs-ghl-blog-content">
```

to:

```html
<section class="dgs-ghl-blog-content" data-dgs-js="growth-article">
```

(`main.js` only runs the article code where `data-dgs-js="growth-article"` is present.)

## Edit 3: footer custom-code block (bottom of the page)

Replace:

```html
<script src="https://dgs-assets.vercel.app/js/main.js"></script>
<script src="https://dgs-assets.vercel.app/js/dgs-growth-article.js"></script>
```

with:

```html
<script src="https://dgs-omega.vercel.app/js/main.js"></script>
```

## Check after publishing

Open any post in a private window. You should see the grey skeleton for a moment,
then the post fades in, and the "On this page" items should be evenly spaced.
If the page is unstyled, one of the dgs-assets lines is still there.
