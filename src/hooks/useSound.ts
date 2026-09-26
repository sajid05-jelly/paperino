"use client";

import { useCallback } from 'react';

export function useSound() {
  const toggleSound = useCallback(() => {}, []);
  const playTone = useCallback(() => {}, []);
  const playTap = useCallback(() => {}, []);
  const playPop = useCallback(() => {}, []);
  const playSuccess = useCallback(() => {}, []);

  return {
    soundEnabled: false,
    toggleSound,
    playTap,
    playPop,
    playSuccess
  };
}
