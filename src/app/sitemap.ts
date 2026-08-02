import { MetadataRoute } from 'next';
import { getAllUnifiedData } from '@/lib/unifiedSubjectData';

const BASE_URL = 'https://paperino-eta.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/btech`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pyq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ats`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gpa`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/grades`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/team`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/free-class-finder`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/career-dna`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/github-intelligence`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Fetch all unified courses, semesters, and subjects (Static + Firestore)
  const { departments, subjects } = await getAllUnifiedData();

  // Dynamically generate Course landing URLs
  const coursePages: MetadataRoute.Sitemap = departments.map((d) => ({
    url: `${BASE_URL}/courses/${d.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Dynamically generate Semester URLs for all courses
  const semesterPages: MetadataRoute.Sitemap = [];
  departments.forEach((d) => {
    for (let sem = 1; sem <= (d.totalSemesters || 8); sem++) {
      semesterPages.push({
        url: `${BASE_URL}/courses/${d.id}/semesters/${sem}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  });

  // Dynamically generate ALL Subject URLs across ALL courses & semesters
  const subjectPages: MetadataRoute.Sitemap = subjects.map((s) => ({
    url: `${BASE_URL}/courses/${s.departmentId}/semesters/${s.semesterId}/subjects/${s.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  return [...staticPages, ...coursePages, ...semesterPages, ...subjectPages];
}


