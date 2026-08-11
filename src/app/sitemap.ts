import { MetadataRoute } from 'next';
import { getAllUnifiedData } from '@/lib/unifiedSubjectData';
import { getSubjectSeoPath } from '@/lib/seoUtils';
import { SITE_CONFIG, getAbsoluteUrl } from '@/lib/siteConfig';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_CONFIG.baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: getAbsoluteUrl('/srm'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: getAbsoluteUrl('/courses'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl('/btech'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl('/pyq'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl('/ats'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl('/gpa'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl('/grades'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl('/leaderboard'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl('/team'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: getAbsoluteUrl('/free-class-finder'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl('/career-dna'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl('/github-intelligence'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl('/privacy'),
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Fetch all unified courses, semesters, and subjects (Static + Firestore)
  const { departments, subjects } = await getAllUnifiedData();

  // Helper to format lastModified safely from Firestore timestamp, number, or Date
  const parseLastModified = (rawTs: any): Date => {
    if (!rawTs) return new Date();
    if (typeof rawTs.toDate === "function") return rawTs.toDate();
    if (rawTs instanceof Date) return rawTs;
    if (typeof rawTs === "number" || typeof rawTs === "string") {
      const d = new Date(rawTs);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Dynamically generate Course landing URLs (both /srm/[course] and /courses/[dept])
  const coursePages: MetadataRoute.Sitemap = [];
  departments.forEach((d) => {
    const lastMod = parseLastModified(d.updatedAt || d.createdAt);
    coursePages.push({
      url: getAbsoluteUrl(`/srm/${d.id.toLowerCase()}`),
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
    coursePages.push({
      url: getAbsoluteUrl(`/courses/${d.id}`),
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  });

  // Dynamically generate Semester URLs for all courses
  const semesterPages: MetadataRoute.Sitemap = [];
  departments.forEach((d) => {
    const lastMod = parseLastModified(d.updatedAt || d.createdAt);
    for (let sem = 1; sem <= (d.totalSemesters || 8); sem++) {
      semesterPages.push({
        url: getAbsoluteUrl(`/srm/${d.id.toLowerCase()}/semester-${sem}`),
        lastModified: lastMod,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
      semesterPages.push({
        url: getAbsoluteUrl(`/courses/${d.id}/semesters/${sem}`),
        lastModified: lastMod,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  });

  // Dynamically generate ALL Subject URLs across ALL courses & semesters
  const subjectPages: MetadataRoute.Sitemap = [];
  const subjectUrlSet = new Set<string>();

  subjects.forEach((s) => {
    const lastMod = parseLastModified(s.updatedAt || s.createdAt);
    const seoUrl = getAbsoluteUrl(getSubjectSeoPath(s));
    
    if (!subjectUrlSet.has(seoUrl)) {
      subjectUrlSet.add(seoUrl);
      subjectPages.push({
        url: seoUrl,
        lastModified: lastMod,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }

    const legacyUrl = getAbsoluteUrl(`/courses/${s.departmentId}/semesters/${s.semesterId}/subjects/${s.id}`);
    if (!subjectUrlSet.has(legacyUrl)) {
      subjectUrlSet.add(legacyUrl);
      subjectPages.push({
        url: legacyUrl,
        lastModified: lastMod,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  });

  return [...staticPages, ...coursePages, ...semesterPages, ...subjectPages];
}
