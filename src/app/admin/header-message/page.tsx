"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2, MessageSquareText } from "lucide-react";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

export default function AdminHeaderMessagePage() {
  const [headerMessage, setHeaderMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchHeaderMessage() {
      try {
        const res = await fetch("/api/admin/header-message");
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setHeaderMessage(data.text || "The Universe of Study Materials");
        } else {
          console.warn("[Admin] Header message endpoint returned non-JSON response:", await res.text());
          setHeaderMessage("The Universe of Study Materials");
        }
      } catch (err: any) {
        console.error("[Admin] Failed to fetch header message:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeaderMessage();
  }, []);

  const handleSave = async () => {
    if (!headerMessage.trim()) return;
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await getIdToken(user);

      const res = await fetch("/api/admin/header-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: headerMessage.trim() }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid non-JSON response.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error("[Admin] Failed to save header message:", err);
      setError("Failed to save header message: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative rounded-3xl overflow-hidden p-8 border border-violet-500/30 shadow-[0_0_50px_rgba(139,92,246,0.15)]" style={{
        background: "linear-gradient(135deg, rgba(88,28,135,0.3) 0%, rgba(49,10,101,0.4) 50%, rgba(17,5,40,0.8) 100%)"
      }}>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-violet-400" /> Admin Controls
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Paperino <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Header Message</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Customize the dynamic tagline shown directly below the "Paperino" brand title across the website.
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 space-y-6 shadow-[0_0_30px_rgba(139,92,246,0.1)] relative overflow-hidden" style={{
        background: "linear-gradient(160deg, rgba(15,8,30,0.8) 0%, rgba(7,3,15,0.95) 100%)"
      }}>
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <MessageSquareText size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Live Site Tagline</h2>
            <p className="text-xs text-gray-400">Changes apply instantly to all visitors across pages.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="animate-spin text-violet-400" size={20} />
            <span className="text-sm">Loading current header message...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-violet-300">
              Tagline Text
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={headerMessage}
                onChange={(e) => setHeaderMessage(e.target.value)}
                placeholder="The Universe of Study Materials"
                className="flex-1 bg-black/50 border border-violet-500/30 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
              />

              <button
                onClick={handleSave}
                disabled={saving || !headerMessage.trim()}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-900/30 border border-violet-400/30"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Save Tagline</span>
                  </>
                )}
              </button>
            </div>

            {success && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 size={16} />
                <span>Tagline updated successfully! Changes are live across the site.</span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
