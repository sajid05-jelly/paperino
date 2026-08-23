import { Metadata } from 'next';
import { SITE_CONFIG, getAbsoluteUrl } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: `Free Class Finder | ${SITE_CONFIG.siteName}`,
  description: "Find empty classrooms at SRM University dynamically. Check real-time availability for group study or club meetings.",
  alternates: {
    canonical: getAbsoluteUrl('/free-class-finder'),
  }
};

export default function FreeClassFinderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
