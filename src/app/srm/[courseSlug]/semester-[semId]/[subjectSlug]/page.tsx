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
    semId: String(s.semesterId),
    subjectSlug: getSubjectSlug(s),
  }));
}

/**
 * Generate unique, dynamic metadata for each subject page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string; semId: string; subjectSlug: string }>;
}): Promise<Metadata> {
  const { courseSlug, semId, subjectSlug } = await params;
  const { subjects, departments } = await getAllUnifiedData();
  const subject = matchSubjectBySlug(courseSlug, semId, subjectSlug, subjects);

  if (!subject) {
    return {
      title: `Subject Not Found | ${SITE_CONFIG.siteName}`,
    };
  }

  const deptObj = departments.find(d => d.id === subject.departmentId);
  const deptName = deptObj ? deptObj.name : subject.departmentId.toUpperCase();
  const deptCode = deptObj ? deptObj.code : (subject.departmentId === "btech" ? "B.Tech" : subject.departmentId.toUpperCase());
  const codeDisplay = subject.code ? ` (${subject.code})` : "";

  const title = `${subject.name}${codeDisplay} Notes, PYQs & Study Materials | ${deptCode} Sem ${semId} | ${SITE_CONFIG.siteName}`;
  const description = `Access ${subject.name}${codeDisplay} study materials, notes, previous year question papers (PYQs), important questions, and academic resources for ${SITE_CONFIG.universityShortName} ${deptCode} Semester ${semId} students on ${SITE_CONFIG.siteName}.`;
  const canonicalUrl = getSubjectCanonicalUrl(subject);

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
          alt: `${subject.name}${codeDisplay} Study Materials – ${SITE_CONFIG.siteName}`,
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
  params: Promise<{ courseSlug: string; semId: string; subjectSlug: string }>;
}) {
  const resolvedParams = await params;
  const { courseSlug, semId, subjectSlug } = resolvedParams;
  const { subjects, departments } = await getAllUnifiedData();
  const subject = matchSubjectBySlug(courseSlug, semId, subjectSlug, subjects);

  if (!subject) {
    notFound();
  }

  const deptObj = departments.find(d => d.id === subject.departmentId);
  const deptName = deptObj ? deptObj.name : subject.departmentId.toUpperCase();
  const deptCode = deptObj ? deptObj.code : (subject.departmentId === "btech" ? "B.Tech" : subject.departmentId.toUpperCase());
  const canonicalUrl = getSubjectCanonicalUrl(subject);

  // Fetch materials server-side for initial HTML indexing
  const serverMaterials = await fetchServerMaterials(subject.departmentId, subject.semesterId, subject.id);
  const pyqs = serverMaterials.filter((m: any) => m.category === "pyq");
  const notes = serverMaterials.filter((m: any) => m.category === "notes");
  const questions = serverMaterials.filter((m: any) => m.category === "questions");

  const jsonLd = generateSubjectJsonLd({
    subjectName: subject.name,
    subjectCode: subject.code || "",
    deptName,
    semId: String(subject.semesterId),
    canonicalUrl,
    materialsCount: serverMaterials.length,
  });

  // Client Component expects deptId, semId, subjectId params
  const clientParams = Promise.resolve({
    deptId: subject.departmentId,
    semId: String(subject.semesterId),
    subjectId: subject.id,
  });

  return (
    <>
      {/* JSON-LD Structured Data for Googlebot */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Crawlable HTML Content for Search Engine Crawlers (Googlebot) */}
      <article className="sr-only opacity-0 h-0 overflow-hidden" aria-hidden="true">
        <h1>{subject.name} {subject.code ? `– ${subject.code}` : ""}</h1>
        <p>
          Official study materials, notes, previous year question papers (PYQs), and question banks for {subject.name} {subject.code ? `(${subject.code})` : ""}, offered under {deptName} ({deptCode}) Semester {subject.semesterId} at {SITE_CONFIG.universityName}.
        </p>

        <section>
          <h2>Subject Overview</h2>
          <ul>
            <li><strong>Subject Name:</strong> {subject.name}</li>
            {subject.code && <li><strong>Subject Code:</strong> {subject.code}</li>}
            <li><strong>University:</strong> {SITE_CONFIG.universityName}</li>
            <li><strong>Course / Department:</strong> {deptName} ({deptCode})</li>
            <li><strong>Semester:</strong> Semester {subject.semesterId}</li>
            <li><strong>Available Resources:</strong> {serverMaterials.length} Verified Documents</li>
          </ul>
        </section>

        <section>
          <h2>Study Materials</h2>
          {notes.length > 0 ? (
            <ul>
              {notes.map((m: any) => (
                <li key={m.id}>
                  <h3>{m.title || m.name || `${subject.name} Notes`}</h3>
                  <p>{m.description || `Lecture notes and study resources for ${subject.name}.`}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Verified study notes and lecture materials for {subject.name} ({subject.code || subject.id}) are curated and updated regularly on Paperino.</p>
          )}
        </section>

        <section>
          <h2>Previous Year Question Papers (PYQs)</h2>
          {pyqs.length > 0 ? (
            <ul>
              {pyqs.map((m: any) => (
                <li key={m.id}>
                  <h3>{m.title || m.name || `${subject.name} PYQ Paper`}</h3>
                  <p>{m.description || `Previous year examination paper for ${subject.name} at SRM University.`}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Access previous year semester question papers and test series for {subject.name} {subject.code ? `(${subject.code})` : ""}.</p>
          )}
        </section>

        <section>
          <h2>Important Questions & Question Banks</h2>
          {questions.length > 0 ? (
            <ul>
              {questions.map((m: any) => (
                <li key={m.id}>
                  <h3>{m.title || m.name || `${subject.name} Question Bank`}</h3>
                  <p>{m.description || `Important 2-mark and 16-mark semester exam questions for ${subject.name}.`}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Practice most expected semester exam questions, 2-mark answers, and 16-mark question banks for {subject.name}.</p>
          )}
        </section>

        <section>
          <h2>Lab Materials & Senior Insights</h2>
          <p>Lab manuals, practical code exercises, and senior advice for passing {subject.name} ({deptCode} Semester {subject.semesterId}).</p>
        </section>
      </article>

      {/* Main Interactive Paperino Interface */}
      <SubjectClientComponent params={clientParams} />
    </>
  );
}
