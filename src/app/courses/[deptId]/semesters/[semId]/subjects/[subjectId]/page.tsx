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
    const snap = await adminDb
      .collection("materials")
      .where("semesterId", "==", semId)
      .where("subjectId", "==", subjectId)
      .get();

    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((m: any) => (m.status === "approved" || !m.status) && (m.departmentId || "btech") === deptId);
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="sr-only opacity-0 h-0 overflow-hidden" aria-hidden="true">
        <h1>{subjectName} {subjectCode ? `– ${subjectCode}` : ""}</h1>
        <p>
          Official study materials, notes, previous year question papers (PYQs), and question banks for {subjectName} {subjectCode ? `(${subjectCode})` : ""}, offered under {deptName} ({deptCode}) Semester {semId} at {SITE_CONFIG.universityName}.
        </p>

        <section>
          <h2>Subject Overview</h2>
          <ul>
            <li><strong>Subject Name:</strong> {subjectName}</li>
            {subjectCode && <li><strong>Subject Code:</strong> {subjectCode}</li>}
            <li><strong>University:</strong> {SITE_CONFIG.universityName}</li>
            <li><strong>Course / Department:</strong> {deptName} ({deptCode})</li>
            <li><strong>Semester:</strong> Semester {semId}</li>
            <li><strong>Available Resources:</strong> {serverMaterials.length} Verified Documents</li>
          </ul>
        </section>

        <section>
          <h2>Study Materials</h2>
          {notes.length > 0 ? (
            <ul>
              {notes.map((m: any) => (
                <li key={m.id}>
                  <h3>{m.title || m.name || `${subjectName} Notes`}</h3>
                  <p>{m.description || `Lecture notes and study resources for ${subjectName}.`}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Verified study notes and lecture materials for {subjectName} ({subjectCode || subjectId}) are curated and updated regularly on Paperino.</p>
          )}
        </section>

        <section>
          <h2>Previous Year Question Papers (PYQs)</h2>
          {pyqs.length > 0 ? (
            <ul>
              {pyqs.map((m: any) => (
                <li key={m.id}>
                  <h3>{m.title || m.name || `${subjectName} PYQ Paper`}</h3>
                  <p>{m.description || `Previous year examination paper for ${subjectName} at SRM University.`}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Access previous year semester question papers and test series for {subjectName} {subjectCode ? `(${subjectCode})` : ""}.</p>
          )}
        </section>

        <section>
          <h2>Important Questions & Question Banks</h2>
          {questions.length > 0 ? (
            <ul>
              {questions.map((m: any) => (
                <li key={m.id}>
                  <h3>{m.title || m.name || `${subjectName} Question Bank`}</h3>
                  <p>{m.description || `Important 2-mark and 16-mark semester exam questions for ${subjectName}.`}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Practice most expected semester exam questions, 2-mark answers, and 16-mark question banks for {subjectName}.</p>
          )}
        </section>
      </article>

      <SubjectClientComponent params={params} />
    </>
  );
}
