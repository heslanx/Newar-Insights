import { useRef, useEffect } from 'react';

/**
 * Hook para acessar valor anterior de uma variável
 * Útil para comparações e animações
 * 
 * @param value - Valor atual
 * @returns Valor anterior
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * 
 * useEffect(() => {
 *   if (prevCount !== undefined && count > prevCount) {
 *     console.log('Contador aumentou!');
 *   }
 * }, [count, prevCount]);
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
