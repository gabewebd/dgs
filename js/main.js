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

  // Highlight the current page in the mobile drawer
  document.querySelectorAll('.dgs-mobile-links a[href]').forEach(function (link) {
    try {
      var linkPath = (new URL(link.getAttribute('href'), window.location.origin).pathname).replace(/\/$/, '') || '/';
      var currentPath = window.location.pathname.replace(/\/$/, '') || '/';
      if (linkPath === currentPath) {
        link.classList.add('is-active');
      }
    } catch (err) { /* relative/hash links, ignore */ }
  });


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

  // Primary: elements explicitly marked
  const revealElements = Array.from(document.querySelectorAll('.dgs-reveal'));

  // Secondary: ensure each page has animated content even if elements don't have .dgs-reveal
  // Only run this for elements inside .dgs-page so we don't animate unintended UI.
  // Explicit opt-in for implicit reveal (keeps behavior controlled)
  // Add `data-animate="true"` or class `dgs-animate` to any element you want animated.
  const implicitRevealElements = Array.from(
    document.querySelectorAll('.dgs-page section [data-animate], .dgs-page section .dgs-animate')
  );


  // Combine unique
  const allAnimateTargets = Array.from(new Set(revealElements.concat(implicitRevealElements)));

  const applyReveal = function (el) {
    if (!el) return;
    el.classList.add('is-visible');
  };

  // Auto-stagger: when several reveal elements share the same parent (a card
  // grid, a list, a row of buttons) they cascade in sequence rather than all
  // firing at once — the coordinated, "settling" feel of Linear/Stripe.
  // Standalone elements get no delay; the index is capped so large grids never
  // feel slow. The delay itself is applied in CSS via the --dgs-reveal-i var.
  if (!prefersReducedMotion) {
    const staggerGroups = new Map();
    allAnimateTargets.forEach(function (el) {
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

  if (revealObserverEnabled && allAnimateTargets.length && !prefersReducedMotion) {
    // Reveal ONCE, then stop observing. Premium interfaces let content settle
    // instead of re-animating every time it scrolls back into view — the old
    // bidirectional replay read as busy/distracting.
    const revealObserver = new IntersectionObserver(function (entries) {
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

    allAnimateTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // No IntersectionObserver, or reduced-motion: show everything immediately.
    allAnimateTargets.forEach(function (el) {
      applyReveal(el);
    });
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
    if (!section || !window.gsap || !window.ScrollTrigger) return;

    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // On mobile the cloud collapses to a static in-flow chip row (CSS sets it
    // position:relative), so the outward disperse transforms would push tags
    // past the viewport edge, causing horizontal overflow and a page that pans
    // sideways / looks shifted. Skip the effect and leave the chips in place.
    if (window.matchMedia('(max-width: 768px)').matches) return;

    // 1) Word-cloud disperses as the section scrolls into view (scrubbed).
    //    Each tag flies outward on its own vector and fades, revealing the
    //    clean heading beneath — chaos resolving into order.
    var tags = section.querySelectorAll('.dgs-cloud-tag');
    var vectors = [
      [-150, -70], [140, -110], [-190, 10], [190, -40],
      [-120, 120], [130, 100], [-40, 170], [60, 150]
    ];
    if (reduceMotion) {
      gsap.set(tags, { opacity: 0 });
    } else {
      // Build one paused master timeline (progress 0→1 across the section):
      // tags drift outward and keep rotating the whole way down, and only
      // fade out in the final third so they're fully gone at the section end.
      // Progress is driven from the section's own rect (reliable under Lenis),
      // not ScrollTrigger geometry.
      var master = gsap.timeline({ paused: true });
      tags.forEach(function (tag, i) {
        var v = vectors[i % vectors.length];
        master.to(tag, {
          x: v[0], y: v[1], rotation: (i % 2 ? 1 : -1) * 34,
          ease: 'none', duration: 1
        }, 0);
        master.to(tag, { opacity: 0, ease: 'power1.in', duration: 0.35 }, 0.65);
      });

      var updateDisperse = function () {
        var r = section.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        // p = 0 when the section top first enters the viewport (top = vh);
        // p = 1 when the section bottom reaches the viewport bottom
        // (top = vh - height) — i.e. you've scrolled to the end of the section.
        var p = (vh - r.top) / r.height;
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        master.progress(p);
      };
      dgsOnScroll(updateDisperse);
    }

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
    const frameworkSection = document.querySelector('#dgs-framework');
    const progressLine = document.querySelector('.dgs-timeline-progress-line');
    const dots = document.querySelectorAll('.dgs-timeline-dot');
    
    if (frameworkSection && progressLine) {
      function updateTimelineProgress() {
        const rect = frameworkSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Progress starts when the top of the section reaches the middle of the viewport
        const start = rect.top - (viewportHeight * 0.5);
        const total = rect.height - (viewportHeight * 0.2);
        
        let progress = -start / total;
        progress = Math.max(0, Math.min(1, progress));
        
        // Scale rather than animate height: transform is GPU-composited and
        // does not force layout on every frame (see .dgs-timeline-progress-line).
        progressLine.style.transform = `scaleY(${progress})`;
        
        // Light up dots dynamically as the progress line reaches each dot's vertical position
        dots.forEach((dot) => {
          const dotRect = dot.getBoundingClientRect();
          const triggerPoint = viewportHeight * 0.65;
          dot.classList.toggle('active', dotRect.top <= triggerPoint);
        });
      }
      
      dgsOnScroll(updateTimelineProgress);
      updateTimelineProgress();
    }
  })();

  /* ─── 2.8 CLIENT SUCCESS PREVIEW TAB SWITCHER ─── */
  (function () {
    const tabs = document.querySelectorAll('.dgs-success-tab');
    const panels = document.querySelectorAll('.dgs-success-panel');
    
    if (tabs.length > 0 && panels.length > 0) {
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetIndex = tab.getAttribute('data-tab');
          
          // Toggle active tab class
          tabs.forEach(t => t.classList.toggle('active', t === tab));
          
          // Toggle active panel class
          panels.forEach(panel => {
            const panelIndex = panel.getAttribute('data-panel');
            panel.classList.toggle('active', panelIndex === targetIndex);
          });
        });
      });
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

  /* ─── 2.10 CINEMATIC FINAL CTA ANIMATIONS (GSAP ScrollTrigger) ─── */
  (function () {
    const section = document.querySelector('.cinematic-cta-wrapper');
    if (!section || !window.gsap || !window.ScrollTrigger) return;

    const gsap = window.gsap;

    // Giant text parallax - highly obvious scale and translation
    const giantText = section.querySelector('.final-cta-giant-bg-text');
    if (giantText) {
      gsap.fromTo(
        giantText,
        { y: '120px', opacity: 0.1, scale: 0.7 },
        {
          y: '-50px',
          opacity: 1,
          scale: 1.3,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 95%',
            end: 'bottom bottom',
            scrub: true,
          }
        }
      );
    }

    // Heading, subline, and buttons reveal
    const heading = section.querySelector('.final-cta-heading');
    const subline = section.querySelector('.final-cta-subline');
    const buttons = section.querySelector('.final-cta-buttons');
    
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
            start: 'top 80%',
            end: 'top 45%',
            scrub: true,
          }
        }
      );
    }
  })();

})();