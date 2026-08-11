import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/free-class-finder',
          '/career-dna',
          '/github-intelligence',
          '/btech',
          '/courses',
          '/courses/*',
          '/pyq',
          '/ats',
          '/gpa',
          '/calculator',
          '/grades',
          '/leaderboard',
          '/team',
          '/privacy',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/api/*',
          '/auth/*',
          '/login',
          '/profile',
          '/settings',
        ],
      },
      {
        userAgent: ['GPTBot', 'Bytespider', 'CCBot', 'ClaudeBot', 'AnthropicAI'],
        disallow: ['/'],
      },
    ],
    sitemap: 'https://paperino-eta.vercel.app/sitemap.xml',
  };
}
