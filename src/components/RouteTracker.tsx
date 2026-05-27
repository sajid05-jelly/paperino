"use client";

/**
 * RouteTracker
 * Listens to Next.js pathname changes and fires a GA4 pageview
 * on every client-side navigation. Must be placed inside the layout
 * AFTER GoogleAnalytics so gtag is already initialised.
 *
 * Tracks:
 *  - page_path  → most visited pages report
 *  - page_title → human-readable page names in GA
 *  - referrer   → traffic sources
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

export default function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Track the previous URL so we don't double-fire on mount
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Skip if URL hasn't actually changed (strict-mode double-invoke guard)
    if (url === prevUrl.current) return;
    prevUrl.current = url;

    // Small timeout lets the new page's <title> render before we read it
    const timer = setTimeout(() => {
      trackPageView(url, document.title);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
