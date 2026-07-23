"use client";

import { useState, useEffect } from "react";
import { Bot, Save, AlertCircle, Activity, Power, ShieldCheck } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ATSManagement() {
  const [atsEnabled, setAtsEnabled] = useState(true);
  const [maintenanceTitle, setMaintenanceTitle] = useState("🚧 ATS Analyzer Building in Progress");
  const [maintenanceMessage, setMaintenanceMessage] = useState("We are currently improving our ATS Engine to provide more accurate recruiter insights, keyword matching, and resume recommendations. Please check back later.");
  
  const [atsUsage, setAtsUsage] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("Unknown");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Fetch ATS Config
        const configDoc = await getDoc(doc(db, "platform_config", "features"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.atsEnabled !== undefined) setAtsEnabled(data.atsEnabled);
          if (data.maintenanceTitle) setMaintenanceTitle(data.maintenanceTitle);
          if (data.maintenanceMessage) setMaintenanceMessage(data.maintenanceMessage);
          if (data.lastUpdated) {
            setLastUpdated(new Date(data.lastUpdated.toMillis ? data.lastUpdated.toMillis() : data.lastUpdated).toLocaleString());
          }
        }

        // Fetch Usage
        const statsDoc = await getDoc(doc(db, "platform_stats", "global"));
        if (statsDoc.exists()) {
          setAtsUsage(statsDoc.data().atsUsage || 0);
        }
      } catch (err) {
        console.error("Failed to load ATS config:", err);
        setError("Failed to load configuration.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await setDoc(doc(db, "platform_config", "features"), {
        atsEnabled,
        maintenanceTitle,
        maintenanceMessage,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      setSuccess(true);
      setLastUpdated(new Date().toLocaleString());
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save failed:", err);
      setError(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-emerald-500/20 relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Bot className="text-emerald-400" /> ATS Management
        </h1>
        <p className="text-emerald-200/60 max-w-2xl">
          Control public access to the AI Resume Analyzer and configure maintenance messages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-white/10">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
              <Power className="text-fuchsia-400" /> System Status
            </h2>
            
            {/* Status Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-black/40 border border-white/5 mb-8">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">ATS Analyzer Mode</h3>
                <p className="text-sm text-gray-400">
                  {atsEnabled 
                    ? "Currently LIVE and accepting user resumes." 
                    : "Currently DISABLED. Showing maintenance screen."}
                </p>
              </div>
              <div className="flex justify-end w-full sm:w-auto shrink-0">
                <button 
                  onClick={() => setAtsEnabled(!atsEnabled)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${atsEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${atsEnabled ? 'translate-x-9' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Maintenance Settings */}
            <div className={`space-y-5 transition-opacity duration-300 ${atsEnabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <AlertCircle className="text-amber-400" size={18} /> Maintenance Screen Content
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Title</label>
                <input 
                  type="text" 
                  value={maintenanceTitle}
                  onChange={(e) => setMaintenanceTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g. 🚧 ATS Analyzer Building in Progress"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Detailed Message</label>
                <textarea 
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white h-32 focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Explain why the system is offline..."
                />
              </div>
            </div>

            {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            
            {/* Action Bar */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Last updated: <span className="text-gray-300">{lastUpdated}</span>
              </div>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save size={18} />
                )}
                {success ? "Saved!" : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Stats */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Activity size={100} />
             </div>
             <h3 className="text-lg font-semibold text-white mb-6 relative z-10">Usage Statistics</h3>
             
             <div className="bg-black/30 border border-white/5 p-5 rounded-2xl relative z-10">
               <div className="text-sm text-gray-400 mb-1">Total Resumes Analyzed</div>
               <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                 {atsUsage.toLocaleString()}
               </div>
             </div>

             <div className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
               <h4 className="flex items-center gap-2 text-violet-300 font-medium text-sm mb-2">
                 <ShieldCheck size={16} /> Security Note
               </h4>
               <p className="text-xs text-violet-200/70 leading-relaxed">
                 When disabled, the backend API instantly returns a 403 Forbidden status. This prevents bypass attempts via DevTools or direct POST requests.
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
