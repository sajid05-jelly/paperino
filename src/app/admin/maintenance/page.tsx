'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Wrench, Save, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function MaintenanceAdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ── Auth guard ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/');
    }
  }, [user, isAdmin, loading, router]);

  /* ── Real-time listener on settings/maintenance ──────────────────────── */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'maintenance'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setIsActive(data.isActive ?? false);
          setMessage(data.message ?? '');
        }
      },
      (err) => console.error('[MaintenancePage] Firestore error:', err)
    );
    return () => unsubscribe();
  }, []);

  /* ── Save handler ────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(
        doc(db, 'settings', 'maintenance'),
        { isActive, message, updatedAt: new Date() },
        { merge: true }
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('[MaintenancePage] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading / unauthorised guard ────────────────────────────────────── */
  if (loading || !user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  /* ── UI ───────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
          <Wrench size={22} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Maintenance Mode</h1>
          <p className="text-gray-400 text-sm">Control the site-wide maintenance banner</p>
        </div>
      </div>

      {/* ── Status pill ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isActive
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          {isActive ? 'Maintenance Active' : 'Live — All Systems Go'}
        </span>
      </div>

      {/* ── Glass card ────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Enable Maintenance Banner</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Shows a dismissible banner at the top of every page for all visitors.
            </p>
          </div>

          {/* Styled toggle switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors duration-300 border ${
                isActive
                  ? 'bg-amber-500/80 border-amber-400/60'
                  : 'bg-white/10 border-white/20'
              } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-400/40`}
            />
            <div
              className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </label>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/10" />

        {/* Message textarea */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Banner Message
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Scheduled maintenance message…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50
                       resize-none transition-colors"
          />
          <p className="text-xs text-gray-500">
            Leave blank to use the default message. This updates live — no refresh needed.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/10" />

        {/* Preview */}
        {isActive && (
          <div className="rounded-xl overflow-hidden border border-amber-500/30">
            <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-4 py-2.5 flex items-center gap-2">
              <Wrench size={13} className="text-white flex-shrink-0" />
              <AlertTriangle size={13} className="text-white/80 flex-shrink-0" />
              <p className="text-white text-xs font-medium truncate">
                {message || 'We are currently performing scheduled maintenance. Some features may be temporarily unavailable.'}
              </p>
            </div>
            <p className="text-xs text-gray-500 px-3 py-1.5 bg-white/5">
              ↑ Live preview of the banner
            </p>
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              saving
                ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 hover:shadow-violet-700/40'
            }`}
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <CheckCircle2 size={15} />
              Saved successfully
            </span>
          )}
        </div>
      </div>

      {/* ── Info card ─────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-5 border border-violet-500/20 space-y-2">
        <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Firestore Reference</p>
        <p className="text-xs text-gray-400 font-mono">
          Collection: <span className="text-gray-200">settings</span> / Document: <span className="text-gray-200">maintenance</span>
        </p>
        <p className="text-xs text-gray-500">
          Fields: <code className="text-gray-300">isActive</code> (boolean) · <code className="text-gray-300">message</code> (string) · <code className="text-gray-300">updatedAt</code> (timestamp)
        </p>
      </div>
    </div>
  );
}
