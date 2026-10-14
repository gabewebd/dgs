/* ============================================================
   DIGITAL GROWTHSCALE — MAIN JAVASCRIPT
   ------------------------------------------------------------
   Multi-page interactions: nav toggle, FAQ accordion,
   scroll-reveal, resource filters, footer year.
   GHL-compatible — no global event listeners that could
   conflict with GoHighLevel's native scripts.
   ============================================================ */

(function () {
  'use strict';

  // GHL-safety gate: dgs-common.css keeps images and .dgs-reveal elements
  // visible by default and only hides/fades them once this class confirms
  // main.js actually loaded and executed (see "IMAGE LOAD FADE-IN" and
  // ".dgs-reveal" in dgs-common.css). Must stay the very first statement in
  // this IIFE — anything that could throw before this line would leave a
  // page's images/cards permanently invisible on the old architecture, which
  // is exactly the failure mode this exists to prevent. If a page (e.g. a
  // GHL blog template) never loads this script at all, the class is simply
  // never added and everything stays at its visible default.
  document.documentElement.classList.add('dgs-js');

  // Detect touch capability and add class to html
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.documentElement.classList.add('dgs-is-touch');
  }

  /* ─── IMAGE LOAD FADE-IN (site-wide) ───
     CSS (dgs-common.css) keeps every <img> at opacity:1 by default and only
     starts fading new ones from 0 once html.dgs-js is set (see "IMAGE LOAD
     FADE-IN" there). Here we add .dgs-img-loaded once each image has
     actually finished loading (or errored out, so a broken image never
     stays invisible forever) rather than the instant its bytes arrive.
     Images already cached/complete by the time this runs resolve instantly
     with no visible fade.

     wireImageFade is reused (not just called once here) because this is a
     GHL page: widgets like the native Blog Posts element inject their own
     <img> tags asynchronously, after this initial querySelectorAll pass has
     already run. An image that never gets wired never gets .dgs-img-loaded,
     so it would sit at opacity:0 forever under the html.dgs-js rule -
     exactly the "blog images appear then disappear" symptom. The
     MutationObserver below (site-wide DOM watcher) calls this same function
     on every <img> added later, GHL-injected or our own. */
  const wireImageFade = function (img) {
    if (!img || img.classList.contains('dgs-no-fade') || img.dataset.dgsFadeWired) return;
    img.dataset.dgsFadeWired = '1';
    const markLoaded = function () {
      img.classList.add('dgs-img-loaded');
    };
    if (img.complete) {
      markLoaded();
    } else {
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', markLoaded, { once: true });
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll('img:not(.dgs-no-fade)'), wireImageFade);

  /* ─── LENIS SMOOTH SCROLL + GSAP SCROLLTRIGGER INTEGRATION ───
     Smooth scrolling is initialised from ONE place so every page that loads
     main.js behaves identically. If a page shipped without the Lenis library
     tag, we inject it once on demand — this keeps the motion system consistent
     across every page without duplicating <script> tags site-wide. Users who
     ask for reduced motion keep plain native scrolling. */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── SHARED HELPERS (used by the modules further down) ─── */
  // Run fn once the DOM is parsed. main.js is sometimes injected after
  // DOMContentLoaded (Growth Hub loads it via the DOM API), so a bare
  // DOMContentLoaded listener would never fire there.
  function dgsWhenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  // True when the page still loads a legacy standalone script by URL.
  function dgsLegacyScript(file) {
    return !!document.querySelector('script[src*="/js/' + file + '"]');
  }
  // Pages rebuilt for the consolidated assets carry data-dgs-css on <main>
  // (and the page-scope classes on <body>).
  const dgsConsolidatedPage = !!document.querySelector('[data-dgs-css], link[href$="css/styles.css"]');
  // Page-scope fallback: styles.css scopes page sections with
  // :where(.dgs-css-*) on <body>. If a host platform rewrote <body>'s
  // class list, restore it from the copy kept on <main>.
  (function restorePageScope() {
    const carrier = document.querySelector('main[data-dgs-css]');
    if (!carrier || !document.body) return;
    carrier.getAttribute('data-dgs-css').split(/\s+/).forEach(function (c) {
      if (c && !document.body.classList.contains(c)) document.body.classList.add(c);
    });
    if (!document.body.classList.contains('dgs-page')) document.body.classList.add('dgs-page');
  })();
  // Initialise one module in isolation.
  function dgsModule(name, opts, fn) {
    if (opts.legacyFile && dgsLegacyScript(opts.legacyFile)) return;
    if (opts.consolidatedOnly && !dgsConsolidatedPage) return;
    try { fn(); } catch (err) { if (window.console) console.error('[DGS] module "' + name + '" failed', err); }
  }


  function startLenis() {
    if (window.dgsLenis || typeof Lenis === 'undefined') return;
    // autoToggle intentionally omitted — scroll stop/start is called explicitly
    // in openMobileMenu()/closeMobileMenu() below (autoToggle proved unreliable
    // at restarting scroll after the mobile menu closed).
    const lenis = new Lenis({ autoRaf: true, anchors: true });

    // Drive GSAP ScrollTrigger from Lenis when GSAP is present.
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }

    // Drive the shared scroll dispatcher from Lenis too, so scroll-linked
    // effects stay in sync with the smoothed position. Bound here rather than
    // at the dispatcher so it works even when Lenis is lazy-loaded and
    // startLenis() runs after the dispatcher was set up (function
    // declarations hoist, so dgsRequestScrollTick is already defined).
    lenis.on('scroll', dgsRequestScrollTick);

    window.dgsLenis = lenis;
  }

  function initGSAP(callback) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
      }
      if (callback) callback();
      return;
    }
    if (document.querySelector('script[data-dgs-gsap]')) {
      if (callback) {
        window.addEventListener('dgs-gsap-ready', callback, { once: true });
      }
      return;
    }
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js';
    s1.async = true;
    s1.setAttribute('data-dgs-gsap', '');
    s1.onload = function () {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js';
      s2.async = true;
      s2.onload = function () {
        if (window.gsap && window.ScrollTrigger) {
          window.gsap.registerPlugin(window.ScrollTrigger);
          if (window.dgsLenis) {
            window.dgsLenis.on('scroll', window.ScrollTrigger.update);
          }
          window.dispatchEvent(new CustomEvent('dgs-gsap-ready'));
          if (callback) callback();
        }
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }

  function initSmoothScroll() {
    if (prefersReducedMotion) return;                 // honour reduced-motion
    if (typeof Lenis !== 'undefined') { startLenis(); }
    else if (!document.querySelector('script[data-dgs-lenis]')) {
      // Page didn't include Lenis — load it once, then initialise on load.
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/lenis@1.3.25/dist/lenis.min.js';
      s.async = true;
      s.setAttribute('data-dgs-lenis', '');
      s.onload = startLenis;
      document.head.appendChild(s);
      if (!document.querySelector('link[href*="lenis"]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'https://unpkg.com/lenis@1.3.25/dist/lenis.css';
        document.head.appendChild(l);
      }
    }
    initGSAP();
  }

  initSmoothScroll();

  /* ─── MOBILE NAV — PREMIUM OFF-CANVAS DRAWER ─── */
  const navToggle = document.getElementById('dgsNavToggle');
  const mobileMenu = document.getElementById('dgsMobileMenu');
  const mobileBackdrop = document.getElementById('dgsMobileBackdrop');
  const mobileClose = document.getElementById('dgsMobileClose');
  // Some pages don't include a dedicated backdrop element (dgs-mobile-backdrop).
  // Keep this logic resilient to avoid breaking tap interactions.
  const mobileBackdropAlt = document.querySelector('.dgs-mobile-backdrop');



  function openMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    if (mobileBackdrop) mobileBackdrop.classList.add('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('dgs-menu-open');
    document.body.classList.add('dgs-menu-open');
    // .dgs-mobile-menu is `position: fixed` but lives inside .dgs-header.
    // If the header carries its scroll-driven hide transform
    // (.dgs-header--hidden, translateY(-100%)) when the drawer opens, that
    // transform creates a new containing block and the "fixed" drawer
    // starts tracking the transformed header instead of the viewport —
    // it renders offset upward, leaving a gap of page content at the
    // bottom. Force the header visible for as long as the menu is open.
    var headerEl = document.querySelector('.dgs-header');
    if (headerEl) headerEl.classList.remove('dgs-header--hidden');
    document.body.classList.remove('dgs-header-hidden');
    // Explicitly stop Lenis rather than relying on its `autoToggle` option —
    // autoToggle only works on very recent Safari/Chrome/Firefox and needs
    // Lenis's own recommended CSS, which this site doesn't have. Without
    // this, Lenis can fail to restart after the menu closes and scroll
    // appears dead until a refresh.
    if (window.dgsLenis && typeof window.dgsLenis.stop === 'function') {
      window.dgsLenis.stop();
    }
  }

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (mobileBackdrop) mobileBackdrop.classList.remove('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('dgs-menu-open');
    document.body.classList.remove('dgs-menu-open');
    if (window.dgsLenis && typeof window.dgsLenis.start === 'function') {
      window.dgsLenis.start();
    }
    // Reset internal scroll so a reopen always starts at the top instead of
    // resuming wherever the user last scrolled to inside the drawer. Waits
    // out the full close transition (clip-path/visibility, 0.55s in
    // dgs-common.css's .dgs-mobile-menu rule) before resetting scrollTop,
    // since visibility only flips to hidden once that transition finishes —
    // resetting any earlier would visibly jerk the still-partly-visible
    // panel back to the top mid-close-animation.
    setTimeout(function () { mobileMenu.scrollTop = 0; }, 600);
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      if (mobileMenu.classList.contains('is-open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener('click', closeMobileMenu);
  }

  // Close mobile menu when clicking any mobile link
  document.querySelectorAll('.dgs-mobile-links a, .dgs-mobile-menu a').forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  // Use whichever backdrop exists (some pages only render it as a CSS layer / element in header)
  const backdropToUse = mobileBackdrop || mobileBackdropAlt;
  if (backdropToUse) {
    backdropToUse.addEventListener('click', closeMobileMenu);
  }


  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('is-open')) {
      closeMobileMenu();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024 && mobileMenu && mobileMenu.classList.contains('is-open')) {
      closeMobileMenu();
    }
  });

  // Mobile nav accordion — About / Solutions / Industries / Growth Hub
  document.querySelectorAll('.dgs-mobile-link-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var submenu = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!submenu) return;
      var isOpen = submenu.classList.contains('is-open');

      // Accordion: close any other open submenu first
      document.querySelectorAll('.dgs-mobile-submenu.is-open').forEach(function (openSubmenu) {
        if (openSubmenu !== submenu) {
          openSubmenu.classList.remove('is-open');
          var openToggle = document.querySelector('.dgs-mobile-link-toggle[aria-controls="' + openSubmenu.id + '"]');
          if (openToggle) openToggle.setAttribute('aria-expanded', 'false');
        }
      });

      submenu.classList.toggle('is-open', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ─── DYNAMIC NAVBAR ACTIVE LINK LOGIC ─── */
  function updateActiveNavLinks() {
    var rawPath = window.location.pathname.toLowerCase();
    
    // Normalize path parts
    var pathParts = rawPath.split('/').filter(Boolean);
    var filename = pathParts.length ? pathParts[pathParts.length - 1] : '';
    var cleanFilename = filename.replace(/\.html$/, '');

    var normPath = rawPath;
    if (normPath.endsWith('.html')) {
      normPath = normPath.slice(0, -5);
    }
    if (normPath.length > 1 && normPath.endsWith('/')) {
      normPath = normPath.slice(0, -1);
    }

    var isHome =
      normPath === '' ||
      normPath === '/' ||
      cleanFilename === '' ||
      cleanFilename === 'index';

    var desktopNav = document.querySelector('.dgs-nav-links');
    var mobileNav = document.querySelector('.dgs-mobile-links');

    if (desktopNav) {
      desktopNav.querySelectorAll('a').forEach(function (el) {
        el.classList.remove('is-active');
      });
    }
    if (mobileNav) {
      mobileNav.querySelectorAll('a').forEach(function (el) {
        el.classList.remove('is-active');
      });
    }

    function getNormalizedHref(link) {
      var href = link.getAttribute('href');
      if (!href) return null;
      var clean = href.split('#')[0].split('?')[0].toLowerCase();
      if (clean.length > 1 && clean.endsWith('/')) {
        clean = clean.slice(0, -1);
      }
      if (clean.endsWith('.html')) {
        clean = clean.slice(0, -5);
      }
      return clean;
    }

    if (isHome) {
      if (desktopNav) {
        var homeDesktop = desktopNav.querySelector('a[href="/"], a[href="/index.html"], a[href="./"]');
        if (homeDesktop) homeDesktop.classList.add('is-active');
      }
      if (mobileNav) {
        var homeMobile = mobileNav.querySelector('a[href="/"], a[href="/index.html"], a[href="./"]');
        if (homeMobile) homeMobile.classList.add('is-active');
      }
      return;
    }

    function matchesPath(cleanHref) {
      if (!cleanHref || cleanHref === '' || cleanHref === '/' || cleanHref === '/index') return false;

      var target = cleanHref.replace(/^\//, ''); // e.g. "about", "solutions", "industries"

      if (normPath === cleanHref || normPath.endsWith('/' + target)) return true;
      if (cleanFilename === target) return true;
      if (normPath.includes('/' + target + '/') || pathParts.indexOf(target) !== -1) return true;
      if (target === 'about' && (cleanFilename === 'careers' || cleanFilename === 'trust')) return true;

      return false;
    }

    // 1. Desktop Nav Matching
    if (desktopNav) {
      var topLinks = desktopNav.querySelectorAll(':scope > a, :scope > .dgs-nav-item > a.dgs-dropdown-toggle');
      var matched = false;

      topLinks.forEach(function (link) {
        var clean = getNormalizedHref(link);
        if (matchesPath(clean)) {
          link.classList.add('is-active');
          matched = true;
        }
      });

      if (!matched) {
        var dropdownItems = desktopNav.querySelectorAll('.dgs-dropdown-item');
        dropdownItems.forEach(function (item) {
          var clean = getNormalizedHref(item);
          if (matchesPath(clean) && !matched) {
            var parentToggle = item.closest('.dgs-nav-item');
            var toggleLink = parentToggle ? parentToggle.querySelector('.dgs-dropdown-toggle') : null;
            if (toggleLink) {
              toggleLink.classList.add('is-active');
              matched = true;
            }
          }
        });
      }
    }

    // 2. Mobile Nav Matching
    if (mobileNav) {
      var mobileLinks = mobileNav.querySelectorAll('a');
      var mobileMatched = false;

      function activateParentToggle(link) {
        var submenu = link.closest('.dgs-mobile-submenu');
        if (!submenu) return;
        var toggle = mobileNav.querySelector('.dgs-mobile-link-toggle[aria-controls="' + submenu.id + '"]');
        if (toggle) {
          toggle.classList.add('is-active');
          toggle.setAttribute('aria-expanded', 'true');
          submenu.classList.add('is-open');
        }
      }

      var currentHash = (window.location.hash || '').toLowerCase();

      mobileLinks.forEach(function (link) {
        var clean = getNormalizedHref(link);
        if (!matchesPath(clean)) return;

        // Submenu links that only differ by #hash (e.g. Growth Hub's
        // Learn/Implement/Inspire all point at /growth-hub) would otherwise
        // ALL match at once, since matchesPath ignores the hash entirely.
        // Only light up the one whose hash matches the current URL (or the
        // bare, hash-less entry when there's no hash in the URL).
        if (link.closest('.dgs-mobile-submenu')) {
          var href = link.getAttribute('href') || '';
          var hashIdx = href.indexOf('#');
          var linkHash = hashIdx === -1 ? '' : href.slice(hashIdx).toLowerCase();
          if (linkHash !== currentHash) return;
        }

        link.classList.add('is-active');
        activateParentToggle(link);
        mobileMatched = true;
      });

      if (!mobileMatched) {
        if (cleanFilename === 'careers' || cleanFilename === 'trust') {
          var mobileAbout = mobileNav.querySelector('a[href="/about"], a[href="/about.html"]');
          if (mobileAbout) {
            mobileAbout.classList.add('is-active');
            activateParentToggle(mobileAbout);
          }
        }
      }
    }
  }

  updateActiveNavLinks();


  /* ─── FAQ ACCORDION (Event Delegation) ─── */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.dgs-faq-question');
    if (!btn) return;

    const item = btn.closest('.dgs-faq-item');
    if (!item) return;

    const answer = item.querySelector('.dgs-faq-answer');
    if (!answer) return;

    const isOpen = item.classList.contains('is-open');

    // Close all siblings
    const list = item.closest('.dgs-faq-list');
    if (list) {
      list.querySelectorAll('.dgs-faq-item.is-open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('is-open');
          openItem.querySelector('.dgs-faq-question').setAttribute('aria-expanded', 'false');
          openItem.querySelector('.dgs-faq-answer').style.maxHeight = null;
        }
      });
    }

    // Toggle current
    if (isOpen) {
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      answer.style.maxHeight = null;
    } else {
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });





  /* ─── RESOURCE CATEGORY FILTER ─── */
  var categoryLinks = document.querySelectorAll('.dgs-resources-categories a[data-filter]');
  var articleCards = document.querySelectorAll('.dgs-article-card[data-category]');

  if (categoryLinks.length && articleCards.length) {
    categoryLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var filter = link.getAttribute('data-filter');

        // Update active state
        categoryLinks.forEach(function (l) { l.classList.remove('is-active'); });
        link.classList.add('is-active');

        // Filter cards
        articleCards.forEach(function (card) {
          if (filter === 'all' || card.getAttribute('data-category') === filter) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }


  /* ─── RESOURCE SEARCH ─── */
  var searchInput = document.getElementById('dgsResourceSearch');
  if (searchInput && articleCards.length) {
    searchInput.addEventListener('input', function () {
      var query = searchInput.value.toLowerCase().trim();

      // Reset category filter to "all"
      categoryLinks.forEach(function (l) { l.classList.remove('is-active'); });
      var allLink = document.querySelector('.dgs-resources-categories a[data-filter="all"]');
      if (allLink) allLink.classList.add('is-active');

      articleCards.forEach(function (card) {
        var text = card.textContent.toLowerCase();
        card.style.display = text.indexOf(query) !== -1 ? '' : 'none';
      });
    });
  }


  /* ─── SCROLL / VIEW-PORT ANIMATIONS (site-wide) ───
     Make sure every element marked with .dgs-reveal animates on scroll.
     Also supports elements that are NOT explicitly marked as dgs-reveal by using
     a progressive enhancement pass: all direct children of sections get revealed.
  */
  const revealObserverEnabled = ('IntersectionObserver' in window);

  // Selector shared by the initial pass below AND the MutationObserver
  // further down, so newly-inserted nodes (GHL widgets, our own async
  // content) get wired up the exact same way as what was in the DOM at
  // load. Explicit opt-in for implicit reveal (keeps behavior controlled):
  // add `data-animate="true"` or class `dgs-animate` to any element you
  // want animated.
  const DGS_REVEAL_SELECTOR = '.dgs-reveal, .dgs-page section [data-animate], .dgs-page section .dgs-animate';

  const applyReveal = function (el) {
    if (!el) return;
    el.classList.add('is-visible');
  };

  let revealObserver = null;
  if (revealObserverEnabled && !prefersReducedMotion) {
    // Reveal ONCE, then stop observing. Premium interfaces let content settle
    // instead of re-animating every time it scrolls back into view — the old
    // bidirectional replay read as busy/distracting.
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    });
  }

  /* wireRevealTarget is reused (not just called once here) because on a GHL
     page, content after the native Blog Posts widget can be rebuilt as
     fresh DOM nodes once GHL finishes processing the page - nodes this
     initial querySelectorAll pass never saw. A .dgs-reveal element that is
     never wired never gets .is-visible, so it stays at the html.dgs-js
     opacity:0 default forever (Inspire cards, the final CTA, later
     sections). The MutationObserver below calls this same function on
     every matching node added later, wherever it came from. */
  const wireRevealTarget = function (el) {
    if (!el || el.dataset.dgsRevealWired) return;
    el.dataset.dgsRevealWired = '1';
    if (revealObserver) {
      revealObserver.observe(el);
    } else {
      // No IntersectionObserver support, or reduced-motion: show immediately.
      applyReveal(el);
    }
  };

  const initialAnimateTargets = Array.from(document.querySelectorAll(DGS_REVEAL_SELECTOR));

  // Auto-stagger: when several reveal elements share the same parent (a card
  // grid, a list, a row of buttons) they cascade in sequence rather than all
  // firing at once — the coordinated, "settling" feel of Linear/Stripe.
  // Standalone elements get no delay; the index is capped so large grids never
  // feel slow. The delay itself is applied in CSS via the --dgs-reveal-i var.
  // Scoped to the initial pass only; late-inserted nodes (see above) still
  // get revealed correctly, just without the stagger offset.
  if (!prefersReducedMotion) {
    const staggerGroups = new Map();
    initialAnimateTargets.forEach(function (el) {
      const parent = el.parentElement;
      if (!parent) return;
      if (!staggerGroups.has(parent)) staggerGroups.set(parent, []);
      staggerGroups.get(parent).push(el);
    });
    staggerGroups.forEach(function (list) {
      if (list.length < 2) return;
      list.forEach(function (el, i) {
        el.style.setProperty('--dgs-reveal-i', Math.min(i, 6));
      });
    });
  }

  initialAnimateTargets.forEach(wireRevealTarget);

  /* ─── LATE-DOM WATCHER (site-wide) ───
     Single MutationObserver covering the actual root cause behind "content
     disappears after GHL processes the page": GHL's native widgets (Blog
     Posts, etc.) don't just fill a placeholder - they can rebuild a chunk of
     the live DOM with fresh nodes after this script's initial passes above
     already ran. Anything - GHL's own markup or ours - that shows up this
     way was never wired into the image fade-in or scroll-reveal systems,
     so it would sit permanently at the html.dgs-js opacity:0 default. This
     watches for added nodes and runs the exact same wiring functions used
     above on them, whenever they appear. Also nudges GSAP's ScrollTrigger
     (used by the final CTA / disperse animations) to recompute its
     trigger positions, since content appearing later can shift page height
     enough to make earlier-calculated scroll ranges stale, which is a
     plausible reason a scrub-triggered CTA never reaches opacity:1. */
  if ('MutationObserver' in window) {
    let scrollTriggerRefreshTimer = null;
    const scheduleScrollTriggerRefresh = function () {
      if (typeof window.ScrollTrigger === 'undefined') return;
      if (scrollTriggerRefreshTimer) clearTimeout(scrollTriggerRefreshTimer);
      scrollTriggerRefreshTimer = setTimeout(function () {
        window.ScrollTrigger.refresh();
      }, 200);
    };

    const lateDomObserver = new MutationObserver(function (mutations) {
      let sawGrowth = false;
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return; // elements only
          sawGrowth = true;

          if (node.matches('img:not(.dgs-no-fade)')) wireImageFade(node);
          node.querySelectorAll && node.querySelectorAll('img:not(.dgs-no-fade)').forEach(wireImageFade);

          if (node.matches(DGS_REVEAL_SELECTOR)) wireRevealTarget(node);
          node.querySelectorAll && node.querySelectorAll(DGS_REVEAL_SELECTOR).forEach(wireRevealTarget);
        });
      });
      if (sawGrowth) scheduleScrollTriggerRefresh();
    });

    lateDomObserver.observe(document.body, { childList: true, subtree: true });
  }


  /* ─── ANIMATED COUNTERS (site-wide) ───
     Any element with data-count-to="900" counts up from 0 the first time it
     scrolls into view. toLocaleString formats the thousands separator, so
     "10000" renders as "10,000" without extra markup. Static prefix/unit
     characters (~, +, %) live in sibling elements and are untouched. */
  const counterElements = Array.from(document.querySelectorAll('[data-count-to]'));

  const runCounter = function (el) {
    const target = parseFloat(el.getAttribute('data-count-to'));
    if (isNaN(target)) return;

    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString('en-US');
      return;
    }

    const duration = 1400;
    let start = null;

    const easeOutExpo = function (t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const step = function (timestamp) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const value = Math.round(easeOutExpo(progress) * target);
      el.textContent = value.toLocaleString('en-US');
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (counterElements.length) {
    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });

      counterElements.forEach(function (el) { counterObserver.observe(el); });
    } else {
      counterElements.forEach(runCounter);
    }
  }


  /* ─── SHARED SCROLL DISPATCHER (rAF-batched) ───
     One passive listener drives every scroll-linked effect on the page.
     Subscribers run at most once per animation frame instead of once per
     scroll event, so layout reads are batched into a single frame and
     never pile up on the scroll thread. Replaces the per-feature
     window scroll listeners that each did their own getBoundingClientRect. */
  var dgsScrollSubs = [];
  var dgsScrollTicking = false;

  function dgsFlushScroll() {
    dgsScrollTicking = false;
    for (var i = 0; i < dgsScrollSubs.length; i++) {
      dgsScrollSubs[i]();
    }
  }

  function dgsRequestScrollTick() {
    if (!dgsScrollTicking) {
      dgsScrollTicking = true;
      window.requestAnimationFrame(dgsFlushScroll);
    }
  }

  /* Subscribe a scroll-linked callback and run it once for initial state. */
  function dgsOnScroll(fn) {
    dgsScrollSubs.push(fn);
    fn();
  }

  window.addEventListener('scroll', dgsRequestScrollTick, { passive: true });
  window.addEventListener('resize', dgsRequestScrollTick, { passive: true });

  /* ─── HEADER SCROLL EFFECT + HIDE-ON-DOWN / REVEAL-ON-UP ─── */
  var header = document.querySelector('.dgs-header');
  var nav = document.querySelector('.dgs-nav');
  if (header && nav) {
    var lastScrollY = window.scrollY;
    var REVEAL_AT = 80;   // px scrolled before the header may hide
    var SCROLL_DELTA = 6; // ignore tiny scroll jitters

    function updateHeaderScroll() {
      // The mobile drawer is `position: fixed` inside .dgs-header; letting
      // the header pick up its hide transform while the drawer is open
      // would drag the "fixed" drawer along with it (see openMobileMenu).
      if (document.documentElement.classList.contains('dgs-menu-open')) return;
      var y = window.scrollY;

      // Glass / solid background state
      if (y > 20) {
        header.classList.add('is-scrolled');
        nav.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
        nav.classList.remove('is-scrolled');
      }

      // Slide up when scrolling down, slide back in when scrolling up
      var diff = y - lastScrollY;
      if (Math.abs(diff) > SCROLL_DELTA) {
        if (diff > 0 && y > REVEAL_AT) {
          header.classList.add('dgs-header--hidden');
        } else {
          header.classList.remove('dgs-header--hidden');
        }
        lastScrollY = y;
      }
      if (y <= REVEAL_AT) header.classList.remove('dgs-header--hidden');

      // Mirror the header's hidden state onto <body> as a plain class so
      // other fixed/sticky elements (e.g. the Growth Hub jump nav) can
      // react to it with a simple, universally-supported descendant
      // selector instead of :has(), which some mobile browsers don't
      // support — a silent :has() miss would leave that nav pinned below
      // a header that's no longer there, with a dead gap above it.
      document.body.classList.toggle('dgs-header-hidden', header.classList.contains('dgs-header--hidden'));
    }
    dgsOnScroll(updateHeaderScroll);
  }

  /* ─── HERO TRUST-STRIP ACCENT — IDLE DRIFT + MOUSE FOLLOW ───
     The gradient bar riding the top hairline drifts continuously on its
     own, but when the cursor moves near the top of the strip it snaps to
     track the pointer, then eases back to its idle drift on leave. */
  var accentPanel = document.querySelector('.dgs-hero-stats-panel');
  // The whole hero section is the magnetic field — the glow follows the
  // cursor's X anywhere inside it, not just near the top edge.
  var accentZone = accentPanel && (accentPanel.closest('section') || accentPanel.closest('#dgs-hero'));
  if (accentPanel && accentZone) {
    var accentW = 240;      // glow width (kept in sync with CSS var)
    var accentCenter = 0;   // resting position: horizontally centered
    var accentLeaveTimer = null;

    function sizeAccent() {
      var w = accentPanel.getBoundingClientRect().width;
      accentW = Math.max(160, Math.min(w * 0.28, 300));
      accentCenter = (w - accentW) / 2;
      accentPanel.style.setProperty('--accent-w', accentW + 'px');
      // rest centered unless the pointer is actively tracking
      if (!accentPanel.classList.contains('is-accent-tracking')) {
        accentPanel.style.setProperty('--accent-x', accentCenter + 'px');
      }
    }
    sizeAccent();
    window.addEventListener('resize', sizeAccent, { passive: true });

    function releaseAccent() {
      accentPanel.classList.remove('is-accent-tracking');
      accentPanel.style.setProperty('--accent-x', accentCenter + 'px'); // ease back to middle
    }

    window.addEventListener('mousemove', function (e) {
      var rect = accentPanel.getBoundingClientRect();
      var zone = accentZone.getBoundingClientRect();
      var insideSection = e.clientY >= zone.top && e.clientY <= zone.bottom &&
        e.clientX >= zone.left && e.clientX <= zone.right;

      if (insideSection) {
        if (accentLeaveTimer) { clearTimeout(accentLeaveTimer); accentLeaveTimer = null; }
        var x = e.clientX - rect.left - accentW / 2;
        x = Math.max(0, Math.min(x, rect.width - accentW));
        accentPanel.style.setProperty('--accent-x', x + 'px');
        accentPanel.classList.add('is-accent-tracking');
      } else if (accentPanel.classList.contains('is-accent-tracking') && !accentLeaveTimer) {
        // small grace period so brief exits don't snap back harshly
        accentLeaveTimer = setTimeout(function () {
          releaseAccent();
          accentLeaveTimer = null;
        }, 220);
      }
    }, { passive: true });
  }

  /* ─── FOOTER YEAR ─── */
  var yearEl = document.getElementById('dgsYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ─── INTERACTIVE NODE ANIMATION (B2B SAAS LEVEL) ─── */
  const nodes = document.querySelectorAll('.network-node');
  const tooltip = document.getElementById('dgsNetworkTooltip');
  
  if (nodes.length && tooltip) {
    const tooltipText = tooltip.querySelector('.dgs-network-tooltip-text');
    const tooltipVal = tooltip.querySelector('.dgs-network-tooltip-val');

    const metrics = {
      ai: { label: 'AI Strategy:', val: '85% Efficiency Gain' },
      crm: { label: 'CRM Setup:', val: '3x Pipeline Visibility' },
      ops: { label: 'Operations:', val: '45% Overhead Cut' },
      talent: { label: 'Staffing:', val: '10+ Days Faster Hire' },
      data: { label: 'Data Analytics:', val: 'Real-Time Insights' }
    };

    nodes.forEach(node => {
      let nodeType = '';
      node.classList.forEach(cls => {
        if (cls.startsWith('node-')) {
          nodeType = cls.split('-')[1];
        }
      });

      if (!metrics[nodeType]) return;

      node.addEventListener('mouseenter', function () {
        const dot = node.querySelector('.node-dot');
        const pulse = node.querySelector('.node-pulse');
        
        if (window.gsap) {
          window.gsap.to(dot, { attr: { r: 11 }, duration: 0.25, ease: 'power2.out' });
          window.gsap.to(pulse, { attr: { r: 30 }, opacity: 0.6, duration: 0.25, ease: 'power2.out' });
        }

        // Set tooltip text
        tooltipText.textContent = metrics[nodeType].label;
        tooltipVal.textContent = metrics[nodeType].val;

        // Position tooltip
        const container = document.querySelector('.dgs-hero-systems-network-centered');
        const transformAttr = node.getAttribute('transform');
        const match = transformAttr.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          const nodeX = parseFloat(match[1]);
          const nodeY = parseFloat(match[2]);

          const svg = container.querySelector('.dgs-network-svg');
          const svgRect = svg.getBoundingClientRect();
          
          const scaleX = svgRect.width / 800;
          const scaleY = svgRect.height / 240;

          const tooltipX = nodeX * scaleX;
          const tooltipY = nodeY * scaleY;

          tooltip.style.left = `${tooltipX}px`;
          tooltip.style.top = `${tooltipY}px`;
          tooltip.classList.add('is-active');
        }
      });

      node.addEventListener('mouseleave', function () {
        const dot = node.querySelector('.node-dot');
        const pulse = node.querySelector('.node-pulse');

        if (window.gsap) {
          window.gsap.to(dot, { attr: { r: 8 }, duration: 0.25, ease: 'power2.out' });
          window.gsap.to(pulse, { attr: { r: 18 }, opacity: 0.3, duration: 0.25, ease: 'power2.out' });
        }

        tooltip.classList.remove('is-active');
      });
    });
  }

  /* ─── BUSINESS CHALLENGES — DISPERSING CLOUD + CHIP REVEAL (GSAP) ─── */
  (function initChallenges() {
    var section = document.getElementById('dgs-challenges');
    if (!section) return;

    initGSAP(function () {
      if (!window.gsap) return;
      var gsap = window.gsap;
      if (window.ScrollTrigger) {
        gsap.registerPlugin(window.ScrollTrigger);
      }

      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var isMobile = window.matchMedia('(max-width: 768px)').matches;

      var colLeft = section.querySelector('.dgs-cloud-column--left');
      var colRight = section.querySelector('.dgs-cloud-column--right');
      if (!colLeft || !colRight) return;

      if (reduceMotion) {
        gsap.set([colLeft, colRight], { opacity: 0 });
      } else {
        var master = gsap.timeline({ paused: true });
        
        // Disperse left column straight to the left (no slanting)
        master.to(colLeft, {
          x: isMobile ? -200 : -450,
          ease: 'none',
          duration: 1
        }, 0);
        master.to(colLeft, {
          opacity: 0,
          ease: 'power1.in',
          duration: 0.55
        }, isMobile ? 0.3 : 0.45);

        // Disperse right column straight to the right (no slanting)
        master.to(colRight, {
          x: isMobile ? 200 : 450,
          ease: 'none',
          duration: 1
        }, 0);
        master.to(colRight, {
          opacity: 0,
          ease: 'power1.in',
          duration: 0.55
        }, isMobile ? 0.3 : 0.45);

        var cloud = section.querySelector('.dgs-challenge-cloud');
        var updateDisperse = function () {
          var vh = window.innerHeight || document.documentElement.clientHeight;
          var p;
          if (isMobile && cloud) {
            var cr = cloud.getBoundingClientRect();
            var center = cr.top + cr.height / 2;
            p = (0.72 * vh - center) / (0.44 * vh);
          } else {
            var r = section.getBoundingClientRect();
            p = (vh - r.top) / r.height;
          }
          p = p < 0 ? 0 : (p > 1 ? 1 : p);
          master.progress(p);
        };
        dgsOnScroll(updateDisperse);
        updateDisperse();
      }
    });
  })();

  /* ─── BUSINESS CHALLENGES — ACCORDION (expand to reveal photo + detail) ─── */
  (function initChallengeAccordion() {
    var acc = document.querySelector('.dgs-accordion');
    if (!acc) return;

    var items = Array.prototype.slice.call(acc.querySelectorAll('.dgs-accord-item'));
    if (!items.length) return;

    function setOpen(item, open) {
      item.classList.toggle('is-open', open);
      var header = item.querySelector('.dgs-accord-header');
      if (header) header.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    items.forEach(function (item, i) {
      var header = item.querySelector('.dgs-accord-header');
      if (!header) return;

      // Open on hover for desktop viewports only. On touch devices, a tap
      // fires synthetic mouseenter + click in sequence: mouseenter would
      // open the item first, then click's `willOpen` (computed from the
      // now-already-open state) would immediately close it again — the
      // accordion looked broken on mobile because every tap silently
      // canceled itself. dgs-is-touch is set once at the top of this file.
      if (!document.documentElement.classList.contains('dgs-is-touch')) {
        item.addEventListener('mouseenter', function () {
          items.forEach(function (other) {
            setOpen(other, other === item);
          });
        });
      }

      header.addEventListener('click', function () {
        var willOpen = !item.classList.contains('is-open');
        // Single-open accordion: collapse the others, toggle this one.
        items.forEach(function (other) { if (other !== item) setOpen(other, false); });
        setOpen(item, willOpen);
      });

      header.addEventListener('keydown', function (e) {
        var next = -1;
        if (e.key === 'ArrowDown') next = (i + 1) % items.length;
        else if (e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = items.length - 1;
        if (next > -1) {
          e.preventDefault();
          var nextHeader = items[next].querySelector('.dgs-accord-header');
          if (nextHeader) nextHeader.focus();
        }
      });
    });
  })();

  /* ─── 2.4 FEATURED SOLUTIONS 3D CAROUSEL ─── */
  (function () {
    const cards = document.querySelectorAll('.dgs-fsol-card');
    const dots = document.querySelectorAll('.dgs-fsol-dot');
    const prevBtn = document.querySelector('.dgs-fsol-nav-btn.prev');
    const nextBtn = document.querySelector('.dgs-fsol-nav-btn.next');
    
    if (cards.length > 0 && prevBtn && nextBtn) {
      let currentSlide = 0;
      const totalSlides = cards.length;
      
      function updateCarousel() {
        cards.forEach((card, idx) => {
          // Calculate rotating stacked indices: active is pos-0, next is pos-1, etc.
          const posIdx = (idx - currentSlide + totalSlides) % totalSlides;
          
          card.classList.remove('pos-0', 'pos-1', 'pos-2');
          card.classList.add(`pos-${posIdx}`);
        });
        
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentSlide);
        });
      }
      
      prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
      });
      
      nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
      });
      
      dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
          currentSlide = idx;
          updateCarousel();
        });
      });
      
      // Initialize
      updateCarousel();
    }
  })();

  /* ─── 2.6 OUR TRANSFORMATION FRAMEWORK TIMELINE SCROLL PROGRESS ─── */
  (function () {
    const timelineWrapper = document.querySelector('.dgs-timeline-wrapper');
    const progressLine = document.querySelector('.dgs-timeline-progress-line');
    const dots = document.querySelectorAll('.dgs-timeline-dot');
    
    if (timelineWrapper && progressLine) {
      function updateTimelineProgress() {
        const rect = timelineWrapper.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // The trigger line on the screen where the progress line's tip resides and dots activate
        const triggerPoint = viewportHeight * 0.65;
        
        // Progress starts when the top of the timeline wrapper reaches the triggerPoint
        const start = rect.top - triggerPoint;
        const total = rect.height || 1;
        
        let progress = -start / total;
        progress = Math.max(0, Math.min(1, progress));
        
        progressLine.style.transform = `scaleY(${progress})`;
        
        // The tip of the progress line in viewport coordinates
        const tipY = rect.top + rect.height * progress;
        
        // Light up dots dynamically as the progress line reaches each dot's vertical center position
        dots.forEach((dot) => {
          const dotRect = dot.getBoundingClientRect();
          const dotCenterY = dotRect.top + dotRect.height / 2;
          dot.classList.toggle('active', dotCenterY <= tipY);
        });
      }
      
      dgsOnScroll(updateTimelineProgress);
      updateTimelineProgress();
    }
  })();

  /* ─── 2.8 CLIENT SUCCESS PREVIEW & PRODUCT DIAGRAM ANIMATIONS ─── */
  (function () {
    const tabs = document.querySelectorAll('.dgs-success-tab');
    const panels = document.querySelectorAll('.dgs-success-panel');
    const diagrams = document.querySelectorAll('.dgs-cs-diagram-container');
    
    function playDiagramAnimation(diagram) {
      if (!diagram) return;
      diagram.classList.remove('is-animated');
      // Force DOM reflow so CSS transitions/animations restart cleanly
      void diagram.offsetWidth;
      diagram.classList.add('is-animated');
    }

    function resetDiagramAnimation(diagram) {
      if (!diagram) return;
      diagram.classList.remove('is-animated');
    }

    if (tabs.length > 0 && panels.length > 0) {
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetIndex = tab.getAttribute('data-tab');
          
          // Toggle active tab class
          tabs.forEach(t => t.classList.toggle('active', t === tab));
          
          // Toggle active panel class
          panels.forEach(panel => {
            const panelIndex = panel.getAttribute('data-panel');
            const isActive = panelIndex === targetIndex;
            panel.classList.toggle('active', isActive);
            const diagram = panel.querySelector('.dgs-cs-diagram-container');
            if (diagram) {
              if (isActive) {
                // Play animation freshly on tab selection/click
                setTimeout(() => playDiagramAnimation(diagram), 30);
              } else {
                // Reset inactive diagrams so they replay cleanly next time
                resetDiagramAnimation(diagram);
              }
            }
          });
        });
      });
    }

    // Viewport IntersectionObserver to trigger animation when scrolled into view
    if (diagrams.length > 0 && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const diagram = entry.target;
            const parentPanel = diagram.closest('.dgs-success-panel');
            if (parentPanel && parentPanel.classList.contains('active')) {
              playDiagramAnimation(diagram);
            }
          }
        });
      }, { threshold: 0.2 });

      diagrams.forEach(diagram => observer.observe(diagram));
    }
  })();

  /* ─── 2.9 GROWTH HUB ACCORDION SWITCHER ─── */
  (function () {
    const panels = document.querySelectorAll('.dgs-hub-panel');
    if (panels.length > 0) {
      panels.forEach(panel => {
        panel.addEventListener('click', () => {
          if (panel.classList.contains('active')) return;

          panels.forEach(p => p.classList.remove('active'));
          panel.classList.add('active');
        });
      });
    }
  })();

  /* ─── 2.10 CINEMATIC FINAL CTA ANIMATIONS (GSAP ScrollTrigger) — all final CTA sections ───
     One shared implementation for every page: no page hardcodes the "SCALE"
     watermark markup, this always creates it, centers it (xPercent/yPercent
     -50 around left:50%/top:78%, transform-origin stays the CSS default
     center so it scales from the middle), and scroll-scrubs it identically
     everywhere. Don't special-case index/faq here again; fix this block. */
  (function initFinalCTA() {
    const sections = document.querySelectorAll('.cinematic-cta-wrapper, .dgs-sol-final-cta, #dgs-final-cta');
    if (!sections.length) return;

    initGSAP(function () {
      if (!window.gsap) return;
      var gsap = window.gsap;
      if (window.ScrollTrigger) {
        gsap.registerPlugin(window.ScrollTrigger);
      }

      sections.forEach(function (section) {
        let giantText = section.querySelector('.final-cta-giant-bg-text');
        if (!giantText) {
          giantText = document.createElement('div');
          giantText.className = 'final-cta-giant-bg-text';
          giantText.textContent = 'SCALE';
          giantText.setAttribute('aria-hidden', 'true');
          section.appendChild(giantText);
        }

        giantText.style.position = 'absolute';
        giantText.style.top = '78%';
        giantText.style.left = '50%';
        giantText.style.bottom = 'auto';
        giantText.style.zIndex = '0';
        giantText.style.pointerEvents = 'none';
        giantText.style.userSelect = 'none';
        giantText.style.whiteSpace = 'nowrap';

        section.classList.add('has-dom-giant-text');
        section.classList.add('dgs-scale-enabled');

        // Force a synchronous layout flush before GSAP reads this element's
        // size. giantText was just created (or just switched from
        // display:none to display:block via .dgs-scale-enabled above) in
        // this same tick, so without this the browser may still report a
        // 0-width box. GSAP's xPercent/yPercent convert to a pixel offset
        // by measuring the element's current box — against 0 width that
        // conversion is 0px, so the "from" state paints with no centering
        // offset at all (left edge pinned to left:50% instead of centered),
        // which is what made the giant "SCALE" text appear shoved off to
        // one side instead of centered on some pages.
        void giantText.offsetWidth;

        const isMobile = window.innerWidth < 768;
        const startScale = isMobile ? 0.55 : 0.7;
        const targetScale = isMobile ? 0.95 : 1.3;

        gsap.fromTo(
          giantText,
          { y: 70, opacity: 0.1, scale: startScale, xPercent: -50, yPercent: -50 },
          {
            y: 0,
            opacity: 1,
            scale: targetScale,
            xPercent: -50,
            yPercent: -50,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              end: 'bottom bottom',
              scrub: true,
            }
          }
        );

        const heading = section.querySelector('.final-cta-heading, h2');
        const subline = section.querySelector('.final-cta-subline, p');
        const buttons = section.querySelector('.final-cta-buttons, .dgs-sol-final-ctas, .dgs-btn-saas');

        if (heading || subline || buttons) {
          const revealElements = [heading, subline, buttons].filter(Boolean);
          gsap.fromTo(
            revealElements,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.15,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                end: 'top 40%',
                scrub: true,
              }
            }
          );
        }
      });
    });
  })();

  /* ─── ENTERPRISE SAAS OVERLAY VISUALIZER OBSERVER (REPEATING SCROLL ANIMATION) ─── */
  function initEnterpriseVisualizers() {
    const overlayLayers = document.querySelectorAll('.dgs-overlay-layer, .dgs-timeline-overlay-container, .dgs-viz-card');
    if (!overlayLayers.length) return;

    // IntersectionObserver to trigger animation repeatedly on scroll in/out
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        const row = el.closest('.dgs-timeline-row');
        
        if (entry.isIntersecting) {
          el.classList.add('is-animated');
          if (row) row.classList.add('is-animated');
        } else {
          el.classList.remove('is-animated');
          if (row) row.classList.remove('is-animated');
        }
      });
    }, observerOptions);

    overlayLayers.forEach(el => {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnterpriseVisualizers);
  } else {
    initEnterpriseVisualizers();
  }

  /* ─── PEOPLE / IN-PRACTICE PANEL (solution "who it's for") ───
     Auto-cycles the role row to reveal the matching contextual
     product card. Chat-style cards type their message out instead
     of just fading in. Pauses off-screen, on hover/focus, or under
     reduced motion; a manual click on a role always wins and
     resets the timer. */
  (function initPeoplePracticePanels() {
    const panels = Array.from(document.querySelectorAll('.dgs-pv-people-panel'));
    if (!panels.length) return;

    panels.forEach(function (panel) {
      const stage = panel.querySelector('.dgs-pv-practice-stage');
      const roles = Array.from(panel.querySelectorAll('.dgs-pv-role'));
      const cards = Array.from(panel.querySelectorAll('.dgs-pv-practice-card'));
      if (!roles.length || !cards.length) return;

      // The "Who it's for" checklist sits beside the panel (same .dgs-sol-split
      // row) and lists the same personas in the same order — keep it in sync
      // with whichever role is active.
      const splitWrap = panel.closest('.dgs-sol-split');
      const checkItems = splitWrap ? Array.from(splitWrap.querySelectorAll('.dgs-check-grid .dgs-check-item')) : [];
      const syncChecklist = checkItems.length === roles.length;

      // Capture each chat card's full message once, before any typing pass clears it.
      cards.forEach(function (card) {
        const p = card.querySelector('.dgs-pv-practice-chat p');
        if (p) p.dataset.full = p.textContent.trim();
      });

      const cycleMs = parseInt(panel.getAttribute('data-autocycle'), 10) || 4200;
      let active = 0;
      let timer = null;
      let typeTimer = null;
      let paused = false;
      let inView = false;

      function typeCard(card) {
        const p = card.querySelector('.dgs-pv-practice-chat p');
        const reply = card.querySelector('.dgs-pv-chat-reply');
        if (!p) return;
        if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
        if (reply) reply.classList.remove('is-shown');
        const text = p.dataset.full || '';
        if (prefersReducedMotion) {
          p.textContent = text;
          if (reply) reply.classList.add('is-shown');
          return;
        }
        p.textContent = '';
        p.classList.add('is-typing');
        let i = 0;
        typeTimer = setInterval(function () {
          i++;
          p.textContent = text.slice(0, i);
          if (i >= text.length) {
            clearInterval(typeTimer);
            typeTimer = null;
            p.classList.remove('is-typing');
            if (reply) setTimeout(function () { reply.classList.add('is-shown'); }, 300);
          }
        }, 22);
      }

      function setActive(index) {
        active = (index + roles.length) % roles.length;
        roles.forEach(function (r, i) { r.classList.toggle('is-active', i === active); });
        cards.forEach(function (c, i) { c.classList.toggle('is-active', i === active); });
        if (syncChecklist) {
          checkItems.forEach(function (item, i) { item.classList.toggle('is-active', i === active); });
        }
        // Animate the stage to the new card's natural height so switching
        // between shorter/taller variants resizes smoothly, not suddenly.
        if (stage) stage.style.height = cards[active].offsetHeight + 'px';
        // Skip the typing pass while the panel is still off-screen so the
        // message doesn't finish typing before anyone can see it.
        if (panel.classList.contains('is-visible')) typeCard(cards[active]);
      }

      function tick() { setActive(active + 1); }

      function start() {
        if (timer || prefersReducedMotion || paused || !inView) return;
        timer = setInterval(tick, cycleMs);
      }
      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }
      function jump(index) {
        setActive(index);
        stop();
        start();
      }

      roles.forEach(function (r, i) { r.addEventListener('click', function () { jump(i); }); });

      panel.addEventListener('mouseenter', function () { paused = true; stop(); });
      panel.addEventListener('mouseleave', function () { paused = false; start(); });
      panel.addEventListener('focusin', function () { paused = true; stop(); });
      panel.addEventListener('focusout', function () { paused = false; start(); });

      setActive(0);

      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            inView = entry.isIntersecting;
            if (inView) {
              typeCard(cards[active]);
              start();
            } else {
              stop();
            }
          });
        }, { threshold: 0.4 });
        io.observe(panel);
      } else {
        inView = true;
        typeCard(cards[active]);
        start();
      }
    });
  })();

  /* ------------------------------------------------------------
     CLIENT SUCCESS CAROUSEL ("What this looks like in practice.")
     One stat+quote slide visible at a time; prev/next arrows
     step through the results.
     ------------------------------------------------------------ */
  document.querySelectorAll('.dgs-case-carousel').forEach(function (carousel) {
    const slides = Array.prototype.slice.call(carousel.querySelectorAll('.dgs-case-carousel-slide'));
    if (slides.length < 2) return;

    let index = slides.findIndex(function (s) { return s.classList.contains('is-active'); });
    if (index < 0) index = 0;

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
    }

    carousel.querySelectorAll('.dgs-case-carousel-arrow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        show(index + (btn.getAttribute('data-dir') === 'prev' ? -1 : 1));
      });
    });

    show(index);
  });

  /* Belt-and-braces alongside the MutationObserver's debounced refresh
     above: once every subresource (images, fonts, iframes) has actually
     finished loading, ask ScrollTrigger to recompute its trigger positions
     one more time, in case page height settled after any of its triggers
     (final CTA, disperse animation) were first created. Cheap no-op when
     GSAP/ScrollTrigger never loaded on this page. */
  window.addEventListener('load', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });


  /* ════════════════════════════════════════════════════════════
     CONSOLIDATED PAGE MODULES
     Everything below used to live in separate page scripts or in
     inline <script> blocks. Each module:
       - only does work when its own markup is on the page;
       - is isolated by dgsModule(), so one failure cannot stop the
         rest of main.js;
       - stands down if the page still loads the old standalone file
         (already-published GHL pages), so nothing runs twice.
     Former inline-script modules only run on pages built against
     the consolidated assets (they carry data-dgs-css / styles.css);
     older published pages still have their own inline copy.
     ════════════════════════════════════════════════════════════ */

  /* ─── MODULE: events-gallery (was js/dgs-events-gallery.js) ───
     About "Where we show up" + Growth Hub events gallery and lightbox */
  dgsModule('events-gallery', { legacyFile: 'dgs-events-gallery.js' }, function () {
    (function () {
      'use strict';

      var LIVE_ROOTS = {
        dgsEventsGalleryCompact: true,  // About → Where We Show Up
        dgsEventsGalleryFull: true      // Growth Hub → Recent Events & Moments
      };

      var INITIAL_COUNT = 5;
      var LOAD_STEP = 5;

      /* Thumbnail is explicitly cropped to a chosen w/h so the board gets real
         portrait/landscape/square variety instead of hoping the source photos
         happen to differ. Full is the same photo, uncropped, for the lightbox. */
      function thumbUrl(id, w, h) {
        return 'https://images.unsplash.com/photo-' + id + '?q=80&w=' + w + '&h=' + h + '&fit=crop&auto=format';
      }

      function fullUrl(id) {
        return 'https://images.unsplash.com/photo-' + id + '?q=80&w=1600&auto=format';
      }

      var DGS_EVENTS = [
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97c9cec7069f4fc7b07bd5.jpg', w: 1000, h: 750,
          alt: 'Induction and General Membership Meeting of the Philippine Chamber of Commerce and Industry, Quezon City',
          title: 'PCCI Induction & General Membership Meeting, Quezon City',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97c9e5c7069f4fc7b07d9d.png', w: 1000, h: 750,
          alt: 'Business Show Asia in Singapore',
          title: 'Business Show Asia, Singapore',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97cc65c7069f4fc7b0be24.jpg', w: 1000, h: 750,
          alt: 'Collaborative learning session in Singapore',
          title: 'Collaborative Learning Session, Singapore',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97c9d507f362e3214044b5.jpg', w: 1000, h: 750,
          alt: 'AI session for Claude and business leaders',
          title: 'AI for Claude and Business Leaders',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97cc530ba3728cefcaee5d.jpg', w: 1000, h: 750,
          alt: 'Codex workshop in Singapore',
          title: 'Codex Workshop, Singapore',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97c9ccfac7854efe1f4f9a.jpg', w: 1000, h: 750,
          alt: 'From Operator to Orchestrator workshop, Batch 1, Day 1',
          title: 'From Operator to Orchestrator, Batch 1 &middot; Day 1',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97cc4c07f362e3214084d5.jpg', w: 1000, h: 750,
          alt: 'From Operator to Orchestrator workshop, Batch 1, Day 2',
          title: 'From Operator to Orchestrator, Batch 1 &middot; Day 2',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a97cfbb0ba3728cefcb3756.jpg', w: 1000, h: 750,
          alt: 'AI + Claude masterclass session',
          title: 'AI + Claude Masterclass',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a83dac91082d6487705e899.jpg', w: 1000, h: 750,
          alt: 'HLA - 2nd Anniversary celebration and gathering',
          title: 'HLA - 2nd Anniversary',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a83dac999074f5ef6527271.png', w: 1000, h: 750,
          alt: 'GoHighLevel Manila Day 1 presentation and summit',
          title: 'GoHighLevel Manila - Day 1',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a83dac91082d6487705e894.png', w: 750, h: 1000,
          alt: 'GoHighLevel Manila Day 2 networking and connection',
          title: 'GoHighLevel Manila - Day 2',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a83dac9fe4291bd10b0c6c0.png', w: 1000, h: 750,
          alt: 'House Creatives Shoot creative production team session',
          title: 'House Creatives Shoot',
          year: 2026
        },
        {
          id: 'https://assets.cdn.filesafe.space/UAA13luwQZmtw8ObS1Su/media/6a83dac91082d6487705e88f.png', w: 750, h: 1000,
          alt: 'Doc Auntie K. community spotlight presentation',
          title: 'Doc Auntie K.',
          year: 2026
        }
      ].map(function (ev) {
        if (ev.id && ev.id.indexOf('http') === 0) {
          ev.image = ev.id;
          ev.full = ev.id;
        } else {
          ev.image = thumbUrl(ev.id, ev.w, ev.h);
          ev.full = fullUrl(ev.id);
        }
        return ev;
      });

      /* Caption is just the title — kept deliberately simple (no month/category
         watermark) since that metadata isn't tracked per photo. The "full"
         variant skips the dgs-reveal/scroll-fade treatment and fades its own
         images in immediately (dgs-no-fade): it re-renders its whole subtree
         on every Load More click, and both the sitewide scroll-reveal
         observer and image load-fade in main.js only ever scan the DOM once
         at page load, so freshly-created nodes from a later re-render would
         never be picked up and would stay invisible. The static "compact"
         variant (About page) never re-renders, so it keeps the normal
         scroll-reveal + fade-in treatment. */
      /* `enter` + `enterIndex` mark cards from a Load More batch so they fade
         in (staggered) instead of just appearing — see .dgs-event-card--enter
         in dgs-events-gallery.css and animateRowIn below. Cards from the
         initial render never get this: they should just be there when the
         page loads, not visibly animate in. */
      function cardHTML(ev, variant, enter, enterIndex) {
        var isFull = variant === 'full';
        var cardClass = isFull ? 'dgs-event-card' : 'dgs-event-card dgs-reveal';
        if (enter) cardClass += ' dgs-event-card--enter';
        var imgClass = isFull ? ' dgs-no-fade' : '';
        var caption = '<h3 class="dgs-event-caption-title">' + ev.title + '</h3>';
        var styleAttr = enter ? ' style="transition-delay:' + (enterIndex * 70) + 'ms"' : '';

        return (
          '<article class="' + cardClass + '"' + styleAttr + ' role="button" tabindex="0" aria-haspopup="dialog" ' +
            'data-lightbox-src="' + ev.full + '" data-lightbox-alt="' + ev.alt + '" data-lightbox-title="' + ev.title + '">' +
            '<div class="dgs-event-media">' +
              '<img class="' + imgClass.trim() + '" src="' + ev.image + '" alt="' + ev.alt + '" width="' + ev.w + '" height="' + ev.h + '" ' +
                'loading="lazy" decoding="async" draggable="false">' +
              '<div class="dgs-event-duotone" aria-hidden="true"></div>' +
              '<div class="dgs-event-caption">' + caption + '</div>' +
            '</div>' +
          '</article>'
        );
      }

      /* Groups items by `year` (newest first), preserving each year's internal
         curated order, so all photos for the same year cluster in a single
         horizontal track. "2026" prints once as the heading on the board. */
      function groupByYear(items) {
        var byYear = {};
        var years = [];
        items.forEach(function (ev) {
          if (!byYear[ev.year]) {
            byYear[ev.year] = [];
            years.push(ev.year);
          }
          byYear[ev.year].push(ev);
        });
        years.sort(function (a, b) { return b - a; });
        return years.map(function (year) {
          return {
            year: year,
            items: byYear[year]
          };
        });
      }

      var PREV_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
      var NEXT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      var LOADMORE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

      /* Splits a year's items into fixed-size rows. Each row becomes its own
         .dgs-events-month-group (track + prev/next), stacked with the gap
         that rule already provides — that CSS was written for exactly this
         ("Month sub-group: no divider of its own — just a gap between
         clusters") even before anything actually produced more than one.
         Using LOAD_STEP as the row size means each Load More click adds one
         new row below the existing ones, instead of appending photos onto
         the end of an existing row's horizontal scroll. */
      function chunk(items, size) {
        var rows = [];
        for (var i = 0; i < items.length; i += size) {
          rows.push(items.slice(i, i + size));
        }
        return rows;
      }

      /* Arrows sit ON the row (.dgs-events-track-wrap is position:relative,
         the buttons are absolutely positioned over the left/right edge) so
         the left arrow reads as sitting on the leftmost photo and the right
         arrow on the rightmost one, rather than in a separate control row
         below the gallery. */
      function trackRowHTML(items, variant, ariaLabel, enter) {
        return (
          '<div class="dgs-events-month-group">' +
            '<div class="dgs-events-track-wrap">' +
              '<button type="button" class="dgs-events-arrow dgs-events-arrow--prev" data-dir="-1" aria-label="Previous photos" disabled>' + PREV_ICON + '</button>' +
              '<div class="dgs-events-track" role="group" aria-label="' + ariaLabel + '">' +
                items.map(function (ev, i) { return cardHTML(ev, variant, enter, i); }).join('') +
              '</div>' +
              '<button type="button" class="dgs-events-arrow dgs-events-arrow--next" data-dir="1" aria-label="Next photos">' + NEXT_ICON + '</button>' +
            '</div>' +
          '</div>'
        );
      }

      function yearGroupHTML(group, variant, ariaLabel) {
        var label = ariaLabel + ' — ' + group.year;
        var rows = chunk(group.items, LOAD_STEP);
        return (
          '<div class="dgs-events-year-group" data-year="' + group.year + '">' +
            '<div class="dgs-events-year-label">' +
              '<span class="dgs-events-year-num">' + group.year + '</span>' +
              '<span class="dgs-events-year-line" aria-hidden="true"></span>' +
            '</div>' +
            rows.map(function (rowItems) { return trackRowHTML(rowItems, variant, label); }).join('') +
          '</div>'
        );
      }

      /* Sits in the gap right after the last year-group: a soft fade filling
         that blank space (not overlapping any photo) leading into the button,
         so it reads as part of the section rather than a control bolted on
         underneath it. Omitted entirely once every event is loaded. */
      function loadMoreHTML(remaining) {
        if (remaining <= 0) return '';
        return (
          '<div class="dgs-events-loadmore-wrap">' +
            '<button type="button" class="dgs-events-loadmore-btn" data-events-loadmore>' +
              '<span>Load More Events</span>' + LOADMORE_ICON +
            '</button>' +
          '</div>'
        );
      }

      /* Horizontal carousel: swipe/drag AND prev/next arrows.

         Touch already scrolls natively (overflow-x:auto + -webkit-overflow-
         scrolling:touch on .dgs-events-track) — untouched here.

         Mouse-drag uses the classic mousedown-on-track + mousemove/mouseup-on-
         `document` pattern (not Pointer Events + setPointerCapture, which an
         earlier version of this used): capturing a pointer can, in some
         browsers, retarget the `click` event that follows to the capturing
         element instead of whatever was actually under the cursor, which is
         exactly what broke the lightbox (the site-wide click listener reads
         e.target.closest('.dgs-event-card'), so a click retargeted to the
         track — an ANCESTOR of every card — never matches). Binding move/up
         to `document` instead of relying on capture avoids that risk entirely
         while still tracking the drag correctly if the cursor leaves the
         track mid-gesture.

         A real drag must still not also open the lightbox once released — a
         capture-phase click listener, added only when the drag actually moved
         past DRAG_THRESHOLD, stops that one click from propagating, then
         removes itself. */
      var DRAG_THRESHOLD = 6;

      function enableDragScroll(track) {
        var isDown = false;
        var moved = false;
        var startX = 0;
        var startScrollLeft = 0;

        function suppressClick(e) {
          e.stopPropagation();
          e.preventDefault();
        }

        function onMouseMove(e) {
          if (!isDown) return;
          var dx = e.clientX - startX;
          if (Math.abs(dx) > DRAG_THRESHOLD) moved = true;
          track.scrollLeft = startScrollLeft - dx;
        }

        function onMouseUp() {
          if (!isDown) return;
          isDown = false;
          track.classList.remove('is-dragging');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          if (moved) {
            track.addEventListener('click', suppressClick, { capture: true, once: true });
          }
        }

        track.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return; // left button only
          isDown = true;
          moved = false;
          startX = e.clientX;
          startScrollLeft = track.scrollLeft;
          track.classList.add('is-dragging');
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      }

      /* The "full" variant re-renders its whole subtree on every Load More
         click, so this runs more than once per page. A per-track `window`
         resize listener would keep piling up (each old, now-detached track
         stays alive forever as a closure the leaked listener still holds), so
         resize is handled by ONE page-level listener (bound only once, via
         resizeBound below) that re-reads whatever tracks currently exist each
         time it fires, instead of binding fresh ones per render. */
      var resizeBound = false;

      function updateArrowState(track) {
        var wrap = track.parentElement;
        if (!wrap || !wrap.classList.contains('dgs-events-track-wrap')) return;
        var prevBtn = wrap.querySelector('[data-dir="-1"]');
        var nextBtn = wrap.querySelector('[data-dir="1"]');
        if (!prevBtn || !nextBtn) return;
        var max = track.scrollWidth - track.clientWidth;
        prevBtn.disabled = track.scrollLeft <= 4;
        nextBtn.disabled = track.scrollLeft >= max - 4;
      }

      /* Wires up one row (drag-scroll + prev/next + its own scroll listener).
         Called once per row, ever — either for every row during the initial
         render, or for exactly the one row a Load More click just inserted.
         Never re-run against an existing row, so a row's listeners (and the
         scroll position/arrow state a visitor already has) are never touched
         by loading more photos elsewhere on the board. */
      function bindRow(wrap) {
        var track = wrap.querySelector('.dgs-events-track');
        var prevBtn = wrap.querySelector('[data-dir="-1"]');
        var nextBtn = wrap.querySelector('[data-dir="1"]');
        if (!track || !prevBtn || !nextBtn) return;

        function page(dir) {
          track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
        }

        prevBtn.addEventListener('click', function () { page(-1); });
        nextBtn.addEventListener('click', function () { page(1); });
        track.addEventListener('scroll', function () { updateArrowState(track); }, { passive: true });
        enableDragScroll(track);
        updateArrowState(track);
      }

      function bindResizeOnce() {
        if (resizeBound) return;
        resizeBound = true;
        window.addEventListener('resize', function () {
          document.querySelectorAll('.dgs-events-track').forEach(updateArrowState);
        });
      }

      function initCarousels(root) {
        root.querySelectorAll('.dgs-events-track-wrap').forEach(bindRow);
        bindResizeOnce();
      }

      /* Plays the stagger-fade entrance for a freshly-inserted row's cards
         (see .dgs-event-card--enter in dgs-events-gallery.css). The cards are
         inserted already in their opacity:0/translateY start state (baked
         into cardHTML's `enter` markup); reading offsetWidth forces the
         browser to commit that state to a layout/paint pass before the next
         frame adds .is-in, so the transition actually plays instead of the
         two class states getting coalesced into one frame with no visible
         animation. */
      function animateRowIn(wrap) {
        var cards = wrap.querySelectorAll('.dgs-event-card--enter');
        if (!cards.length) return;
        void wrap.offsetWidth;
        requestAnimationFrame(function () {
          cards.forEach(function (card) { card.classList.add('is-in'); });
        });
      }

      function emptyStateHTML() {
        return (
          '<div class="dgs-events-empty">' +
            '<span class="dgs-events-empty-icon" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>' +
              '</svg>' +
            '</span>' +
            '<h3 class="dgs-events-empty-title">No events yet</h3>' +
            '<p class="dgs-events-empty-text">We haven\'t logged an event here yet. Check back soon; we\'ll post photos as we show up.</p>' +
          '</div>'
        );
      }

      function renderGallery(rootId, variant, ariaLabel) {
        var root = document.getElementById(rootId);
        if (!root) return;

        if (!LIVE_ROOTS[rootId]) {
          root.innerHTML = emptyStateHTML();
          return;
        }

        var label = ariaLabel || 'Digital GrowthScale events';
        var total = DGS_EVENTS.length;

        if (variant !== 'full') {
          // Static variant (About page): first 5, no progressive loading.
          var staticItems = DGS_EVENTS.slice(0, INITIAL_COUNT);
          var staticGroups = groupByYear(staticItems);
          root.innerHTML = staticGroups.map(function (g) { return yearGroupHTML(g, variant, label); }).join('');
          initCarousels(root);
          return;
        }

        // "full" variant: progressive loading, driven entirely by DGS_EVENTS —
        // adding another event to the array is all a future update needs.
        //
        // Load More APPENDS new rows into the existing DOM rather than
        // re-rendering the whole gallery: a full re-render would destroy and
        // recreate every existing row (including the very first one), which
        // silently resets whatever scroll position / prev-next arrow state a
        // visitor already had on it. Only the freshly-added row(s) get built,
        // bound, and animated in; everything already on the board is left
        // completely alone.
        var visibleCount = Math.min(INITIAL_COUNT, total);

        function initialPaint() {
          var items = DGS_EVENTS.slice(0, visibleCount);
          var groups = groupByYear(items);
          var html = groups.map(function (g) { return yearGroupHTML(g, variant, label); }).join('');
          html += loadMoreHTML(total - visibleCount);
          root.innerHTML = html;
          initCarousels(root);

          var loadMoreBtn = root.querySelector('[data-events-loadmore]');
          if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', handleLoadMore);
          }
        }

        function handleLoadMore() {
          var start = visibleCount;
          visibleCount = Math.min(visibleCount + LOAD_STEP, total);
          appendBatch(DGS_EVENTS.slice(start, visibleCount), label);

          if (total - visibleCount <= 0) {
            var wrap = root.querySelector('.dgs-events-loadmore-wrap');
            if (wrap) wrap.parentNode.removeChild(wrap);
          }
          // else: the same button/listener stays — visibleCount is already
          // updated via closure, nothing else needs rewiring.
        }

        function appendBatch(newItems) {
          groupByYear(newItems).forEach(function (g) {
            var rowLabel = label + ' — ' + g.year;
            var rowHTML = trackRowHTML(g.items, variant, rowLabel, true);
            var yearGroupEl = root.querySelector('.dgs-events-year-group[data-year="' + g.year + '"]');
            var newWrap;

            if (yearGroupEl) {
              yearGroupEl.insertAdjacentHTML('beforeend', rowHTML);
              newWrap = yearGroupEl.lastElementChild;
            } else {
              // A year that isn't on the board yet: build its whole
              // year-group and insert it in newest-first position among
              // whatever year-groups already exist.
              var container = document.createElement('div');
              container.innerHTML =
                '<div class="dgs-events-year-group" data-year="' + g.year + '">' +
                  '<div class="dgs-events-year-label">' +
                    '<span class="dgs-events-year-num">' + g.year + '</span>' +
                    '<span class="dgs-events-year-line" aria-hidden="true"></span>' +
                  '</div>' +
                  rowHTML +
                '</div>';
              var newGroupEl = container.firstElementChild;

              var existingGroups = root.querySelectorAll('.dgs-events-year-group');
              var insertBeforeEl = null;
              for (var i = 0; i < existingGroups.length; i++) {
                if (parseInt(existingGroups[i].getAttribute('data-year'), 10) < g.year) {
                  insertBeforeEl = existingGroups[i];
                  break;
                }
              }
              if (insertBeforeEl) {
                root.insertBefore(newGroupEl, insertBeforeEl);
              } else {
                var loadMoreWrap = root.querySelector('.dgs-events-loadmore-wrap');
                root.insertBefore(newGroupEl, loadMoreWrap || null);
              }
              newWrap = newGroupEl.querySelector('.dgs-events-track-wrap');
            }

            bindRow(newWrap);
            animateRowIn(newWrap);
          });
        }

        initialPaint();
      }

      window.dgsRenderEventGallery = renderGallery;

      /* ─── Lightbox: click (or Enter/Space) any photo to view it fullscreen,
         close with the X, a click on the backdrop, or Escape. One singleton
         overlay shared by every gallery on the page, built lazily. ─── */
      var lightboxEl, lightboxImg, lightboxCloseBtn, lastFocused;

      function ensureLightbox() {
        if (lightboxEl) return lightboxEl;

        lightboxEl = document.createElement('div');
        lightboxEl.className = 'dgs-lightbox';
        lightboxEl.setAttribute('role', 'dialog');
        lightboxEl.setAttribute('aria-modal', 'true');
        lightboxEl.setAttribute('aria-hidden', 'true');
        lightboxEl.innerHTML =
          '<div class="dgs-lightbox-inner">' +
            '<button type="button" class="dgs-lightbox-close" aria-label="Close photo">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
            '</button>' +
            '<img class="dgs-lightbox-img dgs-no-fade" src="" alt="">' +
          '</div>';
        document.body.appendChild(lightboxEl);

        lightboxImg = lightboxEl.querySelector('.dgs-lightbox-img');
        lightboxCloseBtn = lightboxEl.querySelector('.dgs-lightbox-close');

        lightboxCloseBtn.addEventListener('click', closeLightbox);
        lightboxEl.addEventListener('click', function (e) {
          if (e.target === lightboxEl) closeLightbox();
        });

        return lightboxEl;
      }

      function openLightbox(card) {
        ensureLightbox();
        lastFocused = card;
        var title = card.getAttribute('data-lightbox-title') || '';
        lightboxImg.src = card.getAttribute('data-lightbox-src');
        lightboxImg.alt = card.getAttribute('data-lightbox-alt') || '';
        lightboxEl.setAttribute('aria-label', title);
        lightboxEl.classList.add('is-open');
        lightboxEl.setAttribute('aria-hidden', 'false');
        document.body.classList.add('dgs-lightbox-lock');
        lightboxCloseBtn.focus();
      }

      function closeLightbox() {
        if (!lightboxEl || !lightboxEl.classList.contains('is-open')) return;
        lightboxEl.classList.remove('is-open');
        lightboxEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('dgs-lightbox-lock');
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      }

      document.addEventListener('click', function (e) {
        var card = e.target.closest && e.target.closest('.dgs-event-card');
        if (card) openLightbox(card);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          closeLightbox();
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          var card = e.target.closest && e.target.closest('.dgs-event-card');
          if (card && e.target === card) {
            e.preventDefault();
            openLightbox(card);
          }
        }
      });
    })();
  });

  /* ─── MODULE: growth-insights (was js/dgs-growth-insights.js) ───
     Growth Hub insights grid: category filter, live search, reveal */
  dgsModule('growth-insights', { legacyFile: 'dgs-growth-insights.js' }, function () {
    /* ============================================================
       GROWTH HUB — INSIGHTS SYSTEM (landing page)
       Vanilla JS: category filtering + live search over the article grid,
       plus a small reveal-on-scroll pass scoped to .dgs-ghi-reveal.
       No page reload, no dependencies.
       ============================================================ */
    (function () {
      'use strict';

      var grid = document.querySelector('[data-ghi-grid]');
      if (!grid) return;

      var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-ghi-card]'));
      var filterSelect = document.querySelector('[data-ghi-filter-select]');
      var searchInput = document.querySelector('[data-ghi-search]');
      var emptyState = document.querySelector('[data-ghi-empty]');

      var activeCategory = 'all';
      var activeQuery = '';

      function normalize(str) {
        return (str || '').toLowerCase().trim();
      }

      function applyFilters() {
        var visibleCount = 0;

        cards.forEach(function (card) {
          var category = card.getAttribute('data-category') || '';
          var haystack = normalize(card.getAttribute('data-search'));
          var matchesCategory = activeCategory === 'all' || category === activeCategory;
          var matchesQuery = activeQuery === '' || haystack.indexOf(activeQuery) !== -1;
          var show = matchesCategory && matchesQuery;

          card.classList.toggle('is-hidden', !show);
          if (show) visibleCount++;
        });

        if (emptyState) {
          emptyState.classList.toggle('is-visible', visibleCount === 0);
        }
      }

      if (filterSelect) {
        filterSelect.addEventListener('change', function () {
          activeCategory = filterSelect.value || 'all';
          applyFilters();
        });
      }

      if (searchInput) {
        var debounceTimer;
        searchInput.addEventListener('input', function () {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function () {
            activeQuery = normalize(searchInput.value);
            applyFilters();
          }, 120);
        });
      }

      /* Reveal-on-scroll for elements scoped to this system */
      var revealEls = Array.prototype.slice.call(document.querySelectorAll('.dgs-ghi-reveal'));
      if (revealEls.length && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

        revealEls.forEach(function (el) { io.observe(el); });
      } else {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
      }
    })();
  });

  /* ─── MODULE: assessment (was js/dgs-assessment.js) ───
     Growth Hub AI Readiness Assessment quiz ([data-asm-app]) */
  dgsModule('assessment', { legacyFile: 'dgs-assessment.js' }, function () {
    /* ============================================================
       GROWTH HUB — AI READINESS ASSESSMENT (Interactive)
       Vanilla JS: 15-question scored quiz across 5 dimensions, an
       email gate before results, and dimension-mapped recommendations
       and solutions. No external dependencies, no page reload.
       ============================================================ */

    (function () {
      const app = document.querySelector('[data-asm-app]');
      if (!app) return;

      /* Lead capture is the same GHL "form_embed.js" iframe widget used for
         the footer newsletter form (see includes/footer.html), just pointed
         at this assessment's own GHL form and re-created here on the fly.
         Swap in the real form URL (Sites -> Forms -> the AI Readiness form
         -> Add Form -> "Embed" tab, use the `src` of its <iframe>) and the
         matching form ID: both live on the widget domain, e.g.
         "https://api.faithph.ai/widget/form/<formId>". */
      const GHL_FORM_LINK = 'https://api.faithph.ai/widget/form/2BTsssxbvTtOfRnZrAzw';
      const GHL_FORM_ID = '2BTsssxbvTtOfRnZrAzw';
      const GHL_EMBED_SCRIPT = 'https://api.faithph.ai/js/form_embed.js';

      /* Used to build absolute URLs for ai_solution_*_url below — GHL's email
         workflow needs a real link, not a site-relative one. */
      const SITE_ORIGIN = 'https://www.digitalgrowthscale.com';

      const DIMENSIONS = [
        { id: 'leadership', label: 'Leadership' },
        { id: 'technology', label: 'Technology' },
        { id: 'people', label: 'People' },
        { id: 'data', label: 'Data' },
        { id: 'governance', label: 'Governance' }
      ];

      const QUESTIONS = [
        { id: 'l1', dim: 'leadership', text: "Our leadership team has agreed on specific business outcomes we want AI to drive, not just a general interest in using it." },
        { id: 'l2', dim: 'leadership', text: "At least one senior leader is directly accountable for AI results, not just IT or an outside vendor." },
        { id: 'l3', dim: 'leadership', text: "We've set aside real budget for AI initiatives, separate from general software spend." },

        { id: 't1', dim: 'technology', text: "Our core systems (CRM, finance, operations) can be connected to new tools without a major rebuild." },
        { id: 't2', dim: 'technology', text: "We know which AI features already exist inside the tools we're paying for today." },
        { id: 't3', dim: 'technology', text: "We have a clear process for evaluating and approving new software before it's purchased." },

        { id: 'p1', dim: 'people', text: "Our team has the skills to use AI tools day to day, or a concrete plan to build them." },
        { id: 'p2', dim: 'people', text: "Employees feel safe raising concerns about how AI might change their role." },
        { id: 'p3', dim: 'people', text: "We've run at least one small AI pilot with a specific team, not just a company-wide announcement." },

        { id: 'd1', dim: 'data', text: "Our core business data lives in structured systems, not scattered across spreadsheets and inboxes." },
        { id: 'd2', dim: 'data', text: "We trust our data enough to make decisions from it without double-checking manually." },
        { id: 'd3', dim: 'data', text: "We have clear rules for who can access, edit, and export sensitive company data." },

        { id: 'g1', dim: 'governance', text: "We have a written policy on acceptable use of AI tools, even a simple one." },
        { id: 'g2', dim: 'governance', text: "We know which regulations, such as data privacy or industry-specific rules, apply to how we use AI." },
        { id: 'g3', dim: 'governance', text: "Someone reviews AI-generated work before it reaches customers or goes into official records." }
      ];

      /* ─── Qualifying-answer scoring (0-15, for the webhook payload) ───
         Each question is answered on the existing 1-5 agreement scale (see
         the on-screen buttons). A "qualifying" answer, worth 1 point toward
         ai_score, is one where the respondent agrees strongly enough that
         the statement is basically true for their business today.
         QUALIFYING_THRESHOLD is the default cutoff (1-5); override it per
         question via an optional `qualifyingThreshold` field on that
         question object if a specific statement should need a different
         bar later — nothing else in the scoring code needs to change. */
      const QUALIFYING_THRESHOLD = 4;

      function isQualifying(question, value) {
        const threshold = question.qualifyingThreshold || QUALIFYING_THRESHOLD;
        return typeof value === 'number' && value >= threshold;
      }

      function computeAiScore() {
        return QUESTIONS.reduce(function (total, q) {
          return total + (isQualifying(q, state.answers[q.id]) ? 1 : 0);
        }, 0);
      }

      const LEVELS = [
        {
          name: 'Foundation',
          max: 20,
          copy: "You're at the starting point, and that's a normal place to be. Most of your AI readiness gaps are foundational: unclear ownership, inconsistent data, or processes that live in people's heads instead of documented systems. These are fixable in weeks, not years, and fixing them first will make every future AI investment work better.",
          move: "Document your core processes before automating any of them."
        },
        {
          name: 'Standardized',
          max: 40,
          copy: "You have some of the basics in place, likely a few documented processes and a bit of leadership interest, but the pieces aren't connected yet. AI tools will work in isolated pockets rather than across the business until you tighten up data consistency and give someone clear ownership of results.",
          move: "Put your standard processes into a reporting rhythm so you see deviations without asking."
        },
        {
          name: 'Connected',
          max: 60,
          copy: "Your business has real building blocks: reasonably clean data, some leadership buy-in, and at least one team that's tested something new. You're ready to move from experiments to a coordinated rollout, provided you close the specific gaps your lowest-scoring dimension is flagging.",
          move: "Automate the repetitive, high-volume tasks now that the data behind them is clean."
        },
        {
          name: 'Automated',
          max: 80,
          copy: "You're ahead of most businesses your size. Systems talk to each other, people are engaged rather than anxious, and leadership has skin in the game. From here, the highest-leverage moves are narrower and more technical: tightening governance and squeezing more value out of the tools you already have.",
          move: "Introduce AI decision-support into your highest-value workflows."
        },
        {
          name: 'AI-Optimized',
          max: 100,
          copy: "You've built the organizational conditions that let AI actually compound: clean data, accountable owners, engaged people, and guardrails that let you move fast without breaking things. The work now is less about readiness and more about sequencing your next investments for maximum return.",
          move: "Shift from building to tuning, running continuous optimization cycles."
        }
      ];

      const RECOMMENDATIONS = {
        leadership: "Get one senior leader to own AI outcomes explicitly, with a name attached, not a department.",
        technology: "Map which of your current systems can already talk to each other before buying anything new.",
        people: "Run one small, well-scoped AI pilot with a single team instead of a company-wide rollout.",
        data: "Spend a week auditing where your core data actually lives before evaluating any new tool.",
        governance: "Write a one-page acceptable-use policy for AI tools. It doesn't need to be perfect, it needs to exist."
      };

      /* Short imperative titles paired above each RECOMMENDATIONS sentence
         in the priority list (numbered title + one-line explanation). */
      const PRIORITY_TITLES = {
        leadership: "Assign clear ownership of AI outcomes",
        technology: "Connect core systems before buying more tools",
        people: "Strengthen AI capability across key roles",
        data: "Consolidate and clean your core business data",
        governance: "Establish clearer governance and responsible-use practices"
      };

      /* What "strong" looks like per dimension, condensed from the "Good
         looks like..." lines on the Methodology page's AI Readiness
         Framework section, for the results screen's Foundation Strengths
         column. */
      const STRENGTH_BLURBS = {
        leadership: "Clear leadership buy-in and ownership of AI outcomes.",
        technology: "Core systems connected with minimal manual workarounds.",
        people: "Team has real AI skill, or a concrete plan to build it.",
        data: "Strong operational foundation of clean, structured data.",
        governance: "Responsible-use guardrails already taking shape."
      };

      /* What still needs work per dimension, for the Gap Areas column. */
      const GAP_BLURBS = {
        leadership: "Ownership of AI outcomes still needs a name attached.",
        technology: "Systems integration needs work before scaling further.",
        people: "AI capability needs strengthening across key roles.",
        data: "Core data still needs consolidating before it can be trusted.",
        governance: "Responsible-use structure needs attention."
      };

      const SOLUTIONS = {
        leadership: { name: 'Growth Systems Audit', href: '/solutions/growth-systems-audit', reason: "Get an independent, structured view of exactly where your leadership team should focus first." },
        technology: { name: 'Growth OS Setup', href: '/solutions/growth-os-setup', reason: "Replace scattered tools with one connected operating system built around how you actually work." },
        people: { name: 'AI Learning & Training', href: '/solutions/corporate-training', reason: "Build real AI skill and confidence across your team, not just awareness." },
        data: { name: 'Intelligent Automation', href: '/solutions/intelligent-automation', reason: "Automation forces the data cleanup work most businesses keep postponing." },
        governance: { name: 'Ops Support (HR, Legal & Compliance)', href: '/solutions/eor-hr-support', reason: "Get compliance, legal, and HR guardrails handled by people who do this daily." }
      };

      const ARROW_RIGHT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>';

      const dimLabel = (id) => DIMENSIONS.find((d) => d.id === id).label;

      /* ─── State ─── */
      const state = {
        index: 0,
        answers: {}
      };

      /* Set by finishQuiz() (via buildResults()) the moment all 15 questions
         are answered, so the GHL iframe's query params and the results
         screen both render from the exact same computation, not two
         separate calls to buildResults() that happen to agree. */
      let lastResults = null;

      /* ─── DOM refs ─── */
      /* data-asm-progress lives outside .dgs-asm-card (it's the bar above
         the card, a sibling, not a descendant), so it has to be looked up
         from the document, not scoped to `app`. */
      const progressFill = document.querySelector('[data-asm-progress]');
      const screens = {
        start: app.querySelector('[data-asm-screen="start"]'),
        question: app.querySelector('[data-asm-screen="question"]'),
        email: app.querySelector('[data-asm-screen="email"]'),
        results: app.querySelector('[data-asm-screen="results"]')
      };

      const startBtn = app.querySelector('[data-asm-start]');
      const qDim = app.querySelector('[data-asm-q-dim]');
      const qProgress = app.querySelector('[data-asm-q-progress]');
      const qText = app.querySelector('[data-asm-q-text]');
      const qScale = app.querySelector('[data-asm-q-scale]');
      const qBack = app.querySelector('[data-asm-q-back]');

      const iframeSlot = app.querySelector('[data-asm-iframe-slot]');
      const continueBtn = app.querySelector('[data-asm-continue]');

      const scoreNum = app.querySelector('[data-asm-score-num]');
      const levelPill = app.querySelector('[data-asm-level-pill]');
      const interpretation = app.querySelector('[data-asm-interpretation]');
      const maturityTrack = app.querySelector('[data-asm-maturity]');
      const dimsWrap = app.querySelector('[data-asm-dims]');
      const strengthsWrap = app.querySelector('[data-asm-strengths]');
      const gapsWrap = app.querySelector('[data-asm-gaps]');
      const recList = app.querySelector('[data-asm-rec-list]');
      const solutionsGrid = app.querySelector('[data-asm-solutions]');
      const nextWrap = app.querySelector('[data-asm-next-wrap]');
      const currentLevelEl = app.querySelector('[data-asm-current-level]');
      const nextLevelEl = app.querySelector('[data-asm-next-level]');
      const nextCopyEl = app.querySelector('[data-asm-next-copy]');
      const restartBtn = app.querySelector('[data-asm-restart]');

      /* If any required element is missing (bad markup edit, wrong file
         path, etc.) log exactly which one instead of silently crashing
         and killing every listener registered after it. */
      const REQUIRED = {
        progressFill, startBtn, qDim, qProgress, qText, qScale, qBack,
        iframeSlot, continueBtn, scoreNum, levelPill,
        interpretation, maturityTrack, dimsWrap, strengthsWrap, gapsWrap,
        recList, solutionsGrid, nextWrap, currentLevelEl, nextLevelEl,
        nextCopyEl, restartBtn
      };
      const missingScreens = Object.keys(screens).filter((key) => !screens[key]);
      const missing = Object.keys(REQUIRED).filter((key) => !REQUIRED[key]).concat(missingScreens.map((k) => 'screen:' + k));
      if (missing.length) {
        console.error('[dgs-assessment] Missing element(s), check the page markup: ' + missing.join(', '));
        return;
      }

      /* js/main.js runs Lenis with autoRaf:true, which keeps driving the
         native scroll position from its own internal virtual scroll state
         every frame. A raw window.scrollTo() gets fought and pulled back,
         so restart's "scroll to top" has to go through Lenis's own
         scrollTo() once Lenis exists (see js/dgs-growth-article.js's
         scrollToTarget() for the same fix). Falls back to native
         window.scrollTo when Lenis isn't on the page. */
      function scrollToTop() {
        if (window.dgsLenis && typeof window.dgsLenis.scrollTo === 'function') {
          window.dgsLenis.scrollTo(0);
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function showScreen(name) {
        Object.keys(screens).forEach((key) => {
          screens[key].hidden = key !== name;
        });
      }

      function setProgress(pct) {
        progressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
      }

      /* ─── Question rendering ─── */
      function renderQuestion(i) {
        const q = QUESTIONS[i];
        const dimIndex = DIMENSIONS.findIndex((d) => d.id === q.dim);

        qDim.textContent = 'Dimension ' + (dimIndex + 1) + ' of 5: ' + dimLabel(q.dim);
        qProgress.textContent = 'Question ' + (i + 1) + ' of ' + QUESTIONS.length;
        qText.textContent = q.text;

        const selected = state.answers[q.id];
        qScale.querySelectorAll('[data-asm-scale-btn]').forEach((btn) => {
          const val = Number(btn.getAttribute('data-value'));
          btn.classList.toggle('is-selected', val === selected);
          btn.setAttribute('aria-pressed', val === selected ? 'true' : 'false');
        });

        qBack.disabled = i === 0;
        setProgress((i / QUESTIONS.length) * 100);
        showScreen('question');
      }

      function selectAnswer(value) {
        const q = QUESTIONS[state.index];
        state.answers[q.id] = value;
        renderQuestion(state.index);

        window.setTimeout(function () {
          if (state.index < QUESTIONS.length - 1) {
            state.index += 1;
            renderQuestion(state.index);
          } else {
            finishQuiz();
          }
        }, 220);
      }

      /* ─── Finish: lead-capture gate before results ───────────────────
         All 15 questions are answered — compute the full result set once
         (score, level, per-dimension percentages, strengths/gaps/priorities/
         solutions), inject the GHL form with all of it appended as query
         params, and show the email screen. The visitor only reaches
         renderResults() after submitting that form and clicking "View My
         Results" (see the continueBtn listener below), and it reuses this
         same `lastResults` rather than recomputing. */
      function finishQuiz() {
        setProgress(100);
        lastResults = buildResults();
        injectLeadCaptureIframe(lastResults);
        continueBtn.hidden = true;
        showScreen('email');
      }

      /* Builds the GHL form iframe with the respondent's full result set
         appended to its URL as query params, so GHL's email workflow can
         populate a result template without any hardcoded front-end routing.
         `new URL(...).searchParams` (not manual string concatenation) is
         what handles sanitizing/encoding every value here — names and copy
         blurbs can contain spaces, ampersands, apostrophes, etc., and
         .set() encodes each one correctly without risk of an unescaped
         character breaking the query string or the embed script's own
         parsing of it. */
      function injectLeadCaptureIframe(results) {
        iframeSlot.innerHTML = '';

        const totalScore = results.totalScore;
        const levelIndex = results.levelIndex;
        const perDimScore = results.perDimScore;
        const weakest = results.weakest;     // 3 ids, ascending: lowest score first
        const strongest = results.strongest; // 2 ids, descending: highest score first

        const url = new URL(GHL_FORM_LINK);
        const params = url.searchParams;

        /* 1 — Overall score, level tag, and per-dimension percentages */
        params.set('ai_readiness_score', String(totalScore));
        params.set('ai_readiness_level', 'Level ' + levelIndex);
        DIMENSIONS.forEach(function (d) {
          params.set('ai_score_' + d.id, String(perDimScore[d.id]));
        });

        /* 2 — Strengths: top 2 highest-scoring dimensions */
        strongest.forEach(function (dimId, i) {
          const n = i + 1;
          params.set('ai_strength_' + n + '_name', dimLabel(dimId));
          params.set('ai_strength_' + n + '_copy', STRENGTH_BLURBS[dimId]);
        });

        /* 3 — Gaps: top 2 lowest-scoring dimensions */
        weakest.slice(0, 2).forEach(function (dimId, i) {
          const n = i + 1;
          params.set('ai_gap_' + n + '_name', dimLabel(dimId));
          params.set('ai_gap_' + n + '_copy', GAP_BLURBS[dimId]);
        });

        /* 4 — Priorities & 5 — Solutions: top 3 lowest-scoring dimensions,
           same weakest[] driving both, same as the results screen. */
        weakest.forEach(function (dimId, i) {
          const n = i + 1;
          params.set('ai_priority_' + n + '_title', PRIORITY_TITLES[dimId]);
          params.set('ai_priority_' + n + '_copy', RECOMMENDATIONS[dimId]);
          params.set('ai_solution_' + n + '_name', SOLUTIONS[dimId].name);
          params.set('ai_solution_' + n + '_url', SITE_ORIGIN + SOLUTIONS[dimId].href);
        });

        const src = url.toString();
        const widgetId = 'inline-dgsAiReadinessResult';

        /* No fixed height here: GHL's embed script resizes the iframe to
           fit its actual content via postMessage. "height:100%" would just
           stretch it to fill the wrapper instead of letting that happen,
           which is exactly what left a big empty gap under a short form. */
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.style.cssText = 'width:100%;border:none;border-radius:8px';
        iframe.id = widgetId;
        iframe.setAttribute('data-layout', "{'id':'INLINE'}");
        iframe.setAttribute('data-trigger-type', 'alwaysShow');
        iframe.setAttribute('data-trigger-value', '');
        iframe.setAttribute('data-activation-type', 'alwaysActivated');
        iframe.setAttribute('data-activation-value', '');
        iframe.setAttribute('data-deactivation-type', 'neverDeactivate');
        iframe.setAttribute('data-deactivation-value', '');
        iframe.setAttribute('data-form-name', 'AI Readiness Assessment - Results');
        iframe.setAttribute('data-height', '432');
        iframe.setAttribute('data-layout-iframe-id', widgetId);
        iframe.setAttribute('data-form-id', GHL_FORM_ID);
        iframe.title = 'AI Readiness Assessment - Results';
        iframeSlot.appendChild(iframe);

        /* form_embed.js only wires up iframes present when it first runs
           (it's already loaded once, globally, for the footer's own form).
           Re-appending a fresh copy makes it rescan the DOM and pick up
           this dynamically-injected one too. */
        const script = document.createElement('script');
        script.src = GHL_EMBED_SCRIPT;
        iframeSlot.appendChild(script);

        continueBtn.hidden = false;
      }

      continueBtn.addEventListener('click', function () {
        renderResults(lastResults || buildResults());
      });

      qScale.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-asm-scale-btn]');
        if (!btn) return;
        selectAnswer(Number(btn.getAttribute('data-value')));
      });

      qBack.addEventListener('click', function () {
        if (state.index === 0) return;
        state.index -= 1;
        renderQuestion(state.index);
      });

      startBtn.addEventListener('click', function () {
        state.index = 0;
        renderQuestion(0);
      });

      /* ─── Scoring ─── */
      function computeScores() {
        const perDim = {};
        DIMENSIONS.forEach((d) => { perDim[d.id] = { raw: 0, count: 0 }; });

        let rawTotal = 0;
        QUESTIONS.forEach((q) => {
          const val = state.answers[q.id] || 3;
          rawTotal += val;
          perDim[q.dim].raw += val;
          perDim[q.dim].count += 1;
        });

        const totalScore = Math.round(((rawTotal - QUESTIONS.length) / (QUESTIONS.length * 4)) * 100);

        const perDimScore = {};
        DIMENSIONS.forEach((d) => {
          const min = perDim[d.id].count;
          const max = perDim[d.id].count * 5;
          perDimScore[d.id] = Math.round(((perDim[d.id].raw - min) / (max - min)) * 100);
        });

        return { totalScore, perDimScore };
      }

      function levelFor(score) {
        for (let i = 0; i < LEVELS.length; i++) {
          if (score <= LEVELS[i].max) return { index: i + 1, level: LEVELS[i] };
        }
        return { index: LEVELS.length, level: LEVELS[LEVELS.length - 1] };
      }

      function weakestDimensions(perDimScore) {
        return DIMENSIONS
          .map((d) => ({ id: d.id, score: perDimScore[d.id] }))
          .sort((a, b) => a.score - b.score)
          .slice(0, 3)
          .map((d) => d.id);
      }

      /* Same shape as weakestDimensions, sorted the other way, for the
         "Foundation Strengths" column. Purely additive: it reads the same
         perDimScore weakestDimensions already computes from the existing
         scoring math, it doesn't change how any score is calculated. */
      function strongestDimensions(perDimScore, n) {
        return DIMENSIONS
          .map((d) => ({ id: d.id, score: perDimScore[d.id] }))
          .sort((a, b) => b.score - a.score)
          .slice(0, n || 2)
          .map((d) => d.id);
      }

      function buildResults() {
        const { totalScore, perDimScore } = computeScores();
        const { index, level } = levelFor(totalScore);
        const weakest = weakestDimensions(perDimScore);
        const strongest = strongestDimensions(perDimScore, 2);
        return { totalScore: totalScore, levelIndex: index, level: level, weakest: weakest, strongest: strongest, perDimScore: perDimScore };
      }

      function renderResults(results) {
        const totalScore = results.totalScore;
        const index = results.levelIndex;
        const level = results.level;
        const weakest = results.weakest;
        const strongest = results.strongest;
        const perDimScore = results.perDimScore;

        /* 02 — Primary score */
        scoreNum.innerHTML = totalScore + '<span>/100</span>';
        levelPill.innerHTML =
          '<span class="dgs-asmres-level-num">Level ' + index + '</span>' +
          '<span class="dgs-asmres-level-name">' + level.name + '</span>';
        interpretation.textContent = level.copy;

        /* 03 — Maturity model: all five levels rendered every time, the
           respondent's actual level (levelFor) flagged as current. */
        maturityTrack.innerHTML = '';
        LEVELS.forEach(function (lvl, i) {
          const stepNum = i + 1;
          const isCurrent = stepNum === index;
          const step = document.createElement('div');
          step.className = 'dgs-asmres-mat-step' + (isCurrent ? ' is-current' : '');
          step.setAttribute('data-level', String(stepNum));
          step.innerHTML =
            (isCurrent ? '<span class="dgs-asmres-mat-tag">Current</span>' : '') +
            '<span class="dgs-asmres-mat-code">L' + stepNum + '</span>' +
            '<span class="dgs-asmres-mat-name">' + lvl.name + '</span>';
          maturityTrack.appendChild(step);
        });

        /* 04 — Readiness dimensions, actual per-dimension scores, lowest
           flagged (not with amber, which stays reserved for the primary
           CTA per brand rule). */
        dimsWrap.innerHTML = '';
        DIMENSIONS.forEach(function (d, i) {
          const score = perDimScore[d.id];
          const isWeakest = weakest[0] === d.id;
          const block = document.createElement('div');
          block.className = 'dgs-asmres-dim' + (isWeakest ? ' is-weakest' : '');
          block.innerHTML =
            (isWeakest ? '<span class="dgs-asmres-dim-flag">Lowest</span>' : '') +
            '<span class="dgs-asmres-dim-name">' + d.label + '</span>' +
            '<span class="dgs-asmres-dim-score">' + score + '%</span>' +
            '<div class="dgs-asmres-dim-meter"><span style="width:' + Math.max(0, Math.min(100, score)) + '%"></span></div>';
          dimsWrap.appendChild(block);

          if (i < DIMENSIONS.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'dgs-asmres-dim-arrow';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.innerHTML = ARROW_RIGHT_SVG;
            dimsWrap.appendChild(arrow);
          }
        });

        /* 05 — Strengths vs gaps */
        strengthsWrap.innerHTML = strongest.map(function (dimId) {
          return '<div class="dgs-asmres-sg-item"><span class="dgs-asmres-sg-dim">' + dimLabel(dimId) + '</span><p>' + STRENGTH_BLURBS[dimId] + '</p></div>';
        }).join('');

        gapsWrap.innerHTML = weakest.slice(0, 2).map(function (dimId) {
          return '<div class="dgs-asmres-sg-item"><span class="dgs-asmres-sg-dim">' + dimLabel(dimId) + '</span><p>' + GAP_BLURBS[dimId] + '</p></div>';
        }).join('');

        /* 06 — Priorities, numbered, driven by the same three weakest
           dimensions and the same RECOMMENDATIONS copy as before. */
        recList.innerHTML = '';
        weakest.forEach(function (dimId, i) {
          const num = i + 1 < 10 ? '0' + (i + 1) : String(i + 1);
          const card = document.createElement('div');
          card.className = 'dgs-asmres-priority';
          card.innerHTML =
            '<span class="dgs-asmres-priority-num">' + num + '</span>' +
            '<div class="dgs-asmres-priority-body">' +
              '<h4 class="dgs-asmres-priority-title">' + PRIORITY_TITLES[dimId] + '</h4>' +
              '<p class="dgs-asmres-priority-desc">' + RECOMMENDATIONS[dimId] + '</p>' +
            '</div>';
          recList.appendChild(card);
        });

        /* Recommended solutions, same dimension-to-solution mapping, shown
           as .dgs-promise-link CTAs — same component as "Read More" /
           "Apply for Position" on careers.html — rather than a card grid. */
        solutionsGrid.innerHTML = '';
        weakest.forEach(function (dimId) {
          const sol = SOLUTIONS[dimId];
          const link = document.createElement('a');
          link.className = 'dgs-asmres-solution-link dgs-promise-link';
          link.href = sol.href;
          link.title = sol.reason;
          link.innerHTML = sol.name + '<span class="dgs-btn-icon">' + ARROW_RIGHT_SVG + '</span>';
          solutionsGrid.appendChild(link);
        });

        /* 07 — Next maturity step: current level's "move" copy carries the
           respondent from `level` to the next entry in LEVELS. At the top
           of the model there is no next step, so that half collapses. */
        currentLevelEl.textContent = 'L' + index + ' — ' + level.name.toUpperCase();
        if (index < LEVELS.length) {
          const next = LEVELS[index];
          nextLevelEl.textContent = 'L' + (index + 1) + ' — ' + next.name.toUpperCase();
          nextCopyEl.textContent = level.move;
          nextWrap.classList.remove('is-maxed');
        } else {
          nextLevelEl.textContent = '';
          nextCopyEl.textContent = "You've reached the top of the model. From here, the work is tuning and compounding what you've already built.";
          nextWrap.classList.add('is-maxed');
        }

        showScreen('results');
      }

      restartBtn.addEventListener('click', function () {
        state.index = 0;
        state.answers = {};
        lastResults = null;
        iframeSlot.innerHTML = '';
        continueBtn.hidden = true;
        setProgress(0);
        showScreen('start');
        scrollToTop();
      });
    })();
  });

  /* ─── MODULE: legal (was js/dgs-legal.js) ───
     Legal pages: mobile TOC toggle + active section tracking */
  dgsModule('legal', { legacyFile: 'dgs-legal.js' }, function () {
    (function () {
      'use strict';

      /* ─── Mobile TOC collapse/expand ─── */
      var toc = document.querySelector('.dgs-legal-toc');
      var tocToggle = document.querySelector('.dgs-legal-toc-toggle');
      if (toc && tocToggle) {
        tocToggle.addEventListener('click', function () {
          var open = toc.getAttribute('data-open') === 'true';
          toc.setAttribute('data-open', open ? 'false' : 'true');
          tocToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        });
      }

      /* ─── Active-state tracking ─── */
      var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.dgs-legal-toc-list a[href^="#"]'));
      if (!tocLinks.length) return;

      var headings = tocLinks
        .map(function (link) {
          var id = link.getAttribute('href').slice(1);
          return document.getElementById(id);
        })
        .filter(Boolean);

      if (!headings.length) return;

      function setActive(id) {
        tocLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
        });
      }

      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            setActive(entry.target.id);
          });
        }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

        headings.forEach(function (h) { observer.observe(h); });
      }
    })();
  });

  /* ─── MODULE: premium-viz-legacy (was js/dgs-premium-viz.js) ───
     Solution pages: reveal + counters for the .dgs-pv-panel "Who it is for" and "KPIs we track" panels (only runs if that markup exists) */
  dgsModule('premium-viz-legacy', { legacyFile: 'dgs-premium-viz.js' }, function () {
    // Shared reveal + counter-animation behavior for .dgs-pv-panel widgets
    // (premium node-diagram visuals and metric scorecard grids across solution detail pages).
    //
    // Behavior contract: entrance plays once, the first time the panel is ~15%
    // into view. It never resets/hides again afterward — the previous version
    // reset the panel once it scrolled fully out of view so it could replay on
    // scroll-back-up, but that reset was still visibly catching up (a flash of
    // the zeroed-out counters/hidden state) right as the next section's own
    // reveal was firing, reading as the whole page glitching. One-shot reveal,
    // same as every other .dgs-reveal element on the site, removes that
    // possibility entirely: nothing about this panel ever changes again once
    // it's been shown.
    dgsWhenReady(function () {
      var panels = document.querySelectorAll('.dgs-pv-panel');
      if (!panels.length) return;

      function animateCounter(counter, delayMs) {
        var targetVal = parseFloat(counter.getAttribute('data-target'));
        if (isNaN(targetVal)) return;
        var decimals = parseInt(counter.getAttribute('data-decimals') || '0', 10);
        var suffix = counter.getAttribute('data-suffix') || '';
        var startTime = null;
        var duration = 1200;

        function startAnimation() {
          function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var currentVal = eased * targetVal;
            var valStr = currentVal.toFixed(decimals);

            if (suffix) {
              counter.innerHTML = valStr + '<span class="dgs-pv-sym">' + suffix + '</span>';
            } else {
              counter.textContent = valStr;
            }

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              var finalValStr = targetVal.toFixed(decimals);
              if (suffix) {
                counter.innerHTML = finalValStr + '<span class="dgs-pv-sym">' + suffix + '</span>';
              } else {
                counter.textContent = finalValStr;
              }
            }
          }
          requestAnimationFrame(step);
        }

        if (delayMs > 0) {
          setTimeout(startAnimation, delayMs);
        } else {
          startAnimation();
        }
      }

      function playEntrance(panel) {
        panel.classList.add('is-visible');

        var counters = panel.querySelectorAll('.dgs-pv-count');
        counters.forEach(function (counter, idx) {
          if (counter.dataset.animated) return;
          counter.dataset.animated = 'true';
          var delay = (idx % 4) * 80;
          animateCounter(counter, delay);
        });
      }

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var panel = entry.target;
          if (entry.intersectionRatio >= 0.15 && !panel.classList.contains('is-visible')) {
            playEntrance(panel);
            observer.unobserve(panel);
          }
        });
      }, { threshold: 0.15 });

      panels.forEach(function (panel) {
        observer.observe(panel);
      });
    });
  });

  /* ─── MODULE: about-leadership (was an inline <script>) ───
     About: leadership story carousel (globals switchLeader/nextLeader/prevLeader are used by onclick attributes) */
  dgsModule('about-leadership', { consolidatedOnly: true }, function () {
    (function () {
                let currentLeader = 0;
                const totalLeaders = 4;
                const panelsWrap = document.getElementById('leaderPanels');
                let panelHeightToken = 0;

                // Swaps the active bio panel and animates the wrapper's height from
                // its current size to the new panel's natural size. Works the same
                // way for every panel (not just whichever one happens to be active
                // when this runs) since it always re-measures live, on the fly.
                function setActivePanel(index) {
                  if (!panelsWrap) {
                    document.querySelectorAll('.dgs-leader-detail-panel').forEach((panel, idx) => {
                      panel.classList.toggle('is-active', idx === index);
                    });
                    return;
                  }

                  const token = ++panelHeightToken;
                  const startHeight = panelsWrap.getBoundingClientRect().height;

                  // 1. Lock wrapper height at current height before switching active class
                  panelsWrap.style.height = startHeight + 'px';
                  void panelsWrap.offsetHeight; // force reflow so start height commits

                  // 2. Switch active panel class
                  document.querySelectorAll('.dgs-leader-detail-panel').forEach((panel, idx) => {
                    panel.classList.toggle('is-active', idx === index);
                  });

                  // 3. Accurately measure natural height of the newly active panel
                  const targetPanel = document.getElementById('leaderPanel-' + index);
                  const endHeight = targetPanel ? targetPanel.offsetHeight : panelsWrap.scrollHeight;

                  if (Math.round(startHeight) === Math.round(endHeight)) {
                    panelsWrap.style.height = 'auto';
                    return;
                  }

                  // 4. Smoothly animate height to target height
                  panelsWrap.style.height = endHeight + 'px';

                  setTimeout(() => {
                    // Release fixed height to auto after transition completes
                    if (token === panelHeightToken) {
                      panelsWrap.style.height = 'auto';
                    }
                  }, 480);
                }

                function update3dCards(activeIndex) {
                  const cards = document.querySelectorAll('.dgs-portrait-card');
                  const total = cards.length;

                  cards.forEach((card, idx) => {
                    let diff = (idx - activeIndex + total) % total;

                    if (diff === 0) {
                      // Active Front Card
                      card.style.transform = 'translate3d(0px, 0px, 0px) rotateY(0deg) scale(1)';
                      card.style.opacity = '1';
                      card.style.zIndex = '10';
                      card.style.borderColor = 'var(--action-teal)';
                      card.style.boxShadow = '0 20px 50px -10px rgba(0, 179, 159, 0.4), 0 0 30px rgba(0, 179, 159, 0.25)';
                      card.style.cursor = 'default';
                    } else if (diff === 1) {
                      // Next Card (Right 3D angle behind)
                      card.style.transform = 'translate3d(45px, -15px, -100px) rotateY(-16deg) scale(0.88)';
                      card.style.opacity = '0.55';
                      card.style.zIndex = '5';
                      card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                      card.style.cursor = 'pointer';
                    } else if (diff === total - 1) {
                      // Prev Card (Left 3D angle behind)
                      card.style.transform = 'translate3d(-45px, -15px, -100px) rotateY(16deg) scale(0.88)';
                      card.style.opacity = '0.55';
                      card.style.zIndex = '5';
                      card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
                      card.style.cursor = 'pointer';
                    } else {
                      // Back Card (Deepest in background)
                      card.style.transform = 'translate3d(0px, -30px, -190px) rotateY(0deg) scale(0.78)';
                      card.style.opacity = '0.2';
                      card.style.zIndex = '2';
                      card.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      card.style.boxShadow = 'none';
                      card.style.cursor = 'pointer';
                    }
                  });
                }

                // Mobile-only photo living inside the spotlight card (see
                // .dgs-leader-mobile-photo): kept in sync with whichever
                // leader is active by copying the same <img> src/alt off its
                // corresponding 3D stage card, so cycling still drives it
                // even though the 3D stage itself is hidden on mobile.
                const mobilePhoto = document.getElementById('leaderMobilePhoto');
                function syncMobilePhoto(index) {
                  if (!mobilePhoto) return;
                  const sourceImg = document.querySelector('.dgs-portrait-card[data-card="' + index + '"] .dgs-portrait-img-wrap img');
                  if (!sourceImg) return;
                  mobilePhoto.src = sourceImg.src;
                  mobilePhoto.alt = sourceImg.alt;
                }

                window.switchLeader = function (index) {
                  currentLeader = index;

                  // 1. Update 3D Stage Cards
                  update3dCards(currentLeader);

                  // 2. Update detail panels active state, animating the wrapper's
                  //    height smoothly between the old and new panel's natural size
                  setActivePanel(index);

                  // 3. Keep the mobile-merged photo in sync
                  syncMobilePhoto(index);

                  // 4. Update pagination dots
                  document.querySelectorAll('.dgs-showcase-dots .dgs-dot').forEach((dot, idx) => {
                    if (idx === index) {
                      dot.style.width = '24px';
                      dot.style.background = 'var(--action-teal)';
                    } else {
                      dot.style.width = '8px';
                      dot.style.background = 'rgba(255, 255, 255, 0.2)';
                    }
                  });
                };

                window.nextLeader = function () {
                  const next = (currentLeader + 1) % totalLeaders;
                  window.switchLeader(next);
                };

                window.prevLeader = function () {
                  const prev = (currentLeader - 1 + totalLeaders) % totalLeaders;
                  window.switchLeader(prev);
                };

                // Portrait cards (data-card), dots (data-dot) and the arrow
                // buttons (data-dgs-leader="prev|next") replace the old inline
                // onclick attributes. Elements that still carry an onclick are
                // left to it, so nothing fires twice.
                document.addEventListener('click', function (e) {
                  const t = e.target.closest('#leadership3dStage [data-card], .dgs-showcase-dots [data-dot], [data-dgs-leader]');
                  if (!t || t.hasAttribute('onclick')) return;
                  const dir = t.getAttribute('data-dgs-leader');
                  if (dir === 'next') window.nextLeader();
                  else if (dir === 'prev') window.prevLeader();
                  else window.switchLeader(parseInt(t.getAttribute('data-card') || t.getAttribute('data-dot'), 10) || 0);
                });

                // Initial position update on load
                dgsWhenReady(() => {
                  update3dCards(0);
                });

                // Fallback immediate call if DOM already loaded
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  update3dCards(0);
                }
              })();
  });

  /* ─── MODULE: about-events (was an inline <script>) ───
     About: render the compact events gallery */
  dgsModule('about-events', { consolidatedOnly: true }, function () {
    if (window.dgsRenderEventGallery) {
          window.dgsRenderEventGallery('dgsEventsGalleryCompact', 'full', 'Recent Digital GrowthScale events');
        }
  });

  /* ─── MODULE: about-differentiators (was an inline <script>) ───
     About: differentiators carousel arrows */
  dgsModule('about-differentiators', { consolidatedOnly: true }, function () {
    (function () {
          var track = document.getElementById('dgsDiffTrack');
          var prevBtn = document.getElementById('dgsDiffPrev');
          var nextBtn = document.getElementById('dgsDiffNext');
          if (!track || !prevBtn || !nextBtn) return;

          function updateArrows() {
            var max = track.scrollWidth - track.clientWidth;
            prevBtn.disabled = track.scrollLeft <= 4;
            nextBtn.disabled = track.scrollLeft >= max - 4;
          }

          function page(dir) {
            track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
          }

          prevBtn.addEventListener('click', function () { page(-1); });
          nextBtn.addEventListener('click', function () { page(1); });
          track.addEventListener('scroll', updateArrows, { passive: true });
          window.addEventListener('resize', updateArrows);
          updateArrows();
        })();
  });

  /* ─── MODULE: audit-testimonials (was an inline <script>) ───
     Audit: testimonial slider */
  dgsModule('audit-testimonials', { consolidatedOnly: true }, function () {
    (function () {
          const init = () => {
            const track = document.getElementById('dgsTestimonialTrack');
            const slides = track ? Array.from(track.children) : [];
            if (!track || slides.length === 0) return;

            const prevBtn = document.getElementById('dgsTestimonialPrev');
            const nextBtn = document.getElementById('dgsTestimonialNext');
            const dots = Array.from(document.querySelectorAll('.dgs-testimonial-dot'));
            const currentLabel = document.getElementById('dgsTestimonialCurrent');
            const total = slides.length;
            let index = 0;

            const pad = n => String(n).padStart(2, '0');

            const render = () => {
              track.style.transform = `translateX(-${index * 100}%)`;
              dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
              if (currentLabel) currentLabel.textContent = pad(index + 1);
            };

            const goTo = i => {
              index = (i + total) % total;
              render();
            };

            if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
            if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));
            dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

            // Basic touch/swipe support
            let startX = 0;
            let isDragging = false;
            track.addEventListener('touchstart', e => {
              startX = e.touches[0].clientX;
              isDragging = true;
            }, { passive: true });
            track.addEventListener('touchend', e => {
              if (!isDragging) return;
              const deltaX = e.changedTouches[0].clientX - startX;
              if (Math.abs(deltaX) > 40) {
                goTo(deltaX < 0 ? index + 1 : index - 1);
              }
              isDragging = false;
            });

            render();
          };

          if (document.readyState === 'loading') {
            dgsWhenReady(init);
          } else {
            init();
          }
        })();
  });

  /* ─── MODULE: contact-inquiry-tabs (was an inline <script>) ───
     Contact: inquiry type tabs switch the embedded GHL form panel */
  dgsModule('contact-inquiry-tabs', { consolidatedOnly: true }, function () {
    dgsWhenReady(function () {
          const tabs = document.querySelectorAll('.dgs-inquiry-tab');
          const panels = document.querySelectorAll('.dgs-ghl-panel');

          tabs.forEach(tab => {
            tab.addEventListener('click', function () {
              const target = this.getAttribute('data-tab');

              tabs.forEach(t => {
                t.classList.remove('is-active');
                t.setAttribute('aria-selected', 'false');
              });
              panels.forEach(p => p.classList.remove('is-active'));

              this.classList.add('is-active');
              this.setAttribute('aria-selected', 'true');

              const activePanel = document.getElementById('panel-' + target);
              if (activePanel) {
                activePanel.classList.add('is-active');
              }
            });
          });
        });
  });

  /* ─── MODULE: growth-hub-jumpnav (was an inline <script>) ───
     Growth Hub: Learn/Implement/Inspire jump nav pin fallback (GHL splits <main>, so CSS sticky alone cannot span the page) */
  dgsModule('growth-hub-jumpnav', { consolidatedOnly: true }, function () {
    (function () {
          var nav = document.querySelector('.dgs-hub-jumpnav');
          if (!nav) return;

          var spacer = document.createElement('div');
          spacer.className = 'dgs-hub-jumpnav-spacer';
          spacer.setAttribute('aria-hidden', 'true');
          nav.parentNode.insertBefore(spacer, nav.nextSibling);

          var naturalTop = 0;

          function measureNaturalTop() {
            var wasPinned = nav.classList.contains('dgs-hub-jumpnav--pinned');
            if (wasPinned) {
              nav.classList.remove('dgs-hub-jumpnav--pinned');
              spacer.style.height = '0px';
            }
            naturalTop = nav.getBoundingClientRect().top + window.pageYOffset;
            if (wasPinned) {
              nav.classList.add('dgs-hub-jumpnav--pinned');
              spacer.style.height = nav.offsetHeight + 'px';
            }
          }

          function update() {
            var shouldPin = window.pageYOffset >= naturalTop;
            var isPinned = nav.classList.contains('dgs-hub-jumpnav--pinned');
            if (shouldPin === isPinned) return;
            if (shouldPin) {
              spacer.style.height = nav.offsetHeight + 'px';
              nav.classList.add('dgs-hub-jumpnav--pinned');
            } else {
              nav.classList.remove('dgs-hub-jumpnav--pinned');
              spacer.style.height = '0px';
            }
          }

          var ticking = false;
          function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
              update();
              ticking = false;
            });
          }

          measureNaturalTop();
          update();
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', function () {
            if (!nav.classList.contains('dgs-hub-jumpnav--pinned')) measureNaturalTop();
          });
        })();
  });

  /* ─── MODULE: growth-hub-coming-soon (was an inline <script>) ───
     Growth Hub: "coming soon" modal */
  dgsModule('growth-hub-coming-soon', { consolidatedOnly: true }, function () {
    // Coming soon modal: Read Insight, Get Notified, Get all five playbooks
        (function () {
          var backdrop = document.getElementById('dgsComingSoonBackdrop');
          var modal = document.getElementById('dgsComingSoonModal');
          var closeBtn = document.getElementById('dgsComingSoonClose');
          var lastFocused = null;
          if (!backdrop || !modal) return;

          function openComingSoon() {
            lastFocused = document.activeElement;
            backdrop.hidden = false;
            modal.hidden = false;
            requestAnimationFrame(function () {
              backdrop.classList.add('is-visible');
              modal.classList.add('is-visible');
            });
            closeBtn.focus();
            document.body.style.overflow = 'hidden';
          }

          function closeComingSoon() {
            backdrop.classList.remove('is-visible');
            modal.classList.remove('is-visible');
            document.body.style.overflow = '';
            setTimeout(function () {
              backdrop.hidden = true;
              modal.hidden = true;
              if (lastFocused) lastFocused.focus();
            }, 200);
          }

          document.querySelectorAll('.dgs-coming-soon-trigger').forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
              event.preventDefault();
              openComingSoon();
            });
          });

          closeBtn.addEventListener('click', closeComingSoon);
          backdrop.addEventListener('click', closeComingSoon);
          document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !modal.hidden) closeComingSoon();
          });

          window.dgsOpenComingSoon = openComingSoon;
        })();
  });

  /* ─── MODULE: growth-hub-anchor-register (was an inline <script>) ───
     Growth Hub event page: smooth-scroll to #register */
  dgsModule('growth-hub-anchor-register', { consolidatedOnly: true }, function () {
    // Smooth-scroll for on-page "Reserve Your Seat" anchor links only.
        document.querySelectorAll('a[href="#register"]').forEach(function (link) {
          link.addEventListener('click', function (e) {
            var target = document.getElementById('register');
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
  });

  /* ─── MODULE: growth-hub-anchor-checklist (was an inline <script>) ───
     Growth Hub playbooks: smooth-scroll to #get-checklist */
  dgsModule('growth-hub-anchor-checklist', { consolidatedOnly: true }, function () {
    // Smooth-scroll for on-page "Get the Checklist" anchor links only.
        document.querySelectorAll('a[href="#get-checklist"]').forEach(function (link) {
          link.addEventListener('click', function (e) {
            var target = document.getElementById('get-checklist');
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
  });

  /* ─── MODULE: home-promise-list (was an inline <script>) ───
     Home: promise list rows swap the paired image */
  dgsModule('home-promise-list', { consolidatedOnly: true }, function () {
    (function () {
          var list = document.querySelector('[data-promise-list]');
          if (!list) return;

          var rows = Array.prototype.slice.call(list.querySelectorAll('[data-promise-row]'));
          var images = Array.prototype.slice.call(document.querySelectorAll('[data-promise-image]'));
          var indexNum = document.querySelector('.dgs-promise-visual-index-num');
          var indexLabel = document.querySelector('.dgs-promise-visual-index-label');
          var active = 0;

          function setActive(i, force) {
            if (i === active && !force) return;
            active = i;

            rows.forEach(function (row, j) {
              var isActive = j === i;
              row.classList.toggle('is-active', isActive);
              row.querySelector('.dgs-promise-item').setAttribute('aria-expanded', String(isActive));
              var link = row.querySelector('.dgs-promise-link');
              if (link) {
                if (isActive) link.removeAttribute('tabindex');
                else link.setAttribute('tabindex', '-1');
              }
            });

            images.forEach(function (img, j) {
              img.classList.toggle('is-active', j === i);
            });

            var titleEl = rows[i].querySelector('.dgs-promise-item-title');
            var numEl = rows[i].querySelector('.dgs-promise-item-num');
            if (indexNum) indexNum.textContent = numEl.textContent;
            if (indexLabel) indexLabel.textContent = titleEl.textContent.replace(/\.$/, '');
          }

          rows.forEach(function (row, i) {
            var button = row.querySelector('.dgs-promise-item');
            row.addEventListener('mouseenter', function () { setActive(i); });
            button.addEventListener('click', function () { setActive(i); });
            button.addEventListener('focus', function () { setActive(i); });
          });

          setActive(0, true);
        })();
  });

  /* ─── MODULE: industries-tabs (was an inline <script>) ───
     Industries: tab panes (global switchIndustryPane is used by onclick attributes) */
  dgsModule('industries-tabs', { consolidatedOnly: true }, function () {
    (function() {
            window.switchIndustryPane = function(slug) {
              document.querySelectorAll('.dgs-tab-btn').forEach(function(btn) {
                btn.classList.toggle('is-active', btn.getAttribute('data-industry-tab') === slug);
              });
              document.querySelectorAll('.dgs-selector-pane').forEach(function(pane) {
                pane.classList.toggle('is-active', pane.getAttribute('data-industry-pane') === slug);
              });
            };
            // Tab buttons carry data-industry-tab (replaces the old inline onclick).
            document.addEventListener('click', function (e) {
              var btn = e.target.closest('.dgs-tab-btn[data-industry-tab]');
              if (!btn || btn.hasAttribute('onclick')) return;
              window.switchIndustryPane(btn.getAttribute('data-industry-tab'));
            });
          })();
  });

  /* ─── MODULE: industries-case-library (was an inline <script>) ───
     Industries: case library filters */
  dgsModule('industries-case-library', { consolidatedOnly: true }, function () {
    (function() {
            var grid = document.getElementById('caseLibraryGrid');
            var empty = document.getElementById('caseEmptyState');
            if (!grid) return;

            var cards = Array.prototype.slice.call(grid.querySelectorAll('.dgs-insp-card'));
            var industrySel = document.getElementById('caseIndustryFilter');
            var solutionSel = document.getElementById('caseSolutionFilter');

            function applyFilters() {
              var industry = industrySel.value;
              var solution = solutionSel.value;
              var visibleCount = 0;

              cards.forEach(function(card) {
                var matchesIndustry = industry === 'all' || card.getAttribute('data-industry') === industry;
                var matchesSolution = solution === 'all' || card.getAttribute('data-solution') === solution;
                var visible = matchesIndustry && matchesSolution;
                card.style.display = visible ? '' : 'none';
                if (visible) visibleCount++;
              });

              empty.hidden = visibleCount !== 0;
              grid.hidden = visibleCount === 0;
            }

            industrySel.addEventListener('change', applyFilters);
            solutionSel.addEventListener('change', applyFilters);

            var params = new URLSearchParams(window.location.search);
            var industryParam = params.get('industry');
            if (industryParam && industrySel.querySelector('option[value="' + industryParam + '"]')) {
              industrySel.value = industryParam;
              applyFilters();
            }
          })();
  });

  /* ─── MODULE: industries-visuals (was an inline <script>) ───
     Industries: play card visuals when they enter the viewport */
  dgsModule('industries-visuals', { consolidatedOnly: true }, function () {
    (function() {
            dgsWhenReady(function() {
              var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                  var card = entry.target;
                  var visual = card.querySelector('.dgs-visual-container');
                  if (!visual) return;

                  if (entry.isIntersecting) {
                    if (!visual.classList.contains('play-animation')) {
                      visual.classList.add('play-animation');

                      // Card 1 specific animation: change badge Pending -> Approved
                      if (visual.id === 'visual-ps') {
                        var approvalBadge = visual.querySelector('.dgs-visual-ps-approval');
                        if (approvalBadge) {
                          approvalBadge.textContent = 'Pending';
                          approvalBadge.className = 'dgs-ui-badge dgs-ui-badge--pending dgs-visual-ps-approval';
                          setTimeout(function() {
                            approvalBadge.textContent = 'Approved ✓';
                            approvalBadge.className = 'dgs-ui-badge dgs-ui-badge--success dgs-visual-ps-approval';
                          }, 900);
                        }
                      }

                      // Card 3 specific animation: change billing Processing -> Completed
                      if (visual.id === 'visual-hc') {
                        var billingBadge = visual.querySelector('.dgs-visual-hc-billing-status');
                        if (billingBadge) {
                          billingBadge.textContent = 'Processing';
                          billingBadge.className = 'dgs-ui-badge dgs-ui-badge--pending dgs-visual-hc-billing-status';
                          setTimeout(function() {
                            billingBadge.textContent = 'Completed ✓';
                            billingBadge.className = 'dgs-ui-badge dgs-ui-badge--success dgs-visual-hc-billing-status';
                          }, 2200);
                        }
                      }
                    }
                  } else {
                    // Reset so it replays next time it enters viewport
                    visual.classList.remove('play-animation');
                  }
                });
              }, {
                threshold: 0.15
              });

              var cards = document.querySelectorAll('.dgs-insp-card');
              cards.forEach(function(card) {
                observer.observe(card);
              });
            });
          })();
  });

  /* ════════════════════════════════════════════════════════════
     MOTION HELPERS (Web Animations API, no library)
     Used by the engagement journey below. Animations fill "backwards"
     only, so the resting state is always the plain CSS state: if
     anything is skipped (reduced motion, no WAAPI, an error) the
     component is simply complete.
     ════════════════════════════════════════════════════════════ */
  const dgsCanAnimate = !prefersReducedMotion && typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  const DGS_EASE = {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    draw: 'cubic-bezier(0.65, 0, 0.35, 1)',
    soft: 'cubic-bezier(0.33, 1, 0.68, 1)'
  };

  // Play `intro` once, the first time `root` is meaningfully in view.
  // Below-the-fold roots are "armed" (CSS hides only what the intro brings in)
  // so nothing flashes; roots already on screen just play.
  function dgsOnFirstView(root, intro, threshold) {
    let played = false;
    const run = function () {
      if (played) return;
      played = true;
      root.classList.remove('is-armed');
      intro();
    };
    if (!dgsCanAnimate || !('IntersectionObserver' in window)) { intro(); played = true; return; }
    const r = root.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.85 && r.bottom > 0) { run(); return; }
    root.classList.add('is-armed');
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); run(); } });
    }, { threshold: threshold || 0.3 });
    io.observe(root);
  }

  /* ─── ENGAGEMENT JOURNEY (#dgs-sol-csr, solution pages) ───
     The Consult / Strategize / Realize / Sustain strip draws itself on
     first view: each connector runs to the next stage, which lights up
     together with its step card. Hovering a card or a stage links the
     pair. The markup is untouched; without JS it is the static strip. */
  dgsModule('engagement-journey', {}, function () {
    document.querySelectorAll('#dgs-sol-csr').forEach(function (section) {
      const strip = section.querySelector('.dgs-csr-graphic');
      if (!strip || strip.dgsInit) return;
      strip.dgsInit = true;
      const stages = Array.prototype.slice.call(strip.querySelectorAll('.dgs-csr-graphic-step'));
      const cards = Array.prototype.slice.call(section.querySelectorAll('.dgs-csr-track .dgs-csr-step'));
      const lines = Array.prototype.slice.call(strip.querySelectorAll('.dgs-csr-graphic-line'));
      if (!stages.length) return;
      section.classList.add('dgs-sol-journey');
      const paired = cards.length === stages.length;

      function link(i, on) {
        if (stages[i]) stages[i].classList.toggle('is-lit', on);
        if (paired) cards[i].classList.toggle('is-linked', on);
      }
      stages.forEach(function (s, i) {
        s.addEventListener('mouseenter', function () { link(i, true); });
        s.addEventListener('mouseleave', function () { link(i, false); });
      });
      if (paired) cards.forEach(function (c, i) {
        c.addEventListener('mouseenter', function () { link(i, true); });
        c.addEventListener('mouseleave', function () { link(i, false); });
      });

      dgsOnFirstView(strip, function () {
        if (!dgsCanAnimate) return;
        const step = 560;
        stages.forEach(function (s, i) {
          const at = 150 + step * i;
          const icon = s.querySelector('.dgs-csr-graphic-icon');
          const label = s.querySelector('.dgs-csr-graphic-label');
          if (icon) icon.animate([{ opacity: 0, transform: 'scale(0.82)' }, { opacity: 1, transform: 'none' }],
            { duration: 520, delay: at, easing: DGS_EASE.out, fill: 'backwards' });
          if (label) label.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
            { duration: 480, delay: at + 120, easing: DGS_EASE.out, fill: 'backwards' });
          setTimeout(function () { link(i, true); }, at + 80);
          setTimeout(function () { link(i, false); }, at + 80 + step + 260);
          const line = lines[i];
          if (line && i < stages.length - 1) {
            line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
              { duration: step, delay: at + 260, easing: DGS_EASE.draw, fill: 'backwards' });
            const dot = line.querySelector('.dgs-csr-graphic-dot');
            if (dot) dot.animate([{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }],
              { duration: 360, delay: at + 260 + step, easing: DGS_EASE.out, fill: 'backwards' });
          }
        });
      }, 0.4);
    });
  });

})();


