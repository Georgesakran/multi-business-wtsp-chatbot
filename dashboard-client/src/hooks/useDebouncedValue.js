import { useEffect, useRef, useState } from "react";

/**
 * Debounced controlled input helper.
 * @param {string} value - external value
 * @param {number} delay - ms
 * @param {function} onDebounced - optional callback when debounce settles
 * @returns [localValue, setLocalValue]
 */
export default function useDebouncedValue(value, delay = 300, onDebounced) {
  const [local, setLocal] = useState(value);
  const t = useRef(null);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      if (onDebounced) onDebounced(local);
    }, delay);
    return () => clearTimeout(t.current);
  }, [local, delay, onDebounced]);

  return [local, setLocal];
}