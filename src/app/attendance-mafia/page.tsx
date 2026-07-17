"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  HelpCircle,
  Calendar,
  Sparkles,
  Info,
  Target
} from "lucide-react";

export default function AttendanceMafiaPage() {
  const [totalClasses, setTotalClasses] = useState<number>(40);
  const [attendedClasses, setAttendedClasses] = useState<number>(32);
  const [targetAttendance, setTargetAttendance] = useState<number>(75);

  const [currentAttendance, setCurrentAttendance] = useState<number>(80);
  const [classesToSkip, setClassesToSkip] = useState<number>(0);
  const [classesToAttend, setClassesToAttend] = useState<number>(0);
  const [riskStatus, setRiskStatus] = useState<"Safe" | "Warning" | "Critical">("Safe");

  // Calculations
  useEffect(() => {
    if (totalClasses <= 0) {
      setCurrentAttendance(0);
      setClassesToSkip(0);
      setClassesToAttend(0);
      setRiskStatus("Critical");
      return;
    }

    const current = (attendedClasses / totalClasses) * 100;
    setCurrentAttendance(Math.round(current * 10) / 10);

    // Calculate Classes you can skip
    // (attendedClasses) / (totalClasses + skip) >= target / 100
    // attendedClasses * 100 / target >= totalClasses + skip
    // skip <= (attendedClasses * 100 / target) - totalClasses
    let skipCount = 0;
    if (current >= targetAttendance) {
      skipCount = Math.floor((attendedClasses * 100) / targetAttendance - totalClasses);
      setClassesToSkip(Math.max(0, skipCount));
      setClassesToAttend(0);
    } else {
      setClassesToSkip(0);
      // Calculate Classes you must attend
      // (attendedClasses + attend) / (totalClasses + attend) >= target / 100
      // (attendedClasses + attend) * 100 >= target * (totalClasses + attend)
      // 100 * attendedClasses + 100 * attend >= target * totalClasses + target * attend
      // (100 - target) * attend >= target * totalClasses - 100 * attendedClasses
      // attend >= (target * totalClasses - 100 * attendedClasses) / (100 - target)
      const denom = 100 - targetAttendance;
      if (denom > 0) {
        const attendCount = Math.ceil((targetAttendance * totalClasses - 100 * attendedClasses) / denom);
        setClassesToAttend(Math.max(0, attendCount));
      } else {
        setClassesToAttend(0);
      }
    }

    // Risk Status
    if (current >= targetAttendance + 5) {
      setRiskStatus("Safe");
    } else if (current >= targetAttendance) {
      setRiskStatus("Warning");
    } else {
      setRiskStatus("Critical");
    }
  }, [totalClasses, attendedClasses, targetAttendance]);

  // Circumference for SVG Progress Ring
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, currentAttendance)) / 100) * circumference;

  const getRiskDetails = () => {
    switch (riskStatus) {
      case "Safe":
        return {
          color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
          ringColor: "stroke-emerald-400",
          shadow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",
          label: "Safe 😎",
          message: "You are comfortably above target. You can take a breather!"
        };
      case "Warning":
        return {
          color: "text-amber-400 border-emerald-500/20 bg-amber-500/5",
          ringColor: "stroke-amber-400",
          shadow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
          label: "Warning ⚠️",
          message: "You are close to the target limit. Be careful with skips."
        };
      case "Critical":
        return {
          color: "text-red-400 border-red-500/20 bg-red-500/5",
          ringColor: "stroke-red-500",
          shadow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
          label: "Critical 💀",
          message: "You are below the required attendance. Immediate attendance required."
        };
    }
  };

  const risk = getRiskDetails();

  return (
    <div className="w-full min-h-screen bg-[var(--background)] text-white py-8 relative overflow-hidden selection:bg-violet-500/30">
      
      {/* --- Ambient Background Glows --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.12)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.08)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-16">
        
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
          {/* Pulsing AI Target Orb */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[rgba(var(--primary-rgb),0.3)] blur-[25px] animate-pulse" />
              <div className="absolute -inset-3 rounded-full bg-[rgba(var(--primary-rgb),0.15)] blur-[18px] animate-pulse [animation-delay:1s]" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[rgba(var(--primary-rgb),0.3)] via-[rgba(var(--secondary-rgb),0.2)] to-[rgba(var(--primary-rgb),0.3)] backdrop-blur-xl border border-[rgba(var(--primary-rgb),0.25)] flex items-center justify-center shadow-[0_0_35px_rgba(var(--primary-rgb),0.25)]">
                <Target size={36} className="text-[rgb(var(--primary-rgb))] drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.75)] animate-pulse" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 mb-4 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.25)]">
            Attendance Mafia
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Know exactly how many classes you can skip before your attendance falls below the required percentage.
          </p>
        </div>

        {/* Input/Output Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Inputs Panel (Left) */}
          <div className="lg:col-span-5 backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 md:p-8 shadow-[0_0_30px_rgba(0,0,0,0.4)] space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-white/[0.06] pb-3 flex items-center gap-2">
              <Calendar size={18} className="text-violet-400" />
              <span>Attendance Stats</span>
            </h3>

            {/* Total Classes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Total Classes Conducted</label>
              <input 
                type="number" 
                min={0}
                value={totalClasses} 
                onChange={(e) => setTotalClasses(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-black/40 border border-white/[0.08] focus:border-violet-500/40 rounded-xl p-3.5 text-white outline-none focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] transition-all font-medium"
              />
            </div>

            {/* Classes Attended */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Classes Attended</label>
              <input 
                type="number" 
                min={0}
                max={totalClasses}
                value={attendedClasses} 
                onChange={(e) => setAttendedClasses(Math.min(totalClasses, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full bg-black/40 border border-white/[0.08] focus:border-violet-500/40 rounded-xl p-3.5 text-white outline-none focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] transition-all font-medium"
              />
            </div>

            {/* Target Attendance Option */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Target Attendance Percentage</label>
              <div className="grid grid-cols-3 gap-3">
                {[75, 80, 85].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setTargetAttendance(pct)}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                      targetAttendance === pct 
                        ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" 
                        : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.05]"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Outputs Panel (Right) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Stats Card */}
            <div className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 md:p-8 shadow-[0_0_30px_rgba(0,0,0,0.4)] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              
              {/* Circular Progress Ring */}
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                  <circle 
                    cx="100" cy="100" r={radius} fill="none" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    className={`${risk.ringColor} transition-all duration-1000 ease-out`}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black tracking-tight">{currentAttendance}%</span>
                  <span className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Attendance</span>
                </div>
              </div>

              {/* Status Summary */}
              <div className="text-center md:text-left space-y-4">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-2.5 ${risk.color} ${risk.shadow}`}>
                    Status: {risk.label}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {risk.message}
                  </p>
                </div>
                <div className="h-px bg-white/[0.06] w-full" />
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Your current metrics are calculated on the basis of <strong>{attendedClasses}</strong> attendance records out of <strong>{totalClasses}</strong> total conducted sessions.
                </p>
              </div>
            </div>

            {/* Skipping & Attending Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Safe Skips */}
              <div className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 flex items-center gap-4 hover:border-emerald-500/10 transition-all">
                <span className="text-3xl flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">😎</span>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Classes You Can Skip</span>
                  <p className="text-2xl font-black text-emerald-400">{classesToSkip}</p>
                </div>
              </div>

              {/* Required Attendance */}
              <div className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 flex items-center gap-4 hover:border-red-500/10 transition-all">
                <span className="text-3xl flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400">💀</span>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Must Attend Consecutively</span>
                  <p className="text-2xl font-black text-red-400">{classesToAttend}</p>
                </div>
              </div>
            </div>

            {/* Smart Insights & Projections */}
            <div className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-violet-400" />
                <span>Smart Predictions & Suggestions</span>
              </h4>
              <ul className="space-y-3 text-xs md:text-sm text-gray-300">
                <li className="flex gap-2">
                  <span className="text-violet-400">•</span>
                  <span>
                    <strong>Projected Trend:</strong> If you skip the next 3 sessions, your attendance will drop to <strong>{Math.round(((attendedClasses) / (totalClasses + 3)) * 1000) / 10}%</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-400">•</span>
                  <span>
                    <strong>Semester End Prediction:</strong> Based on historical patterns, attending all remaining sessions will yield a theoretical peak of <strong>{Math.round(((attendedClasses + 15) / (totalClasses + 15)) * 1000) / 10}%</strong> attendance.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-400">•</span>
                  <span>
                    <strong>Mafia Advice:</strong> {classesToSkip > 0 
                      ? `You are in the green! You have a buffer of ${classesToSkip} sessions. Use them wisely.`
                      : `Alert! You must attend the next ${classesToAttend} sessions back-to-back to secure your ${targetAttendance}% standing.`}
                  </span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
