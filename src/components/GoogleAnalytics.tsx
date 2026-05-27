/**
 * GoogleAnalytics component
 * Injects the GA4 gtag.js script and initialises the tracker.
 * Loaded with `strategy="afterInteractive"` so it never blocks
 * First Contentful Paint or Time To Interactive.
 *
 * Place this ONCE in the root layout — it handles all subsequent
 * route changes via the RouteTracker sibling component.
 */
"use client";

import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      {/* Load gtag.js library — afterInteractive = loaded after hydration */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />

      {/* Initialise GA4 */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  );
}
