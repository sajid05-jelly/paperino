"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Power, Save, AlertCircle, Wrench, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";

export default function SystemControlPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [title, setTitle] = useState("System Maintenance Mode");
  const [message, setMessage] = useState("We are currently performing critical system upgrades. Please check back soon!");
  const [estimatedReturn, setEstimatedReturn] = useState("A few hours");
  const [showProgress, setShowProgress] = useState(true);
  const [game, setGame] = useState("paperCatch");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingToggleVal, setPendingToggleVal] = useState(false);

  // 1. Fetch current settings from database
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "siteConfig"));
        if (snap.exists()) {
          const data = snap.data();
          setMaintenance(data.maintenance || false);
          setTitle(data.title || "System Maintenance Mode");
          setMessage(data.message || "");
          setEstimatedReturn(data.estimatedReturn || "A few hours");
          setShowProgress(data.showProgress ?? true);
          setGame(data.game || "paperCatch");
        }
      } catch (err) {
        console.error("Failed to load siteConfig:", err);
        setError("Failed to fetch current configuration.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // 2. Handle Save
  const handleSave = async (forceValue?: boolean) => {
    setSaving(true);
    setSuccess(false);
    setError(null);

    const finalMaintenanceVal = typeof forceValue === "boolean" ? forceValue : maintenance;

    try {
      await setDoc(doc(db, "settings", "siteConfig"), {
        maintenance: finalMaintenanceVal,
        title,
        message,
        estimatedReturn,
        showProgress,
        game,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSuccess(true);
      setMaintenance(finalMaintenanceVal);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save configuration:", err);
      setError("Failed to save changes. Make sure you are authenticated as an admin.");
    } finally {
      setSaving(false);
    }
  };

  // 3. Trigger Maintenance Toggle with confirmation
  const handleToggleClick = () => {
    const nextVal = !maintenance;
    if (nextVal) {
      // Trying to turn Maintenance Mode ON -> show modal
      setPendingToggleVal(nextVal);
      setShowConfirmModal(true);
    } else {
      // Turning OFF -> execute immediately
      handleSave(false);
    }
  };

  const confirmToggleOn = () => {
    setShowConfirmModal(false);
    handleSave(true);
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin"></div>
        <p className="text-violet-400 animate-pulse">Syncing environment control...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 relative overflow-hidden shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Wrench className="text-violet-400 animate-pulse" /> System Control Panel
          </h1>
          <p className="text-violet-200/60 max-w-2xl">
            Configure global website parameters, enable maintenance mode, custom messaging, and select interactive minigames for SRM students.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Setup Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
              <Power className="text-violet-400" /> Website Maintenance settings
            </h2>

            {/* Toggle Status Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-black/40 border border-white/5">
              <div>
                <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                  Maintenance Mode: {maintenance ? "🟢 ACTIVE" : "🔴 INACTIVE"}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {maintenance 
                    ? "Redirecting all visitors to maintenance screen. Admins bypass normally."
                    : "Website is active and accessible by everyone."}
                </p>
              </div>
              <div className="flex justify-end w-full sm:w-auto shrink-0">
                <button 
                  onClick={handleToggleClick}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${maintenance ? 'bg-violet-600' : 'bg-white/10 border border-white/10'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${maintenance ? 'translate-x-9' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Maintenance text configurations */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Maintenance Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Estimated Return Time</label>
                  <input
                    type="text"
                    value={estimatedReturn}
                    onChange={(e) => setEstimatedReturn(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Custom Subtitle Message</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                  placeholder="e.g. Upgrading our servers..."
                />
              </div>

              {/* Progress Bar Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-sm font-semibold text-white">Show Progress Bar</h4>
                  <p className="text-xs text-gray-500">Displays a space-themed animated loading bar set to 85%.</p>
                </div>
                <button
                  onClick={() => setShowProgress(!showProgress)}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${showProgress ? 'bg-violet-600' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${showProgress ? 'translate-x-6.5' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Game selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Interactive Minigame</label>
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  className="w-full bg-[#110f1c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 cursor-pointer"
                >
                  <option value="bookStack">Book Stack Challenge 📚</option>
                  <option value="memoryMatch">Memory Match 🧠</option>
                  <option value="quickQuiz">Quick Quiz Blitz ⚡</option>
                  <option value="colorTap">Color Tap Challenge 🎯</option>
                  <option value="none">None (Hide game console)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Save Button Row */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/5">
              {success && (
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 animate-in fade-in duration-300">
                  <CheckCircle2 size={14} /> Site Configuration saved!
                </span>
              )}
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-violet-900/30"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Information / Bypass Notice */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldAlert size={100} />
            </div>
            <h3 className="text-lg font-semibold text-white relative z-10">Bypass Security</h3>
            
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200/80 leading-relaxed">
              <p className="font-bold text-violet-300 mb-1 flex items-center gap-1"><AlertCircle size={12} /> Admin Exemption</p>
              Admins and Contributors always bypass the maintenance screen. Even if maintenance is active, you can safely navigate, test layouts, manage courses and view statistics.
            </div>
          </div>
        </div>

      </div>

      {/* ⚠️ Toggle ON Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]" style={{ background: "rgba(12,8,24,0.98)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert size={22} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Enable Maintenance?</h3>
                <p className="text-gray-400 text-xs">Action requires confirmation</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Are you sure you want to enable Maintenance Mode? This will <span className="text-white font-bold">redirect all non-admin visitors</span> to the maintenance screen instantly.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleOn}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-rose-900/30"
              >
                Enable Maintenance Mode
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
