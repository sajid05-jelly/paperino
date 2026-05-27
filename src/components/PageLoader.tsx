'use client';

import { useEffect, useState } from 'react';

interface PageLoaderProps {
  isLoading: boolean;
}

export default function PageLoader({ isLoading }: PageLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Start fade-out transition
      setFading(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 600); // match transition duration
      return () => clearTimeout(timer);
    } else {
      setFading(false);
      setVisible(true);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{
        backgroundColor: '#05030a',
        transition: 'opacity 0.6s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      {/* Shimmer violet ambient glow behind logo */}
      <div
        className="absolute"
        style={{
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(217,70,239,0.12) 45%, transparent 70%)',
          filter: 'blur(32px)',
          animation: 'loader-glow-pulse 2.4s ease-in-out infinite',
        }}
      />

      {/* Rotating ring accent */}
      <div
        className="absolute"
        style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: 'rgba(139,92,246,0.6)',
          borderRightColor: 'rgba(217,70,239,0.3)',
          animation: 'loader-spin 1.4s linear infinite',
        }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-5">
        {/* Logo with pulse */}
        <div
          style={{
            animation: 'loader-logo-pulse 2s ease-in-out infinite',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-final.png"
            alt="Paperino"
            width={80}
            height={80}
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.7))',
            }}
          />
        </div>

        {/* Paperino wordmark */}
        <p
          className="font-bold text-white tracking-widest text-xl"
          style={{ letterSpacing: '0.25em' }}
        >
          PAPERINO
        </p>

        {/* 3-dot bouncing loader */}
        <div className="flex items-center gap-2.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background:
                  i === 1
                    ? 'rgba(217,70,239,0.95)'
                    : 'rgba(139,92,246,0.95)',
                boxShadow:
                  i === 1
                    ? '0 0 10px rgba(217,70,239,0.7)'
                    : '0 0 10px rgba(139,92,246,0.7)',
                animation: `loader-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Keyframe injections via style tag */}
      <style>{`
        @keyframes loader-glow-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes loader-logo-pulse {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%       { transform: scale(1.06); opacity: 0.92; }
        }
        @keyframes loader-bounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.6; }
          40%            { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
