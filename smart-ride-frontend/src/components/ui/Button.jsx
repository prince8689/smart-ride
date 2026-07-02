import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import Spinner from './Spinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  success = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleRipple = (e) => {
    if (disabled || isLoading) return;

    if (onClick) {
      onClick(e);
    }

    if (variant === 'ghost') return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // For touch events, e.clientX/Y might be undefined, so we check touches
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const size = Math.max(rect.width, rect.height);
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    const newRipple = {
      x,
      y,
      size,
      id: Date.now(),
    };

    setRipples((prev) => [...prev, newRipple]);
  };

  const cleanUpRipple = (id) => {
    setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
  };

  const baseStyles = 'relative overflow-hidden inline-flex items-center justify-center font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-navy-900 hover:bg-navy-800 text-white',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
    ghost: 'text-primary-600 hover:bg-primary-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    icon: 'bg-transparent text-navy-500 hover:bg-navy-50 hover:text-navy-900 border border-transparent rounded-lg',
  };

  const sizes = {
    sm: variant === 'icon' ? 'w-[32px] h-[32px]' : 'text-sm px-3 py-1.5 rounded-lg',
    md: variant === 'icon' ? 'w-[40px] h-[40px]' : 'text-base px-5 py-2.5 rounded-xl',
    lg: variant === 'icon' ? 'w-[48px] h-[48px]' : 'text-lg px-6 py-3 rounded-xl',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  return (
    <motion.button
      ref={buttonRef}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : {}}
      className={classes}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      onMouseDown={handleRipple}
      onTouchStart={handleRipple}
      {...props}
    >
      {/* Ripples */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          onAnimationComplete={() => cleanUpRipple(ripple.id)}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            opacity: 0.3
          }}
        />
      ))}

      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center justify-center text-green-400"
          >
            <Check size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} strokeWidth={3} />
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center w-full"
          >
            <div className={`flex items-center justify-center transition-opacity ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
              {isLoading && <Spinner size="sm" color="currentColor" className="mr-2" />}
              {leftIcon && !isLoading && <span className={variant === 'icon' ? '' : 'mr-2'}>{leftIcon}</span>}
              {variant !== 'icon' && <span>{children}</span>}
              {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default Button;
