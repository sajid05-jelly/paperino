import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllUnifiedData } from "@/lib/unifiedSubjectData";
import { getSubjectSlug, getSubjectSeoPath } from "@/lib/seoUtils";
import { SITE_CONFIG, getAbsoluteUrl } from "@/lib/siteConfig";
import { Book, ChevronRight } from "lucide-react";
import SafeBackButton from "@/components/SafeBackButton";

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
  params: Promise<{ courseSlug: string; semId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { courseSlug } = resolvedParams;
  const rawSemId = resolvedParams.semId || "";
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
  params: Promise<{ courseSlug: string; semId: string }>;
}) {
  const resolvedParams = await params;
  const { courseSlug } = resolvedParams;
  const rawSemId = resolvedParams.semId || "";
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

      <div className="space-y-3 mb-12">
        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{SITE_CONFIG.universityShortName} · {dept.code}</span>
        <h1 className="text-4xl font-extrabold text-white">{dept.name} – Semester {semId}</h1>
        <p className="text-gray-400 text-lg">Select a subject to view lecture notes, question papers, and study resources.</p>
      </div>

      {semesterSubjects.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 flex flex-col items-center">
          <Book className="text-gray-600 mb-4" size={48} />
          <h2 className="text-xl font-medium text-white mb-2">No Subjects Listed</h2>
          <p className="text-gray-400">Subjects for Semester {semId} will appear here as they are added.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {semesterSubjects.map((sub) => {
            const seoPath = getSubjectSeoPath(sub);
            return (
              <Link 
                key={sub.id} 
                href={seoPath}
                className="vision-glass p-6 h-full block group cursor-pointer relative overflow-hidden vision-hover border border-white/5 hover:border-purple-500/30 transition-all text-left no-underline"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                    <Book size={24} />
                  </div>
                  <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">{sub.name}</h2>
                {sub.code && (
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">{sub.code}</p>
                )}
                <p className="text-sm text-gray-400">View PYQs, Notes, and Important Questions.</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
