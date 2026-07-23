"use client";

import { useState, useEffect } from "react";
import { BrainCircuit, Save, Activity, Power, ShieldCheck } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CareerDnaManagement() {
  const [careerDnaEnabled, setCareerDnaEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("Unknown");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "platform_config", "features"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.careerDnaEnabled !== undefined) setCareerDnaEnabled(data.careerDnaEnabled);
          if (data.lastUpdatedDna) {
            setLastUpdated(new Date(data.lastUpdatedDna.toMillis ? data.lastUpdatedDna.toMillis() : data.lastUpdatedDna).toLocaleString());
          }
        }
      } catch (err) {
        console.error("Failed to load Career DNA config:", err);
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
        careerDnaEnabled,
        lastUpdatedDna: new Date().toISOString()
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
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-purple-500/20 relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <BrainCircuit className="text-purple-400" /> Career DNA Management
        </h1>
        <p className="text-purple-200/60 max-w-2xl">
          Control public access to the AI Career DNA Dashboard and toggle system maintenance status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-white/10">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
              <Power className="text-purple-400" /> System Status
            </h2>
            
            {/* Status Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-black/40 border border-white/5 mb-8">
              <div>
                <h3 className="text-lg font-medium text-white mb-1 flex flex-wrap items-center gap-2">
                  <span>Career DNA Platform Status:</span>
                  <span className="whitespace-nowrap">{careerDnaEnabled ? "🟢 Enabled" : "🔴 Under Development"}</span>
                </h3>
                <p className="text-sm text-gray-400">
                  {careerDnaEnabled 
                    ? "Currently LIVE and accessible by all students." 
                    : "Currently UNDER DEVELOPMENT. Showing professional maintenance screen."}
                </p>
              </div>
              <div className="flex justify-end w-full sm:w-auto shrink-0">
                <button 
                  onClick={() => setCareerDnaEnabled(!careerDnaEnabled)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${careerDnaEnabled ? 'bg-purple-500' : 'bg-red-600'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${careerDnaEnabled ? 'translate-x-9' : 'translate-x-1'}`} />
                </button>
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
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
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

        {/* Right Col: Info */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Activity size={100} />
             </div>
             <h3 className="text-lg font-semibold text-white mb-6 relative z-10">Information</h3>
             
             <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
               <h4 className="flex items-center gap-2 text-violet-300 font-medium text-sm mb-2">
                 <ShieldCheck size={16} /> Instant Updates
               </h4>
               <p className="text-xs text-violet-200/70 leading-relaxed">
                 Toggling the system status instantly affects access to the Career DNA page. When set to 'Under Development', students will see the customized maintenance landing page.
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
