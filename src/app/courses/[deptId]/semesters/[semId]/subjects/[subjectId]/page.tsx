import { Metadata } from "next";
import { getAllUnifiedData, getSubjectDetails } from "@/lib/unifiedSubjectData";
import { getSubjectCanonicalUrl, generateSubjectJsonLd, getSubjectSeoPath } from "@/lib/seoUtils";
import { SITE_CONFIG } from "@/lib/siteConfig";
import SubjectClientComponent from "@/components/SubjectClientComponent";
import { adminDb } from "@/lib/firebase-admin";

export const dynamicParams = true;

export async function generateStaticParams() {
  const { subjects } = await getAllUnifiedData();
  return subjects.map((s) => ({
    deptId: s.departmentId,
    semId: s.semesterId,
    subjectId: s.id,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ deptId: string, semId: string, subjectId: string }> }): Promise<Metadata> {
  const { deptId, semId, subjectId } = await params;
  const { subjects, departments } = await getAllUnifiedData();
  
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

export default async function SubjectPage({ params }: { params: Promise<{ deptId: string, semId: string, subjectId: string }> }) {
  const { deptId, semId, subjectId } = await params;
  const { subjects, departments } = await getAllUnifiedData();
  
  const foundSubject = subjects.find(s => s.departmentId === deptId && String(s.semesterId) === String(semId) && s.id === subjectId);
  const { subjectName, subjectCode, deptName, deptCode } = await getSubjectDetails(deptId, semId, subjectId);

  const canonicalUrl = foundSubject ? getSubjectCanonicalUrl(foundSubject) : getSubjectCanonicalUrl({ id: subjectId, name: subjectName, code: subjectCode, departmentId: deptId, semesterId: semId });

  const serverMaterials = await fetchServerMaterials(deptId, semId, subjectId);
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

      <SubjectClientComponent params={params} serverOverview={serverOverview} />
    </>
  );
}
