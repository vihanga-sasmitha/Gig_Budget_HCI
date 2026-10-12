import { useState, useCallback } from 'react';

export function usePinEntry(maxLength = 4) {
  const [pin, setPin] = useState('');

  const onKey = useCallback(
    (key) => {
      setPin((prev) => {
        if (key === 'back') return prev.slice(0, -1);
        if (prev.length >= maxLength) return prev;
        if (key === '.' ) return prev;
        return prev + key;
      });
    },
    [maxLength]
  );

  const clear = useCallback(() => setPin(''), []);

  return { pin, onKey, clear, setPin };
}
