"use client";

import { useCallback, useEffect, useState } from 'react';

// Singleton AudioContext to prevent creating multiple contexts
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume context if it was suspended (browser policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const savedPref = localStorage.getItem('paperino_sound_enabled');
    if (savedPref !== null) {
      setSoundEnabled(savedPref === 'true');
    } else {
      // Default to false to prevent unexpected noises
      setSoundEnabled(false);
      localStorage.setItem('paperino_sound_enabled', 'false');
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('paperino_sound_enabled', String(next));
      if (next) {
        // Init context right away on user interaction if they enable it
        getAudioContext();
      }
      return next;
    });
  }, []);

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, volumeLevel: number = 0.1) => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Smooth envelope to prevent clicking artifacts
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volumeLevel, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [soundEnabled]);

  const playTap = useCallback(() => {
    // Very short, low pitch sine wave (UI tab switch / basic click)
    playTone(400, 'sine', 0.1, 0.05);
  }, [playTone]);

  const playPop = useCallback(() => {
    // Slightly resonant pop (Modals opening)
    playTone(600, 'triangle', 0.15, 0.05);
  }, [playTone]);

  const playSuccess = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Quick two-note chime
    playTone(600, 'sine', 0.1, 0.05);
    setTimeout(() => {
      playTone(800, 'sine', 0.3, 0.05);
    }, 100);
  }, [soundEnabled, playTone]);

  return {
    soundEnabled,
    toggleSound,
    playTap,
    playPop,
    playSuccess
  };
}
