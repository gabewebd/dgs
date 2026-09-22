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