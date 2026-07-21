"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface SafeBackButtonProps {
  fallbackUrl?: string;
  label?: string;
  className?: string;
  size?: number;
}

export default function SafeBackButton({ 
  fallbackUrl = "/", 
  label, 
  className = "p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-gray-300 hover:text-white flex items-center justify-center gap-2",
  size = 18
}: SafeBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    const hasHistory = typeof window !== "undefined" && 
                       window.history.length > 1 && 
                       document.referrer && 
                       document.referrer.includes(window.location.host);
                       
    if (hasHistory) {
      router.back();
    } else {
      router.replace(fallbackUrl);
    }
  };

  return (
    <button 
      onClick={handleBack} 
      className={className}
      type="button"
    >
      <ArrowLeft size={size} />
      {label && <span>{label}</span>}
    </button>
  );
}
