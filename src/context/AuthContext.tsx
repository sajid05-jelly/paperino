"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";


interface UserCredits {
  pyqUsed: number;
  atsUsed: number;
  lastResetDate: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isContributor: boolean;
  isBlocked: boolean;
  role: string;
  contributorLevel: "contributor" | "active" | "elite" | "";
  contributionPoints: number;
  uploads: number;
  isPremiumActive: boolean;
  premiumEndDate: any;
  premiumStartDate: any;
  loading: boolean;
  paperinoAvatar: string | null;
  avatarFrame: string | null;
  avatarCompanion: string | null;
  lastPulseReadAt: any; // Firestore Timestamp
  userCredits: UserCredits | null;
  setPaperinoAvatar: (avatarId: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isContributor: false,
  isBlocked: false,
  role: "student",
  contributorLevel: "",
  contributionPoints: 0,
  uploads: 0,
  isPremiumActive: false,
  premiumEndDate: null,
  premiumStartDate: null,
  loading: true,
  paperinoAvatar: null,
  avatarFrame: null,
  avatarCompanion: null,
  lastPulseReadAt: null,
  userCredits: null,
  setPaperinoAvatar: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const toProperCase = (str: string) => {
    if (!str) return "";
    return str
      .split(/\s+/)
      .map(word => {
        if (!word) return "";
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [role, setRole] = useState("student");
  const [contributorLevel, setContributorLevel] = useState<"contributor" | "active" | "elite" | "">("");
  const [contributionPoints, setContributionPoints] = useState(0);
  const [uploads, setUploads] = useState(0);
  const [isPremiumActive, setIsPremiumActive] = useState(false);
  const [premiumEndDate, setPremiumEndDate] = useState<any>(null);
  const [premiumStartDate, setPremiumStartDate] = useState<any>(null);
  const [paperinoAvatar, setPaperinoAvatarState] = useState<string | null>(null);
  const [avatarFrame, setAvatarFrame] = useState<string | null>(null);
  const [avatarCompanion, setAvatarCompanion] = useState<string | null>(null);
  const [lastPulseReadAt, setLastPulseReadAt] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubCreditsDoc: (() => void) | null = null;

    // Handle redirect result from mobile Google Sign In
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        // Redirect sign-in succeeded — onAuthStateChanged will handle the rest
        console.log("Redirect sign-in successful:", result.user.email);
      }
    }).catch((error) => {
      console.error("Redirect result error:", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous document listeners
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      if (unsubCreditsDoc) {
        unsubCreditsDoc();
        unsubCreditsDoc = null;
      }

      setLoading(true);
      setUser(currentUser);
      
      // Safety timeout: Clear the loading screen if sync takes longer than 5 seconds
      const safetyTimeout = setTimeout(() => {
        setLoading(curr => {
          if (curr) {
            console.warn("[AuthContext] Auth loading state forced to false by safety timeout.");
            return false;
          }
          return curr;
        });
      }, 5000);
      
      const allowedAdmins = [
        "mohamedsajid.sa@gmail.com",
        "sudharajsekar2005@gmail.com",
        "admin.paperinoirfan27@gmail.com",
        "admin.paperinosam14@gmail.com",
        "gameplayitlifeitis@gmail.com",
        "gameplayitlifeis@gmail.com",
        "gameplayitlife@gmail.com"
      ];
      
      const envAdmins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || [];
      const allAdmins = [...allowedAdmins, ...envAdmins].map(email => email.trim().toLowerCase());

      let currentIsAdmin = !!currentUser && !!currentUser.email && allAdmins.includes(currentUser.email.toLowerCase());
      
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            // Always create as "student" first (Firestore rules require role="student" on create)
            await setDoc(userRef, {
              displayName: toProperCase(currentUser.displayName || ""),
              email: (currentUser.email || "").toLowerCase(),
              role: "student",
              status: "active",
              points: 0,
              uploads: 0,
              seasonPoints: 0,
              seasonUploads: 0,
              lastPulseReadAt: new Date(0),
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            }).catch(err => {
              console.warn("[AuthContext] Failed to create user profile in DB:", err);
            });
            // If this email is an admin, promote via update (update rule allows admin role changes)
            if (currentIsAdmin) {
              await setDoc(userRef, { role: "admin" }, { merge: true }).catch(err => {
                console.warn("[AuthContext] Failed to promote to admin in DB:", err);
              });
            }
          } else {
            // Daily Active Users Tracking (update lastLogin max once per day)
            const data = userSnap.data();
            if (currentIsAdmin && data.role !== "admin") {
              await setDoc(userRef, { role: "admin" }, { merge: true }).catch(err => {
                console.warn("[AuthContext] Failed to promote to admin in DB:", err);
              });
            }
            const now = new Date();
            const lastLoginDate = data.lastLogin?.toDate ? data.lastLogin.toDate() : new Date(0);
            if (
              lastLoginDate.getDate() !== now.getDate() ||
              lastLoginDate.getMonth() !== now.getMonth() ||
              lastLoginDate.getFullYear() !== now.getFullYear()
            ) {
              await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(err => {
                console.warn("[AuthContext] Failed to update lastLogin in DB:", err);
              });
            }
          }
        } catch (error) {
          console.error("Error checking/creating user profile:", error);
          clearTimeout(safetyTimeout);
          setLoading(false);
        }

        // Subscribe to real-time updates for user profile
        unsubUserDoc = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setPaperinoAvatarState(data.paperinoAvatar || null);
            setAvatarFrame(data.avatarFrame || null);
            setAvatarCompanion(data.avatarCompanion || null);
            setLastPulseReadAt(data.lastPulseReadAt || new Date(0));
            
            const isBlockedUser = data.status === "blocked";
            const isAdminUser = data.role === "admin" || currentIsAdmin;
            const hasUploads = (data.uploads || 0) >= 1;
            
            // Determing contributorLevel dynamically or from DB field
            let level = data.contributorLevel || "";
            if (!level && hasUploads) {
              const count = data.uploads || 0;
              level = count >= 20 ? "elite" : count >= 5 ? "active" : "contributor";
            }

            setContributorLevel(level);
            setContributionPoints(Math.max(0, data.contributionPoints || 0));
            setUploads(Math.max(0, data.uploads || 0));
            setPremiumStartDate(data.premiumStartDate || null);
            setPremiumEndDate(data.premiumEndDate || null);

            let activePremium = false;
            if (data.premiumEndDate) {
              const now = new Date();
              const end = data.premiumEndDate.toDate ? data.premiumEndDate.toDate() : new Date(data.premiumEndDate);
              if (now <= end) {
                activePremium = true;
              }
            }
            setIsPremiumActive(activePremium);

            setIsAdmin(isAdminUser);
            setIsContributor(hasUploads || !!level);
            setIsBlocked(isBlockedUser);
            setRole(data.role || "student");

            if (isBlockedUser) {
              await signOut(auth);
              setUser(null);
            }
          }
          clearTimeout(safetyTimeout);
          setLoading(false);
        }, (err) => {
          console.error("User doc snapshot error:", err);
          clearTimeout(safetyTimeout);
          setLoading(false);
        });

        // Subscribe to real-time user credits
        const creditsRef = doc(db, "user_credits", currentUser.uid);
        unsubCreditsDoc = onSnapshot(creditsRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserCredits({
              pyqUsed: data.pyqUsed || 0,
              atsUsed: data.atsUsed || 0,
              lastResetDate: data.lastResetDate || "",
            });
          } else {
            setUserCredits({ pyqUsed: 0, atsUsed: 0, lastResetDate: "" });
          }
        }, (err) => {
          console.warn("[AuthContext] Credits listener error:", err);
        });

      } else {
        clearTimeout(safetyTimeout);
        setPaperinoAvatarState(null);
        setAvatarFrame(null);
        setAvatarCompanion(null);
        setLastPulseReadAt(null);
        setUserCredits(null);
        setIsAdmin(false);
        setIsContributor(false);
        setIsBlocked(false);
        setRole("student");
        setContributorLevel("");
        setContributionPoints(0);
        setUploads(0);
        setIsPremiumActive(false);
        setPremiumStartDate(null);
        setPremiumEndDate(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubCreditsDoc) unsubCreditsDoc();
    };
  }, []);

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!user) {
      setShowTimeoutWarning(false);
      return;
    }

    let inactivityTimeout: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      if (showTimeoutWarning) return;
      clearTimeout(inactivityTimeout);
      
      inactivityTimeout = setTimeout(() => {
        const hasActiveUploads = typeof window !== "undefined" && (window as any).__activeUploads;
        const hasActiveDownloads = typeof window !== "undefined" && (window as any).__activeDownloads;
        
        if (hasActiveUploads || hasActiveDownloads) {
          resetInactivityTimer();
        } else {
          setShowTimeoutWarning(true);
          setCountdown(60);
        }
      }, 15 * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleEvent = () => resetInactivityTimer();
    
    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimeout);
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [user, showTimeoutWarning]);

  useEffect(() => {
    if (!showTimeoutWarning) return;

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          logout();
          setShowTimeoutWarning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showTimeoutWarning]);

  const savePaperinoAvatar = async (avatarId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        paperinoAvatar: avatarId,
        displayName: toProperCase(user.displayName || ""),
        email: user.email,
        lastLogin: serverTimestamp()
      }, { merge: true });
      setPaperinoAvatarState(avatarId);
    } catch (error) {
      console.error("Error saving avatar:", error);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-blocked' ||
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("Redirect sign-in also failed:", redirectError);
        }
      } else {
        console.error("Error logging in with Google:", error);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleContinueSession = () => {
    setShowTimeoutWarning(false);
    setCountdown(60);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      isContributor,
      isBlocked,
      role,
      contributorLevel,
      contributionPoints,
      uploads,
      isPremiumActive,
      premiumEndDate,
      premiumStartDate,
      loading, 
      paperinoAvatar, 
      avatarFrame,
      avatarCompanion,
      lastPulseReadAt,
      userCredits,
      setPaperinoAvatar: savePaperinoAvatar, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-[#0a0714] border border-purple-500/20 rounded-[2rem] p-8 text-center shadow-[0_0_50px_rgba(139,92,246,0.2)]">
            <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Session Expiring Soon</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              For your security, your session will automatically log out in <span className="text-purple-400 font-bold">{countdown} seconds</span> due to inactivity.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleContinueSession}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] cursor-pointer"
              >
                Continue Session
              </button>
              <button 
                onClick={() => { logout(); setShowTimeoutWarning(false); }}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
