import React, { forwardRef, useState, useRef, useImperativeHandle } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Input = forwardRef(({
  label,
  error,
  leftIcon,
  rightIcon,
  helper,
  className = '',
  id,
  type = 'text',
  showStrength = false,
  maxLength,
  readOnly,
  copyable = false,
  clearable = false,
  value: propValue,
  onChange: propOnChange,
  onFocus: propOnFocus,
  onBlur: propOnBlur,
  placeholder,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  const [internalValue, setInternalValue] = useState(propValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const internalRef = useRef(null);
  useImperativeHandle(ref, () => internalRef.current);

  const value = propValue !== undefined ? propValue : internalValue;
  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  // Detect browser autofill
  React.useEffect(() => {
    const checkAutofill = () => {
      if (internalRef.current && internalRef.current.value && !internalValue) {
        setInternalValue(internalRef.current.value);
      }
    };
    
    checkAutofill();
    const t1 = setTimeout(checkAutofill, 100);
    const t2 = setTimeout(checkAutofill, 500);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [internalValue]);

  const handleChange = (e) => {
    let newVal = e.target.value;

    if (type === 'tel') {
      // Auto-format for phone: only digits, space after 5
      const digits = newVal.replace(/\D/g, '');
      if (digits.length > 5) {
        newVal = `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
      } else {
        newVal = digits;
      }
      e.target.value = newVal; // update event value for RHF
    }

    if (propValue === undefined) setInternalValue(newVal);
    if (propOnChange) propOnChange(e);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (propOnFocus) propOnFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (propOnBlur) propOnBlur(e);
  };

  const handleClear = () => {
    if (internalRef.current) {
      // Create native event to trigger react-hook-form correctly
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(internalRef.current, '');
      const event = new Event('input', { bubbles: true });
      internalRef.current.dispatchEvent(event);
      internalRef.current.focus();
    }
  };

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(String(value));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Calculate password strength
  let strengthScore = 0;
  if (type === 'password' && showStrength && value) {
    const val = String(value);
    if (val.length >= 8) strengthScore++;
    if (/[A-Z]/.test(val)) strengthScore++;
    if (/[a-z]/.test(val)) strengthScore++;
    if (/[0-9]/.test(val)) strengthScore++;
    if (/[^A-Za-z0-9]/.test(val)) strengthScore++;
    strengthScore = Math.min(4, Math.max(0, strengthScore - 1));
  }
  
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  const alwaysFloatTypes = ['date', 'time', 'datetime-local', 'month', 'week', 'file'];
  const isFloating = isFocused || hasValue || alwaysFloatTypes.includes(type);

  return (
    <div className={`flex flex-col w-full ${className}`}>
      <div className="relative pt-2">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 pt-2 flex items-center pointer-events-none text-navy-400 z-10">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={internalRef}
          id={inputId}
          type={type}
          readOnly={readOnly}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFloating ? placeholder : ''} // Only show placeholder when floating to not clash with label
          className={`
            input-field
            w-full border rounded-xl px-4 py-3 bg-white text-navy-900 transition-all duration-200 outline-none
            ${leftIcon ? 'pl-10' : ''}
            ${(rightIcon || copyable || clearable) ? 'pr-10' : ''}
            ${error 
              ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100' 
              : 'border-navy-200 focus:border-primary-600 focus:ring-2 focus:ring-primary-100'
            }
            disabled:bg-navy-50 disabled:text-navy-400 disabled:cursor-not-allowed
            ${readOnly ? 'bg-navy-50/50 focus:ring-0 cursor-default' : ''}
          `}
          {...props}
        />

        {label && (
          <label 
            htmlFor={inputId} 
            className={`floating-label absolute left-3 transition-all duration-150 ease-out z-10 pointer-events-none
              ${leftIcon ? 'ml-7' : ''}
              ${isFloating 
                ? '-top-0.5 text-xs font-bold text-primary-600 bg-white px-1' 
                : 'top-1/2 -translate-y-1/2 text-sm text-navy-400 font-medium'
              }
              ${error && isFloating ? 'text-red-500' : ''}
            `}
          >
            {label}
          </label>
        )}
        
        <div className="absolute inset-y-0 right-0 pr-3 pt-2 flex items-center text-navy-400">
          {clearable && hasValue && !readOnly && (
            <button type="button" onClick={handleClear} className="p-1 hover:bg-navy-100 rounded-full text-navy-400 hover:text-navy-600 transition-colors mr-1">
              <X size={16} />
            </button>
          )}
          
          {copyable && readOnly && (
            <button type="button" onClick={handleCopy} className="p-1 hover:bg-navy-100 rounded-lg text-navy-500 transition-colors relative" title="Copy to clipboard">
              <AnimatePresence mode="wait">
                {isCopied ? (
                  <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-green-600">
                    <Check size={18} />
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Copy size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}

          {rightIcon && !copyable && (
            <div className="cursor-pointer">
              {rightIcon}
            </div>
          )}
        </div>
      </div>

      {type === 'password' && showStrength && hasValue && (
        <div className="flex gap-1 mt-2 px-1">
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="h-1 flex-1 rounded-full bg-navy-100 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${strengthScore >= index ? strengthColors[strengthScore] : 'bg-transparent'}`} 
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-start mt-1 px-1">
        <div className="flex-1">
          {error && <p className="text-red-500 text-xs">{error}</p>}
          {!error && helper && <p className="text-navy-500 text-xs">{helper}</p>}
        </div>
        
        {maxLength && (
          <span className={`text-xs ml-2 font-medium transition-colors ${String(value).length >= maxLength * 0.9 ? 'text-red-500' : 'text-navy-400'}`}>
            {String(value).length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
