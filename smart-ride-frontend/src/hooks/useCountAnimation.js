import { useState, useEffect, useRef } from 'react';
import { animateNumber } from '../utils/animations';

export default function useCountAnimation(target, duration = 1200, delay = 0) {
  const [displayValue, setDisplayValue] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let cancelAnim;
    
    const timeout = setTimeout(() => {
      cancelAnim = animateNumber(0, target, duration, (val) => {
        if (isMounted.current) {
          setDisplayValue(val);
        }
      });
    }, delay);

    return () => {
      isMounted.current = false;
      clearTimeout(timeout);
      if (cancelAnim) cancelAnim();
    };
  }, [target, duration, delay]);

  return displayValue;
}