/* ════════════════════════════════════════════════════════════
   MERGED PAGE SCRIPTS
   The sections below were separate files or inline <script> blocks.
   Each keeps its original code unchanged, inside a run-once guard
   (window.__dgs*Ran), and runs only on pages that opt in with a
   data-dgs-js="<name>" attribute: the code was written for its own
   pages (for example it scrolls to the top on load), so it must not
   run sitewide. The standalone files in js/ carry the same run-once
   guard. They stay deployed only for pages already published in GHL
   and for GHL-native blog templates configured inside GHL, and stand
   down if this file already ran that section (or the other way round).
   ════════════════════════════════════════════════════════════ */

/* ─── GROWTH HUB ARTICLE TEMPLATE (was js/dgs-growth-article.js) ───
   Growth Hub article pages, ghl-blog.html, and the "Back to Growth Hub"
   listing-return logic on growth-hub.html.
   Runs only where data-dgs-js~="growth-article". */
if (!window.__dgsGrowthArticleRan && document.querySelector('[data-dgs-js~="growth-article"]')) {
  window.__dgsGrowthArticleRan = true;

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

}

/* ─── CAREERS LISTING + DETAIL (was js/dgs-careers.js) ───
   career-main-layout.html (listing) and career-blog.html (detail).
   Runs only where data-dgs-js~="careers". */
