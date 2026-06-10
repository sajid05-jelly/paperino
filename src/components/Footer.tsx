"use client";

import Link from "next/link";
import { Sparkles, Mail, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full relative mt-auto border-t border-violet-500/20 shadow-[0_-10px_40px_rgba(var(--primary-rgb),0.05)] bg-[#05030a] z-10 pt-20 pb-12">
      {/* Subtle Violet Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[2px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb),0.12),transparent_70%)] pointer-events-none blur-[50px]"></div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-12 px-6 md:flex-row relative z-10">
        
        {/* Left Side: Brand & Motto */}
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" aria-hidden="true" /> Paperino
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/5 border border-violet-500/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
            <Heart className="w-3.5 h-3.5 text-violet-400 animate-pulse" aria-hidden="true" />
            <span className="text-xs font-light text-violet-200 tracking-wider">
              Built for SRM students with passion and innovation.
            </span>
          </div>


        </div>

        {/* Right Side: Links */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm text-gray-400 font-medium">
          {[
            { label: "About Paperino", href: "/#about", external: false },
            { label: "Privacy Policy", href: "/privacy", external: false },
            { label: "Contact", href: "https://mail.google.com/mail/?view=cm&fs=1&to=paperino.study@gmail.com&su=Paperino Support", external: true },
            { label: "Developer", href: "/developer", external: false },
          ].map((link, i) => (
            link.external ? (
              <a 
                key={i} 
                href={link.href as string}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group py-1 text-gray-400 hover:text-white transition-colors duration-300"
              >
                <span className="pointer-events-none">{link.label}</span>
                <span className="absolute left-0 bottom-0 w-0 h-px bg-violet-400 transition-all duration-300 group-hover:w-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] pointer-events-none"></span>
              </a>
            ) : (
              <Link 
                key={i} 
                href={link.href as string} 
                className="relative group py-1 text-gray-400 hover:text-white transition-colors duration-300 cursor-pointer"
              >
                {link.label}
                <span className="absolute left-0 bottom-0 w-0 h-px bg-violet-400 transition-all duration-300 group-hover:w-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]"></span>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="w-full mt-16 pt-8 border-t border-white/5 flex items-center justify-center relative z-10">
        <p className="text-xs text-gray-600 font-light tracking-widest uppercase">
          © {new Date().getFullYear()} Paperino. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
