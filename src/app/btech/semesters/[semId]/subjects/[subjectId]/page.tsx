"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function BTechSubjectRedirect({ params }: { params: Promise<{ semId: string, subjectId: string }> }) {
  const resolvedParams = use(params);
  const { semId, subjectId } = resolvedParams;
  const router = useRouter();

  useEffect(() => {
    router.replace(`/srm/btech/semester-${semId}`);
  }, [router, semId, subjectId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
      <p className="text-gray-400">Redirecting to subjects...</p>
    </div>
  );
}
