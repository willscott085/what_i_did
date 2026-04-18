import { useRef, useState, useCallback } from "react";

export function useIsTruncated<T extends HTMLElement = HTMLElement>(): [
  (node: T | null) => void,
  boolean,
] {
  const [isTruncated, setIsTruncated] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  const callbackRef = useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) {
      setIsTruncated(false);
      return;
    }

    function check() {
      setIsTruncated(node!.scrollWidth > node!.clientWidth);
    }

    check();

    const observer = new ResizeObserver(check);
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return [callbackRef, isTruncated];
}
