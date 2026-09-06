"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, Trash2, Calendar, User, BookOpen, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { useBadges } from "@/context/BadgeContext";

interface SubjectRequest {
  id: string;
  departmentId: string;
  departmentName: string;
  courseName: string;
  semesterId: string;
  semesterName: string;
  subjectName: string;
  subjectCode?: string;
  notes?: string;
  requestedBy: string;
  userEmail: string;
  createdAt: any;
  status: "pending" | "completed";
}

export default function SubjectRequestsAdminPage() {
  const [requests, setRequests] = useState<SubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { markAdminSectionSeen } = useBadges();

  useEffect(() => {
    markAdminSectionSeen("subject_requests");
  }, [markAdminSectionSeen]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/data?collection=subject_requests", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const list = await res.json();
        setRequests(list);
        setLoading(false);
        return;
      }
    } catch (apiErr) {
      console.warn("Admin API fetch failed, attempting client Firestore fallback...", apiErr);
    }

    // Client-side Firestore fallback
    try {
      const q = query(collection(db, "subject_requests"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
        } as SubjectRequest;
      });
      setRequests(list);
    } catch (fallbackErr) {
      console.error("Failed to fetch subject requests from fallback:", fallbackErr);
      showToast("Error loading subject requests.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const handleMarkCompleted = async (id: string) => {
    if (!user) return;
    const reqToAccept = requests.find(r => r.id === id);
    if (!reqToAccept) return;
    
    setActioningId(id);
    try {
      // 1. Insert into dynamic_subjects (so it appears on the course page)
      const name = reqToAccept.subjectName;
      const code = reqToAccept.subjectCode;
      const deptId = reqToAccept.departmentId;
      const semId = reqToAccept.semesterId;
      
      const generatedId = code 
        ? code.toLowerCase().trim().replace(/[^a-z0-9]/g, "") 
        : name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
        
      const docId = `${deptId}_sem${semId}_${generatedId}`;

      await setDoc(doc(db, "dynamic_subjects", docId), {
        subjectId: generatedId,
        name: name.trim(),
        code: code ? code.trim() : "",
        departmentId: deptId,
        semesterId: semId,
        createdBy: "system_admin_accept",
        contributorId: reqToAccept.requestedBy || null,
        contributorName: reqToAccept.userEmail ? reqToAccept.userEmail.split('@')[0] : "Contributor",
        status: "approved",
        createdAt: serverTimestamp()
      }, { merge: true });

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/data", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "update",
            collection: "subject_requests",
            id,
            updateData: { status: "completed" }
          })
        });
        if (!res.ok) throw new Error("API update failed");
      } catch (apiErr) {
        console.warn("Admin API update failed, falling back to direct Firestore...", apiErr);
        await updateDoc(doc(db, "subject_requests", id), { status: "completed" });
      }

      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: "completed" } : req));
      showToast("Request accepted and subject published.", "success");
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast("Failed to update request status.", "error");
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this subject request?")) return;
    setActioningId(id);
    try {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/data", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "delete",
            collection: "subject_requests",
            id
          })
        });
        if (!res.ok) throw new Error("API delete failed");
      } catch (apiErr) {
        console.warn("Admin API delete failed, falling back to direct Firestore...", apiErr);
        await deleteDoc(doc(db, "subject_requests", id));
      }

      setRequests(prev => prev.filter(req => req.id !== id));
      showToast("Request deleted successfully.", "success");
    } catch (err) {
      console.error("Failed to delete request:", err);
      showToast("Failed to delete request.", "error");
    } finally {
      setActioningId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
        <p className="text-gray-400 animate-pulse">Loading subject requests...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Header Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <BookOpen className="text-purple-400" /> Subject Recommendations
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Review subject suggestions submitted by students. Approve and configuration-link them in the course list.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 flex flex-col items-center">
          <AlertCircle className="text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-white">No Requests Found</h3>
          <p className="text-gray-400 text-sm mt-1">Students haven't suggested any subjects yet.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-4 w-[25%]">Subject</th>
                  <th className="py-4 px-4 w-[25%]">Department / Course</th>
                  <th className="py-4 px-4 whitespace-nowrap">Semester</th>
                  <th className="py-4 px-4 w-[20%]">Requested By</th>
                  <th className="py-4 px-4 whitespace-nowrap">Status</th>
                  <th className="py-4 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-300 text-sm font-medium">
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <p className="text-white font-bold">{req.subjectName}</p>
                      {req.subjectCode && <p className="text-xs text-purple-400 font-bold tracking-widest mt-0.5">{req.subjectCode}</p>}
                      {req.notes && <p className="text-xs text-gray-500 italic font-light mt-1.5 max-w-[200px] md:max-w-xs">{req.notes}</p>}
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white">{req.departmentName}</p>
                      <p className="text-xs text-gray-500">{req.courseName}</p>
                    </td>
                    <td className="py-4 px-4 text-purple-400 font-bold whitespace-nowrap">{req.semesterName}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-white truncate">
                        <User size={13} className="flex-shrink-0" /> <span className="truncate">{req.requestedBy}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate w-full">{req.userEmail}</p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        req.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                      {req.status === "pending" && (
                        <button
                          onClick={() => handleMarkCompleted(req.id)}
                          disabled={actioningId === req.id}
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                          title="Mark as Completed"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        disabled={actioningId === req.id}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete Request"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="block lg:hidden divide-y divide-white/5">
            {requests.map((req) => (
              <div key={req.id} className="p-6 space-y-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{req.subjectName}</h3>
                    {req.subjectCode && <p className="text-xs text-purple-400 font-bold tracking-widest mt-1">{req.subjectCode}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    req.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {req.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-400">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Department</span>
                    <span className="text-white mt-0.5 block">{req.departmentName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Semester</span>
                    <span className="text-purple-400 font-bold mt-0.5 block">{req.semesterName}</span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Requested By</span>
                    <span className="text-white mt-0.5 block">{req.requestedBy} ({req.userEmail})</span>
                  </div>
                  {req.notes && (
                    <div className="col-span-2 bg-white/[0.02] border border-white/5 p-3 rounded-xl mt-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-1">Notes</span>
                      <p className="text-xs text-gray-300 italic leading-relaxed font-light">{req.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-white/5">
                  <div className="flex gap-2">
                    {req.status === "pending" && (
                      <button
                        onClick={() => handleMarkCompleted(req.id)}
                        disabled={actioningId === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={13} /> Complete
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRequest(req.id)}
                      disabled={actioningId === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
