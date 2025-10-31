import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para sincronizar estado com localStorage
 * Persiste automaticamente mudanças
 * 
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial se não existir
 * @returns [value, setValue, remove]
 * 
 * @example
 * const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'dark');
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State para armazenar valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Tenta pegar do localStorage
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`[useLocalStorage] Error reading ${key}:`, error);
      return initialValue;
    }
  });

  // Função para setar valor
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Permite passar função como no useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Salva no state
      setStoredValue(valueToStore);
      
      // Salva no localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Dispara evento para sincronizar entre tabs
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.error(`[useLocalStorage] Error setting ${key}:`, error);
    }
  }, [key, storedValue]);

  // Função para remover
  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.error(`[useLocalStorage] Error removing ${key}:`, error);
    }
  }, [key, initialValue]);

  // Sincroniza entre tabs
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`[useLocalStorage] Error syncing ${key}:`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue, remove];
}
