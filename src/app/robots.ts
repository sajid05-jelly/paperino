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
          '/free-class-finder',
          '/career-dna',
          '/github-intelligence',
          '/team',
          '/privacy',
          '/about',
          '/contact',
          '/terms',
          '/disclaimer',
          '/weekly-challenges',
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
        userAgent: ['GPTBot', 'Bytespider', 'CCBot', 'ClaudeBot', 'AnthropicAI'],
        disallow: ['/'],
      },
    ],
    sitemap: getAbsoluteUrl('/sitemap.xml'),
  };
}
