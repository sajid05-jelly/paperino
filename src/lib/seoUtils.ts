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
/**
 * Generate a clean, lowercase, hyphenated URL slug for a subject.
 * Examples:
 *  - "Calculus And Linear Algebra", ""        -> "calculus-and-linear-algebra"
 *  - "Full Stack Web Development", "21CSE354T" -> "full-stack-web-development-21cse354t"
 *  - "Community Connect", "21GNP301L"       -> "community-connect-21gnp301l"
 *  - "Fundamental Of Economics (FOE)", ""    -> "fundamental-of-economics-foe"
 */
export function getSubjectSlug(subject: { name: string; code?: string; id: string }): string {
  const cleanName = (subject.name || subject.id)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const cleanCode = (subject.code || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (cleanCode && !cleanName.includes(cleanCode)) {
    return `${cleanName}-${cleanCode}`;
  }

  return cleanName || subject.id.toLowerCase();
}

export function getSubjectSeoPath(subject: {
  id: string;
  name?: string;
  code?: string;
  departmentId: string;
  semesterId: string | number;
}): string {
  const deptSlug = (subject.departmentId || "btech").toLowerCase();
  const semNum = String(subject.semesterId || "1");
  const slug = getSubjectSlug({ name: subject.name || subject.id, code: subject.code, id: subject.id });
  return `/srm/${deptSlug}/semester-${semNum}/${slug}`;
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
  const cleanSemId = String(semId || "").replace(/^semester-/, "");
  const deptSubjects = subjects.filter(
    s => s.departmentId.toLowerCase() === deptId.toLowerCase() && String(s.semesterId) === cleanSemId
  );

  if (deptSubjects.length === 0) return null;

  const targetSlug = subjectSlug.toLowerCase().trim();
  const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  const normalizedTarget = normalize(targetSlug);

  // 1. Direct slug match (e.g. calculus-and-linear-algebra)
  const exactSlugMatch = deptSubjects.find(s => normalize(getSubjectSlug(s)) === normalizedTarget);
  if (exactSlugMatch) return exactSlugMatch;

  // 2. Clean subject name match
  const nameMatch = deptSubjects.find(s => normalize(s.name) === normalizedTarget);
  if (nameMatch) return nameMatch;

  // 3. Subject ID match (e.g. calc or calculus-and-linear-algebra-calc)
  const idMatch = deptSubjects.find(
    s => s.id.toLowerCase() === targetSlug || normalize(s.id) === normalizedTarget || normalizedTarget.endsWith(`-${s.id.toLowerCase()}`)
  );
  if (idMatch) return idMatch;

  // 4. Subject code match (e.g. 21cse354t)
  const codeMatch = deptSubjects.find(
    s => s.code && normalize(s.code).replace(/-/g, "") === targetSlug.replace(/[^a-z0-9]/g, "")
  );
  if (codeMatch) return codeMatch;

  // 5. Loose / Partial name & slug match
  const partialMatch = deptSubjects.find(s => {
    const sSlug = normalize(getSubjectSlug(s));
    const sName = normalize(s.name);
    return sSlug.includes(normalizedTarget) || normalizedTarget.includes(sSlug) ||
           sName.includes(normalizedTarget) || normalizedTarget.includes(sName);
  });

  return partialMatch || null;
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
