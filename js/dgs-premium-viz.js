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
document.addEventListener('DOMContentLoaded', function () {
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
