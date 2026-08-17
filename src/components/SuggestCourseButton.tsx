"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CreateCourseModal from "@/components/CreateCourseModal";

export default function SuggestCourseButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(232,121,249,0.35)] hover:shadow-[0_0_30px_rgba(232,121,249,0.55)] cursor-pointer text-sm select-none"
      >
        <Plus size={18} /> Suggest Course
      </button>

      <CreateCourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
