"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookOpen, CheckCircle2, XCircle, Loader2, Calendar, ExternalLink } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { useSubjects } from "@/context/SubjectsContext";
import Link from "next/link";


interface CourseRequest {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  semesterId: string;
  status: string;
  contributorId: string;
  contributorName: string;
  createdAt: any;
}

export default function AdminCoursesPage() {
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [approvedCourses, setApprovedCourses] = useState<CourseRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { playSuccess } = useSound();
  const { refreshSubjects } = useSubjects();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, "dynamic_subjects"));
      const snapshot = await getDocs(q);
      const allList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CourseRequest));
      
      const pendingList = allList.filter(c => c.status === "pending").sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      const appList = allList.filter(c => c.status === "approved" || !c.status).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      
      setRequests(pendingList);
      setApprovedCourses(appList);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this course and make it public?")) return;
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "dynamic_subjects", id), { status: "approved" });
      const approvedCourse = requests.find(r => r.id === id);
      setRequests(prev => prev.filter(r => r.id !== id));
      if (approvedCourse) {
        setApprovedCourses(prev => [{...approvedCourse, status: "approved"}, ...prev]);
      }
      playSuccess();
      await refreshSubjects();
    } catch (error) {
      console.error("Error approving course:", error);
      alert("Failed to approve course.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject and delete this course request?")) return;
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, "dynamic_subjects", id));
      setRequests(prev => prev.filter(r => r.id !== id));
      await refreshSubjects();
    } catch (error) {
      console.error("Error rejecting course:", error);
      alert("Failed to reject course.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteApproved = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this course? All associated materials might become orphaned.")) return;
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, "dynamic_subjects", id));
      setApprovedCourses(prev => prev.filter(r => r.id !== id));
      await refreshSubjects();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course.");
    } finally {
      setActionLoading(null);
    }
  };

  const activeData = activeTab === "pending" ? requests : approvedCourses;

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BookOpen className="text-blue-400" /> Manage Dynamic Courses
          </h1>
          <p className="text-gray-400">Review new suggestions and manage active dynamic courses.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-white/10">
        <button 
          onClick={() => setActiveTab("pending")} 
          className={`pb-3 px-2 font-medium text-sm transition-colors relative ${activeTab === "pending" ? "text-blue-400" : "text-gray-400 hover:text-white"}`}
        >
          Pending Requests ({requests.length})
          {activeTab === "pending" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab("approved")} 
          className={`pb-3 px-2 font-medium text-sm transition-colors relative ${activeTab === "approved" ? "text-emerald-400" : "text-gray-400 hover:text-white"}`}
        >
          Approved Courses ({approvedCourses.length})
          {activeTab === "approved" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></div>}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : activeData.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)] flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
            <CheckCircle2 size={32} className="text-blue-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No {activeTab === "pending" ? "Pending Requests" : "Approved Courses"}</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {activeTab === "pending" 
              ? "There are no pending course requests from contributors at this time."
              : "No dynamic courses have been approved yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activeData.map(req => (
            <div key={req.id} className="glass-card p-5 rounded-xl border border-blue-500/20 hover:border-blue-500/50 transition-all flex flex-col md:flex-row justify-between gap-4 group">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{req.name}</h3>
                  {req.code && (
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-white/10 text-gray-300">
                      {req.code}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-400" />
                    Semester {req.semesterId}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
                    Suggested by: <span className="text-gray-300 font-medium">{req.contributorName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-center">
                {actionLoading === req.id ? (
                  <div className="w-full h-10 px-6 rounded-xl bg-white/5 flex items-center justify-center">
                    <Loader2 size={20} className="text-blue-400 animate-spin" />
                  </div>
                ) : activeTab === "pending" ? (
                  <>
                    <Link 
                      href={`/btech/semesters/${req.semesterId}/subjects/${req.subjectId || req.id}`}
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20 transition-colors font-medium mr-2"
                    >
                      <ExternalLink size={18} /> Preview
                    </Link>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-colors font-medium"
                    >
                      <XCircle size={18} /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-colors font-medium"
                    >
                      <CheckCircle2 size={18} /> Approve
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDeleteApproved(req.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-colors font-medium"
                  >
                    <XCircle size={18} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
