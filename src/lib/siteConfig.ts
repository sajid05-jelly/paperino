/**
 * Central Site Configuration for Paperino
 * 
 * Defines global domain, university context, and SEO metadatadefaults.
 * Supports custom domain migration via NEXT_PUBLIC_SITE_URL environment variable.
 */

export const SITE_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://paperino-eta.vercel.app',
  siteName: 'Paperino',
  universityName: 'SRM Institute of Science and Technology',
  universityShortName: 'SRM University',
  author: 'Paperino Team',
  defaultOgImage: '/og-image.png?v=2',
};

/**
 * Get full absolute URL for any path
 */
export function getAbsoluteUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_CONFIG.baseUrl}${cleanPath}`;
}
