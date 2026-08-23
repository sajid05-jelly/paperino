import { Metadata } from 'next';
import { SITE_CONFIG, getAbsoluteUrl } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: `PYQ Predictor & AI Analysis | ${SITE_CONFIG.siteName}`,
  description: "Upload past question papers and let AI analyze patterns, predict important topics, and generate study guides.",
  alternates: {
    canonical: getAbsoluteUrl('/pyq'),
  }
};

export default function PyqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
