"use client";

import { useState, useEffect } from "react";
import { 
  Building2, Trash2, Settings, BarChart2, ShieldAlert, 
  CheckCircle2, Loader2, Save, RefreshCw, ThumbsUp, ThumbsDown,
  ToggleLeft, ToggleRight, AlertTriangle, X
} from "lucide-react";
import { collection, onSnapshot, doc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { FreeClassReport, FreeClassConfig, DEFAULT_FREE_CLASS_CONFIG, calculateConfidenceScore } from "@/lib/freeClassFinder";

export default function AdminFreeClassFinderPage() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [reports, setReports] = useState<FreeClassReport[]>([]);
  const [config, setConfig] = useState<FreeClassConfig>(DEFAULT_FREE_CLASS_CONFIG);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal Dialog States
  const [showEnableConfirm, setShowEnableConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Load configuration
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "platform_config", "free_class_finder"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsEnabled(data.enabled ?? false);
          setConfig({
            expiryMinutes: data.expiryMinutes || 30,
            minConfidenceThreshold: data.minConfidenceThreshold || 60,
            reportRateLimitMinutes: data.reportRateLimitMinutes || 5
          });
        } else {
          setIsEnabled(false);
        }
      },
      (err) => {
        console.warn("[Admin Free Class Finder Config Listener Notice]:", err.message);
      }
    );
    return () => unsub();
  }, []);

  // Fetch all reports
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "freeClassrooms"),
      (snap) => {
        const list: FreeClassReport[] = [];
        const now = Date.now();

        snap.forEach((d) => {
          const data = d.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt || now);
          const expiresAt = data.expiresAt || (createdAt + config.expiryMinutes * 60 * 1000);

          const rep: FreeClassReport = {
            id: d.id,
            collegeName: data.collegeName || "SRM IST",
            block: data.block || "TP",
            floor: data.floor || 1,
            roomNumber: data.roomNumber || d.id,
            capacity: data.capacity,
            hasAC: data.hasAC,
            hasProjector: data.hasProjector,
            reporterUid: data.reporterUid,
            reporterName: data.reporterName,
            createdAt,
            expiresAt,
            trueVotes: data.trueVotes || 0,
            falseVotes: data.falseVotes || 0,
            voters: data.voters || {},
            reporterCount: data.reporterCount || 1,
            status: expiresAt < now ? "expired" : (data.status || "active")
          };
          rep.confidenceScore = calculateConfidenceScore(rep, config.expiryMinutes);
          list.push(rep);
        });

        setReports(list.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      },
      (err) => {
        console.warn("[Admin Free Class Finder Reports Listener Notice]:", err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [config.expiryMinutes]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await setDoc(doc(db, "platform_config", "free_class_finder"), {
        ...config,
        enabled: isEnabled
      }, { merge: true });
      showToast("Configuration saved successfully", "success");
    } catch (err: any) {
      showToast("Failed to save configuration: " + err.message, "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleModule = (targetState: boolean) => {
    if (targetState === true) {
      setShowEnableConfirm(true);
    } else {
      setShowDisableConfirm(true);
    }
  };

  const confirmToggleStatus = async (newStatus: boolean) => {
    setTogglingStatus(true);
    try {
      await setDoc(doc(db, "platform_config", "free_class_finder"), {
        enabled: newStatus
      }, { merge: true });
      setIsEnabled(newStatus);
      showToast(`Free Class Finder is now ${newStatus ? "ENABLED" : "DISABLED"}.`, "success");
    } catch (err: any) {
      showToast("Failed to update status: " + err.message, "error");
    } finally {
      setTogglingStatus(false);
      setShowEnableConfirm(false);
      setShowDisableConfirm(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm(`Are you sure you want to delete report ${reportId}?`)) return;
    setDeletingId(reportId);
    try {
      await deleteDoc(doc(db, "freeClassrooms", reportId));
      showToast(`Report ${reportId} deleted successfully`, "success");
    } catch (err: any) {
      showToast("Failed to delete report: " + err.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050308] text-white pt-24 p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert size={48} className="mx-auto text-rose-500" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-gray-400">Admin privileges required to access this portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050308] text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Settings size={14} className="text-purple-400" /> Admin Control Panel
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Free Class Finder <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Management</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 font-mono">Total Reports: {reports.length}</span>
          </div>
        </div>

        {/* 🛠️ Free Class Finder Control Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-[#120924] via-[#0e081c] to-[#050308] shadow-[0_0_40px_rgba(139,92,246,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">🛠️ Free Class Finder Control</h2>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                  isEnabled ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                }`}>
                  Status: {isEnabled ? "LIVE & ACTIVE" : "DISABLED"}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Enable or disable the Free Class Finder module for all users across the platform.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/10 w-full md:w-auto justify-between md:justify-end">
            <span className="text-sm font-bold text-gray-300">Module Status:</span>
            <button
              onClick={() => handleToggleModule(!isEnabled)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer border ${
                isEnabled
                  ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 border-white/10"
              }`}
            >
              {isEnabled ? <ToggleRight size={20} className="text-purple-300" /> : <ToggleLeft size={20} className="text-gray-500" />}
              <span>{isEnabled ? "ENABLED (ON)" : "DISABLED (OFF)"}</span>
            </button>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Settings size={20} className="text-purple-400" />
            <h2 className="text-lg font-bold text-white">Algorithm & Expiry Parameters</h2>
          </div>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">
                Report Expiry (Minutes)
              </label>
              <input
                type="number"
                value={config.expiryMinutes}
                onChange={(e) => setConfig({ ...config, expiryMinutes: parseInt(e.target.value, 10) || 30 })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                min={5}
                max={180}
              />
              <p className="text-[10px] text-gray-500 mt-1">Reports automatically expire after this duration.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">
                Min Confidence Threshold (%)
              </label>
              <input
                type="number"
                value={config.minConfidenceThreshold}
                onChange={(e) => setConfig({ ...config, minConfidenceThreshold: parseInt(e.target.value, 10) || 60 })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                min={0}
                max={100}
              />
              <p className="text-[10px] text-gray-500 mt-1">Minimum score required for "Recommended" section.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">
                Rate Limit Cooldown (Minutes)
              </label>
              <input
                type="number"
                value={config.reportRateLimitMinutes}
                onChange={(e) => setConfig({ ...config, reportRateLimitMinutes: parseInt(e.target.value, 10) || 5 })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                min={1}
                max={60}
              />
              <p className="text-[10px] text-gray-500 mt-1">Cooldown time per student report.</p>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* Reports Table */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <BarChart2 size={20} className="text-purple-400" />
              <h2 className="text-lg font-bold text-white">Active & Community Reported Classrooms</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-purple-400" size={32} />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No classroom reports found in Firestore.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Room & College</th>
                    <th className="py-3 px-4">Block / Floor</th>
                    <th className="py-3 px-4">Reporter</th>
                    <th className="py-3 px-4">Votes</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{r.roomNumber}</div>
                        <div className="text-[10px] text-purple-300 font-normal">{r.collegeName || "SRM IST"}</div>
                      </td>
                      <td className="py-3 px-4">{r.block} · Floor {r.floor}</td>
                      <td className="py-3 px-4 text-gray-400">{r.reporterName}</td>
                      <td className="py-3 px-4">
                        <span className="text-purple-400 font-semibold">+{r.trueVotes}</span> / <span className="text-rose-400 font-semibold">-{r.falseVotes}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-300">{r.confidenceScore}%</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === "active" ? "bg-purple-500/20 text-purple-300" : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteReport(r.id)}
                          disabled={deletingId === r.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Report"
                        >
                          {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog: Enable Free Class Finder */}
      {showEnableConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowEnableConfirm(false)}></div>
          <div className="relative w-full max-w-md bg-[#0e091b] border border-purple-500/40 p-6 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.3)] z-10 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <CheckCircle2 size={22} />
                </div>
                <h3 className="text-lg font-bold text-white">Enable Free Class Finder?</h3>
              </div>
              <button onClick={() => setShowEnableConfirm(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to enable this feature for all users? Students will immediately be able to access and report free classrooms.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowEnableConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={togglingStatus}
                onClick={() => confirmToggleStatus(true)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(139,92,246,0.4)] flex items-center gap-2"
              >
                {togglingStatus ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Yes, Enable</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Disable Free Class Finder */}
      {showDisableConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDisableConfirm(false)}></div>
          <div className="relative w-full max-w-md bg-[#0e091b] border border-rose-500/40 p-6 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.3)] z-10 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-lg font-bold text-white">Disable Free Class Finder?</h3>
              </div>
              <button onClick={() => setShowDisableConfirm(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure? Students will temporarily lose access to the Free Class Finder until you enable it again.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDisableConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={togglingStatus}
                onClick={() => confirmToggleStatus(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center gap-2"
              >
                {togglingStatus ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                <span>Yes, Disable</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