if (!window.__dgsCareersRan && document.querySelector('[data-dgs-js~="careers"]')) {
  window.__dgsCareersRan = true;

/* ============================================================
   DGS CAREERS — LISTING + DETAIL TEMPLATE
   Vanilla JS, no dependencies. Mirrors the proven technique set from
   js/dgs-growth-article.js (native-GHL-content lifecycle: idempotent
   re-assertion via a body-level MutationObserver, since GHL's Vue
   hydration can replace .blog-html-container-single wholesale — see
   that file's own header comments for the full rationale, not
   re-derived here). Kept in its own file per project convention:
   Careers is isolated from Growth Hub, so dgs-growth-article.js is
   never touched and this never runs anything on a Growth Hub page
   (every selector below is Careers-specific: .dgs-career-post,
   .dgs-car-*, or generic GHL blog-post classes scoped through them).
   Safe to load on BOTH career-main-layout.html (listing — most of
   this file simply no-ops there, nothing on that page matches
   .blog-html-container-single) and career-blog.html (detail).
   ============================================================ */
(function () {
  'use strict';

  /* Same fix as js/dgs-growth-article.js's identical guard: stops the
     browser's own scroll-restoration from landing a reload partway
     down a career detail page (where there's no real content yet at
     that instant) before the GHL widget's content lands a moment
     later and reflows everything again — two stacked jumps instead
     of one. Set at module scope, unconditionally, as early as
     possible. No-ops harmlessly on the listing page too. */
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(function () {

  /* ─── Shared helpers ─── */
  function getCareerPost() {
    return document.querySelector('.dgs-career-post');
  }

  function getHero() {
    return document.querySelector('.blog-html-container-single');
  }

  /* Lenis-aware smooth scroll, same reasoning as
     js/dgs-growth-article.js's scrollToTarget(): js/main.js drives
     Lenis with autoRaf:true, so a raw window.scrollTo() gets fought
     and pulled back by Lenis's own untouched internal scroll state
     one frame later. */
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

  var TOC_SCROLL_OFFSET = 104;

  /* Force the viewport to the top exactly once, right as this script
     starts running — before the GHL widget has had any chance to
     inject/replace content and reflow the page. Same reasoning as
     js/dgs-growth-article.js's identical call: routed through
     scrollToTarget() (Lenis-aware) rather than a raw window.scrollTo(),
     runs once here and never again, so it never fights the user's own
     scrolling later. No-ops visually on the listing page (already at
     the top on a fresh load there). */
  scrollToTarget(0, 0);

  /* ============================================================
     DETAIL PAGE (career-blog.html) — everything below no-ops
     harmlessly on the listing page, which has no
     .blog-html-container-single at all.
     ============================================================ */

  /* ─── Reading progress bar ─── */
  function ensureProgressBar() {
    if (document.querySelector('[data-car-progress]')) return;
    var bar = document.createElement('div');
    bar.className = 'dgs-car-progress';
    bar.setAttribute('data-car-progress', '');
    bar.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bar, document.body.firstChild);
  }

  var progress = null;
  function updateProgress() {
    progress = progress || document.querySelector('[data-car-progress]');
    var articleEl = document.getElementById('blogPostContent');
    if (!progress || !articleEl) return;
    var rect = articleEl.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var scrolled = -rect.top;
    var pct = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
    progress.style.width = (pct * 100) + '%';
  }

  /* ─── GHL: build ONE hero-inner wrapper (title + description share it) ───
     GHL renders back-link, category, title (and, hidden, cover-image
     and date) as flat siblings directly under .blog-html-container-
     single — there is no native wrapper grouping them, which is
     exactly why earlier attempts to give title/description a shared
     "readable content width" kept drifting out of sync: each one was
     independently computing its own width/padding against the same
     ancestor, and any tiny mismatch between those independent
     calculations showed up as a broken/collapsed box (confirmed live
     across multiple postings and viewport widths).
     This creates ONE real wrapper (.dgs-car-hero-inner), MOVES the
     real back-link/category/title nodes into it (not clones — these
     are the actual native elements, so GHL's own attached behavior,
     e.g. the back-link's click binding, keeps working), and leaves
     .blog-cover-image-container and the date meta-section exactly
     where they are as hidden siblings of the wrapper — never part of
     the hero's content structure at all. insertDek() below then
     inserts the description as the LAST child of this same wrapper,
     so the CSS only ever needs to size ONE element
     (.dgs-car-hero-inner) for both title and description to share.
     Idempotent: no-ops the instant the wrapper already exists, so the
     shared MutationObserver can call this on every GHL hydration pass
     without re-wrapping or duplicating anything. */
  function buildHeroInner() {
    var hero = getHero();
    if (!hero) return null;
    var existing = hero.querySelector(':scope > .dgs-car-hero-inner');
    if (existing) return existing;
    var title = hero.querySelector(':scope > .blog-content-title');
    if (!title) return null;
    var backBtn = hero.querySelector(':scope > .blog-back-button');
    var category = hero.querySelector(':scope > .meta-section-1:has(.blog-category)');
    var inner = document.createElement('div');
    inner.className = 'dgs-car-hero-inner';
    hero.insertBefore(inner, title);
    if (backBtn) inner.appendChild(backBtn);
    if (category) inner.appendChild(category);
    inner.appendChild(title);
    return inner;
  }

  /* ─── GHL: hero description from the post's own meta description ───
     GHL has no native description/summary element on the single-post
     hero (confirmed against three separate live postings — only
     cover-image, title, category, date and body content exist).
     meta[name="description"] is real per-posting data GHL exposes,
     confirmed identical to that job's listing-card excerpt text, so
     this is the same underlying field, not invented copy. Appended as
     the last child of the SAME hero-inner wrapper title lives in (see
     buildHeroInner() above) — not an independent hero element with
     its own width/padding. The Work Setup/Work Shift-style metadata a
     job author writes in .dgs-career-meta stays in the article body
     where they put it; this file never relocates it into the hero. */
  function insertDek() {
    var inner = buildHeroInner();
    if (!inner) return;
    if (inner.querySelector(':scope > .dgs-car-dek')) return;
    var descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta || !descMeta.content) return;
    var dek = document.createElement('p');
    dek.className = 'dgs-car-dek';
    dek.textContent = descMeta.content;
    inner.appendChild(dek);
  }

  /* ─── GHL: relabel the native "Back to Blog" link ───
     Same TreeWalker approach as renameBackButton() in
     dgs-growth-article.js: the visible text is a text node nested
     inside <span>, not a direct child of the <a>, and GHL hardcodes
     both the text and aria-label. */
  function renameBackButton() {
    /* Not scoped to a DIRECT child anymore — buildHeroInner() moves
       this real node inside .dgs-car-hero-inner, so it's a grandchild
       of the hero once that wrapper exists. */
    var backBtn = document.querySelector('.blog-html-container-single .blog-back-button');
    if (!backBtn) return;
    if (backBtn.getAttribute('aria-label') !== 'Back to Careers') {
      backBtn.setAttribute('aria-label', 'Back to Careers');
    }
    var walker = document.createTreeWalker(backBtn, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (/back to blog/i.test(node.textContent)) {
        node.textContent = node.textContent.replace(/back to blog/i, 'Back to Careers');
      }
    }
  }

  /* ─── GHL: fix the native "Back to Top" button ───
     Same clone-to-strip-GHL's-own-handler fix as fixBackToTop() in
     dgs-growth-article.js — a capture-phase document listener alone
     was proven insufficient there (GHL's Vue @click binding is
     attached directly to the button node), so this removes it
     outright by replacing the node with a clone. Lands on the job
     content's first H2, falling back to window top when the posting
     has no headings. */
  function fixBackToTop() {
    var btn = document.querySelector('.hl-blog-content-back-to-top-container .back-to-top');
    if (!btn || btn.getAttribute('data-car-fixed')) return;
    var clean = btn.cloneNode(true);
    clean.setAttribute('data-car-fixed', '1');
    btn.parentNode.replaceChild(clean, btn);
    clean.addEventListener('click', function (e) {
      e.preventDefault();
      var post = getCareerPost();
      var firstHeading = post && post.querySelector('h2');
      if (firstHeading) {
        scrollToTarget(firstHeading, TOC_SCROLL_OFFSET);
      } else {
        scrollToTarget(0, 0);
      }
    });
  }

  /* ─── GHL: "Back to Top" — reparenting into .blog-html REVERTED ───
     Tried moving the real .hl-blog-content-back-to-top-container node
     into .blog-html (#blogPostContent) so it would visually belong to
     the article body — confirmed live this made the button disappear
     entirely. Root cause: #blogPostContent's content is rendered by
     GHL's own Vue component; a plain appendChild() isn't tracked by
     Vue's virtual DOM, so the next time GHL re-renders that region
     (its normal hydration behavior, confirmed elsewhere in this file)
     Vue patches the container back to what ITS OWN template expects
     and discards the node we injected — it doesn't know we put it
     there. .blog-html-container-single's own direct children (where
     buildHeroInner() operates) don't show this symptom, so the Vue-
     managed boundary is specifically at/inside #blogPostContent, not
     the whole hero. The button now stays in its real, native position
     (a sibling of .blog-html) and is made to visually belong to the
     article purely with CSS (see dgs-careers-detail.css) — no DOM
     move, nothing for GHL's own render pass to fight. */

  /* ─── GHL: reveal the native posting once it's actually there ───
     Same pattern as revealArticle() in js/dgs-growth-article.js:
     .dgs-ghl-native-blog-slot (see css/dgs-careers-detail.css) starts
     hidden via opacity/visibility (space stays reserved, nothing
     below it jumps once the real posting lands). This adds
     .is-ready once the real title and the real job body
     (.dgs-career-post) both exist. Also waits out the cover image if
     one is ever present — normally always empty on a job posting
     (see buildHeroInner()'s own comments), but this stays defensive
     rather than assuming that never changes. Called from the same
     body-level MutationObserver as every other GHL-sync function
     here; idempotent, no-ops once already .is-ready. */
  function revealCareer() {
    var slot = document.querySelector('[data-ghl-native-blog]');
    if (!slot || slot.classList.contains('is-ready')) return;
    var hero = getHero();
    var title = hero && hero.querySelector('.blog-content-title');
    var body = getCareerPost();
    if (!hero || !title || !body) return;

    var img = hero.querySelector('.blog-cover-image-container img');
    if (img && !img.complete) {
      /* data-car-wait guards against re-attaching this pair on every
         MutationObserver tick before the image finishes loading —
         same reasoning as revealArticle()'s identical guard in
         js/dgs-growth-article.js. */
      if (!img.getAttribute('data-car-wait')) {
        img.setAttribute('data-car-wait', '1');
        img.addEventListener('load', revealCareer, { once: true });
        img.addEventListener('error', revealCareer, { once: true });
      }
      return;
    }
    slot.classList.add('is-ready');
  }
  /* Failsafe only, not the reveal mechanism itself — same reasoning
     as the identical timeout in js/dgs-growth-article.js. */
  setTimeout(function () {
    var slot = document.querySelector('[data-ghl-native-blog]');
    if (slot) slot.classList.add('is-ready');
  }, 6000);

  /* ─── On This Page (TOC): deliberately not built ───
     Career Detail pages never show a table of contents (explicit
     project decision, 2026-09-17) — removed outright rather than kept
     as unused dead code. Growth Hub's own .dgs-ga-toc equivalent in
     dgs-growth-article.js is untouched. */

  /* ============================================================
     LISTING PAGE (career-main-layout.html) — everything below
     no-ops harmlessly on the detail page, which has no
     .hl-blog-post-home at all.
     ============================================================ */

  /* ─── GHL: un-nest the "Grid" layout widget's cards ───
     GHL's Blog List widget renders TWO different DOM shapes depending
     on its own "Compact" vs "Grid" layout setting. Compact (confirmed
     live) repeats .blog-post-wrapper-compact as proper siblings under
     .flex.flex-wrap — that shape already works correctly with the
     CSS grid in dgs-careers.css. Grid mode (also confirmed live,
     2026-09-19 saved copy of the Careers page) instead renders each
     job's .blog-post-wrapper-list ONE CLOSING </div> SHORT of properly
     closing itself before the next job starts — so every job after
     the first ends up nested INSIDE the previous job's card instead
     of sitting beside it as a sibling. A CSS grid only ever lays out
     its own DIRECT children, so with every card after the first
     buried inside card #1, the grid has exactly one item to place:
     card #1 (narrow, in column 1) with every other job rendering in
     plain block flow underneath it and the other 1-2 grid columns
     sitting empty — the "3 items became 1 narrow column + a huge gap"
     symptom. No CSS selector can undo bad nesting, so this walks the
     real (already browser-corrected) DOM and promotes every
     .blog-post-wrapper-list to a direct child of .blog-post-wrapper,
     in document order, restoring a flat sibling list dgs-careers.css's
     grid can actually distribute into columns. Idempotent: no-ops the
     moment the structure is already flat, so the MutationObserver
     below can call this on every mutation (including its own) without
     looping. */
  function flattenGridCards() {
    var wrapper = document.querySelector('.hl-blog-post-home .blog-post-wrapper');
    if (!wrapper) return;
    var cards = Array.prototype.slice.call(wrapper.querySelectorAll('.blog-post-wrapper-list'));
    if (!cards.length) return;
    var alreadyFlat = cards.every(function (card) { return card.parentNode === wrapper; });
    if (alreadyFlat) return;
    cards.forEach(function (card) { wrapper.appendChild(card); });
  }

  function syncGhlCareer() {
    buildHeroInner();
    insertDek();
    renameBackButton();
    updateProgress();
    fixBackToTop();
    flattenGridCards();
    revealCareer();
  }

  ensureProgressBar();

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateProgress();
      ticking = false;
    });
  }, { passive: true });

  updateProgress();
  window.addEventListener('load', updateProgress);

  /* Always run once AND always observe — not gated behind an initial
     .blog-html-container-single presence check, which would race
     GHL's own render (same reasoning as dgs-growth-article.js).
     Every function above already no-ops safely when its target
     doesn't exist yet, so this is also a safe no-op on the listing
     page for the life of that page. */
  syncGhlCareer();
  new MutationObserver(syncGhlCareer).observe(document.body, { childList: true, subtree: true });

  }); // whenReady
})();

}

