import { useEffect } from "react";

export function useFocusTrap(containerRef: { current: HTMLElement | null }, isActive: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    if (!container) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const timer = setTimeout(() => {
      if (first) first.focus();
      else container.focus();
    }, 0);

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        const active = document.activeElement as HTMLElement | null;
        const idx = focusable.indexOf(active as HTMLElement);
        if (e.shiftKey) {
          const prevIndex = idx > 0 ? idx - 1 : focusable.length - 1;
          focusable[prevIndex]?.focus();
        } else {
          const nextIndex = idx >= 0 && idx < focusable.length - 1 ? idx + 1 : 0;
          focusable[nextIndex]?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      if (previousActive) previousActive.focus();
    };
  }, [containerRef, isActive, onClose]);
}

export default useFocusTrap;
