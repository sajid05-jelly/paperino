import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#05030a' }}
    >
      {/* ── Ambient glow orbs ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        {/* Large violet orb — top-left */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-8%',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)',
            filter: 'blur(48px)',
          }}
        />
        {/* Fuchsia orb — bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: '-12%',
            right: '-6%',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(217,70,239,0.15) 0%, transparent 65%)',
            filter: 'blur(52px)',
          }}
        />
        {/* Subtle center glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            height: '400px',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* ── Floating decorative circles ───────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Circle 1 */}
        <span
          style={{
            position: 'absolute',
            top: '18%',
            left: '12%',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'rgba(139,92,246,0.7)',
            boxShadow: '0 0 20px rgba(139,92,246,0.5)',
            mixBlendMode: 'screen',
            animation: 'nf-bounce 2.6s ease-in-out 0s infinite',
          }}
        />
        {/* Circle 2 */}
        <span
          style={{
            position: 'absolute',
            top: '65%',
            left: '80%',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'rgba(217,70,239,0.8)',
            boxShadow: '0 0 18px rgba(217,70,239,0.5)',
            mixBlendMode: 'screen',
            animation: 'nf-bounce 2.6s ease-in-out 0.45s infinite',
          }}
        />
        {/* Circle 3 */}
        <span
          style={{
            position: 'absolute',
            top: '40%',
            left: '88%',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'rgba(167,139,250,0.75)',
            boxShadow: '0 0 14px rgba(167,139,250,0.5)',
            mixBlendMode: 'screen',
            animation: 'nf-bounce 2.6s ease-in-out 0.9s infinite',
          }}
        />
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-6">

        {/* 404 gradient number */}
        <h1
          className="font-black leading-none select-none"
          style={{
            fontSize: 'clamp(7rem, 20vw, 11.25rem)',
            background: 'linear-gradient(135deg, #a78bfa 0%, #e879f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter:
              'drop-shadow(0 0 32px rgba(139,92,246,0.55)) drop-shadow(0 0 60px rgba(217,70,239,0.3))',
          }}
        >
          404
        </h1>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-white -mt-2">
          Page Not Found
        </h2>

        {/* Subtitle */}
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          The page you&apos;re looking for has drifted into deep space.
        </p>

        {/* CTA — return home */}
        <Link
          href="/"
          className="group mt-2 inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 font-semibold text-white text-base transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)',
            boxShadow:
              '0 0 24px rgba(139,92,246,0.45), 0 4px 20px rgba(139,92,246,0.25)',
          }}
          onMouseEnter={undefined}
        >
          <ArrowLeft
            size={18}
            className="transition-transform duration-300 group-hover:-translate-x-1"
          />
          Return to Paperino
        </Link>

        {/* Secondary link */}
        <Link
          href="/btech"
          className="text-sm font-medium transition-colors duration-200"
          style={{ color: 'var(--primary-400, #a78bfa)' }}
        >
          Browse Study Materials
        </Link>
      </div>

      {/* Keyframe for floating circles */}
      <style>{`
        @keyframes nf-bounce {
          0%, 100% { transform: translateY(0);     opacity: 0.7; }
          50%       { transform: translateY(-18px); opacity: 1;   }
        }
      `}</style>
    </main>
  );
}
