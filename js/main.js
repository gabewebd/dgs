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

})();