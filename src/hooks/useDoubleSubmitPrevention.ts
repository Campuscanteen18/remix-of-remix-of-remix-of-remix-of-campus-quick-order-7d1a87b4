import { useState, useCallback, useRef } from 'react';

/**
 * Hook to prevent double-submit on forms and buttons
 * Especially useful for payment/checkout flows
 */
export function useDoubleSubmitPrevention(cooldownMs: number = 3000) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitRef = useRef<number>(0);

  const canSubmit = useCallback(() => {
    const now = Date.now();
    if (now - lastSubmitRef.current < cooldownMs) {
      return false;
    }
    return !isSubmitting;
  }, [cooldownMs, isSubmitting]);

  const startSubmit = useCallback(() => {
    if (!canSubmit()) {
      return false;
    }
    lastSubmitRef.current = Date.now();
    setIsSubmitting(true);
    return true;
  }, [canSubmit]);

  const endSubmit = useCallback(() => {
    setIsSubmitting(false);
  }, []);

  const withSubmitProtection = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
      if (!startSubmit()) {
        console.warn('Double submit prevented');
        return null;
      }

      try {
        return await asyncFn();
      } finally {
        endSubmit();
      }
    },
    [startSubmit, endSubmit]
  );

  return {
    isSubmitting,
    canSubmit,
    startSubmit,
    endSubmit,
    withSubmitProtection,
  };
}
