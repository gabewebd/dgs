/* ============================================================
   GROWTH HUB — ARTICLE TEMPLATE
   Vanilla JS: reading progress bar, sticky on-page nav active-state,
   mobile TOC collapse/expand, back-to-top button. No dependencies.
   ============================================================ */
(function () {
  'use strict';

  /* Temporary diagnostic — confirms on the live page (via DevTools
     console) that this exact file actually loaded and started
     executing, distinct from an older cached/deployed version.
     Intentionally left in for now per the live-verification request
     this was added for; safe to remove once confirmed. */
  console.log('[DGS Article] script loaded');

  /* ─── Stop the browser from restoring a stale scroll position on
     reload ───
     Reported bug: refreshing/opening a post directly could land the
     viewport partway down the page instead of at the top, THEN the
     GHL widget's content would land a moment later and reflow
     everything again — two separate jumps stacked on top of each
     other. The first jump is the browser's own scroll-restoration
     feature (it remembers where a document was scrolled and tries to
     put it back there on reload) fighting the fact that a fresh
     native-GHL post has no real content yet at that instant, so
     "where it was scrolled" doesn't correspond to anything real. Set
     as early as possible (module scope, not inside whenReady) and
     unconditionally on every load: doesn't require the DOM, doesn't
     re-run on internal SPA-style navigation (a new document load
     re-executes this whole script from scratch), and every browser
     that lacks the API just skips the guarded call. */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  /* Guards every selector/DOM-creation below against running before
     <body> is parsed at all — this script's own placement in the page
     is GHL page-builder content outside this repo, not something this
     file controls, so it can't assume it always loads at the end of
     body the way the static template's own copy does. Checking
     readyState (not a bare `addEventListener('DOMContentLoaded', ...)`)
     matters here specifically: if this script is injected/loads AFTER
     DOMContentLoaded has already fired (the common case, since it's
     usually placed late in body), a bare listener would never fire at
     all and silently disable everything in this file. */
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(function () {

  /* ─── Reading progress bar ───
     Measures the article/content element, NOT the static template's
     own `.dgs-ga-body` specifically: that class doesn't exist at all
     on a native GHL post, so this always re-queries both possible
     targets fresh on every call rather than caching one reference at
     script-load time. Two reasons this has to stay a live query
     instead of a cached `var`:
     1. On a GHL post, `.dgs-ga-body` never exists — `#blogPostContent`
        (a fixed GHL id, not a per-widget random hash, so this is
        safe/stable) is the equivalent "just the written content, not
        hero/TOC/related/CTA" element there.
     2. GHL's Vue hydration can replace .blog-html-container-single
        (and everything inside it, #blogPostContent included) wholesale
        — documented in insertDek() below. A cached reference to the
        old node would go stale/detached, and a detached element's
        getBoundingClientRect() is always all-zero, which would look
        exactly like "the bar stopped updating" with no error thrown. */
  function getArticleEl() {
    return document.querySelector('.dgs-ga-body') || document.getElementById('blogPostContent');
  }

  /* ─── The real per-post content wrapper, across every Growth Hub pillar ───
     Every native GHL post's rich body is authored as a "Custom Code"
     element in the blog editor, and whoever wrote that post's HTML wraps
     it in one class of their own choosing — confirmed live to differ not
     just by pillar but by POST, not a single fixed name: Learn posts
     (regular articles) use `.dgs-blog-render`, Connect posts (events)
     use `.dgs-event-template-page` — and within Implement, EVERY post
     so far has used its own class: a checklist post uses
     `.dgs-checklist-template-page`, a playbook post
     `.dgs-playbook-template-page`, a compliance-calendar-style template
     `.dgs-compliance-template-page`, an SOP template pack
     `.dgs-sop-template-page` (confirmed live on speedtoleadcode.html,
     compliancecalendar.html, and sop.html: TOC/Back to Top silently did
     nothing until each of these was added here too, same bug class
     every time — this pillar has never once reused a wrapper name
     across posts). buildToc() and the Back to Top fix below both need
     "whichever of these actually exists on this post" — a single query
     for one specific class. Listed explicitly rather than matched by a
     generic heuristic (e.g. "the code-embed-container's first
     non-style child") to stay consistent with this file's existing
     pattern of targeting known, stable hooks — add a new class here
     the moment any future post introduces one, since there's no way to
     predict the name in advance. */
  function getGhlRender() {
    return document.querySelector('.dgs-blog-render, .dgs-checklist-template-page, .dgs-event-template-page, .dgs-playbook-template-page, .dgs-compliance-template-page, .dgs-sop-template-page');
  }

  /* ─── Smooth-scroll helper, routed through Lenis when it's active ───
     js/main.js initializes Lenis sitewide with `autoRaf: true` and
     exposes the instance as `window.dgsLenis`. Confirmed live (the
     actual bug behind Back to Top and TOC links landing on the wrong
     heading — not a wrong offset calculation): autoRaf means Lenis runs
     its own continuous requestAnimationFrame loop that keeps driving the
     native scroll position from Lenis's OWN internal virtual scroll
     state. Calling `window.scrollTo()` directly doesn't inform that
     state — it fights it instead, so the page starts moving toward the
     right target and then gets pulled back toward wherever Lenis's
     untouched internal position still says it should be, one frame
     later. Every programmatic scroll in this file has to go through
     Lenis's own `scrollTo(target, { offset })` API instead once Lenis
     exists, which updates that internal state directly so there's
     nothing left to fight. `target` is a number (absolute scroll Y) or
     an element; `offsetPx` (positive = clearance) shifts the landing
     point up by that many px, e.g. to clear the fixed navbar — Lenis's
     own `offset` option is ADDED to the target position, so this negates
     it to match. Falls back to native `window.scrollTo` only when Lenis
     truly isn't on the page (e.g. prefers-reduced-motion, which
     js/main.js's initSmoothScroll() never initializes Lenis for at
     all). */
  function scrollToTarget(target, offsetPx) {
    if (window.dgsLenis && typeof window.dgsLenis.scrollTo === 'function') {
      window.dgsLenis.scrollTo(target, { offset: -(offsetPx || 0) });
      return;
    }
    var y = typeof target === 'number'
      ? target
      : target.getBoundingClientRect().top + window.scrollY - (offsetPx || 0);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* Force the viewport to the top exactly once, right as this script
     starts running — before the GHL widget has had any chance to
     inject/replace content and reflow the page. Routed through
     scrollToTarget() (not a raw window.scrollTo()) for the same
     Lenis-fighting reason documented on that function: js/main.js
     initializes Lenis before this script tag runs (it's loaded first,
     see the bottom of the page), so by this point Lenis already has
     its own internal scroll state that a raw window.scrollTo() would
     lose to a frame later. This runs once, here, and never again —
     it is NOT wired to any scroll/resize/mutation event, so it never
     fights the user's own scrolling after the page settles. */
  scrollToTarget(0, 0);

  /* ─── GHL: reveal the native post once it's actually there ───
     .dgs-ghl-native-blog-slot (see css/dgs-growth-article.css) starts
     hidden (opacity/visibility, NOT display:none — the space stays
     reserved so nothing below it, e.g. "More Perspectives"/CTA/
     footer, ever sits right under the navbar only to jump down a
     moment later once the real post lands). This is what actually
     un-hides it: once the real title AND the real body wrapper
     (getGhlRender() — already used elsewhere in this file to find
     whichever per-pillar class a post's body uses) both exist, and
     the featured image (if this post has one) has finished loading
     so it can't change the hero's height after reveal, it adds
     .is-ready. Called from the same body-level MutationObserver as
     every other GHL-sync function below (no second observer), and
     idempotent — no-ops instantly once the slot already has
     .is-ready, so re-running it on every mutation costs nothing. */
  function revealArticle() {
    var slot = document.querySelector('[data-ghl-native-blog]');
    if (!slot || slot.classList.contains('is-ready')) return;
    var hero = document.querySelector('.blog-html-container-single');
    var title = hero && hero.querySelector(':scope > .blog-content-title');
    var body = getGhlRender();
    if (!hero || !title || !body) return;

    var img = hero.querySelector('.blog-content-blog-image');
    if (img && !img.complete) {
      /* data-ga-wait guards against re-attaching this pair on every
         MutationObserver tick that fires before the image finishes
         loading — without it, each tick before load/error would stack
         one more (harmless but wasteful) pair of listeners. */
      if (!img.getAttribute('data-ga-wait')) {
        img.setAttribute('data-ga-wait', '1');
        img.addEventListener('load', revealArticle, { once: true });
        img.addEventListener('error', revealArticle, { once: true });
      }
      return;
    }
    slot.classList.add('is-ready');
  }
  /* Failsafe only, not the reveal mechanism itself: if some future
     post shape never satisfies revealArticle()'s checks above, this
     stops the article from staying invisible forever. Comfortably
     longer than any real hydration takes on this page (confirmed
     live), so it should never actually fire on a working post. */
  setTimeout(function () {
    var slot = document.querySelector('[data-ghl-native-blog]');
    if (slot) slot.classList.add('is-ready');
  }, 6000);

  /* The bar's own markup, `<div class="dgs-ga-progress" data-ga-progress
     aria-hidden="true"></div>`, is hand-authored directly in the static
     template's HTML — but a native GHL post's page (built entirely in
     GHL's page builder, outside this repo) never had it pasted in at
     all, on any post checked live. Same situation as the dek paragraph
     and the TOC sidebar below: a decorative piece GHL doesn't render
     natively, so this creates it once (idempotent, guarded by the same
     query used everywhere else here) rather than requiring a manual
     per-post GHL edit. Inserted as body's first child so it sits above
     everything, matching the static template's own placement. */
  function ensureProgressBar() {
    if (document.querySelector('[data-ga-progress]')) return;
    var bar = document.createElement('div');
    bar.className = 'dgs-ga-progress';
    bar.setAttribute('data-ga-progress', '');
    bar.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bar, document.body.firstChild);
  }
  ensureProgressBar();

  var progress = document.querySelector('[data-ga-progress]');
  function updateProgress() {
    progress = progress || document.querySelector('[data-ga-progress]');
    var articleEl = getArticleEl();
    if (!progress || !articleEl) return;
    var rect = articleEl.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var scrolled = -rect.top;
    var pct = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
    progress.style.width = (pct * 100) + '%';
  }

  /* ─── Back to top (our own floating button, [data-ga-top]) ─── */
  var topBtn = document.querySelector('[data-ga-top]');
  function updateTopBtn() {
    if (!topBtn) return;
    topBtn.classList.toggle('is-visible', window.scrollY > 900);
  }
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      scrollToTarget(0, 0);
    });
  }

  /* Shared with the TOC link-click handler further down — declared here
     (not just there) so both can reference the same constant; `var`
     hoists the declaration but not the assignment, and this one runs
     first in source order, so it's already assigned by the time either
     click handler actually fires (both only run later, on a real
     click). 104px / 6.5rem matches the offset already used sitewide for
     the fixed header (.dgs-ga-body h2/h3 scroll-margin-top, plus
     dgs-legal.css/dgs-event-detail.css/dgs-playbook-detail.css). */
  var TOC_SCROLL_OFFSET = 104;

  /* ─── GHL: fix the native "Back to Top" button ───
     GHL's own widget renders `.hl-blog-content-back-to-top-container
     > button.back-to-top` — a bare <button> with no href/onclick; its
     scroll behavior depends entirely on GHL's own Vue click binding,
     which is attached DIRECTLY to that button element (standard Vue
     `@click="handler"` compiles to `element.addEventListener('click',
     handler)` on the actual rendered node — not a document-level
     delegate), so GHL's handler always runs for a click on that node
     regardless of what else is listening elsewhere.

     A capture-phase `document` listener (tried first) should in theory
     still run before that — capturing always finishes before a
     listener on the target itself fires, per spec, regardless of
     registration order — but user testing after that version still
     showed the OLD symptom (lands on whatever heading is nearest the
     current scroll position, not the first one), meaning GHL's handler
     was still the one actually driving the scroll. Rather than keep
     guessing at event-phase timing, this instead REMOVES GHL's handler
     outright: cloning the button (`cloneNode`) copies its markup but
     not any JS listeners attached to the original node, so the clone
     is a clean element with zero click behavior of its own.
     Swapping it in and attaching only our own listener means there is
     no longer a second handler to race against — deterministic
     regardless of registration order or how many listeners GHL had
     attached. `data-ga-fixed` guards this idempotent (skips an
     already-cloned button) the same way every other GHL-sync function
     here guards against the shared MutationObserver re-running it, and
     lets this correctly re-fix a wholesale replacement button if GHL's
     Vue hydration ever swaps the subtree back in (same documented
     behavior as insertDek() above).

     Destination is the article's FIRST heading, not window top (user
     feedback: this button lives at the bottom of the article, and the
     desired behavior is "back to the top of the article", not all the
     way past the hero) — same element buildToc() below reads, so this
     always agrees with whatever the on-page nav's first entry points
     to. Falls back to window top only if the post has no headings at
     all for buildToc() to have found either. */
  function fixBackToTop() {
    var btn = document.querySelector('.hl-blog-content-back-to-top-container .back-to-top');
    if (!btn || btn.getAttribute('data-ga-fixed')) return;
    var clean = btn.cloneNode(true);
    clean.setAttribute('data-ga-fixed', '1');
    btn.parentNode.replaceChild(clean, btn);
    clean.addEventListener('click', function (e) {
      e.preventDefault();
      var articleEl = getGhlRender() || getArticleEl();
      /* h2 only, matching exactly what buildToc() below reads to build
         the "On This Page" nav — so this always lands on the same
         section its own first entry points to, not some other heading
         level it never listed. */
      var firstHeading = articleEl && articleEl.querySelector('h2');
      if (firstHeading) {
        scrollToTarget(firstHeading, TOC_SCROLL_OFFSET);
      } else {
        scrollToTarget(0, 0);
      }
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateProgress();
      updateTopBtn();
      ticking = false;
    });
  }, { passive: true });

  updateProgress();
  updateTopBtn();
  /* Content height can change after this point (GHL hydration,
     images finishing loading), independent of any scroll event —
     recalculate once more when the page is fully loaded so the bar
     reflects final content height even if the user hasn't scrolled
     since. */
  window.addEventListener('load', updateProgress);

  /* ─── GHL: hero description from the post's own meta description ───
     .dgs-ga-hero shows a dek/description paragraph under the date;
     GHL's native Blog Content widget doesn't render one. Reuses the
     post's own <meta name="description"> — the same text the static
     template's own dek is hand-typed from (verified identical on
     founder-dependency-test.html), so this is real per-post data, not
     invented copy. Guarded the same way as the TOC below: only on a
     GHL post, only once.

     GHL's blog widget is a Nuxt/Vue component that server-renders the
     post markup, then hydrates client-side. Because insertDek() adds a
     real DOM node inside .blog-html-container-single BEFORE that
     hydration pass runs, Vue's hydration walk finds a child-list
     mismatch it can't reconcile in place, and Vue 3's documented
     recovery is to discard and fully REPLACE that DOM subtree with
     freshly client-rendered nodes rather than patch it — this can
     replace .blog-html-container-single itself, not just its children
     (confirmed live: the dek would flash in, then vanish for good once
     the page finished rendering — a one-time event, not a flicker).
     A MutationObserver watching only .blog-html-container-single's own
     childList is blind to that: if the container node itself gets
     swapped out, the observer keeps watching the old, now-detached
     node and never fires again. So instead this observes document.body
     (guaranteed to survive any such replacement) with subtree:true,
     and insertDek() re-queries the live DOM fresh every time — it's
     idempotent (no-ops once the dek already exists), so it just keeps
     re-asserting the dek for the life of the page no matter how many
     times GHL rebuilds the subtree underneath it. */
  function insertDek() {
    var ghlHero = document.querySelector('.blog-html-container-single');
    var ghlTitle = ghlHero && ghlHero.querySelector(':scope > .blog-content-title');
    var descMeta = document.querySelector('meta[name="description"]');
    if (ghlHero && ghlTitle && descMeta && descMeta.content && !ghlHero.querySelector(':scope > .dgs-ga-dek')) {
      var dek = document.createElement('p');
      dek.className = 'dgs-ga-dek';
      dek.textContent = descMeta.content;
      ghlHero.insertBefore(dek, ghlTitle.nextSibling);
    }
  }
  /* ─── GHL: relabel the native "Back to Blog" link ───
     GHL's blog widget hardcodes this link's visible text and
     aria-label; our HTML/CSS never touches it, so it can only be
     changed from here. The real markup is
     `<a class="blog-back-button"><i class="blog-left-arrow"></i>
     <span>Back to Blog</span></a>` — the text is NOT a direct text-node
     child of the <a> (a childNodes-only scan tried that previously and
     silently matched nothing, since <i> and <span> are both element
     nodes), it's one level deeper inside the <span>. A TreeWalker
     visits every descendant text node regardless of nesting, so this
     keeps working even if GHL changes the wrapper markup again. Only
     rewrites nodes that still say "Back to Blog" so re-runs are
     no-ops. Reuses insertDek's own MutationObserver/re-query strategy
     for the same reason: GHL's Vue hydration can replace this subtree
     wholesale. */
  function renameBackButton() {
    var backBtn = document.querySelector('.blog-html-container-single > .blog-back-button');
    if (!backBtn) return;
    if (backBtn.getAttribute('aria-label') !== 'Back to Growth Hub') {
      backBtn.setAttribute('aria-label', 'Back to Growth Hub');
    }
    var walker = document.createTreeWalker(backBtn, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (/back to blog/i.test(node.textContent)) {
        node.textContent = node.textContent.replace(/back to blog/i, 'Back to Growth Hub');
      }
    }
  }

  /* ─── GHL: build the on-page nav from the post body's headings ───
     The static article template hand-authors .dgs-ga-toc with its links
     and heading ids per post. A GHL post's real content wrapper (see
     getGhlRender() above) varies every time, so instead of hand-authoring
     that html, this reads whatever h2 headings actually exist inside it
     and builds the same markup. Guarded to a GHL post specifically
     (getGhlRender() found something) with no hand-authored sidebar
     already there, so the static template's own .dgs-ga-toc is never
     touched or duplicated.

     This used to run once, standalone, at script level — confirmed
     live that it never actually built anything on a real GHL post: the
     post's own rich-text body (with its real h2s) lands in the DOM on a
     separate, later timeline from the hero elements
     insertDek()/renameBackButton() react to, so by the time this ran,
     the content wrapper either didn't exist yet or GHL was still filling
     it in. Now called from the same body-level MutationObserver as
     insertDek/renameBackButton, for the identical reason: it re-checks
     every time GHL touches the DOM instead of gambling on one exact
     moment, and its own guard (`!document.querySelector('.dgs-ga-toc')`)
     keeps it a no-op once the sidebar exists. */
  function buildToc() {
    var ghlRender = getGhlRender();
    if (!ghlRender || document.querySelector('.dgs-ga-toc')) return;
    var ghlHeadings = Array.prototype.slice.call(ghlRender.querySelectorAll('h2'));
    if (!ghlHeadings.length) return;

    var slugify = function (text) {
      return text.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') || 'section';
    };
    var usedIds = {};
    var listItems = ghlHeadings.map(function (h) {
      var base = h.id || slugify(h.textContent);
      var id = base;
      var n = 2;
      while (usedIds[id]) { id = base + '-' + (n++); }
      usedIds[id] = true;
      h.id = id;

      var a = document.createElement('a');
      a.href = '#' + id;
      a.textContent = h.textContent;
      var li = document.createElement('li');
      li.appendChild(a);
      return li;
    });

    var ghlAside = document.createElement('aside');
    ghlAside.className = 'dgs-ga-toc';
    ghlAside.setAttribute('data-ga-toc', '');
    ghlAside.setAttribute('data-open', 'false');
    ghlAside.innerHTML =
      '<button class="dgs-ga-toc-toggle" data-ga-toc-toggle aria-expanded="false">On This Page' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>' +
      '<span class="dgs-ga-toc-label">On This Page</span>';
    var ghlList = document.createElement('ul');
    ghlList.className = 'dgs-ga-toc-list';
    listItems.forEach(function (li) { ghlList.appendChild(li); });
    ghlAside.appendChild(ghlList);

    ghlRender.parentNode.insertBefore(ghlAside, ghlRender);
  }

  /* ─── Wire up the TOC once it exists: mobile toggle + active-section
     tracking ───
     Same "used to run once at script level" bug as buildToc() above —
     if `[data-ga-toc]` didn't exist at that one moment, this silently
     never wired anything, forever, even after buildToc() (or the
     static template's own hand-authored markup) added it. Guarded by
     a `data-wired` flag on the toc element itself so calling this
     repeatedly from the shared observer doesn't attach duplicate
     listeners or create a second IntersectionObserver. */
  function wireToc() {
    var toc = document.querySelector('[data-ga-toc]');
    if (!toc || toc.getAttribute('data-wired')) return;
    toc.setAttribute('data-wired', '1');

    var tocToggle = toc.querySelector('[data-ga-toc-toggle]');
    if (tocToggle) {
      tocToggle.addEventListener('click', function () {
        var open = toc.getAttribute('data-open') === 'true';
        toc.setAttribute('data-open', open ? 'false' : 'true');
        tocToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    }

    var tocLinks = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var headings = tocLinks
      .map(function (link) { return document.getElementById(link.getAttribute('href').slice(1)); })
      .filter(Boolean);

    if (headings.length && 'IntersectionObserver' in window) {
      var headingObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          tocLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
          });
        });
      }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

      headings.forEach(function (h) { headingObserver.observe(h); });
    }
  }

  function syncGhlHero() {
    insertDek();
    renameBackButton();
    updateProgress();
    buildToc();
    wireToc();
    fixBackToTop();
    revealArticle();
  }
  /* Always run once AND always observe — not gated behind an initial
     `.blog-html-container-single` presence check. That check would
     race GHL's own render: if this script executes before GHL has
     inserted anything yet, the gate would skip creating the observer
     entirely, and nothing here would ever run again even once GHL
     does render (this is the most likely reason the previous
     "Back to Growth Hub" attempt never took effect on some loads).
     Every function called above already no-ops safely when its own
     target doesn't exist yet. */
  syncGhlHero();
  new MutationObserver(syncGhlHero).observe(document.body, { childList: true, subtree: true });

  /* ─── TOC link clicks: smooth-scroll accounting for the fixed navbar ───
     A native anchor jump (or Lenis's own `anchors: true` handling,
     since this site runs Lenis sitewide) would land a heading flush
     against the viewport top, underneath the fixed .dgs-header, UNLESS
     the target has `scroll-margin-top` set. The static template's own
     headings get that via `.dgs-ga-body h2/h3` in dgs-growth-article.css
     — but a GHL post's `.dgs-blog-render` headings are styled by a
     <style> block pasted per-post directly in GHL's editor (confirmed
     on the live page), outside this repo, with no such offset. Rather
     than depend on every post's own pasted CSS getting this right,
     this computes the offset in JS, reusing the same TOC_SCROLL_OFFSET
     the Back to Top fix above declares. Capture phase + stopPropagation
     stops Lenis's own `anchors: true` handling from also acting on the
     same click and scrolling to the raw (un-offset) position; routing
     the actual scroll through scrollToTarget() (Lenis-aware, see above)
     stops Lenis's autoRaf loop from fighting a raw window.scrollTo() and
     pulling the page back toward the wrong position afterward — the
     same bug that was behind Back to Top landing on the wrong
     heading. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-ga-toc] a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    scrollToTarget(target, TOC_SCROLL_OFFSET);
  }, true);

  }); // whenReady
})();

/* ============================================================
   SOCIAL SHARE (.dgs-blog-share)
   Own top-level IIFE, separate from the article-template one above.

   ─── WHY THIS IS DELEGATED FROM document, NOT WIRED PER-ELEMENT ───
   Root-caused 2026-09-21 against the ACTUAL LIVE article (not a local
   file, not a mock): fetching https://digitalgrowthscale.com/post/
   founder-dependency-test directly showed the "More Perspectives"
   Custom Code block's own container —
   #<id>__custom-code.custom-code-container — rendered SERVER-SIDE as
   completely EMPTY (just whitespace). The real markup (this share bar
   included) exists only as an HTML string inside a "rawCustomCode"
   JSON field elsewhere on the page; GHL's own front-end injects it
   into that empty container CLIENT-SIDE, after the fact, because this
   Custom Code element has an entrance-animation setting turned on in
   the page builder (confirmed live: the page's own JSON payload
   carries entranceAnimation/animationScale/animationDuration keys for
   this exact element). The previous version of this file assumed the
   markup was already in the DOM by the time whenReady() ran, wired a
   direct click listener onto each specific button, and set
   Facebook/LinkedIn's href once — on the real page, all of that ran
   against an empty container and silently did nothing, which is
   exactly why Facebook/LinkedIn were still bare "#" links live and
   Instagram/Copy never responded to a click.

   Delegating the click listener to `document` sidesteps this
   entirely: `document` exists from the first instant of page load,
   long before GHL's hydration inserts the real button markup, and a
   delegated listener only needs the buttons to exist at CLICK time,
   not at script-load time — so it works correctly no matter when
   (or how many times) GHL replaces this subtree. Nothing here needs a
   MutationObserver as a result. Bubble phase (not capture) is enough:
   these are plain, freshly-authored <button> elements with no default
   navigation behavior and no other script on this page has any
   reason to attach its own handler to them (unlike, say, GHL's native
   "Back to Top" button elsewhere in this file, which genuinely does
   carry a competing Vue click binding that has to be removed via
   cloneNode) — so there is no competing handler here to beat, and
   capture phase would be a random hack with nothing to justify it. */
