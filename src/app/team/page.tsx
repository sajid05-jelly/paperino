"use client";

import { useState } from "react";
import { Users, ShieldCheck, Sparkles, UploadCloud, Rocket, ArrowRight, Loader2, CheckCircle2, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyAdmins } from "@/lib/notifications";

export default function TeamPage() {
  const { user, isContributor, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!user) {
      setError("Please login to apply for the Paperino Team.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if already applied
      const q = query(collection(db, "contributor_requests"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setApplied(true);
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "contributor_requests"), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "Unknown Student",
        photoURL: user.photoURL || null,
        status: "pending",
        timestamp: serverTimestamp()
      });

      // Notify all admins about the new application
      await notifyAdmins(
        db,
        "New Team Application",
        `New Paperino Team application submitted by ${user.displayName || user.email || "a student"}.`,
        "application_submitted"
      );

      setApplied(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#05030a] py-12 relative overflow-hidden selection:bg-violet-500/30">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.15)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.1)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-violet-500/10 border border-violet-500/20 rounded-full mb-6 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
            <Users size={32} className="text-violet-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Paperino Team</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Become a trusted student contributor. Help your peers by uploading essential study materials, notes, and PYQs to grow the SRM student community.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-violet-500/30 transition-all">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-500/10 blur-2xl rounded-full group-hover:bg-violet-500/20 transition-all"></div>
            <UploadCloud size={32} className="text-violet-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Upload Materials</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Upload notes, manuals, and previous year question papers directly to the platform for thousands of students to access.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-fuchsia-500/30 transition-all">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-fuchsia-500/10 blur-2xl rounded-full group-hover:bg-fuchsia-500/20 transition-all"></div>
            <ShieldCheck size={32} className="text-fuchsia-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Trusted Role</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Get an exclusive Contributor Dashboard. Manage your own uploads with full editing capabilities while keeping the platform safe.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/10 blur-2xl rounded-full group-hover:bg-cyan-500/20 transition-all"></div>
            <Rocket size={32} className="text-cyan-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Grow the Community</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your contributions will directly help juniors and peers ace their exams. Build a legacy of knowledge sharing at SRM.
            </p>
          </div>
        </div>

        {/* Application Section */}
        <div className="max-w-2xl mx-auto glass-panel p-10 rounded-[2.5rem] border border-violet-500/20 shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)] text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent"></div>
          
          <div className="relative z-10">
            <Sparkles size={40} className="text-violet-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Contribute?</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              We carefully review all applications to maintain the quality of materials on Paperino.
            </p>

            {isAdmin || isContributor ? (
              <div className="inline-flex items-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-bold">
                <CheckCircle2 size={24} />
                You are already a {isAdmin ? "Platform Admin" : "Contributor"}!
              </div>
            ) : applied ? (
              <div className="inline-flex items-center gap-3 px-6 py-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl text-violet-300 font-bold">
                <CheckCircle2 size={24} />
                Request sent to Admin
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={handleApply}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)] flex items-center justify-center gap-3 mx-auto"
                >
                  {loading ? (
                    <><Loader2 size={20} className="animate-spin"/> Submitting...</>
                  ) : (
                    <>Submit Application <ArrowRight size={20} /></>
                  )}
                </button>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                {!user && <p className="text-gray-500 text-sm mt-4">You must be logged in to apply.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Admin Promotion Info Card */}
        <div className="max-w-2xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="glass-panel p-6 md:p-8 rounded-[2rem] border border-amber-500/20 relative overflow-hidden group shadow-[0_0_30px_rgba(251,191,36,0.05)]">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-violet-500/5 to-amber-500/5"></div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full group-hover:bg-amber-500/20 transition-all duration-700"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-violet-500/10 blur-3xl rounded-full group-hover:bg-violet-500/20 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(251,191,36,0.15)] group-hover:shadow-[0_0_25px_rgba(251,191,36,0.3)] transition-shadow">
                <Crown size={24} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              </div>
              
              <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-5 px-2">
                Outstanding contributors and active Paperino Team members may be officially promoted as <span className="font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Paperino Platform Admins</span> based on their contribution quality, consistency, and community support.
              </p>
              
              <div className="pt-4 border-t border-white/5 w-full">
                <p className="text-amber-200/80 font-bold text-[11px] md:text-xs tracking-[0.15em] uppercase">
                  "Contribute consistently. Help students. Grow with Paperino."
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
