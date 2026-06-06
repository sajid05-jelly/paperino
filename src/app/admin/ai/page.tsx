"use client";

import { useState, useEffect } from "react";
import { Bot, Power, ShieldAlert, ListFilter, RotateCcw, AlertTriangle, Settings, UserX, Database, CheckCircle2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AIControlPanel() {
  const [aiStatus, setAiStatus] = useState("online");
  const [globalLimit, setGlobalLimit] = useState(5000);
  const [userLimit, setUserLimit] = useState(10);
  const [bannedUser, setBannedUser] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mock Conversations
  const recentLogs = [
    { id: "msg_1", user: "Student_A", prompt: "Explain Binary Search Trees", tokens: 145, time: "2 mins ago", status: "success" },
    { id: "msg_2", user: "Student_B", prompt: "Solve 2x + 4 = 10", tokens: 42, time: "15 mins ago", status: "success" },
    { id: "msg_3", user: "Student_C", prompt: "Write my essay on history", tokens: 18, time: "1 hour ago", status: "blocked" },
    { id: "msg_4", user: "Student_D", prompt: "What is CGPA?", tokens: 89, time: "3 hours ago", status: "success" },
  ];

  useEffect(() => {
    const loadSettings = async () => {
      const docSnap = await getDoc(doc(db, "settings", "ai"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.aiStatus) setAiStatus(data.aiStatus);
        if (data.globalLimit) setGlobalLimit(data.globalLimit);
        if (data.userLimit) setUserLimit(data.userLimit);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "ai"), {
        aiStatus,
        globalLimit,
        userLimit,
        updatedAt: new Date()
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-fuchsia-500/20 relative overflow-hidden shadow-[0_0_40px_rgba(var(--secondary-rgb),0.1)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-fuchsia-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Bot className="text-fuchsia-400" /> AI Control Panel
            </h1>
            <p className="text-fuchsia-200/60 max-w-2xl">
              Manage Paperino AI system state, enforce usage limits, and monitor student queries to prevent API abuse.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-black/40 rounded-full border border-white/5">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${aiStatus === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${aiStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-sm font-bold tracking-widest uppercase text-white">
              System {aiStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Core Controls */}
        <div className="lg:col-span-1 space-y-6">
          


          {/* Usage Limits Configuration */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Settings className="text-cyan-400" size={18} /> Usage Limits
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Global Daily API Limit</label>
                <input 
                  type="number" 
                  value={globalLimit}
                  onChange={(e) => setGlobalLimit(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Per-User Daily Limit</label>
                <input 
                  type="number" 
                  value={userLimit}
                  onChange={(e) => setUserLimit(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full mt-6 bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 text-white border border-white/10 hover:border-cyan-500/50 transition-all duration-300 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (saved ? <CheckCircle2 size={16} className="text-emerald-400"/> : "Save Configuration")}
            </button>
          </div>

          {/* Ban User */}
          <div className="glass-panel p-6 rounded-3xl border border-red-500/20 bg-red-500/[0.02]">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
              <UserX size={18} /> Block Spam User
            </h3>
            <p className="text-xs text-red-200/50 mb-4">Enter user ID or email to block them from accessing the AI API.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={bannedUser}
                onChange={(e) => setBannedUser(e.target.value)}
                placeholder="User ID / Email"
                className="flex-1 bg-black/40 border border-red-500/20 rounded-xl px-4 py-2.5 text-white outline-none focus:border-red-500/50 text-sm w-full"
              />
              <button className="bg-red-500/20 hover:bg-red-500/40 text-red-300 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto shrink-0">
                Block
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Monitoring & Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Database size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">API Requests Today</p>
                <p className="text-2xl font-bold text-white">1,204 <span className="text-xs text-gray-500 font-normal">/ {globalLimit}</span></p>
              </div>
            </div>
            
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between gap-4 group cursor-pointer hover:border-orange-500/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Daily Reset Status</p>
                  <p className="text-sm font-bold text-white mt-1">Resets in 6h 12m</p>
                </div>
              </div>
              <button className="text-xs bg-white/5 hover:bg-orange-500/20 hover:text-orange-300 text-gray-300 px-3 py-1.5 rounded-lg border border-white/10 transition-colors">
                Force Reset
              </button>
            </div>
          </div>



        </div>
      </div>
    </div>
  );
}