/* ─── LAUNCHING SOON PAGE (was js/launching-soon.js) ───
   Countdown + notify-me form on launching-soon.html.
   Runs only where data-dgs-js~="launching-soon". */
if (!window.__dgsLaunchingSoonRan && document.querySelector('[data-dgs-js~="launching-soon"]')) {
  window.__dgsLaunchingSoonRan = true;

/* ============================================================
   DIGITAL GROWTHSCALE — LAUNCHING SOON PAGE JS
   ------------------------------------------------------------
   Live countdown timer + notify-me form handling.
   Loads after main.js. GHL-compatible: scoped, no globals
   beyond what's necessary, IIFE-wrapped.
   ============================================================ */

(function () {
  'use strict';

  /* ─── REVEAL-ON-SCROLL (self-contained fallback) ───
     Elements with .dgs-reveal start at opacity:0 (see CSS) and are meant
     to be revealed by a shared main.js scroll-observer. If that script is
     ever missing, mis-scoped, or loads after this file, every section
     (including the countdown) stays invisible. This observer makes the
     reveal work on its own, independent of main.js. */
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.dgs-reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // No IntersectionObserver support: just show everything.
    document.querySelectorAll('.dgs-reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ─── LIVE COUNTDOWN ─── */
  var countdownEl = document.getElementById('dgsCountdown');

  if (countdownEl) {
    var targetAttr = countdownEl.getAttribute('data-target');
    var targetDate = new Date(targetAttr);

    var daysEl = document.getElementById('dgsCdDays');
    var hoursEl = document.getElementById('dgsCdHours');
    var minutesEl = document.getElementById('dgsCdMinutes');
    var secondsEl = document.getElementById('dgsCdSeconds');

    function pad(num) {
      return String(num).padStart(2, '0');
    }

    function renderCountdown() {
      var now = new Date();
      var diff = targetDate.getTime() - now.getTime();

      if (isNaN(targetDate.getTime()) || diff <= 0) {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minutesEl) minutesEl.textContent = '00';
        if (secondsEl) secondsEl.textContent = '00';
        return;
      }

      var totalSeconds = Math.floor(diff / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;

      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minutesEl) minutesEl.textContent = pad(minutes);
      if (secondsEl) secondsEl.textContent = pad(seconds);
    }

    renderCountdown();
    setInterval(renderCountdown, 1000);
  }

  /* ─── NOTIFY ME FORM ─── */
  var notifyForm = document.getElementById('dgsNotifyForm');
  var notifyEmail = document.getElementById('dgsNotifyEmail');
  var notifySubmit = document.getElementById('dgsNotifySubmit');
  var notifySuccess = document.getElementById('dgsNotifySuccess');

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  if (notifyForm && notifyEmail) {
    notifyForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var value = notifyEmail.value.trim();

      if (!isValidEmail(value)) {
        notifyEmail.style.borderColor = '#FF6B6B';
        notifyEmail.focus();
        return;
      }

      notifyEmail.style.borderColor = '';

      // Hook point: replace with actual submission to GHL / CRM endpoint.
      // Example:
      // fetch('/api/notify-subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: value })
      // });

      if (notifySubmit) {
        notifySubmit.disabled = true;
        notifySubmit.textContent = 'Submitting…';
      }

      setTimeout(function () {
        notifyForm.reset();
        notifyForm.style.display = 'none';

        if (notifySuccess) {
          notifySuccess.classList.add('is-visible');
        }
      }, 500);
    });
  }

})();

}

