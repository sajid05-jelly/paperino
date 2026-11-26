"use client";

import { useSyncExternalStore, useCallback } from "react";

// Synchronize all instances (desktop navbar, mobile drawer, etc.) without React Context
const SKIN_EVENT = "paperino-skin-change";
const SKIN_STORAGE_KEY = "paperino_skin";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SKIN_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SKIN_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "default";
  try {
    return localStorage.getItem(SKIN_STORAGE_KEY) || "default";
  } catch {
    return "default";
  }
}

function getServerSnapshot(): string {
  return "default";
}

interface DoomsdayToggleProps {
  variant?: "icon" | "drawer" | "pill";
  className?: string;
}

export default function DoomsdayToggle({ variant = "icon", className = "" }: DoomsdayToggleProps) {
  const currentSkin = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDoomsday = currentSkin === "doomsday";

  const toggleSkin = useCallback(() => {
    const nextSkin = isDoomsday ? "default" : "doomsday";
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, nextSkin);
    } catch {}

    if (typeof document !== "undefined") {
      if (nextSkin === "doomsday") {
        document.documentElement.setAttribute("data-skin", "doomsday");
      } else {
        document.documentElement.removeAttribute("data-skin");
      }
    }

    // Broadcast change across all components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SKIN_EVENT, { detail: nextSkin }));
    }
  }, [isDoomsday]);

  // Mask / Shield Monochrome SVG Icon
  const MaskIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors duration-200 ${isDoomsday ? "text-[#10e87a]" : "text-gray-400 group-hover:text-white"}`}
      aria-hidden="true"
    >
      <path
        d="M12 2C6.5 2 4 6.5 4 13C4 18 7 21 12 22C17 21 20 18 20 13C20 6.5 17.5 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M7 10L9 18L12 20L15 18L17 10C17 8 15 6 12 6C9 6 7 8 7 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.5 12L10.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.5 12L13.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  if (variant === "drawer") {
    return (
      <button
        onClick={toggleSkin}
        type="button"
        role="switch"
        aria-checked={isDoomsday}
        aria-label="Toggle Doomsday Edition"
        className={`flex items-center justify-between w-full min-h-[46px] px-3.5 py-2.5 rounded-xl transition-all duration-200 border text-sm cursor-pointer active:scale-[0.99] group ${
          isDoomsday
            ? "bg-[#10e87a]/15 text-[#10e87a] border-[#10e87a]/40 font-bold shadow-[0_0_15px_rgba(16,232,122,0.2)]"
            : "bg-white/[0.03] border-white/[0.06] text-gray-300 hover:text-white hover:bg-white/[0.07] font-medium"
        } ${className}`}
      >
        <span className="flex items-center gap-3">
          {MaskIcon}
          <span>Doomsday Edition</span>
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
            isDoomsday
              ? "bg-[#10e87a] text-[#060908] shadow-[0_0_10px_rgba(16,232,122,0.6)]"
              : "bg-white/10 text-gray-400 group-hover:text-gray-200"
          }`}
        >
          {isDoomsday ? "ACTIVE" : "OFF"}
        </span>
      </button>
    );
  }

  // Default: Header icon / pill toggle
  return (
    <button
      onClick={toggleSkin}
      type="button"
      role="switch"
      aria-checked={isDoomsday}
      title={isDoomsday ? "Switch back to Default Theme" : "Activate Doomsday Edition"}
      aria-label="Toggle Doomsday Theme"
      className={`group relative flex items-center justify-center p-2 rounded-full border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10e87a]/50 ${
        isDoomsday
          ? "bg-[#10e87a]/15 border-[#10e87a]/50 text-[#10e87a] shadow-[0_0_15px_rgba(16,232,122,0.35)]"
          : "bg-white/5 border-white/10 hover:border-white/20 text-gray-400 hover:text-white"
      } ${className}`}
    >
      {MaskIcon}
      {isDoomsday && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10e87a] shadow-[0_0_8px_#10e87a] animate-pulse" />
      )}
    </button>
  );
}
