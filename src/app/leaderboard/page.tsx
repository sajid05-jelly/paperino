"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trophy, Medal, Star, Calendar, Loader2, Sparkles, Crown, Award, ChevronRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import UserAvatar from "@/components/UserAvatar";
import { useSound } from "@/hooks/useSound";

interface ContributorStats {
  uid: string;
  displayName: string;
  paperinoAvatar: string | null;
  avatarFrame?: string | null;
  avatarCompanion?: string | null;
  joinedDate: Date | null;
  uploads: number;
  points: number; // stores contributionPoints
  downloads: number;
  contributorLevel: string;
  rankTitle: string;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"season" | "allTime">("season");
  const [seasonBoard, setSeasonBoard] = useState<ContributorStats[]>([]);
  const [allTimeBoard, setAllTimeBoard] = useState<ContributorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonStartDate, setSeasonStartDate] = useState<Date | null>(null);
  
  const [selectedUser, setSelectedUser] = useState<ContributorStats | null>(null);
  const { playTap } = useSound();

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch season start date from settings
      const settingsSnap = await getDoc(doc(db, "settings", "leaderboard"));
      if (settingsSnap.exists() && settingsSnap.data().seasonStartDate) {
        const dateVal = settingsSnap.data().seasonStartDate;
        if (dateVal && typeof dateVal.toDate === "function") {
          setSeasonStartDate(dateVal.toDate());
        } else {
          setSeasonStartDate(new Date(dateVal));
        }
      }

      const getRankTitle = (uploadsCount: number) => {
        if (uploadsCount >= 20) return "Elite Contributor";
        if (uploadsCount >= 5) return "Active Contributor";
        if (uploadsCount >= 1) return "Contributor";
        return "Academic Explorer";
      };

      // 2. Fetch Season Contributors from pre-aggregated document
      const seasonSnap = await getDoc(doc(db, "leaderboards", "currentSeason"));
      const seasonList: ContributorStats[] = [];
      if (seasonSnap.exists() && seasonSnap.data().contributors) {
        const list = seasonSnap.data().contributors;
        list.forEach((c: any) => {
          let joinedDate: Date | null = null;
          if (c.joinedDate) {
            joinedDate = new Date(c.joinedDate);
          }
          seasonList.push({
            uid: c.uid,
            displayName: c.displayName || "Anonymous Contributor",
            paperinoAvatar: c.paperinoAvatar || null,
            avatarFrame: c.avatarFrame || null,
            avatarCompanion: c.avatarCompanion || null,
            joinedDate,
            uploads: c.uploads || 0,
            points: c.contributionPoints || c.points || 0,
            downloads: c.downloads || 0,
            contributorLevel: c.contributorLevel || "",
            rankTitle: c.rankTitle || getRankTitle(c.uploads || 0)
          });
        });
      }
      setSeasonBoard(seasonList);

      // 3. Fetch All-Time Contributors from pre-aggregated document
      const allTimeSnap = await getDoc(doc(db, "leaderboards", "hallOfFame"));
      const allTimeList: ContributorStats[] = [];
      if (allTimeSnap.exists() && allTimeSnap.data().contributors) {
        const list = allTimeSnap.data().contributors;
        list.forEach((c: any) => {
          let joinedDate: Date | null = null;
          if (c.joinedDate) {
            joinedDate = new Date(c.joinedDate);
          }
          allTimeList.push({
            uid: c.uid,
            displayName: c.displayName || "Anonymous Contributor",
            paperinoAvatar: c.paperinoAvatar || null,
            avatarFrame: c.avatarFrame || null,
            avatarCompanion: c.avatarCompanion || null,
            joinedDate,
            uploads: c.uploads || 0,
            points: c.contributionPoints || c.points || 0,
            downloads: c.downloads || 0,
            contributorLevel: c.contributorLevel || "",
            rankTitle: c.rankTitle || getRankTitle(c.uploads || 0)
          });
        });
      }
      setAllTimeBoard(allTimeList);

    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
    setLoading(false);
  };


  const currentBoard = activeTab === "season" ? seasonBoard : allTimeBoard;
  const top3 = currentBoard.slice(0, 3);
  const runnersUp = currentBoard.slice(3);

  const formatSerial = (num: number) => {
    return num >= 1 && num <= 9 ? `0${num}` : `${num}`;
  };

  const getPodiumColor = (index: number) => {
    if (activeTab === "season") {
      if (index === 0) return "from-violet-500 to-fuchsia-600 shadow-[0_0_30px_rgba(168,85,247,0.4)] border-violet-400/50";
      if (index === 1) return "from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(34,211,238,0.3)] border-cyan-400/50";
      return "from-emerald-500 to-teal-600 shadow-[0_0_30px_rgba(52,211,153,0.3)] border-emerald-400/50";
    } else {
      if (index === 0) return "from-yellow-400 to-amber-600 shadow-[0_0_30px_rgba(251,191,36,0.4)] border-yellow-400/50";
      if (index === 1) return "from-slate-300 to-slate-500 shadow-[0_0_30px_rgba(203,213,225,0.3)] border-slate-300/50";
      return "from-amber-700 to-amber-900 shadow-[0_0_30px_rgba(180,83,9,0.3)] border-amber-700/50";
    }
  };

  const getPodiumHeight = (index: number) => {
    if (index === 0) return "h-28 md:h-36";
    if (index === 1) return "h-20 md:h-28";
    return "h-16 md:h-20";
  };

  const getAvatarBorder = (index: number) => {
    if (activeTab === "season") {
      if (index === 0) return "border-violet-400 shadow-[0_0_25px_rgba(168,85,247,0.8)]";
      if (index === 1) return "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]";
      return "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]";
    } else {
      if (index === 0) return "border-yellow-400 shadow-[0_0_25px_rgba(251,191,36,0.8)]";
      if (index === 1) return "border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.5)]";
      return "border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.5)]";
    }
  };

  const getPointsColor = (index: number) => {
    if (activeTab === "season") {
      if (index === 0) return "text-violet-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]";
      if (index === 1) return "text-cyan-400";
      return "text-emerald-400";
    } else {
      if (index === 0) return "text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]";
      if (index === 1) return "text-slate-300";
      return "text-amber-500";
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.15)] via-[var(--background)] to-[var(--background)] text-white py-12 relative overflow-hidden selection:bg-purple-500/30">
      
      {/* ── Background Glow Layers ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[850px] h-[850px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.32)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[750px] h-[750px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.25)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:45px_45px]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-5 duration-700 relative">
          
          {/* Spotlight behind title */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.28)_0%,transparent_60%)] -z-10 pointer-events-none blur-[70px]" />

          <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4 shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)]">
            <Trophy size={28} className="text-purple-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Contributor <span className={`text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] bg-gradient-to-r from-white via-[rgb(var(--primary-rgb))] to-[rgb(var(--accent-rgb))]`}>Leaderboard</span>
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto">
            Honoring the students who actively build and share resources to help the SRM community thrive.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => { setActiveTab("season"); playTap(); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "season" ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "text-gray-400 hover:text-white"}`}
            >
              Current Season
            </button>
            <button 
              onClick={() => { setActiveTab("allTime"); playTap(); }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === "allTime" ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
            >
              <Crown size={16} className={activeTab === "allTime" ? "text-yellow-300" : ""} /> Hall of Fame
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={48} /></div>
        ) : currentBoard.length === 0 ? (
          <div className="text-center py-20 vision-glass  rounded-3xl">
            <p className="text-gray-400">No approved contributions yet in this category.</p>
          </div>
        ) : (
          <>
            {/* Podium Section (Top 3) */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-4 md:gap-8 mb-16 pt-20 px-2">
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-100 flex-1 max-w-[140px] md:max-w-[180px]">
                    <div className="relative mb-4 cursor-pointer group" onClick={() => setSelectedUser(top3[1])}>
                      <div className="absolute -inset-2 bg-slate-400/20 rounded-full blur-md group-hover:bg-slate-400/40 transition-all"></div>
                      <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center relative z-10">
                        {top3[1].paperinoAvatar ? <UserAvatar avatarId={top3[1].paperinoAvatar} frameId={top3[1].avatarFrame || "silver"} companionId={top3[1].avatarCompanion || "none"} size={20} className="scale-110" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white bg-white/5 rounded-full">{top3[1].displayName.charAt(0)}</div>}
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-200 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full z-20 border border-white shadow-md">#{formatSerial(2)}</div>
                    </div>
                    <div className="text-center mb-4 truncate w-full px-2 flex flex-col items-center">
                      <h3 className="text-white font-bold text-sm md:text-base truncate w-full">{top3[1].displayName}</h3>
                      <p className={`font-bold text-xs md:text-sm ${getPointsColor(1)}`}>{top3[1].points} pts</p>
                    </div>
                    <div className={`w-full rounded-t-2xl bg-gradient-to-t ${getPodiumColor(1)} ${getPodiumHeight(1)} border-t border-x relative overflow-hidden flex justify-center pt-4`}>
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2)_0%,transparent_100%)]"></div>
                      <span className="text-2xl md:text-4xl font-black text-white/40 mix-blend-overlay relative z-10">{formatSerial(2)}</span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="flex flex-col items-center animate-in slide-in-from-bottom-12 duration-700 z-10 flex-1 max-w-[150px] md:max-w-[200px]">
                    <div className="relative mb-4 cursor-pointer group" onClick={() => setSelectedUser(top3[0])}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="animate-crown-float">
                          {activeTab === "allTime" ? (
                            <Crown className="text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" size={28} />
                          ) : (
                            <Medal className="text-violet-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" size={28} />
                          )}
                        </div>
                      </div>
                      <div className="absolute -inset-3 bg-yellow-400/30 rounded-full blur-xl group-hover:bg-yellow-400/50 transition-all"></div>
                      <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center relative z-10">
                        {top3[0].paperinoAvatar ? <UserAvatar avatarId={top3[0].paperinoAvatar} frameId={top3[0].avatarFrame || "legendary"} companionId={top3[0].avatarCompanion || "none"} size={24} className="scale-125 pt-2" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-white/5 rounded-full">{top3[0].displayName.charAt(0)}</div>}
                      </div>
                      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 text-sm font-black px-3 py-0.5 rounded-full z-20 border-2 border-white shadow-lg ${activeTab === 'season' ? 'bg-violet-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>#{formatSerial(1)}</div>
                    </div>
                    <div className="text-center mb-4 truncate w-full px-2 flex flex-col items-center">
                      <h3 className="text-white font-black text-base md:text-lg truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] w-full">{top3[0].displayName}</h3>
                      <p className={`font-black text-sm md:text-base ${getPointsColor(0)}`}>{top3[0].points} pts</p>
                    </div>
                    <div className={`w-full rounded-t-3xl bg-gradient-to-t ${getPodiumColor(0)} ${getPodiumHeight(0)} border-t-2 border-x relative overflow-hidden flex justify-center pt-4`}>
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.3)_0%,transparent_100%)]"></div>
                      <Sparkles className="absolute top-4 left-4 text-white/50 animate-pulse" size={16} />
                      <Sparkles className="absolute top-10 right-4 text-white/50 animate-pulse delay-300" size={24} />
                      <span className="text-4xl md:text-5xl font-black text-white/50 mix-blend-overlay relative z-10 mt-2">{formatSerial(1)}</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-200 flex-1 max-w-[140px] md:max-w-[180px]">
                    <div className="relative mb-4 cursor-pointer group" onClick={() => setSelectedUser(top3[2])}>
                      <div className="absolute -inset-2 bg-amber-700/20 rounded-full blur-md group-hover:bg-amber-700/40 transition-all"></div>
                      <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center relative z-10">
                        {top3[2].paperinoAvatar ? <UserAvatar avatarId={top3[2].paperinoAvatar} frameId={top3[2].avatarFrame || "bronze"} companionId={top3[2].avatarCompanion || "none"} size={20} className="scale-110" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white bg-white/5 rounded-full">{top3[2].displayName.charAt(0)}</div>}
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-800 text-amber-100 text-xs font-bold px-2.5 py-0.5 rounded-full z-20 border border-white shadow-md">#{formatSerial(3)}</div>
                    </div>
                    <div className="text-center mb-4 truncate w-full px-2 flex flex-col items-center">
                      <h3 className="text-white font-bold text-sm md:text-base truncate w-full">{top3[2].displayName}</h3>
                      <p className={`font-bold text-xs md:text-sm ${getPointsColor(2)}`}>{top3[2].points} pts</p>
                    </div>
                    <div className={`w-full rounded-t-2xl bg-gradient-to-t ${getPodiumColor(2)} ${getPodiumHeight(2)} border-t border-x relative overflow-hidden flex justify-center pt-4`}>
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15)_0%,transparent_100%)]"></div>
                      <span className="text-2xl md:text-4xl font-black text-white/30 mix-blend-overlay relative z-10">{formatSerial(3)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rest of Leaderboard (Only for Season) */}
            {activeTab === "season" && runnersUp.length > 0 && (
              <div className="vision-glass p-2 md:p-6 rounded-[2rem] ">
                <div className="space-y-3">
                  {runnersUp.map((user, index) => (
                    <div 
                      key={user.uid} 
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-4 p-3 md:p-4 rounded-2xl vision-glass hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-gray-400 border border-white/10 flex-shrink-0 relative z-10">
                        {formatSerial(index + 4)}
                      </div>
                      
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                        {user.paperinoAvatar ? <UserAvatar avatarId={user.paperinoAvatar} frameId={user.avatarFrame || (index + 4 <= 10 ? "purple-glow" : "none")} companionId={user.avatarCompanion || "none"} size={12} /> : <div className="w-full h-full flex items-center justify-center font-bold bg-white/5 border border-white/10 rounded-full">{user.displayName.charAt(0)}</div>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-base truncate group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                          {user.displayName} 
                          {user.uploads >= 20 && <span title="Elite Contributor">🥇</span>}
                          {user.uploads >= 5 && user.uploads < 20 && <span title="Active Contributor">🥈</span>}
                          {user.uploads >= 1 && user.uploads < 5 && <span title="Contributor">🥉</span>}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 truncate">{user.rankTitle}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
                          {user.points} <span className="text-xs text-amber-500/80 font-bold uppercase tracking-wider font-mono">pts</span>
                        </div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{user.uploads} U · {user.downloads || 0} D</p>
                      </div>
                      
                      <div className="hidden sm:flex text-gray-600 group-hover:text-amber-500 transition-colors pr-2">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Certificate Announcement Section */}
        <div className="mt-24 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="relative w-full rounded-[2.5rem] p-[1px] bg-gradient-to-br from-violet-500/40 via-fuchsia-500/10 to-transparent group ">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative vision-glass rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full mix-blend-screen blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-screen blur-[60px] translate-y-1/2 -translate-x-1/4"></div>
              
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-full max-w-3xl space-y-6 flex flex-col items-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold text-sm shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-shadow">
                    <Award size={16} className="text-violet-400" /> Official Recognition
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                    🏆 Monthly Contributor Rewards
                  </h2>
                  <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                    Every month, the top Hall of Fame contributors will receive an official <span className="font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">"Paperino Contributor Certificate"</span> for their outstanding support and contributions to the student community.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-white/5 px-3.5 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/10 transition-colors cursor-default shadow-sm">
                      <CheckCircle2 size={16} className="text-emerald-400" /> Verified Contributor
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-white/5 px-3.5 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/10 transition-colors cursor-default shadow-sm">
                      <Crown size={16} className="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" /> Hall of Fame Winner
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-white/5 px-3.5 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/10 transition-colors cursor-default shadow-sm">
                      <Medal size={16} className="text-violet-400" /> Monthly Recognition
                    </span>
                  </div>

                  <div className="pt-6 border-t border-white/10 mt-6 w-full max-w-2xl">
                    <p className="text-violet-200/90 italic text-sm md:text-base font-medium flex items-center justify-center gap-2">
                      <Sparkles size={16} className="text-violet-400 flex-shrink-0" /> 
                      <span>Useful for portfolios, LinkedIn, resumes, and future opportunities.</span>
                    </p>
                  </div>
                  
                  <div className="mt-4 mb-2">
                    <p className="text-white font-black text-xl md:text-2xl tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-fuchsia-300 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                      "Contribute. Help Students. Get Recognized."
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-[700px] mt-10 group relative perspective-1000">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 blur-2xl rounded-[2rem] group-hover:opacity-100 opacity-60 transition-opacity duration-700"></div>
                  <div className="relative rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] transform transition-transform duration-700 group-hover:scale-[1.03] group-hover:-rotate-1 group-hover:border-violet-500/30">
                    <Image src="/certificate.jpg" alt="Paperino Certificate Preview" width={1000} height={707} className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105" priority />
                    
                    {/* Glossy Reflection Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform -translate-x-full group-hover:translate-x-full ease-in-out"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Contributor Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#05030a]/60 backdrop-blur-3xl" onClick={() => setSelectedUser(null)}></div>
          <div className="relative w-full max-w-sm modal-glass  rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header BG */}
            <div className="h-32 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-purple-500/20 relative">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            </div>
            
            {/* Avatar */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2">
              <div className="w-24 h-24 flex items-center justify-center relative z-10">
                {selectedUser.paperinoAvatar ? <UserAvatar avatarId={selectedUser.paperinoAvatar} frameId={selectedUser.avatarFrame || "none"} companionId={selectedUser.avatarCompanion || "none"} size={24} className="scale-125 pt-1" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white bg-white/5 rounded-full">{selectedUser.displayName.charAt(0)}</div>}
              </div>
            </div>

            {/* Info */}
            <div className="pt-14 pb-8 px-8 text-center bg-[#0a0714]">
              <h2 className="text-2xl font-bold text-white mb-1">{selectedUser.displayName}</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-400 mb-6">
                <Medal size={12} /> {selectedUser.rankTitle}
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-6">
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-600 mb-1">{selectedUser.points}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Points</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p className="text-xl font-black text-white mb-1">{selectedUser.uploads}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Uploads</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                  <p className="text-xl font-black text-cyan-400 mb-1">{selectedUser.downloads || 0}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Downloads</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 border-t border-white/5 pt-6">
                <Calendar size={14} /> Joined {selectedUser.joinedDate ? selectedUser.joinedDate.toLocaleDateString() : "Early Supporter"}
              </div>
            </div>
            
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
