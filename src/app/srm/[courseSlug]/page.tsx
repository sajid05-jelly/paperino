import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllUnifiedData } from "@/lib/unifiedSubjectData";
import { SITE_CONFIG, getAbsoluteUrl } from "@/lib/siteConfig";
import { BookOpen, ChevronRight, Layers } from "lucide-react";
import SafeBackButton from "@/components/SafeBackButton";

export async function generateStaticParams() {
  const { departments } = await getAllUnifiedData();
  return departments.map((d) => ({
    courseSlug: d.id.toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}): Promise<Metadata> {
  const { courseSlug } = await params;
  const { departments } = await getAllUnifiedData();
  const dept = departments.find(d => d.id.toLowerCase() === courseSlug.toLowerCase());

  if (!dept) {
    return { title: `Course Not Found | ${SITE_CONFIG.siteName}` };
  }

  const title = `${dept.name} (${dept.code}) Study Materials & Notes | ${SITE_CONFIG.universityShortName} | ${SITE_CONFIG.siteName}`;
  const description = `Find all semester study materials, previous year question papers (PYQs), and lecture notes for ${dept.name} (${dept.code}) students at ${SITE_CONFIG.universityName}.`;

  return {
    title,
    description,
    alternates: { canonical: getAbsoluteUrl(`/srm/${courseSlug}`) },
  };
}

export default async function SrmCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const { departments } = await getAllUnifiedData();
  const dept = departments.find(d => d.id.toLowerCase() === courseSlug.toLowerCase());

  if (!dept) notFound();

  const semesters = Array.from({ length: dept.totalSemesters || 8 }, (_, i) => String(i + 1));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <SafeBackButton fallbackUrl="/srm" label="Back to SRM Courses" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors gap-2" size={16} />

      <div className="space-y-3 mb-12">
        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{SITE_CONFIG.universityShortName} · {dept.code}</span>
        <h1 className="text-4xl font-extrabold text-white">{dept.name}</h1>
        <p className="text-gray-400 text-lg">Select a semester to access subjects, PYQs, and verified notes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {semesters.map((sem) => (
          <Link key={sem} href={`/srm/${courseSlug}/semester-${sem}`}>
            <div className="vision-glass p-6 h-full group cursor-pointer relative overflow-hidden vision-hover border border-white/5 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <Layers size={22} />
                </div>
                <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Semester {sem}</h2>
              <p className="text-xs text-gray-400">View all Semester {sem} subjects and materials.</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
