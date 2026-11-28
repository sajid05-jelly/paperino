import { Metadata } from "next";
import { headers } from "next/headers";
import { getStaticUnifiedData, getSubjectDetails, isCrawlerUserAgent } from "@/lib/unifiedSubjectData";
import { getSubjectCanonicalUrl, generateSubjectJsonLd, getSubjectSeoPath } from "@/lib/seoUtils";
import { SITE_CONFIG } from "@/lib/siteConfig";
import SubjectClientComponent from "@/components/SubjectClientComponent";
import { adminDb } from "@/lib/firebase-admin";
import { SUBJECTS as STATIC_SUBJECTS, isMatchingDepartment } from "@/lib/subjects";

export const dynamicParams = true;
export const revalidate = 86400; // 24-hour Edge CDN caching (ISR) with stale-while-revalidate

export async function generateStaticParams() {
  const { subjects } = getStaticUnifiedData();
  return subjects.map((s) => ({
    deptId: s.departmentId,
    semId: s.semesterId,
    subjectId: s.id,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ deptId: string, semId: string, subjectId: string }> }): Promise<Metadata> {
  const { deptId, semId, subjectId } = await params;
  const { subjects, departments } = getStaticUnifiedData(deptId, semId);
  
  const foundSubject = subjects.find(s => s.departmentId === deptId && String(s.semesterId) === String(semId) && s.id === subjectId);
  const { subjectName, subjectCode, deptName, deptCode } = await getSubjectDetails(deptId, semId, subjectId);

  const codeDisplay = subjectCode ? ` (${subjectCode})` : "";
  const title = `${subjectName}${codeDisplay} Notes, PYQs & Study Materials | ${deptCode} Sem ${semId} | ${SITE_CONFIG.siteName}`;
  const description = `Access ${subjectName}${codeDisplay} study materials, notes, previous year question papers (PYQs), important questions, and academic resources for ${SITE_CONFIG.universityShortName} ${deptCode} Semester ${semId} students on ${SITE_CONFIG.siteName}.`;
  
  const canonicalUrl = foundSubject ? getSubjectCanonicalUrl(foundSubject) : getSubjectCanonicalUrl({ id: subjectId, name: subjectName, code: subjectCode, departmentId: deptId, semesterId: semId });

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: SITE_CONFIG.siteName,
      images: [{ url: SITE_CONFIG.defaultOgImage, width: 1200, height: 630, alt: `${subjectName}${codeDisplay} Study Materials - ${SITE_CONFIG.siteName}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_CONFIG.defaultOgImage],
    },
  };
}

const serverMaterialsCache = new Map<string, { data: any[]; timestamp: number }>();
const SERVER_MATS_CACHE_TTL = 15 * 60 * 1000;

async function fetchServerMaterials(deptId: string, semId: string, subjectId: string, isCrawler: boolean = false) {
  // During SSG static build generation or for crawlers, skip Firestore materials queries to avoid burning reads.
  // The client component seamlessly fetches fresh materials at runtime via /api/materials or sessionStorage cache.
  if (isCrawler || process.env.NEXT_PHASE === "phase-production-build" || process.env.IS_NEXT_BUILD === "true") {
    return [];
  }
  if (!adminDb) return [];
  const cleanSemId = String(semId).replace(/^semester-/, "").trim();
  const cacheKey = `${deptId.toLowerCase()}_${cleanSemId}_${subjectId.toLowerCase()}`;
  const now = Date.now();
  const cached = serverMaterialsCache.get(cacheKey);
  if (cached && (now - cached.timestamp < SERVER_MATS_CACHE_TTL)) {
    return cached.data;
  }

  try {
    const numericSemId = parseInt(cleanSemId, 10);
    const candidateIds = new Set<string>();
    if (subjectId) candidateIds.add(subjectId);

    const semSubs = STATIC_SUBJECTS[cleanSemId] || [];
    for (const sub of semSubs) {
      const sSlug = sub.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      if (candidateIds.has(sub.id.toLowerCase()) || candidateIds.has(sSlug)) {
        candidateIds.add(sub.id);
        candidateIds.add(sub.id.toLowerCase());
        candidateIds.add(sSlug);
      }
    }

    const queries: Promise<any>[] = [];
    candidateIds.forEach((sId) => {
      queries.push(
        adminDb!
          .collection("materials")
          .where("semesterId", "==", cleanSemId)
          .where("subjectId", "==", sId)
          .get()
      );
      if (!isNaN(numericSemId)) {
        queries.push(
          adminDb!
            .collection("materials")
            .where("semesterId", "==", numericSemId)
            .where("subjectId", "==", sId)
            .get()
        );
      }
    });

    const fetchPromise = Promise.all(queries);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 6000));
    const snaps: any = await Promise.race([fetchPromise, timeoutPromise]);

    if (!snaps || !Array.isArray(snaps)) return cached ? cached.data : [];

    const seenIds = new Set<string>();
    const materials: any[] = [];
    const normReqDept = deptId.toLowerCase().replace(/[^a-z0-9]/g, "");

    snaps.forEach((snap: any) => {
      if (snap && snap.docs) {
        snap.docs.forEach((d: any) => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            const data = docData(d);
            const isApproved = data.status === "approved" || (!data.status && !data.rejectedAt);
            const matchesDept = isMatchingDepartment(deptId, data.departmentId);

            if (isApproved && matchesDept) {
              materials.push({
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
                uploadedAt: data.uploadedAt?.toDate ? data.uploadedAt.toDate().toISOString() : data.uploadedAt || null,
              });
            }
          }
        });
      }
    });

    serverMaterialsCache.set(cacheKey, { data: materials, timestamp: now });
    return materials;
  } catch (e) {
    return cached ? cached.data : [];
  }
}

function docData(d: any) {
  return d.data();
}

export default async function SubjectPage({ params }: { params: Promise<{ deptId: string, semId: string, subjectId: string }> }) {
  const { deptId, semId, subjectId } = await params;
  let isCrawler = false;
  try {
    const reqHeaders = await headers();
    isCrawler = isCrawlerUserAgent(reqHeaders.get("user-agent"));
  } catch {}

  const { subjects, departments } = getStaticUnifiedData(deptId, semId);
  
  const foundSubject = subjects.find(s => s.departmentId === deptId && String(s.semesterId) === String(semId) && s.id === subjectId);
  const { subjectName, subjectCode, deptName, deptCode } = await getSubjectDetails(deptId, semId, subjectId);

  const canonicalUrl = foundSubject ? getSubjectCanonicalUrl(foundSubject) : getSubjectCanonicalUrl({ id: subjectId, name: subjectName, code: subjectCode, departmentId: deptId, semesterId: semId });

  const serverMaterials = await fetchServerMaterials(deptId, semId, subjectId, isCrawler);
  const pyqs = serverMaterials.filter((m: any) => m.category === "pyq");
  const notes = serverMaterials.filter((m: any) => m.category === "notes");
  const questions = serverMaterials.filter((m: any) => m.category === "questions");

  const jsonLd = generateSubjectJsonLd({
    subjectName,
    subjectCode,
    deptName,
    semId: String(semId),
    canonicalUrl,
    materialsCount: serverMaterials.length,
  });

  const serverOverview = {
    subjectName,
    subjectCode,
    deptName,
    deptCode,
    semId: String(semId),
    universityName: SITE_CONFIG.universityName,
    materialsCount: serverMaterials.length,
    notesCount: notes.length,
    pyqsCount: pyqs.length,
    questionsCount: questions.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SubjectClientComponent params={params} serverOverview={serverOverview} initialMaterials={serverMaterials} />
    </>
  );
}
