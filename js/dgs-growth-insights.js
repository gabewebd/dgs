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
