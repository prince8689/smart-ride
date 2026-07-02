import { useState, useEffect, useCallback } from 'react';

export function useLongPress(callback = () => {}, ms = 300) {
  const [startLongPress, setStartLongPress] = useState(false);

  useEffect(() => {
    let timerId;
    if (startLongPress) {
      timerId = setTimeout(callback, ms);
    } else {
      clearTimeout(timerId);
    }
    return () => clearTimeout(timerId);
  }, [callback, ms, startLongPress]);

  const start = useCallback((e) => {
    // Prevent default context menu on touch devices
    if (e.touches) e.preventDefault();
    setStartLongPress(true);
  }, []);
  
  const stop = useCallback(() => {
    setStartLongPress(false);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
