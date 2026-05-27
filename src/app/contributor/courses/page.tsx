"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, CheckCircle2, Clock, Loader2, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

interface CourseRequest {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  semesterId: string;
  status: string;
  createdAt: any;
}

export default function ContributorCoursesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyRequests();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      const q = query(
        collection(db, "dynamic_subjects"), 
        where("contributorId", "==", user?.uid)
      );
      const snapshot = await getDocs(q);
      const reqList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CourseRequest));
      reqList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRequests(reqList);
    } catch (error) {
      console.error("Error fetching my course requests:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BookOpen className="text-blue-400" /> My Requested Courses
          </h1>
          <p className="text-gray-400">Track the approval status of new subjects you have suggested.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)] flex flex-col items-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
            <BookOpen size={32} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Requests Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">You haven't suggested any new courses. Use the "Create New Course" button in the sidebar to add a missing subject.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <Link key={req.id} href={`/btech/semesters/${req.semesterId}/subjects/${req.subjectId || req.id}`}>
              <div className="glass-card p-5 rounded-xl border border-white/10 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all flex flex-col md:flex-row justify-between items-center gap-4 group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                
                <div className="flex flex-col w-full md:w-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                      {req.name}
                      <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
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
                </div>
              </div>

              <div className="flex items-center self-start md:self-center">
                {req.status === "approved" ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium text-sm">
                    <CheckCircle2 size={16} /> Approved
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium text-sm">
                    <Clock size={16} /> Pending Approval
                  </div>
                )}
              </div>
            </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