/* ─── LAUNCHING SOON: AUTO-REDIRECT + LOGO SWEEP (were inline <script>s
   in launching-soon.html) ───
   Runs only where data-dgs-js~="launching-soon". An older published copy
   of the page still has the inline versions: the sweep then stands down;
   the redirect would only repeat the same redirect. */
(function () {
  if (!document.querySelector('[data-dgs-js~="launching-soon"]')) return;
  function inlineCopy(marker) {
    return Array.prototype.some.call(document.scripts, function (s) { return !s.src && s.textContent.indexOf(marker) !== -1; });
  }
  // Redirect runs straight away, as the inline script did.
  if (!window.__dgsLaunchRedirectRan) {
    window.__dgsLaunchRedirectRan = true;
    (function () {
      // Matches the countdown's data-target (Philippine time, +08:00)
      var launchDate = new Date('2026-09-22T09:00:00+08:00').getTime();
      // Home page URL (index.html is served at the site root)
      var homeUrl = '/';

      function checkLaunch() {
        if (Date.now() >= launchDate) {
          window.location.href = homeUrl;
        }
      }

      checkLaunch();                 // check immediately on load
      setInterval(checkLaunch, 1000); // re-check every second until launch
    })();
  }
  function runSweep() {
    if (inlineCopy('.dgs-launch-visual-mark') || window.__dgsLaunchSweepRan) return;
    window.__dgsLaunchSweepRan = true;
    const container = document.querySelector('.dgs-launch-visual');
    const logo = document.querySelector('.dgs-launch-visual-mark');

    if (container && logo) {
      let angle = 0;
      let isHovered = false;
      const speed = 0.0035; // Speed of continuous idle sweep
      const lerpFactor = 0.08; // Smoothness factor (lower = smoother/slower)

      // Track current position
      let curX = 0;
      let curY = 0;
      let firstFrame = true;

      // Track mouse position relative to container
      let mouseX = 0;
      let mouseY = 0;

      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      });

      container.addEventListener('mouseenter', (e) => {
        isHovered = true;
        const rect = container.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      });

      container.addEventListener('mouseleave', () => {
        isHovered = false;
      });

      function updatePosition() {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          let targetX, targetY;

          if (isHovered) {
            targetX = mouseX;
            targetY = mouseY;
          } else {
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            targetX = cx + (rect.width * 0.42) * Math.cos(angle);
            targetY = cy + (rect.height * 0.22) * Math.sin(angle * 2.0);
            angle += speed;
          }

          if (firstFrame) {
            curX = targetX;
            curY = targetY;
            firstFrame = false;
          } else {
            curX += (targetX - curX) * lerpFactor;
            curY += (targetY - curY) * lerpFactor;
          }

          logo.style.setProperty('--mx', `${curX}px`);
          logo.style.setProperty('--my', `${curY}px`);
        }
        requestAnimationFrame(updatePosition);
      }

      requestAnimationFrame(updatePosition);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runSweep); else runSweep();
})();
