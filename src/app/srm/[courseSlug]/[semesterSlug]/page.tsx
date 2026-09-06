import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllUnifiedData } from "@/lib/unifiedSubjectData";
import { getSubjectSlug, getSubjectSeoPath } from "@/lib/seoUtils";
import { SITE_CONFIG, getAbsoluteUrl } from "@/lib/siteConfig";
import { Book, ChevronRight } from "lucide-react";
import SafeBackButton from "@/components/SafeBackButton";
import SemesterActionButtons from "@/components/SemesterActionButtons";
import SemesterSubjectGrid from "@/components/SemesterSubjectGrid";

export async function generateStaticParams() {
  const { departments } = await getAllUnifiedData();
  const params: { courseSlug: string; semId: string }[] = [];

  departments.forEach((d) => {
    for (let sem = 1; sem <= (d.totalSemesters || 8); sem++) {
      params.push({
        courseSlug: d.id.toLowerCase(),
        semId: String(sem),
      });
    }
  });

  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string; semesterSlug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { courseSlug, semesterSlug } = resolvedParams;
  const rawSemId = semesterSlug || "";
  const semId = rawSemId.replace(/^semester-/, "");

  const { departments } = await getAllUnifiedData();
  const dept = departments.find(d => d.id.toLowerCase() === courseSlug.toLowerCase());

  if (!dept) {
    return { title: `Semester Not Found | ${SITE_CONFIG.siteName}` };
  }

  const title = `${dept.name} Semester ${semId} Notes, PYQs & Subjects | ${SITE_CONFIG.universityShortName} | ${SITE_CONFIG.siteName}`;
  const description = `Access Semester ${semId} subjects, notes, study materials, and previous year question papers (PYQs) for ${dept.name} (${dept.code}) students at ${SITE_CONFIG.universityName}.`;

  return {
    title,
    description,
    alternates: { canonical: getAbsoluteUrl(`/srm/${courseSlug}/semester-${semId}`) },
  };
}

export default async function SrmSemesterPage({
  params,
}: {
  params: Promise<{ courseSlug: string; semesterSlug: string }>;
}) {
  const resolvedParams = await params;
  const { courseSlug, semesterSlug } = resolvedParams;
  const rawSemId = semesterSlug || "";
  const semId = rawSemId.replace(/^semester-/, "");

  const { departments, subjects } = await getAllUnifiedData();
  const dept = departments.find(d => d.id.toLowerCase() === courseSlug.toLowerCase());

  if (!dept) notFound();

  const semesterSubjects = subjects.filter(
    s => s.departmentId.toLowerCase() === courseSlug.toLowerCase() && String(s.semesterId) === String(semId)
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <SafeBackButton fallbackUrl={`/srm/${courseSlug}`} label={`Back to ${dept.code} Semesters`} className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors gap-2" size={16} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
        <div className="space-y-3">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{SITE_CONFIG.universityShortName} · {dept.code}</span>
          <h1 className="text-4xl font-extrabold text-white">{dept.name} – Semester {semId}</h1>
          <p className="text-gray-400 text-lg">Select a subject to view lecture notes, question papers, and study resources.</p>
        </div>
        
        <SemesterActionButtons deptId={dept.id} deptName={dept.name} semId={semId} />
      </div>

      <SemesterSubjectGrid initialData={semesterSubjects} deptId={dept.id} semId={semId} />
    </div>
  );
}
