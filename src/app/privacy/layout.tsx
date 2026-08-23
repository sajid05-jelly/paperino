import { Metadata } from 'next';
import { SITE_CONFIG, getAbsoluteUrl } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_CONFIG.siteName}`,
  description: "Privacy policy and terms of service for Paperino.",
  alternates: {
    canonical: getAbsoluteUrl('/privacy'),
  }
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
