"use client";

import React, { useState, useEffect } from "react";
import { Timer } from "lucide-react";

interface GameTimerProps {
  isRunning: boolean;
  startTime: number | null; // Date.now() when game started
  className?: string;
}

export default function GameTimer({
  isRunning,
  startTime,
  className = "",
}: GameTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    } else if (!isRunning && startTime) {
      // Final update when stopped
      setElapsed(Date.now() - startTime);
    } else {
      setElapsed(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Format time MM:SS.d
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const tenths = Math.floor((elapsed % 1000) / 100);

  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return (
    <div
      className={`glass-panel vision-glass inline-flex items-center gap-3 px-4 py-2 rounded-full border border-purple-500/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] bg-purple-950/20 ${className}`}
    >
      <Timer className="w-5 h-5 text-purple-400" />
      <span className="font-mono text-xl font-bold tracking-wider text-purple-100">
        {formattedMinutes}:{formattedSeconds}.
        <span className="text-purple-400 text-lg">{tenths}</span>
      </span>
    </div>
  );
}
