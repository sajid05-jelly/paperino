"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { X, Sparkles } from "lucide-react";
import PaperinoLoader from "@/components/PaperinoLoader";

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();

  // 1. Fetch siteConfig from Firestore with session/local caching
  useEffect(() => {
    let isMounted = true;
    const checkSiteConfig = async () => {
      try {
        const cached = typeof window !== "undefined" ? sessionStorage.getItem("paperino_site_config_maint") : null;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < 5 * 60 * 1000) {
            if (isMounted) {
              setMaintenanceMode(parsed.maintenance);
              setLoadingConfig(false);
            }
            return;
          }
        }

        const snap = await getDoc(doc(db, "settings", "siteConfig"));
        if (isMounted) {
          if (snap.exists()) {
            const data = snap.data();
            const maint = data.maintenance || false;
            setMaintenanceMode(maint);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("paperino_site_config_maint", JSON.stringify({ maintenance: maint, ts: Date.now() }));
            }
          } else {
            setMaintenanceMode(false);
          }
          setLoadingConfig(false);
        }
      } catch (err) {
        console.warn("[MaintenanceGuard] Error reading siteConfig:", err);
        if (isMounted) {
          setMaintenanceMode(false);
          setLoadingConfig(false);
        }
      }
    };

    checkSiteConfig();
    return () => { isMounted = false; };
  }, []);

  // 2. Routing Protection & Redirect Logic
  useEffect(() => {
    if (loading || loadingConfig || maintenanceMode === null) return;

    const isMaintenancePage = pathname === "/maintenance";
    const isLoginRoute = pathname === "/login";
    const isAdminRoute = pathname?.startsWith("/admin");

    if (maintenanceMode && !isAdmin) {
      if (!isMaintenancePage && !isLoginRoute && !isAdminRoute) {
        router.replace("/maintenance");
      }
    } else {
      if (isMaintenancePage) {
        router.replace("/");
      }
    }
  }, [maintenanceMode, isAdmin, loading, loadingConfig, pathname, router]);

  // 3. Welcome Back Modal Logic (when maintenance: true -> false)
  useEffect(() => {
    if (maintenanceMode === null) return;

    if (typeof window !== "undefined") {
      const wasInMaintenance = localStorage.getItem("paperino_was_in_maintenance");

      if (maintenanceMode) {
        // Mark that the system is currently under maintenance
        localStorage.setItem("paperino_was_in_maintenance", "true");
      } else if (wasInMaintenance === "true") {
        // Show welcome back popup
        setShowWelcomeModal(true);
        localStorage.setItem("paperino_was_in_maintenance", "shown");
      }
    }
  }, [maintenanceMode]);

  const handleDismissWelcome = () => {
    setShowWelcomeModal(false);
  };

  const handleViewUpdates = () => {
    setShowWelcomeModal(false);
    router.push("/pulse");
  };

  const isMaintenancePage = pathname === "/maintenance";

  if (loading || loadingConfig) {
    return <PaperinoLoader />;
  }

  // If visitor page is maintenance, render children cleanly without global Navbar/Footer
  if (isMaintenancePage) {
    return (
      <main className="flex-1 flex flex-col relative z-20 overflow-x-hidden w-full max-w-full bg-[#07050d]">
        {children}
      </main>
    );
  }

  return (
    <>
      {children}

      {/* 🎉 Welcome Back Popup Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 p-8 shadow-[0_20px_50px_rgba(139,92,246,0.15)] overflow-hidden" style={{ background: "rgba(12,8,24,0.98)", backdropFilter: "blur(20px)" }}>
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none"></div>
            
            <button
              onClick={handleDismissWelcome}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                🎉
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                  Welcome Back! <Sparkles size={18} className="text-yellow-400 animate-pulse" />
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Paperino has been successfully upgraded with new performance enhancements and features. Explore the latest updates below!
                </p>
              </div>

              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  onClick={handleDismissWelcome}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleViewUpdates}
                  className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors text-sm shadow-lg shadow-purple-900/30 cursor-pointer"
                >
                  View Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
