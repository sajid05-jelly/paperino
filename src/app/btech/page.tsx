"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function BTechRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/courses/btech");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
      <p className="text-gray-400">Redirecting to courses...</p>
    </div>
  );
}
