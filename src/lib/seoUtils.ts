import { UnifiedSubject } from "./unifiedSubjectData";
import { SITE_CONFIG, getAbsoluteUrl } from "./siteConfig";

/**
 * Generate a clean, lowercase, hyphenated URL slug for a subject.
 * Combines subject name and subject code (or id if no code exists).
 * Example:
 *  - "Full Stack Web Development", "21CSE354T" -> "full-stack-web-development-21cse354t"
 *  - "Community Connect", "21GNP301L"       -> "community-connect-21gnp301l"
 *  - "Calculus and Linear Algebra", ""        -> "calculus-and-linear-algebra-calc"
 */
export function getSubjectSlug(subject: { name: string; code?: string; id: string }): string {
  const cleanName = (subject.name || subject.id)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const cleanCode = (subject.code || subject.id)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (cleanCode && !cleanName.includes(cleanCode)) {
    return `${cleanName}-${cleanCode}`;
  }

  return cleanName || subject.id.toLowerCase();
}

/**
 * Generate canonical relative path for a subject SEO page
 * Example: /srm/btech/semester-5/full-stack-web-development-21cse354t
 */
export function getSubjectSeoPath(subject: {
  id: string;
  name: string;
  code?: string;
  departmentId: string;
  semesterId: string | number;
}): string {
  const deptSlug = (subject.departmentId || "btech").toLowerCase();
  const semNum = String(subject.semesterId || "1");
  const subSlug = getSubjectSlug(subject);
  return `/srm/${deptSlug}/semester-${semNum}/${subSlug}`;
}

/**
 * Generate full absolute canonical URL for a subject SEO page
 */
export function getSubjectCanonicalUrl(subject: {
  id: string;
  name: string;
  code?: string;
  departmentId: string;
  semesterId: string | number;
}): string {
  return getAbsoluteUrl(getSubjectSeoPath(subject));
}

/**
 * Find matching subject from dynamic/static subjects array using URL parameters & subject slug
 */
export function matchSubjectBySlug(
  deptId: string,
  semId: string,
  subjectSlug: string,
  subjects: UnifiedSubject[]
): UnifiedSubject | null {
  const deptSubjects = subjects.filter(
    s => s.departmentId.toLowerCase() === deptId.toLowerCase() && String(s.semesterId) === String(semId)
  );

  if (deptSubjects.length === 0) return null;

  const targetSlug = subjectSlug.toLowerCase();

  // 1. Direct slug match
  const exactMatch = deptSubjects.find(s => getSubjectSlug(s).toLowerCase() === targetSlug);
  if (exactMatch) return exactMatch;

  // 2. ID match fallback
  const idMatch = deptSubjects.find(s => s.id.toLowerCase() === targetSlug);
  if (idMatch) return idMatch;

  // 3. Code match fallback
  const codeMatch = deptSubjects.find(
    s => s.code && s.code.toLowerCase().replace(/[^a-z0-9]/g, "") === targetSlug.replace(/[^a-z0-9]/g, "")
  );
  if (codeMatch) return codeMatch;

  // 4. Loose substring / name match
  const looseMatch = deptSubjects.find(s => {
    const slug = getSubjectSlug(s).toLowerCase();
    return targetSlug.includes(s.id.toLowerCase()) || slug.includes(targetSlug) || targetSlug.includes(slug);
  });

  return looseMatch || null;
}

/**
 * Generate Schema.org JSON-LD Structured Data for a Subject Page
 */
export function generateSubjectJsonLd(params: {
  subjectName: string;
  subjectCode: string;
  deptName: string;
  semId: string;
  canonicalUrl: string;
  materialsCount: number;
}) {
  const { subjectName, subjectCode, deptName, semId, canonicalUrl, materialsCount } = params;
  const codeDisplay = subjectCode ? ` (${subjectCode})` : "";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${canonicalUrl}#course`,
        "name": `${subjectName}${codeDisplay}`,
        "courseCode": subjectCode || undefined,
        "description": `Study materials, notes, previous year question papers (PYQs), and academic resources for ${subjectName}${codeDisplay} at ${SITE_CONFIG.universityName}.`,
        "provider": {
          "@type": "CollegeOrUniversity",
          "name": SITE_CONFIG.universityName,
          "sameAs": "https://www.srmist.edu.in/"
        },
        "educationalCredentialAwarded": deptName,
        "hasCourseInstance": {
          "@type": "CourseInstance",
          "name": `${deptName} Semester ${semId}`,
          "courseMode": "Full-Time Academic"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": SITE_CONFIG.baseUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "SRM University",
            "item": `${SITE_CONFIG.baseUrl}/srm`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": deptName,
            "item": `${SITE_CONFIG.baseUrl}/srm/${params.deptName.toLowerCase().includes("tech") ? "btech" : "courses"}`
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": `Semester ${semId}`,
            "item": `${SITE_CONFIG.baseUrl}/srm/btech/semester-${semId}`
          },
          {
            "@type": "ListItem",
            "position": 5,
            "name": `${subjectName}${codeDisplay}`,
            "item": canonicalUrl
          }
        ]
      },
      {
        "@type": "WebPage",
        "@id": canonicalUrl,
        "url": canonicalUrl,
        "name": `${subjectName}${codeDisplay} Notes, PYQs & Study Materials | ${SITE_CONFIG.siteName}`,
        "description": `Find ${subjectName}${codeDisplay} study materials, notes, previous year question papers, important questions and academic resources for SRM students.`,
        "isPartOf": {
          "@type": "WebSite",
          "name": SITE_CONFIG.siteName,
          "url": SITE_CONFIG.baseUrl
        }
      }
    ]
  };
}
