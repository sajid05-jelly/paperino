"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useSubjects } from "@/context/SubjectsContext";
import { FileText, Loader2, Download, Trash2, Bookmark, Folder, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { getDownloadHref } from "@/lib/driveUtils";

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { subjects: dynamicSubjects } = useSubjects();

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const snapshot = await getDocs(collection(db, "users", user.uid, "bookmarks"));
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setBookmarks(list);
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookmarks();
  }, [user]);

  const removeBookmark = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bookmarks", id));
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error("Error removing bookmark:", error);
      alert("Failed to remove bookmark.");
    }
  };

  const getSubjectName = (semId: string, subjectId: string, departmentId?: string) => {
    const dept = departmentId || "btech";
    return dynamicSubjects[dept]?.[semId]?.find((s: any) => s.id === subjectId)?.name || subjectId;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "pyq": return "Previous Year Questions";
      case "notes": return "Study Notes";
      case "questions": return "Important Questions";
      default: return "Material";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center p-6 bg-white/5 rounded-full mb-6">
          <Bookmark size={48} className="text-gray-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Your Bookmarks</h1>
        <p className="text-gray-400 text-lg max-w-lg mx-auto mb-8">
          Please log in to view and manage your saved study materials.
        </p>
        <Link 
          href="/login" 
          className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors"
        >
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Bookmark size={32} className="text-white" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">My Bookmarks</h1>
          <p className="text-gray-400 text-lg">Quickly access all your saved materials.</p>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5">
          <Folder size={64} className="mx-auto text-gray-600 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">No bookmarks yet</h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto mb-8">
            You haven't saved any materials yet. Go browse subjects and click the bookmark icon to save items here!
          </p>
          <Link 
            href="/courses" 
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-full font-semibold transition-colors"
          >
            Explore Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((mat) => (
            <div key={mat.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between group hover:border-purple-500/30 transition-colors">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-purple-400 flex-shrink-0">
                    <FileText size={24} />
                  </div>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-gray-300 uppercase tracking-wider">
                    {getCategoryLabel(mat.category)}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2" title={mat.title || mat.fileName}>
                  {mat.title || mat.fileName || "Untitled Material"}
                </h3>
                
                <div className="space-y-1 mt-4">
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Semester {mat.semesterId}
                  </p>
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    {getSubjectName(mat.semesterId, mat.subjectId, mat.departmentId)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8 pt-4 border-t border-white/10">
                <a 
                  href={getDownloadHref(mat)} 
                  download
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  <Download size={18} />
                  Download PDF
                </a>
                <button
                  onClick={() => removeBookmark(mat.id)}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Remove Bookmark"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
