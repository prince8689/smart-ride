// Generate unique IDs for form fields
let idCounter = 0;
export function generateId(prefix = 'sr') {
  return `${prefix}-${++idCounter}`;
}

// Announce to screen readers without visual change
export function announce(message, priority = 'polite') {
  const el = document.getElementById('sr-announcer');
  if (!el) return;
  el.setAttribute('aria-live', priority);
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 50);
}

// Trap focus within an element
export function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return () => {};
  
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handler(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  element.addEventListener('keydown', handler);
  // Auto focus first element on mount
  setTimeout(() => first.focus(), 100);
  
  return () => element.removeEventListener('keydown', handler);
}

// Check if user prefers reduced motion
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
