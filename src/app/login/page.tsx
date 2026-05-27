"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, isAdmin, loginWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [user, isAdmin, router]);

  if (loading) return null; // Or a loading spinner

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
      <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur-[50px] opacity-20"></div>
        
        <h1 className="text-3xl font-bold text-white mb-2 relative z-10">Welcome Back</h1>
        <p className="text-gray-400 mb-8 relative z-10">Sign in to access your materials.</p>
        
        <button 
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors relative z-10"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google Logo" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
