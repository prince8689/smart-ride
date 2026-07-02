export const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

export const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.25, ease: 'easeOut' }
  }
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
};

export const scalePop = {
  initial: { scale: 1 },
  tap: { scale: 0.95 },
  hover: { scale: 1.02 }
};

export const slideUp = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0, opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 300 }
  },
  exit: {
    y: '100%', opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
};

export const shake = {
  initial: { x: 0 },
  shake: {
    x: [-8, 8, -6, 6, -4, 4, 0],
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

export function animateNumber(from, to, duration, onUpdate) {
  const startTime = performance.now();
  let animationFrameId;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    
    onUpdate(Math.round(from + (to - from) * eased));
    
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(update);
    }
  }
  
  animationFrameId = requestAnimationFrame(update);
  return () => cancelAnimationFrame(animationFrameId);
}
