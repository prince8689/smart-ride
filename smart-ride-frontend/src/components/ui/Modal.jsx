import React, { useEffect, useRef, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { trapFocus } from '../../utils/a11y';
import { SkeletonCard } from './Skeleton';

// Track open modals to handle stacking
let openModals = [];

const Modal = ({ isOpen, onClose, title, children, size = 'md', isLoading = false }) => {
  const modalId = useId();
  const modalRef = useRef(null);
  const [stackIndex, setStackIndex] = useState(-1);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mounting and unmounting for stacking and scroll lock
  useEffect(() => {
    if (isOpen) {
      if (!openModals.includes(modalId)) {
        openModals = [...openModals, modalId];
      }
      setStackIndex(openModals.indexOf(modalId));

      // Scroll lock for first modal
      if (openModals.length === 1) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      openModals = openModals.filter(id => id !== modalId);
      // Remove scroll lock if last modal
      if (openModals.length === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    }

    return () => {
      openModals = openModals.filter(id => id !== modalId);
      if (openModals.length === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    };
  }, [isOpen, modalId]);

  // Handle dynamic stack index updates when other modals open/close
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setStackIndex(openModals.indexOf(modalId));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isOpen, modalId]);

  // Keyboard escape
  useEffect(() => {
    const handleEscape = (e) => {
      // Only top modal should close on escape
      if (e.key === 'Escape' && openModals[openModals.length - 1] === modalId && !isLoading) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose, modalId]);

  // Focus trap
  useEffect(() => {
    let cleanup;
    if (isOpen && modalRef.current && !isLoading) {
      cleanup = trapFocus(modalRef.current);
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [isOpen, isLoading]);

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const isTopModal = stackIndex === openModals.length - 1;
  const isStackedBelow = !isTopModal && stackIndex !== -1;

  const handleBackdropClick = () => {
    if (!isLoading && isTopModal) onClose();
  };

  // Animations
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: isMobile ? '100%' : 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: isMobile ? '100%' : 20,
      transition: { duration: 0.15, ease: 'easeIn' } 
    },
    stacked: {
      scale: 0.97,
      filter: 'blur(2px)',
      opacity: 0.8,
      y: -10,
      transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {isTopModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 z-[100] bg-navy-900/40 backdrop-blur-sm"
            />
          )}

          {/* Modal Container */}
          <div 
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none md:p-4"
            style={{ zIndex: 100 + stackIndex }}
          >
            <motion.div
              ref={modalRef}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag={isMobile ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (isMobile && info.offset.y > 50 && !isLoading) {
                  onClose();
                }
              }}
              className={`bg-white shadow-xl w-full flex flex-col pointer-events-auto
                ${isMobile ? 'rounded-t-2xl pb-safe h-auto max-h-[90vh]' : `rounded-2xl ${sizes[size]} max-h-[90vh]`}
              `}
            >
              {/* Mobile Drag Handle */}
              {isMobile && (
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-navy-200 rounded-full"></div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 shrink-0">
                <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
                <button
                  onClick={() => !isLoading && onClose()}
                  disabled={isLoading}
                  aria-label="Close modal"
                  className="p-2 text-navy-400 hover:text-navy-600 hover:bg-navy-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <SkeletonCard lines={4} showAvatar={false} />
                  </div>
                ) : (
                  children
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
