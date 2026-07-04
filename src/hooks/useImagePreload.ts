import { useEffect, useRef, useState } from "react";

/**
 * Preloads a list of image URLs and reports when they're all ready.
 *
 * Safety rails (non-negotiable, not optional):
 * - A failed image (bad URL, dead CDN link) counts as "done", not "stuck" —
 *   one broken image must never block the rest of the page forever.
 * - A hard timeout guarantees `ready` flips to true even if the network stalls,
 *   so a slow connection degrades to "images pop in late" instead of
 *   "page never opens".
 */
export function useImagePreload(urls: (string | null | undefined)[], timeoutMs = 5000) {
  const cleanUrls = urls.filter((u): u is string => !!u);
  const key = cleanUrls.join("|");

  const [ready, setReady] = useState(cleanUrls.length === 0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (cleanUrls.length === 0) {
      setReady(true);
      return;
    }

    setReady(false);
    let remaining = cleanUrls.length;
    let settled = false;

    const finish = () => {
      if (settled || !mountedRef.current) return;
      settled = true;
      setReady(true);
    };

    const timeoutId = setTimeout(finish, timeoutMs);

    cleanUrls.forEach((url) => {
      const img = new Image();
      const onDone = () => {
        remaining -= 1;
        if (remaining <= 0) {
          clearTimeout(timeoutId);
          finish();
        }
      };
      img.onload = onDone;
      img.onerror = onDone; // a broken image still counts as "handled"
      img.src = url;
    });

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, timeoutMs]);

  return ready;
}
