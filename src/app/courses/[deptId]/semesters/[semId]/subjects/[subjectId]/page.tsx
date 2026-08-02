import { Metadata } from "next";
import { getAllUnifiedData, getSubjectDetails } from "@/lib/unifiedSubjectData";
import SubjectClientComponent from "@/components/SubjectClientComponent";

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
  
  const { subjectName, deptName, deptCode } = await getSubjectDetails(deptId, semId, subjectId);

  const title = `${subjectName} Notes, PYQs & Study Materials | SRM | Paperino`;
  const description = `Access ${subjectName} notes, syllabus, previous year question papers (PYQs), important questions and study materials for ${deptCode} (${deptName}) Semester ${semId} SRM Institute of Science and Technology students on Paperino.`;
  const pageUrl = `https://paperino-eta.vercel.app/courses/${deptId}/semesters/${semId}/subjects/${subjectId}`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      siteName: "Paperino",
      images: [{ url: "/og-image.png?v=2", width: 1200, height: 630, alt: `${subjectName} Study Materials - Paperino` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function SubjectPage({ params }: { params: Promise<{ deptId: string, semId: string, subjectId: string }> }) {
  return <SubjectClientComponent params={params} />;
}

