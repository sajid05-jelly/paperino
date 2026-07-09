"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";


interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isContributor: boolean;
  isBlocked: boolean;
  role: string;
  loading: boolean;
  paperinoAvatar: string | null;
  lastPulseReadAt: any; // Firestore Timestamp
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
  loading: true,
  paperinoAvatar: null,
  lastPulseReadAt: null,
  setPaperinoAvatar: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [role, setRole] = useState("student");
  const [paperinoAvatar, setPaperinoAvatarState] = useState<string | null>(null);
  const [lastPulseReadAt, setLastPulseReadAt] = useState<any>(null);

  useEffect(() => {
    // Handle redirect result from mobile Google Sign In
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        // Redirect sign-in succeeded — onAuthStateChanged will handle the rest
        console.log("Redirect sign-in successful:", result.user.email);
      }
    }).catch((error) => {
      console.error("Redirect result error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      const allowedAdmins = [
        "mohamedsajid.sa@gmail.com",
        "sudharajsekar2005@gmail.com",
        "admin.paperinoirfan27@gmail.com",
        "admin.paperinosam14@gmail.com"
      ];
      
      const envAdmins = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || [];
      const allAdmins = [...allowedAdmins, ...envAdmins].map(email => email.trim().toLowerCase());

      let currentIsAdmin = !!currentUser && !!currentUser.email && allAdmins.includes(currentUser.email.toLowerCase());
      let currentIsContributor = false;
      let currentIsBlocked = false;
      let currentRole = "student";
      
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            setPaperinoAvatarState(data.paperinoAvatar || null);
            
            // Initialize missing stats fields for legacy users
            let needsUpdate = false;
            const updates: any = {};

            const allowedAdminsList = [
              "mohamedsajid.sa@gmail.com",
              "sudharajsekar2005@gmail.com",
              "admin.paperinoirfan27@gmail.com",
              "admin.paperinosam14@gmail.com"
            ];
            const envAdminsList = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || [];
            const allAdminsList = [...allowedAdminsList, ...envAdminsList].map(email => email.trim().toLowerCase());
            const emailIsAdmin = !!currentUser && !!currentUser.email && allAdminsList.includes(currentUser.email.toLowerCase());

            if (emailIsAdmin && data.role !== "admin") {
              needsUpdate = true;
              updates.role = "admin";
              data.role = "admin";
            }

            if (data.points === undefined || data.uploads === undefined || data.seasonPoints === undefined || data.lastPulseReadAt === undefined) {
              needsUpdate = true;
              updates.points = data.points !== undefined ? data.points : 0;
              updates.uploads = data.uploads !== undefined ? data.uploads : 0;
              updates.seasonPoints = data.seasonPoints !== undefined ? data.seasonPoints : 0;
              updates.seasonUploads = data.seasonUploads !== undefined ? data.seasonUploads : 0;
              updates.lastPulseReadAt = data.lastPulseReadAt !== undefined ? data.lastPulseReadAt : new Date(0); // Show all existing as unread for new users/legacy users
            }

            setLastPulseReadAt(data.lastPulseReadAt || new Date(0));

            // Daily Active Users Tracking (update lastLogin max once per day)
            const now = new Date();
            const lastLoginDate = data.lastLogin?.toDate ? data.lastLogin.toDate() : new Date(0);
            if (
              lastLoginDate.getDate() !== now.getDate() ||
              lastLoginDate.getMonth() !== now.getMonth() ||
              lastLoginDate.getFullYear() !== now.getFullYear()
            ) {
              needsUpdate = true;
              updates.lastLogin = serverTimestamp();
            }

            if (needsUpdate) {
              await setDoc(userRef, updates, { merge: true });
            }

            if (data.status === "blocked") {
              currentIsBlocked = true;
            }
            if (data.role === "admin") {
              currentIsAdmin = true;
            }
            if (data.role === "contributor") {
              currentIsContributor = true;
            }
            currentRole = data.role || "student";
            
          } else {
            // First time login
            setPaperinoAvatarState(null);
            setLastPulseReadAt(new Date(0));
            // Save initial user doc
            await setDoc(userRef, {
              displayName: currentUser.displayName,
              email: currentUser.email,
              role: currentIsAdmin ? "admin" : "student",
              status: "active",
              points: 0,
              uploads: 0,
              seasonPoints: 0,
              seasonUploads: 0,
              lastPulseReadAt: new Date(0), // default to far past so they see new/pinned
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            }, { merge: true });
          }

          // If blocked, we can optionally sign them out automatically
          if (currentIsBlocked) {
            await signOut(auth);
            setUser(null);
            currentIsAdmin = false;
            currentIsContributor = false;
          }

        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setPaperinoAvatarState(null);
      }

      setIsAdmin(currentIsAdmin);
      setIsContributor(currentIsContributor);
      setIsBlocked(currentIsBlocked);
      setRole(currentRole);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const savePaperinoAvatar = async (avatarId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        paperinoAvatar: avatarId,
        displayName: user.displayName,
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
      // Use popup directly — iOS Safari allows popups when triggered immediately
      // from a user tap. DO NOT call await signOut() first — it breaks the
      // "user gesture" chain and causes Safari to block the popup.
      // The googleProvider already has prompt: "select_account" for account picker.
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // If popup was blocked by the browser, fall back to redirect
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      isContributor,
      isBlocked,
      role,
      loading, 
      paperinoAvatar, 
      lastPulseReadAt,
      setPaperinoAvatar: savePaperinoAvatar, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
