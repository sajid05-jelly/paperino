"use client";

import React, { useState, useEffect, useRef } from "react";
import { Timer } from "lucide-react";

interface GameTimerProps {
  isRunning?: boolean;
  startTime: number | null; // Date.now() when game started
  maxDurationMs?: number;
  onExpire?: () => void;
  className?: string;
}

export default function GameTimer({
  isRunning = true,
  startTime,
  maxDurationMs,
  onExpire,
  className = "",
}: GameTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    hasExpiredRef.current = false;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        const diff = Date.now() - startTime;
        setElapsed(diff);

        if (maxDurationMs && diff >= maxDurationMs && !hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpire?.();
        }
      }, 100);
    } else {
      setElapsed(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime, maxDurationMs, onExpire]);

  // Format display time
  const displayMs = maxDurationMs ? Math.max(0, maxDurationMs - elapsed) : elapsed;
  const minutes = Math.floor(displayMs / 60000);
  const seconds = Math.floor((displayMs % 60000) / 1000);
  const tenths = Math.floor((displayMs % 1000) / 100);

  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  const isLowTime = maxDurationMs ? displayMs < 30000 : false;

  return (
    <div
      className={`glass-panel vision-glass inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-colors ${
        isLowTime 
          ? 'border-rose-500/50 bg-rose-950/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
          : 'border-purple-500/20 bg-purple-950/20 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
      } ${className}`}
    >
      <Timer className={`w-4 h-4 ${isLowTime ? 'text-rose-400 animate-pulse' : 'text-purple-400'}`} />
      <span className="font-mono text-sm sm:text-base font-bold tracking-wider">
        {formattedMinutes}:{formattedSeconds}.
        <span className={isLowTime ? 'text-rose-400 text-xs' : 'text-purple-400 text-xs'}>{tenths}</span>
      </span>
    </div>
  );
}
