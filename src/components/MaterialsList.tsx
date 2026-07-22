"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Download, FileText, Loader2 } from "lucide-react";

import { triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";

interface Material {
  id: string;
  title: string;
  category: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
}

export default function MaterialsList({ departmentId, semesterId, subjectId }: { departmentId: string, semesterId: string, subjectId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { showToast, dismissToast } = useToast();

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
        <button
          key={mat.id}
          disabled={downloadingId === mat.id}
          onClick={() => {
            setDownloadingId(mat.id);
            triggerSecureDownload(mat, showToast, dismissToast, (loading) => {
              if (!loading) setDownloadingId(null);
            });
          }}
          className="w-full flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10 group text-left disabled:opacity-75 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <FileText className={getIconColor(mat.category)} size={18} />
            <span className="text-sm text-gray-200">{mat.title}</span>
          </div>
          {downloadingId === mat.id ? (
            <Loader2 size={16} className="text-purple-400 animate-spin" />
          ) : (
            <Download size={16} className="text-gray-500 group-hover:text-white" />
          )}
        </button>
      ))}
    </div>
  );
}
