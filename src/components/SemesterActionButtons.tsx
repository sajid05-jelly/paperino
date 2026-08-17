"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import CreateCourseModal from "@/components/CreateCourseModal";
import SuggestSubjectModal from "@/components/SuggestSubjectModal";

interface SemesterActionButtonsProps {
  deptId: string;
  deptName: string;
  semId: string;
}

export default function SemesterActionButtons({
  deptId,
  deptName,
  semId,
}: SemesterActionButtonsProps) {
  const { isAdmin } = useAuth();
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  return (
    <>
      <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
        {isAdmin ? (
          <button
            onClick={() => setIsSuggestModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] cursor-pointer select-none"
          >
            <Plus size={16} /> Add Subject
          </button>
        ) : (
          <button
            onClick={() => setIsSubjectModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 text-white font-bold transition-all cursor-pointer select-none"
          >
            <Plus size={16} /> Suggest Subject
          </button>
        )}
      </div>

      <CreateCourseModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        initialDeptId={deptId}
        initialSemester={semId}
        lockDepartment={true}
        lockSemester={true}
      />

      <SuggestSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        departmentId={deptId}
        departmentName={deptName}
        semesterId={semId}
      />
    </>
  );
}
