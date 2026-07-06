/* ============================================================
   DIGITAL GROWTHSCALE — MAIN SCRIPT
   Beginner note: this file only handles small interactions.
   The form itself is submitted by the browser directly to
   Netlify, no JavaScript is needed for that part to work.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ---- Footer year ----
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Mobile menu toggle ----
  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // Close the menu after tapping a link
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- FAQ accordion ----
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-question');
    var answer = item.querySelector('.faq-answer');
    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');

      // Close any other open FAQ item first
      document.querySelectorAll('.faq-item.is-open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('is-open');
          openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          openItem.querySelector('.faq-answer').style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove('is-open');
        question.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = null;
      } else {
        item.classList.add('is-open');
        question.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ---- Scroll reveal for cards and sections ----
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

});
