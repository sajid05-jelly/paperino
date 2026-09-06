import { Metadata } from "next";
import Link from "next/link";
import { getAllUnifiedData } from "@/lib/unifiedSubjectData";
import { SITE_CONFIG, getAbsoluteUrl } from "@/lib/siteConfig";
import { Book, GraduationCap, ChevronRight } from "lucide-react";
import SuggestCourseButton from "@/components/SuggestCourseButton";
import GlobalSubjectSearch from "@/components/GlobalSubjectSearch";

export const metadata: Metadata = {
  title: `SRM University Study Hub - B.Tech, MCA, MBA Notes & PYQs | ${SITE_CONFIG.siteName}`,
  description: `Access semester-wise study materials, previous year question papers (PYQs), notes, and academic tools for SRM Institute of Science and Technology students on ${SITE_CONFIG.siteName}.`,
  alternates: {
    canonical: getAbsoluteUrl('/srm'),
  },
  openGraph: {
    title: `SRM University Study Hub - Notes & PYQs | ${SITE_CONFIG.siteName}`,
    description: `Semester-wise study resources for SRM Institute of Science and Technology students.`,
    url: getAbsoluteUrl('/srm'),
  },
};

export default async function SrmLandingPage() {
  const { departments, subjects } = await getAllUnifiedData();
  
  const plainDepartments = departments.map(d => ({
    id: d.id,
    name: d.name,
    code: d.code,
    totalSemesters: d.totalSemesters,
  }));
  
  const plainSubjects = subjects.map(s => ({
    id: s.id,
    name: s.name,
    code: s.code || "",
    departmentId: s.departmentId,
    semesterId: s.semesterId,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <span className="px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold text-xs uppercase tracking-widest inline-block">
          Official Academic Index
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight uppercase">
          SRM INSTITUTE OF SCIENCE AND TECHNOLOGY
        </h1>
        <p className="text-lg text-gray-400">
          Browse verified study materials, question papers, and notes organized by degree program and semester.
        </p>
        <div className="pt-2 flex justify-center mb-10">
          <SuggestCourseButton />
        </div>
        <div className="text-left w-full mt-10">
          <GlobalSubjectSearch subjects={plainSubjects} departments={plainDepartments} baseRoute="/srm" />
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Link key={dept.id} href={`/srm/${dept.id.toLowerCase()}`}>
            <div className="vision-glass p-8 h-full group cursor-pointer relative overflow-hidden vision-hover border border-white/5 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <GraduationCap size={28} />
                </div>
                <ChevronRight size={22} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{dept.name}</h2>
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4">{dept.code} · {dept.totalSemesters} Semesters</p>
              <p className="text-sm text-gray-400">View semester-wise subjects, lecture notes, and previous year question papers.</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
