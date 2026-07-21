"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import UserAvatar, { AVATARS } from "@/components/UserAvatar";
import { 
  FRAMES, 
  COMPANIONS, 
  ACHIEVEMENTS, 
  xpToLevel, 
  getCommunityReputation 
} from "@/lib/gamification";
import { Sparkles, Trophy, ShieldAlert, Award, Check, Lock } from "lucide-react";
import Link from "next/link";
import SafeBackButton from "@/components/SafeBackButton";

export default function AvatarStudioPage() {
  const { user, paperinoAvatar, setPaperinoAvatar } = useAuth();
  
  // Customization State
  const [equippedAvatar, setEquippedAvatar] = useState(paperinoAvatar || "pen-paper");
  const [equippedFrame, setEquippedFrame] = useState("none");
  const [equippedCompanion, setEquippedCompanion] = useState("none");
  const [unlockedFrames, setUnlockedFrames] = useState<string[]>(["none", "classic", "minimal"]);
  const [unlockedCompanions, setUnlockedCompanions] = useState<string[]>(["none"]);
  
  // Stats & Progress
  const [xp, setXp] = useState(0);
  const [uploadsCount, setUploadsCount] = useState(0);
  const [approvedUploads, setApprovedUploads] = useState(0);
  
  // Preview State
  const [previewAvatar, setPreviewAvatar] = useState(paperinoAvatar || "pen-paper");
  const [previewFrame, setPreviewFrame] = useState("none");
  const [previewCompanion, setPreviewCompanion] = useState("none");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"avatar" | "frames" | "companions" | "achievements">("avatar");

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // Load equipped items
          setEquippedAvatar(data.paperinoAvatar || "pen-paper");
          setPreviewAvatar(data.paperinoAvatar || "pen-paper");
          setEquippedFrame(data.avatarFrame || "none");
          setEquippedCompanion(data.avatarCompanion || "none");
          setPreviewFrame(data.avatarFrame || "none");
          setPreviewCompanion(data.avatarCompanion || "none");

          // Load stats
          setXp(data.xp || 0);
          setUploadsCount(data.uploadsCount || 0);
          setApprovedUploads(data.approvedUploads || 0);

          // Calculate auto unlocks based on uploads
          const tempFrames = ["none", "classic", "minimal"];
          const tempCompanions = ["none"];

          if (data.uploadsCount >= 10) tempFrames.push("bronze");
          if (data.uploadsCount >= 50) tempFrames.push("gold");
          if (data.uploadsCount >= 1) tempCompanions.push("paper-duck");
          if (data.uploadsCount >= 25) tempCompanions.push("floating-book");
          if (data.uploadsCount >= 100) tempCompanions.push("electric-orb");
          if (data.careerDnaCompleted) tempFrames.push("scholar");
          if (data.atsResumeUploaded) tempCompanions.push("purple-crystal");

          setUnlockedFrames(Array.from(new Set(tempFrames)));
          setUnlockedCompanions(Array.from(new Set(tempCompanions)));
        }
      } catch (err) {
        console.error("Failed to load avatar studio stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleEquip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        paperinoAvatar: previewAvatar,
        avatarFrame: previewFrame,
        avatarCompanion: previewCompanion
      }, { merge: true });
      
      if (setPaperinoAvatar) {
        await setPaperinoAvatar(previewAvatar);
      }
      setEquippedAvatar(previewAvatar);
      setEquippedFrame(previewFrame);
      setEquippedCompanion(previewCompanion);
      alert("Customizations equipped successfully!");
    } catch (err) {
      console.error("Failed to save customization:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05030a] text-white">
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  const { level, label: levelLabel, progressPercent, nextLevelXpNeed } = xpToLevel(xp);
  const reputation = getCommunityReputation({ approvedUploads, uploadsCount });

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header Back Button */}
      <div className="flex items-center gap-4">
        <SafeBackButton fallbackUrl="/pulse" />
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Sparkles className="text-violet-400" /> Avatar Frame Studio
          </h1>
          <p className="text-sm text-gray-400">Customize your digital identity and showcase achievements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Avatar Live Preview Panel */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden h-fit">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-500/10 blur-[80px] rounded-full"></div>
          
          <h2 className="text-lg font-bold text-white mb-6">Live Identity Preview</h2>
          
          <div className="mb-6 relative">
            <UserAvatar 
              avatarId={previewAvatar} 
              frameId={previewFrame} 
              companionId={previewCompanion} 
              size={48} 
              className="scale-125"
            />
          </div>

          <div className="space-y-1 mb-8">
            <div className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
              {user?.displayName || "Scholar"}
            </div>
            <div className="text-xs text-violet-400 font-bold tracking-wider uppercase">
              Lv. {level} — {levelLabel}
            </div>
            <div className="text-xs text-gray-400">
              Community: <span className="text-cyan-400 font-semibold">{reputation.label}</span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl mb-8 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-400">Level Progress</span>
              <span className="text-gray-300">{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-gray-500 text-left">
              {nextLevelXpNeed} XP remaining to next level
            </div>
          </div>

          <button
            onClick={handleEquip}
            disabled={saving || (previewAvatar === equippedAvatar && previewFrame === equippedFrame && previewCompanion === equippedCompanion)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? "Equipping..." : "Equip Customizations"}
          </button>
        </div>

        {/* Right Side: Selections & Customizations Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-[2.5rem] border border-white/10">
            
            {/* Tabs Selector */}
            <div className="flex gap-2 p-1.5 bg-black/40 border border-white/5 rounded-2xl mb-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab("avatar")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "avatar" ? "bg-white/10 text-white shadow-inner" : "text-gray-400 hover:text-white"}`}
              >
                Avatar
              </button>
              <button
                onClick={() => setActiveTab("frames")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "frames" ? "bg-white/10 text-white shadow-inner" : "text-gray-400 hover:text-white"}`}
              >
                Avatar Frames
              </button>
              <button
                onClick={() => setActiveTab("companions")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "companions" ? "bg-white/10 text-white shadow-inner" : "text-gray-400 hover:text-white"}`}
              >
                Paperino Companions
              </button>
              <button
                onClick={() => setActiveTab("achievements")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === "achievements" ? "bg-white/10 text-white shadow-inner" : "text-gray-400 hover:text-white"}`}
              >
                Achievements
              </button>
            </div>

            {/* TAB CONTENT: AVATAR */}
            {activeTab === "avatar" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {AVATARS.map((avatar) => {
                  const isPreviewed = previewAvatar === avatar.id;
                  const isEquipped = equippedAvatar === avatar.id;
                  const Icon = avatar.icon;

                  return (
                    <button
                      key={avatar.id}
                      onClick={() => setPreviewAvatar(avatar.id)}
                      className={`relative flex flex-col items-center p-5 rounded-2xl border text-center transition-all ${
                        isEquipped 
                          ? "border-violet-500/50 bg-violet-500/5" 
                          : isPreviewed 
                            ? "border-white/40 bg-white/10" 
                            : "border-white/5 bg-black/20 hover:border-white/10"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${avatar.bg} border border-white/10`}>
                        <Icon size={20} className={avatar.color} />
                      </div>
                      <span className="text-xs font-bold text-white mb-1">{avatar.name}</span>
                      {isEquipped ? (
                        <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full">Equipped</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold">Available</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: FRAMES */}
            {activeTab === "frames" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {FRAMES.map((frame) => {
                  const isUnlocked = unlockedFrames.includes(frame.id);
                  const isPreviewed = previewFrame === frame.id;
                  const isEquipped = equippedFrame === frame.id;

                  return (
                    <button
                      key={frame.id}
                      onClick={() => isUnlocked && setPreviewFrame(frame.id)}
                      disabled={!isUnlocked}
                      className={`relative flex flex-col items-center p-5 rounded-2xl border text-center transition-all ${
                        isEquipped 
                          ? "border-violet-500/50 bg-violet-500/5" 
                          : isPreviewed 
                            ? "border-white/40 bg-white/10" 
                            : "border-white/5 bg-black/20 hover:border-white/10"
                      } ${!isUnlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <UserAvatar 
                        avatarId={paperinoAvatar} 
                        frameId={frame.id} 
                        size={12} 
                        className="mb-4"
                      />
                      <span className="text-xs font-bold text-white mb-1">{frame.name}</span>
                      
                      {/* Equiped / Unlocked Tags */}
                      {isEquipped ? (
                        <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full">Equipped</span>
                      ) : !isUnlocked ? (
                        <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1"><Lock size={8} /> Locked</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold">Unlocked</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: COMPANIONS */}
            {activeTab === "companions" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {COMPANIONS.map((comp) => {
                  const isUnlocked = unlockedCompanions.includes(comp.id);
                  const isPreviewed = previewCompanion === comp.id;
                  const isEquipped = equippedCompanion === comp.id;

                  return (
                    <button
                      key={comp.id}
                      onClick={() => isUnlocked && setPreviewCompanion(comp.id)}
                      disabled={!isUnlocked}
                      className={`relative flex flex-col items-center p-5 rounded-2xl border text-center transition-all ${
                        isEquipped 
                          ? "border-fuchsia-500/50 bg-fuchsia-500/5" 
                          : isPreviewed 
                            ? "border-white/40 bg-white/10" 
                            : "border-white/5 bg-black/20 hover:border-white/10"
                      } ${!isUnlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="text-3xl mb-4 h-12 flex items-center justify-center">
                        {comp.emoji || "🚫"}
                      </div>
                      <span className="text-xs font-bold text-white mb-1">{comp.name}</span>
                      
                      {isEquipped ? (
                        <span className="text-[10px] text-fuchsia-400 font-bold bg-fuchsia-500/10 px-2 py-0.5 rounded-full">Equipped</span>
                      ) : !isUnlocked ? (
                        <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1"><Lock size={8} /> Locked</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold">Unlocked</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: ACHIEVEMENTS */}
            {activeTab === "achievements" && (
              <div className="space-y-4">
                {ACHIEVEMENTS.map((ach) => {
                  const isCompleted = ach.check({ approvedUploads, uploadsCount });

                  return (
                    <div 
                      key={ach.id}
                      className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${isCompleted ? 'border-violet-500/20 bg-violet-500/5' : 'border-white/5 bg-black/20'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isCompleted ? 'bg-violet-500/20 border-violet-500/30 text-violet-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                          {isCompleted ? <Trophy size={20} /> : <Award size={20} />}
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${isCompleted ? 'text-white' : 'text-gray-400'}`}>
                            {ach.name}
                          </h3>
                          <p className="text-xs text-gray-500">{ach.description}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-400">Reward:</div>
                        <div className="text-xs text-violet-400 font-bold">{ach.unlockName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
