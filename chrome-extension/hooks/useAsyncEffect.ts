import { useEffect, useState, DependencyList } from 'react';

/**
 * Hook para executar efeitos assíncronos com cleanup automático
 * Previne race conditions e memory leaks
 * 
 * @example
 * useAsyncEffect(async (signal) => {
 *   const data = await fetchData(signal);
 *   if (!signal.aborted) {
 *     setData(data);
 *   }
 * }, []);
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList
) {
  useEffect(() => {
    const controller = new AbortController();
    
    effect(controller.signal).catch(error => {
      // Ignora erros de abort
      if (error.name !== 'AbortError') {
        console.error('[useAsyncEffect] Error:', error);
      }
    });
    
    // Cleanup: cancela operação quando componente desmonta ou deps mudam
    return () => controller.abort();
  }, deps);
}

/**
 * Hook para gerenciar estado de loading/error em operações assíncronas
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useAsyncEffect(async (signal) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      
      if (!signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (!signal.aborted) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, deps);

  return { data, loading, error };
}
