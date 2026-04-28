import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 600;

/**
 * Autosaves `form` state to localStorage under `key` with 600ms debounce.
 * Returns a `restoreDraft` function to manually load the saved draft.
 *
 * Usage:
 *   const { restoreDraft } = useDraftAutosave("welcome-draft", form, setForm);
 *
 *   // On mount, call restoreDraft() inside useEffect to restore saved values.
 */
export function useDraftAutosave<T extends object>(
  key: string,
  form: T,
  setForm: React.Dispatch<React.SetStateAction<T>>,
): { restoreDraft: () => T | null; discardDraft: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // Debounced write on every form change
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(form));
      } catch {
        // localStorage unavailable — ignore silently
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, key]);

  const restoreDraft = (): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const saved = JSON.parse(raw) as T;
      setForm(saved);
      return saved;
    } catch {
      return null;
    }
  };

  const discardDraft = (): void => {
    // Cancel any pending debounced save
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return { restoreDraft, discardDraft };
}
