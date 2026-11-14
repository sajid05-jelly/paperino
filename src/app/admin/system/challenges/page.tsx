"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { 
  Trophy, Save, AlertCircle, Calendar, Gamepad2, 
  Loader2, CheckCircle2, ShieldAlert, Clock, Rocket,
  ExternalLink, Eye, RotateCcw, Sparkles
} from "lucide-react";

function getIsoWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

const ALL_GAMES = [
  { id: 'bug-hunter', name: '🐛 Bug Hunter (Find & fix bugs)', isArena: true },
  { id: 'memory-rush', name: '✨ Memory Rush (Match concept pairs)', isArena: true },
  { id: 'typing-blitz', name: '⌨️ Typing Blitz (Speed & accuracy)', isArena: true },
  { id: 'number-detective', name: '🔍 Number Detective (Math sequences)', isArena: true },
  { id: 'logic-master', name: '🧠 Logic Master (Visual reasoning)', isArena: true },
  { id: 'code-breaker', name: '💻 Code Breaker (Binary & crypto)', isArena: true },
  { id: 'circuit-master', name: '⚡ Circuit Master (Interactive logic gates)', isArena: true },
  { id: 'memory-matrix', name: 'Memory Matrix (Legacy)', isArena: false },
  { id: 'impossible-room', name: 'The Impossible Room (Legacy)', isArena: false },
  { id: 'word-forge', name: 'Word Forge (Legacy)', isArena: false },
  { id: 'target-number', name: '🎯 Target Number (Legacy)', isArena: false },
  { id: 'memory-heist', name: '🧠 Memory Heist (Legacy)', isArena: false },
  { id: 'the-impostor', name: '🕵️ The Impostor (Legacy)', isArena: false },
  { id: 'paradox', name: '🌀 Paradox (Legacy)', isArena: false },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ChallengesControlPage() {
  const [wcEnabled, setWcEnabled] = useState(true);
  const [wcAdminTestMode, setWcAdminTestMode] = useState(false);
  const [wcMaintenanceMode, setWcMaintenanceMode] = useState(false);
  const [wcLeaderboardEnabled, setWcLeaderboardEnabled] = useState(true);
  const [wcOpenTime, setWcOpenTime] = useState("00:00");
  const [wcCloseTime, setWcCloseTime] = useState("23:59");
  const [wcOfficialAttempts, setWcOfficialAttempts] = useState(1);
  const [wcAvailableDays, setWcAvailableDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [wcActiveGames, setWcActiveGames] = useState<string[]>([
    "bug-hunter", "memory-rush", "typing-blitz", "number-detective", "logic-master", "code-breaker", "circuit-master"
  ]);
  const [wcHasResults, setWcHasResults] = useState(false);
  const [wcChallengeSessionId, setWcChallengeSessionId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWcConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "weeklyChallenges"));
        if (snap.exists()) {
          const data = snap.data();
          setWcEnabled(data.enabled ?? true);
          setWcAdminTestMode(data.adminTestMode ?? false);
          setWcMaintenanceMode(data.maintenanceMode ?? false);
          setWcLeaderboardEnabled(data.leaderboardEnabled ?? true);
          setWcOpenTime(data.openTime || "00:00");
          setWcCloseTime(data.closeTime || "23:59");
          setWcOfficialAttempts(data.officialAttempts || 1);
          if (Array.isArray(data.availableDays)) {
            setWcAvailableDays(data.availableDays);
          }
          if (Array.isArray(data.activeGames)) {
            setWcActiveGames(data.activeGames);
          }
          setWcChallengeSessionId(data.challengeSessionId || "");
        }

        try {
          const resultsSnap = await getDocs(query(collection(db, "challenge_results"), limit(1)));
          setWcHasResults(!resultsSnap.empty);
        } catch {
          setWcHasResults(false);
        }
      } catch (err: any) {
        console.error("Failed to load weeklyChallenges config:", err);
        setError("Failed to load Weekly Challenges configuration.");
      } finally {
        setLoading(false);
      }
    };
    fetchWcConfig();
  }, []);

  const handleStartNewSession = async () => {
    setStartingSession(true);
    setSessionSuccess(false);
    setError(null);
    const newId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setWcChallengeSessionId(newId);

    try {
      await setDoc(doc(db, "settings", "weeklyChallenges"), {
        enabled: wcEnabled,
        adminTestMode: wcAdminTestMode,
        maintenanceMode: wcMaintenanceMode,
        leaderboardEnabled: wcLeaderboardEnabled,
        openTime: wcOpenTime,
        closeTime: wcCloseTime,
        officialAttempts: wcOfficialAttempts,
        availableDays: wcAvailableDays,
        activeGames: wcActiveGames,
        currentWeek: getIsoWeek(),
        challengeSessionId: newId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSessionSuccess(true);
      setSuccess(true);
      setTimeout(() => {
        setSessionSuccess(false);
        setSuccess(false);
      }, 4000);
    } catch (err) {
      console.error("Failed to start new challenge session:", err);
      setError("Failed to start new session. Make sure you are authenticated as an admin.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await setDoc(doc(db, "settings", "weeklyChallenges"), {
        enabled: wcEnabled,
        adminTestMode: wcAdminTestMode,
        maintenanceMode: wcMaintenanceMode,
        leaderboardEnabled: wcLeaderboardEnabled,
        openTime: wcOpenTime,
        closeTime: wcCloseTime,
        officialAttempts: wcOfficialAttempts,
        availableDays: wcAvailableDays,
        activeGames: wcActiveGames,
        currentWeek: getIsoWeek(),
        challengeSessionId: wcChallengeSessionId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save weeklyChallenges config:", err);
      setError("Failed to save changes. Make sure you are authenticated as an admin.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin"></div>
        <p className="text-violet-400 animate-pulse">Syncing Challenges Control...</p>
      </div>
    );
  }

  const activeDaysSummary = wcAvailableDays.length === 7 
    ? 'All 7 Days (Every day)' 
    : wcAvailableDays.length === 0 
    ? 'None (Challenges Closed)' 
    : wcAvailableDays.map(d => DAY_LABELS[d]).join(', ');

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 relative overflow-hidden shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="text-violet-400 animate-pulse" /> Challenges Control Panel
          </h1>
          <p className="text-violet-200/60 max-w-2xl text-sm">
            Configure Paperino Challenge Arena, active games, weekly schedules, leaderboard and live student access.
          </p>
        </div>

        {/* Live Arena Link */}
        <Link
          href="/weekly-challenges"
          target="_blank"
          className="liquid-btn px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider border border-white/20 transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span>Open Live Arena</span>
          <ExternalLink size={14} />
        </Link>
      </div>

      {/* Main Form Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Gamepad2 className="text-violet-400" /> Arena Settings & Schedule
          </h2>
          <span className="text-xs text-purple-300 font-mono">
            {wcActiveGames.length} Active Games · {wcAvailableDays.length} Days Open
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Core Status & Timing */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white">Feature Enabled</h3>
                <p className="text-xs text-gray-500">Turns the entire challenge arena on or off globally.</p>
              </div>
              <button 
                type="button"
                onClick={() => setWcEnabled(!wcEnabled)} 
                className={`relative inline-flex h-8 w-[58px] items-center rounded-full transition-colors cursor-pointer shrink-0 ${wcEnabled ? 'bg-violet-600' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${wcEnabled ? 'translate-x-[28px]' : 'translate-x-[4px]'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-purple-500/20 bg-purple-500/5">
              <div>
                <h3 className="text-sm font-semibold text-purple-200 flex items-center gap-2">
                  Admin Test Mode
                  {wcAdminTestMode && <span className="text-[10px] bg-purple-500/30 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/40">TEST MODE ACTIVE</span>}
                </h3>
                <p className="text-xs text-gray-400">Allows administrators to bypass day restrictions and test games anytime without student restrictions.</p>
              </div>
              <button 
                type="button"
                onClick={() => setWcAdminTestMode(!wcAdminTestMode)} 
                className={`relative inline-flex h-8 w-[58px] items-center rounded-full transition-colors cursor-pointer shrink-0 ${wcAdminTestMode ? 'bg-purple-600' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${wcAdminTestMode ? 'translate-x-[28px]' : 'translate-x-[4px]'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white">Maintenance Mode</h3>
                <p className="text-xs text-gray-500">Locks challenges specifically without affecting the rest of the site.</p>
              </div>
              <button 
                type="button"
                onClick={() => setWcMaintenanceMode(!wcMaintenanceMode)} 
                className={`relative inline-flex h-8 w-[58px] items-center rounded-full transition-colors cursor-pointer shrink-0 ${wcMaintenanceMode ? 'bg-rose-600' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${wcMaintenanceMode ? 'translate-x-[28px]' : 'translate-x-[4px]'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white">Global Leaderboard</h3>
                <p className="text-xs text-gray-500">Show or hide the challenge leaderboard to users.</p>
              </div>
              <button 
                type="button"
                onClick={() => setWcLeaderboardEnabled(!wcLeaderboardEnabled)} 
                className={`relative inline-flex h-8 w-[58px] items-center rounded-full transition-colors cursor-pointer shrink-0 ${wcLeaderboardEnabled ? 'bg-violet-600' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${wcLeaderboardEnabled ? 'translate-x-[28px]' : 'translate-x-[4px]'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                  <Clock size={12} /> Open Time (HH:MM)
                </label>
                <input 
                  type="time" 
                  value={wcOpenTime} 
                  onChange={(e) => setWcOpenTime(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                  <Clock size={12} /> Close Time (HH:MM)
                </label>
                <input 
                  type="time" 
                  value={wcCloseTime} 
                  onChange={(e) => setWcCloseTime(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Official Attempts Limit</label>
              <input 
                type="number" 
                min={1} 
                max={10} 
                value={wcOfficialAttempts} 
                onChange={(e) => setWcOfficialAttempts(parseInt(e.target.value) || 1)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50" 
              />
            </div>
          </div>

          {/* Right Column: Days & Games Selection */}
          <div className="space-y-6">
            {/* Days Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Calendar size={14} /> Available Days ({wcAvailableDays.length} selected)
                </label>
              </div>

              {/* Day Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setWcAvailableDays([0, 1, 2, 3, 4, 5, 6])}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[11px] font-semibold border border-violet-500/30 transition-colors cursor-pointer"
                >
                  All 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setWcAvailableDays([1, 2, 3, 4, 5])}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  Weekdays (Mon–Fri)
                </button>
                <button
                  type="button"
                  onClick={() => setWcAvailableDays([0, 6])}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  Weekends (Sat–Sun)
                </button>
                <button
                  type="button"
                  onClick={() => setWcAvailableDays([])}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-rose-300 text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  Clear Days
                </button>
              </div>

              {/* Day Toggle Buttons */}
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((day, i) => (
                  <button 
                    key={day} 
                    type="button"
                    onClick={() => setWcAvailableDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort((a,b)=>a-b))}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${wcAvailableDays.includes(i) ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30 ring-1 ring-violet-400/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Active: <strong className="text-purple-300">{activeDaysSummary}</strong>
              </p>
            </div>

            {/* Active Games Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Gamepad2 size={14} /> Active Games ({wcActiveGames.length} of {ALL_GAMES.length} selected)
                </label>
              </div>

              {/* Game Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setWcActiveGames(ALL_GAMES.map(g => g.id))}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[11px] font-semibold border border-violet-500/30 transition-colors cursor-pointer"
                >
                  ⚡ Select All 14 Games
                </button>
                <button
                  type="button"
                  onClick={() => setWcActiveGames(ALL_GAMES.filter(g => g.isArena).map(g => g.id))}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold border border-purple-500/30 transition-colors cursor-pointer"
                >
                  🎮 7 Arena Games Only
                </button>
                <button
                  type="button"
                  onClick={() => setWcActiveGames([])}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-rose-300 text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  🧹 Deselect All
                </button>
              </div>

              {/* Checkboxes List */}
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                {ALL_GAMES.map(game => (
                  <label key={game.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={wcActiveGames.includes(game.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setWcActiveGames(prev => checked ? [...prev.filter(id => id !== game.id), game.id] : prev.filter(id => id !== game.id));
                      }}
                      className="w-4 h-4 rounded border-white/20 bg-black/50 text-violet-600 focus:ring-violet-500/50 cursor-pointer"
                    />
                    <span className="text-sm text-white font-medium">{game.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Session Metadata */}
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-violet-300 uppercase">Current Challenge Week</span>
                <span className="text-sm font-bold text-white bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">{getIsoWeek()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-violet-300 uppercase">Data Status</span>
                <span className="text-xs font-medium text-gray-300">{wcHasResults ? '🟢 Results recorded' : '⚪ No results yet'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-violet-300 uppercase">Challenge Session</span>
                <span className="text-xs font-mono font-medium text-gray-300 truncate max-w-[140px]" title={wcChallengeSessionId || 'Not set'}>
                  {wcChallengeSessionId ? wcChallengeSessionId.slice(0, 12) + '…' : '⚪ Not set'}
                </span>
              </div>
            </div>

            {/* Start New Session Button */}
            <button
              type="button"
              disabled={startingSession || saving}
              onClick={handleStartNewSession}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg ${
                sessionSuccess 
                  ? "bg-emerald-500 shadow-emerald-500/40" 
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"
              }`}
            >
              {startingSession ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Starting Session...
                </>
              ) : sessionSuccess ? (
                <>
                  <CheckCircle2 size={14} /> New Session Started!
                </>
              ) : (
                <>
                  <Rocket size={14} /> Start New Challenge Session
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Save Button Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
          <p className="text-xs text-gray-400">
            Changes save to Firestore and update the Challenge Arena in real-time.
          </p>

          <div className="flex items-center gap-3">
            {success && (
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 animate-in fade-in duration-300">
                <CheckCircle2 size={14} /> Challenges Configuration saved!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-violet-900/30 hover:scale-[1.02]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Challenges Config
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
