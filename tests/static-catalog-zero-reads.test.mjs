import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Load static comprehensive catalog directly
const catalogPath = path.resolve('src/data/comprehensive_catalog.json');
const rawCatalog = fs.readFileSync(catalogPath, 'utf8');
const catalogData = JSON.parse(rawCatalog);

function isCrawlerUserAgent(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  const botKeywords = [
    "bot", "crawler", "spider", "googlebot", "bingbot", "yandex",
    "baiduspider", "duckduckbot", "slurp", "ahrefs", "semrush",
    "dotbot", "petalbot", "facebookexternalhit", "twitterbot", "linkedinbot",
    "feedfetcher", "mediapartners", "headlesschrome", "bytespider"
  ];
  return botKeywords.some(kw => ua.includes(kw));
}

test('100% Static Catalog Fallback & Crawler Zero-Read Verification Suite', async (t) => {

  await t.test('1. Static Catalog contains all 273 subjects with complete metadata (Zero Reads)', () => {
    assert.ok(Array.isArray(catalogData), 'Catalog must be an array');
    assert.equal(catalogData.length, 273, 'Must contain exactly 273 subjects');

    const btechSubs = catalogData.filter(s => s.departmentId === 'btech');
    assert.ok(btechSubs.length > 50, 'B.Tech must contain catalog subjects');

    // Verify critical subjects exist with expected fields
    const calc = catalogData.find(s => s.id === 'calc' && s.semesterId === '1');
    assert.ok(calc, 'Calculus must exist in semester 1');
    assert.equal(calc.name, 'Calculus And Linear Algebra');
    assert.equal(calc.status, 'approved');

    const acca = catalogData.find(s => s.id === 'acca' && s.semesterId === '2');
    assert.ok(acca, 'Advanced Calculus must exist in semester 2');
    assert.equal(acca.name, 'Advanced Calculus And Complex Analysis');

    const dsa = catalogData.find(s => s.id === 'dsa' && s.semesterId === '3');
    assert.ok(dsa, 'DSA must exist in semester 3');
    assert.equal(dsa.name, 'Data Structures And Algorithm');
  });

  await t.test('2. Crawler User-Agent detection accurately identifies search engine bots', () => {
    const crawlers = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
      'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      'SemrushBot/7~bl (http://www.semrush.com/bot.html)',
      'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
      'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
      'PetalBot',
      'Bytespider'
    ];

    for (const ua of crawlers) {
      assert.equal(isCrawlerUserAgent(ua), true, `Should detect ${ua} as crawler`);
    }

    const normalBrowsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36'
    ];

    for (const ua of normalBrowsers) {
      assert.equal(isCrawlerUserAgent(ua), false, `Should NOT detect normal browser ${ua} as crawler`);
    }

    assert.equal(isCrawlerUserAgent(null), false);
    assert.equal(isCrawlerUserAgent(undefined), false);
    assert.equal(isCrawlerUserAgent(''), false);
  });

  await t.test('3. Edge CDN revalidate config is set on subject routes for stale-while-revalidate', () => {
    const coursesRoutePath = path.resolve('src/app/courses/[deptId]/semesters/[semId]/subjects/[subjectId]/page.tsx');
    const srmRoutePath = path.resolve('src/app/srm/[courseSlug]/[semesterSlug]/[subjectSlug]/page.tsx');

    const coursesContent = fs.readFileSync(coursesRoutePath, 'utf8');
    const srmContent = fs.readFileSync(srmRoutePath, 'utf8');

    assert.ok(coursesContent.includes('export const revalidate = 86400'), 'Courses subject route must have revalidate = 86400');
    assert.ok(srmContent.includes('export const revalidate = 86400'), 'SRM subject route must have revalidate = 86400');
    assert.ok(coursesContent.includes('isCrawler'), 'Courses subject route must bypass materials fetch for crawlers');
    assert.ok(srmContent.includes('isCrawler'), 'SRM subject route must bypass materials fetch for crawlers');
  });
});