(function () {
  'use strict';

  console.log('[DGS Article] share script evaluating');

  function currentUrl() {
    return window.location.href;
  }

  /* Clipboard write, with a fallback for contexts where the async
     Clipboard API isn't available (older browsers, or a non-HTTPS
     preview) — a temporary offscreen textarea + the legacy
     execCommand, created and removed within the same call. Returns a
     Promise either way so both callers share one .then()/.catch()
     shape. */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('execCommand failed'));
        }
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  /* Tooltip feedback, used only by Instagram (it has no visible text
     label of its own to swap the way Copy Link does below). */
  function showTooltip(btn, message) {
    var tip = btn.querySelector('[data-share-tooltip]');
    if (!tip) return;
    tip.textContent = message;
    btn.classList.add('is-tooltip-visible');
    clearTimeout(btn._dgsShareTimer);
    btn._dgsShareTimer = setTimeout(function () {
      btn.classList.remove('is-tooltip-visible');
    }, 2200);
  }

  function handleCopyAction(btn, successMessage, failMessage) {
    copyToClipboard(currentUrl()).then(function () {
      var textEl = btn.querySelector('.dgs-blog-share-btn-text');
      if (textEl) {
        var original = textEl.dataset.dgsOriginalText || textEl.textContent;
        textEl.dataset.dgsOriginalText = original;
        textEl.textContent = successMessage === true ? 'Copied!' : successMessage;
        btn.classList.add('is-copied');
        clearTimeout(btn._dgsShareTimer);
        btn._dgsShareTimer = setTimeout(function () {
          textEl.textContent = original;
          btn.classList.remove('is-copied');
        }, 2000);
      } else {
        showTooltip(btn, typeof successMessage === 'string' ? successMessage : 'Copied!');
      }
    }, function () {
      var textEl = btn.querySelector('.dgs-blog-share-btn-text');
      if (textEl) {
        var original = textEl.dataset.dgsOriginalText || textEl.textContent;
        textEl.dataset.dgsOriginalText = original;
        textEl.textContent = failMessage;
        clearTimeout(btn._dgsShareTimer);
        btn._dgsShareTimer = setTimeout(function () {
          textEl.textContent = original;
        }, 2000);
      } else {
        showTooltip(btn, failMessage);
      }
    });
  }

  /* One listener, added unconditionally at script-evaluation time —
     never gated behind whenReady()/a querySelector for .dgs-blog-share,
     since (per the header comment) that element may not exist yet and
     delegation doesn't need it to. `document.addEventListener` itself
     works even before <body> is parsed. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.dgs-blog-share [data-share-action]');
    if (!btn) return;

    var action = btn.getAttribute('data-share-action');
    console.log('[DGS Article] share action clicked:', action);
    e.preventDefault();

    var url = currentUrl();

    if (action === 'facebook') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer,width=600,height=430');
    } else if (action === 'linkedin') {
      window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer,width=600,height=600');
    } else if (action === 'instagram') {
      handleCopyAction(btn, 'Link copied — share it on Instagram', 'Could not copy link');
    } else if (action === 'copy') {
      handleCopyAction(btn, true, 'Copy failed');
    }
  });
})();

/* ============================================================
   PREVIOUS / NEXT ARTICLE (.dgs-blog-prev-next)
   Own top-level IIFE — separate concern from the share component
   above. Markup lives inside "More Perspectives" (see ghl-blog.html),
   static and always present, so (same reasoning as the share
   component) this needs no MutationObserver/whenReady gating beyond
   DOMContentLoaded and never depends on the native GHL widget on
   THIS page finishing anything, because it doesn't read anything
   from this page's own widget at all — see below.

   ─── WHY THIS FETCHES /growth-hub INSTEAD OF READING LOCAL DATA ───
   Inspected first, per the brief, rather than assumed: an individual
   GHL blog post page (the .dgs-ghl-native-blog-slot content documented
   at the top of this file) exposes NO previous/next post data of any
   kind — no {{post.previous}}-style variable, no native prev/next
   widget, nothing. Confirmed by the same live-DOM investigations
   already on record in this codebase (css/dgs-growth-hub.css "GROWTH
   HUB FIX 3-6" comments, this file's own getGhlRender()/insertDek()
   comments): the ONLY documented place the actual ordered list of
   Growth Hub posts exists is GHL's native "Blog Posts" widget
   (.hl-blog-post-home), which is dropped directly into the Growth Hub
   LISTING page (/growth-hub) in GHL's page builder — never into the
   individual post template. There is no post-count, ordering, or
   listing API exposed anywhere else in this project to fall back on.

   So: fetch /growth-hub (a real, same-origin page, not invented),
   parse its rendered HTML, and search every .hl-blog-post-home
   instance found there for a card whose real href matches the
   CURRENT page's own URL. Once found, "previous"/"next" are simply
   that card's immediate siblings inside the SAME widget instance —
   this deliberately never has to know in advance which pillar
   (Learn/Implement/Inspire) the current post belongs to, so it can't
   get that wrong: whichever widget the current post's own card
   actually turns up in IS the right list to walk. The order those
   cards render in is GHL's own (confirmed live: newest-first), not
   anything invented here.

   ─── ONE CONFIRMED LIMITATION (surfaced, not hidden) ───
   That native widget paginates its results SERVER-SIDE — confirmed by
   this exact codebase's own pagination handling elsewhere (see
   wireRestore()/wirePaginationScrollAnchor() above, and the matching
   .pagination-button logic in js/dgs-careers.js): clicking a page
   number replaces the widget's DOM via an async request, meaning only
   ONE page's worth of cards exists in the HTML at any given time.
   A plain fetch() of /growth-hub therefore only ever sees each
   pillar's FIRST page. For a post recent enough to still be on page 1
   of its pillar, previous/next resolve correctly. For an older post
   that has scrolled onto page 2+, this can't find it and the whole
   component fails gracefully (stays hidden) rather than guessing —
   there is no documented API in this project for fetching a specific
   page of that widget from outside a live GHL session, so this is the
   safest correct behavior available rather than a bug: no navigation
   is shown, never a broken one.

   Real card selectors below (.hl-blog-post-home, .blog-post-wrapper-list,
   h2.blog-title) — RE-CONFIRMED 2026-09-21 against the ACTUAL LIVE
   /growth-hub page (a direct fetch of
   https://digitalgrowthscale.com/growth-hub, not a local file or a
   stale saved capture): all three pillar widgets currently render
   their cards as .blog-post-wrapper-list (the "Grid"/three-col
   layout), not .blog-post-wrapper-compact, and the real founder-
   dependency-test post's own href appears 3 times in that fetch's
   raw, un-hydrated HTML — confirming GHL's native Blog Posts widget
   (unlike the Custom Code block below, see the header comment on the
   SOCIAL SHARE IIFE above for that contrast) IS genuinely server-
   rendered, so a plain fetch() here really does see real data with no
   JS execution required on the fetched document.
   .blog-post-wrapper-compact is kept alongside it purely as a
   defensive fallback (that's the shape documented for the Careers
   listing widget elsewhere in this codebase; GHL could render Growth
   Hub the same way on a future layout change) — it is NOT what's live
   today. GHL's Grid layout is also documented (js/dgs-careers.js
   flattenGridCards()) to sometimes nest card N+1 INSIDE card N instead
   of as a proper sibling; querySelectorAll finds every match regardless
   of nesting depth, in true document order — confirmed by actually
   printing the extracted title/URL sequence against the live fetch (6
   titles in Learn, in GHL's own real order, not merely asserted).

   ─── WHY THIS *ALSO* NEEDS A MutationObserver (unlike the share
   component above) ───
   The nav's own markup is inside the SAME Custom Code block as the
   share bar (see ghl-blog.html), so it's subject to the exact same
   "empty container until GHL's client-side hydration inserts the
   real rawCustomCode HTML" behavior documented above — confirmed live
   the same way (the real post's #<id>__custom-code container was
   empty in the server response). Unlike the share buttons, this
   component can't get away with pure click-delegation, because there
   is nothing to delegate: revealing/filling this nav happens on its
   own, independent of any click, so it genuinely needs to know WHEN
   the real <nav data-blog-prev-next> node exists. Runs once
   immediately (covers a normal SSR page or a page with no entrance
   animation configured) AND observes document.body for the node
   showing up later, exactly like the article-template IIFE's own
   syncGhlHero()/MutationObserver pattern at the top of this file --
   same proven approach, not a new mechanism. Idempotent via
   dataset.dgsPrevNextWired so a later GHL re-render can't fetch or
   fill twice. */
