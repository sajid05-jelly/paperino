import React from 'react';
import Image from 'next/image';

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Image 
      src="/logo-final.png" 
      alt="Paperino Logo" 
      width={128}
      height={128}
      quality={100}
      priority
      className={className}
      unoptimized={false}
    />
  );
}
