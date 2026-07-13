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

  /* ─── LENIS SMOOTH SCROLL + GSAP SCROLLTRIGGER INTEGRATION ─── */
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      // autoToggle removed: it depends on recent-browser support and
      // Lenis's own recommended CSS to detect overflow changes, and was
      // unreliably leaving scroll stopped after the mobile menu closed.
      // Scroll stop/start is now called explicitly in openMobileMenu()/
      // closeMobileMenu() below instead.
    });

    // Sync Lenis scroll with GSAP ScrollTrigger
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }

    window.dgsLenis = lenis;
  }

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

  if (revealObserverEnabled && allAnimateTargets.length) {
    const revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          applyReveal(entry.target);
          observer.unobserve(entry.target); // Trigger once
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    allAnimateTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    allAnimateTargets.forEach(function (el) {
      applyReveal(el);
    });
  }


  /* ─── HEADER SCROLL EFFECT ─── */
  var header = document.querySelector('.dgs-header');
  if (header) {
    function updateHeaderScroll() {
      if (window.scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
    window.addEventListener('scroll', updateHeaderScroll, { passive: true });
    updateHeaderScroll();
  }

  /* ─── FOOTER YEAR ─── */
  var yearEl = document.getElementById('dgsYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

})();