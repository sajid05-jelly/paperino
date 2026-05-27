/**
 * Google Analytics 4 (GA4) utility
 * Measurement ID sourced from NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID env var.
 *
 * Provides:
 *  - pageview tracking (called on route changes)
 *  - custom event tracking helper
 *  - typesafe window.gtag wrapper
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "";

/** Send a pageview hit to GA4 */
export function trackPageView(url: string, title?: string) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title ?? document.title,
    // Sends current timestamp for accurate session duration
    send_page_view: true,
  });
}

/**
 * Send a custom GA4 event.
 * @example trackEvent("click", { event_category: "nav", event_label: "home" })
 */
export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean>
) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  window.gtag?.("event", action, params);
}
