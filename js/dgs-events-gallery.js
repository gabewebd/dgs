
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