(function () {
  'use strict';

  console.log('[DGS Article] prev/next script evaluating');

  /* Trailing slash aside, two paths for the same post should always
     compare equal — GHL doesn't guarantee which form a given link
     uses, and a real URL can also carry a query string/hash that must
     be ignored for identity purposes. `new URL(...).pathname` already
     strips query/hash on its own; this only needs to additionally
     drop a trailing slash. Case is deliberately left alone: slugs
     aren't guaranteed lowercase-only, and lowercasing risks a false
     match/mismatch on a post whose slug actually differs only by
     case. */
  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, '') || '/';
  }

  function toPath(href) {
    try {
      return normalizePath(new URL(href, window.location.origin).pathname);
    } catch (e) {
      return null;
    }
  }

  function readCard(card) {
    var link = card.querySelector('.blog-title a');
    var titleEl = card.querySelector('.blog-title');
    if (!link || !titleEl) return null;
    var href = link.getAttribute('href');
    var title = titleEl.textContent.trim();
    var path = href && toPath(href);
    if (!href || !title || !path) return null;
    return { href: href, title: title, path: path };
  }

  function fillSide(nav, side, data) {
    var item = nav.querySelector('[data-prev-next-link="' + side + '"]');
    if (!item) return;
    if (!data) {
      item.hidden = true;
      return;
    }
    item.href = data.href;
    var titleEl = item.querySelector('[data-prev-next-title]');
    if (titleEl) titleEl.textContent = data.title;
    item.hidden = false;
  }

  function initPrevNext(nav) {
    if (nav.dataset.dgsPrevNextWired) return;
    nav.dataset.dgsPrevNextWired = '1';
    console.log('[DGS Article] prev/next component found, initializing');

    var currentPath = normalizePath(window.location.pathname);
    console.log('[DGS Article] current pathname:', currentPath);

    fetch('/growth-hub', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('dgs-blog-prev-next: /growth-hub returned ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var widgets = Array.prototype.slice.call(doc.querySelectorAll('.hl-blog-post-home'));
        console.log('[DGS Article] growth-hub widgets found:', widgets.length);

        for (var w = 0; w < widgets.length; w++) {
          var rawCards = Array.prototype.slice.call(widgets[w].querySelectorAll('.blog-post-wrapper-list, .blog-post-wrapper-compact'));

          // Dedupe by normalized URL, keeping first appearance -- a
          // defensive step against the documented Grid-layout nesting
          // quirk ever producing a genuine duplicate anchor for the
          // same post within one widget (not observed live, but cheap
          // to guard against).
          var seenPaths = {};
          var cards = [];
          var cardData = [];
          for (var c = 0; c < rawCards.length; c++) {
            var data = readCard(rawCards[c]);
            if (!data || seenPaths[data.path]) continue;
            seenPaths[data.path] = true;
            cards.push(rawCards[c]);
            cardData.push(data);
          }

          console.log('[DGS Article] widget #' + w + ' cards found:', cardData.length);
          console.log('[DGS Article] widget #' + w + ' sequence:', cardData.map(function (d) { return d.title + ' -> ' + d.path; }));

          var index = -1;
          for (var i = 0; i < cardData.length; i++) {
            if (cardData[i].path === currentPath) { index = i; break; }
          }
          if (index === -1) continue; // not this widget -- try the next one

          console.log('[DGS Article] current article index in widget #' + w + ':', index);

          // A widget with only one post in it has no "previous"/"next"
          // to give, on either side -- nothing to show, not a broken
          // link.
          if (cardData.length < 2) {
            console.log('[DGS Article] only one post in this widget -- nav stays hidden');
            return;
          }

          var prevData = index > 0 ? cardData[index - 1] : null;
          var nextData = index < cardData.length - 1 ? cardData[index + 1] : null;
          console.log('[DGS Article] previous:', prevData && prevData.title, '| next:', nextData && nextData.title);
          if (!prevData && !nextData) return; // neither side readable -- stay hidden

          fillSide(nav, 'prev', prevData);
          fillSide(nav, 'next', nextData);
          nav.hidden = false;
          console.log('[DGS Article] prev-next rendered');
          return;
        }
        // Current post never turned up in any pillar's first page --
        // fail gracefully (see file header comment above). nav stays
        // hidden; no partial/guessed state is ever shown.
        console.log('[DGS Article] current article not found in any growth-hub widget -- nav stays hidden');
      })
      .catch(function (err) {
        // Network failure, non-OK response, or unparseable HTML -- same
        // graceful no-op as "not found" above.
        console.log('[DGS Article] prev/next fetch failed:', err && err.message);
      });
  }

  function scanForNav() {
    var nav = document.querySelector('[data-blog-prev-next]');
    if (nav) initPrevNext(nav);
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(function () {
    scanForNav(); // covers a normal SSR page, or one with no entrance animation
    new MutationObserver(scanForNav).observe(document.body, { childList: true, subtree: true });
  });
})();