"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin bar at the top of the screen while the next page loads. Navigation is
 * client-side (next/link, next/form), and the current page stays on screen until
 * the next one is ready, so this is the only sign that something is happening.
 * It starts on clicks of internal links and on GET form submits, and finishes when
 * the URL changes.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // The new page has rendered: complete the bar, then hide it.
  useEffect(() => {
    clearTimers();
    setProgress((p) => (p === null ? null : 100)); // eslint-disable-line react-hooks/set-state-in-effect
    timers.current.push(window.setTimeout(() => setProgress(null), 250));
  }, [pathname, searchParams]);

  useEffect(() => {
    const start = () => {
      clearTimers();
      setProgress(15);
      // Creep towards the end while waiting; give up after 10 s so it can never get stuck.
      timers.current.push(window.setTimeout(() => setProgress(45), 300));
      timers.current.push(window.setTimeout(() => setProgress(70), 1200));
      timers.current.push(window.setTimeout(() => setProgress(85), 3000));
      timers.current.push(window.setTimeout(() => setProgress(null), 10_000));
    };
    const current = () => window.location.pathname + window.location.search;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === current()) return; // same page or an in-page #anchor
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || (form.method || "get").toLowerCase() !== "get" || !form.action) return;
      if (new URL(form.action, window.location.href).origin === window.location.origin) start();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      clearTimers();
    };
  }, []);

  if (progress === null) return null;
  return (
    <div aria-hidden="true" className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none">
      <div className="h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
    </div>
  );
}
