import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllUnifiedData } from "@/lib/unifiedSubjectData";
import { getSubjectSlug, matchSubjectBySlug, getSubjectCanonicalUrl, generateSubjectJsonLd } from "@/lib/seoUtils";
import { SITE_CONFIG } from "@/lib/siteConfig";
import SubjectClientComponent from "@/components/SubjectClientComponent";
import { adminDb } from "@/lib/firebase-admin";

export const dynamicParams = true;

/**
 * Generate static params for all subjects during SSG build
 */
export async function generateStaticParams() {
  const { subjects } = await getAllUnifiedData();
  return subjects.map((s) => ({
    courseSlug: s.departmentId.toLowerCase(),
    semesterSlug: `semester-${s.semesterId}`,
    subjectSlug: getSubjectSlug(s),
  }));
}

/**
 * Generate unique, dynamic metadata for each subject page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string; semesterSlug: string; subjectSlug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { courseSlug, semesterSlug, subjectSlug } = resolvedParams;
  const rawSemId = semesterSlug || "";
  const semId = rawSemId.replace(/^semester-/, "");
  const { subjects, departments } = await getAllUnifiedData();
  const subject = matchSubjectBySlug(courseSlug, semId, subjectSlug, subjects);

  let validSubject = subject;
  if (!validSubject) {
    const titleCaseName = subjectSlug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    validSubject = {
      id: subjectSlug,
      name: titleCaseName,
      code: "",
      departmentId: courseSlug,
      semesterId: semId,
    } as any;
  }
  
  const finalSubject = validSubject!;

  const deptObj = departments.find(d => d.id === finalSubject.departmentId);
  const deptName = deptObj ? deptObj.name : finalSubject.departmentId.toUpperCase();
  const deptCode = deptObj ? deptObj.code : (finalSubject.departmentId === "btech" ? "B.Tech" : finalSubject.departmentId.toUpperCase());
  const codeDisplay = finalSubject.code ? ` (${finalSubject.code})` : "";

  const title = `${finalSubject.name}${codeDisplay} Notes, PYQs & Study Materials | ${deptCode} Sem ${semId} | ${SITE_CONFIG.siteName}`;
  const description = `Access ${finalSubject.name}${codeDisplay} study materials, notes, previous year question papers (PYQs), important questions, and academic resources for ${SITE_CONFIG.universityShortName} ${deptCode} Semester ${semId} students on ${SITE_CONFIG.siteName}.`;
  const canonicalUrl = getSubjectCanonicalUrl(finalSubject);

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
      images: [
        {
          url: SITE_CONFIG.defaultOgImage,
          width: 1200,
          height: 630,
          alt: `${finalSubject.name}${codeDisplay} Study Materials – ${SITE_CONFIG.siteName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_CONFIG.defaultOgImage],
    },
  };
}

/**
 * Fetch materials for server-side HTML rendering so search engine crawlers (Googlebot)
 * see real crawlable text without needing JavaScript interaction.
 */
async function fetchServerMaterials(deptId: string, semId: string, subjectId: string) {
  if (!adminDb) return [];
  try {
    const fetchPromise = adminDb
      .collection("materials")
      .where("semesterId", "==", semId)
      .where("subjectId", "==", subjectId)
      .get();

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
    const snap: any = await Promise.race([fetchPromise, timeoutPromise]);

    if (!snap || !snap.docs) return [];

    return snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((m: any) => (m.status === "approved" || !m.status) && (m.departmentId || "btech").toLowerCase() === deptId.toLowerCase());
  } catch (e) {
    return [];
  }
}

export default async function SubjectSeoPage({
  params,
}: {
  params: Promise<{ courseSlug: string; semesterSlug: string; subjectSlug: string }>;
}) {
  const resolvedParams = await params;
  const { courseSlug, semesterSlug, subjectSlug } = resolvedParams;
  const rawSemId = semesterSlug || "";
  const semId = rawSemId.replace(/^semester-/, "");
  const { subjects, departments } = await getAllUnifiedData();
  let subject = matchSubjectBySlug(courseSlug, semId, subjectSlug, subjects);

  // Fallback: If the subject isn't in the 5-minute server cache, we do NOT throw 404 immediately.
  // Instead, we construct a "shell" subject from the URL parameters. 
  // The client-side SubjectClientComponent will hydrate the real data from its own Context.
  let validSubject = subject;
  if (!validSubject) {
    const titleCaseName = subjectSlug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    validSubject = {
      id: subjectSlug,
      name: titleCaseName,
      code: "",
      departmentId: courseSlug,
      semesterId: semId,
    } as any;
  }
  
  // Safe cast since we guaranteed it exists
  const finalSubject = validSubject!;

  const deptObj = departments.find(d => d.id === finalSubject.departmentId);
  const deptName = deptObj ? deptObj.name : finalSubject.departmentId.toUpperCase();
  const deptCode = deptObj ? deptObj.code : (finalSubject.departmentId === "btech" ? "B.Tech" : finalSubject.departmentId.toUpperCase());
  const canonicalUrl = getSubjectCanonicalUrl(finalSubject);

  // Fetch materials server-side for initial HTML indexing
  const serverMaterials = await fetchServerMaterials(finalSubject.departmentId, finalSubject.semesterId, finalSubject.id);
  const pyqs = serverMaterials.filter((m: any) => m.category === "pyq");
  const notes = serverMaterials.filter((m: any) => m.category === "notes");
  const questions = serverMaterials.filter((m: any) => m.category === "questions");

  const jsonLd = generateSubjectJsonLd({
    subjectName: finalSubject.name,
    subjectCode: finalSubject.code || "",
    deptName,
    semId: String(finalSubject.semesterId),
    canonicalUrl,
    materialsCount: serverMaterials.length,
  });

  // Client Component expects deptId, semId, subjectId params
  const clientParams = Promise.resolve({
    deptId: finalSubject.departmentId,
    semId: String(finalSubject.semesterId),
    subjectId: finalSubject.id,
  });

  // Build a plain-object overview for the client component to render visibly
  const serverOverview = {
    subjectName: finalSubject.name,
    subjectCode: finalSubject.code || "",
    deptName,
    deptCode,
    semId: String(finalSubject.semesterId),
    universityName: SITE_CONFIG.universityName,
    materialsCount: serverMaterials.length,
    notesCount: notes.length,
    pyqsCount: pyqs.length,
    questionsCount: questions.length,
  };

  return (
    <>
      {/* JSON-LD Structured Data for Googlebot */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Interactive Paperino Interface — all content rendered visibly */}
      <SubjectClientComponent params={clientParams} serverOverview={serverOverview} />
    </>
  );
}
