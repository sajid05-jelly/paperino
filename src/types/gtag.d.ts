/**
 * Global type augmentation for the GA4 gtag function.
 * This prevents TypeScript errors when calling window.gtag(...)
 */

type GtagCommand = "config" | "event" | "js" | "set";

interface GtagConfigParams {
  page_path?: string;
  page_title?: string;
  send_page_view?: boolean;
  cookie_flags?: string;
  [key: string]: string | number | boolean | undefined;
}

interface GtagEventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: string | number | boolean | undefined;
}

declare global {
  interface Window {
    gtag?: (
      command: GtagCommand,
      targetId: string | Date,
      params?: GtagConfigParams | GtagEventParams
    ) => void;
    dataLayer?: unknown[];
  }
}

export {};
