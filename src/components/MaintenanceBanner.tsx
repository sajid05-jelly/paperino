'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlertTriangle, Wrench, X } from 'lucide-react';

export default function MaintenanceBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState(
    'We are currently performing scheduled maintenance. Some features may be temporarily unavailable.'
  );

  useEffect(() => {
    let isMounted = true;
    const fetchMaintenanceStatus = async () => {
      try {
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem('paperino_maint_banner') : null;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < 5 * 60 * 1000) {
            if (isMounted) {
              setShowBanner(parsed.isActive);
              if (parsed.message) setMessage(parsed.message);
            }
            return;
          }
        }

        const snap = await getDoc(doc(db, 'settings', 'maintenance'));
        if (isMounted) {
          if (snap.exists()) {
            const data = snap.data();
            const isActive = data.isActive === true;
            const msg = data.message && typeof data.message === 'string' && data.message.trim() !== '' ? data.message : message;
            setShowBanner(isActive);
            if (isActive && msg) setMessage(msg);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('paperino_maint_banner', JSON.stringify({ isActive, message: msg, ts: Date.now() }));
            }
          } else {
            setShowBanner(false);
          }
        }
      } catch (error) {
        console.warn('[MaintenanceBanner] Firestore read fallback:', error);
        if (isMounted) setShowBanner(false);
      }
    };

    fetchMaintenanceStatus();
    return () => { isMounted = false; };
  }, []);

  if (!showBanner || dismissed) return null;

  return (
    <>
      {/* Fixed banner */}
      <div
        className="fixed top-0 left-0 right-0 z-[99999] bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm border-b border-amber-400/50"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-between px-4 py-2.5 max-w-7xl mx-auto">
          {/* Left: icon + message */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Wrench size={14} className="text-white flex-shrink-0" />
            <AlertTriangle size={14} className="text-white/80 flex-shrink-0" />
            <p className="text-white text-xs sm:text-sm font-medium truncate">
              {message}
            </p>
          </div>

          {/* Right: dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="ml-4 flex-shrink-0 text-white/70 hover:text-white transition-colors p-0.5 rounded"
            aria-label="Dismiss maintenance banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Spacer so page content is pushed below the fixed banner */}
      <div className="h-10 w-full flex-shrink-0" aria-hidden="true" />
    </>
  );
}
