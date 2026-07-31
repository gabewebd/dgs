/* ============================================================
   DIGITAL GROWTHSCALE FRAMEWORK 3.0 - NAVIGATION MODULE
   ------------------------------------------------------------
   Native ES module. Animates the header nav container into a
   floating glassmorphic pill using GSAP + ScrollTrigger.
   ============================================================ */

export function initNavScroll() {
  const nav = document.querySelector('.dgs-nav');
  if (!nav || nav.dataset.dgsNavBound === 'true') return;
  nav.dataset.dgsNavBound = 'true';

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    const navTimeline = window.gsap.timeline({ paused: true });

    // Animate the nav container into a floating pill layout with top, bottom, left, and right margins
    navTimeline.to(nav, {
      width: 'calc(100% - 3rem)', // Left and right margins
      maxWidth: 1140,
      marginTop: '1rem', // Top margin
      backgroundColor: '#051124', // SOLID NAVY DARK
      backdropFilter: 'blur(12px)',
      webkitBackdropFilter: 'blur(12px)',
      borderRadius: '999px',
      borderColor: 'rgba(0, 179, 159, 0.15)',
      paddingTop: '0.65rem',
      paddingBottom: '0.65rem',
      paddingLeft: '2rem',
      paddingRight: '2rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      duration: 0.45,
      ease: 'power2.out'
    });

    // Configure ScrollTrigger to play forward on scroll down (> 20px) and reverse on scroll back up
    window.ScrollTrigger.create({
      trigger: 'body',
      start: 'top -20px',
      onEnter: () => navTimeline.play(),
      onLeaveBack: () => navTimeline.reverse()
    });

    // Handle immediate check for initial load/restore position
    if (window.scrollY > 20) {
      navTimeline.progress(1);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initNavScroll(), { once: true });
} else {
  initNavScroll();
}
