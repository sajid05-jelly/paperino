'use client';

import { ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    // Set initial state in case page is already scrolled on mount
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={[
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9800]',
        'transition-all duration-300 ease-in-out',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none',
      ].join(' ')}
    >
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className={[
          // shape & spacing
          'flex items-center gap-1.5 px-4 py-2 rounded-full',
          // glass dark bg
          'bg-black/60 backdrop-blur-md',
          // border & text
          'border border-violet-500/30 text-violet-300 text-xs font-medium',
          // hover states
          'hover:border-violet-400 hover:text-white',
          'hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]',
          // smooth transitions
          'transition-all duration-200 ease-in-out',
          // cursor
          'cursor-pointer select-none',
        ].join(' ')}
      >
        <ChevronUp size={14} strokeWidth={2.5} aria-hidden="true" />
        <span>Top</span>
      </button>
    </div>
  );
}
