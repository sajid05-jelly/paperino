"use client";

import { useState } from "react";
import { 
  BookOpen, Trophy, Star, Award, Upload, ArrowRight, Sparkles, 
  FileText, CheckCircle2, ChevronRight, GraduationCap 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function BecomeContributorPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleStartContributing = () => {
    if (!user) {
      router.push("/login");
    } else {
      router.push("/contributor");
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      router.push("/login");
    } else {
      router.push("/contributor/upload");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#05030a] py-16 relative overflow-hidden selection:bg-purple-500/30">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,63,94,0.08)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-5xl mx-auto px-6 relative z-10 space-y-16">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center justify-center p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <Sparkles size={28} className="text-violet-400 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
            🚀 Become a <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Contributor</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-medium">
            Help students, share knowledge, earn rewards, and unlock premium benefits.
          </p>
        </div>

        {/* Introduction Section */}
        <div className="vision-glass p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.3)] max-w-3xl mx-auto text-center space-y-6">
          <p className="text-gray-300 text-base md:text-lg leading-relaxed">
            Have study materials, notes, lab manuals, question papers, PYQs, or useful academic resources?
            Upload them to Paperino and help fellow students succeed.
          </p>
          <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-rose-400">
            Every approved contribution helps the community and earns you rewards.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleStartContributing}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2"
            >
              Start Contributing <ArrowRight size={18} />
            </button>
            <button
              onClick={handleUploadClick}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <Upload size={18} /> Upload Materials
            </button>
          </div>
        </div>

        {/* Reward Highlights */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Platform Rewards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-violet-500/30 transition-all flex flex-col justify-between min-h-[180px]">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-violet-500/10 blur-xl rounded-full group-hover:bg-violet-500/20 transition-all"></div>
              <BookOpen size={28} className="text-violet-400" />
              <div>
                <h3 className="text-base font-bold text-white mb-1.5">Share Knowledge</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Help students across departments.</p>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-fuchsia-500/30 transition-all flex flex-col justify-between min-h-[180px]">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-fuchsia-500/10 blur-xl rounded-full group-hover:bg-fuchsia-500/20 transition-all"></div>
              <Trophy size={28} className="text-fuchsia-400" />
              <div>
                <h3 className="text-base font-bold text-white mb-1.5">Earn Points</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Climb the contributor leaderboard.</p>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-all flex flex-col justify-between min-h-[180px]">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/10 blur-xl rounded-full group-hover:bg-amber-500/20 transition-all"></div>
              <Star size={28} className="text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white mb-1.5">Unlock Premium</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Get ATS Analyzer and PYQ Analyzer rewards.</p>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-cyan-500/30 transition-all flex flex-col justify-between min-h-[180px]">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-cyan-500/10 blur-xl rounded-full group-hover:bg-cyan-500/20 transition-all"></div>
              <Award size={28} className="text-cyan-400" />
              <div>
                <h3 className="text-base font-bold text-white mb-1.5">Contributor Badges</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Earn recognition in the community.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Interactive Contributor Journey Steps Map */}
        <div className="vision-glass p-8 rounded-[2.5rem] border border-white/5 space-y-8">
          <h2 className="text-2xl font-bold text-white text-center">Contributor Journey</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center font-black mx-auto text-sm">1</div>
              <h4 className="text-xs font-bold text-white">Upload Material</h4>
              <p className="text-[10px] text-gray-500">Submit study guides, PYQs or notes</p>
            </div>

            <div className="flex justify-center text-gray-600 hidden md:flex"><ChevronRight size={20} /></div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black mx-auto text-sm">2</div>
              <h4 className="text-xs font-bold text-white">Admin Review</h4>
              <p className="text-[10px] text-gray-500">Moderators approve platform quality</p>
            </div>

            <div className="flex justify-center text-gray-600 hidden md:flex"><ChevronRight size={20} /></div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black mx-auto text-sm">3</div>
              <h4 className="text-xs font-bold text-white">Unlock Rewards</h4>
              <p className="text-[10px] text-gray-500">Earn points, premium access & ranks</p>
            </div>

            <div className="flex justify-center text-gray-600 hidden md:flex"><ChevronRight size={20} /></div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center space-y-2 col-span-1 md:col-span-6 xl:col-span-1 mx-auto w-full max-w-[200px] md:max-w-none mt-4 md:mt-0">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black mx-auto text-sm">
                <CheckCircle2 size={16} />
              </div>
              <h4 className="text-xs font-bold text-emerald-400">Contributor Tier Up</h4>
              <p className="text-[10px] text-gray-500">Increase ranking badge level</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
