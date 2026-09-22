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
