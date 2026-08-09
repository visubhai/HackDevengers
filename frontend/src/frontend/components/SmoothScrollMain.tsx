"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * SmoothScrollMain — renders as <main> and attaches Lenis directly
 * to itself for smooth momentum scrolling with zero idle CPU overhead.
 */
export function SmoothScrollMain({ children, className }: Props) {
  const wrapperRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    const contentEl = contentRef.current;
    if (!wrapperEl || !contentEl) return;

    const lenis = new Lenis({
      wrapper: wrapperEl,
      content: contentEl,
      duration: 1.0,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 1.5,
      infinite: false,
    });

    let rafId: number | null = null;
    let isRunning = true;

    const raf = (time: number) => {
      if (!isRunning) return;
      // Skip Lenis calculations if tab is in background
      if (!document.hidden) {
        lenis.raf(time);
      }
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lenis.stop();
      } else {
        lenis.start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isRunning = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lenis.destroy();
    };
  }, []);

  return (
    <main ref={wrapperRef} className={className} data-lenis-wrapper="">
      <div ref={contentRef} className="w-full">
        {children}
      </div>
    </main>
  );
}
