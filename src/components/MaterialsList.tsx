"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Download, FileText } from "lucide-react";
import { getDownloadHref } from "@/lib/driveUtils";

interface Material {
  id: string;
  title: string;
  category: string;
  fileId?: string;
  fileUrl?: string;
}

export default function MaterialsList({ departmentId, semesterId, subjectId }: { departmentId: string, semesterId: string, subjectId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const q = query(
          collection(db, "materials"),
          where("departmentId", "==", departmentId),
          where("semesterId", "==", semesterId),
          where("subjectId", "==", subjectId)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
        setMaterials(data);
      } catch (error) {
        console.error("Error fetching materials:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [departmentId, semesterId, subjectId]);

  if (loading) return <div className="text-gray-400 text-sm py-4">Loading materials...</div>;
  if (materials.length === 0) return <div className="text-gray-500 text-sm py-4">No materials uploaded yet.</div>;

  const getIconColor = (category: string) => {
    if (category === "notes") return "text-purple-400";
    if (category === "pyq") return "text-blue-400";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-3">
      {materials.map((mat) => (
        <a key={mat.id} href={getDownloadHref(mat)} download className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10 group">
          <div className="flex items-center gap-3">
            <FileText className={getIconColor(mat.category)} size={18} />
            <span className="text-sm text-gray-200">{mat.title}</span>
          </div>
          <Download size={16} className="text-gray-500 group-hover:text-white" />
        </a>
      ))}
    </div>
  );
}
