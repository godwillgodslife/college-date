import { useEffect } from 'react';

/**
 * useScrollReveal - Observes elements with [data-reveal] and applies 'is-revealed' class
 * when they enter the viewport. Fully respects prefers-reduced-motion.
 */
export function useScrollReveal(dependency = null) {
  useEffect(() => {
    // If user prefers reduced motion, reveal immediately with zero delay
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px 50px 0px',
      }
    );

    const elements = document.querySelectorAll('[data-reveal]');
    elements.forEach((el) => observer.observe(el));

    // Fallback safety: ensures all elements reveal gracefully even if observer misses
    const safetyTimer = setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((el) => {
        el.classList.add('is-revealed');
      });
    }, 750);

    return () => {
      clearTimeout(safetyTimer);
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [dependency]);
}
