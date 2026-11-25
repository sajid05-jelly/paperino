import { MetadataRoute } from 'next';
import { getAbsoluteUrl } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/srm',
          '/srm/*',
          '/courses',
          '/pyq',
          '/ats',
          '/gpa',
          '/calculator',
          '/grades',
          '/career-dna',
          '/github-intelligence',
          '/team',
          '/privacy',
          '/about',
          '/contact',
          '/terms',
          '/disclaimer',
          '/weekly-challenges',
          '/blog',
          '/blog/*',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/api/*',
          '/auth/*',
          '/login',
          '/profile',
          '/settings',
          '/contributor',
          '/contributor/*',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'Bytespider',
          'CCBot',
          'ClaudeBot',
          'AnthropicAI',
          'AhrefsBot',
          'SemrushBot',
          'DotBot',
          'MJ12bot',
          'PetalBot',
          'DataForSeoBot'
        ],
        disallow: ['/'],
      },
    ],
    sitemap: getAbsoluteUrl('/sitemap.xml'),
  };
}
