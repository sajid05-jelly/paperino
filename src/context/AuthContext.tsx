"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { recalculateLeaderboards } from "@/lib/leaderboard";


interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isContributor: boolean;
  isBlocked: boolean;
  role: string;
  loading: boolean;
  paperinoAvatar: string | null;
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

  useEffect(() => {
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
            // Save initial user doc
            await setDoc(userRef, {
              displayName: currentUser.displayName,
              email: currentUser.email,
              role: "student",
              status: "active",
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
      
      // Update leaderboard pre-aggregated tables immediately
      await recalculateLeaderboards(db);
    } catch (error) {
      console.error("Error saving avatar:", error);
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Clear any cached session to force the account chooser popup
      await signOut(auth);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error logging in with Google:", error);
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
      setPaperinoAvatar: savePaperinoAvatar, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
