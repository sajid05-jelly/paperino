"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShieldCheck, ShieldAlert, FileText, Download, UserCheck, AlertTriangle, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/components/Toast";

interface AdminLog {
  id: string;
  adminEmail: string;
  actionType: string;
  targetId: string;
  details: string;
  timestamp: any;
}

interface DownloadLog {
  id: string;
  uid: string;
  materialId: string;
  downloadId: string;
  downloadTime: any;
  browser: string;
  device: string;
  ipAddress: string;
  userAgent: string;
}

export default function AdminSecurityPage() {
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch admin logs
      const adminQ = query(collection(db, "admin_logs"), orderBy("timestamp", "desc"), limit(20));
      const adminSnap = await getDocs(adminQ);
      const fetchedAdminLogs: AdminLog[] = [];
      adminSnap.forEach((docSnap) => {
        fetchedAdminLogs.push({ id: docSnap.id, ...docSnap.data() } as AdminLog);
      });
      setAdminLogs(fetchedAdminLogs);

      // Fetch download logs
      const downloadQ = query(collection(db, "download_logs"), orderBy("downloadTime", "desc"), limit(20));
      const downloadSnap = await getDocs(downloadQ);
      const fetchedDownloadLogs: DownloadLog[] = [];
      downloadSnap.forEach((docSnap) => {
        fetchedDownloadLogs.push({ id: docSnap.id, ...docSnap.data() } as DownloadLog);
      });
      setDownloadLogs(fetchedDownloadLogs);
    } catch (err) {
      console.error("Failed to load security logs:", err);
      showToast("Error loading security center logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
        <p className="text-gray-400 animate-pulse">Initializing Security Center...</p>
      </div>
    );
  }

  // Detect basic alerts (e.g. users downloading multiple materials from same IP)
  const ipCounts: Record<string, number> = {};
  downloadLogs.forEach(log => {
    if (log.ipAddress) {
      ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] || 0) + 1;
    }
  });

  const alerts = Object.entries(ipCounts)
    .filter(([_, count]) => count > 5)
    .map(([ip, count]) => ({
      type: "Excessive Downloads",
      severity: "medium",
      message: `IP Address ${ip} has triggered ${count} file downloads recently.`,
    }));

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <ShieldCheck className="text-purple-400" /> Security Center
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Monitor authentication sessions, audit administrative activities, track download history, and identify potential threat events.
        </p>
      </div>

      {/* Monitoring Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-amber-400 animate-pulse" /> Threat & Activity Warnings
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">{alert.type}</h4>
                  <p className="text-xs text-gray-300 mt-0.5">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Admin Audit Logs */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="text-purple-400" size={18} /> Administrative Audit Logs
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {adminLogs.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No admin activity logged yet.</p>
            ) : (
              adminLogs.map(log => (
                <div key={log.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-purple-500/20 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                      {log.actionType}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1"><Calendar size={10} /> {formatDate(log.timestamp)}</span>
                  </div>
                  <p className="text-sm text-white mt-1.5">{log.details}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Logged by: {log.adminEmail}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Download Logs */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="text-emerald-400" size={18} /> Download Logs & Analytics
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {downloadLogs.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No downloads logged yet.</p>
            ) : (
              downloadLogs.map(log => (
                <div key={log.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/20 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded tracking-wider">
                      {log.ipAddress}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1"><Calendar size={10} /> {formatDate(log.downloadTime)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-gray-400">
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-widest">User ID</span>
                      <span className="truncate block font-mono">{log.uid}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-widest">Material ID</span>
                      <span className="truncate block font-mono">{log.materialId}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-white/5">
                      <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-widest">Platform & Browser</span>
                      <span className="text-white block mt-0.5">{log.device} • {log.browser}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
